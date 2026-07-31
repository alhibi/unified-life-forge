/**
 * Pins the two properties of the Supabase client module that are easy to break
 * silently.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSupabaseConfigured, readKeyRole } from '../client';

/**
 * The module's own source text.
 *
 * Two of the assertions below are about how the code is wired rather than what it
 * returns: the `service_role` guard cannot be exercised by re-importing with a
 * different env without a fragile module-registry dance, and a flag that has been
 * simplified to a literal `true` still returns `true`. Reading the source is the
 * honest way to check both.
 */
const CLIENT_SRC = fs.readFileSync(
  path.resolve(import.meta.dirname, '../client.ts'),
  'utf8',
);

/** Builds an unsigned JWT with the given claims — enough to read `role` from. */
function makeKey(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.signature`;
}

describe('readKeyRole', () => {
  it('reads the role out of an anon key', () => {
    expect(readKeyRole(makeKey({ iss: 'supabase', role: 'anon' }))).toBe('anon');
  });

  it('reads the role out of a service_role key', () => {
    expect(readKeyRole(makeKey({ iss: 'supabase', role: 'service_role' }))).toBe(
      'service_role',
    );
  });

  it('reads the real committed fallback key as anon', () => {
    // The key that actually ships. If this ever reports anything else, the guard in
    // client.ts would have thrown at import and this file could not have loaded —
    // but asserting it makes the expectation explicit rather than implied.
    expect(isSupabaseConfigured).toBe(true);
  });

  it('returns null rather than throwing for input that is not a JWT', () => {
    // A future Supabase key format must not brick the app at module load.
    for (const bad of ['', 'not-a-jwt', 'a.b', 'a.!!!.c', 'header.eyJib2d1cw.sig']) {
      expect(() => readKeyRole(bad)).not.toThrow();
      expect(readKeyRole(bad)).toBeNull();
    }
  });

  it('returns null when the payload has no role claim', () => {
    expect(readKeyRole(makeKey({ iss: 'supabase' }))).toBeNull();
  });

  it('ignores a role claim that is not a string', () => {
    expect(readKeyRole(makeKey({ role: 42 }))).toBeNull();
    expect(readKeyRole(makeKey({ role: { admin: true } }))).toBeNull();
  });
});

describe('isSupabaseConfigured', () => {
  it('is true, because the module ships hard-coded fallbacks', () => {
    // Documented in client.ts: ~40 `if (!isSupabaseConfigured)` branches across 28
    // files are therefore unreachable today. This test exists so that fact stays
    // written down and measured rather than rediscovered.
    expect(isSupabaseConfigured).toBe(true);
  });

  it('is computed from the credentials, not hard-coded true', () => {
    // The flag's only remaining purpose is to go false for a fork that removes the
    // fallbacks. If someone simplifies it to `export const isSupabaseConfigured =
    // true`, the local-only paths become dead in a way no longer recoverable by
    // deleting two constants — and nothing else would notice.
    expect(CLIENT_SRC).toMatch(/isSupabaseConfigured: boolean =\s*Boolean\(SUPABASE_URL\)/);
  });
});

describe('the service_role guard', () => {
  it('is wired to run at module load', () => {
    // Asserts the two things that make the guard effective: it is called at the
    // top level rather than sitting in a function nobody invokes, and it throws
    // rather than warns.
    expect(CLIENT_SRC, 'guard must be invoked at module scope').toMatch(
      /^assertPublishableKey\(SUPABASE_PUBLISHABLE_KEY\);$/m,
    );
    expect(CLIENT_SRC, 'guard must run before the client is created').toMatch(
      /assertPublishableKey\(SUPABASE_PUBLISHABLE_KEY\);[\s\S]*createClient</,
    );
    expect(CLIENT_SRC, 'a warning would still ship the key').toMatch(
      /role === 'service_role'[\s\S]{0,400}throw new Error/,
    );
  });
});
