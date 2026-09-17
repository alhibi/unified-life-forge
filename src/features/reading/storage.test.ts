import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedSource } from './types';

const cloud = vi.hoisted(() => ({
  listFeeds: vi.fn(), listReadLinks: vi.fn(), listBookmarks: vi.fn(), loadReaderPrefs: vi.fn(),
  replaceFeeds: vi.fn(), markRead: vi.fn(), markUnread: vi.fn(), addBookmark: vi.fn(),
  removeBookmark: vi.fn(), saveReaderPrefs: vi.fn(), currentUserId: vi.fn(),
}));
const auth = vi.hoisted(() => ({ onAuthStateChange: vi.fn(), getSession: vi.fn() }));
vi.mock('./api', () => cloud);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth, removeChannel: vi.fn() } }));

const feed: FeedSource = { url: 'https://example.org/feed', name: 'Fixture', category: 'news', enabled: true };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  for (const mock of Object.values(cloud)) mock.mockReset().mockResolvedValue(undefined);
  auth.onAuthStateChange.mockReset();
  auth.getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: 'account-a' } } } });
  cloud.currentUserId.mockResolvedValue('account-a');
  cloud.listFeeds.mockResolvedValue([feed]);
  cloud.listReadLinks.mockResolvedValue([]);
  cloud.listBookmarks.mockResolvedValue([]);
  cloud.loadReaderPrefs.mockResolvedValue(null);
});

