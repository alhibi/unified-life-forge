import { supabase as _supabase } from '@/integrations/supabase/client';

import {
  parseCountryBounds,
  parsePoint,
  type PlaceCategory,
  type PlacePhoto,
  type TravelCountry,
  type TravelPlace,
} from './types';
import type { CountryCatalogEntry } from './countriesCatalog';

// Travel Atlas tables are provisioned but not yet in the generated types.
const supabase = _supabase as unknown as any;
const PHOTOS_BUCKET = 'place-photos';
const SIGNED_URL_TTL = 60 * 60; // 1h

type CountryRow = any;
type PlaceRow = any;
type PhotoRow = any;
type PlaceWithPhotos = PlaceRow & { place_photos: PhotoRow[] | null };

const CATEGORIES = new Set<PlaceCategory>([
  'nature',
  'historic',
  'food',
  'city',
  'religious',
  'adventure',
  'other',
]);

function isMissingRelation(error: any): boolean {
  if (!error) return false;
  const code = error.code as string | undefined;
  const msg = (error.message ?? '') as string;
  return code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(msg);
}

export async function fetchTravelCountries(): Promise<TravelCountry[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, iso_code, name_ar, name_en, bounds, places_count, cover_image_url')
    .order('places_count', { ascending: false })
    .order('name_en', { ascending: true });

  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as CountryRow[]).map(mapCountry);
}

export async function fetchTravelCountry(countryId: string): Promise<TravelCountry> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, iso_code, name_ar, name_en, bounds, places_count, cover_image_url')
    .eq('id', countryId)
    .single();

  if (error) throw error;
  return mapCountry(data as CountryRow);
}

export async function fetchCountryPlaces(countryId: string): Promise<TravelPlace[]> {
  const { data, error } = await supabase
    .from('places')
    .select(
      `
      id,
      country_id,
      name_ar,
      name_en,
      category,
      location,
      description_ar,
      best_time_to_visit,
      tags,
      rating,
      cover_photo_url,
      place_photos (
        id,
        place_id,
        storage_path,
        sort_order,
        is_cover
      )
    `,
    )
    .eq('country_id', countryId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  const rows = (data ?? []) as PlaceWithPhotos[];
  const paths = new Set<string>();
  for (const row of rows) {
    if (row.cover_photo_url && !/^https?:\/\//i.test(row.cover_photo_url)) paths.add(row.cover_photo_url);
    for (const photo of (row.place_photos ?? []) as PhotoRow[]) {
      if (photo.storage_path && !/^https?:\/\//i.test(photo.storage_path)) paths.add(photo.storage_path);
    }
  }
  const signed = await signPaths([...paths]);
  return rows.map((row) => mapPlace(row, signed));
}

function mapCountry(row: CountryRow): TravelCountry {
  return {
    id: row.id,
    isoCode: row.iso_code,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    bounds: parseCountryBounds(row.bounds),
    placesCount: row.places_count,
    coverImageUrl: row.cover_image_url,
  };
}

function mapPlace(row: PlaceWithPhotos, signed: Map<string, string> = new Map()): TravelPlace {
  const photos = ((row.place_photos ?? []) as PhotoRow[])
    .map((r) => mapPhoto(r, signed))
    .sort((a: PlacePhoto, b: PlacePhoto) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder);
  const category = CATEGORIES.has(row.category as PlaceCategory)
    ? (row.category as PlaceCategory)
    : 'other';

  return {
    id: row.id,
    countryId: row.country_id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    category,
    coordinates: parsePoint(row.location),
    descriptionAr: row.description_ar,
    bestTimeToVisit: row.best_time_to_visit,
    tags: row.tags ?? [],
    rating: row.rating,
    coverPhotoUrl: resolvePhotoUrl(row.cover_photo_url, signed) ?? photos[0]?.url ?? null,
    photos,
  };
}

function mapPhoto(row: PhotoRow, signed: Map<string, string>): PlacePhoto {
  return {
    id: row.id,
    placeId: row.place_id,
    url: resolvePhotoUrl(row.storage_path, signed) ?? '',
    storagePath: row.storage_path,
    sortOrder: row.sort_order ?? 0,
    isCover: row.is_cover ?? false,
  };
}

function resolvePhotoUrl(value: string | null, signed: Map<string, string>): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return signed.get(value) ?? null;
}

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);
  if (error) return out;
  for (const entry of (data ?? []) as { path: string | null; signedUrl: string | null }[]) {
    if (entry.path && entry.signedUrl) out.set(entry.path, entry.signedUrl);
  }
  return out;
}

