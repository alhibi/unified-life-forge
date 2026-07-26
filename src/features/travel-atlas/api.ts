import { supabase as typedClient } from '@/integrations/supabase/client';

import { type AtlasCountry, atlasCountryCenter, findAtlasCountry } from './data/countryRegistry';
import { preparePlacePhoto } from './lib/photoPipeline';
import {
  type ChecklistCategory,
  type Coordinates,
  type CountryStamp,
  isChecklistCategory,
  isPlaceCategory,
  isPlaceLinkKind,
  isStampStatus,
  isTripStatus,
  isVisitStatus,
  normalizeBestMonths,
  parseCountryBounds,
  parsePoint,
  type PlaceCategory,
  type PlaceLink,
  type PlaceLinkKind,
  type PlacePhoto,
  type StampStatus,
  type TravelCountry,
  type TravelPlace,
  type Trip,
  type TripChecklistItem,
  type TripStop,
  type TripWithStops,
  type VisitStatus,
} from './types';

/**
 * The feature's single Supabase chokepoint. Nothing outside this file talks to
 * the database — hooks call these functions, components call hooks.
 *
 * The `countries` / `places` / `place_photos` / `place_links` / `trips` tables
 * are provisioned by migration but absent from the generated `Database` type, so
 * the client is widened once here and every row is narrowed back into an
 * explicit interface below. One escape hatch, not one per query.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = typedClient as any;

const PHOTOS_BUCKET = 'place-photos';

/**
 * The bucket is public, so photos use stable public URLs rather than signed
 * ones. Signed URLs expire in an hour, which silently broke every photo held in
 * the offline cache — exactly the case the cache exists for.
 */
function publicPhotoUrl(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const { data } = db.storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath);
  return (data?.publicUrl as string | undefined) ?? '';
}

// ── Row shapes ──────────────────────────────────────────────────────────────

interface CountryRow {
  id: string;
  iso_code: string;
  name_ar: string;
  name_en: string;
  bounds: unknown;
  places_count: number | null;
  cover_image_url: string | null;
}

interface PhotoRow {
  id: string;
  place_id: string;
  storage_path: string;
  sort_order: number | null;
  is_cover: boolean | null;
  caption_ar: string | null;
}

interface LinkRow {
  id: string;
  place_id: string;
  kind: string | null;
  label: string | null;
  url: string;
  sort_order: number | null;
}

interface PlaceRow {
  id: string;
  user_id: string | null;
  country_id: string;
  name_ar: string;
  name_en: string | null;
  category: string;
  location: unknown;
  city: string | null;
  address: string | null;
  description_ar: string | null;
  tips_ar: string | null;
  best_time_to_visit: string | null;
  best_months: number[] | null;
  visit_status: string | null;
  visited_on: string | null;
  price_level: number | null;
  duration_minutes: number | null;
  tags: string[] | null;
  rating: number | null;
  is_favorite: boolean | null;
  cover_photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  place_photos: PhotoRow[] | null;
  place_links: LinkRow[] | null;
}

interface TripRow {
  id: string;
  title: string;
  country_id: string | null;
  start_date: string | null;
  end_date: string | null;
  notes_ar: string | null;
  budget_amount: number | string | null;
  budget_currency: string | null;
  status: string | null;
  created_at: string | null;
  trip_places: TripStopRow[] | null;
  trip_checklist: TripChecklistRow[] | null;
}

interface TripStopRow {
  id: string;
  trip_id: string;
  place_id: string;
  day_index: number | null;
  sort_order: number | null;
  note_ar: string | null;
  start_time: string | null;
  duration_minutes: number | null;
}

interface TripChecklistRow {
  id: string;
  trip_id: string;
  label: string;
  category: string | null;
  is_done: boolean | null;
  sort_order: number | null;
}

interface CountryStampRow {
  id: string;
  iso_code: string;
  status: string | null;
  first_year: number | null;
  visit_count: number | null;
  note_ar: string | null;
}

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

const COUNTRY_COLUMNS = 'id, iso_code, name_ar, name_en, bounds, places_count, cover_image_url';

