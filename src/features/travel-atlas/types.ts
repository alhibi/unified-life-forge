import type { Json } from '@/integrations/supabase/types';

export type PlaceCategory =
  'nature' | 'historic' | 'food' | 'city' | 'religious' | 'adventure' | 'other';

export type Coordinates = [longitude: number, latitude: number];

export interface CountryBounds {
  sw: Coordinates;
  ne: Coordinates;
}

export interface TravelCountry {
  id: string;
  isoCode: string;
  nameAr: string;
  nameEn: string;
  bounds: CountryBounds;
  placesCount: number;
  coverImageUrl: string | null;
}

export interface PlacePhoto {
  id: string;
  placeId: string;
  url: string;
  storagePath: string;
  sortOrder: number;
  isCover: boolean;
}

export interface TravelPlace {
  id: string;
  countryId: string;
  nameAr: string;
  nameEn: string | null;
  category: PlaceCategory;
  coordinates: Coordinates;
  descriptionAr: string | null;
  bestTimeToVisit: string | null;
  tags: string[];
  rating: number | null;
  coverPhotoUrl: string | null;
  photos: PlacePhoto[];
}

export interface TravelMapRouteState {
  country?: TravelCountry;
}

export function parseCountryBounds(value: Json): CountryBounds {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid country bounds');
  }

  const sw = value.sw;
  const ne = value.ne;
  if (!isCoordinates(sw) || !isCoordinates(ne)) {
    throw new Error('Invalid country bounds');
  }

  return { sw, ne };
}

export function parsePoint(value: unknown): Coordinates {
  if (value && typeof value === 'object' && 'coordinates' in value) {
    const coordinates = (value as { coordinates?: unknown }).coordinates;
    if (isCoordinates(coordinates)) return coordinates;
  }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'coordinates' in parsed) {
        const coordinates = (parsed as { coordinates?: unknown }).coordinates;
        if (isCoordinates(coordinates)) return coordinates;
      }
    } catch {
      const match = value.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
      if (match) return [Number(match[1]), Number(match[2])];
    }
  }

  throw new Error('Invalid place location');
}

function isCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  );
}
