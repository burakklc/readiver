# Readiver API

This document defines the initial product-level HTTP contract. Only `POST
/adapt` is planned for the first vertical slice. Document endpoints are reserved
for the minimal saved-reading flow and need not be implemented in the
foundation.

JSON field names use camelCase. Text is UTF-8. Successful responses use the
resource directly; errors use the common envelope below.

## Adapt text

```http
POST /adapt
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
Idempotency-Key: <client-generated-unique-value>
```

Request:

```json
{
  "text": "Source text",
  "targetLanguage": "de",
  "level": "B1"
}
```

Successful response (`201 Created`):

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

The server authenticates the caller, validates the request, adapts the text,
persists the source and result as one user-owned document, and returns it. The
contract does not expose AI models, prompts, or provider response formats.

## Saved documents (future-compatible)

```http
GET /documents
GET /documents/:id
DELETE /documents/:id
```

`GET /documents` returns the authenticated user's documents in reverse creation
order. Pagination details should be added when the endpoint is implemented,
based on observed needs rather than speculated now. `GET /documents/:id`
returns one owned document. `DELETE /documents/:id` removes one owned document
and should return `204 No Content`. A missing document and a document owned by a
different user should both avoid revealing another user's data.

## Validation

- `text` is required, must be a string, and must contain non-whitespace content.
- `targetLanguage` is required and uses a documented, supported BCP 47 language
  tag subset. The backend, not each client, owns the supported list.
- `level` is exactly one of `A1`, `A2`, `B1`, `B2`, `C1`, or `C2`.
- Unknown fields may be rejected to surface client contract drift early.
- Route IDs must be valid UUIDs.

Client validation improves feedback but never replaces server validation.

## Error format

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request could not be processed.",
    "details": {
      "field": "text"
    }
  }
}
```

`code` is stable and machine-readable. `message` is safe to display or map to
client copy. `details` is optional and must not expose prompts, provider output,
credentials, stack traces, or other users' information. Use conventional HTTP
statuses: `400` invalid input, `401` missing/invalid authentication, `404`
unknown owned resource, `409` idempotency conflict, `429` usage limit, and `5xx`
for unavailable server-side work.

## Authentication and ownership

All endpoints require a valid Supabase access token. The server derives the user
ID from that token; clients never choose `user_id`. Database RLS provides a
second ownership boundary. The Supabase anon key identifies the project and is
safe client configuration, but it does not replace the user's access token.

## Idempotency

`POST /adapt` is expensive and creates data, so production clients should send a
unique `Idempotency-Key` for each intentional adaptation. The server should
return the original response when the same authenticated user repeats the same
key and equivalent request. Reusing a key with a different payload should return
`409`. Persistence for idempotency is deferred until `/adapt` is implemented so
the schema follows the actual function design. Reads are naturally idempotent;
repeating a document delete should not expose ownership information.

## Character and rate limits

The server must enforce a Unicode-aware source character limit before calling an
AI provider. The exact limit should be selected and documented during the first
vertical slice after testing latency, quality, and cost; clients should consume
that shared limit rather than invent different ones. Return a field-level `400`
when exceeded.

Rate limits should be applied per authenticated user, with conservative global
protection and a `Retry-After` header on `429` responses. Concrete quotas belong
to server configuration and product policy, not hard-coded client behavior.
