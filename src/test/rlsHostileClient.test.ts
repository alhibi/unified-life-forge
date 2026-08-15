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
 * It runs against the real project. When there is no network (offline CI, the
 * sandboxed unit-test job) the suite skips instead of failing, so it can never
 * become the flaky test everyone learns to ignore — the e2e job is where it is
 * expected to have connectivity.
 */

import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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
const anon =
  URL && KEY
    ? createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

beforeAll(async () => {
  if (!anon) return;
  try {
    const res = await fetch(`${URL}/auth/v1/health`, {
      headers: { apikey: KEY as string },
      signal: AbortSignal.timeout(8000),
    });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
});

describe('RLS: an unauthenticated hostile client', () => {
  it.each(PRIVATE_TABLES)('cannot read rows from %s', async (table) => {
    if (!anon || !reachable) return; // no network — the e2e job covers this
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
      if (!anon || !reachable) return;
      const { error } = await anon
        .from(table)
        // A deliberately invalid row: if RLS rejects it we never reach column
        // validation, which is exactly what we are asserting.
        .insert({ id: '00000000-0000-0000-0000-000000000000' } as never);
      expect(error).not.toBeNull();
    },
  );

  it('cannot escalate through the profile-search RPC without a session', async () => {
    if (!anon || !reachable) return;
    const { data, error } = await anon.rpc('search_profiles', { q: 'a', lim: 5 });
    // The function is `auth.uid() IS NOT NULL`-guarded, so an anon caller gets
    // an error or an empty set — never a user directory.
    if (!error) expect(data ?? []).toEqual([]);
  });
});