// All Supabase access for the account / privacy surface lives here
// (docs/CONTRIBUTING.md §2.1).

import { supabase } from '@/integrations/supabase/client';

import type { AccountExport, ExportResult, ExportSource } from './types';

// The generated types in src/integrations/supabase/types.ts predate several
// tables and the delete_own_account RPC, so this layer talks to an untyped
// client. Narrowing happens at the boundary below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

/**
 * Every table that stores data belonging to a single user, with its owner
 * column. Derived by auditing supabase/migrations for columns referencing
 * auth.users plus the older chat tables that store bare uuids.
 *
 * Deliberately excluded:
 *   • countries, rss_articles, rss_feed_meta, diwan_* catalogues — shared
 *     reference data the user did not author.
 *   • places — community content readable by everyone; the atlas keeps it
 *     after erasure (the FK is ON DELETE SET NULL). Still exported below
 *     because the user did author it.
 *   • pkm_note_links, pkm_ai_generations, place_photos, chat_attachments —
 *     reachable only through a parent row that is already exported, and not
 *     directly filterable by user.
 */
export const EXPORT_SOURCES: readonly ExportSource[] = [
  { table: 'profiles', ownerColumn: 'user_id', label: 'الملف الشخصي' },
  { table: 'user_settings', ownerColumn: 'user_id', label: 'الإعدادات' },
  { table: 'journal_entries', ownerColumn: 'user_id', label: 'المذكرات' },
  { table: 'pkm_notes', ownerColumn: 'user_id', label: 'الملاحظات' },
  { table: 'pkm_mind_events', ownerColumn: 'user_id', label: 'سجل الذاكرة' },
  { table: 'mind_anchors', ownerColumn: 'user_id', label: 'مراسي الذهن' },
  { table: 'mind_state', ownerColumn: 'user_id', label: 'حالة الذهن' },
  { table: 'archive_documents', ownerColumn: 'user_id', label: 'الأرشيف' },
  { table: 'wellness_records', ownerColumn: 'user_id', label: 'سجلات العافية' },
  // Fitness data is the most sensitive the app holds: `route` is a JSONB track
  // of GPS points and `avg_heart_rate` is biometric. Both must leave with the
  // user, not just be deleted with them.
  { table: 'fitness_activities', ownerColumn: 'user_id', label: 'أنشطة اللياقة' },
  { table: 'fitness_daily_metrics', ownerColumn: 'user_id', label: 'قياسات اللياقة اليومية' },
  { table: 'clipboard_items', ownerColumn: 'user_id', label: 'الحافظة' },
  { table: 'places', ownerColumn: 'user_id', label: 'الأماكن المحفوظة' },
  { table: 'trips', ownerColumn: 'user_id', label: 'خطط الرحلات' },
  { table: 'country_stamps', ownerColumn: 'user_id', label: 'الدول المسجّلة' },
  { table: 'game_progress', ownerColumn: 'user_id', label: 'تقدّم الألعاب' },
  { table: 'reading_feeds', ownerColumn: 'user_id', label: 'خلاصات القراءة' },
  { table: 'reading_bookmarks', ownerColumn: 'user_id', label: 'العلامات المرجعية' },
  { table: 'reading_prefs', ownerColumn: 'user_id', label: 'تفضيلات القراءة' },
  { table: 'reading_read_state', ownerColumn: 'user_id', label: 'حالة القراءة' },
  { table: 'keyword_alerts', ownerColumn: 'user_id', label: 'تنبيهات الكلمات' },
  { table: 'keyword_alert_hits', ownerColumn: 'user_id', label: 'نتائج التنبيهات' },
  { table: 'podcast_subscriptions', ownerColumn: 'user_id', label: 'اشتراكات البودكاست' },
  { table: 'podcast_queue', ownerColumn: 'user_id', label: 'قائمة البودكاست' },
  { table: 'podcast_episode_state', ownerColumn: 'user_id', label: 'حالة الحلقات' },
  { table: 'podcast_prefs', ownerColumn: 'user_id', label: 'تفضيلات البودكاست' },
  { table: 'diwan_folders', ownerColumn: 'user_id', label: 'مجلدات الديوان' },
  { table: 'diwan_user_favorites', ownerColumn: 'user_id', label: 'مفضّلة الديوان' },
  { table: 'audio_files', ownerColumn: 'user_id', label: 'الملفات الصوتية' },
  { table: 'message_drafts', ownerColumn: 'user_id', label: 'مسوّدات الرسائل' },
  { table: 'messages', ownerColumn: 'sender_id', label: 'الرسائل المُرسَلة' },
  { table: 'chat_members', ownerColumn: 'user_id', label: 'عضويات المحادثات' },
] as const;

