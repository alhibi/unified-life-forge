// ============================================================================
// CitySearch — types shared between the geocoder service and the UI.
//
// The shape is intentionally close to what Open-Meteo returns, with two
// additions that make the UI more useful:
//
//   • matchScore (0..1) — how confident we are this is a real match for
//     the user's query. 1 = exact prefix; 0.5 = contains; lower = fuzzy.
//     Used to sort and colour-grade results.
//   • distanceKm — how far this city is from the user's current location.
//     Used to sort "Nearby" suggestions and to display a distance chip.
//
// FUTURE-PROOF FIELDS
//   • population (when available) — let the user prefer big cities.
//   • tz — IANA timezone string, useful for sunrise/sunset display.
// ============================================================================

export type CitySource = 'open-meteo' | 'nominatim' | 'local' | 'manual';

export interface CityCandidate {
  /** Stable id: Open-Meteo returns numeric, Nominatim returns osm_id. */
  id: string;
  /** Canonical city name, Arabic if available. */
  name: string;
  /** Localized Arabic variant — used as the primary display string. */
  nameAr?: string;
  /** Country name in English (Open-Meteo convention). */
  country: string;
  /** Country Arabic name when known. */
  countryAr?: string;
  /** 2-letter country code for the flag emoji. */
  countryCode?: string;
  /** Admin level 1 (state / governorate / wilaya). */
  admin1?: string;
  admin1Ar?: string;
  latitude: number;
  longitude: number;
  /** Elevation in metres. Open-Meteo provides this directly. */
  elevation?: number;
  /** Population if known — favours big cities in default sort. */
  population?: number;
  /** IANA timezone — eg "Africa/Cairo". */
  timezone?: string;
  /** Which provider produced this candidate. */
  source: CitySource;
  /** 0..1 confidence that this matches the user's query. */
  matchScore: number;
  /** Distance from user's current location in km. null = unknown. */
  distanceKm: number | null;
}

/** The user's view: a group of candidates plus the query that produced them. */
export interface CitySearchState {
  query: string;
  candidates: CityCandidate[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  /** ms since the user last typed — used to debounce fetches. */
  lastTypedAt: number;
}

/** Stored favourite — saved to localStorage.
 *
 *  `id` accepts both numbers (legacy Open-Meteo rows) and strings (new
 *  multi-source rows that include `osm-...` ids from Nominatim). Storage
 *  code should coerce to string on read so both shapes round-trip safely.
 */
export interface StoredCity extends Pick<CityCandidate, 'name' | 'nameAr' | 'country' | 'countryCode' | 'admin1' | 'latitude' | 'longitude' | 'elevation' | 'timezone'> {
  id: string | number;
}

export interface NearbyRequest {
  lat: number;
  lng: number;
  radiusKm: number;
  limit?: number;
}