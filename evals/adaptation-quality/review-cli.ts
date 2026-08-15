import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { summarizeReviewCsv } from "./review.ts";

const csvPath = process.argv[2] ?? process.env.READIVER_REVIEW_CSV?.trim();
if (!csvPath) {
  throw new Error("Pass a review CSV path or set READIVER_REVIEW_CSV.");
}

const resolvedCsvPath = path.resolve(csvPath);
const summary = summarizeReviewCsv(await readFile(resolvedCsvPath, "utf8"));
const summaryPath = path.join(
  path.dirname(resolvedCsvPath),
  `${path.basename(resolvedCsvPath, path.extname(resolvedCsvPath))}-summary.json`,
);

await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\nSummary: ${summaryPath}\n`);

if (summary.releaseGate === "fail") process.exitCode = 1;
if (summary.releaseGate === "incomplete") process.exitCode = 2;