const PLACE_COLUMNS = `
  id, user_id, country_id, name_ar, name_en, category, location, city, address,
  description_ar, tips_ar, best_time_to_visit, best_months, visit_status,
  visited_on, price_level, duration_minutes, tags, rating, is_favorite,
  cover_photo_url, created_at, updated_at,
  place_photos ( id, place_id, storage_path, sort_order, is_cover, caption_ar ),
  place_links ( id, place_id, kind, label, url, sort_order )
`;

const TRIP_COLUMNS = `
  id, title, country_id, start_date, end_date, notes_ar, budget_amount,
  budget_currency, status, created_at,
  trip_places ( id, trip_id, place_id, day_index, sort_order, note_ar, start_time, duration_minutes ),
  trip_checklist ( id, trip_id, label, category, is_done, sort_order )
`;

const STAMP_COLUMNS = 'id, iso_code, status, first_year, visit_count, note_ar';

/**
 * A migration that has not been applied yet must degrade to "empty atlas", not
 * to a red error screen — the feature ships ahead of the deploy sometimes.
 */
function isMissingRelation(error: unknown): boolean {
  if (!error) return false;
  const { code, message } = error as PostgrestErrorLike;
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === '42703' ||
    /does not exist|schema cache/i.test(message ?? '')
  );
}

async function currentUserId(): Promise<string | null> {
  const { data } = await db.auth.getUser();
  return (data?.user?.id as string | undefined) ?? null;
}

async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new Error('not_authenticated');
  return userId;
}

// ── Mappers ─────────────────────────────────────────────────────────────────

function mapCountry(row: CountryRow): TravelCountry {
  return {
    id: row.id,
    isoCode: row.iso_code,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    bounds: parseCountryBounds(row.bounds as never),
    placesCount: row.places_count ?? 0,
    coverImageUrl: row.cover_image_url,
  };
}

function mapPhoto(row: PhotoRow): PlacePhoto {
  return {
    id: row.id,
    placeId: row.place_id,
    url: publicPhotoUrl(row.storage_path),
    storagePath: row.storage_path,
    sortOrder: row.sort_order ?? 0,
    isCover: row.is_cover ?? false,
    captionAr: row.caption_ar,
  };
}

