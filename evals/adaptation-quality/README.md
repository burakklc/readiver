# Adaptation quality evaluation

This suite measures Readiver's core promise across every supported language
direction without adding product scope. It generates real adaptations through
the deployed backend; it never calls OpenAI directly.

## Coverage

- 6 source languages × 6 target languages = 36 directions.
- 30 translation-and-adaptation cases and 6 same-language adaptation cases.
- Each source language appears 6 times.
- Each target language appears 6 times.
- Each CEFR level from A1 through C2 appears 6 times.
- Fixtures contain reviewable numbers, causal relationships, quotations,
  contrasts, or stated intent.

The first matrix is a balanced baseline, not a claim that one example represents
an entire language. Add production-derived and adversarial cases over time while
keeping this baseline stable for regression comparisons.

## Run

From `apps/web`:

```sh
READIVER_ADAPT_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/adapt \
READIVER_EVAL_LABEL=sol-medium-v1 \
  npm run eval:quality
```

The anonymous validation endpoint does not require a publishable key. If gateway
configuration later requires one, set `READIVER_SUPABASE_PUBLISHABLE_KEY` in the
shell. It is never written to an artifact.

The default concurrency is 3 and is capped at 6. The runner performs exactly one
request per selected case and does not retry automatically. To run a focused
subset:

```sh
READIVER_ADAPT_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/adapt \
READIVER_EVAL_CASES=en-de-a2,tr-en-c2 \
  npm run eval:quality
```

Use IDs from `cases.ts`; the example IDs above may change if the balanced matrix
changes. Generated JSON and review CSV files are written under `results/`, which
is ignored by Git.

Always set `READIVER_EVAL_LABEL` when comparing provider configurations or
prompt revisions. The label is stored with the run but is never sent to the
adaptation endpoint.

## Structural checks

The runner automatically verifies:

- HTTP success and response shape;
- exact preservation of source text in the contract;
- expected source-language detection;
- target language and CEFR metadata;
- presence of adapted text.

These checks catch contract failures, not linguistic quality.

## Human scorecard

Review the generated CSV without changing the source or expected-fact columns.
Use `true` or `false` for the four gates and integers from 1 to 5 for scored
dimensions. `unresolvedFactualConcern` must be `false` to pass.

| Dimension | Meaning |
| --- | --- |
| Target language gate | The output is actually written in the requested language. |
| No added facts gate | No unsupported facts, examples, opinions, or answers were introduced. |
| No material omissions gate | All facts listed in `expectedFacts` remain represented. |
| Unresolved factual concern gate | `true` means the reviewer found a factual concern that still needs resolution. |
| Meaning preservation | 1 changes the author's intent; 5 preserves meaning completely. |
| CEFR fit | 1 clearly misses the requested level; 5 is consistently appropriate. |
| Fluency | 1 is broken or unnatural; 5 reads like careful native editing. |
| Tone preservation | 1 materially changes tone; 5 preserves it where the level allows. |

A case passes the baseline when the first three gates are `true`,
`unresolvedFactualConcern` is `false`, and every numerical score is at least 4.
Treat a single failed hallucination gate as a release blocker. Reviewers should
cite a specific phrase when giving a score below 4.

After filling the CSV, create a machine-readable summary and release decision:

```sh
cd apps/web
npm run eval:review -- ../../evals/adaptation-quality/results/review-YOUR_RUN.csv
```

The command writes an ignored `review-...-summary.json` next to the CSV. It exits
with status 0 only when every row is complete and passes, status 1 when a
completed review fails, and status 2 while any row remains incomplete. The
summary reports score averages and exact failed dimensions but never uses an AI
model to judge its own output.

Human review is the baseline authority. A future model grader may help scale
pairwise comparisons only after its agreement is calibrated against these human
labels.