describe('reading storage account safety', () => {
  it('discards the old snapshot when sign-out happens during final identity verification', async () => {
    const storage = await import('./storage');
    const identity = deferred<string>();
    cloud.currentUserId.mockResolvedValueOnce('account-a').mockReturnValueOnce(identity.promise);
    cloud.listReadLinks.mockResolvedValue(['private-a']);
    const hydration = storage.hydrateReadingFromCloud();
    await vi.waitFor(() => expect(cloud.currentUserId).toHaveBeenCalledTimes(2));
    storage.resetReadingStorage();
    identity.resolve('account-a');
    await hydration;
    expect(storage.getReadArticles()).toEqual([]);
    expect(storage.getReadingSyncState().hydration).toBe('unloaded');
  });

  it('discards a response if the current identity changed before the auth event arrived', async () => {
    const storage = await import('./storage');
    const reads = deferred<string[]>();
    cloud.listReadLinks.mockReturnValueOnce(reads.promise);
    const hydration = storage.hydrateReadingFromCloud();
    await vi.waitFor(() => expect(cloud.listReadLinks).toHaveBeenCalledOnce());
    cloud.currentUserId.mockResolvedValue('account-b');
    reads.resolve(['private-a']);
    await hydration;
    expect(storage.getReadArticles()).toEqual([]);
  });

  it('automatically retries a durable outbox when the account hydrates after reload', async () => {
    let storage = await import('./storage');
    await storage.hydrateReadingFromCloud();
    cloud.markRead.mockRejectedValue(new Error('offline'));
    storage.storeReadArticles(['queued']);
    await storage.flushReadingMutations();
    storage.resetReadingStorage();
    vi.resetModules();
    storage = await import('./storage');
    cloud.markRead.mockResolvedValue(undefined);
    cloud.listReadLinks.mockResolvedValue(['queued']);
    await storage.hydrateReadingFromCloud();
    expect(cloud.markRead).toHaveBeenCalledTimes(2);
    expect(storage.getReadingSyncState()).toMatchObject({ pendingCount: 0, sync: 'idle' });
  });

  it('exposes retriable hydration failure without declaring ready', async () => {
    const storage = await import('./storage');
    cloud.listFeeds.mockRejectedValueOnce(new Error('offline'));
    await storage.hydrateReadingFromCloud();
    expect(storage.getReadingSyncState()).toMatchObject({ hydration: 'error', error: 'offline' });
    await storage.hydrateReadingFromCloud();
    expect(storage.getReadingSyncState()).toMatchObject({ hydration: 'ready', error: null });
  });

  it('does not overwrite an acknowledged local edit with a stale hydration snapshot', async () => {
    const storage = await import('./storage');
    await storage.hydrateReadingFromCloud();
    const reads = deferred<string[]>();
    cloud.listReadLinks.mockReturnValueOnce(reads.promise);
    const hydration = storage.hydrateReadingFromCloud({ force: true });
    await vi.waitFor(() => expect(cloud.listReadLinks).toHaveBeenCalledTimes(2));
    storage.storeReadArticles(['local-edit']);
    await storage.flushReadingMutations();
    reads.resolve([]);
    await hydration;
    expect(storage.getReadArticles()).toEqual(['local-edit']);
  });

  it('restores all mutation types in order after reload, including removals and empty feeds', async () => {
    let storage = await import('./storage');
    await storage.hydrateReadingFromCloud();
    cloud.replaceFeeds.mockRejectedValue(new Error('offline'));
    storage.storeFeeds([]);
    storage.storeReadArticles(['read']);
    storage.storeReadArticles([]);
    const article = { link: 'bookmark', title: 'Saved', description: '', pubDate: '', image: null, source: '' };
    storage.setBookmarkArticle(article);
    storage.deleteBookmark(article.link);
    storage.setBookmarkArticle({ ...article, link: 'retained' });
    const prefs = { ...storage.getReaderPrefs(), fontSize: 'xl' as const };
    storage.storeReaderPrefs(prefs);
    await vi.waitFor(() => expect(storage.getReadingSyncState().sync).toBe('error'));
    storage.resetReadingStorage();
    vi.resetModules();
    storage = await import('./storage');
    await storage.hydrateReadingFromCloud();
    expect(storage.getStoredFeeds()).toEqual([]);
    expect(storage.getReadArticles()).toEqual([]);
    expect(storage.getBookmarks()).toEqual(['retained']);
    expect(storage.getBookmarkArticle('retained')?.title).toBe('Saved');
    expect(storage.getReaderPrefs()).toEqual(prefs);
    cloud.replaceFeeds.mockResolvedValue(undefined);
    await storage.flushReadingMutations();
    expect(cloud.markUnread).toHaveBeenLastCalledWith(['read'], 'account-a');
    expect(cloud.removeBookmark).toHaveBeenLastCalledWith('bookmark', 'account-a');
    expect(cloud.saveReaderPrefs).toHaveBeenLastCalledWith(prefs, 'account-a');
    expect(storage.getReadingSyncState().pendingCount).toBe(0);
  });

  it('persists a failed read mutation and replays it only for its account after reload', async () => {
    let storage = await import('./storage');
    await storage.hydrateReadingFromCloud();
    cloud.markRead.mockRejectedValue(new Error('offline'));
    storage.storeReadArticles(['pending-a']);
    await vi.waitFor(() => expect(cloud.markRead).toHaveBeenCalledOnce());
    expect(storage.getReadingSyncState()).toMatchObject({ sync: 'error', pendingCount: 1, durable: true });
    storage.resetReadingStorage();
    vi.resetModules();
    storage = await import('./storage');
    cloud.currentUserId.mockResolvedValue('account-b');
    await storage.hydrateReadingFromCloud();
    expect(storage.getReadArticles()).toEqual([]);
    expect(cloud.markRead).toHaveBeenCalledOnce();
    cloud.currentUserId.mockResolvedValue('account-a');
    await storage.hydrateReadingFromCloud();
    expect(storage.getReadArticles()).toEqual(['pending-a']);
    cloud.markRead.mockResolvedValue(undefined);
    await storage.flushReadingMutations();
    expect(cloud.markRead).toHaveBeenLastCalledWith(['pending-a'], 'account-a');
    expect(storage.getReadingSyncState()).toMatchObject({ sync: 'idle', pendingCount: 0 });
  });

  it('keeps deliberate empty feeds through cloud hydration without auto-seeding', async () => {
    const storage = await import('./storage');
    await storage.hydrateReadingFromCloud();
    storage.storeFeeds([]);
    expect(storage.getStoredFeeds()).toEqual([]);
    cloud.listFeeds.mockResolvedValue([]);
    await storage.hydrateReadingFromCloud({ force: true });
    expect(storage.getStoredFeeds()).toEqual([]);
    expect(cloud.replaceFeeds).toHaveBeenCalledTimes(1);
  });

  it('retains last-good data on hydration failure and retries without force', async () => {
    const storage = await import('./storage');
    cloud.listReadLinks.mockResolvedValue(['last-good']);
    await storage.hydrateReadingFromCloud();
    cloud.listFeeds.mockRejectedValueOnce(new Error('offline'));
    cloud.listReadLinks.mockResolvedValue([]);
    await storage.hydrateReadingFromCloud({ force: true });
    expect(storage.getReadArticles()).toEqual(['last-good']);
    await storage.hydrateReadingFromCloud();
    expect(cloud.listFeeds).toHaveBeenCalledTimes(3);
    expect(storage.getReadArticles()).toEqual([]);
  });

  it('starts a new account hydration while the old account is still pending', async () => {
    const storage = await import('./storage');
    const oldReads = deferred<string[]>();
    cloud.listReadLinks.mockReturnValueOnce(oldReads.promise);
    const oldHydration = storage.hydrateReadingFromCloud();
    await vi.waitFor(() => expect(cloud.listReadLinks).toHaveBeenCalledOnce());
    cloud.currentUserId.mockResolvedValue('account-b');
    cloud.listReadLinks.mockResolvedValue(['https://example.org/private-b']);
    const onAuth = auth.onAuthStateChange.mock.calls[0][0] as
      (event: string, session: { user: { id: string } } | null) => void;
    onAuth('SIGNED_IN', { user: { id: 'account-b' } });
    await storage.hydrateReadingFromCloud();
    expect(storage.getReadArticles()).toEqual(['https://example.org/private-b']);
    oldReads.resolve(['https://example.org/private-a']);
    await oldHydration;
    expect(storage.getReadArticles()).toEqual(['https://example.org/private-b']);
    expect(cloud.listReadLinks).toHaveBeenLastCalledWith('account-b');
  });

  it('ignores hydration completed after reset', async () => {
    const storage = await import('./storage');
    const reads = deferred<string[]>();
    cloud.listReadLinks.mockReturnValueOnce(reads.promise);
    const pending = storage.hydrateReadingFromCloud();
    storage.resetReadingStorage();
    reads.resolve(['https://example.org/private-a']);
    await pending;
    expect(storage.getReadArticles()).toEqual([]);
  });
});
