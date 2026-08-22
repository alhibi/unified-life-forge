/**
 * Atlas Scout client — favorite targets + AI-researched place dossiers.
 *
 * Talks to the `atlas-scout` edge function (SSE, same protocol as
 * archive-generate) and to the three scout tables. All DB access funnels
 * through here; UI consumes hooks only.
 */
import { supabase } from '@/integrations/supabase/client';

const FN_URL = `${(import.meta as any).env.VITE_SUPABASE_URL || 'https://nmrckgzmluoavgucqvjh.supabase.co'}/functions/v1/atlas-scout`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
  | { stage: 'progress'; current: number; total: number; message: string }
  | { stage: 'done'; filed: number; total: number }
  | { stage: 'error'; message: string };

interface ScoutPlaceRow {
  id: string;
  run_id: string;
  target_id: string;
  name_en: string;
  name_ar: string | null;
  category: string;
  vibe: string | null;
  coordinates: { lng: number; lat: number } | null;
  address_line: string | null;
  city: string | null;
  description_ar: string;
  atmosphere_ar: string | null;
  tips_ar: string | null;
  best_months: number[] | null;
  duration_minutes: number | null;
  price_level: number | null;
  signature_dish: string | null;
  photo_query_en: string | null;
  sources: string[] | null;
  promoted_place_id: string | null;
  dismissed: boolean;
  created_at: string | null;
}

function parseScoutPlace(row: ScoutPlaceRow): ScoutPlace {
  const coords = row.coordinates;
  const okCoords =
    coords &&
    typeof coords === 'object' &&
    Number.isFinite(coords.lng) &&
    Number.isFinite(coords.lat)
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

interface TargetRow {
  id: string;
  kind: ScoutTargetKind;
  query: string;
  display_name_ar: string;
  display_name_en: string;
  iso_code: string | null;
  is_active: boolean;
  created_at: string | null;
}

function parseTarget(row: TargetRow): WatchTarget {
  return {
    id: row.id,
    kind: row.kind,
    query: row.query,
    displayNameAr: row.display_name_ar,
    displayNameEn: row.display_name_en,
    isoCode: row.iso_code,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/* ── API ────────────────────────────────────────────────────────────────── */

export const atlasScoutApi = {
  async listTargets(): Promise<WatchTarget[]> {
    const { data, error } = await db
      .from('atlas_watch_targets')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []).map(parseTarget);
  },

  async addTarget(input: {
    kind: ScoutTargetKind;
    query: string;
    displayNameAr: string;
    displayNameEn: string;
    isoCode?: string | null;
  }): Promise<WatchTarget> {
    const { data, error } = await db
      .from('atlas_watch_targets')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        kind: input.kind,
        query: input.query,
        display_name_ar: input.displayNameAr,
        display_name_en: input.displayNameEn,
        iso_code: input.isoCode ?? null,
      })
      .select('*')
      .single();
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new Error('هذا المكان مضاف بالفعل إلى مفضلاتك');
      }
      throw error;
    }
    return parseTarget(data);
  },

  async removeTarget(id: string): Promise<void> {
    const { error } = await db
      .from('atlas_watch_targets')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  async listPlaces(targetId: string): Promise<ScoutPlace[]> {
    const { data, error } = await db
      .from('atlas_scout_places')
      .select('*')
      .eq('target_id', targetId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []).map(parseScoutPlace);
  },

  /**
   * Runs the deep-scout pipeline. Streams progress via onEvent until done
   * or error; resolves with the count of newly filed dossiers.
   */
  async scout(
    target: WatchTarget,
    depth: ScoutDepth,
    onEvent: (e: ScoutProgressEvent) => void,
    signal?: AbortSignal
  ): Promise<number> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('يجب تسجيل الدخول أولاً');

    const res = await fetch(FN_URL, {
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

    // SSE parse — same wire format archive-generate emits.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let filed = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buf.indexOf('\n\n')) !== -1) {
        const rawEvent = buf.slice(0, sepIdx);
        buf = buf.slice(sepIdx + 2);

        let event = 'message';
        const dataLines: string[] = [];
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event: ')) event = line.slice(7).trim();
          else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
        }
        if (dataLines.length === 0) continue;

        try {
          const payload = JSON.parse(dataLines.join('\n'));
          if (event === 'stage') onEvent(payload as ScoutProgressEvent);
          else if (event === 'progress') onEvent(payload as ScoutProgressEvent);
          else if (event === 'done') {
            filed = (payload as { filed: number }).filed ?? 0;
            onEvent({ stage: 'done', filed, total: (payload as { total: number }).total ?? 0 });
          } else if (event === 'error') {
            throw new Error((payload as { message: string }).message || 'خطأ في محرك الكشف');
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue; // partial frame — skip
          throw e;
        }
      }
    }

    return filed;
  },

  /** Dismiss a dossier the user isn't interested in. */
  async dismissPlace(id: string): Promise<void> {
    const { error } = await db
      .from('atlas_scout_places')
      .update({ dismissed: true })
      .eq('id', id);
    if (error) throw error;
  },
};
