# Readiver Architecture

## Goals

The architecture favors solo development, AI-assisted coding, maintainability,
low operational overhead, and minimal premature abstraction. Readiver is one
product with two native clients and one backend, not a collection of
microservices.

```text
Web Client ─────┐
                ├──> Readiver Backend ──> AI Provider
iOS Client ─────┘
```

**Clients must never call AI providers directly.**

## Responsibilities

### Web

The Next.js and TypeScript client owns web presentation, interaction, session
handling, and calls to shared backend contracts. Server Components are the
default where useful; interactive reading controls can be Client Components.
The web app must not contain provider credentials, production prompts, provider
selection logic, or authoritative usage controls.

### iOS

The native SwiftUI client owns Apple-platform presentation, interaction, secure
session storage, and calls to the same backend contracts as the web app. Use
Swift concurrency and feature-oriented folders. The API client abstraction is a
boundary for transport and test doubles, not a second business-logic layer.

### Backend

Supabase provides PostgreSQL, Auth, Row Level Security, and Edge Functions.
Backend code authenticates requests, validates input, owns adaptation rules and
prompts, chooses the AI provider, enforces usage limits, records necessary
operational request data, calls the provider, and persists successful documents.
The backend is the source of truth for adaptation behavior.

The first validation slice implements `/adapt` as one Supabase Edge Function.
Its validation, CEFR instruction contract, provider adapter, structured-output
parsing, CORS policy, and safe logging remain server-side. It calls OpenAI once
through the Responses API and does not persist the result.

Successful provider responses expose token usage only to the internal backend
boundary. Completion logs record request ID, source character count, target
language, CEFR level, provider latency, model, input tokens, cached input tokens,
output tokens, reasoning tokens, and total tokens. They never contain source or
adapted text. Pricing is deliberately not hardcoded because provider rates can
change; cost reporting applies the current rate to these measured tokens.
OpenAI's `reasoningTokens` value is a diagnostic subset of `outputTokens`, so
cost calculations must not add it a second time.

## Authentication boundary

Supabase Auth issues sessions to clients. Clients may use the public Supabase URL
and anon key; authorization depends on the user's JWT and database RLS, not on
the anon key being secret. Privileged keys remain server-only. Edge Functions
must validate the authenticated user before accessing user-owned data.

The initial quality-validation slice is an explicit exception: `/adapt` accepts
anonymous requests and does not read or write user-owned data. The web client
sends the public Supabase anon key for gateway access, not as a user identity.
Authentication must be added before document saving, per-user quotas, or public
commercial launch. All future user-owned operations continue to require a valid
user session and RLS.

## AI boundary

AI credentials, prompts, provider choice, fallbacks, safety rules, usage
controls, and provider request logging remain in server-side secrets and Edge
Function code. Clients submit product concepts—source text, target language, and
CEFR level—and receive a product response. Provider-specific payloads and model
names must not become public API contracts.

## Data ownership and sync

Supabase PostgreSQL is the source of truth for profiles and saved documents.
Every document belongs to one Auth user through `user_id`; RLS enforces this
boundary. Web and iOS sync by reading and writing the same authenticated backend
records. Clients may later add local caches for responsiveness, but conflicts are
resolved against server timestamps and server state. Offline-first editing and
complex conflict resolution are outside the MVP.

Anonymous adaptations are transient. The Edge Function returns a request-scoped
UUID for contract compatibility, but no document row is created in this slice.

## Environment handling

Safe client configuration is limited to the Supabase project URL and anon key.
Web client variables use the `NEXT_PUBLIC_` prefix only for values safe to ship
to browsers. iOS will receive equivalent public values through build
configuration when integration begins. Service-role and AI provider keys live
only in server/Edge Function secret stores. Local values belong in ignored env
files; `.env.example` contains names and empty placeholders only.

## Error handling

The backend returns the stable error envelope in `API.md` with an HTTP status,
machine-readable code, human-safe message, and optional field details. It must
not leak prompts, provider responses, stack traces, keys, or internal IDs.
Clients translate codes into calm user-facing states and retain the user's input
when retry is possible. Timeouts and provider failures are retryable only when
safe; validation and authentication failures are not.

The anonymous slice relies on provider and platform limits and translates
upstream throttling into the stable `rate_limited` error. Distributed per-user
rate limiting is deferred until authentication provides a trustworthy identity.

## API principles

- Use a small HTTP/JSON surface with consistent camelCase payloads.
- Version intentionally before incompatible public changes are required.
- Validate at the server even when clients validate for responsiveness.
- Keep provider details behind product-oriented contracts.
- Make ownership explicit and rely on RLS as defense in depth.
- Add idempotency to expensive mutation requests before production traffic.
- Update `API.md` with any contract change before or alongside code.

## Future payment integration

Payments are not part of the MVP. If introduced, the payment provider should
send signed webhooks to server-side code, with entitlement state persisted in
the backend and checked during adaptation. Clients may display entitlement but
must not be its authority. Avoid coupling documents or profiles to a specific
payment provider until the commercial model is known.

## Change discipline

When the user gives a product-level implementation request, the coding agent
should determine the necessary web, iOS, backend, database, testing, and
documentation changes without requiring the user to break the task into
technical sub-tasks.

Prefer direct modules and explicit dependencies. Add abstraction only after a
concrete repeated need. A requested change that violates an authentication,
data, AI, or client boundary should be flagged rather than quietly implemented.