/**
 * localStorage keys the app owns. Prefixes ending in `:` match by prefix so
 * per-user and per-feature namespaces are covered without listing each one.
 */
const DEVICE_KEY_PREFIXES = [
  'app-',
  'chat:',
  'diwan:',
  'mihrab:',
  'pkm:',
  'podcast:',
  'prayer-',
  'reading:',
  'tafsir-',
  'wellness:',
];

function readDevicePreferences(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!DEVICE_KEY_PREFIXES.some((p) => key.startsWith(p))) continue;
      // Drafts are transient scratch space, not user records, and signOut()
      // already purges them.
      if (key.includes(':draft:')) continue;
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        out[key] = JSON.parse(raw) as unknown;
      } catch {
        out[key] = raw;
      }
    }
  } catch (err) {
    // Private browsing can block storage access entirely.
    console.warn('[account] could not read device preferences:', (err as Error).message);
  }
  return out;
}

/**
 * Collects everything the signed-in user owns into a single JSON envelope.
 *
 * Each table is queried independently and a failure is recorded in `skipped`
 * rather than aborting: a partial export the user can inspect, with the gaps
 * named, beats no export at all. RLS is what actually scopes the reads — the
 * `eq(ownerColumn, userId)` filter is belt-and-braces so a misconfigured
 * policy cannot widen the result.
 */
export async function buildAccountExport(params: {
  userId: string;
  username: string | null;
  email: string | null;
  createdAt: string | null;
  appName: string;
  appVersion: string;
}): Promise<ExportResult> {
  const cloud: Record<string, unknown[]> = {};
  const skipped: AccountExport['skipped'] = [];
  let rowCount = 0;

  const results = await Promise.all(
    EXPORT_SOURCES.map(async (source) => {
      const { data, error } = await sb
        .from(source.table)
        .select('*')
        .eq(source.ownerColumn, params.userId);
      return { source, data, error };
    }),
  );

  for (const { source, data, error } of results) {
    if (error) {
      skipped.push({
        table: source.table,
        reason: (error as { message?: string }).message ?? 'unknown error',
      });
      continue;
    }
    const rows = (data ?? []) as unknown[];
    if (rows.length === 0) continue;
    cloud[source.table] = rows;
    rowCount += rows.length;
  }

  const payload: AccountExport = {
    format: 1,
    exported_at: new Date().toISOString(),
    app: { name: params.appName, version: params.appVersion },
    account: {
      id: params.userId,
      username: params.username,
      email: params.email,
      created_at: params.createdAt,
    },
    cloud,
    device: readDevicePreferences(),
    skipped,
  };

  const json = JSON.stringify(payload, null, 2);
  return { export: payload, rowCount, byteSize: new Blob([json]).size };
}

/**
 * Permanently erases the calling account via the `delete_own_account` RPC
 * (supabase/migrations/20260725120000_account_deletion.sql).
 *
 * The RPC takes no arguments and reads auth.uid() server-side, so there is no
 * identifier for a caller to substitute. Returns a discriminated result rather
 * than throwing, matching the error convention in docs/CONTRIBUTING.md §5.
 */
export async function deleteOwnAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await sb.rpc('delete_own_account');
  if (error) {
    return { ok: false, error: (error as { message?: string }).message ?? 'حدث خطأ غير متوقع' };
  }
  return { ok: true };
}
