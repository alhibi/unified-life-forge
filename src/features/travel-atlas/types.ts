import type { Json } from '@/integrations/supabase/types';

/**
 * Travel Atlas domain model.
 *
 * Coordinates are ALWAYS `[longitude, latitude]` — GeoJSON order, which is what
 * PostGIS returns and what MapLibre expects. The only place the pair is flipped
 * is a user-facing latitude/longitude field, and those conversions live in the
 * form component that owns them.
 */

export const PLACE_CATEGORIES = [
  'nature',
  'beach',
  'viewpoint',
  'historic',
  'museum',
  'religious',
  'food',
  'cafe',
  'market',
  'city',
  'park',
  'adventure',
  'stay',
  'culture',
  'transport',
  'other',
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

/** Where a place sits in the traveller's own funnel. */
export const VISIT_STATUSES = ['wishlist', 'planned', 'visited'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const PLACE_LINK_KINDS = [
  'website',
  'maps',
  'video',
  'article',
  'booking',
  'social',
  'other',
] as const;
export type PlaceLinkKind = (typeof PLACE_LINK_KINDS)[number];

export const TRIP_STATUSES = ['draft', 'planned', 'active', 'done'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

/** A whole country, stamped — independent of whether any place inside it is saved. */
export const STAMP_STATUSES = ['visited', 'wishlist', 'lived'] as const;
export type StampStatus = (typeof STAMP_STATUSES)[number];

export const CHECKLIST_CATEGORIES = [
  'documents',
  'clothes',
  'gear',
  'health',
  'money',
  'other',
] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

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
  captionAr: string | null;
}

export interface PlaceLink {
  id: string;
  placeId: string;
  kind: PlaceLinkKind;
  label: string | null;
  url: string;
  sortOrder: number;
}

export interface TravelPlace {
  id: string;
  countryId: string;
  /** Null for places restored from an offline cache written before auth. */
  userId: string | null;
  nameAr: string;
  nameEn: string | null;
  category: PlaceCategory;
  coordinates: Coordinates;
  city: string | null;
  address: string | null;
  descriptionAr: string | null;
  tipsAr: string | null;
  bestTimeToVisit: string | null;
  /** Calendar month numbers (1–12) worth travelling for. */
  bestMonths: number[];
  visitStatus: VisitStatus;
  visitedOn: string | null;
  /** 0 = free … 4 = very expensive. */
  priceLevel: number | null;
  durationMinutes: number | null;
  tags: string[];
  rating: number | null;
  isFavorite: boolean;
  coverPhotoUrl: string | null;
  photos: PlacePhoto[];
  links: PlaceLink[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Trip {
  id: string;
  title: string;
  countryId: string | null;
  startDate: string | null;
  endDate: string | null;
  notesAr: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  status: TripStatus;
  createdAt: string | null;
}

export interface TripStop {
  id: string;
  tripId: string;
  placeId: string;
  dayIndex: number;
  sortOrder: number;
  noteAr: string | null;
  /** `HH:MM` — when this stop is meant to happen. */
  startTime: string | null;
  durationMinutes: number | null;
}

export interface TripChecklistItem {
  id: string;
  tripId: string;
  label: string;
  category: ChecklistCategory;
  isDone: boolean;
  sortOrder: number;
}

export interface TripWithStops extends Trip {
  stops: TripStop[];
  checklist: TripChecklistItem[];
}

export interface CountryStamp {
  id: string;
  isoCode: string;
  status: StampStatus;
  firstYear: number | null;
  visitCount: number;
  noteAr: string | null;
}

export interface NearbyPlace {
  id: string;
  distanceMeters: number;
}

export interface TravelMapRouteState {
  country?: TravelCountry;
  place?: TravelPlace;
}

// ── Parsers ─────────────────────────────────────────────────────────────────

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

export function isPlaceCategory(value: unknown): value is PlaceCategory {
  return typeof value === 'string' && (PLACE_CATEGORIES as readonly string[]).includes(value);
}

export function isVisitStatus(value: unknown): value is VisitStatus {
  return typeof value === 'string' && (VISIT_STATUSES as readonly string[]).includes(value);
}

export function isPlaceLinkKind(value: unknown): value is PlaceLinkKind {
  return typeof value === 'string' && (PLACE_LINK_KINDS as readonly string[]).includes(value);
}

export function isTripStatus(value: unknown): value is TripStatus {
  return typeof value === 'string' && (TRIP_STATUSES as readonly string[]).includes(value);
}

export function isStampStatus(value: unknown): value is StampStatus {
  return typeof value === 'string' && (STAMP_STATUSES as readonly string[]).includes(value);
}

export function isChecklistCategory(value: unknown): value is ChecklistCategory {
  return typeof value === 'string' && (CHECKLIST_CATEGORIES as readonly string[]).includes(value);
}

/** Month numbers, de-duplicated, sorted, and clamped to the calendar. */
export function normalizeBestMonths(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const months = new Set<number>();
  for (const entry of value) {
    const month = Number(entry);
    if (Number.isInteger(month) && month >= 1 && month <= 12) months.add(month);
  }
  return [...months].sort((a, b) => a - b);
}

function isCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  );
}
