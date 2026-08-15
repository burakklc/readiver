import assert from "node:assert/strict";
import test from "node:test";

import { summarizeReviewCsv } from "./review.ts";

const header = [
  "caseId",
  "sourceLanguage",
  "targetLanguage",
  "level",
  "targetLanguagePass",
  "noAddedFactsPass",
  "noMaterialOmissionsPass",
  "unresolvedFactualConcern",
  "meaningPreservation_1_to_5",
  "cefrFit_1_to_5",
  "fluency_1_to_5",
  "tonePreservation_1_to_5",
  "reviewerNotes",
].join(",");

test("passes a complete review with all gates and scores at four or above", () => {
  const summary = summarizeReviewCsv(
    `${header}\ncase-1,en,de,B1,true,true,true,false,5,4,5,4,"Natural, accurate result"\n`,
  );

  assert.equal(summary.releaseGate, "pass");
  assert.equal(summary.passingCases, 1);
  assert.deepEqual(summary.averages, {
    meaningPreservation: 5,
    cefrFit: 4,
    fluency: 5,
    tonePreservation: 4,
  });
});

test("fails a reviewed case when a safety gate or score fails", () => {
  const summary = summarizeReviewCsv(
    `${header}\ncase-1,tr,en,A2,true,false,true,true,3,4,4,4,"Added an example, factual concern remains"\n`,
  );

  assert.equal(summary.releaseGate, "fail");
  assert.deepEqual(summary.failures[0].failedDimensions, [
    "noAddedFactsPass",
    "unresolvedFactualConcern",
    "meaningPreservation",
  ]);
});

test("marks blank or invalid review values as incomplete", () => {
  const summary = summarizeReviewCsv(
    `${header}\ncase-1,fr,it,C1,true,true,true,false,5,,4,4,"Needs CEFR review"\n`,
  );

  assert.equal(summary.releaseGate, "incomplete");
  assert.deepEqual(summary.incompleteCaseIds, ["case-1"]);
});

test("parses quoted commas and escaped quotes in notes", () => {
  const summary = summarizeReviewCsv(
    `${header}\ncase-1,de,tr,B2,true,true,true,false,4,4,4,4,"Akıcı, ama \"\"resmî\"\""\n`,
  );

  assert.equal(summary.releaseGate, "pass");
});
