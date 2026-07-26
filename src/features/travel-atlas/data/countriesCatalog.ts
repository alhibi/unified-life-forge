import type { Coordinates, CountryBounds } from '../types';

/**
 * Destination catalog.
 *
 * The country row in Supabase is public reference data with no client write
 * policy, so it is seeded from this list the first time someone saves a place
 * there. Bounds are approximate mainland boxes — they only need to be good
 * enough to frame the map and sanity-check that a picked point is plausible.
 */

export type Continent =
  'gulf' | 'levant' | 'maghreb' | 'europe' | 'asia' | 'africa' | 'americas' | 'oceania';

export const CONTINENTS: readonly { key: Continent; label: string }[] = [
  { key: 'gulf', label: 'الخليج والجزيرة' },
  { key: 'levant', label: 'المشرق وتركيا' },
  { key: 'maghreb', label: 'شمال أفريقيا' },
  { key: 'europe', label: 'أوروبا' },
  { key: 'asia', label: 'آسيا' },
  { key: 'africa', label: 'أفريقيا' },
  { key: 'americas', label: 'الأمريكتان' },
  { key: 'oceania', label: 'أوقيانوسيا' },
] as const;

export interface CountryCatalogEntry {
  isoCode: string;
  nameAr: string;
  nameEn: string;
  continent: Continent;
  bounds: CountryBounds;
}

