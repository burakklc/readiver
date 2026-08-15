import { ProviderError } from "./openai.ts";
import { validateAdaptRequest } from "./validation.ts";
import type { AdaptProvider, ApiErrorBody } from "./types.ts";

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

interface HandlerOptions {
  provider: AdaptProvider;
  allowedOrigins?: string[];
  logger?: Pick<Console, "info" | "warn" | "error">;
}

function json(body: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

function apiError(code: string, message: string): ApiErrorBody {
  return { error: { code, message } };
}

function corsHeaders(origin: string | null, allowedOrigins: string[]): HeadersInit {
  if (!origin || !allowedOrigins.includes(origin)) return { Vary: "Origin" };

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function createHandler({
  provider,
  allowedOrigins = defaultOrigins,
  logger = console,
}: HandlerOptions): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, allowedOrigins);
    logger.info("adapt.request_received", { requestId, method: request.method });

    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn("adapt.validation_failed", { requestId, code: "origin_not_allowed" });
      return json(apiError("origin_not_allowed", "This origin is not allowed."), 403, cors);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json(apiError("method_not_allowed", "Use POST for this endpoint."), 405, {
        ...cors,
        Allow: "POST, OPTIONS",
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn("adapt.validation_failed", { requestId, code: "invalid_json" });
      return json(apiError("invalid_request", "The request body must be valid JSON."), 400, cors);
    }

    const validation = validateAdaptRequest(body);
    if (!validation.ok) {
      logger.warn("adapt.validation_failed", {
        requestId,
        code: validation.body.error.code,
        field: validation.body.error.details?.field,
      });
      return json(validation.body, validation.status, cors);
    }

    try {
      const result = await provider.adapt(validation.value);
      logger.info("adapt.request_completed", {
        requestId,
        characterCount: validation.characterCount,
        targetLanguage: validation.value.targetLanguage,
        level: validation.value.level,
      });

      return json(
        {
          id: crypto.randomUUID(),
          title: result.title,
          sourceText: validation.value.text,
          detectedSourceLanguage: result.detectedSourceLanguage,
          targetLanguage: validation.value.targetLanguage,
          level: validation.value.level,
          adaptedText: result.adaptedText,
        },
        200,
        cors,
      );
    } catch (cause) {
      const kind = cause instanceof ProviderError ? cause.kind : "unavailable";
      logger.error("adapt.provider_failure", { requestId, kind });

      if (kind === "rate_limit") {
        return json(
          apiError("rate_limited", "Adaptation is temporarily busy. Please try again shortly."),
          429,
          { ...cors, "Retry-After": "30" },
        );
      }

      if (kind === "invalid_response") {
        logger.error("adapt.structured_output_failure", { requestId });
        return json(
          apiError("invalid_provider_response", "The adaptation could not be completed safely."),
          502,
          cors,
        );
      }

      return json(
        apiError("provider_unavailable", "Adaptation is temporarily unavailable. Please try again."),
        503,
        cors,
      );
    }
  };
}
