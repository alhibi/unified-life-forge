import { supabase as _supabase } from '@/integrations/supabase/client';

import {
  parseCountryBounds,
  parsePoint,
  type PlaceCategory,
  type PlacePhoto,
  type TravelCountry,
  type TravelPlace,
} from './types';

// Travel Atlas tables are provisioned in Supabase but not yet in the generated
// types. Cast the client to `any` here so this module compiles until the
// generated types include `countries`, `places`, and `place_photos`.
const supabase = _supabase as unknown as any;

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
  return ((data ?? []) as PlaceWithPhotos[]).map(mapPlace);
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

function mapPlace(row: PlaceWithPhotos): TravelPlace {
  const photos = ((row.place_photos ?? []) as PhotoRow[])
    .map(mapPhoto)
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
    coverPhotoUrl: resolvePhotoUrl(row.cover_photo_url) ?? photos[0]?.url ?? null,
    photos,
  };
}

function mapPhoto(row: PhotoRow): PlacePhoto {
  return {
    id: row.id,
    placeId: row.place_id,
    url: resolvePhotoUrl(row.storage_path) ?? '',
    storagePath: row.storage_path,
    sortOrder: row.sort_order ?? 0,
    isCover: row.is_cover ?? false,
  };
}

function resolvePhotoUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return supabase.storage.from('place-photos').getPublicUrl(value).data.publicUrl;
}