export const COUNTRY_CATALOG: readonly CountryCatalogEntry[] = [
  // ── الخليج والجزيرة العربية ───────────────────────────────────────────────
  {
    isoCode: 'SA',
    nameAr: 'السعودية',
    nameEn: 'Saudi Arabia',
    continent: 'gulf',
    bounds: { sw: [34.5, 16.0], ne: [55.7, 32.2] },
  },
  {
    isoCode: 'AE',
    nameAr: 'الإمارات',
    nameEn: 'United Arab Emirates',
    continent: 'gulf',
    bounds: { sw: [51.5, 22.5], ne: [56.4, 26.1] },
  },
  {
    isoCode: 'QA',
    nameAr: 'قطر',
    nameEn: 'Qatar',
    continent: 'gulf',
    bounds: { sw: [50.7, 24.4], ne: [51.7, 26.2] },
  },
  {
    isoCode: 'KW',
    nameAr: 'الكويت',
    nameEn: 'Kuwait',
    continent: 'gulf',
    bounds: { sw: [46.5, 28.5], ne: [48.4, 30.1] },
  },
  {
    isoCode: 'BH',
    nameAr: 'البحرين',
    nameEn: 'Bahrain',
    continent: 'gulf',
    bounds: { sw: [50.3, 25.6], ne: [50.9, 26.4] },
  },
  {
    isoCode: 'OM',
    nameAr: 'عُمان',
    nameEn: 'Oman',
    continent: 'gulf',
    bounds: { sw: [51.9, 16.6], ne: [59.9, 26.5] },
  },
  {
    isoCode: 'YE',
    nameAr: 'اليمن',
    nameEn: 'Yemen',
    continent: 'gulf',
    bounds: { sw: [42.5, 12.1], ne: [54.5, 19.0] },
  },

  // ── المشرق وتركيا ─────────────────────────────────────────────────────────
  {
    isoCode: 'JO',
    nameAr: 'الأردن',
    nameEn: 'Jordan',
    continent: 'levant',
    bounds: { sw: [34.9, 29.1], ne: [39.3, 33.4] },
  },
  {
    isoCode: 'PS',
    nameAr: 'فلسطين',
    nameEn: 'Palestine',
    continent: 'levant',
    bounds: { sw: [34.2, 31.2], ne: [35.6, 32.6] },
  },
  {
    isoCode: 'LB',
    nameAr: 'لبنان',
    nameEn: 'Lebanon',
    continent: 'levant',
    bounds: { sw: [35.1, 33.0], ne: [36.6, 34.7] },
  },
  {
    isoCode: 'SY',
    nameAr: 'سوريا',
    nameEn: 'Syria',
    continent: 'levant',
    bounds: { sw: [35.7, 32.3], ne: [42.4, 37.3] },
  },
  {
    isoCode: 'IQ',
    nameAr: 'العراق',
    nameEn: 'Iraq',
    continent: 'levant',
    bounds: { sw: [38.8, 29.1], ne: [48.6, 37.4] },
  },
  {
    isoCode: 'TR',
    nameAr: 'تركيا',
    nameEn: 'Türkiye',
    continent: 'levant',
    bounds: { sw: [25.7, 35.8], ne: [44.8, 42.1] },
  },
  {
    isoCode: 'AZ',
    nameAr: 'أذربيجان',
    nameEn: 'Azerbaijan',
    continent: 'levant',
    bounds: { sw: [44.8, 38.4], ne: [50.4, 41.9] },
  },
  {
    isoCode: 'GE',
    nameAr: 'جورجيا',
    nameEn: 'Georgia',
    continent: 'levant',
    bounds: { sw: [40.0, 41.0], ne: [46.7, 43.6] },
  },

  // ── شمال أفريقيا ──────────────────────────────────────────────────────────
  {
    isoCode: 'EG',
    nameAr: 'مصر',
    nameEn: 'Egypt',
    continent: 'maghreb',
    bounds: { sw: [24.7, 21.7], ne: [36.9, 31.7] },
  },
  {
    isoCode: 'MA',
    nameAr: 'المغرب',
    nameEn: 'Morocco',
    continent: 'maghreb',
    bounds: { sw: [-13.2, 27.7], ne: [-1.0, 35.9] },
  },
  {
    isoCode: 'TN',
    nameAr: 'تونس',
    nameEn: 'Tunisia',
    continent: 'maghreb',
    bounds: { sw: [7.5, 30.2], ne: [11.6, 37.5] },
  },
  {
    isoCode: 'DZ',
    nameAr: 'الجزائر',
    nameEn: 'Algeria',
    continent: 'maghreb',
    bounds: { sw: [-8.7, 19.0], ne: [12.0, 37.1] },
  },
  {
    isoCode: 'LY',
    nameAr: 'ليبيا',
    nameEn: 'Libya',
    continent: 'maghreb',
    bounds: { sw: [9.3, 19.5], ne: [25.2, 33.2] },
  },
  {
    isoCode: 'SD',
    nameAr: 'السودان',
    nameEn: 'Sudan',
    continent: 'maghreb',
    bounds: { sw: [21.8, 8.7], ne: [38.6, 22.2] },
  },

  // ── أوروبا ────────────────────────────────────────────────────────────────
  {
    isoCode: 'DE',
    nameAr: 'ألمانيا',
    nameEn: 'Germany',
    continent: 'europe',
    bounds: { sw: [5.9, 47.3], ne: [15.0, 55.1] },
  },
  {
    isoCode: 'FR',
    nameAr: 'فرنسا',
    nameEn: 'France',
    continent: 'europe',
    bounds: { sw: [-5.1, 41.3], ne: [9.6, 51.1] },
  },
  {
    isoCode: 'IT',
    nameAr: 'إيطاليا',
    nameEn: 'Italy',
    continent: 'europe',
    bounds: { sw: [6.6, 35.5], ne: [18.5, 47.1] },
  },
  {
    isoCode: 'ES',
    nameAr: 'إسبانيا',
    nameEn: 'Spain',
    continent: 'europe',
    bounds: { sw: [-9.3, 35.9], ne: [4.3, 43.8] },
  },
  {
    isoCode: 'PT',
    nameAr: 'البرتغال',
    nameEn: 'Portugal',
    continent: 'europe',
    bounds: { sw: [-9.5, 36.9], ne: [-6.2, 42.2] },
  },
  {
    isoCode: 'GB',
    nameAr: 'المملكة المتحدة',
    nameEn: 'United Kingdom',
    continent: 'europe',
    bounds: { sw: [-8.6, 49.9], ne: [1.8, 60.9] },
  },
  {
    isoCode: 'IE',
    nameAr: 'أيرلندا',
    nameEn: 'Ireland',
    continent: 'europe',
    bounds: { sw: [-10.5, 51.4], ne: [-6.0, 55.4] },
  },
  {
    isoCode: 'NL',
    nameAr: 'هولندا',
    nameEn: 'Netherlands',
    continent: 'europe',
    bounds: { sw: [3.3, 50.8], ne: [7.2, 53.5] },
  },
  {
    isoCode: 'BE',
    nameAr: 'بلجيكا',
    nameEn: 'Belgium',
    continent: 'europe',
    bounds: { sw: [2.5, 49.5], ne: [6.4, 51.5] },
  },
  {
    isoCode: 'CH',
    nameAr: 'سويسرا',
    nameEn: 'Switzerland',
    continent: 'europe',
    bounds: { sw: [5.9, 45.8], ne: [10.5, 47.8] },
  },
  {
    isoCode: 'AT',
    nameAr: 'النمسا',
    nameEn: 'Austria',
    continent: 'europe',
    bounds: { sw: [9.5, 46.4], ne: [17.2, 49.0] },
  },
  {
    isoCode: 'CZ',
    nameAr: 'التشيك',
    nameEn: 'Czechia',
    continent: 'europe',
    bounds: { sw: [12.1, 48.6], ne: [18.9, 51.1] },
  },
  {
    isoCode: 'PL',
    nameAr: 'بولندا',
    nameEn: 'Poland',
    continent: 'europe',
    bounds: { sw: [14.1, 49.0], ne: [24.2, 54.9] },
  },
  {
    isoCode: 'HU',
    nameAr: 'هنغاريا',
    nameEn: 'Hungary',
    continent: 'europe',
    bounds: { sw: [16.1, 45.7], ne: [22.9, 48.6] },
  },
  {
    isoCode: 'GR',
    nameAr: 'اليونان',
    nameEn: 'Greece',
    continent: 'europe',
    bounds: { sw: [19.4, 34.8], ne: [28.2, 41.7] },
  },
  {
    isoCode: 'HR',
    nameAr: 'كرواتيا',
    nameEn: 'Croatia',
    continent: 'europe',
    bounds: { sw: [13.5, 42.4], ne: [19.4, 46.5] },
  },
  {
    isoCode: 'BA',
    nameAr: 'البوسنة والهرسك',
    nameEn: 'Bosnia and Herzegovina',
    continent: 'europe',
    bounds: { sw: [15.7, 42.6], ne: [19.6, 45.3] },
  },
  {
    isoCode: 'AL',
    nameAr: 'ألبانيا',
    nameEn: 'Albania',
    continent: 'europe',
    bounds: { sw: [19.3, 39.6], ne: [21.1, 42.7] },
  },
  {
    isoCode: 'SE',
    nameAr: 'السويد',
    nameEn: 'Sweden',
    continent: 'europe',
    bounds: { sw: [11.1, 55.3], ne: [24.2, 69.1] },
  },
  {
    isoCode: 'NO',
    nameAr: 'النرويج',
    nameEn: 'Norway',
    continent: 'europe',
    bounds: { sw: [4.6, 57.9], ne: [31.1, 71.2] },
  },
  {
    isoCode: 'DK',
    nameAr: 'الدنمارك',
    nameEn: 'Denmark',
    continent: 'europe',
    bounds: { sw: [8.0, 54.5], ne: [15.2, 57.8] },
  },
  {
    isoCode: 'FI',
    nameAr: 'فنلندا',
    nameEn: 'Finland',
    continent: 'europe',
    bounds: { sw: [20.6, 59.8], ne: [31.6, 70.1] },
  },
  {
    isoCode: 'IS',
    nameAr: 'أيسلندا',
    nameEn: 'Iceland',
    continent: 'europe',
    bounds: { sw: [-24.6, 63.3], ne: [-13.5, 66.6] },
  },

  // ── آسيا ──────────────────────────────────────────────────────────────────
  {
    isoCode: 'JP',
    nameAr: 'اليابان',
    nameEn: 'Japan',
    continent: 'asia',
    bounds: { sw: [128.4, 30.9], ne: [145.9, 45.5] },
  },
  {
    isoCode: 'KR',
    nameAr: 'كوريا الجنوبية',
    nameEn: 'South Korea',
    continent: 'asia',
    bounds: { sw: [125.1, 33.1], ne: [131.9, 38.6] },
  },
  {
    isoCode: 'CN',
    nameAr: 'الصين',
    nameEn: 'China',
    continent: 'asia',
    bounds: { sw: [73.5, 18.2], ne: [134.8, 53.6] },
  },
  {
    isoCode: 'MY',
    nameAr: 'ماليزيا',
    nameEn: 'Malaysia',
    continent: 'asia',
    bounds: { sw: [99.6, 0.9], ne: [119.3, 7.4] },
  },
  {
    isoCode: 'ID',
    nameAr: 'إندونيسيا',
    nameEn: 'Indonesia',
    continent: 'asia',
    bounds: { sw: [95.0, -11.0], ne: [141.0, 6.1] },
  },
  {
    isoCode: 'SG',
    nameAr: 'سنغافورة',
    nameEn: 'Singapore',
    continent: 'asia',
    bounds: { sw: [103.6, 1.15], ne: [104.1, 1.48] },
  },
  {
    isoCode: 'TH',
    nameAr: 'تايلاند',
    nameEn: 'Thailand',
    continent: 'asia',
    bounds: { sw: [97.3, 5.6], ne: [105.6, 20.5] },
  },
  {
    isoCode: 'VN',
    nameAr: 'فيتنام',
    nameEn: 'Vietnam',
    continent: 'asia',
    bounds: { sw: [102.1, 8.4], ne: [109.5, 23.4] },
  },
  {
    isoCode: 'PH',
    nameAr: 'الفلبين',
    nameEn: 'Philippines',
    continent: 'asia',
    bounds: { sw: [116.9, 4.6], ne: [126.6, 19.6] },
  },
  {
    isoCode: 'IN',
    nameAr: 'الهند',
    nameEn: 'India',
    continent: 'asia',
    bounds: { sw: [68.1, 6.7], ne: [97.4, 35.5] },
  },
  {
    isoCode: 'PK',
    nameAr: 'باكستان',
    nameEn: 'Pakistan',
    continent: 'asia',
    bounds: { sw: [60.9, 23.7], ne: [77.1, 37.1] },
  },
  {
    isoCode: 'LK',
    nameAr: 'سريلانكا',
    nameEn: 'Sri Lanka',
    continent: 'asia',
    bounds: { sw: [79.7, 5.9], ne: [81.9, 9.9] },
  },
  {
    isoCode: 'MV',
    nameAr: 'المالديف',
    nameEn: 'Maldives',
    continent: 'asia',
    bounds: { sw: [72.6, -0.7], ne: [73.8, 7.1] },
  },
  {
    isoCode: 'UZ',
    nameAr: 'أوزبكستان',
    nameEn: 'Uzbekistan',
    continent: 'asia',
    bounds: { sw: [55.9, 37.2], ne: [73.2, 45.6] },
  },
  {
    isoCode: 'KZ',
    nameAr: 'كازاخستان',
    nameEn: 'Kazakhstan',
    continent: 'asia',
    bounds: { sw: [46.5, 40.6], ne: [87.3, 55.4] },
  },

  // ── أفريقيا ───────────────────────────────────────────────────────────────
  {
    isoCode: 'KE',
    nameAr: 'كينيا',
    nameEn: 'Kenya',
    continent: 'africa',
    bounds: { sw: [33.9, -4.7], ne: [41.9, 5.0] },
  },
  {
    isoCode: 'TZ',
    nameAr: 'تنزانيا',
    nameEn: 'Tanzania',
    continent: 'africa',
    bounds: { sw: [29.3, -11.8], ne: [40.4, -0.9] },
  },
  {
    isoCode: 'ET',
    nameAr: 'إثيوبيا',
    nameEn: 'Ethiopia',
    continent: 'africa',
    bounds: { sw: [33.0, 3.4], ne: [48.0, 14.9] },
  },
  {
    isoCode: 'ZA',
    nameAr: 'جنوب أفريقيا',
    nameEn: 'South Africa',
    continent: 'africa',
    bounds: { sw: [16.4, -34.9], ne: [32.9, -22.1] },
  },
  {
    isoCode: 'SN',
    nameAr: 'السنغال',
    nameEn: 'Senegal',
    continent: 'africa',
    bounds: { sw: [-17.6, 12.3], ne: [-11.3, 16.7] },
  },
  {
    isoCode: 'NG',
    nameAr: 'نيجيريا',
    nameEn: 'Nigeria',
    continent: 'africa',
    bounds: { sw: [2.6, 4.2], ne: [14.7, 13.9] },
  },

  // ── الأمريكتان ────────────────────────────────────────────────────────────
  {
    isoCode: 'US',
    nameAr: 'الولايات المتحدة',
    nameEn: 'United States',
    continent: 'americas',
    bounds: { sw: [-125.0, 24.4], ne: [-66.9, 49.4] },
  },
  {
    isoCode: 'CA',
    nameAr: 'كندا',
    nameEn: 'Canada',
    continent: 'americas',
    bounds: { sw: [-141.0, 41.7], ne: [-52.6, 70.0] },
  },
  {
    isoCode: 'MX',
    nameAr: 'المكسيك',
    nameEn: 'Mexico',
    continent: 'americas',
    bounds: { sw: [-118.4, 14.5], ne: [-86.7, 32.7] },
  },
  {
    isoCode: 'BR',
    nameAr: 'البرازيل',
    nameEn: 'Brazil',
    continent: 'americas',
    bounds: { sw: [-74.0, -33.8], ne: [-34.8, 5.3] },
  },
  {
    isoCode: 'AR',
    nameAr: 'الأرجنتين',
    nameEn: 'Argentina',
    continent: 'americas',
    bounds: { sw: [-73.6, -55.1], ne: [-53.6, -21.8] },
  },
  {
    isoCode: 'CL',
    nameAr: 'تشيلي',
    nameEn: 'Chile',
    continent: 'americas',
    bounds: { sw: [-75.6, -55.9], ne: [-66.4, -17.5] },
  },
  {
    isoCode: 'PE',
    nameAr: 'بيرو',
    nameEn: 'Peru',
    continent: 'americas',
    bounds: { sw: [-81.4, -18.4], ne: [-68.7, -0.0] },
  },

  // ── أوقيانوسيا ────────────────────────────────────────────────────────────
  {
    isoCode: 'AU',
    nameAr: 'أستراليا',
    nameEn: 'Australia',
    continent: 'oceania',
    bounds: { sw: [113.2, -43.6], ne: [153.6, -10.7] },
  },
  {
    isoCode: 'NZ',
    nameAr: 'نيوزيلندا',
    nameEn: 'New Zealand',
    continent: 'oceania',
    bounds: { sw: [166.4, -47.3], ne: [178.6, -34.4] },
  },
] as const;

