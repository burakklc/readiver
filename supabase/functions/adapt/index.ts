import { createHandler } from "./handler.ts";
import { createOpenAIAdapter, parseOpenAIReasoningEffort } from "./openai.ts";
import {
  createPostgresRateLimiter,
  parseRateLimitInteger,
  resolveSupabaseSecretKey,
} from "./rate-limit.ts";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const provider = createOpenAIAdapter({
  apiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
  model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5.6-sol",
  reasoningEffort: parseOpenAIReasoningEffort(Deno.env.get("OPENAI_REASONING_EFFORT")),
});

const rateLimiter = createPostgresRateLimiter({
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  serviceRoleKey: resolveSupabaseSecretKey(
    Deno.env.get("SUPABASE_SECRET_KEYS"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  ),
  maxRequests: parseRateLimitInteger(
    Deno.env.get("ANONYMOUS_RATE_LIMIT_MAX_REQUESTS"),
    20,
    1,
    10_000,
  ),
  windowSeconds: parseRateLimitInteger(
    Deno.env.get("ANONYMOUS_RATE_LIMIT_WINDOW_SECONDS"),
    86_400,
    60,
    604_800,
  ),
});

Deno.serve(createHandler({ provider, rateLimiter, allowedOrigins }));
