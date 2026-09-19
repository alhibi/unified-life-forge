import Dexie, { type EntityTable } from 'dexie';

import { currentUserId } from './api';
import type { FeedItem } from './types';

const DB_NAME = 'smarthub-reading';
const ANONYMOUS_SCOPE = 'anonymous';
const MIN_FREE_BYTES = 5 * 1024 * 1024;

export interface ArchivedArticle extends FeedItem {
  archivedAt: number;
  lastAccessedAt: number;
  contentComplete: boolean;
}

interface ArticleRecord extends ArchivedArticle {
  id: string;
  scope: string;
}

class ReadingDatabase extends Dexie {
  articles!: EntityTable<ArticleRecord, 'id'>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      articles: '&id, scope, link, [scope+archivedAt], [scope+lastAccessedAt]',
    });
  }
}

let database: ReadingDatabase | null = null;

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function db(): ReadingDatabase {
  if (!database) database = new ReadingDatabase();
  return database;
}

async function activeScope(): Promise<string> {
  return (await currentUserId()) ?? ANONYMOUS_SCOPE;
}

function recordId(scope: string, link: string): string {
  return `${scope}\u0000${link}`;
}

function textLength(value: string | undefined): number {
  if (!value) return 0;
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
}

function mergeRecord(
  scope: string,
  item: FeedItem,
  previous: ArticleRecord | undefined,
  now: number,
): ArticleRecord {
  const previousBodyLength = textLength(previous?.fullContent);
  const nextBodyLength = textLength(item.fullContent);
  const keepPreviousBody = previousBodyLength > nextBodyLength;

  return {
    ...(previous ?? {}),
    ...item,
    id: recordId(scope, item.link),
    scope,
    description:
      item.description || previous?.description || '',
    fullContent: keepPreviousBody
      ? previous?.fullContent
      : item.fullContent || previous?.fullContent,
    image: item.image || previous?.image || null,
    images: item.images?.length ? item.images : previous?.images ?? [],
    author: item.author || previous?.author,
    pubDate: item.pubDate || previous?.pubDate || '',
    source: item.source || previous?.source || '',
    archivedAt: previous?.archivedAt ?? now,
    lastAccessedAt: now,
    contentComplete: Math.max(previousBodyLength, nextBodyLength) >= 400,
  };
}

function toArchived(record: ArticleRecord): ArchivedArticle {
  const { id: _id, scope: _scope, ...article } = record;
  return article;
}

async function scopedRecords(scope: string): Promise<ArticleRecord[]> {
  return db().articles.where('scope').equals(scope).toArray();
}

