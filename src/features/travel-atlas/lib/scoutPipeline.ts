/**
 * Atlas Scout pipeline core — pure, dependency-free, testable.
 *
 * Everything the scout decides (normalisation, dedup keys, validation,
 * prompt contracts) lives here as pure functions so vitest can hammer it
 * with no Deno and no network. Two consumers:
 *
 * - `supabase/functions/atlas-scout` (via the `_shared` re-export) composes
 *   these with real I/O inside the edge function.
 * - The web client (`TravelAtlasPage` promotion path) imports the category
 *   guard so the atlas vocabulary has exactly one owner.
 *
 * Wire contract notes:
 * - Coordinates are GeoJSON [lng, lat] everywhere — matches public.places.
 * - The discovery/dossier JSON shapes below are what the prompts demand;
 *   every field is defensively normalised because models improvise.
 */

/** Scout depth → how many places and how much prose per dossier. */
export type ScoutDepth = 'standard' | 'deep' | 'deepest';

export interface DepthPolicy {
  places: number;
  perPlaceWords: number;
  modelTier: 'flash' | 'pro';
  /** Parallel dossier writes; higher tiers stay conservative on rate limits. */
  concurrency: number;
}

export const DEPTH_POLICY: Record<ScoutDepth, DepthPolicy> = {
  standard: { places: 8, perPlaceWords: 130, modelTier: 'flash', concurrency: 3 },
  deep: { places: 14, perPlaceWords: 220, modelTier: 'flash', concurrency: 3 },
  deepest: { places: 20, perPlaceWords: 320, modelTier: 'pro', concurrency: 2 },
};

/**
 * Category vocabulary — mirrors the `places_category_check` constraint on
 * public.places exactly (16 values). The DB CHECK, the discovery prompt,
 * and `types.ts` PLACE_CATEGORIES must stay in lockstep; this array is the
 * single source the other two derive from at build time.
 */
export const SCOUT_CATEGORIES = [
  'nature', 'beach', 'viewpoint', 'historic', 'museum', 'religious',
  'food', 'cafe', 'market', 'city', 'park', 'adventure', 'stay',
  'culture', 'transport', 'other',
] as const;
export type ScoutCategory = (typeof SCOUT_CATEGORIES)[number];

export function isScoutCategory(value: unknown): value is ScoutCategory {
  return typeof value === 'string' && (SCOUT_CATEGORIES as readonly string[]).includes(value);
}

const SCOUT_VIBES = [
  'nature', 'food', 'adventure', 'culture', 'nightlife', 'family', 'budget', 'luxury',
] as const;
export type ScoutVibe = (typeof SCOUT_VIBES)[number];

function isScoutVibe(value: unknown): value is ScoutVibe {
  return typeof value === 'string' && (SCOUT_VIBES as readonly string[]).includes(value);
}

/* ── Normalisation helpers ──────────────────────────────────────────────── */

/** Coerces model output to a non-empty trimmed string, else null. */
export function cleanText(value: unknown, maxLen = 4000): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s || /^(null|undefined|غير متوفر|ن\.ا)$/i.test(s)) return null;
  return s.slice(0, maxLen);
}

export function clampInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  // Outside-range values are junk (a negative duration is not "5 minutes"),
  // so they are rejected outright instead of pulled to the boundary.
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n);
}

/** Valid months only, deduped, sorted — out-of-range months are dropped, NOT clamped. */
export function normalizeBestMonths(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((m) => typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 12)
      .map((m) => m as number),
  )].sort((a, b) => a - b);
}

/** Accepts [lng,lat], {lng,lat} or {lat,lng}; returns the canonical pair or null. */
export function normalizeLngLat(value: unknown): [number, number] | null {
  let lng: unknown;
  let lat: unknown;
  if (Array.isArray(value) && value.length >= 2) {
    [lng, lat] = value;
  } else if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    lng = o.lng ?? o.lon ?? o.longitude;
    lat = o.lat ?? o.latitude;
  }
  const lngN = typeof lng === 'number' ? lng : typeof lng === 'string' ? parseFloat(lng) : NaN;
  const latN = typeof lat === 'number' ? lat : typeof lat === 'string' ? parseFloat(lat) : NaN;
  // Reject out-of-range AND degenerate zero-island anchors.
  if (
    !Number.isFinite(lngN) || !Number.isFinite(latN) ||
    Math.abs(lngN) > 180 || Math.abs(latN) > 90 ||
    (lngN === 0 && latN === 0)
  ) {
    return null;
  }
  return [lngN, latN];
}

/* ── Dedup key ──────────────────────────────────────────────────────────── */

/**
 * Latin/Arabic-normalised identity of a place name. Strips diacritics from
 * both scripts, folds alef/teh-marbuta/ya'a variants, drops punctuation and
 * the definite article so "Café Einstein", «مقهى أينشتاين» and «مقهى
 * اينشتاين» each hash to one key — that's what makes run-to-run dedup work.
 */
