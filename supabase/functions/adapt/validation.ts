import {
  CEFR_LEVELS,
  MAX_TEXT_CHARACTERS,
  SUPPORTED_LANGUAGES,
  type AdaptRequest,
  type ApiErrorBody,
  type CefrLevel,
  type TargetLanguage,
} from "./types.ts";

type ValidationResult =
  | { ok: true; value: AdaptRequest; characterCount: number }
  | { ok: false; status: number; body: ApiErrorBody };

const allowedFields = new Set(["text", "targetLanguage", "level"]);
const levels = new Set<string>(CEFR_LEVELS);
const languages = new Set<string>(SUPPORTED_LANGUAGES.map(({ code }) => code));

function error(
  code: string,
  message: string,
  details?: Record<string, string | number>,
): ValidationResult {
  return { ok: false, status: 400, body: { error: { code, message, details } } };
}

export function countCharacters(value: string): number {
  return Array.from(value).length;
}

export function validateAdaptRequest(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return error("invalid_request", "The request body must be a JSON object.");
  }

  const body = input as Record<string, unknown>;
  const unknownField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unknownField) {
    return error("invalid_request", "The request contains an unknown field.", {
      field: unknownField,
    });
  }

  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return error("invalid_request", "Paste some text before adapting it.", {
      field: "text",
    });
  }

  const text = body.text.trim();
  const characterCount = countCharacters(text);
  if (characterCount > MAX_TEXT_CHARACTERS) {
    return error("text_too_long", "This text is too long to adapt in one request.", {
      field: "text",
      maxCharacters: MAX_TEXT_CHARACTERS,
    });
  }

  if (typeof body.targetLanguage !== "string" || !languages.has(body.targetLanguage)) {
    return error("unsupported_language", "Choose a supported target language.", {
      field: "targetLanguage",
    });
  }

  if (typeof body.level !== "string" || !levels.has(body.level)) {
    return error("unsupported_level", "Choose a CEFR level from A1 to C2.", {
      field: "level",
    });
  }

  return {
    ok: true,
    characterCount,
    value: {
      text,
      targetLanguage: body.targetLanguage as TargetLanguage,
      level: body.level as CefrLevel,
    },
  };
}
