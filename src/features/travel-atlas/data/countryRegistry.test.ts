import { describe, expect, it } from 'vitest';

import type { Coordinates } from '../types';
import { COUNTRY_CATALOG } from './countriesCatalog';
import {
  ATLAS_COUNTRIES,
  atlasCountriesByRegion,
  atlasCountryAt,
  atlasCountryCenter,
  findAtlasCountry,
} from './countryRegistry';
import { WORLD_COUNTRIES } from './worldCountries.generated';

describe('the merged country registry', () => {
  it('covers every country on the dotted map', () => {
    // The regression this guards: the place form used to offer only the curated
    // 78, so a place in Rwanda or Uruguay could not be saved at all.
    const registered = new Set(ATLAS_COUNTRIES.map((country) => country.isoCode));
    const missing = WORLD_COUNTRIES.filter((country) => !registered.has(country.iso));
    expect(missing.map((country) => country.iso)).toEqual([]);
    expect(ATLAS_COUNTRIES.length).toBeGreaterThanOrEqual(WORLD_COUNTRIES.length);
  });

  it('never drops a curated country', () => {
    const registered = new Set(ATLAS_COUNTRIES.map((country) => country.isoCode));
    const missing = COUNTRY_CATALOG.filter((entry) => !registered.has(entry.isoCode));
    expect(missing.map((entry) => entry.isoCode)).toEqual([]);
  });

  it('lets the curated name and region win over the generated one', () => {
    // Natural Earth calls it "الإمارات العربية المتحدة" and files it under Asia;
    // the curated entry is shorter and belongs to the Gulf region.
    const uae = findAtlasCountry('AE');
    expect(uae?.nameAr).toBe('الإمارات');
    expect(uae?.continent).toBe('gulf');
    expect(uae?.isCurated).toBe(true);
  });

  it('takes generated data where nothing is curated', () => {
    const rwanda = findAtlasCountry('RW');
    expect(rwanda?.isCurated).toBe(false);
    expect(rwanda?.nameAr).toBe('رواندا');
    expect(rwanda?.continent).toBe('africa');
  });

  it('is case-insensitive and safe on nothing', () => {
    expect(findAtlasCountry('sa')?.isoCode).toBe('SA');
    expect(findAtlasCountry(null)).toBeUndefined();
    expect(findAtlasCountry('')).toBeUndefined();
    expect(findAtlasCountry('ZZ')).toBeUndefined();
  });

  it('gives every country a usable bounding box', () => {
    for (const country of ATLAS_COUNTRIES) {
      const { sw, ne } = country.bounds;
      expect(ne[0]).toBeGreaterThan(sw[0]);
      expect(ne[1]).toBeGreaterThan(sw[1]);
      expect(sw[0]).toBeGreaterThanOrEqual(-180);
      expect(ne[0]).toBeLessThanOrEqual(180);
      expect(sw[1]).toBeGreaterThanOrEqual(-90);
      expect(ne[1]).toBeLessThanOrEqual(90);
    }
  });

  it('includes the small states the source dataset omits', () => {
    // 1:110m drops these entirely, and they are among the most travelled to by
    // this app's readers.
    for (const iso of ['BH', 'SG', 'MV']) {
      expect(findAtlasCountry(iso), iso).toBeDefined();
    }
  });

  it('groups countries by region without emitting an empty region', () => {
    const groups = atlasCountriesByRegion();
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) expect(group.countries.length).toBeGreaterThan(0);
    const total = groups.reduce((sum, group) => sum + group.countries.length, 0);
    expect(total).toBe(ATLAS_COUNTRIES.length);
  });
});

describe('atlasCountryAt', () => {
  it('resolves well-known points', () => {
    expect(atlasCountryAt([46.6753, 24.7136] as Coordinates)?.isoCode).toBe('SA');
    expect(atlasCountryAt([139.69, 35.68] as Coordinates)?.isoCode).toBe('JP');
  });

  it('prefers the smallest containing box', () => {
    // Bounding boxes overlap badly: Russia's contains most of Europe and
    // Israel's contains Palestine. Without the smallest-box rule, a pin in
    // Beirut resolves to whichever large neighbour was checked first.
    const beirut = atlasCountryAt([35.5, 33.89] as Coordinates);
    expect(beirut?.isoCode).toBe('LB');
  });

  it('returns nothing when no country box covers the point', () => {
    // Mid North Atlantic, clear of every bounding rectangle.
    expect(atlasCountryAt([-45, 30] as Coordinates)).toBeUndefined();
  });

  it('is a rectangle test, and says so honestly', () => {
    // Boxes are rectangles, so open water inside a country's rectangle still
    // resolves to that country: this point is in the South Atlantic but sits
    // inside Brazil's box. That is why the form only ever WARNS about a
    // mismatch instead of rejecting the pin, and why it never silently
    // overwrites a country the user chose.
    expect(atlasCountryAt([-40, -30] as Coordinates)?.isoCode).toBe('BR');
  });
});

describe('atlasCountryCenter', () => {
  it('sits inside the country box', () => {
    const country = findAtlasCountry('SA')!;
    const [lng, lat] = atlasCountryCenter(country);
    expect(lng).toBeGreaterThan(country.bounds.sw[0]);
    expect(lng).toBeLessThan(country.bounds.ne[0]);
    expect(lat).toBeGreaterThan(country.bounds.sw[1]);
    expect(lat).toBeLessThan(country.bounds.ne[1]);
  });
});
