// Supabase browser client — the single source of truth for how this app
// reaches its backend.
//
// ─────────────────────────────────────────────────────────────────────────
// THIS MODULE IS THE ONLY PLACE ALLOWED TO READ `import.meta.env.VITE_SUPABASE_*`.
//
// Everything else must import `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`
// from here. That rule is not stylistic: the 2026-10-05 audit found three
// different ways of resolving the same two values across the codebase, and
// the one that read the env var directly produced the literal URL
// `undefined/storage/v1/object/chat-files/...`, breaking every chat image
// upload in any deployment without an injected `.env`.
// ─────────────────────────────────────────────────────────────────────────
//
// An earlier revision of this header described a `supabase_not_configured`
// 503 short-circuit and an RFC-2606 `.invalid` placeholder host. Neither has
// existed since the fallback constants below were introduced — the client is
// always configured. The description was removed rather than reinstated
// because the fallbacks are the intended behaviour; see the comment on
// `isSupabaseConfigured`.

import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

// Hard-coded fallbacks for the project's *publishable* (a.k.a. anon) key
// and URL. These values are safe to ship in client bundles — they are
// designed to be public and are protected by Row-Level-Security on the
// database side. Baking them in keeps the app working in three scenarios
// that previously broke login with "supabase_not_configured":
//
//   1. Published bundles built before the env vars were injected.
//   2. Clones of the GitHub repo by external tools (e.g. Claude) that
//      don't have a copy of the (gitignored) `.env` file.
//   3. Local `bun run dev` without a `.env` file.
//
// Env vars still take precedence so a fork pointing at a different
// Supabase project keeps working.
const FALLBACK_SUPABASE_URL = 'https://nmrckgzmluoavgucqvjh.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tcmNrZ3ptbHVvYXZndWNxdmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Mjc5MjQsImV4cCI6MjA5MDMwMzkyNH0.Gye2-aLOB6eTMrrrDErB5m2MVHQbjAgUrhHYicKIW4g';

/**
 * The resolved project URL. Always a usable absolute origin — never
 * `undefined`. Import this instead of reading the env var directly.
 */
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;

/**
 * The resolved publishable (anon) key. Always a usable JWT — never
 * `undefined`. Import this instead of reading the env var directly.
 *
 * This key is public by design and is only as safe as the Row-Level-Security
 * policies behind it. `src/test/rlsHostileClient.test.ts` is the check that
 * keeps that assumption honest; it uses exactly these two constants so it can
 * never silently disable itself the way it did before 2026-10-05.
 */
export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

/**
 * `true` when we have *some* working Supabase credentials — either from
 * env vars or the baked-in publishable fallbacks. Because the fallbacks
 * are always present, this is effectively always `true` in production.
 * The flag is kept for backwards compatibility with feature code that
 * branches on it.
 */
export const isSupabaseConfigured: boolean =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: isBrowser ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
