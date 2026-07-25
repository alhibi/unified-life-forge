import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchFeedsClientSide,getProxyHealth } from './clientFetcher';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clientFetcher security settings', () => {
  it('has an empty default proxy pool to ensure no public CORS proxies are used', () => {
    const health = getProxyHealth();
    expect(health).toEqual([]);
  });

  it('uses a CORS-enabled source directly before considering any proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '<rss><channel><item><title>Example</title><link>https://example.com/article</link><description>Preview</description></item></channel></rss>',
      { status: 200 },
    )));

    const result = await fetchFeedsClientSide([
      { url: 'https://example.com/feed.xml', name: 'Example Feed', category: 'news', enabled: true },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].title).toBe('Example');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/feed.xml',
      expect.objectContaining({ headers: expect.anything() }),
    );
  });
});
