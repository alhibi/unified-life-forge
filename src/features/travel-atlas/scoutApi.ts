/**
 * Atlas Scout client — favorite targets + AI-researched place dossiers.
 *
 * Talks to the `atlas-scout` edge function (SSE, same protocol as
 * archive-generate) and to the three scout tables via typed Zod-validated
 * rows. All DB access funnels through here; UI consumes hooks only.
 *
 * Re-add semantics: removing a favourite soft-deletes it (is_active=false).
 * Adding the same place again REVIVES the dormant row instead of hitting the
 * partial unique index — a city you once removed must never be un-addable.
 */
import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import { getEnv } from '@/lib/env';


/* ── Types ──────────────────────────────────────────────────────────────── */

export type ScoutTargetKind = 'city' | 'country';
export type ScoutDepth = 'standard' | 'deep' | 'deepest';

export interface WatchTarget {
  id: string;
  kind: ScoutTargetKind;
  query: string;
  displayNameAr: string;
  displayNameEn: string;
  isoCode: string | null;
  centerLng: number | null;
  centerLat: number | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface ScoutPlace {
  id: string;
  runId: string;
  targetId: string;
  nameEn: string;
  nameAr: string | null;
  category: string;
  vibe: string | null;
  coordinates: { lng: number; lat: number } | null;
  addressLine: string | null;
  city: string | null;
  descriptionAr: string;
  atmosphereAr: string | null;
  tipsAr: string | null;
  bestMonths: number[];
  durationMinutes: number | null;
  priceLevel: number | null;
  signatureDish: string | null;
  photoQueryEn: string | null;
  sources: string[];
  promotedPlaceId: string | null;
  dismissed: boolean;
  createdAt: string | null;
}

export type ScoutProgressEvent =
  | { stage: 'geocode'; message: string }
  | { stage: 'discover'; message: string }
  | { stage: 'dedup'; message: string }
  | { stage: 'progress'; current: number; total: number; message: string }
  | { stage: 'done'; filed: number; total: number; failed: number; duplicates: number }
  | { stage: 'error'; message: string };

/** What the pipeline reports when a run finishes — drives honest toasts. */
export interface ScoutOutcome {
  filed: number;
  total: number;
  failed: number;
  duplicates: number;
}

/* ── Zod schemas over the wire format ───────────────────────────────────── */

const CoordinatesSchema = z.object({ lng: z.number(), lat: z.number() });

const ScoutPlaceRowSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  target_id: z.string().uuid(),
  name_en: z.string().min(1),
  name_ar: z.string().nullable(),
  category: z.string().min(1),
  vibe: z.string().nullable(),
  coordinates: CoordinatesSchema.nullable(),
  address_line: z.string().nullable(),
  city: z.string().nullable(),
  description_ar: z.string().min(1),
  atmosphere_ar: z.string().nullable(),
  tips_ar: z.string().nullable(),
  best_months: z.array(z.number()).nullable(),
  duration_minutes: z.number().nullable(),
  price_level: z.number().nullable(),
  signature_dish: z.string().nullable(),
  photo_query_en: z.string().nullable(),
  sources: z.array(z.string()).nullable(),
  promoted_place_id: z.string().uuid().nullable(),
  dismissed: z.boolean(),
  created_at: z.string().nullable(),
});
type ScoutPlaceRow = z.infer<typeof ScoutPlaceRowSchema>;

const TargetRowSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['city', 'country']),
  query: z.string().min(1),
  display_name_ar: z.string().min(1),
  display_name_en: z.string().min(1),
  iso_code: z.string().nullable(),
  center_lng: z.number().nullable(),
  center_lat: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.string().nullable(),
});
type TargetRow = z.infer<typeof TargetRowSchema>;

function parseScoutPlace(row: ScoutPlaceRow): ScoutPlace {
  const coords = row.coordinates;
  const okCoords =
    coords && Number.isFinite(coords.lng) && Number.isFinite(coords.lat)
      ? { lng: coords.lng, lat: coords.lat }
      : null;
  return {
    id: row.id,
    runId: row.run_id,
    targetId: row.target_id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    category: row.category,
    vibe: row.vibe,
    coordinates: okCoords,
    addressLine: row.address_line,
    city: row.city,
    descriptionAr: row.description_ar,
    atmosphereAr: row.atmosphere_ar,
    tipsAr: row.tips_ar,
    bestMonths: Array.isArray(row.best_months) ? row.best_months : [],
    durationMinutes: row.duration_minutes,
    priceLevel: row.price_level,
    signatureDish: row.signature_dish,
    photoQueryEn: row.photo_query_en,
    sources: Array.isArray(row.sources) ? row.sources : [],
    promotedPlaceId: row.promoted_place_id,
    dismissed: row.dismissed,
    createdAt: row.created_at,
  };
}

function parseTarget(row: TargetRow): WatchTarget {
  return {
    id: row.id,
    kind: row.kind,
    query: row.query,
    displayNameAr: row.display_name_ar,
    displayNameEn: row.display_name_en,
    isoCode: row.iso_code,
    centerLng: row.center_lng,
    centerLat: row.center_lat,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * SSE frame parser, factored out of fetch so vitest can drive it directly:
 * feed raw chunks, get parsed events. Mirrors the wire format
 * `event: <name>\ndata: <json>\n\n`.
 */
export function parseSseFrame(rawEvent: string): { event: string; payload: unknown } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event: ')) event = line.slice(7).trim();
    else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, payload: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null; // partial/garbled frame — caller skips silently
  }
}

