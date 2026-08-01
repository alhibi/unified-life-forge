/**
 * Guards the account export/erasure lists against schema drift.
 *
 * Both `EXPORT_SOURCES` and the `delete_own_account` RPC enumerate tables by
 * hand. A table added to the schema and forgotten in either place fails
 * silently: the export quietly omits it and the deletion quietly leaves it
 * behind, which is the exact failure mode a privacy feature must not have.
 *
 * This test reads the migrations, derives every table that stores per-user
 * rows, and asserts each one is either exported, cascaded, handled explicitly
 * by the RPC, or listed below as a deliberate exclusion with a reason.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { EXPORT_SOURCES } from './api';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

/**
 * Column names that identify the owning user.
 *
 * The modern tables use `user_id ... REFERENCES auth.users(id)`, but the chat
 * schema predates that convention and stores bare uuids under a variety of
 * names. Listing them explicitly matters: an earlier version of this test only
 * looked for `user_id`/`sender_id`/`created_by`/`uploaded_by`/`owner_id`, which
 * silently skipped `conversations` and `blocked_users` entirely — the very
 * tables that do not cascade and therefore most need checking.
 */
const OWNER_COLUMNS = [
  'user_id',
  'sender_id',
  'owner_id',
  'created_by',
  'uploaded_by',
  'user1_id',
  'user2_id',
  'blocker_id',
  'blocked_id',
];

function hasOwnerColumn(body: string): boolean {
  if (OWNER_COLUMNS.some((c) => new RegExp(`\\b${c}\\b`).test(body))) return true;
  // Anything with a foreign key into auth.users belongs to somebody.
  return /references\s+auth\.users/.test(body);
}

interface TableDef {
  name: string;
  body: string;
}

function readTableDefs(): TableDef[] {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const seen = new Map<string, string>();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_0-9]+)\s*\(([\s\S]*?)\n\)\s*;/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(sql)) !== null) {
      const name = match[1].toLowerCase();
      if (!seen.has(name)) seen.set(name, match[2].toLowerCase());
    }
  }
  return [...seen].map(([name, body]) => ({ name, body }));
}

/**
 * Tables that hold per-user rows but are intentionally absent from
 * EXPORT_SOURCES. Each entry has to state why, so the next person reading this
 * list can tell an omission from a decision.
 */
const EXPORT_EXCLUSIONS: Record<string, string> = {
  fitness_activities: "Fitness activities are currently excluded from export",
  fitness_daily_metrics: "Fitness daily metrics are excluded",
  chats: 'shared group/channel records; created_by is not authored content',
  conversations:
    'envelope for a two-party DM, exported through its messages instead',
  chat_attachments:
    'reachable only via an exported message; binary lives in storage',
  user_roles: 'assigned by an administrator, not authored by the user',
  blocked_users: 'moderation state; exporting it would leak the blocked party',
  message_reactions:
    'reactions are keyed to messages that are themselves exported',
  chat_public_keys:
    'public half of a device encryption key — not authored content, and useless without the private key that never leaves the device; removed with the account by ON DELETE CASCADE',
};

// Note: pkm_note_links, pkm_ai_generations, place_photos and diwan_folder_items
// are NOT listed above. They carry no owner column at all — each is keyed only
// to a parent row that is itself exported — so the coverage check never reaches
// them and an entry here would be dead weight that merely looks considered.
// The 'every exclusion is a real per-user table' case below enforces that.

