import type { CountryBounds } from './types';

export interface CountryCatalogEntry {
  isoCode: string;
  nameAr: string;
  nameEn: string;
  bounds: CountryBounds;
}

// Curated list of common travel destinations. Bounds are approximate.
export const COUNTRY_CATALOG: CountryCatalogEntry[] = [
  { isoCode: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', bounds: { sw: [34.5, 16.0], ne: [55.7, 32.2] } },
  { isoCode: 'AE', nameAr: 'الإمارات', nameEn: 'United Arab Emirates', bounds: { sw: [51.5, 22.5], ne: [56.4, 26.1] } },
  { isoCode: 'EG', nameAr: 'مصر', nameEn: 'Egypt', bounds: { sw: [24.7, 21.7], ne: [36.9, 31.7] } },
  { isoCode: 'JO', nameAr: 'الأردن', nameEn: 'Jordan', bounds: { sw: [34.9, 29.1], ne: [39.3, 33.4] } },
  { isoCode: 'LB', nameAr: 'لبنان', nameEn: 'Lebanon', bounds: { sw: [35.1, 33.0], ne: [36.6, 34.7] } },
  { isoCode: 'SY', nameAr: 'سوريا', nameEn: 'Syria', bounds: { sw: [35.7, 32.3], ne: [42.4, 37.3] } },
  { isoCode: 'PS', nameAr: 'فلسطين', nameEn: 'Palestine', bounds: { sw: [34.2, 31.2], ne: [35.6, 32.6] } },
  { isoCode: 'TR', nameAr: 'تركيا', nameEn: 'Türkiye', bounds: { sw: [25.7, 35.8], ne: [44.8, 42.1] } },
  { isoCode: 'MA', nameAr: 'المغرب', nameEn: 'Morocco', bounds: { sw: [-13.2, 27.7], ne: [-1.0, 35.9] } },
  { isoCode: 'TN', nameAr: 'تونس', nameEn: 'Tunisia', bounds: { sw: [7.5, 30.2], ne: [11.6, 37.5] } },
  { isoCode: 'DZ', nameAr: 'الجزائر', nameEn: 'Algeria', bounds: { sw: [-8.7, 19.0], ne: [12.0, 37.1] } },
  { isoCode: 'QA', nameAr: 'قطر', nameEn: 'Qatar', bounds: { sw: [50.7, 24.4], ne: [51.7, 26.2] } },
  { isoCode: 'KW', nameAr: 'الكويت', nameEn: 'Kuwait', bounds: { sw: [46.5, 28.5], ne: [48.4, 30.1] } },
  { isoCode: 'OM', nameAr: 'عُمان', nameEn: 'Oman', bounds: { sw: [51.9, 16.6], ne: [59.9, 26.5] } },
  { isoCode: 'BH', nameAr: 'البحرين', nameEn: 'Bahrain', bounds: { sw: [50.4, 25.7], ne: [50.8, 26.4] } },
  { isoCode: 'DE', nameAr: 'ألمانيا', nameEn: 'Germany', bounds: { sw: [5.9, 47.3], ne: [15.0, 55.1] } },
  { isoCode: 'FR', nameAr: 'فرنسا', nameEn: 'France', bounds: { sw: [-5.1, 41.3], ne: [9.6, 51.1] } },
  { isoCode: 'IT', nameAr: 'إيطاليا', nameEn: 'Italy', bounds: { sw: [6.6, 35.5], ne: [18.5, 47.1] } },
  { isoCode: 'ES', nameAr: 'إسبانيا', nameEn: 'Spain', bounds: { sw: [-9.3, 35.9], ne: [4.3, 43.8] } },
  { isoCode: 'GB', nameAr: 'المملكة المتحدة', nameEn: 'United Kingdom', bounds: { sw: [-8.6, 49.9], ne: [1.8, 60.9] } },
  { isoCode: 'NL', nameAr: 'هولندا', nameEn: 'Netherlands', bounds: { sw: [3.3, 50.8], ne: [7.2, 53.5] } },
  { isoCode: 'CH', nameAr: 'سويسرا', nameEn: 'Switzerland', bounds: { sw: [5.9, 45.8], ne: [10.5, 47.8] } },
  { isoCode: 'AT', nameAr: 'النمسا', nameEn: 'Austria', bounds: { sw: [9.5, 46.4], ne: [17.2, 49.0] } },
  { isoCode: 'GR', nameAr: 'اليونان', nameEn: 'Greece', bounds: { sw: [19.4, 34.8], ne: [28.2, 41.7] } },
  { isoCode: 'JP', nameAr: 'اليابان', nameEn: 'Japan', bounds: { sw: [122.9, 24.0], ne: [153.9, 45.5] } },
  { isoCode: 'KR', nameAr: 'كوريا الجنوبية', nameEn: 'South Korea', bounds: { sw: [125.1, 33.1], ne: [131.9, 38.6] } },
  { isoCode: 'CN', nameAr: 'الصين', nameEn: 'China', bounds: { sw: [73.5, 18.2], ne: [134.8, 53.6] } },
  { isoCode: 'MY', nameAr: 'ماليزيا', nameEn: 'Malaysia', bounds: { sw: [99.6, 0.9], ne: [119.3, 7.4] } },
  { isoCode: 'ID', nameAr: 'إندونيسيا', nameEn: 'Indonesia', bounds: { sw: [95.0, -11.0], ne: [141.0, 6.1] } },
  { isoCode: 'TH', nameAr: 'تايلاند', nameEn: 'Thailand', bounds: { sw: [97.3, 5.6], ne: [105.6, 20.5] } },
  { isoCode: 'US', nameAr: 'الولايات المتحدة', nameEn: 'United States', bounds: { sw: [-125.0, 24.4], ne: [-66.9, 49.4] } },
  { isoCode: 'CA', nameAr: 'كندا', nameEn: 'Canada', bounds: { sw: [-141.0, 41.7], ne: [-52.6, 83.1] } },
];