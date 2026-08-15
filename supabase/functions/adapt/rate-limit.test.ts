import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRateLimiter,
  parseRateLimitInteger,
  resolveSupabaseSecretKey,
} from "./rate-limit.ts";

test("checks the protected RPC with a one-way client identifier", async () => {
  let capturedBody: Record<string, unknown> | undefined;
  let capturedHeaders: Headers | undefined;
  const limiter = createPostgresRateLimiter({
    supabaseUrl: "https://project.supabase.co/",
    serviceRoleKey: "server-only-test-key",
    maxRequests: 20,
    windowSeconds: 86_400,
    fetcher: async (_input, init) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      capturedHeaders = new Headers(init?.headers);
      return Response.json([{ allowed: true, remaining: 19, retry_after_seconds: 0 }]);
    },
  });

  const decision = await limiter.check(
    new Request("https://example.com/adapt", { headers: { "cf-connecting-ip": "203.0.113.7" } }),
  );

  assert.deepEqual(decision, { allowed: true, remaining: 19, retryAfterSeconds: 0 });
  assert.equal(capturedBody?.p_window_seconds, 86_400);
  assert.equal(capturedBody?.p_max_requests, 20);
  assert.match(String(capturedBody?.p_identifier_hash), /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(capturedBody), /203\.0\.113\.7/);
  assert.equal(capturedHeaders?.get("apikey"), "server-only-test-key");
  assert.equal(capturedHeaders?.has("Authorization"), false);
});

test("rejects malformed RPC responses", async () => {
  const limiter = createPostgresRateLimiter({
    supabaseUrl: "https://project.supabase.co",
    serviceRoleKey: "server-only-test-key",
    fetcher: async () => Response.json([{ allowed: "yes" }]),
  });

  await assert.rejects(() => limiter.check(new Request("https://example.com/adapt")));
});

test("bounds environment configuration", () => {
  assert.equal(parseRateLimitInteger("12", 20, 1, 100), 12);
  assert.equal(parseRateLimitInteger("0", 20, 1, 100), 20);
  assert.equal(parseRateLimitInteger("not-a-number", 20, 1, 100), 20);
});

test("prefers the current Supabase secret key with a legacy fallback", () => {
  assert.equal(
    resolveSupabaseSecretKey('{"default":"sb_secret_current"}', "legacy-jwt"),
    "sb_secret_current",
  );
  assert.equal(resolveSupabaseSecretKey(undefined, "legacy-jwt"), "legacy-jwt");
  assert.equal(resolveSupabaseSecretKey("invalid-json", "legacy-jwt"), "legacy-jwt");
});

test("adds bearer authorization only for a legacy JWT service-role key", async () => {
  let currentHeaders: Headers | undefined;
  let legacyHeaders: Headers | undefined;
  const response = () =>
    Response.json([{ allowed: true, remaining: 19, retry_after_seconds: 0 }]);

  await createPostgresRateLimiter({
    supabaseUrl: "https://project.supabase.co",
    serviceRoleKey: "sb_secret_current",
    fetcher: async (_input, init) => {
      currentHeaders = new Headers(init?.headers);
      return response();
    },
  }).check(new Request("https://example.com/adapt"));

  await createPostgresRateLimiter({
    supabaseUrl: "https://project.supabase.co",
    serviceRoleKey: "eyJlegacy-jwt",
    fetcher: async (_input, init) => {
      legacyHeaders = new Headers(init?.headers);
      return response();
    },
  }).check(new Request("https://example.com/adapt"));

  assert.equal(currentHeaders?.has("Authorization"), false);
  assert.equal(legacyHeaders?.get("Authorization"), "Bearer eyJlegacy-jwt");
});
