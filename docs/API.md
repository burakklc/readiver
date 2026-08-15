# Readiver API

This document defines the initial product-level HTTP contract. JSON field names
use camelCase and text is UTF-8. Successful responses use the resource directly;
errors use the common envelope below.

## Adapt text

The public product route is conceptually `POST /adapt`. The first deployment is
a Supabase Edge Function and is reached at:

```http
POST {SUPABASE_URL}/functions/v1/adapt
Authorization: Bearer <supabase-anon-key>
apikey: <supabase-anon-key>
Content-Type: application/json
```

The anon key grants project gateway access; it is not an authenticated user
session. This first quality-validation slice requires no account and creates no
database record.

Request:

```json
{
  "text": "Source text",
  "targetLanguage": "de",
  "level": "B1"
}
```

Successful response (`200 OK`):

```json
{
  "id": "uuid",
  "title": "Generated or inferred title",
  "sourceText": "Original source text",
  "detectedSourceLanguage": "en",
  "targetLanguage": "de",
  "level": "B1",
  "adaptedText": "Adapted text"
}
```

The returned ID is request-scoped and future-compatible; it is not currently a
persisted document ID. The server trims surrounding source whitespace, detects
the source language through the provider's structured output, adapts or
translates the text, validates the response, and returns it.

## Supported target languages

The MVP accepts this documented BCP 47 subset:

| Code | Language |
| --- | --- |
| `en` | English |
| `de` | German |
| `es` | Spanish |
| `fr` | French |
| `it` | Italian |
| `tr` | Turkish |

Source text may be in another language if the configured model can detect and
adapt it. `level` is exactly one of `A1`, `A2`, `B1`, `B2`, `C1`, or `C2`.

## Validation

- `text` is required, must be a string, and must contain non-whitespace content.
- Surrounding whitespace is trimmed before adaptation and in the response.
- `text` may contain at most 8,000 Unicode code points. It is never truncated.
- `targetLanguage` must be one of the supported codes above.
- `level` must be one of the six documented CEFR levels.
- Unknown fields are rejected to surface contract drift early.

Client validation improves feedback but never replaces server validation.

## Error format

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Paste some text before adapting it.",
    "details": {
      "field": "text"
    }
  }
}
```

Stable error codes:

| HTTP | Code | Meaning |
| --- | --- | --- |
| `400` | `invalid_request` | Malformed JSON, empty text, or unknown field |
| `400` | `unsupported_language` | Target language is outside the MVP set |
| `400` | `unsupported_level` | CEFR level is invalid |
| `400` | `text_too_long` | Source exceeds 8,000 Unicode characters |
| `403` | `origin_not_allowed` | Browser origin is not configured server-side |
| `405` | `method_not_allowed` | Method is not POST or OPTIONS |
| `429` | `rate_limited` | Provider capacity or quota is temporarily limited |
| `502` | `invalid_provider_response` | Provider output failed server validation |
| `503` | `provider_unavailable` | Provider, credentials, or network is unavailable |

Messages are human-safe. Errors never include prompts, provider response bodies,
credentials, authorization headers, stack traces, or source text.

## CORS

Browser origins must exactly match the comma-separated `ALLOWED_ORIGINS` Edge
Function secret. Localhost and `127.0.0.1` on port 3000 are the development
defaults. Production must configure its deployed web origin explicitly.

## Idempotency and persistence

This slice performs one provider call per accepted request and creates no server
resource, so it does not yet implement idempotency storage. The UI disables
repeat submission while a request is in flight. An authenticated, persisted
future version must add per-user idempotency before document creation.

## Saved documents (future)

`GET /documents`, `GET /documents/:id`, and `DELETE /documents/:id` remain
reserved for the authenticated saved-reading flow. They are not implemented in
this slice.
