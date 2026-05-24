// Country catalog for the Podcasts discovery country switcher.
//
// Apple's iTunes top-charts feed is geo-partitioned: each country has
// its own chart with localized podcasts. The `code` here is the ISO 3166
// alpha-2 lowercased — exactly what Apple expects in the URL path
// (`https://itunes.apple.com/{cc}/rss/toppodcasts/...`). We also use it
// as the `country` query parameter for `/search?...`.
//
// We bias the top of the list towards countries the app's existing
// audience cares about (Arabic-speaking + DACH region) so the picker
// feels relevant out of the box. The rest is alphabetical.
//
// `flag` is an emoji because we'd rather not ship 80+ tiny SVGs for a
// picker dialog. On macOS/iOS/Windows 11/most Android the regional
// indicators render natively; on the small set of platforms that don't,
// they fall back to a pair of letters which is still meaningful.

export interface PodcastCountry {
  /** ISO 3166-1 alpha-2 code, lowercased (e.g. `sa`, `de`, `us`). */
  code: string;
  /** English short name. */
  name: string;
  /** Localized Arabic name. */
  nameAr: string;
  /** Localized German name. */
  nameDe: string;
  /** Flag emoji (regional indicators). */
  flag: string;
}

export const podcastCountries: PodcastCountry[] = [
  { code: 'sa', name: 'Saudi Arabia',        nameAr: 'السعودية',        nameDe: 'Saudi-Arabien',        flag: '🇸🇦' },
  { code: 'ae', name: 'United Arab Emirates',nameAr: 'الإمارات',         nameDe: 'VAE',                  flag: '🇦🇪' },
  { code: 'eg', name: 'Egypt',               nameAr: 'مصر',              nameDe: 'Ägypten',              flag: '🇪🇬' },
  { code: 'kw', name: 'Kuwait',              nameAr: 'الكويت',           nameDe: 'Kuwait',               flag: '🇰🇼' },
  { code: 'qa', name: 'Qatar',               nameAr: 'قطر',              nameDe: 'Katar',                flag: '🇶🇦' },
  { code: 'bh', name: 'Bahrain',             nameAr: 'البحرين',          nameDe: 'Bahrain',              flag: '🇧🇭' },
  { code: 'om', name: 'Oman',                nameAr: 'عُمان',             nameDe: 'Oman',                 flag: '🇴🇲' },
  { code: 'jo', name: 'Jordan',              nameAr: 'الأردن',           nameDe: 'Jordanien',            flag: '🇯🇴' },
  { code: 'lb', name: 'Lebanon',             nameAr: 'لبنان',            nameDe: 'Libanon',              flag: '🇱🇧' },
  { code: 'iq', name: 'Iraq',                nameAr: 'العراق',           nameDe: 'Irak',                 flag: '🇮🇶' },
  { code: 'sy', name: 'Syria',               nameAr: 'سوريا',            nameDe: 'Syrien',               flag: '🇸🇾' },
  { code: 'ye', name: 'Yemen',               nameAr: 'اليمن',            nameDe: 'Jemen',                flag: '🇾🇪' },
  { code: 'ps', name: 'Palestine',           nameAr: 'فلسطين',           nameDe: 'Palästina',            flag: '🇵🇸' },
  { code: 'ma', name: 'Morocco',             nameAr: 'المغرب',           nameDe: 'Marokko',              flag: '🇲🇦' },
  { code: 'dz', name: 'Algeria',             nameAr: 'الجزائر',          nameDe: 'Algerien',             flag: '🇩🇿' },
  { code: 'tn', name: 'Tunisia',             nameAr: 'تونس',             nameDe: 'Tunesien',             flag: '🇹🇳' },
  { code: 'ly', name: 'Libya',               nameAr: 'ليبيا',            nameDe: 'Libyen',               flag: '🇱🇾' },
  { code: 'sd', name: 'Sudan',               nameAr: 'السودان',          nameDe: 'Sudan',                flag: '🇸🇩' },
  // — — separator line for non-Arabic countries — —
  { code: 'de', name: 'Germany',             nameAr: 'ألمانيا',          nameDe: 'Deutschland',          flag: '🇩🇪' },
  { code: 'at', name: 'Austria',             nameAr: 'النمسا',           nameDe: 'Österreich',           flag: '🇦🇹' },
  { code: 'ch', name: 'Switzerland',         nameAr: 'سويسرا',           nameDe: 'Schweiz',              flag: '🇨🇭' },
  { code: 'us', name: 'United States',       nameAr: 'الولايات المتحدة', nameDe: 'USA',                  flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom',      nameAr: 'المملكة المتحدة',  nameDe: 'Vereinigtes Königr.',  flag: '🇬🇧' },
  { code: 'fr', name: 'France',              nameAr: 'فرنسا',            nameDe: 'Frankreich',           flag: '🇫🇷' },
  { code: 'es', name: 'Spain',               nameAr: 'إسبانيا',          nameDe: 'Spanien',              flag: '🇪🇸' },
  { code: 'it', name: 'Italy',               nameAr: 'إيطاليا',          nameDe: 'Italien',              flag: '🇮🇹' },
  { code: 'tr', name: 'Turkey',              nameAr: 'تركيا',            nameDe: 'Türkei',               flag: '🇹🇷' },
  { code: 'ir', name: 'Iran',                nameAr: 'إيران',            nameDe: 'Iran',                 flag: '🇮🇷' },
  { code: 'pk', name: 'Pakistan',            nameAr: 'باكستان',          nameDe: 'Pakistan',             flag: '🇵🇰' },
  { code: 'in', name: 'India',               nameAr: 'الهند',            nameDe: 'Indien',               flag: '🇮🇳' },
  { code: 'id', name: 'Indonesia',           nameAr: 'إندونيسيا',        nameDe: 'Indonesien',           flag: '🇮🇩' },
  { code: 'my', name: 'Malaysia',            nameAr: 'ماليزيا',          nameDe: 'Malaysia',             flag: '🇲🇾' },
  { code: 'ca', name: 'Canada',              nameAr: 'كندا',             nameDe: 'Kanada',               flag: '🇨🇦' },
  { code: 'au', name: 'Australia',           nameAr: 'أستراليا',         nameDe: 'Australien',           flag: '🇦🇺' },
  { code: 'nl', name: 'Netherlands',         nameAr: 'هولندا',           nameDe: 'Niederlande',          flag: '🇳🇱' },
  { code: 'se', name: 'Sweden',              nameAr: 'السويد',           nameDe: 'Schweden',             flag: '🇸🇪' },
  { code: 'br', name: 'Brazil',              nameAr: 'البرازيل',         nameDe: 'Brasilien',            flag: '🇧🇷' },
  { code: 'mx', name: 'Mexico',              nameAr: 'المكسيك',          nameDe: 'Mexiko',               flag: '🇲🇽' },
  { code: 'jp', name: 'Japan',               nameAr: 'اليابان',          nameDe: 'Japan',                flag: '🇯🇵' },
  { code: 'kr', name: 'South Korea',         nameAr: 'كوريا الجنوبية',   nameDe: 'Südkorea',             flag: '🇰🇷' },
];

/** Resolve a saved country code back to its catalog entry; falls back to SA. */
export function findCountry(code: string | null | undefined): PodcastCountry {
  return podcastCountries.find(c => c.code === code?.toLowerCase()) ?? podcastCountries[0];
}