export const offlineDb = {
  available(): boolean {
    return canUseIndexedDb();
  },

  async listArticles(): Promise<ArchivedArticle[]> {
    if (!canUseIndexedDb()) return [];
    const scope = await activeScope();
    const records = await scopedRecords(scope);
    return records
      .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
      .map(toArchived);
  },

  async countArticles(): Promise<number> {
    if (!canUseIndexedDb()) return 0;
    const scope = await activeScope();
    return db().articles.where('scope').equals(scope).count();
  },

  async getArticle(link: string): Promise<ArchivedArticle | null> {
    if (!canUseIndexedDb() || !link) return null;
    const scope = await activeScope();
    const id = recordId(scope, link);
    const record = await db().articles.get(id);
    if (!record) return null;
    const lastAccessedAt = Date.now();
    await db().articles.update(id, { lastAccessedAt });
    return toArchived({ ...record, lastAccessedAt });
  },

  async saveArticle(item: FeedItem): Promise<void> {
    if (!canUseIndexedDb() || !item.link) return;
    const scope = await activeScope();
    const id = recordId(scope, item.link);
    const previous = await db().articles.get(id);
    await db().articles.put(mergeRecord(scope, item, previous, Date.now()));
  },

  async saveArticlesBatch(items: ReadonlyArray<FeedItem>): Promise<number> {
    if (!canUseIndexedDb()) return 0;
    const valid = items.filter((item) => Boolean(item.link));
    if (valid.length === 0) return 0;
    const scope = await activeScope();
    const now = Date.now();
    return db().transaction('rw', db().articles, async () => {
      const ids = valid.map((item) => recordId(scope, item.link));
      const previous = await db().articles.bulkGet(ids);
      const records = valid.map((item, index) =>
        mergeRecord(scope, item, previous[index], now),
      );
      await db().articles.bulkPut(records);
      return records.length;
    });
  },

  async removeArticle(link: string): Promise<void> {
    if (!canUseIndexedDb() || !link) return;
    const scope = await activeScope();
    await db().articles.delete(recordId(scope, link));
  },

  async removeArticlesBatch(links: ReadonlyArray<string>): Promise<number> {
    if (!canUseIndexedDb()) return 0;
    const scope = await activeScope();
    const ids = [...new Set(links.filter(Boolean))].map((link) => recordId(scope, link));
    if (ids.length === 0) return 0;
    const existing = await db().articles.bulkGet(ids);
    await db().articles.bulkDelete(ids);
    return existing.filter(Boolean).length;
  },

  async hasQuota(requiredBytes: number): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return true;
    const estimate = await navigator.storage.estimate();
    if (estimate.quota === undefined || estimate.usage === undefined) return true;
    return estimate.quota - estimate.usage >= Math.max(requiredBytes, MIN_FREE_BYTES);
  },

  async pruneOlderThan(
    maxAgeMs = 0,
    keepLinks: ReadonlyArray<string> = [],
  ): Promise<number> {
    if (!canUseIndexedDb() || maxAgeMs <= 0) return 0;
    const scope = await activeScope();
    const keep = new Set(keepLinks);
    const cutoff = Date.now() - maxAgeMs;
    const expired = (await scopedRecords(scope))
      .filter((record) => record.archivedAt < cutoff && !keep.has(record.link))
      .map((record) => record.id);
    await db().articles.bulkDelete(expired);
    return expired.length;
  },

  async storageEstimate(): Promise<{
    articles: number;
    quotaBytes: number;
    usageBytes: number;
  }> {
    const articles = await this.countArticles();
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return { articles, quotaBytes: 0, usageBytes: 0 };
    }
    const estimate = await navigator.storage.estimate();
    return {
      articles,
      quotaBytes: estimate.quota ?? 0,
      usageBytes: estimate.usage ?? 0,
    };
  },

  async clearArticles(): Promise<number> {
    if (!canUseIndexedDb()) return 0;
    const scope = await activeScope();
    const ids = (await scopedRecords(scope)).map((record) => record.id);
    await db().articles.bulkDelete(ids);
    return ids.length;
  },

  async syncArticles(
    items: ReadonlyArray<FeedItem>,
    keepLinks: ReadonlyArray<string> = [],
  ): Promise<{ added: number; kept: number; removed: number }> {
    if (!canUseIndexedDb()) return { added: 0, kept: 0, removed: 0 };
    const scope = await activeScope();
    const valid = items.filter((item) => Boolean(item.link));
    const wanted = new Set([...valid.map((item) => item.link), ...keepLinks]);
    const now = Date.now();

    return db().transaction('rw', db().articles, async () => {
      const existing = await scopedRecords(scope);
      const byLink = new Map(existing.map((record) => [record.link, record]));
      const records = valid.map((item) =>
        mergeRecord(scope, item, byLink.get(item.link), now),
      );
      if (records.length > 0) await db().articles.bulkPut(records);
      const removeIds = existing
        .filter((record) => !wanted.has(record.link))
        .map((record) => record.id);
      if (removeIds.length > 0) await db().articles.bulkDelete(removeIds);
      return {
        added: records.filter((record) => !byLink.has(record.link)).length,
        kept: existing.length - removeIds.length,
        removed: removeIds.length,
      };
    });
  },

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    if (!canUseIndexedDb()) return { ok: false, error: 'indexeddb-unavailable' };
    try {
      await db().open();
      await db().articles.limit(1).count();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'indexeddb-failed',
      };
    }
  },

  async forceReset(): Promise<void> {
    await this.clearArticles();
  },
};