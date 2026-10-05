/**
 * Hostile-client RLS test.
 *
 * Every other test in this repo drives the UI, which means it only ever asks
 * the questions the UI knows how to ask. This one does the opposite: it builds
 * a raw client with nothing but the publishable key — exactly what anyone can
 * read out of the shipped bundle — and asks every user-data table for rows it
 * has no right to. The assertion is that each attempt returns either an error
 * or zero rows, never someone's data.
 *
 * ── Why this file is written so defensively ──────────────────────────────
 *
 * Until 2026-10-05 it read `import.meta.env.VITE_SUPABASE_*` directly. Those
 * vars are undefined without a `.env`, so `anon` was always `null`, every
 * spec returned on its first line, and all 30 cases passed in 8ms without
 * issuing a single request. The suite was green and completely inert.
 *
 * It mattered: `places` and `place_photos` carry a `public read … USING
 * (true)` policy granted to `anon`, so every user's saved GPS coordinates
 * were world-readable. This suite was the one check designed to catch that,
 * and it had quietly switched itself off.
 *
 * Two rules follow, and neither may be relaxed:
 *
 *   1. Credentials come from `@/integrations/supabase/client`, which always
 *      resolves to a usable value. There is no configuration under which this
 *      file can disable itself.
 *   2. Unreachability is a FAILURE, not a skip — unless `ALLOW_OFFLINE_RLS=1`
 *      is set explicitly. A security check that silently opts out when the
 *      network is awkward is worse than no check, because it reports success.
 *      Sandboxes without egress must opt out loudly and on purpose.
 */

import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/integrations/supabase/client';

const URL = SUPABASE_URL;
const KEY = SUPABASE_PUBLISHABLE_KEY;

/**
 * Escape hatch for environments with no outbound network (e.g. an offline
 * dev container). Must be set deliberately; CI never sets it.
 */
const ALLOW_OFFLINE = import.meta.env.VITE_ALLOW_OFFLINE_RLS === '1';

/** Tables that hold data belonging to one specific user. */
const PRIVATE_TABLES = [
  'profiles',
  'conversations',
  'messages',
  'message_reactions',
  'user_settings',
  'journal_entries',
  'archive_documents',
  'clipboard_items',
  'crypto_watchlist',
  'places',
  'place_photos',
  'trips',
  'trip_places',
  'country_stamps',
  'pkm_notes',
  'mg_articles',
  'mg_article_chunks',
  'mg_connections',
  'mg_messages',
  'reading_bookmarks',
  'reading_feeds',
  'keyword_alerts',
  'fitness_activities',
  'fitness_daily_metrics',
  'wellness_records',
] as const;

let reachable = false;
let unreachableReason = '';

const anon = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

beforeAll(async () => {
  try {
    const res = await fetch(`${URL}/auth/v1/health`, {
      headers: { apikey: KEY },
      signal: AbortSignal.timeout(8000),
    });
    reachable = res.ok;
    if (!res.ok) unreachableReason = `health check returned ${res.status}`;
  } catch (error) {
    reachable = false;
    unreachableReason = (error as Error).message;
  }
});

/**
 * Called at the top of every case. Returns `true` when the case should be
 * skipped — which only ever happens behind the explicit offline opt-out.
 * Otherwise an unreachable backend fails the suite.
 */
function assertReachable(): boolean {
  if (reachable) return false;
  if (ALLOW_OFFLINE) {
    console.warn(
      `[rls] skipped — VITE_ALLOW_OFFLINE_RLS=1 and backend unreachable (${unreachableReason})`,
    );
    return true;
  }
  throw new Error(
    `RLS suite could not reach ${URL} (${unreachableReason}). ` +
      `This suite must never pass without running. Fix connectivity, or set ` +
      `VITE_ALLOW_OFFLINE_RLS=1 to opt out deliberately.`,
  );
}

describe('RLS: an unauthenticated hostile client', () => {
  it.each(PRIVATE_TABLES)('cannot read rows from %s', async (table) => {
    if (assertReachable()) return;
    const { data, error } = await anon.from(table).select('*').limit(5);
    if (error) {
      // A permission error is the expected outcome for most tables.
      expect(error.message).toBeTruthy();
      return;
    }
    // A policy scoped to auth.uid() yields an empty set for an anon caller.
    // Anything else means the table is publicly readable.
    expect(data ?? []).toEqual([]);
  });

  it.each(['profiles', 'messages', 'journal_entries', 'pkm_notes'] as const)(
    'cannot write into %s',
    async (table) => {
      if (assertReachable()) return;
      const { error } = await anon
        .from(table)
        // A deliberately invalid row: if RLS rejects it we never reach column
        // validation, which is exactly what we are asserting.
        .insert({ id: '00000000-0000-0000-0000-000000000000' } as never);
      expect(error).not.toBeNull();
    },
  );

  it('cannot escalate through the profile-search RPC without a session', async () => {
    if (assertReachable()) return;
    const { data, error } = await anon.rpc('search_profiles', { q: 'a', lim: 5 });
    // The function is `auth.uid() IS NOT NULL`-guarded, so an anon caller gets
    // an error or an empty set — never a user directory.
    if (!error) expect(data ?? []).toEqual([]);
  });
});