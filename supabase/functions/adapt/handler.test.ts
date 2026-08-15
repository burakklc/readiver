import assert from "node:assert/strict";
import test from "node:test";
import { createHandler } from "./handler.ts";
import { ProviderError } from "./openai.ts";

const logger = {
  info() {},
  warn() {},
  error() {},
};

test("returns the shared response contract without persistence", async () => {
  const handler = createHandler({
    logger,
    provider: {
      async adapt() {
        return {
          adaptation: {
            title: "A Clearer Morning",
            detectedSourceLanguage: "en",
            adaptedText: "The morning was calm and clear.",
          },
          usage: {
            provider: "openai" as const,
            model: "test-model",
            inputTokens: 100,
            cachedInputTokens: 0,
            outputTokens: 200,
            reasoningTokens: 50,
            totalTokens: 300,
          },
        };
      },
    },
  });

  const response = await handler(
    new Request("http://localhost/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "  The morning was tranquil.  ", targetLanguage: "en", level: "A2" }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(body.id, /^[0-9a-f-]{36}$/);
  assert.equal(body.sourceText, "The morning was tranquil.");
  assert.equal(body.targetLanguage, "en");
  assert.equal(body.level, "A2");
});

test("maps malformed provider output to a safe structured error", async () => {
  const handler = createHandler({
    logger,
    provider: {
      async adapt() {
        throw new ProviderError("invalid_response");
      },
    },
  });

  const response = await handler(
    new Request("http://localhost/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Source", targetLanguage: "de", level: "B1" }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "invalid_provider_response",
      message: "The adaptation could not be completed safely.",
    },
  });
});

test("logs operational usage without logging source or adapted text", async () => {
  const infoEvents: Array<[string, Record<string, unknown>]> = [];
  const handler = createHandler({
    logger: {
      info(message, details) {
        infoEvents.push([String(message), details as Record<string, unknown>]);
      },
      warn() {},
      error() {},
    },
    provider: {
      async adapt() {
        return {
          adaptation: {
            title: "Gizli başlık",
            detectedSourceLanguage: "tr",
            adaptedText: "Kaydedilmemesi gereken uyarlanmış metin.",
          },
          usage: {
            provider: "openai" as const,
            model: "test-model",
            inputTokens: 800,
            cachedInputTokens: 100,
            outputTokens: 1_200,
            reasoningTokens: 400,
            totalTokens: 2_000,
          },
        };
      },
    },
  });

  await handler(
    new Request("http://localhost/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Kaydedilmemesi gereken kaynak metin.",
        targetLanguage: "en",
        level: "B1",
      }),
    }),
  );

  const completion = infoEvents.find(([name]) => name === "adapt.request_completed");
  assert.ok(completion);
  assert.equal(completion[1].inputTokens, 800);
  assert.equal(completion[1].reasoningTokens, 400);
  assert.equal(completion[1].characterCount, 36);
  assert.doesNotMatch(JSON.stringify(infoEvents), /Kaydedilmemesi|Gizli başlık/);
});
