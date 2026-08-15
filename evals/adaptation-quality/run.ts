import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { QUALITY_CASES, type QualityCase } from "./cases.ts";
import type { AdaptResponse } from "../../supabase/functions/adapt/types.ts";

interface StructuralChecks {
  statusOk: boolean;
  responseShapeOk: boolean;
  sourceTextPreserved: boolean;
  sourceLanguageDetected: boolean;
  targetLanguagePreserved: boolean;
  levelPreserved: boolean;
  adaptedTextPresent: boolean;
}

interface HumanReview {
  targetLanguagePass: null;
  noAddedFactsPass: null;
  noMaterialOmissionsPass: null;
  meaningPreservation: null;
  cefrFit: null;
  fluency: null;
  tonePreservation: null;
  reviewerNotes: "";
}

interface CaseResult {
  caseId: string;
  sourceLanguage: string;
  targetLanguage: string;
  level: string;
  tags: string[];
  expectedFacts: string[];
  sourceText: string;
  httpStatus: number | null;
  durationMs: number;
  structuralChecks: StructuralChecks;
  structuralPass: boolean;
  response: AdaptResponse | null;
  error: string | null;
  humanReview: HumanReview;
}

const emptyReview: HumanReview = {
  targetLanguagePass: null,
  noAddedFactsPass: null,
  noMaterialOmissionsPass: null,
  meaningPreservation: null,
  cefrFit: null,
  fluency: null,
  tonePreservation: null,
  reviewerNotes: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseResponse(value: unknown): AdaptResponse | null {
  if (!isRecord(value)) return null;

  const requiredStrings = [
    "id",
    "title",
    "sourceText",
    "detectedSourceLanguage",
    "targetLanguage",
    "level",
    "adaptedText",
  ];

  if (requiredStrings.some((field) => typeof value[field] !== "string")) return null;
  return value as unknown as AdaptResponse;
}

function checksFor(
  item: QualityCase,
  status: number | null,
  response: AdaptResponse | null,
): StructuralChecks {
  const detectedBaseLanguage = response?.detectedSourceLanguage.toLowerCase().split("-")[0];

  return {
    statusOk: status === 200,
    responseShapeOk: response !== null,
    sourceTextPreserved: response?.sourceText === item.text,
    sourceLanguageDetected: detectedBaseLanguage === item.code,
    targetLanguagePreserved: response?.targetLanguage === item.targetLanguage,
    levelPreserved: response?.level === item.level,
    adaptedTextPresent: Boolean(response?.adaptedText.trim()),
  };
}

function allChecksPass(checks: StructuralChecks): boolean {
  return Object.values(checks).every(Boolean);
}

async function runCase(
  item: QualityCase,
  endpoint: string,
  publishableKey?: string,
): Promise<CaseResult> {
  const startedAt = performance.now();
  let status: number | null = null;
  let response: AdaptResponse | null = null;
  let error: string | null = null;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (publishableKey) {
      headers.Authorization = `Bearer ${publishableKey}`;
      headers.apikey = publishableKey;
    }

    const result = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: item.text,
        targetLanguage: item.targetLanguage,
        level: item.level,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    status = result.status;
    const bodyText = await result.text();

    try {
      const body = JSON.parse(bodyText) as unknown;
      response = result.ok ? parseResponse(body) : null;
      if (!result.ok) {
        error = isRecord(body) ? JSON.stringify(body) : `HTTP ${result.status}`;
      } else if (!response) {
        error = "The endpoint returned an invalid success response.";
      }
    } catch {
      error = `The endpoint returned non-JSON content with HTTP ${result.status}.`;
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Unknown request failure.";
  }

  const structuralChecks = checksFor(item, status, response);

  return {
    caseId: item.id,
    sourceLanguage: item.code,
    targetLanguage: item.targetLanguage,
    level: item.level,
    tags: [...item.tags],
    expectedFacts: [...item.expectedFacts],
    sourceText: item.text,
    httpStatus: status,
    durationMs: Math.round(performance.now() - startedAt),
    structuralChecks,
    structuralPass: allChecksPass(structuralChecks),
    response,
    error,
    humanReview: { ...emptyReview },
  };
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function buildReviewCsv(results: CaseResult[]): string {
  const headers = [
    "caseId",
    "sourceLanguage",
    "targetLanguage",
    "level",
    "structuralPass",
    "sourceText",
    "adaptedText",
    "expectedFacts",
    "targetLanguagePass",
    "noAddedFactsPass",
    "noMaterialOmissionsPass",
    "meaningPreservation_1_to_5",
    "cefrFit_1_to_5",
    "fluency_1_to_5",
    "tonePreservation_1_to_5",
    "reviewerNotes",
  ];

  const rows = results.map((result) =>
    [
      result.caseId,
      result.sourceLanguage,
      result.targetLanguage,
      result.level,
      result.structuralPass,
      result.sourceText,
      result.response?.adaptedText ?? "",
      result.expectedFacts.join(" | "),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]
      .map(csvCell)
      .join(","),
  );

  return [headers.map(csvCell).join(","), ...rows].join("\n");
}

async function main(): Promise<void> {
  const endpoint = process.env.READIVER_ADAPT_URL?.trim();
  if (!endpoint) {
    throw new Error("Set READIVER_ADAPT_URL to the deployed /adapt endpoint.");
  }
  const endpointUrl: string = endpoint;

  const requestedIds = new Set(
    (process.env.READIVER_EVAL_CASES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const cases = requestedIds.size
    ? QUALITY_CASES.filter(({ id }) => requestedIds.has(id))
    : QUALITY_CASES;

  if (requestedIds.size && cases.length !== requestedIds.size) {
    const found = new Set(cases.map(({ id }) => id));
    const missing = [...requestedIds].filter((id) => !found.has(id));
    throw new Error(`Unknown READIVER_EVAL_CASES: ${missing.join(", ")}`);
  }

  const concurrency = Number(process.env.READIVER_EVAL_CONCURRENCY ?? "3");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) {
    throw new Error("READIVER_EVAL_CONCURRENCY must be an integer from 1 to 6.");
  }

  const results: CaseResult[] = new Array(cases.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < cases.length) {
      const index = nextIndex++;
      const item = cases[index];
      process.stdout.write(`[${index + 1}/${cases.length}] ${item.id}\n`);
      results[index] = await runCase(
        item,
        endpointUrl,
        process.env.READIVER_SUPABASE_PUBLISHABLE_KEY?.trim(),
      );
    }
  }

  const startedAt = new Date();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, cases.length) }, () => worker()),
  );
  const finishedAt = new Date();
  const structuralPasses = results.filter(({ structuralPass }) => structuralPass).length;
  const stamp = startedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const outputDirectory = path.resolve(
    process.env.READIVER_EVAL_OUTPUT_DIR ??
      path.join(process.cwd(), "../../evals/adaptation-quality/results"),
  );
  const jsonPath = path.join(outputDirectory, `run-${stamp}.json`);
  const csvPath = path.join(outputDirectory, `review-${stamp}.csv`);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    jsonPath,
    `${JSON.stringify(
      {
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        endpoint: endpointUrl,
        configurationLabel: process.env.READIVER_EVAL_LABEL?.trim() || "unlabelled",
        model: "server-configured",
        caseCount: results.length,
        structuralPasses,
        structuralFailures: results.length - structuralPasses,
        results,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(csvPath, `${buildReviewCsv(results)}\n`);

  process.stdout.write(
    `Structural checks: ${structuralPasses}/${results.length} passed\nJSON: ${jsonPath}\nReview CSV: ${csvPath}\n`,
  );
  if (structuralPasses !== results.length) process.exitCode = 1;
}

await main();
