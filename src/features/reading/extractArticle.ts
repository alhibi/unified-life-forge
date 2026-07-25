import { supabase } from '@/integrations/supabase/client';
import { dedupe, withRetry } from '@/lib/fetchRetry';

import { isSupabaseAvailable } from './clientFetcher';

/**
 * Client-side wrapper around the `extract-article` edge function.
 *
 * Used to "upgrade" a short RSS-summary article into the full readable
 * body the publisher actually rendered on their site. Many feeds only
 * carry a 1-2 line teaser (e.g. NYT, BBC, most Arabic news outlets);
 * without this upgrade, the reader is stuck staring at a blurb with
 * no path to the real text short of leaving the app.
 *
 * Resilience contract:
 *   - **Dedupe**: concurrent calls for the same URL collapse onto one
 *     in-flight request. Reopening the same article twice in 50 ms
 *     doesn't fan out two scrape requests.
 *   - **Retry**: 2 attempts with exponential backoff on transient
 *     errors (5xx, network, timeout). 4xx fails fast — the URL is
 *     genuinely not extractable and retry won't change that.
 *   - **Abort-aware**: an outer AbortSignal cancels both the retry
 *     loop and the in-flight HTTP. A user navigating away mid-scrape
 *     does not leave a leaked promise behind.
 *   - **No-throw**: returns `null` for every failure path so callers
 *     can fall back gracefully instead of guarding with try/catch.
 *
 * Note: anonymous calls work — the underlying edge function uses
 * `optionalUser` and never persists anything (read-only scraper).
 */

export interface ExtractedArticle {
  url: string;
  title: string;
  siteName?: string;
  description?: string;
  image: string | null;
  html: string;
}

/** Minimum characters of `fullContent` we consider "good enough" to skip
 *  the upgrade fetch. Below this threshold the reader will try to scrape
 *  the original page for a richer body. */
export const FULL_CONTENT_THRESHOLD = 400;

/**
 * Strip tags from an HTML string just enough to *measure* how much
 * actual prose a payload carries. We don't render this — only count.
 * Cheap regex, intentionally not a full parser.
 */
export function plainTextLength(html: string | undefined | null): number {
  if (!html) return 0;
  // Drop tags, collapse whitespace, count
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

/** Should we attempt a full-content upgrade for an article we just opened? */
export function needsContentUpgrade(
  fullContent: string | undefined,
  link: string | undefined,
): boolean {
  if (!link || !/^https?:\/\//i.test(link)) return false;
  return plainTextLength(fullContent) < FULL_CONTENT_THRESHOLD;
}

/**
 * Scrape the article body for a URL via the `extract-article` edge
 * function. Returns null on any failure, never throws.
 *
 * @param url       Public http(s) URL to scrape.
 * @param signal    Optional outer AbortSignal — cancels retry loop +
 *                  in-flight request when fired.
 */
export async function extractArticleBody(
  url: string,
  signal?: AbortSignal,
): Promise<ExtractedArticle | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (!isSupabaseAvailable()) return null;
  if (signal?.aborted) return null;

  // Dedupe by exact URL — concurrent reopens converge on one fetch.
  const key = `extract-article:${url}`;
  try {
    return await dedupe(key, () =>
      withRetry(
        async () => {
          if (signal?.aborted) {
            throw signal.reason ?? new Error('aborted');
          }
          const { data, error } = await supabase.functions.invoke(
            'extract-article',
            { body: { url } },
          );
          if (error) {
            // 4xx / 422 (unextractable) → no point retrying.
            const status = (error as { status?: number; context?: { status?: number } })
              ?.status ?? (error as { context?: { status?: number } })?.context?.status;
            if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
              return null as ExtractedArticle | null;
            }
            throw error;
          }
          if (!data || typeof data !== 'object') return null;
          const obj = data as Partial<ExtractedArticle>;
          if (!obj.html && !obj.image) return null;
          return {
            url: obj.url || url,
            title: obj.title || '',
            siteName: obj.siteName,
            description: obj.description,
            image: obj.image ?? null,
            html: obj.html || '',
          };
        },
        {
          attempts: 2,
          baseMs: 600,
          capMs: 3000,
          signal,
        },
      ),
    );
  } catch (e) {
    // Aborted, exhausted retries, or hard 4xx — caller treats null as
    // "couldn't upgrade, render what we have".
    if (signal?.aborted) return null;
    console.warn('[Reading/extractArticle] failed:', e);
    return null;
  }
}