function mapLink(row: LinkRow): PlaceLink {
  return {
    id: row.id,
    placeId: row.place_id,
    kind: isPlaceLinkKind(row.kind) ? row.kind : 'other',
    label: row.label,
    url: row.url,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapPlace(row: PlaceRow): TravelPlace {
  const photos = (row.place_photos ?? [])
    .map(mapPhoto)
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder);
  const links = (row.place_links ?? []).map(mapLink).sort((a, b) => a.sortOrder - b.sortOrder);
  const category: PlaceCategory = isPlaceCategory(row.category) ? row.category : 'other';
  const visitStatus: VisitStatus = isVisitStatus(row.visit_status) ? row.visit_status : 'wishlist';
  const cover = row.cover_photo_url ? publicPhotoUrl(row.cover_photo_url) : null;

  return {
    id: row.id,
    countryId: row.country_id,
    userId: row.user_id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    category,
    coordinates: parsePoint(row.location),
    city: row.city,
    address: row.address,
    descriptionAr: row.description_ar,
    tipsAr: row.tips_ar,
    bestTimeToVisit: row.best_time_to_visit,
    bestMonths: normalizeBestMonths(row.best_months),
    visitStatus,
    visitedOn: row.visited_on,
    priceLevel: row.price_level,
    durationMinutes: row.duration_minutes,
    tags: row.tags ?? [],
    rating: row.rating === null ? null : Number(row.rating),
    isFavorite: row.is_favorite ?? false,
    coverPhotoUrl: cover ?? photos[0]?.url ?? null,
    photos,
    links,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrip(row: TripRow): TripWithStops {
  return {
    id: row.id,
    title: row.title,
    countryId: row.country_id,
    startDate: row.start_date,
    endDate: row.end_date,
    notesAr: row.notes_ar,
    budgetAmount: row.budget_amount === null ? null : Number(row.budget_amount),
    budgetCurrency: row.budget_currency,
    status: isTripStatus(row.status) ? row.status : 'draft',
    createdAt: row.created_at,
    stops: (row.trip_places ?? [])
      .map(mapTripStop)
      // A stop with a clock time sorts by it; the rest keep their manual order
      // underneath, so a half-planned day still reads top to bottom.
      .sort(
        (a, b) =>
          a.dayIndex - b.dayIndex ||
          compareOptionalTime(a.startTime, b.startTime) ||
          a.sortOrder - b.sortOrder,
      ),
    checklist: (row.trip_checklist ?? [])
      .map(mapChecklistItem)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function compareOptionalTime(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

function mapTripStop(row: TripStopRow): TripStop {
  return {
    id: row.id,
    tripId: row.trip_id,
    placeId: row.place_id,
    dayIndex: row.day_index ?? 1,
    sortOrder: row.sort_order ?? 0,
    noteAr: row.note_ar,
    // Postgres returns `HH:MM:SS`; the UI only ever shows and edits `HH:MM`.
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    durationMinutes: row.duration_minutes,
  };
}

function mapChecklistItem(row: TripChecklistRow): TripChecklistItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    label: row.label,
    category: isChecklistCategory(row.category) ? row.category : 'other',
    isDone: row.is_done ?? false,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapCountryStamp(row: CountryStampRow): CountryStamp {
  return {
    id: row.id,
    isoCode: row.iso_code,
    status: isStampStatus(row.status) ? row.status : 'visited',
    firstYear: row.first_year,
    visitCount: row.visit_count ?? 1,
    noteAr: row.note_ar,
  };
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function fetchTravelCountries(): Promise<TravelCountry[]> {
  const { data, error } = await db
    .from('countries')
    .select(COUNTRY_COLUMNS)
    .order('name_ar', { ascending: true });

  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as CountryRow[]).map(mapCountry);
}

/**
 * The whole personal atlas in one request.
 *
 * A private travel journal is small — hundreds of rows, not millions — and every
 * surface in the feature (world map, country map, search, stats, trip planner)
 * needs to slice the same set. Fetching once and deriving locally makes those
 * screens instant and the offline cache trivially correct, instead of running
 * five overlapping queries that can disagree with each other.
 */
export async function fetchMyPlaces(): Promise<TravelPlace[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await db
    .from('places')
    .select(PLACE_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as PlaceRow[]).map(mapPlace);
}

/** Single place by id — used by shared links to a place the viewer does not own. */
export async function fetchPlaceById(placeId: string): Promise<TravelPlace | null> {
  const { data, error } = await db
    .from('places')
    .select(PLACE_COLUMNS)
    .eq('id', placeId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
  return data ? mapPlace(data as PlaceRow) : null;
}

export async function fetchPlacesByIds(ids: string[]): Promise<TravelPlace[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db.from('places').select(PLACE_COLUMNS).in('id', ids);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as PlaceRow[]).map(mapPlace);
}

/** PostGIS-indexed radius search — keeps "nearby" off the client's shoulders. */
export async function fetchNearbyPlaces(
  [longitude, latitude]: Coordinates,
  options: { excludeId?: string; radiusMeters?: number; limit?: number } = {},
): Promise<TravelPlace[]> {
  const { data, error } = await db.rpc('travel_places_nearby', {
    in_longitude: longitude,
    in_latitude: latitude,
    in_radius_m: options.radiusMeters ?? 80000,
    in_limit: options.limit ?? 8,
    in_exclude: options.excludeId ?? null,
  });

  if (error) {
    // The RPC is additive; an un-migrated database just shows no nearby list.
    if (isMissingRelation(error) || error.code === 'PGRST202') return [];
    throw error;
  }

  const rows = (data ?? []) as { id: string; distance_m: number }[];
  if (rows.length === 0) return [];
  const order = new Map(rows.map((row, index) => [row.id, index]));
  const places = await fetchPlacesByIds(rows.map((row) => row.id));
  return places.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function fetchTrips(): Promise<TripWithStops[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await db
    .from('trips')
    .select(TRIP_COLUMNS)
    .eq('user_id', userId)
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as TripRow[]).map(mapTrip);
}

export async function fetchCountryStamps(): Promise<CountryStamp[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await db
    .from('country_stamps')
    .select(STAMP_COLUMNS)
    .eq('user_id', userId);

  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as CountryStampRow[]).map(mapCountryStamp);
}

export interface StampFields {
  status: StampStatus;
  firstYear?: number | null;
  visitCount?: number;
  noteAr?: string | null;
}

/**
 * Stamps a country, or updates the existing stamp. Upsert on
 * `(user_id, iso_code)` so tapping the same country twice never creates a
 * duplicate row — the map has no concept of two stamps on one country.
 */
export async function setCountryStamp(isoCode: string, fields: StampFields): Promise<CountryStamp> {
  const userId = await requireUserId();
  const { data, error } = await db
    .from('country_stamps')
    .upsert(
      {
        user_id: userId,
        iso_code: isoCode.toUpperCase(),
        status: fields.status,
        first_year: fields.firstYear ?? null,
        visit_count: Math.max(0, Math.min(999, fields.visitCount ?? 1)),
        note_ar: emptyToNull(fields.noteAr),
      },
      { onConflict: 'user_id,iso_code' },
    )
    .select(STAMP_COLUMNS)
    .single();
  if (error) throw error;
  return mapCountryStamp(data as CountryStampRow);
}

export async function removeCountryStamp(isoCode: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await db
    .from('country_stamps')
    .delete()
    .eq('user_id', userId)
    .eq('iso_code', isoCode.toUpperCase());
  if (error) throw error;
}

// ── Country seeding ─────────────────────────────────────────────────────────

/**
 * Country rows are public reference data with no client write policy, so the
 * first place saved in a country creates its row. `center` is derived from the
 * country's bounds — v1 omitted it against a NOT NULL column, which is why
 * saving a place in a new country used to fail outright.
 */
async function ensureCountry(entry: AtlasCountry): Promise<string> {
  const { data: existing, error: selectError } = await db
    .from('countries')
    .select('id')
    .eq('iso_code', entry.isoCode)
    .maybeSingle();
  if (selectError && !isMissingRelation(selectError)) throw selectError;
  if (existing?.id) return existing.id as string;

  const [lng, lat] = atlasCountryCenter(entry);
  const { data: inserted, error: insertError } = await db
    .from('countries')
    .insert({
      iso_code: entry.isoCode,
      name_ar: entry.nameAr,
      name_en: entry.nameEn,
      continent: entry.continent,
      center: { type: 'Point', coordinates: [lng, lat] },
      bounds: { sw: entry.bounds.sw, ne: entry.bounds.ne },
    })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id as string;
}

// ── Writes ──────────────────────────────────────────────────────────────────

export interface PlaceLinkDraft {
  kind: PlaceLinkKind;
  label?: string | null;
  url: string;
}

export interface PlaceFields {
  nameAr: string;
  nameEn?: string | null;
  category: PlaceCategory;
  coordinates: Coordinates;
  city?: string | null;
  address?: string | null;
  descriptionAr?: string | null;
  tipsAr?: string | null;
  bestTimeToVisit?: string | null;
  bestMonths?: number[];
  visitStatus?: VisitStatus;
  visitedOn?: string | null;
  priceLevel?: number | null;
  durationMinutes?: number | null;
  tags?: string[];
  rating?: number | null;
  isFavorite?: boolean;
}

export interface CreatePlaceInput extends PlaceFields {
  /** Catalog entry, so the country row can be seeded on demand. */
  country: AtlasCountry;
  photos?: File[];
  links?: PlaceLinkDraft[];
}

export interface UpdatePlaceInput {
  id: string;
  fields: Partial<PlaceFields>;
  /** Move the place to another country (also reseeds that country row). */
  countryIso?: string | null;
  addedPhotos?: File[];
  removedPhotoIds?: string[];
  /** When present, replaces the whole link set. */
  links?: PlaceLinkDraft[];
}

/** Maps the domain draft onto column names, skipping untouched fields. */
function toPlaceColumns(fields: Partial<PlaceFields>): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if (fields.nameAr !== undefined) columns.name_ar = fields.nameAr.trim();
  if (fields.nameEn !== undefined) columns.name_en = emptyToNull(fields.nameEn);
  if (fields.category !== undefined) columns.category = fields.category;
  if (fields.coordinates !== undefined) {
    columns.location = { type: 'Point', coordinates: fields.coordinates };
  }
  if (fields.city !== undefined) columns.city = emptyToNull(fields.city);
  if (fields.address !== undefined) columns.address = emptyToNull(fields.address);
  if (fields.descriptionAr !== undefined)
    columns.description_ar = emptyToNull(fields.descriptionAr);
  if (fields.tipsAr !== undefined) columns.tips_ar = emptyToNull(fields.tipsAr);
  if (fields.bestTimeToVisit !== undefined) {
    columns.best_time_to_visit = emptyToNull(fields.bestTimeToVisit);
  }
  if (fields.bestMonths !== undefined) columns.best_months = normalizeBestMonths(fields.bestMonths);
  if (fields.visitStatus !== undefined) columns.visit_status = fields.visitStatus;
  if (fields.visitedOn !== undefined) columns.visited_on = emptyToNull(fields.visitedOn);
  if (fields.priceLevel !== undefined) columns.price_level = fields.priceLevel;
  if (fields.durationMinutes !== undefined) columns.duration_minutes = fields.durationMinutes;
  if (fields.tags !== undefined) columns.tags = cleanTags(fields.tags);
  if (fields.rating !== undefined) columns.rating = fields.rating;
  if (fields.isFavorite !== undefined) columns.is_favorite = fields.isFavorite;
  return columns;
}

export async function createPlace(input: CreatePlaceInput): Promise<TravelPlace> {
  const userId = await requireUserId();
  const countryId = await ensureCountry(input.country);

  const { data, error } = await db
    .from('places')
    .insert({
      ...toPlaceColumns(input),
      country_id: countryId,
      user_id: userId,
    })
    .select('id')
    .single();
  if (error) throw error;
  const placeId = data.id as string;

  if (input.photos?.length) await uploadPhotos(placeId, userId, input.photos, 0);
  if (input.links?.length) await writeLinks(placeId, input.links);

  return (await fetchPlaceById(placeId)) ?? (await requirePlace(placeId));
}

export async function updatePlace(input: UpdatePlaceInput): Promise<TravelPlace> {
  const userId = await requireUserId();
  const columns = toPlaceColumns(input.fields);

  if (input.countryIso) {
    const entry = findAtlasCountry(input.countryIso);
    if (entry) columns.country_id = await ensureCountry(entry);
  }

  if (Object.keys(columns).length > 0) {
    const { error } = await db.from('places').update(columns).eq('id', input.id);
    if (error) throw error;
  }

  if (input.removedPhotoIds?.length) {
    await removePhotos(input.id, input.removedPhotoIds);
  }

  if (input.addedPhotos?.length) {
    const { count } = await db
      .from('place_photos')
      .select('id', { count: 'exact', head: true })
      .eq('place_id', input.id);
    await uploadPhotos(input.id, userId, input.addedPhotos, (count as number | null) ?? 0);
  }

  if (input.links) await writeLinks(input.id, input.links);

  await syncCoverPhoto(input.id);
  return (await fetchPlaceById(input.id)) ?? (await requirePlace(input.id));
}

export async function deletePlace(placeId: string): Promise<void> {
  // Remove the objects first: the photo rows cascade with the place, and once
  // they are gone there is nothing left pointing at the storage paths.
  const { data } = await db.from('place_photos').select('storage_path').eq('place_id', placeId);
  const paths = ((data ?? []) as { storage_path: string }[]).map((row) => row.storage_path);
  if (paths.length > 0) {
    await db.storage.from(PHOTOS_BUCKET).remove(paths);
  }
  const { error } = await db.from('places').delete().eq('id', placeId);
  if (error) throw error;
}

export async function setPlaceVisitStatus(
  placeId: string,
  visitStatus: VisitStatus,
): Promise<TravelPlace> {
  const place = await updatePlace({
    id: placeId,
    fields: {
      visitStatus,
      // Marking a place visited without a date leaves the passport unable to
      // place it on a timeline, so today is filled in as the sensible default.
      ...(visitStatus === 'visited' ? { visitedOn: todayIso() } : {}),
    },
  });

  if (visitStatus === 'visited') await stampCountryOf(place);
  return place;
}

/**
 * Marking a place visited implies the country was visited.
 *
 * Otherwise the two halves of the record contradict each other: a traveller
 * ticks off a café in Tbilisi and the country map still shows Georgia blank,
 * waiting to be stamped by hand. `ignoreDuplicates` is the important part — an
 * existing stamp is never touched, so a "lived here" stamp, its year, its visit
 * count and its note all survive.
 */
async function stampCountryOf(place: TravelPlace): Promise<void> {
  try {
    const { data: country } = await db
      .from('countries')
      .select('iso_code')
      .eq('id', place.countryId)
      .maybeSingle();
    const isoCode = country?.iso_code as string | undefined;
    if (!isoCode) return;

    await db.from('country_stamps').upsert(
      {
        user_id: place.userId,
        iso_code: isoCode.toUpperCase(),
        status: 'visited',
        first_year: place.visitedOn ? Number(place.visitedOn.slice(0, 4)) : null,
        visit_count: 1,
      },
      { onConflict: 'user_id,iso_code', ignoreDuplicates: true },
    );
  } catch (error) {
    // A convenience, not a requirement: the place is already saved, and the
    // stamps table may not exist yet on an un-migrated database.
    if (!isMissingRelation(error)) {
      console.warn('[TravelAtlas] could not stamp the country automatically', error);
    }
  }
}

export async function setPlaceFavorite(placeId: string, isFavorite: boolean): Promise<TravelPlace> {
  return updatePlace({ id: placeId, fields: { isFavorite } });
}

export async function setPlaceRating(placeId: string, rating: number | null): Promise<TravelPlace> {
  return updatePlace({ id: placeId, fields: { rating } });
}

export async function setCoverPhoto(placeId: string, photoId: string): Promise<TravelPlace> {
  const { data, error } = await db
    .from('place_photos')
    .select('id, storage_path')
    .eq('place_id', placeId);
  if (error) throw error;

  const rows = (data ?? []) as { id: string; storage_path: string }[];
  const target = rows.find((row) => row.id === photoId);
  if (!target) throw new Error('photo_not_found');

  await Promise.all(
    rows.map((row) =>
      db
        .from('place_photos')
        .update({ is_cover: row.id === photoId })
        .eq('id', row.id),
    ),
  );
  const { error: updateError } = await db
    .from('places')
    .update({ cover_photo_url: target.storage_path })
    .eq('id', placeId);
  if (updateError) throw updateError;

  return (await fetchPlaceById(placeId)) ?? (await requirePlace(placeId));
}

export async function updatePhotoCaption(photoId: string, captionAr: string | null): Promise<void> {
  const { error } = await db
    .from('place_photos')
    .update({ caption_ar: emptyToNull(captionAr) })
    .eq('id', photoId);
  if (error) throw error;
}

// ── Trips ───────────────────────────────────────────────────────────────────

export interface TripFields {
  title: string;
  countryId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notesAr?: string | null;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
  status?: Trip['status'];
}

function toTripColumns(fields: Partial<TripFields>): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if (fields.title !== undefined) columns.title = fields.title.trim();
  if (fields.countryId !== undefined) columns.country_id = fields.countryId;
  if (fields.startDate !== undefined) columns.start_date = emptyToNull(fields.startDate);
  if (fields.endDate !== undefined) columns.end_date = emptyToNull(fields.endDate);
  if (fields.notesAr !== undefined) columns.notes_ar = emptyToNull(fields.notesAr);
  if (fields.budgetAmount !== undefined) columns.budget_amount = fields.budgetAmount;
  if (fields.budgetCurrency !== undefined) {
    columns.budget_currency = emptyToNull(fields.budgetCurrency);
  }
  if (fields.status !== undefined) columns.status = fields.status;
  return columns;
}

export async function createTrip(fields: TripFields): Promise<TripWithStops> {
  const userId = await requireUserId();
  const { data, error } = await db
    .from('trips')
    .insert({ ...toTripColumns(fields), user_id: userId })
    .select(TRIP_COLUMNS)
    .single();
  if (error) throw error;
  return mapTrip(data as TripRow);
}

export async function updateTrip(
  tripId: string,
  fields: Partial<TripFields>,
): Promise<TripWithStops> {
  const { data, error } = await db
    .from('trips')
    .update(toTripColumns(fields))
    .eq('id', tripId)
    .select(TRIP_COLUMNS)
    .single();
  if (error) throw error;
  return mapTrip(data as TripRow);
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await db.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function addTripStop(tripId: string, placeId: string, dayIndex = 1): Promise<void> {
  const { data } = await db
    .from('trip_places')
    .select('sort_order')
    .eq('trip_id', tripId)
    .eq('day_index', dayIndex)
    .order('sort_order', { ascending: false })
    .limit(1);
  const last = ((data ?? []) as { sort_order: number | null }[])[0]?.sort_order ?? -1;

  const { error } = await db.from('trip_places').insert({
    trip_id: tripId,
    place_id: placeId,
    day_index: dayIndex,
    sort_order: last + 1,
  });
  // Adding a place twice is a no-op, not an error the user should see.
  if (error && error.code !== '23505') throw error;
}

export async function removeTripStop(stopId: string): Promise<void> {
  const { error } = await db.from('trip_places').delete().eq('id', stopId);
  if (error) throw error;
}

/** Persists a re-ordered (and possibly re-dayed) list of stops in one pass. */
export async function saveTripStopOrder(
  stops: { id: string; dayIndex: number; sortOrder: number }[],
): Promise<void> {
  await Promise.all(
    stops.map((stop) =>
      db
        .from('trip_places')
        .update({ day_index: stop.dayIndex, sort_order: stop.sortOrder })
        .eq('id', stop.id),
    ),
  );
}

export interface TripStopFields {
  noteAr?: string | null;
  /** `HH:MM`, or null to clear the clock time. */
  startTime?: string | null;
  durationMinutes?: number | null;
}

export async function updateTripStop(stopId: string, fields: TripStopFields): Promise<void> {
  const columns: Record<string, unknown> = {};
  if (fields.noteAr !== undefined) columns.note_ar = emptyToNull(fields.noteAr);
  if (fields.startTime !== undefined) {
    columns.start_time = fields.startTime ? `${fields.startTime}:00` : null;
  }
  if (fields.durationMinutes !== undefined) columns.duration_minutes = fields.durationMinutes;
  if (Object.keys(columns).length === 0) return;

  const { error } = await db.from('trip_places').update(columns).eq('id', stopId);
  if (error) throw error;
}

// ── Packing checklist ───────────────────────────────────────────────────────

export async function addChecklistItems(
  tripId: string,
  items: { label: string; category: ChecklistCategory }[],
): Promise<void> {
  const rows = items
    .map((item, index) => ({
      trip_id: tripId,
      label: item.label.trim(),
      category: item.category,
      sort_order: (Date.now() % 100000) + index,
    }))
    .filter((row) => row.label.length > 0);
  if (rows.length === 0) return;

  const { error } = await db.from('trip_checklist').insert(rows);
  if (error) throw error;
}

export async function setChecklistItemDone(itemId: string, isDone: boolean): Promise<void> {
  const { error } = await db.from('trip_checklist').update({ is_done: isDone }).eq('id', itemId);
  if (error) throw error;
}

export async function removeChecklistItem(itemId: string): Promise<void> {
  const { error } = await db.from('trip_checklist').delete().eq('id', itemId);
  if (error) throw error;
}

// ── Photo plumbing ──────────────────────────────────────────────────────────

async function uploadPhotos(
  placeId: string,
  userId: string,
  files: File[],
  startOrder: number,
): Promise<void> {
  const rows: {
    place_id: string;
    storage_path: string;
    sort_order: number;
    is_cover: boolean;
  }[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const prepared = await preparePlacePhoto(files[index]);
    const extension = extensionFor(prepared);
    // Owner-scoped path — this is what the storage policy checks.
    const path = `${userId}/${placeId}/${Date.now()}-${index}.${extension}`;
    const { error } = await db.storage
      .from(PHOTOS_BUCKET)
      .upload(path, prepared, { contentType: prepared.type || 'image/jpeg', upsert: false });
    if (error) throw error;
    rows.push({
      place_id: placeId,
      storage_path: path,
      sort_order: startOrder + index,
      is_cover: false,
    });
  }

  if (rows.length > 0) {
    const { error } = await db.from('place_photos').insert(rows);
    if (error) throw error;
  }
  await syncCoverPhoto(placeId);
}

async function removePhotos(placeId: string, photoIds: string[]): Promise<void> {
  const { data, error } = await db
    .from('place_photos')
    .select('id, storage_path')
    .eq('place_id', placeId)
    .in('id', photoIds);
  if (error) throw error;

  const rows = (data ?? []) as { id: string; storage_path: string }[];
  if (rows.length === 0) return;

  const { error: deleteError } = await db
    .from('place_photos')
    .delete()
    .in(
      'id',
      rows.map((row) => row.id),
    );
  if (deleteError) throw deleteError;

  await db.storage.from(PHOTOS_BUCKET).remove(rows.map((row) => row.storage_path));
}

/**
 * Keeps `places.cover_photo_url` pointing at a photo that still exists — the
 * cover used to dangle after its file was deleted, leaving a broken image on
 * the map marker.
 */
async function syncCoverPhoto(placeId: string): Promise<void> {
  const [{ data: photoData }, { data: placeData }] = await Promise.all([
    db
      .from('place_photos')
      .select('id, storage_path, is_cover, sort_order')
      .eq('place_id', placeId)
      .order('sort_order', { ascending: true }),
    db.from('places').select('cover_photo_url').eq('id', placeId).maybeSingle(),
  ]);

  const photos = (photoData ?? []) as {
    id: string;
    storage_path: string;
    is_cover: boolean | null;
  }[];
  const current = (placeData?.cover_photo_url as string | null) ?? null;

  if (photos.length === 0) {
    if (current !== null) {
      await db.from('places').update({ cover_photo_url: null }).eq('id', placeId);
    }
    return;
  }

  const stillValid = current && photos.some((photo) => photo.storage_path === current);
  if (stillValid) return;

  const next = photos.find((photo) => photo.is_cover) ?? photos[0];
  await db.from('places').update({ cover_photo_url: next.storage_path }).eq('id', placeId);
  await db.from('place_photos').update({ is_cover: true }).eq('id', next.id);
}

async function writeLinks(placeId: string, links: PlaceLinkDraft[]): Promise<void> {
  const { error: deleteError } = await db.from('place_links').delete().eq('place_id', placeId);
  if (deleteError) throw deleteError;

  const rows = links
    .map((link, index) => ({
      place_id: placeId,
      kind: link.kind,
      label: emptyToNull(link.label),
      url: link.url.trim(),
      sort_order: index,
    }))
    .filter((row) => /^https?:\/\/.+/i.test(row.url));

  if (rows.length === 0) return;
  const { error } = await db.from('place_links').insert(rows);
  if (error) throw error;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function requirePlace(placeId: string): Promise<TravelPlace> {
  const place = await fetchPlaceById(placeId);
  if (!place) throw new Error('place_not_found');
  return place;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function cleanTags(tags: string[]): string[] {
  const unique = new Set<string>();
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed.length > 0 && trimmed.length <= 32) unique.add(trimmed);
  }
  return [...unique].slice(0, 12);
}

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