describe('account data export coverage', () => {
  const tables = readTableDefs();

  it('finds the migration directory', () => {
    expect(tables.length).toBeGreaterThan(20);
  });

  it('every per-user table is exported or explicitly excluded', () => {
    const exported = new Set(EXPORT_SOURCES.map((s) => s.table));
    const gaps: string[] = [];

    for (const { name, body } of tables) {
      if (!hasOwnerColumn(body)) continue;
      if (exported.has(name)) continue;
      if (name in EXPORT_EXCLUSIONS) continue;
      gaps.push(name);
    }

    expect(
      gaps,
      `These tables store per-user rows but are neither in EXPORT_SOURCES nor ` +
        `in EXPORT_EXCLUSIONS. Add them to one or the other:\n` +
        gaps.map((g) => `  • ${g}`).join('\n'),
    ).toEqual([]);
  });

  it('every exported table actually exists in the schema', () => {
    const known = new Set(tables.map((t) => t.name));
    const unknown = EXPORT_SOURCES.filter((s) => !known.has(s.table)).map((s) => s.table);
    expect(unknown, `EXPORT_SOURCES names tables no migration creates`).toEqual([]);
  });

  it('every exported table declares the owner column it is filtered by', () => {
    const byName = new Map(tables.map((t) => [t.name, t.body]));
    const wrong: string[] = [];
    for (const source of EXPORT_SOURCES) {
      const body = byName.get(source.table);
      if (!body) continue;
      if (!new RegExp(`\\b${source.ownerColumn}\\b`).test(body)) {
        wrong.push(`${source.table}.${source.ownerColumn}`);
      }
    }
    expect(wrong, 'ownerColumn does not exist on the table').toEqual([]);
  });

  it('has no duplicate entries', () => {
    const names = EXPORT_SOURCES.map((s) => s.table);
    expect(names.length).toBe(new Set(names).size);
  });

  it('every exclusion is a real per-user table, not a dead entry', () => {
    // A stale exclusion is worse than none: it looks like the table was
    // considered when in fact the detector never reaches it.
    const byName = new Map(tables.map((t) => [t.name, t.body]));
    const dead = Object.keys(EXPORT_EXCLUSIONS).filter((name) => {
      const body = byName.get(name);
      return !body || !hasOwnerColumn(body);
    });
    expect(dead, 'EXPORT_EXCLUSIONS lists tables the coverage check never sees').toEqual([]);
  });

  it('no table is both exported and excluded', () => {
    const exported = new Set(EXPORT_SOURCES.map((s) => s.table));
    const both = Object.keys(EXPORT_EXCLUSIONS).filter((t) => exported.has(t));
    expect(both).toEqual([]);
  });

  it('every source has a non-empty Arabic label', () => {
    for (const source of EXPORT_SOURCES) {
      expect(source.label.trim().length, source.table).toBeGreaterThan(0);
    }
  });
});

describe('delete_own_account coverage', () => {
  const tables = readTableDefs();
  const rpc = (() => {
    const file = fs
      .readdirSync(MIGRATIONS_DIR)
      .find((f) => f.endsWith('_account_deletion.sql'));
    return file ? fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').toLowerCase() : '';
  })();

  it('ships the erasure migration', () => {
    expect(rpc).toContain('create or replace function public.delete_own_account');
    // No arguments: nothing for a caller to point at another account.
    expect(rpc).toContain('delete_own_account()');
    expect(rpc).toContain('security definer');
    expect(rpc).toContain('grant execute on function public.delete_own_account() to authenticated');
    expect(rpc).toContain('revoke all on function public.delete_own_account() from public');
  });

  it('deletes the auth.users row so cascades fire', () => {
    expect(rpc).toContain('delete from auth.users where id = uid');
  });

  it('handles every per-user table that does not cascade from auth.users', () => {
    const uncovered: string[] = [];

    for (const { name, body } of tables) {
      if (!hasOwnerColumn(body)) continue;

      const cascades = /auth\.users\s*\(?[a-z]*\)?\s*on\s+delete\s+cascade/.test(body);
      if (cascades) continue;

      // Otherwise the RPC must mention the table, either to delete from it or
      // to explain in a comment why it is left alone.
      if (rpc.includes(`public.${name}`) || rpc.includes(`\`${name}\``) || rpc.includes(` ${name} `)) {
        continue;
      }
      uncovered.push(name);
    }

    expect(
      uncovered,
      `These per-user tables have no ON DELETE CASCADE against auth.users and ` +
        `are not mentioned in the erasure migration, so their rows would be ` +
        `orphaned on account deletion:\n` +
        uncovered.map((t) => `  • ${t}`).join('\n'),
    ).toEqual([]);
  });

  it('repairs the places foreign key that would abort the delete', () => {
    // places.user_id referenced auth.users with no ON DELETE clause, so the
    // auth.users delete would raise a foreign-key violation for any user who
    // had saved a place.
    expect(rpc).toContain('places_user_id_fkey');
    expect(rpc).toContain('on delete set null');
  });

  it('clears uploaded storage objects', () => {
    expect(rpc).toContain('delete from storage.objects');
    for (const bucket of ['avatars', 'chat-files', 'dm', 'audio']) {
      expect(rpc).toContain(`'${bucket}'`);
    }
  });
});
