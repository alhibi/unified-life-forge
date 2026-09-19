import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentUserId: vi.fn<() => Promise<string | null>>() }));
vi.mock('./api', () => ({ currentUserId: mocks.currentUserId }));

import { offlineDb } from './offlineDb';
import type { FeedItem } from './types';

function article(link: string, fullContent = ''): FeedItem {
  return {
    title: `Title ${link}`,
    link,
    description: 'Summary',
    fullContent,
    pubDate: '2026-09-19T12:00:00.000Z',
    image: null,
    images: [],
    source: 'Source',
  };
}

describe('offlineDb', () => {
  beforeEach(async () => {
    mocks.currentUserId.mockResolvedValue('account-a');
    await offlineDb.forceReset();
    mocks.currentUserId.mockResolvedValue('account-b');
    await offlineDb.forceReset();
    mocks.currentUserId.mockResolvedValue('account-a');
  });

  it('stores and restores articles for the active account', async () => {
    await offlineDb.saveArticle(article('https://example.com/a', '<p>Full body</p>'));
    const stored = await offlineDb.getArticle('https://example.com/a');
    expect(stored?.title).toBe('Title https://example.com/a');
    expect(await offlineDb.countArticles()).toBe(1);
  });

  it('never downgrades a richer cached body with a list snapshot', async () => {
    const rich = `<p>${'complete '.repeat(80)}</p>`;
    await offlineDb.saveArticle(article('https://example.com/rich', rich));
    await offlineDb.saveArticle(article('https://example.com/rich', ''));
    expect((await offlineDb.getArticle('https://example.com/rich'))?.fullContent).toBe(rich);
  });

  it('isolates cached articles between accounts', async () => {
    await offlineDb.saveArticle(article('https://example.com/private'));
    mocks.currentUserId.mockResolvedValue('account-b');
    expect(await offlineDb.listArticles()).toEqual([]);
    mocks.currentUserId.mockResolvedValue('account-a');
    expect(await offlineDb.countArticles()).toBe(1);
  });

  it('reconciles the rolling cache while preserving explicit links', async () => {
    await offlineDb.saveArticlesBatch([
      article('https://example.com/old'),
      article('https://example.com/bookmark'),
    ]);
    const result = await offlineDb.syncArticles(
      [article('https://example.com/new')],
      ['https://example.com/bookmark'],
    );
    expect(result).toEqual({ added: 1, kept: 1, removed: 1 });
    expect((await offlineDb.listArticles()).map((item) => item.link).sort()).toEqual([
      'https://example.com/bookmark',
      'https://example.com/new',
    ]);
  });
});