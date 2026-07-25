import { describe, expect, it } from 'vitest';

import { fetchFeedsClientSide,getProxyHealth } from './clientFetcher';

describe('clientFetcher security settings', () => {
  it('has an empty default proxy pool to ensure no public CORS proxies are used', () => {
    const health = getProxyHealth();
    expect(health).toEqual([]);
  });

  it('gracefully returns an error when calling client-side fetch since no proxies are configured', async () => {
    const result = await fetchFeedsClientSide([
      { url: 'https://example.com/feed.xml', name: 'Example Feed', category: 'news', enabled: true },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([]);
    expect(result[0].error).toBeDefined();
  });
});
