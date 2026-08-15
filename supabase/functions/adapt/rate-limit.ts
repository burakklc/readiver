export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(request: Request): Promise<RateLimitDecision>;
}

interface PostgresRateLimiterOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  maxRequests?: number;
  windowSeconds?: number;
  fetcher?: typeof fetch;
}

const encoder = new TextEncoder();

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function parseRateLimitInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  return isIntegerInRange(parsed, minimum, maximum) ? parsed : fallback;
}

export function resolveSupabaseSecretKey(
  secretKeysJson: string | undefined,
  legacyServiceRoleKey: string | undefined,
): string {
  if (secretKeysJson) {
    try {
      const secretKeys = JSON.parse(secretKeysJson) as unknown;
      if (
        typeof secretKeys === "object" &&
        secretKeys !== null &&
        typeof (secretKeys as Record<string, unknown>).default === "string"
      ) {
        return (secretKeys as Record<string, string>).default;
      }
    } catch {
      // Fall through to the legacy key for projects that have not migrated yet.
    }
  }

  return legacyServiceRoleKey ?? "";
}

async function identifierHash(request: Request, serviceRoleKey: string): Promise<string> {
  const clientAddress = request.headers.get("cf-connecting-ip")?.trim() || "address-unavailable";
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(serviceRoleKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`readiver-anonymous-adapt\0${clientAddress}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseDecision(value: unknown): RateLimitDecision {
  const row = Array.isArray(value) ? value[0] : undefined;
  if (typeof row !== "object" || row === null) throw new Error("invalid rate limit response");

  const candidate = row as Record<string, unknown>;
  if (
    typeof candidate.allowed !== "boolean" ||
    !isIntegerInRange(candidate.remaining, 0, 10_000) ||
    !isIntegerInRange(candidate.retry_after_seconds, 0, 604_800)
  ) {
    throw new Error("invalid rate limit response");
  }

  return {
    allowed: candidate.allowed,
    remaining: candidate.remaining,
    retryAfterSeconds: candidate.retry_after_seconds,
  };
}

export function createPostgresRateLimiter({
  supabaseUrl,
  serviceRoleKey,
  maxRequests = 20,
  windowSeconds = 86_400,
  fetcher = fetch,
}: PostgresRateLimiterOptions): RateLimiter {
  return {
    async check(request: Request): Promise<RateLimitDecision> {
      if (!supabaseUrl || !serviceRoleKey) throw new Error("rate limit configuration unavailable");

      const response = await fetcher(
        `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/check_adapt_rate_limit`,
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            "Content-Type": "application/json",
            ...(serviceRoleKey.startsWith("eyJ")
              ? { Authorization: `Bearer ${serviceRoleKey}` }
              : {}),
          },
          body: JSON.stringify({
            p_identifier_hash: await identifierHash(request, serviceRoleKey),
            p_window_seconds: windowSeconds,
            p_max_requests: maxRequests,
          }),
          signal: AbortSignal.timeout(3_000),
        },
      );

      if (!response.ok) throw new Error("rate limit service unavailable");
      return parseDecision(await response.json());
    },
  };
}
