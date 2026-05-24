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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

/**
 * `true` only when both env vars are populated. Feature code should gate
 * any Supabase-dependent work on this so the UI degrades gracefully when
 * the app is run without a backend.
 */
export const isSupabaseConfigured: boolean =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);

if (!isSupabaseConfigured) {
  // One bold message at boot — much easier to spot than dozens of 401s.
  // eslint-disable-next-line no-console
  console.error(
    '%c[Supabase] Not configured%c\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file ' +
    '(see .env.example).\n' +
    'Until you do, every Supabase request will resolve to a 503 ' +
    '"supabase_not_configured" response and realtime subscriptions are disabled. ' +
    'Local-only features (prayer times, weather, games, static Diwan content) ' +
    'will continue to work.',
    'background:#7f1d1d;color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold',
    'color:inherit',
  );
}

// Short-circuit fetch: returns a well-formed JSON 503 instead of letting
// the request go to a placeholder host. Keeps the network panel clean and
// callers see a deterministic error body.
const noopFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      code: 'supabase_not_configured',
      message:
        'Supabase environment variables are missing. Set VITE_SUPABASE_URL ' +
        'and VITE_SUPABASE_PUBLISHABLE_KEY to enable backend features.',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    },
  );

// Use the reserved `.invalid` TLD so even leakage paths (realtime ws,
// storage, edge functions) fail DNS quickly rather than reaching a real
// `placeholder.supabase.co` host that someone else owns.
const PLACEHOLDER_URL = 'https://supabase-not-configured.invalid';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(
  SUPABASE_URL || PLACEHOLDER_URL,
  SUPABASE_PUBLISHABLE_KEY || PLACEHOLDER_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    ...(isSupabaseConfigured
      ? {}
      : { global: { fetch: noopFetch } }),
  },
);
