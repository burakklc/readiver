import { ADAPTATION_SYSTEM_PROMPT, buildAdaptationInput } from "./prompt.ts";
import type { AdaptProvider, AdaptRequest, ProviderAdaptation } from "./types.ts";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const reasoningEfforts = ["low", "medium"] as const;

export type OpenAIReasoningEffort = (typeof reasoningEfforts)[number];

const adaptationSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    detectedSourceLanguage: { type: "string", minLength: 2, maxLength: 35 },
    adaptedText: { type: "string", minLength: 1, maxLength: 40_000 },
  },
  required: ["title", "detectedSourceLanguage", "adaptedText"],
  additionalProperties: false,
} as const;

type ProviderFailureKind = "rate_limit" | "unavailable" | "invalid_response";

export class ProviderError extends Error {
  public readonly kind: ProviderFailureKind;

  constructor(kind: ProviderFailureKind) {
    super(kind);
    this.name = "ProviderError";
    this.kind = kind;
  }
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface OpenAIAdapterOptions {
  apiKey: string;
  model?: string;
  reasoningEffort?: OpenAIReasoningEffort;
  fetcher?: Fetcher;
}

export function parseOpenAIReasoningEffort(value: string | undefined): OpenAIReasoningEffort {
  return reasoningEfforts.includes(value as OpenAIReasoningEffort)
    ? (value as OpenAIReasoningEffort)
    : "medium";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateProviderAdaptation(value: unknown): ProviderAdaptation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProviderError("invalid_response");
  }

  const candidate = value as Record<string, unknown>;
  if (
    !isNonEmptyString(candidate.title) ||
    !isNonEmptyString(candidate.detectedSourceLanguage) ||
    !isNonEmptyString(candidate.adaptedText) ||
    candidate.title.length > 200 ||
    candidate.detectedSourceLanguage.length > 35 ||
    candidate.adaptedText.length > 40_000
  ) {
    throw new ProviderError("invalid_response");
  }

  const sourceLanguage = candidate.detectedSourceLanguage.trim().toLowerCase();
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(sourceLanguage)) {
    throw new ProviderError("invalid_response");
  }

  return {
    title: candidate.title.trim(),
    detectedSourceLanguage: sourceLanguage,
    adaptedText: candidate.adaptedText.trim(),
  };
}

export function parseOpenAIResponse(value: unknown): ProviderAdaptation {
  if (typeof value !== "object" || value === null) {
    throw new ProviderError("invalid_response");
  }

  const response = value as {
    status?: unknown;
    output?: Array<{ type?: unknown; content?: Array<Record<string, unknown>> }>;
  };

  if (response.status !== "completed" || !Array.isArray(response.output)) {
    throw new ProviderError("invalid_response");
  }

  for (const item of response.output) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (content.type === "refusal") {
        throw new ProviderError("invalid_response");
      }

      if (content.type === "output_text" && isNonEmptyString(content.text)) {
        try {
          return validateProviderAdaptation(JSON.parse(content.text));
        } catch (cause) {
          if (cause instanceof ProviderError) throw cause;
          throw new ProviderError("invalid_response");
        }
      }
    }
  }

  throw new ProviderError("invalid_response");
}

export function createOpenAIAdapter({
  apiKey,
  model = "gpt-5.6-sol",
  reasoningEffort = "medium",
  fetcher = fetch,
}: OpenAIAdapterOptions): AdaptProvider {
  return {
    async adapt(request: AdaptRequest): Promise<ProviderAdaptation> {
      if (!apiKey) throw new ProviderError("unavailable");

      let response: Response;
      try {
        response = await fetcher(OPENAI_RESPONSES_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            store: false,
            reasoning: { effort: reasoningEffort },
            max_output_tokens: 12_000,
            input: [
              { role: "system", content: ADAPTATION_SYSTEM_PROMPT },
              { role: "user", content: buildAdaptationInput(request) },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "readiver_adaptation",
                strict: true,
                schema: adaptationSchema,
              },
            },
          }),
          signal: AbortSignal.timeout(45_000),
        });
      } catch {
        throw new ProviderError("unavailable");
      }

      if (response.status === 429) throw new ProviderError("rate_limit");
      if (!response.ok) throw new ProviderError("unavailable");

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new ProviderError("invalid_response");
      }

      return parseOpenAIResponse(body);
    },
  };
}
