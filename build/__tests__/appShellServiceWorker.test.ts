import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The service worker is generated from build/swTemplate.js with a precache
 * manifest computed from the real bundle. These checks catch the two ways that
 * silently breaks: a placeholder that never got substituted (the worker then
 * throws on parse and the app just has no offline support), and a manifest that
 * came out empty because the HTML was read at the wrong point in the build.
 *
 * They only run when `dist/` exists, so `bun run test` still works on a clean
 * checkout.
 */

const DIST = path.resolve(import.meta.dirname, '..', '..', 'dist');
const SW = path.join(DIST, 'sw.js');
const hasBuild = fs.existsSync(SW);

describe.runIf(hasBuild)('generated dist/sw.js', () => {
  const code = hasBuild ? fs.readFileSync(SW, 'utf8') : '';

  it('has no unsubstituted placeholders', () => {
    expect(code).not.toMatch(/__SW_[A-Z_]+__/);
  });

  it('carries a content-derived version', () => {
    expect(code).toMatch(/const VERSION = '[0-9a-f]{12}';/);
  });

  it('precaches the shell and every first-paint asset', () => {
    const block = /const PRECACHE = (\[[\s\S]*?\]);/.exec(code);
    expect(block).not.toBeNull();

    const precache: string[] = JSON.parse(block![1]);
    expect(precache).toContain('/index.html');
    expect(precache).toContain('/manifest.json');

    // Whatever index.html loads up front has to be in there, or a cold offline
    // load renders an empty document.
    const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const upfront = [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(
      (m) => m[1],
    );
    expect(upfront.length).toBeGreaterThan(0);
    for (const asset of upfront) expect(precache).toContain(asset);

    // Every precached file must actually exist on disk.
    for (const entry of precache) {
      expect(fs.existsSync(path.join(DIST, entry.replace(/^\//, '')))).toBe(true);
    }
  });

  it('never intercepts cross-origin API traffic', () => {
    // Serving a stale Supabase or weather response would be worse than being
    // offline, so the fetch handler must bail out for foreign origins.
    expect(code).toContain("if (url.origin !== self.location.origin) return;");
  });

  it('does not take over a running page on its own', () => {
    // skipWaiting() may only happen in response to the page asking for it;
    // otherwise a deploy swaps fingerprinted chunks under loaded code.
    const selfCalled = /self\.skipWaiting\(\)/g;
    const matches = code.match(selfCalled) ?? [];
    expect(matches).toHaveLength(1);
    expect(code).toMatch(/SKIP_WAITING'\s*\)\s*self\.skipWaiting\(\)/);
  });

  it('is valid JavaScript', () => {
    expect(() => new Function(code.replace(/\bself\b/g, 'globalThis'))).not.toThrow();
  });
});
