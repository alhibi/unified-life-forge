// Supabase browser client.
//
// ── What ships in the bundle, and why that is not a leak ─────────────────────
//
// The project URL and the *publishable* (anon) key below are baked in as
// fallbacks. That is deliberate and it is how every Supabase browser app works:
// the anon key is designed to be public, it is handed to every visitor anyway, and
// it grants nothing on its own. Row-Level Security is what actually protects the
// data — all 54 tables have RLS enabled with scoped policies, which
// `src/test/rlsPolicies.test.ts` verifies on every run.
//
// Baking them in keeps the app working in three cases that otherwise break login
// with "supabase_not_configured":
//
//   1. Published bundles built before the env vars were injected.
//   2. Clones of the repo by external tools that have no copy of the
//      (gitignored) `.env`.
//   3. `bun run dev` with no `.env`. The CI build job depends on this too.
//
// Env vars take precedence, so a fork pointing at a different project keeps
// working.
//
// ── The one credential that must never reach here ────────────────────────────
//
// A `service_role` key bypasses RLS entirely. Pasted into `VITE_SUPABASE_*` — an
// easy mistake, since the two keys sit next to each other in the Supabase
// dashboard and look identical — Vite would inline it into a public JavaScript
// bundle and hand every visitor unrestricted read/write on the whole database.
// `assertPublishableKey` below refuses to build a client with one.
//
// ── Note for anyone reading the old header ───────────────────────────────────
//
// This file used to document a `fetch` short-circuit returning a structured
// `supabase_not_configured` 503, plus a `.invalid` placeholder host chosen so
// realtime websockets would fail DNS immediately. None of that code exists any
// more; the comment outlived it by long enough to be quoted in
// docs/architecture/data-layer.md as though it were current behaviour. What the
// file does now is described above.

import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

const FALLBACK_SUPABASE_URL = 'https://nmrckgzmluoavgucqvjh.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tcmNrZ3ptbHVvYXZndWNxdmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Mjc5MjQsImV4cCI6MjA5MDMwMzkyNH0.Gye2-aLOB6eTMrrrDErB5m2MVHQbjAgUrhHYicKIW4g';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY;

/**
 * Reads the `role` claim out of a Supabase API key without verifying it.
 *
 * Signature verification is neither possible nor the point here: the server does
 * that. This only needs to know which key the developer pasted in, and the role is
 * in the unencrypted payload. Returns `null` for anything that is not a readable
 * JWT, which the caller treats as "cannot tell" rather than as an error — a future
 * key format should not brick the app.
 *
 * Exported for the test that pins this behaviour.
 */
export function readKeyRole(key: string): string | null {
  try {
    const payload = key.split('.')[1];
    if (!payload) return null;
    // Base64url → base64, then decode. `atob` is available in browsers and jsdom.
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as { role?: unknown };
    return typeof claims.role === 'string' ? claims.role : null;
  } catch {
    return null;
  }
}

/**
 * Refuses to continue if the configured key is a privileged one.
 *
 * Throwing at module load is the right severity. The alternative — logging and
 * carrying on — would ship the key to every visitor anyway, and the whole reason
 * this check exists is that the consequence is unrecoverable: a `service_role` key
 * in a public bundle has to be rotated, and every copy already downloaded stays
 * valid until it is.
 */
function assertPublishableKey(key: string): void {
  const role = readKeyRole(key);
  if (role === 'service_role') {
    throw new Error(
      'Refusing to start: VITE_SUPABASE_PUBLISHABLE_KEY is a service_role key. ' +
        'That key bypasses Row-Level Security and Vite inlines it into a public ' +
        'bundle, so this would grant every visitor full read/write on the ' +
        'database. Use the publishable (anon) key. If this key has already been ' +
        'deployed, rotate it in the Supabase dashboard — it cannot be un-shipped.',
    );
  }
}

assertPublishableKey(SUPABASE_PUBLISHABLE_KEY);

/**
 * `true` when there are usable Supabase credentials.
 *
 * Because the fallbacks above are always present, this is **always true** in
 * practice. It is read in roughly 40 places across 28 files as
 * `if (!isSupabaseConfigured) return …`, and every one of those branches is
 * currently unreachable — including the PBKDF2 local-auth fallback in
 * `src/lib/auth/localAuthStore.ts`, which ships in the bundle and can never run.
 *
 * It is kept rather than deleted for one reason: a fork that removes the
 * hard-coded fallbacks needs those branches, and they are the difference between
 * degrading to local-only mode and a wall of opaque 401s.
 * `__tests__/client.test.ts` asserts the flag still goes false when both sources
 * are empty, so it cannot quietly become a constant that only looks like a guard.
 */
export const isSupabaseConfigured: boolean =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
