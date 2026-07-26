import type { Coordinates } from '../types';

/**
 * Place search and reverse lookup, backed by Nominatim (OpenStreetMap).
 *
 * Typing an address is the part of "save a place" people abandon, so the picker
 * searches instead of asking for numbers. Two rules from the Nominatim usage
 * policy shape this module: at most one request per second (callers debounce and
 * pass an AbortSignal) and results are never bulk-downloaded or re-published —
 * a lookup only ever fills one form.
 */

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 8000;

export interface GeocodeResult {
  /** Stable key for list rendering. */
  id: string;
  /** Short headline — the venue or street. */
  title: string;
  /** City · region · country. */
  subtitle: string;
  coordinates: Coordinates;
  city: string | null;
  isoCode: string | null;
  /** Full one-line address as returned upstream. */
  address: string;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

interface NominatimEntry {
  place_id?: number | string;
  osm_id?: number | string;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
}

/** Free-text search, optionally biased to one country. */
export async function searchPlaces(
  query: string,
  options: { signal?: AbortSignal; isoCode?: string | null; limit?: number } = {},
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(options.limit ?? 6),
    'accept-language': 'ar',
  });
  if (options.isoCode) params.set('countrycodes', options.isoCode.toLowerCase());

  const payload = await request(`${SEARCH_URL}?${params.toString()}`, options.signal);
  if (!Array.isArray(payload)) return [];
  return payload
    .map((entry) => toResult(entry as NominatimEntry))
    .filter((entry): entry is GeocodeResult => entry !== null);
}

/** What is at this point? Used to prefill city/address after a map pick. */
export async function reverseGeocode(
  [lng, lat]: Coordinates,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '16',
    'accept-language': 'ar',
  });

  const payload = await request(`${REVERSE_URL}?${params.toString()}`, signal);
  if (!payload || Array.isArray(payload)) return null;
  return toResult(payload as NominatimEntry);
}

async function request(url: string, signal?: AbortSignal): Promise<unknown> {
  // Nominatim can hang; a stuck request must not leave the picker spinning.
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(url, {
      signal: timeout.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`geocoding_failed_${response.status}`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function toResult(entry: NominatimEntry): GeocodeResult | null {
  const lat = Number(entry.lat);
  const lng = Number(entry.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const address = entry.address ?? {};
  const display = entry.display_name ?? '';
  const parts = display
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    null;

  const title = entry.name?.trim() || parts[0] || 'موقع';
  const subtitle = [city, address.state, address.country]
    .filter((part): part is string => Boolean(part) && part !== title)
    .join(' · ');

  return {
    id: String(entry.place_id ?? entry.osm_id ?? `${lat},${lng}`),
    title,
    subtitle: subtitle || parts.slice(1).join(' · '),
    coordinates: [lng, lat],
    city,
    isoCode: address.country_code ? address.country_code.toUpperCase() : null,
    address: display,
  };
}
