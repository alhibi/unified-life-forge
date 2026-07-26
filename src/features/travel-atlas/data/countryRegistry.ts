import type { Coordinates, CountryBounds } from '../types';
import {
  type Continent,
  CONTINENTS,
  COUNTRY_CATALOG,
  type CountryCatalogEntry,
} from './countriesCatalog';
import { WORLD_COUNTRIES } from './worldCountries.generated';

/**
 * Every country a place can be saved in.
 *
 * There were two lists and only one of them was reachable: the curated catalog
 * (78 entries, hand-written Arabic names and regions tuned for this audience)
 * fed the place form, so saving a place in Rwanda or Uruguay was simply
 * impossible — the country was not on the list. Meanwhile the dotted stamp map
 * knew all 178.
 *
 * This merges them, curated-wins: where a country appears in both, its
 * hand-written name and its region (الخليج / المشرق / شمال أفريقيا rather than a
 * flat "Asia") are kept. Everything else comes from the generated Natural Earth
 * module, including its own Arabic name and a real bounding box.
 */

export interface AtlasCountry {
  isoCode: string;
  nameAr: string;
  nameEn: string;
  continent: Continent;
  bounds: CountryBounds;
  /** True when the entry comes from the hand-written catalog. */
  isCurated: boolean;
}

/** Natural Earth's flat continents mapped onto the app's regions. */
const REGION_BY_CONTINENT: Record<string, Continent> = {
  Europe: 'europe',
  Asia: 'asia',
  Africa: 'africa',
  'North America': 'americas',
  'South America': 'americas',
  Oceania: 'oceania',
  // Natural Earth files Antarctica and the open ocean as continents too; there
  // is nowhere better for them than the region the app already shows last.
  Antarctica: 'oceania',
  'Seven seas (open ocean)': 'oceania',
};

function toAtlasCountry(curated: CountryCatalogEntry): AtlasCountry {
  return {
    isoCode: curated.isoCode,
    nameAr: curated.nameAr,
    nameEn: curated.nameEn,
    continent: curated.continent,
    bounds: curated.bounds,
    isCurated: true,
  };
}

const CURATED_BY_ISO = new Map(COUNTRY_CATALOG.map((entry) => [entry.isoCode, entry]));

export const ATLAS_COUNTRIES: readonly AtlasCountry[] = (() => {
  const merged = new Map<string, AtlasCountry>();

  for (const generated of WORLD_COUNTRIES) {
    const curated = CURATED_BY_ISO.get(generated.iso);
    merged.set(
      generated.iso,
      curated
        ? toAtlasCountry(curated)
        : {
            isoCode: generated.iso,
            nameAr: generated.nameAr,
            nameEn: generated.nameEn,
            continent: REGION_BY_CONTINENT[generated.continent] ?? 'asia',
            bounds: generated.bounds,
            isCurated: false,
          },
    );
  }

  // A curated country the 1:110m dataset does not carry must still be offered.
  for (const curated of COUNTRY_CATALOG) {
    if (!merged.has(curated.isoCode)) merged.set(curated.isoCode, toAtlasCountry(curated));
  }

  return [...merged.values()].sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
})();

const BY_ISO = new Map(ATLAS_COUNTRIES.map((country) => [country.isoCode, country]));

export function findAtlasCountry(isoCode: string | null | undefined): AtlasCountry | undefined {
  if (!isoCode) return undefined;
  return BY_ISO.get(isoCode.toUpperCase());
}

/**
 * Countries grouped for the picker, in the order the app names its regions.
 * Regions with nothing in them are dropped rather than rendered empty.
 */
export function atlasCountriesByRegion(): {
  region: { key: Continent; label: string };
  countries: AtlasCountry[];
}[] {
  return CONTINENTS.map((region) => ({
    region,
    countries: ATLAS_COUNTRIES.filter((country) => country.continent === region.key),
  })).filter((group) => group.countries.length > 0);
}

/**
 * Best guess at which country a coordinate is in.
 *
 * Smallest containing box wins, because bounding boxes overlap badly: the box
 * around Russia contains most of Europe, and Palestine sits inside Israel's.
 *
 * This is a RECTANGLE test, not a polygon test — open water inside a country's
 * box resolves to that country, and a point in a neighbour's notch can too. That
 * is deliberate: the alternative is shipping ~840 kB of polygons to answer a
 * question whose only two uses are pre-selecting a dropdown and *warning* about a
 * mismatch. Neither ever overrides what the user chose.
 */
export function atlasCountryAt([lng, lat]: Coordinates): AtlasCountry | undefined {
  let best: AtlasCountry | undefined;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const country of ATLAS_COUNTRIES) {
    const { sw, ne } = country.bounds;
    if (lng < sw[0] || lng > ne[0] || lat < sw[1] || lat > ne[1]) continue;
    const area = (ne[0] - sw[0]) * (ne[1] - sw[1]);
    if (area < bestArea) {
      bestArea = area;
      best = country;
    }
  }

  return best;
}

/** Geometric centre of a country's box — the seed for `countries.center`. */
export function atlasCountryCenter(country: AtlasCountry): Coordinates {
  return [
    (country.bounds.sw[0] + country.bounds.ne[0]) / 2,
    (country.bounds.sw[1] + country.bounds.ne[1]) / 2,
  ];
}
