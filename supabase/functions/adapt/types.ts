export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "it", name: "Italian" },
  { code: "tr", name: "Turkish" },
] as const;

export const MAX_TEXT_CHARACTERS = 8_000;

export type CefrLevel = (typeof CEFR_LEVELS)[number];
export type TargetLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export interface AdaptRequest {
  text: string;
  targetLanguage: TargetLanguage;
  level: CefrLevel;
}

export interface ProviderAdaptation {
  title: string;
  detectedSourceLanguage: string;
  adaptedText: string;
}

export interface AdaptResponse extends ProviderAdaptation {
  id: string;
  sourceText: string;
  targetLanguage: TargetLanguage;
  level: CefrLevel;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string | number>;
  };
}

export interface AdaptProvider {
  adapt(request: AdaptRequest): Promise<ProviderAdaptation>;
}
