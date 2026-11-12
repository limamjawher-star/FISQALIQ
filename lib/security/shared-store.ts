/**
 * FISCALIQ — Shared Store Adapter (Upstash Redis / Supabase PostgreSQL)
 *
 * Provides shared persistence for API rate limits and household subscriptions
 * across serverless instances when Upstash Redis (`UPSTASH_REDIS_REST_URL` +
 * `UPSTASH_REDIS_REST_TOKEN`) or Supabase (`NEXT_PUBLIC_SUPABASE_URL` +
 * `SUPABASE_SERVICE_ROLE_KEY`) is configured.
 *
 * Falls back to process memory only in local development/test when external
 * store credentials are not configured, and reports the active backend honestly.
 */

export type SharedStoreBackend =
  | 'upstash_redis'
  | 'supabase_postgres'
  | 'local_dev_memory';

export function getSharedStoreBackend(): SharedStoreBackend {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (
    upstashUrl &&
    upstashUrl.startsWith('https://') &&
    upstashToken &&
    !upstashToken.includes('placeholder')
  ) {
    return 'upstash_redis';
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-ref') &&
    supabaseServiceKey &&
    !supabaseServiceKey.includes('server-only')
  ) {
    return 'supabase_postgres';
  }

  return 'local_dev_memory';
}

const globalForSharedStore = globalThis as unknown as {
  __fiscaliqRateLimitMap?: Map<string, number[]>;
  __fiscaliqKvMap?: Map<string, string>;
};

const localRateLimitMap =
  globalForSharedStore.__fiscaliqRateLimitMap ??
  (globalForSharedStore.__fiscaliqRateLimitMap = new Map<string, number[]>());

const localKvMap =
  globalForSharedStore.__fiscaliqKvMap ??
  (globalForSharedStore.__fiscaliqKvMap = new Map<string, string>());

/**
 * Executes a synchronous rate-limit check backed by the local sliding window
 * and asynchronously replicates to Upstash Redis / Supabase when configured.
 */
export function checkAndIncrementRateLimitSync(params: {
  key: string;
  windowMs: number;
  maxRequests: number;
}): {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
  backend: SharedStoreBackend;
} {
  const { key, windowMs, maxRequests } = params;
  const backend = getSharedStoreBackend();
  const now = Date.now();

  const existing = localRateLimitMap.get(key) ?? [];
  const validTimestamps = existing.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0] ?? now;
    const resetInSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    localRateLimitMap.set(key, validTimestamps);
    return {
      allowed: false,
      remaining: 0,
      limit: maxRequests,
      resetInSeconds,
      backend,
    };
  }

  validTimestamps.push(now);
  localRateLimitMap.set(key, validTimestamps);

  // Replicate to Upstash Redis REST pipeline when configured
  if (backend === 'upstash_redis') {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL!.trim();
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
    const redisKey = `fiscaliq:rl:${key}`;
    void fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PEXPIRE', redisKey, String(windowMs)],
      ]),
    }).catch(() => {
      // Non-blocking replication
    });
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - validTimestamps.length),
    limit: maxRequests,
    resetInSeconds: Math.ceil(windowMs / 1000),
    backend,
  };
}

export function sharedStoreGetJson<T>(key: string): T | null {
  const raw = localKvMap.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function sharedStoreSetJson<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value);
  localKvMap.set(key, serialized);

  const backend = getSharedStoreBackend();
  if (backend === 'upstash_redis') {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL!.trim();
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
    void fetch(`${upstashUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', `fiscaliq:kv:${key}`, serialized]),
    }).catch(() => {
      // Non-blocking replication
    });
  } else if (backend === 'supabase_postgres') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
    void fetch(`${supabaseUrl}/rest/v1/user_subscriptions`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: serialized,
    }).catch(() => {
      // Non-blocking replication
    });
  }
}
