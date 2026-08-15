import assert from "node:assert/strict";
import test from "node:test";
import { MAX_TEXT_CHARACTERS } from "./types.ts";
import { validateAdaptRequest } from "./validation.ts";

const validRequest = {
  text: "A meaningful source text.",
  targetLanguage: "de",
  level: "B1",
};

test("rejects empty text", () => {
  const result = validateAdaptRequest({ ...validRequest, text: "   " });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.body.error.code, "invalid_request");
});

test("rejects an invalid CEFR level", () => {
  const result = validateAdaptRequest({ ...validRequest, level: "B3" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.body.error.code, "unsupported_level");
});

test("rejects an unsupported target language", () => {
  const result = validateAdaptRequest({ ...validRequest, targetLanguage: "ja" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.body.error.code, "unsupported_language");
});

test("rejects text beyond the Unicode-aware character limit", () => {
  const result = validateAdaptRequest({
    ...validRequest,
    text: "🙂".repeat(MAX_TEXT_CHARACTERS + 1),
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.body.error.code, "text_too_long");
    assert.equal(result.body.error.details?.maxCharacters, MAX_TEXT_CHARACTERS);
  }
});

test("trims and accepts a valid request", () => {
  const result = validateAdaptRequest({ ...validRequest, text: "  Hello world.  " });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.text, "Hello world.");
});
