import assert from "node:assert/strict";
import test from "node:test";

import { LEVEL_SENSITIVITY_CASES, QUALITY_CASES, SOURCE_FIXTURES } from "./cases.ts";
import { CEFR_LEVELS, SUPPORTED_LANGUAGES } from "../../supabase/functions/adapt/types.ts";

test("covers every supported source and target language pair exactly once", () => {
  assert.equal(QUALITY_CASES.length, SUPPORTED_LANGUAGES.length ** 2);
  assert.equal(new Set(QUALITY_CASES.map(({ id }) => id)).size, QUALITY_CASES.length);

  for (const source of SOURCE_FIXTURES) {
    const sourceCases = QUALITY_CASES.filter(({ code }) => code === source.code);
    assert.deepEqual(
      new Set(sourceCases.map(({ targetLanguage }) => targetLanguage)),
      new Set(SUPPORTED_LANGUAGES.map(({ code }) => code)),
    );
  }
});

test("treats every source language, target language, and CEFR level equally", () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    assert.equal(QUALITY_CASES.filter((item) => item.code === code).length, 6);
    assert.equal(QUALITY_CASES.filter((item) => item.targetLanguage === code).length, 6);
  }

  for (const level of CEFR_LEVELS) {
    assert.equal(QUALITY_CASES.filter((item) => item.level === level).length, 6);
  }

  assert.equal(QUALITY_CASES.filter((item) => item.code === item.targetLanguage).length, 6);
  assert.equal(QUALITY_CASES.filter((item) => item.code !== item.targetLanguage).length, 30);
});

test("keeps fixtures inside the product input limit with reviewable facts", () => {
  for (const fixture of SOURCE_FIXTURES) {
    assert.ok(Array.from(fixture.text).length <= 8_000);
    assert.ok(fixture.expectedFacts.length >= 4);
    assert.ok(fixture.tags.length >= 2);
  }
});

test("compares one complex English to Turkish source across every CEFR level", () => {
  assert.deepEqual(
    LEVEL_SENSITIVITY_CASES.map(({ level }) => level),
    [...CEFR_LEVELS],
  );
  assert.equal(new Set(LEVEL_SENSITIVITY_CASES.map(({ text }) => text)).size, 1);
  assert.equal(new Set(LEVEL_SENSITIVITY_CASES.map(({ targetLanguage }) => targetLanguage)).size, 1);
  assert.ok(LEVEL_SENSITIVITY_CASES.every(({ targetLanguage }) => targetLanguage === "tr"));
  assert.ok(LEVEL_SENSITIVITY_CASES.every(({ tags }) => tags.includes("level-sensitivity")));
});
