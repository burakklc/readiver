# Edge Functions

`adapt` is the first product Edge Function. It validates anonymous MVP requests,
builds the authoritative CEFR adaptation instruction, calls OpenAI through a
small provider adapter, validates strict structured output, and returns the
shared product response. It does not persist adaptations.

Required secrets are `OPENAI_API_KEY`, `OPENAI_MODEL`, and `ALLOWED_ORIGINS`.
`OPENAI_MODEL` defaults to `gpt-5.6-terra`; local origins are allowed by default.
Production deployments must set the exact deployed web origin.

Run backend unit tests from `apps/web` with `npm run test:backend`. These tests
mock the provider and never spend API credits.
