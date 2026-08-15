import { createHandler } from "./handler.ts";
import { createOpenAIAdapter, parseOpenAIReasoningEffort } from "./openai.ts";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const provider = createOpenAIAdapter({
  apiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
  model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5.6-sol",
  reasoningEffort: parseOpenAIReasoningEffort(Deno.env.get("OPENAI_REASONING_EFFORT")),
});

Deno.serve(createHandler({ provider, allowedOrigins }));
