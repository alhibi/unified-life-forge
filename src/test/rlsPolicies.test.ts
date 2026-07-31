/**
 * Row-Level Security audit, run as a test.
 *
 * WHY THIS MATTERS MORE HERE THAN IN MOST APPS
 *
 * `src/integrations/supabase/client.ts` ships the project URL and the anon key in
 * the bundle. That is how every Supabase browser app works and the key is designed
 * to be public — but it means the *entire* access-control model is RLS. Anyone who
 * opens devtools has a working API credential. A table with RLS disabled, or a
 * policy with a `true` predicate on a write, is not a hardening opportunity; it is
 * an open endpoint.
 *
 * The app also has almost no client-side route guards (`AuthGuard` is used on one
 * page), so RLS is doing the work people usually expect a router to do as well.
 *
 * These tests parse `supabase/migrations` as text. They cannot prove what is
 * deployed — only what the committed schema says — but they catch the mistake that
 * actually happens: a migration that adds a table and forgets `ENABLE ROW LEVEL
 * SECURITY`, or reaches for `WITH CHECK (true)` to make an insert work.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../supabase/migrations');

/**
 * Migration files in apply order.
 *
 * Order matters: a policy created in one migration and dropped in a later one is
 * not part of the deployed schema. Concatenating everything and grepping reports
 * the dropped version forever, which would make this suite fail on history rather
 * than on the current state.
 *
 * `APPLY_TRAVEL_ATLAS.sql` is excluded — it is a hand-run bundle of statements
 * that also appear in the timestamped migrations, so counting it double-reports
 * every policy it contains.
 */
function migrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => f !== 'APPLY_TRAVEL_ATLAS.sql')
    .sort();
}

/**
 * Strips `--` comments before lower-casing and collapsing whitespace.
 *
 * Not optional: migrations in this repo quote the statement they are replacing in
 * their header comment, so without this a migration that *documents* removing a
 * `WITH CHECK (true)` policy is parsed as creating one. The first version of this
 * suite reported exactly that and blamed the fix for the bug.
 */
function normalise(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Everything concatenated. Only for questions that are order-independent. */
const SQL = normalise(
  migrationFiles()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n'),
);

function createdTables(): string[] {
  const names = new Set<string>();
  for (const m of SQL.matchAll(
    /create table (?:if not exists )?(?:public\.)?([a-z_0-9]+)/g,
  )) {
    names.add(m[1]);
  }
  return [...names].sort();
}

interface Policy {
  name: string;
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'all';
  /** Roles named in the TO clause. Empty means the statement omitted it. */
  roles: string[];
  hasTruePredicate: boolean;
  statement: string;
}

function parsePolicy(statement: string): Policy {
  const name = statement.match(/create policy "?([^"]*?)"? on /)?.[1]?.trim() ?? '?';
  const table = statement.match(/ on (?:public\.)?([a-z_0-9]+)/)?.[1] ?? '?';
  const operation = (statement.match(/ for (select|insert|update|delete|all)/)?.[1] ??
    'all') as Policy['operation'];
  const rolesRaw = statement.match(/ to ([a-z_, ]+?)(?= using| with check| \()/)?.[1];
  return {
    name,
    table,
    operation,
    roles: rolesRaw ? rolesRaw.split(',').map((r) => r.trim()).filter(Boolean) : [],
    hasTruePredicate:
      / using \( ?true ?\)/.test(statement) || / with check \( ?true ?\)/.test(statement),
    statement,
  };
}

/**
 * The policies that would exist after applying every migration in order.
 *
 * Replays CREATE and DROP POLICY statements into a map keyed by table + policy
 * name, so a policy that a later migration replaces or drops does not linger. The
 * `countries` insert policy is exactly this case: the original
 * `WITH CHECK (true)` version is dropped and replaced in
 * 20260731120000_harden_countries_insert.sql, and a naive grep over all files
 * would keep reporting the version that is no longer deployed.
 */
function effectivePolicies(): Policy[] {
  const live = new Map<string, Policy>();

  for (const file of migrationFiles()) {
    const sql = normalise(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));

    for (const m of sql.matchAll(
      /drop policy (?:if exists )?"?([^"]*?)"? on (?:public\.)?([a-z_0-9]+)/g,
    )) {
      live.delete(`${m[2]}::${m[1].trim()}`);
    }

    for (const m of sql.matchAll(/create policy [^;]*?;/g)) {
      const policy = parsePolicy(m[0]);
      live.set(`${policy.table}::${policy.name}`, policy);
    }
  }

  return [...live.values()];
}