export interface CreatePlaceInput {
  country: CountryCatalogEntry;
  nameAr: string;
  nameEn?: string | null;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  descriptionAr?: string | null;
  bestTimeToVisit?: string | null;
  tags?: string[];
  photos?: File[];
}

/** Upsert a country row from the catalog and return its id. */
async function ensureCountry(entry: CountryCatalogEntry): Promise<string> {
  const { data: existing, error: selectErr } = await supabase
    .from('countries')
    .select('id')
    .eq('iso_code', entry.isoCode)
    .maybeSingle();
  if (selectErr && !isMissingRelation(selectErr)) throw selectErr;
  if (existing?.id) return existing.id as string;

  const { data: inserted, error: insertErr } = await supabase
    .from('countries')
    .insert({
      iso_code: entry.isoCode,
      name_ar: entry.nameAr,
      name_en: entry.nameEn,
      bounds: { sw: entry.bounds.sw, ne: entry.bounds.ne },
    })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  return inserted.id as string;
}

export async function createPlace(input: CreatePlaceInput): Promise<TravelPlace> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData?.user?.id as string | undefined;
  if (!userId) throw new Error('not_authenticated');

  const countryId = await ensureCountry(input.country);

  const { data, error } = await supabase
    .from('places')
    .insert({
      country_id: countryId,
      user_id: userId,
      name_ar: input.nameAr,
      name_en: input.nameEn ?? null,
      category: input.category,
      location: { type: 'Point', coordinates: [input.longitude, input.latitude] },
      description_ar: input.descriptionAr ?? null,
      best_time_to_visit: input.bestTimeToVisit ?? null,
      tags: input.tags ?? [],
    })
    .select(
      `id, country_id, name_ar, name_en, category, location, description_ar,
       best_time_to_visit, tags, rating, cover_photo_url,
       place_photos ( id, place_id, storage_path, sort_order, is_cover )`,
    )
    .single();
  if (error) throw error;
  const place = data as PlaceWithPhotos;

  if (input.photos && input.photos.length > 0) {
    await uploadPlacePhotos(place.id as string, userId, input.photos);
    // Refetch with photos + signed URLs.
    const { data: fresh } = await supabase
      .from('places')
      .select(
        `id, country_id, name_ar, name_en, category, location, description_ar,
         best_time_to_visit, tags, rating, cover_photo_url,
         place_photos ( id, place_id, storage_path, sort_order, is_cover )`,
      )
      .eq('id', place.id)
      .single();
    const row = (fresh ?? place) as PlaceWithPhotos;
    const paths = new Set<string>();
    if (row.cover_photo_url && !/^https?:\/\//i.test(row.cover_photo_url)) paths.add(row.cover_photo_url);
    for (const p of (row.place_photos ?? []) as PhotoRow[]) {
      if (p.storage_path && !/^https?:\/\//i.test(p.storage_path)) paths.add(p.storage_path);
    }
    const signed = await signPaths([...paths]);
    return mapPlace(row, signed);
  }

  return mapPlace(place);
}

async function uploadPlacePhotos(placeId: string, userId: string, files: File[]): Promise<void> {
  const rows: { place_id: string; storage_path: string; sort_order: number; is_cover: boolean }[] = [];
  let firstPath: string | null = null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${placeId}/${Date.now()}-${i}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    if (upErr) throw upErr;
    if (!firstPath) firstPath = path;
    rows.push({ place_id: placeId, storage_path: path, sort_order: i, is_cover: i === 0 });
  }
  if (rows.length > 0) {
    const { error: insertErr } = await supabase.from('place_photos').insert(rows);
    if (insertErr) throw insertErr;
  }
  if (firstPath) {
    await supabase.from('places').update({ cover_photo_url: firstPath }).eq('id', placeId);
  }
}