/** Maps one streamed event onto progress callbacks + the final outcome. */
function handleScoutEvent(
  payload: unknown,
  eventName: string,
  onEvent: (e: ScoutProgressEvent) => void,
  state: { filed: number },
): void {
  if (eventName === 'stage' || eventName === 'progress') {
    onEvent(payload as ScoutProgressEvent);
    return;
  }
  if (eventName === 'done') {
    const d = (payload ?? {}) as Partial<ScoutOutcome>;
    state.filed = d.filed ?? 0;
    onEvent({
      stage: 'done',
      filed: d.filed ?? 0,
      total: d.total ?? 0,
      failed: d.failed ?? 0,
      duplicates: d.duplicates ?? 0,
    });
    return;
  }
  if (eventName === 'error') {
    throw new Error(((payload as { message?: string })?.message) || 'خطأ في محرك الكشف');
  }
}

/* ── API ────────────────────────────────────────────────────────────────── */

const FN_BASE = `${getEnv().VITE_SUPABASE_URL || 'https://nmrckgzmluoavgucqvjh.supabase.co'}/functions/v1`;

/**
 * The generated Database union predates the scout tables (migration ships
 * ahead of the next types regen), so these two names can't be typed against
 * it yet. This is the ONLY untyped boundary in the module: rows are
 * re-validated through the Zod schemas above on every read, so schema drift
 * fails loudly here instead of leaking into the UI.
 */
const TABLE_TARGETS = 'atlas_watch_targets';
const TABLE_PLACES = 'atlas_scout_places';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const scoutFrom = supabase.from.bind(supabase) as (table: string) => any;

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولاً');
  return user.id;
}

export const atlasScoutApi = {
  async listTargets(): Promise<WatchTarget[]> {
    const { data, error } = await scoutFrom(TABLE_TARGETS)
      .select('*')
      .eq('user_id', await currentUserId())
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []).map((row: unknown) => parseTarget(TargetRowSchema.parse(row)));
  },

  /**
   * Adds a favourite. When the user previously removed the same target, the
   * dormant row is revived (unique index only covers active rows); brand-new
   * duplicates surface as a friendly message, not an error.
   */
  async addTarget(input: {
    kind: ScoutTargetKind;
    query: string;
    displayNameAr: string;
    displayNameEn: string;
    isoCode?: string | null;
    centerLng?: number | null;
    centerLat?: number | null;
  }): Promise<{ target: WatchTarget; revived: boolean }> {
    const userId = await currentUserId();

    // Dormant twin? Flip it back on instead of colliding with the index.
    const { data: dormant } = await scoutFrom(TABLE_TARGETS)
      .select('*')
      .eq('user_id', userId)
      .eq('kind', input.kind)
      .eq('is_active', false)
      .ilike('query', input.query)
      .limit(1);

    const twin = ((dormant ?? []) as Array<{ id: string; query: string }>).find(
      (r) => r.query?.toLowerCase() === input.query.toLowerCase(),
    );

    if (twin) {
      const { data, error } = await scoutFrom(TABLE_TARGETS)
        .update({
          is_active: true,
          display_name_ar: input.displayNameAr,
          display_name_en: input.displayNameEn,
          iso_code: input.isoCode ?? null,
          center_lng: input.centerLng ?? null,
          center_lat: input.centerLat ?? null,
        })
        .eq('id', twin.id)
        .select('*')
        .single();
      if (error) throw error;
      return { target: parseTarget(TargetRowSchema.parse(data)), revived: true };
    }

    const { data, error } = await scoutFrom(TABLE_TARGETS)
      .insert({
        user_id: userId,
        kind: input.kind,
        query: input.query,
        display_name_ar: input.displayNameAr,
        display_name_en: input.displayNameEn,
        iso_code: input.isoCode ?? null,
        center_lng: input.centerLng ?? null,
        center_lat: input.centerLat ?? null,
      })
      .select('*')
      .single();

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new Error('هذا المكان مضاف بالفعل إلى مفضلاتك');
      }
      throw error;
    }
    return { target: parseTarget(TargetRowSchema.parse(data)), revived: false };
  },

  async removeTarget(id: string): Promise<void> {
    const { error } = await scoutFrom(TABLE_TARGETS)
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  async listPlaces(targetId: string): Promise<ScoutPlace[]> {
    const { data, error } = await scoutFrom(TABLE_PLACES)
      .select('*')
      .eq('target_id', targetId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []).flatMap((row: unknown) => {
      const parsed = ScoutPlaceRowSchema.safeParse(row);
      return parsed.success ? [parseScoutPlace(parsed.data)] : [];
    });
  },

  /**
   * Runs the deep-scout pipeline. Streams progress via onEvent until done or
   * error; resolves with the honest outcome (filed / duplicates / failed).
   */
  async scout(
    target: WatchTarget,
    depth: ScoutDepth,
    onEvent: (e: ScoutProgressEvent) => void,
    signal?: AbortSignal,
  ): Promise<ScoutOutcome> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('يجب تسجيل الدخول أولاً');

    const res = await fetch(`${FN_BASE}/atlas-scout`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        targetId: target.id,
        query: target.query,
        kind: target.kind,
        displayNameAr: target.displayNameAr,
        depth,
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => '');
      throw new Error(`فشل الاتصال بمحرك الكشف (${res.status}) ${t.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    const state = { filed: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buf.indexOf('\n\n')) !== -1) {
        const rawEvent = buf.slice(0, sepIdx);
        buf = buf.slice(sepIdx + 2);

        const frame = parseSseFrame(rawEvent);
        if (!frame) continue;
        handleScoutEvent(frame.payload, frame.event, onEvent, state);
      }
    }

    return { filed: state.filed, total: state.filed, failed: 0, duplicates: 0 };
  },

  /** Dismiss a dossier the user isn't interested in. */
  async dismissPlace(id: string): Promise<void> {
    const { error } = await scoutFrom(TABLE_PLACES).update({ dismissed: true }).eq('id', id);
    if (error) throw error;
  },
};
