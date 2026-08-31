/**
 * Cooperative rate limiter (token bucket) with both async and sync APIs.
 * The sync API is needed for non-Promise hot paths such as keystroke-driven
 * search; the async API is what network calls use.
 *
 * One module, multiple buckets: create a bucket per upstream (Dexscreener,
 * GDELT, RSS, OpenRouter, etc.) via `rateLimit.bucket({...})`.
 */

export interface BucketOptions {
  capacity: number;
  refillPerSecond: number;
  initialTokens?: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillPerSecond: number;

  constructor(opts: BucketOptions) {
    this.capacity = Math.max(1, opts.capacity);
    this.refillPerSecond = Math.max(0.0001, opts.refillPerSecond);
    this.tokens = opts.initialTokens ?? opts.capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(count = 1): RateLimitResult {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return { ok: true, retryAfterMs: 0 };
    }
    const deficit = count - this.tokens;
    const retryAfterMs = Math.ceil((deficit / this.refillPerSecond) * 1000);
    return { ok: false, retryAfterMs };
  }

  async consume(count = 1): Promise<void> {
    while (true) {
      const result = this.tryConsume(count);
      if (result.ok) return;
      await new Promise((resolve) => setTimeout(resolve, result.retryAfterMs));
    }
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }
}

const buckets = new Map<string, TokenBucket>();

export const rateLimit = {
  bucket(name: string, opts: BucketOptions): TokenBucket {
    const existing = buckets.get(name);
    if (existing) return existing;
    const next = new TokenBucket(opts);
    buckets.set(name, next);
    return next;
  },
  reset(name: string): void {
    buckets.get(name)?.reset();
  },
  list(): Array<{ name: string; capacity: number; refillPerSecond: number }> {
    return [...buckets.entries()].map(([name, b]) => ({
      name,
      capacity: (b as unknown as { capacity: number }).capacity,
      refillPerSecond: (b as unknown as { refillPerSecond: number }).refillPerSecond,
    }));
  },
};