#!/usr/bin/env node
/**
 * Does the live database have what the Travel Atlas needs?
 *
 *   node scripts/travel/check-db.mjs
 *
 * The feature degrades quietly by design: a missing table or column is caught
 * in `api.ts` and shown as an empty atlas rather than a red error screen. That
 * is right for a user and useless for whoever has to deploy it — "my places
 * don't save" looks identical to "I have no places yet".
 *
 * So this probes the real project with the publishable (anon) key and prints
 * exactly which migration is missing. It needs no secrets: every check is a
 * read that RLS allows, and a missing column answers 42703 / PGRST205 without
 * returning anyone's data.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from the environment,
 * falling back to the same published values the browser client uses.
 */

import process from 'node:process';

const URL_BASE =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://nmrckgzmluoavgucqvjh.supabase.co';

const KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tcmNrZ3ptbHVvYXZndWNxdmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Mjc5MjQsImV4cCI6MjA5MDMwMzkyNH0.Gye2-aLOB6eTMrrrDErB5m2MVHQbjAgUrhHYicKIW4g';

/** Which migration introduces each requirement. */
const V1 = '20260724000000_travel_atlas.sql';
const V2 = '20260726120000_travel_atlas_v2.sql';
const V3 = '20260726180000_travel_atlas_stamps.sql';

const CHECKS = [
  { label: 'countries', path: 'countries?select=id&limit=1', migration: V1 },
  { label: 'places', path: 'places?select=id&limit=1', migration: V1 },
  { label: 'place_photos', path: 'place_photos?select=id&limit=1', migration: V1 },

  {
    label: 'places: city · visit_status · best_months · is_favorite',
    path: 'places?select=city,visit_status,best_months,is_favorite&limit=1',
    migration: V2,
  },
  {
    label: 'place_photos.caption_ar',
    path: 'place_photos?select=caption_ar&limit=1',
    migration: V2,
  },
  { label: 'place_links', path: 'place_links?select=id&limit=1', migration: V2 },
  { label: 'trips', path: 'trips?select=id&limit=1', migration: V2 },
  { label: 'trip_places', path: 'trip_places?select=id&limit=1', migration: V2 },

  { label: 'trip_places.start_time', path: 'trip_places?select=start_time&limit=1', migration: V3 },
  { label: 'trip_checklist', path: 'trip_checklist?select=id&limit=1', migration: V3 },
  { label: 'country_stamps', path: 'country_stamps?select=id&limit=1', migration: V3 },
];

const RPC_CHECK = {
  label: 'travel_places_nearby()',
  migration: V2,
};

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/**
 * A table the signed-out role cannot READ still answers 401/403 rather than
 * 404 — which means it exists. Only 404/PGRST205 (missing relation) and
 * 42703 (missing column) count as "not applied".
 */
function classify(status, body) {
  if (status < 300) return { ok: true };
  const code = body?.code;
  if (status === 404 || code === 'PGRST205' || code === '42P01') {
    return { ok: false, reason: 'الجدول غير موجود / table missing' };
  }
  if (code === '42703') {
    return { ok: false, reason: 'العمود غير موجود / column missing' };
  }
  if (status === 401 || status === 403 || code === '42501') {
    // Private-by-design tables (trips, country_stamps) refuse an anon read.
    return { ok: true, note: 'موجود، والقراءة محجوبة بـ RLS كما هو مقصود' };
  }
  return { ok: false, reason: body?.message ?? `HTTP ${status}` };
}

async function probe(path) {
  const response = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // A 204 or an empty body is fine.
  }
  return classify(response.status, Array.isArray(body) ? null : body);
}

async function probeRpc() {
  const response = await fetch(`${URL_BASE}/rest/v1/rpc/travel_places_nearby`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      in_longitude: 0,
      in_latitude: 0,
      in_radius_m: 100,
      in_limit: 1,
      in_exclude: null,
    }),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* empty body is fine */
  }
  if (response.ok) return { ok: true };
  const code = Array.isArray(body) ? null : body?.code;
  if (code === 'PGRST202' || response.status === 404) {
    return { ok: false, reason: 'الدالة غير موجودة / function missing' };
  }
  return {
    ok: false,
    reason: (Array.isArray(body) ? null : body?.message) ?? `HTTP ${response.status}`,
  };
}

console.log(`\nTravel Atlas — database check\n${URL_BASE}\n`);

const missing = new Set();
let failures = 0;

for (const check of CHECKS) {
  const result = await probe(check.path);
  const mark = result.ok ? '✓' : '✗';
  const note = result.ok ? (result.note ?? '') : result.reason;
  console.log(`  ${mark}  ${check.label.padEnd(52)} ${note}`);
  if (!result.ok) {
    missing.add(check.migration);
    failures += 1;
  }
}

const rpc = await probeRpc();
console.log(`  ${rpc.ok ? '✓' : '✗'}  ${RPC_CHECK.label.padEnd(52)} ${rpc.ok ? '' : rpc.reason}`);
if (!rpc.ok) {
  missing.add(RPC_CHECK.migration);
  failures += 1;
}

console.log('');

if (failures === 0) {
  console.log('كل شيء مطبَّق. الأطلس جاهز للحفظ والأختام.');
  console.log('All migrations applied — saving places and stamping countries will work.\n');
  process.exit(0);
}

console.log(`${failures} فحصًا لم ينجح. الهجرات الناقصة / missing migrations:`);
for (const migration of [...missing].sort()) console.log(`  • supabase/migrations/${migration}`);
console.log(
  '\nأسرع طريقة: الصق supabase/migrations/APPLY_TRAVEL_ATLAS.sql في\n' +
    'Supabase → SQL Editor → Run. الملف آمن للتكرار.\n' +
    '\nFastest path: paste supabase/migrations/APPLY_TRAVEL_ATLAS.sql into\n' +
    'Supabase → SQL Editor → Run. The file is idempotent.\n',
);
console.log('حتى ذلك الحين: الخرائط تعمل، لكن حفظ الأماكن لن ينجح.');
console.log('Until then the maps work, but saving a place will not.\n');
process.exit(1);