/**
 * Tables that are deliberately world-readable: shared catalogues and reference
 * data nobody authored. Anything not on this list must scope its SELECT to the
 * calling user.
 */
const PUBLIC_READ_TABLES = new Set([
  // Literary corpus — the Diwan library ships as public reference data.
  'diwan_eras',
  'diwan_poets',
  'diwan_poems',
  'diwan_verses',
  'diwan_glossary',
  // Travel atlas reference data and community content.
  'countries',
  'places',
  'place_photos',
  'place_links',
  // RSS cache, written by the service role and read by everyone.
  'rss_articles',
  'rss_feed_meta',
  // Display names and avatars, needed to render any chat message or member list.
  'profiles',
  // The public half of a device encryption key. Useless without the private half,
  // which never leaves the device, and readable by design so peers can encrypt.
  'chat_public_keys',
]);

describe('RLS coverage', () => {
  const tables = createdTables();

  it('found the migrations', () => {
    expect(tables.length).toBeGreaterThan(40);
  });

  it('enables row level security on every table', () => {
    const enabled = new Set<string>();
    for (const m of SQL.matchAll(
      /alter table (?:public\.)?([a-z_0-9]+) enable row level security/g,
    )) {
      enabled.add(m[1]);
    }
    const unprotected = tables.filter((t) => !enabled.has(t));
    expect(
      unprotected,
      `RLS is the only access control this app has — the anon key is in the ` +
        `bundle. A table without it is readable and writable by anyone:\n` +
        unprotected.map((t) => `  • ${t}`).join('\n'),
    ).toEqual([]);
  });

  it('gives every table at least one policy', () => {
    const withPolicy = new Set(effectivePolicies().map((p) => p.table));
    const none = tables.filter((t) => !withPolicy.has(t));
    // RLS with no policy denies everything, which is safe but means the table is
    // unreachable — almost always an unfinished migration rather than a decision.
    expect(none, 'RLS enabled but no policy: the table is unusable').toEqual([]);
  });
});

describe('RLS policy predicates', () => {
  const all = effectivePolicies();

  it('parsed the policies', () => {
    expect(all.length).toBeGreaterThan(100);
    expect(all.every((p) => p.table !== '?')).toBe(true);
  });

  it('never permits an unrestricted write from a client role', () => {
    // `WITH CHECK (true)` on an INSERT reachable by `authenticated` means any
    // account can write any row. That is fine for the service role, which already
    // bypasses RLS; it is not fine for a client.
    //
    // This caught `countries`: "Auth users can add countries" was
    // `FOR INSERT TO authenticated WITH CHECK (true)` on a table every user reads,
    // so one account could push arbitrary rows into everyone else's atlas.
    const offenders = all
      .filter((p) => p.operation !== 'select' && p.hasTruePredicate)
      .filter((p) => !p.roles.includes('service_role'))
      .map((p) => `${p.table} FOR ${p.operation} TO ${p.roles.join(', ') || '(unspecified)'}`);

    expect(
      offenders,
      `These write policies accept any row from a client role:\n` +
        offenders.map((o) => `  • ${o}`).join('\n'),
    ).toEqual([]);
  });

  it('only exposes an unrestricted SELECT on tables meant to be public', () => {
    const offenders = all
      .filter((p) => (p.operation === 'select' || p.operation === 'all') && p.hasTruePredicate)
      .filter((p) => !p.roles.includes('service_role'))
      .map((p) => p.table)
      .filter((t) => !PUBLIC_READ_TABLES.has(t));

    expect(
      [...new Set(offenders)],
      `These tables are readable by every user via a \`true\` predicate but are ` +
        `not in PUBLIC_READ_TABLES. Either scope the policy to auth.uid() or add ` +
        `the table to that list with a reason:\n` +
        [...new Set(offenders)].map((t) => `  • ${t}`).join('\n'),
    ).toEqual([]);
  });

  it('keeps PUBLIC_READ_TABLES free of stale entries', () => {
    // An entry that no longer corresponds to a real table reads as a considered
    // decision when in fact nothing checks it.
    const tables = new Set(createdTables());
    const dead = [...PUBLIC_READ_TABLES].filter((t) => !tables.has(t));
    expect(dead, 'PUBLIC_READ_TABLES names tables no migration creates').toEqual([]);
  });

});
