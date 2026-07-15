import type { FeedItem } from './types';

/**
 * No-op stub for the former IndexedDB offline cache.
 *
 * The reading feature is now fully cloud-backed: articles come from
 * Supabase on every load, bookmarks are cloud-persisted, and there is
 * no local article archive. This module preserves the historic public
 * API so call sites across the feature keep compiling, but every
 * method is a no-op returning safe defaults.
 *
 * When the whole feature is retired to `api.ts`-only, this file and
 * its remaining consumers can be deleted in one pass.
 */

export interface ArchivedArticle extends FeedItem {
  archivedAt: number;
}

export const offlineDb = {
  available(): boolean {
    return false;
  },

  async listArticles(): Promise<ArchivedArticle[]> {
    return [];
  },

  async countArticles(): Promise<number> {
    return 0;
  },

  async getArticle(_link: string): Promise<ArchivedArticle | null> {
    return null;
  },

  async saveArticle(_item: FeedItem): Promise<void> {
    /* no-op: cloud is the source of truth */
  },

  async saveArticlesBatch(_items: ReadonlyArray<FeedItem>): Promise<number> {
    return 0;
  },

  async removeArticle(_link: string): Promise<void> {
    /* no-op */
  },

  async hasQuota(_requiredBytes: number): Promise<boolean> {
    return true;
  },

  async pruneOlderThan(
    _maxAgeMs = 0,
    _keepLinks: ReadonlyArray<string> = [],
  ): Promise<number> {
    return 0;
  },

  async storageEstimate(): Promise<{
    articles: number;
    quotaBytes: number;
    usageBytes: number;
  }> {
    return { articles: 0, quotaBytes: 0, usageBytes: 0 };
  },

  async clearArticles(): Promise<number> {
    return 0;
  },

  async syncArticles(
    _items: ReadonlyArray<FeedItem>,
    _keepLinks: ReadonlyArray<string> = [],
  ): Promise<{ added: number; kept: number; removed: number }> {
    return { added: 0, kept: 0, removed: 0 };
  },

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  },

  async forceReset(): Promise<void> {
    /* no-op: nothing to reset */
  },
};
