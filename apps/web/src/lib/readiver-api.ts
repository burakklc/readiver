export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "it", name: "Italian" },
  { code: "tr", name: "Turkish" },
] as const;

export const MAX_TEXT_CHARACTERS = 8_000;

export type CefrLevel = (typeof CEFR_LEVELS)[number];
export type TargetLanguage = (typeof LANGUAGES)[number]["code"];

export interface AdaptRequest {
  text: string;
  targetLanguage: TargetLanguage;
  level: CefrLevel;
}

export interface AdaptResponse {
  id: string;
  title: string;
  sourceText: string;
  detectedSourceLanguage: string;
  targetLanguage: TargetLanguage;
  level: CefrLevel;
  adaptedText: string;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string | number>;
  };
}

export class ReadiverApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ReadiverApiError";
  }
}

export async function adaptText(request: AdaptRequest): Promise<AdaptResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new ReadiverApiError(
      "Readiver is not connected to its adaptation service yet.",
      "service_not_configured",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/adapt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publishableKey}`,
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ReadiverApiError(
      "The adaptation service could not be reached. Check your connection and try again.",
      "network_error",
    );
  }

  let body: AdaptResponse | ErrorEnvelope;
  try {
    body = (await response.json()) as AdaptResponse | ErrorEnvelope;
  } catch {
    throw new ReadiverApiError(
      "The adaptation service returned an unreadable response.",
      "invalid_response",
    );
  }

  if (!response.ok) {
    const envelope = body as ErrorEnvelope;
    throw new ReadiverApiError(
      envelope.error?.message ?? "This text could not be adapted. Please try again.",
      envelope.error?.code ?? "request_failed",
      typeof envelope.error?.details?.field === "string"
        ? envelope.error.details.field
        : undefined,
    );
  }

  return body as AdaptResponse;
}
