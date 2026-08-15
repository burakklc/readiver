# Readiver

Readiver turns real-world writing into reading material at a selected language
and CEFR level. The product promise is **Read anything at your level.**

The first working vertical slice is intentionally small:

```text
Paste → Select language → Select level → Adapt → Read
```

It includes a responsive Next.js experience and a real Supabase Edge Function
that securely calls OpenAI. Authentication, persistence, iOS product behavior,
payments, and library features are deliberately outside this slice.

## Repository

```text
apps/web/                       Next.js web experience
apps/ios/                       Native SwiftUI foundation (not changed in this slice)
supabase/functions/adapt/       Validation, prompt, OpenAI adapter, HTTP handler
supabase/migrations/            Future authenticated document schema
docs/                           Product, brand, architecture, and API sources of truth
```

## Current product behavior

- Target languages: English, German, Spanish, French, Italian, and Turkish.
- Reading levels: A1, A2, B1, B2, C1, and C2.
- Maximum source length: 8,000 Unicode characters.
- Same-language requests adapt the reading level without translation.
- Cross-language requests translate and adapt in one provider call.
- Results are validated structured JSON and are not persisted.
- The original remains in browser state behind a minimal disclosure.

## AI provider

The Edge Function uses OpenAI's Responses API with strict JSON Schema Structured
Outputs. The quality-validation model is `gpt-5.6-sol` with medium reasoning
effort. It was selected after a balanced Terra baseline and focused Sol/Terra
comparison exposed material improvements in low-level German, Turkish, and
French editing. `OPENAI_MODEL` and `OPENAI_REASONING_EFFORT` keep this a
server-side deployment choice; changing them does not affect the web contract.

The provider request uses `store: false` and one model call per adaptation.
Source text is passed as untrusted data. The system
instruction explicitly prohibits following embedded instructions, inventing
facts, answering questions, adding opinions, or turning the result into a
summary. Provider errors and malformed output are converted to safe API errors.

## Prerequisites

- Node.js 22 and npm 10
- Supabase CLI and Docker for local Edge Function execution
- A Supabase project for hosted integration
- An OpenAI API key with access to the configured model
- Xcode 26 or another Xcode version capable of iOS 17 builds (foundation only)

## Environment

Use [`.env.example`](./.env.example) as the list of configuration names. Never
commit populated environment files.

Web-only values in `apps/web/.env.local`:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Edge Function secrets:

```sh
OPENAI_API_KEY=YOUR_SERVER_ONLY_KEY
OPENAI_MODEL=gpt-5.6-sol
OPENAI_REASONING_EFFORT=medium
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

The OpenAI key must exist only in local function env files or Supabase secrets.
It must never use a `NEXT_PUBLIC_` prefix.

## Run the web app

```sh
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run the backend locally

From the repository root:

```sh
supabase start
supabase functions serve adapt --env-file supabase/.env.local --no-verify-jwt
```

Create the ignored `supabase/.env.local` yourself with the four server values
shown above. Use the local URL and anon key printed by `supabase status` in
`apps/web/.env.local`.

Test the function directly:

```sh
curl -i http://127.0.0.1:54321/functions/v1/adapt \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -H "apikey: YOUR_LOCAL_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"A moderately complex source text.","targetLanguage":"de","level":"B1"}'
```

## Deploy the backend

After logging in and linking the intended Supabase project:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set OPENAI_API_KEY=YOUR_KEY OPENAI_MODEL=gpt-5.6-sol OPENAI_REASONING_EFFORT=medium ALLOWED_ORIGINS=https://YOUR_WEB_DOMAIN
supabase functions deploy adapt --no-verify-jwt
```

The endpoint is then
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/adapt`. The function is
anonymous for this validation slice and does not touch user-owned tables.

## Validation

From `apps/web`:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Backend tests use a mocked provider and spend no OpenAI credits. Web tests cover
the disabled CTA, language and level selection, reader transition, and errors.

## Adaptation quality evaluation

The repository includes a balanced live evaluation matrix covering all 36
directions between the six supported languages, with A1–C2 represented equally.
It calls the deployed Readiver backend rather than the provider directly and
produces ignored JSON results plus a human-review CSV:

```sh
cd apps/web
READIVER_ADAPT_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/adapt \
READIVER_EVAL_LABEL=sol-medium-v1 \
  npm run eval:quality
```

See [`evals/adaptation-quality/README.md`](./evals/adaptation-quality/README.md)
for coverage, focused runs, and the factual-preservation/CEFR review rubric.

## iOS foundation

Open `apps/ios/Readiver.xcodeproj`, select the `Readiver` scheme and an iOS
simulator, then Run. iOS still displays only its foundation screen; it does not
call `/adapt` in this slice.

## Known limitations

- No account, saved library, or database persistence.
- No trustworthy per-user quota until authentication exists; upstream 429s are
  safely translated, and Supabase/OpenAI project spend limits should be set.
- Adaptation quality still needs a repeatable human evaluation set across
  language pairs and CEFR levels.
- Live scenarios require a configured Supabase project and OpenAI secret.
