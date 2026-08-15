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
          title: "A Clearer Morning",
          detectedSourceLanguage: "en",
          adaptedText: "The morning was calm and clear.",
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