const BY_ISO = new Map<string, CountryCatalogEntry>(
  COUNTRY_CATALOG.map((entry) => [entry.isoCode, entry]),
);

export function findCatalogCountry(
  isoCode: string | null | undefined,
): CountryCatalogEntry | undefined {
  if (!isoCode) return undefined;
  return BY_ISO.get(isoCode.toUpperCase());
}

/** Geometric centre of a bounding box — the seed value for `countries.center`. */
export function boundsCenter(bounds: CountryBounds): Coordinates {
  return [(bounds.sw[0] + bounds.ne[0]) / 2, (bounds.sw[1] + bounds.ne[1]) / 2];
}

/**
 * Best catalog match for a coordinate, used to pre-select the country after a
 * map pick or a geolocation read. Smallest containing box wins so Palestine is
 * not shadowed by a larger neighbour's bounding rectangle.
 */
export function catalogCountryAt([lng, lat]: Coordinates): CountryCatalogEntry | undefined {
  let best: CountryCatalogEntry | undefined;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const entry of COUNTRY_CATALOG) {
    const { sw, ne } = entry.bounds;
    if (lng < sw[0] || lng > ne[0] || lat < sw[1] || lat > ne[1]) continue;
    const area = (ne[0] - sw[0]) * (ne[1] - sw[1]);
    if (area < bestArea) {
      bestArea = area;
      best = entry;
    }
  }
  return best;
}

export function continentLabel(continent: Continent): string {
  return CONTINENTS.find((entry) => entry.key === continent)?.label ?? '';
}
