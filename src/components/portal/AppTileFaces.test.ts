import { describe, expect, it } from 'vitest';

import { PORTAL_APPS } from './apps';
import { FACE_KEYS } from './AppTileFaces';

describe('launcher widget faces', () => {
  it('gives every launcher app its own bespoke composition', () => {
    const missing = PORTAL_APPS.map((app) => app.key).filter((key) => !FACE_KEYS.includes(key));
    expect(missing).toEqual([]);
  });
});
