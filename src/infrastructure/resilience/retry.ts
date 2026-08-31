/**
 * Exponential backoff with jitter, plus a hard cap on attempts so a
 * perpetually failing request can never pin the request budget forever.
 *
 * Used by the offline sync queue and any feature that needs reliable retries
 * against the Supabase edge.
 */

import pRetry, { AbortError, type Options as PRetryOptions } from 'p-retry';

export interface RetryOptions extends Omit<PRetryOptions, 'onFailedAttempt'> {
  signal?: AbortSignal;
  retryable?: (err: unknown) => boolean;
  onAttempt?: (attempt: number, err: unknown) => void;
}

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retryable, onAttempt, ...rest } = opts;
  return pRetry(fn, {
    retries: rest.retries ?? 4,
    factor: rest.factor ?? 2,
    minTimeout: rest.minTimeout ?? 400,
    maxTimeout: rest.maxTimeout ?? 8_000,
    randomize: rest.randomize ?? true,
    ...rest,
    onFailedAttempt: (ctx) => {
      if (retryable && !retryable(ctx.error)) {
        throw new AbortError(ctx.error instanceof Error ? ctx.error.message : String(ctx.error));
      }
      onAttempt?.(ctx.attemptNumber, ctx.error);
    },
  });
}