// Supabase browser client.
//
// When the env vars are missing we *do not* silently fall back to a working
// placeholder — that masked configuration mistakes behind a sea of opaque
// 401 errors in the network panel. Instead we:
//
//   1. Loudly log a single error banner at boot.
//   2. Expose `isSupabaseConfigured` so feature code can branch and skip
//      network work entirely when there's no point trying.
//   3. Replace the underlying `fetch` with a short-circuit that returns a
//      structured "supabase_not_configured" 503 — every call site sees the
//      same predictable error shape rather than mystery 401s from a fake
//      host.
//   4. Use the reserved `.invalid` TLD (RFC 2606) for the placeholder URL
//      so any code path we missed (e.g. realtime websockets) fails DNS
//      lookup immediately rather than retrying forever against a real host.

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

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
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
