# Readiver Product

## Purpose

Readiver turns real-world text into language-learning content appropriate for the
user's selected CEFR level. Its promise is simple: **Read anything at your
level.** AI enables the adaptation, but is not the product's identity.

## Target user

Readiver is for language learners who want to consume content they actually care
about instead of relying only on pre-written textbook or graded-reader material.

## MVP scope

The MVP follows one focused path:

1. Paste source text.
2. Select a target language.
3. Select A1, A2, B1, B2, C1, or C2.
4. Adapt the text while preserving its meaning and adjusting vocabulary,
   sentence complexity, and structure.
5. Read the result in a clean editorial reader.

The original text is retained with the adaptation. A minimal saved-reading model
supports later retrieval and cross-client sync through one authenticated
account. Rich library management is not part of the first release.

## First validation slice

The first working slice intentionally validates adaptation quality before account
or library behavior. It supports anonymous, non-persisted adaptations on the web
for English, German, Spanish, French, Italian, and Turkish. The reader keeps the
original text in browser state so it can be inspected alongside the result.

This slice does not change the longer-term authenticated saved-reading model.
Authentication and persistence begin only after adaptation quality is measured
with representative content and CEFR levels.

Quality measurement begins with an equal baseline across all 36 directions
between the six supported languages. The baseline distributes A1 through C2
evenly and combines automated contract checks with a human scorecard for target
language, factual preservation, omissions, CEFR fit, fluency, and tone. It must
grow with production-derived and adversarial cases rather than becoming a static
claim of language coverage.

CEFR is a readability target and ceiling. The system should not make an already
simple source unnaturally ornate merely because C1 or C2 is selected, so very
simple inputs may produce similar or even identical results at several levels.
For sufficiently complex input, however, lower and upper levels should show
meaningful differences in vocabulary, grammar, and sentence structure. A fixed
A1–C2 level-sensitivity fixture monitors that distinction separately from the
balanced direction matrix.

The quality baseline is a release gate, not a self-evaluation claim. Every human
review row must be complete, factual safety gates must pass, and meaning, CEFR,
fluency, and tone scores must each be at least 4 out of 5. A deterministic local
summary reports failures and incomplete reviews; no provider model grades its
own adaptation in this baseline.

## Explicit MVP non-goals

The initial MVP does not include:

- flashcards, streaks, achievements, or other gamification;
- AI chat or a social feed;
- grammar courses;
- pronunciation coaching or speech recognition;
- PDF import, URL scraping, YouTube import, or article extraction;
- complex analytics; or
- community features.

These ideas can be evaluated after the core adaptation experience is validated.
They must not leak into the initial implementation.

## Core UX principle

The primary flow should feel almost instant:

```text
Paste → Select language → Select level → Adapt → Read
```

Every product decision should reduce friction in that sequence. Secondary
controls should stay quiet, and technical details about models or prompts should
remain invisible to the reader.