export function placeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // latin diacritics
    // Arabic diacritics + tatweel + the combining hamza NFD splits off أ إ آ ؤ ئ
    .replace(/[\u064b-\u0655\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\b(?:al|el)\b/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();
}

/* ── Model payload shapes (post-JSON-parse) ─────────────────────────────── */

export interface DiscoveryCandidate {
  name_en: string;
  name_ar: string | null;
  category: ScoutCategory;
  hint_ar: string | null;
}

/** Validates one discovery item; null when unusable (caller skips it). */
export function parseDiscoveryItem(raw: unknown): DiscoveryCandidate | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const nameEn = cleanText(o.name_en ?? o.nameEn, 160);
  if (!nameEn) return null;
  const nameAr = cleanText(o.name_ar ?? o.nameAr, 160);
  return {
    name_en: nameEn,
    name_ar: nameAr,
    category: isScoutCategory(o.category) ? o.category : 'other',
    hint_ar: cleanText(o.hint_ar ?? o.hintAr, 500),
  };
}

export interface DossierDraft {
  descriptionAr: string | null;
  atmosphereAr: string | null;
  tipsAr: string | null;
  bestMonths: number[];
  durationMinutes: number | null;
  priceLevel: number | null;
  vibe: ScoutVibe | null;
  signatureDish: string | null;
  photoQueryEn: string | null;
  coordinates: [number, number] | null;
  sources: string[];
}

export function parseDossier(raw: unknown, fallbackPhotoQuery: string): DossierDraft {
  const o = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const sourcesRaw = Array.isArray(o.sources) ? o.sources : [];
  const sources = [...new Set(sourcesRaw.map((s) => cleanText(s, 120)).filter((s): s is string => s !== null))].slice(0, 6);

  const coords = normalizeLngLat(o.coordinates);

  return {
    descriptionAr: cleanText(o.description_ar ?? o.descriptionAr),
    atmosphereAr: cleanText(o.atmosphere_ar ?? o.atmosphereAr),
    tipsAr: cleanText(o.tips_ar ?? o.tipsAr),
    bestMonths: normalizeBestMonths(o.best_months ?? o.bestMonths),
    durationMinutes: clampInt(o.duration_minutes ?? o.durationMinutes, 5, 24 * 60),
    priceLevel: clampInt(o.price_level ?? o.priceLevel, 0, 4),
    vibe: isScoutVibe(o.vibe) ? o.vibe : null,
    signatureDish: cleanText(o.signature_dish ?? o.signatureDish, 200),
    photoQueryEn: cleanText(o.photo_query_en ?? o.photoQueryEn, 200) ?? fallbackPhotoQuery,
    coordinates: coords,
    sources,
  };
}

/**
 * A dossier without a description cannot render. Returns false for those
 * instead of inserting a husk row the UI would have to apologise for.
 */
export function isFulfillable(draft: DossierDraft): boolean {
  return draft.descriptionAr !== null;
}

/* ── Prompts (single source of truth — edge function imports these) ──────── */

export function discoverySystemPrompt(): string {
  return [
    'أنت باحث جغرافي خبير يجمع أماكن استثنائية. ستتلقى مدينة أو دولة، ومطلوبك إخراج قائمة أماكن متنوعة الفئات',
    '(مطاعم مميزة، حدائق ومناطق طبيعية، مغامرات، معالم ثقافية وتاريخية، مقاهي، أسواق، نقاط إطلالة). القواعد:',
    '- كل مكان يجب أن يكون حقيقياً موجوداً فعلاً (لا اختراع).',
    '- نوّع: لا تكرر فئة واحدة أكثر من ثلث القائمة.',
    '- فضّل الأماكن المحلية المميزة على السياحية البحتة، لكن ضع أهم معلم سياحي إن كان ضرورياً.',
    `أخرج JSON فقط بالشكل: {"places":[{"name_en":"...","name_ar":"...","category":"one_of:${SCOUT_CATEGORIES.join('|')}","hint_ar":"سطر واحد لماذا مميزة"}]}`,
  ].join('\n');
}

export function dossierSystemPrompt(): string {
  return [
    'أنت كاتب أدلة سفر محلي دقيق. ستتلقى اسماً لمكان حقيقي ومدينته، ومهمتك كتابة ملف غني بالعربية الفصحى المبسطة بناءً على معرفتك (وسيُمنح بحث ويب عند توفره).',
    'اكتب الوصف بحيث يشعر القارئ بالمكان قبل أن يزوره. أخرج JSON فقط بالشكل:',
    '{"description_ar":"٣-٥ جمل","atmosphere_ar":"٢-٣ جمل عن الإحساس: الضوء والصوت والزحامة والروائح",',
    '"tips_ar":"نصائح عملية: أفضل وقت، الحجز، المواصلات، الفخاخ السياحية","best_months":[1..12],',
    `"duration_minutes":number,"price_level":0-4,"vibe":"one_of:${SCOUT_VIBES.join('|')}",`,
    '"signature_dish":"إن كانت مطعم/كافيه وإلا null","photo_query_en":"search phrase in English for a photo",',
    '"coordinates":{"lng":number,"lat":number} أو null إذا غير متأكد,"sources":["ويكيبيديا","الموقع الرسمي"...]}',
  ].join('');
}

export function scopeNoteFor(kind: 'city' | 'country', query: string, geoNameEn?: string | null): string {
  if (kind === 'country') {
    return `الدولة: ${query}. وزّع الأماكن على ٣-٥ مدن/مناطق مختلفة داخلها.`;
  }
  const suffix = geoNameEn ? ` (${geoNameEn})` : '';
  return `المدينة: ${query}${suffix}. ركّز على أحيائها وضواحيها القريبة.`;
}
