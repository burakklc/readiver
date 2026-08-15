# Edge Functions

`adapt` is the first product Edge Function. It validates anonymous MVP requests,
builds the authoritative CEFR adaptation instruction, calls OpenAI through a
small provider adapter, validates strict structured output, and returns the
shared product response. It does not persist adaptations.

Required secrets are `OPENAI_API_KEY`, `OPENAI_MODEL`,
`OPENAI_REASONING_EFFORT`, and `ALLOWED_ORIGINS`. The measured quality baseline
defaults to `gpt-5.6-sol` with medium reasoning effort; local origins are allowed
by default.
Production deployments must set the exact deployed web origin.

Run backend unit tests from `apps/web` with `npm run test:backend`. These tests
mock the provider and never spend API credits.

Successful completions log request metadata, provider latency, model, and exact
input, cached input, output, reasoning, and total token usage returned by
OpenAI. Source and adapted text are never logged. Token counts remain
backend-only, and provider pricing is not hardcoded.
OpenAI reports reasoning tokens as a subset of output tokens; do not add the two
fields together when calculating cost.
