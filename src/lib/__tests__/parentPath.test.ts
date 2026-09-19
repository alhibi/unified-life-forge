import { describe, expect, it } from 'vitest';

import { parentPath } from '@/lib/parentPath';

describe('parentPath', () => {
  it('climbs one segment', () => {
    expect(parentPath('/pkm/mind/42')).toBe('/pkm/mind');
    expect(parentPath('/german-club/shelf')).toBe('/german-club');
  });

  it('falls back to the portal at the top level', () => {
    expect(parentPath('/pkm')).toBe('/');
    expect(parentPath('/')).toBe('/');
    expect(parentPath('')).toBe('/');
  });

  it('ignores duplicate and trailing slashes', () => {
    expect(parentPath('/reading//article/9/')).toBe('/reading/article');
  });
});
