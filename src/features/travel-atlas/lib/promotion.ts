/**
 * Dossier → atlas place promotion.
 *
 * The one place where AI-scouted content becomes first-class user data.
 * Extracted pure so the vocabulary guard is testable: a scout category that
 * isn't in the atlas vocabulary used to be cast blindly and blow up inside
 * Supabase at insert time — now it folds to 'other' by construction.
 *
 * `ScoutPlace` satisfies `DossierLike` structurally; keeping the input
 * structural means these functions stay import-free of the API/client graph.
 */
import type { CreatePlaceInput } from '../api';
import { PLACE_CATEGORIES, type PlaceCategory } from '../types';
import { isScoutCategory } from './scoutPipeline';

/** Everything promotion reads off a dossier — no more, no less. */
export interface DossierLike {
  nameAr: string | null;
  nameEn: string;
  category: string;
  coordinates: { lng: number; lat: number } | null;
  city: string | null;
  addressLine: string | null;
  descriptionAr: string;
  atmosphereAr: string | null;
  tipsAr: string | null;
  signatureDish: string | null;
  bestMonths: number[];
  priceLevel: number | null;
  durationMinutes: number | null;
  vibe: string | null;
}

/** Scout vibe → Arabic tag. Unknown vibes are dropped, never leaked raw. */
export const SCOUT_VIBE_LABELS: Record<string, string> = {
  nature: 'طبيعة',
  food: 'مذاق',
  adventure: 'مغامرة',
  culture: 'ثقافة',
  nightlife: 'سهر',
  family: 'عائلي',
  budget: 'اقتصادي',
  luxury: 'فخامة',
};

/**
 * Folds any string onto the atlas category vocabulary. The DB enforces the
 * same 16-value CHECK that `PLACE_CATEGORIES` mirrors — this makes the
 * failure mode impossible instead of merely handled.
 */
export function safeCategory(category: string): PlaceCategory {
  return isScoutCategory(category) && (PLACE_CATEGORIES as readonly string[]).includes(category)
    ? (category as PlaceCategory)
    : 'other';
}

/** A dossier must carry coordinates AND a description to become a place. */
export function canPromoteDossier(d: DossierLike): boolean {
  return (
    d.coordinates !== null &&
    Number.isFinite(d.coordinates.lng) &&
    Number.isFinite(d.coordinates.lat) &&
    d.descriptionAr.trim().length > 0
  );
}

/**
 * Builds the full createPlace payload from a promotable dossier.
 * Coordinates arrive already narrowed — callers gate on canPromoteDossier.
 */
export function dossierToPlaceFields(
  d: DossierLike & { coordinates: { lng: number; lat: number } },
): Omit<CreatePlaceInput, 'country'> {
  const descriptionParts = [
    d.descriptionAr,
    d.atmosphereAr ? `الأجواء: ${d.atmosphereAr}` : null,
    d.tipsAr ? `نصائح: ${d.tipsAr}` : null,
    d.signatureDish ? `طبق مميز: ${d.signatureDish}` : null,
  ].filter((part): part is string => part !== null);

  const vibeLabel = d.vibe ? SCOUT_VIBE_LABELS[d.vibe] : undefined;

  return {
    nameAr: d.nameAr || d.nameEn,
    nameEn: d.nameEn,
    category: safeCategory(d.category),
    // GeoJSON order — [lng, lat], matching every other place in the atlas.
    coordinates: [d.coordinates.lng, d.coordinates.lat],
    city: d.city,
    address: d.addressLine,
    descriptionAr: descriptionParts.join('\n\n'),
    bestMonths: [...d.bestMonths],
    visitStatus: 'wishlist' as const,
    priceLevel: d.priceLevel,
    durationMinutes: d.durationMinutes,
    tags: ['استكشاف ذكي', ...(vibeLabel ? [vibeLabel] : [])],
  };
}
