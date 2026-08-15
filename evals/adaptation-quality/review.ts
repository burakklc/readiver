export interface ReviewFailure {
  caseId: string;
  sourceLanguage: string;
  targetLanguage: string;
  level: string;
  failedDimensions: string[];
  reviewerNotes: string;
}

export interface ReviewSummary {
  caseCount: number;
  completedReviews: number;
  incompleteReviews: number;
  passingCases: number;
  failingCases: number;
  releaseGate: "pass" | "fail" | "incomplete";
  averages: {
    meaningPreservation: number | null;
    cefrFit: number | null;
    fluency: number | null;
    tonePreservation: number | null;
  };
  incompleteCaseIds: string[];
  failures: ReviewFailure[];
}

const requiredColumns = [
  "caseId",
  "sourceLanguage",
  "targetLanguage",
  "level",
  "targetLanguagePass",
  "noAddedFactsPass",
  "noMaterialOmissionsPass",
  "unresolvedFactualConcern",
  "meaningPreservation_1_to_5",
  "cefrFit_1_to_5",
  "fluency_1_to_5",
  "tonePreservation_1_to_5",
  "reviewerNotes",
] as const;

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("Review CSV contains an unterminated quoted field.");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  return rows;
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function parseScore(value: string): number | null {
  const score = Number(value.trim());
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
}

export function summarizeReviewCsv(input: string): ReviewSummary {
  const rows = parseCsv(input);
  if (rows.length < 2) throw new Error("Review CSV must contain a header and at least one case.");

  const header = rows[0];
  const column = new Map(header.map((name, index) => [name, index]));
  const missingColumns = requiredColumns.filter((name) => !column.has(name));
  if (missingColumns.length) {
    throw new Error(`Review CSV is missing columns: ${missingColumns.join(", ")}`);
  }

  const value = (row: string[], name: (typeof requiredColumns)[number]): string =>
    row[column.get(name) ?? -1] ?? "";
  const failures: ReviewFailure[] = [];
  const incompleteCaseIds: string[] = [];
  const scoreBuckets = {
    meaningPreservation: [] as number[],
    cefrFit: [] as number[],
    fluency: [] as number[],
    tonePreservation: [] as number[],
  };
  let passingCases = 0;
  let completedReviews = 0;

  for (const row of rows.slice(1)) {
    const caseId = value(row, "caseId").trim();
    if (!caseId) throw new Error("Every review row must have a caseId.");

    const gates = {
      targetLanguagePass: parseBoolean(value(row, "targetLanguagePass")),
      noAddedFactsPass: parseBoolean(value(row, "noAddedFactsPass")),
      noMaterialOmissionsPass: parseBoolean(value(row, "noMaterialOmissionsPass")),
      unresolvedFactualConcern: parseBoolean(value(row, "unresolvedFactualConcern")),
    };
    const scores = {
      meaningPreservation: parseScore(value(row, "meaningPreservation_1_to_5")),
      cefrFit: parseScore(value(row, "cefrFit_1_to_5")),
      fluency: parseScore(value(row, "fluency_1_to_5")),
      tonePreservation: parseScore(value(row, "tonePreservation_1_to_5")),
    };

    if ([...Object.values(gates), ...Object.values(scores)].some((item) => item === null)) {
      incompleteCaseIds.push(caseId);
      continue;
    }

    completedReviews += 1;
    const completedScores = scores as Record<keyof typeof scores, number>;
    for (const key of Object.keys(scoreBuckets) as Array<keyof typeof scoreBuckets>) {
      scoreBuckets[key].push(completedScores[key]);
    }

    const failedDimensions = [
      ...Object.entries(gates)
        .filter(([name, passed]) =>
          name === "unresolvedFactualConcern" ? passed === true : passed === false,
        )
        .map(([name]) => name),
      ...Object.entries(completedScores)
        .filter(([, score]) => score < 4)
        .map(([name]) => name),
    ];

    if (!failedDimensions.length) {
      passingCases += 1;
      continue;
    }

    failures.push({
      caseId,
      sourceLanguage: value(row, "sourceLanguage"),
      targetLanguage: value(row, "targetLanguage"),
      level: value(row, "level"),
      failedDimensions,
      reviewerNotes: value(row, "reviewerNotes"),
    });
  }

  return {
    caseCount: rows.length - 1,
    completedReviews,
    incompleteReviews: incompleteCaseIds.length,
    passingCases,
    failingCases: failures.length,
    releaseGate: incompleteCaseIds.length ? "incomplete" : failures.length ? "fail" : "pass",
    averages: {
      meaningPreservation: average(scoreBuckets.meaningPreservation),
      cefrFit: average(scoreBuckets.cefrFit),
      fluency: average(scoreBuckets.fluency),
      tonePreservation: average(scoreBuckets.tonePreservation),
    },
    incompleteCaseIds,
    failures,
  };
}
