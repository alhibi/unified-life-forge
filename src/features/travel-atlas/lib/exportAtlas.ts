import { categoryMeta } from '../data/categories';
import type { TravelCountry, TravelPlace } from '../types';

/**
 * Export the atlas as GeoJSON.
 *
 * Someone who has spent years recording places must be able to take them
 * elsewhere — into QGIS, into Google My Maps, into a backup. GeoJSON is the
 * lingua franca for that, and writing it costs nothing because the data is
 * already in memory.
 */
export function placesToGeoJson(
  places: TravelPlace[],
  countries: TravelCountry[],
): {
  type: 'FeatureCollection';
  features: unknown[];
} {
  const countryNames = new Map(countries.map((country) => [country.id, country.nameAr]));

  return {
    type: 'FeatureCollection',
    features: places.map((place) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: place.coordinates },
      properties: {
        name: place.nameAr,
        name_en: place.nameEn,
        category: place.category,
        category_label: categoryMeta(place.category).label,
        country: countryNames.get(place.countryId) ?? null,
        city: place.city,
        address: place.address,
        description: place.descriptionAr,
        tips: place.tipsAr,
        best_time: place.bestTimeToVisit,
        best_months: place.bestMonths,
        visit_status: place.visitStatus,
        visited_on: place.visitedOn,
        rating: place.rating,
        price_level: place.priceLevel,
        duration_minutes: place.durationMinutes,
        favorite: place.isFavorite,
        tags: place.tags,
        photos: place.photos.map((photo) => photo.url),
        links: place.links.map((link) => ({ kind: link.kind, label: link.label, url: link.url })),
      },
    })),
  };
}

/** Triggers a download without leaving the page. */
export function downloadGeoJson(places: TravelPlace[], countries: TravelCountry[]): void {
  const payload = JSON.stringify(placesToGeoJson(places, countries), null, 2);
  const blob = new Blob([payload], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `amv-atlas-${new Date().toISOString().slice(0, 10)}.geojson`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
