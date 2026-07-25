// Country catalog for the Podcasts discovery country switcher.
//
// Apple's iTunes top-charts feed is geo-partitioned: each country has
// its own chart with localized podcasts. The `code` here is the ISO
// 3166 alpha-2 lowercased — exactly what Apple expects in the URL path
// (`https://itunes.apple.com/{cc}/rss/toppodcasts/...`). We also use it
// as the `country` query parameter for `/search?...`.
//
// The list covers the ~120 storefronts Apple operates that actually
// serve a podcast top chart (territories like North Korea or Iran are
// omitted because Apple doesn't run a Podcasts storefront there). We
// bias the top of the list towards regions the app's existing audience
// cares about (Arabic-speaking + DACH) so the picker feels relevant
// out of the box.
//
// `flag` is an emoji because we'd rather not ship 100+ tiny SVGs for a
// picker dialog. On macOS/iOS/Windows 11/most Android the regional
// indicators render natively; on the small set of platforms that
// don't, they fall back to a pair of letters which is still meaningful.
//
// `lang` is the primary content language of that country's chart in
// BCP-47 short form. It powers the "region" feature in the discovery
// page (e.g. picking "All Arabic" fans out a parallel fetch across
// every country whose lang is `ar` and dedupes the merged results).

export interface PodcastCountry {
  /** ISO 3166-1 alpha-2 code, lowercased (e.g. `sa`, `de`, `us`). */
  code: string;
  /** English short name. */
  name: string;
  /** Localized Arabic name. */
  nameAr: string;
  /** Flag emoji (regional indicators). */
  flag: string;
  /** Primary content language (BCP-47 short). Drives region grouping. */
  lang: string;
}

export const podcastCountries: PodcastCountry[] = [
  /* ============== Arabic-speaking (default region for this app) ============ */
  {
    code: 'sa',
    name: 'Saudi Arabia',
    nameAr: 'السعودية',
    flag: '🇸🇦',
    lang: 'ar',
  },
  {
    code: 'ae',
    name: 'United Arab Emirates',
    nameAr: 'الإمارات',
    flag: '🇦🇪',
    lang: 'ar',
  },
  { code: 'eg', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', lang: 'ar' },
  { code: 'kw', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', lang: 'ar' },
  { code: 'qa', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', lang: 'ar' },
  { code: 'bh', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', lang: 'ar' },
  { code: 'om', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', lang: 'ar' },
  { code: 'jo', name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', lang: 'ar' },
  { code: 'lb', name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧', lang: 'ar' },
  { code: 'iq', name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶', lang: 'ar' },
  { code: 'ye', name: 'Yemen', nameAr: 'اليمن', flag: '🇾🇪', lang: 'ar' },
  { code: 'ma', name: 'Morocco', nameAr: 'المغرب', flag: '🇲🇦', lang: 'ar' },
  { code: 'dz', name: 'Algeria', nameAr: 'الجزائر', flag: '🇩🇿', lang: 'ar' },
  { code: 'tn', name: 'Tunisia', nameAr: 'تونس', flag: '🇹🇳', lang: 'ar' },
  { code: 'ly', name: 'Libya', nameAr: 'ليبيا', flag: '🇱🇾', lang: 'ar' },

  /* ============== German-speaking ========================================== */
  { code: 'de', name: 'Germany', nameAr: 'ألمانيا', flag: '🇩🇪', lang: 'de' },
  { code: 'at', name: 'Austria', nameAr: 'النمسا', flag: '🇦🇹', lang: 'de' },
  { code: 'ch', name: 'Switzerland', nameAr: 'سويسرا', flag: '🇨🇭', lang: 'de' },
  {
    code: 'lu',
    name: 'Luxembourg',
    nameAr: 'لوكسمبورغ',
    flag: '🇱🇺',
    lang: 'de',
  },

  /* ============== English-speaking ========================================= */
  {
    code: 'us',
    name: 'United States',
    nameAr: 'الولايات المتحدة',
    flag: '🇺🇸',
    lang: 'en',
  },
  {
    code: 'gb',
    name: 'United Kingdom',
    nameAr: 'المملكة المتحدة',
    flag: '🇬🇧',
    lang: 'en',
  },
  { code: 'ca', name: 'Canada', nameAr: 'كندا', flag: '🇨🇦', lang: 'en' },
  {
    code: 'au',
    name: 'Australia',
    nameAr: 'أستراليا',
    flag: '🇦🇺',
    lang: 'en',
  },
  { code: 'ie', name: 'Ireland', nameAr: 'أيرلندا', flag: '🇮🇪', lang: 'en' },
  {
    code: 'nz',
    name: 'New Zealand',
    nameAr: 'نيوزيلندا',
    flag: '🇳🇿',
    lang: 'en',
  },
  {
    code: 'za',
    name: 'South Africa',
    nameAr: 'جنوب أفريقيا',
    flag: '🇿🇦',
    lang: 'en',
  },
  { code: 'sg', name: 'Singapore', nameAr: 'سنغافورة', flag: '🇸🇬', lang: 'en' },
  {
    code: 'hk',
    name: 'Hong Kong',
    nameAr: 'هونغ كونغ',
    flag: '🇭🇰',
    lang: 'en',
  },
  {
    code: 'ph',
    name: 'Philippines',
    nameAr: 'الفلبين',
    flag: '🇵🇭',
    lang: 'en',
  },
  { code: 'ng', name: 'Nigeria', nameAr: 'نيجيريا', flag: '🇳🇬', lang: 'en' },
  { code: 'ke', name: 'Kenya', nameAr: 'كينيا', flag: '🇰🇪', lang: 'en' },
  { code: 'gh', name: 'Ghana', nameAr: 'غانا', flag: '🇬🇭', lang: 'en' },
  { code: 'mt', name: 'Malta', nameAr: 'مالطا', flag: '🇲🇹', lang: 'en' },
  { code: 'jm', name: 'Jamaica', nameAr: 'جامايكا', flag: '🇯🇲', lang: 'en' },
  { code: 'in', name: 'India', nameAr: 'الهند', flag: '🇮🇳', lang: 'en' },
  { code: 'pk', name: 'Pakistan', nameAr: 'باكستان', flag: '🇵🇰', lang: 'en' },
  {
    code: 'lk',
    name: 'Sri Lanka',
    nameAr: 'سريلانكا',
    flag: '🇱🇰',
    lang: 'en',
  },
  {
    code: 'bd',
    name: 'Bangladesh',
    nameAr: 'بنغلاديش',
    flag: '🇧🇩',
    lang: 'en',
  },

  /* ============== French-speaking ========================================== */
  { code: 'fr', name: 'France', nameAr: 'فرنسا', flag: '🇫🇷', lang: 'fr' },
  { code: 'be', name: 'Belgium', nameAr: 'بلجيكا', flag: '🇧🇪', lang: 'fr' },
  { code: 'sn', name: 'Senegal', nameAr: 'السنغال', flag: '🇸🇳', lang: 'fr' },
  {
    code: 'ci',
    name: 'Côte d\u2019Ivoire',
    nameAr: 'ساحل العاج',
    flag: '🇨🇮',
    lang: 'fr',
  },

  /* ============== Spanish-speaking ========================================= */
  { code: 'es', name: 'Spain', nameAr: 'إسبانيا', flag: '🇪🇸', lang: 'es' },
  { code: 'mx', name: 'Mexico', nameAr: 'المكسيك', flag: '🇲🇽', lang: 'es' },
  {
    code: 'ar',
    name: 'Argentina',
    nameAr: 'الأرجنتين',
    flag: '🇦🇷',
    lang: 'es',
  },
  { code: 'cl', name: 'Chile', nameAr: 'تشيلي', flag: '🇨🇱', lang: 'es' },
  { code: 'co', name: 'Colombia', nameAr: 'كولومبيا', flag: '🇨🇴', lang: 'es' },
  { code: 'pe', name: 'Peru', nameAr: 'بيرو', flag: '🇵🇪', lang: 'es' },
  { code: 've', name: 'Venezuela', nameAr: 'فنزويلا', flag: '🇻🇪', lang: 'es' },
  { code: 'uy', name: 'Uruguay', nameAr: 'أوروغواي', flag: '🇺🇾', lang: 'es' },
  { code: 'ec', name: 'Ecuador', nameAr: 'الإكوادور', flag: '🇪🇨', lang: 'es' },
  { code: 'bo', name: 'Bolivia', nameAr: 'بوليفيا', flag: '🇧🇴', lang: 'es' },
  {
    code: 'cr',
    name: 'Costa Rica',
    nameAr: 'كوستاريكا',
    flag: '🇨🇷',
    lang: 'es',
  },
  {
    code: 'do',
    name: 'Dominican Republic',
    nameAr: 'الدومينيكان',
    flag: '🇩🇴',
    lang: 'es',
  },
  {
    code: 'gt',
    name: 'Guatemala',
    nameAr: 'غواتيمالا',
    flag: '🇬🇹',
    lang: 'es',
  },
  { code: 'hn', name: 'Honduras', nameAr: 'هندوراس', flag: '🇭🇳', lang: 'es' },
  {
    code: 'ni',
    name: 'Nicaragua',
    nameAr: 'نيكاراغوا',
    flag: '🇳🇮',
    lang: 'es',
  },
  { code: 'pa', name: 'Panama', nameAr: 'بنما', flag: '🇵🇦', lang: 'es' },
  { code: 'py', name: 'Paraguay', nameAr: 'باراغواي', flag: '🇵🇾', lang: 'es' },
  {
    code: 'sv',
    name: 'El Salvador',
    nameAr: 'السلفادور',
    flag: '🇸🇻',
    lang: 'es',
  },

  /* ============== Portuguese-speaking ====================================== */
  { code: 'pt', name: 'Portugal', nameAr: 'البرتغال', flag: '🇵🇹', lang: 'pt' },
  { code: 'br', name: 'Brazil', nameAr: 'البرازيل', flag: '🇧🇷', lang: 'pt' },
  { code: 'ao', name: 'Angola', nameAr: 'أنغولا', flag: '🇦🇴', lang: 'pt' },
  { code: 'mz', name: 'Mozambique', nameAr: 'موزمبيق', flag: '🇲🇿', lang: 'pt' },

  /* ============== Italian ================================================== */
  { code: 'it', name: 'Italy', nameAr: 'إيطاليا', flag: '🇮🇹', lang: 'it' },

  /* ============== Dutch ==================================================== */
  {
    code: 'nl',
    name: 'Netherlands',
    nameAr: 'هولندا',
    flag: '🇳🇱',
    lang: 'nl',
  },

  /* ============== Nordic ==================================================== */
  { code: 'se', name: 'Sweden', nameAr: 'السويد', flag: '🇸🇪', lang: 'sv' },
  { code: 'no', name: 'Norway', nameAr: 'النرويج', flag: '🇳🇴', lang: 'no' },
  { code: 'dk', name: 'Denmark', nameAr: 'الدنمارك', flag: '🇩🇰', lang: 'da' },
  { code: 'fi', name: 'Finland', nameAr: 'فنلندا', flag: '🇫🇮', lang: 'fi' },
  { code: 'is', name: 'Iceland', nameAr: 'آيسلندا', flag: '🇮🇸', lang: 'is' },

  /* ============== Eastern Europe / Slavic ================================== */
  { code: 'pl', name: 'Poland', nameAr: 'بولندا', flag: '🇵🇱', lang: 'pl' },
  { code: 'cz', name: 'Czechia', nameAr: 'التشيك', flag: '🇨🇿', lang: 'cs' },
  { code: 'sk', name: 'Slovakia', nameAr: 'سلوفاكيا', flag: '🇸🇰', lang: 'sk' },
  { code: 'hu', name: 'Hungary', nameAr: 'المجر', flag: '🇭🇺', lang: 'hu' },
  { code: 'ro', name: 'Romania', nameAr: 'رومانيا', flag: '🇷🇴', lang: 'ro' },
  { code: 'bg', name: 'Bulgaria', nameAr: 'بلغاريا', flag: '🇧🇬', lang: 'bg' },
  { code: 'hr', name: 'Croatia', nameAr: 'كرواتيا', flag: '🇭🇷', lang: 'hr' },
  { code: 'si', name: 'Slovenia', nameAr: 'سلوفينيا', flag: '🇸🇮', lang: 'sl' },
  { code: 'ee', name: 'Estonia', nameAr: 'إستونيا', flag: '🇪🇪', lang: 'et' },
  { code: 'lv', name: 'Latvia', nameAr: 'لاتفيا', flag: '🇱🇻', lang: 'lv' },
  { code: 'lt', name: 'Lithuania', nameAr: 'ليتوانيا', flag: '🇱🇹', lang: 'lt' },
  { code: 'ua', name: 'Ukraine', nameAr: 'أوكرانيا', flag: '🇺🇦', lang: 'uk' },
  { code: 'ru', name: 'Russia', nameAr: 'روسيا', flag: '🇷🇺', lang: 'ru' },
  { code: 'by', name: 'Belarus', nameAr: 'بيلاروسيا', flag: '🇧🇾', lang: 'be' },

  /* ============== Greek / Balkan =========================================== */
  { code: 'gr', name: 'Greece', nameAr: 'اليونان', flag: '🇬🇷', lang: 'el' },
  { code: 'cy', name: 'Cyprus', nameAr: 'قبرص', flag: '🇨🇾', lang: 'el' },

  /* ============== Turkic / Caucasus / Central Asia ========================= */
  { code: 'tr', name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷', lang: 'tr' },
  {
    code: 'az',
    name: 'Azerbaijan',
    nameAr: 'أذربيجان',
    flag: '🇦🇿',
    lang: 'az',
  },
  {
    code: 'kz',
    name: 'Kazakhstan',
    nameAr: 'كازاخستان',
    flag: '🇰🇿',
    lang: 'kk',
  },
  {
    code: 'uz',
    name: 'Uzbekistan',
    nameAr: 'أوزبكستان',
    flag: '🇺🇿',
    lang: 'uz',
  },
  {
    code: 'kg',
    name: 'Kyrgyzstan',
    nameAr: 'قيرغيزستان',
    flag: '🇰🇬',
    lang: 'ky',
  },
  {
    code: 'tj',
    name: 'Tajikistan',
    nameAr: 'طاجيكستان',
    flag: '🇹🇯',
    lang: 'tg',
  },
  {
    code: 'tm',
    name: 'Turkmenistan',
    nameAr: 'تركمانستان',
    flag: '🇹🇲',
    lang: 'tk',
  },
  { code: 'am', name: 'Armenia', nameAr: 'أرمينيا', flag: '🇦🇲', lang: 'hy' },
  { code: 'ge', name: 'Georgia', nameAr: 'جورجيا', flag: '🇬🇪', lang: 'ka' },
  { code: 'mn', name: 'Mongolia', nameAr: 'منغوليا', flag: '🇲🇳', lang: 'mn' },

  /* ============== East Asia ================================================ */
  { code: 'jp', name: 'Japan', nameAr: 'اليابان', flag: '🇯🇵', lang: 'ja' },
  {
    code: 'kr',
    name: 'South Korea',
    nameAr: 'كوريا الجنوبية',
    flag: '🇰🇷',
    lang: 'ko',
  },
  { code: 'cn', name: 'China', nameAr: 'الصين', flag: '🇨🇳', lang: 'zh' },
  { code: 'tw', name: 'Taiwan', nameAr: 'تايوان', flag: '🇹🇼', lang: 'zh' },
  { code: 'mo', name: 'Macao', nameAr: 'ماكاو', flag: '🇲🇴', lang: 'zh' },

  /* ============== South / Southeast Asia (non-English) ===================== */
  { code: 'th', name: 'Thailand', nameAr: 'تايلاند', flag: '🇹🇭', lang: 'th' },
  { code: 'vn', name: 'Vietnam', nameAr: 'فيتنام', flag: '🇻🇳', lang: 'vi' },
  {
    code: 'id',
    name: 'Indonesia',
    nameAr: 'إندونيسيا',
    flag: '🇮🇩',
    lang: 'id',
  },
  { code: 'my', name: 'Malaysia', nameAr: 'ماليزيا', flag: '🇲🇾', lang: 'ms' },
  { code: 'mm', name: 'Myanmar', nameAr: 'ميانمار', flag: '🇲🇲', lang: 'my' },
  { code: 'kh', name: 'Cambodia', nameAr: 'كمبوديا', flag: '🇰🇭', lang: 'km' },
  { code: 'la', name: 'Laos', nameAr: 'لاوس', flag: '🇱🇦', lang: 'lo' },
  { code: 'np', name: 'Nepal', nameAr: 'نيبال', flag: '🇳🇵', lang: 'ne' },

  /* ============== Africa (non-Arabic) ====================================== */
  { code: 'tz', name: 'Tanzania', nameAr: 'تنزانيا', flag: '🇹🇿', lang: 'sw' },
  { code: 'ug', name: 'Uganda', nameAr: 'أوغندا', flag: '🇺🇬', lang: 'sw' },
  { code: 'zw', name: 'Zimbabwe', nameAr: 'زيمبابوي', flag: '🇿🇼', lang: 'en' },
  { code: 'bw', name: 'Botswana', nameAr: 'بوتسوانا', flag: '🇧🇼', lang: 'en' },
  {
    code: 'mu',
    name: 'Mauritius',
    nameAr: 'موريشيوس',
    flag: '🇲🇺',
    lang: 'fr',
  },
  { code: 'et', name: 'Ethiopia', nameAr: 'إثيوبيا', flag: '🇪🇹', lang: 'am' },
  { code: 'rw', name: 'Rwanda', nameAr: 'رواندا', flag: '🇷🇼', lang: 'rw' },
  { code: 'cm', name: 'Cameroon', nameAr: 'الكاميرون', flag: '🇨🇲', lang: 'fr' },
  { code: 'cd', name: 'DR Congo', nameAr: 'الكونغو', flag: '🇨🇩', lang: 'fr' },
  {
    code: 'mg',
    name: 'Madagascar',
    nameAr: 'مدغشقر',
    flag: '🇲🇬',
    lang: 'mg',
  },
  { code: 'na', name: 'Namibia', nameAr: 'ناميبيا', flag: '🇳🇦', lang: 'en' },

  /* ============== Caribbean & Central America ============================== */
  {
    code: 'tt',
    name: 'Trinidad & Tobago',
    nameAr: 'ترينيداد وتوباغو',
    flag: '🇹🇹',
    lang: 'en',
  },
  { code: 'bs', name: 'Bahamas', nameAr: 'الباهاما', flag: '🇧🇸', lang: 'en' },
  { code: 'bb', name: 'Barbados', nameAr: 'بربادوس', flag: '🇧🇧', lang: 'en' },
  { code: 'bz', name: 'Belize', nameAr: 'بليز', flag: '🇧🇿', lang: 'en' },
  { code: 'cu', name: 'Cuba', nameAr: 'كوبا', flag: '🇨🇺', lang: 'es' },

  /* ============== Other ==================================================== */
  { code: 'il', name: 'Israel', nameAr: 'إسرائيل', flag: '🇮🇱', lang: 'he' },
  { code: 'ir', name: 'Iran', nameAr: 'إيران', flag: '🇮🇷', lang: 'fa' },
  {
    code: 'af',
    name: 'Afghanistan',
    nameAr: 'أفغانستان',
    flag: '🇦🇫',
    lang: 'fa',
  },
];

/**
 * Region groupings, used by the discovery page's "Region" picker to
 * fan out a single query across every country whose primary content
 * language matches. Each region keeps a curated, ordered list of
 * country codes — top entries are the language's largest podcast
 * markets, so the merged result is biased towards podcasts that
 * actually rank somewhere.
 */
export interface PodcastRegion {
  /** Stable internal key used in URLs / state. */
  key: string;
  /** Translation key: `podcasts.region.<key>`. */
  labelKey: string;
  /** Country codes to fan out across (in priority order). */
  countries: string[];
  /** Optional emoji rendered next to the label. */
  flag?: string;
}

export const podcastRegions: PodcastRegion[] = [
  {
    key: 'arabic',
    labelKey: 'podcasts.region.arabic',
    flag: '🌍',
    countries: [
      'sa',
      'ae',
      'eg',
      'kw',
      'qa',
      'bh',
      'om',
      'jo',
      'lb',
      'iq',
      'ma',
      'dz',
      'tn',
      'ye',
      'ly',
    ],
  },
  {
    key: 'english',
    labelKey: 'podcasts.region.english',
    flag: '🌐',
    countries: [
      'us',
      'gb',
      'ca',
      'au',
      'ie',
      'nz',
      'za',
      'sg',
      'in',
      'ng',
      'ke',
      'ph',
      'gh',
      'jm',
      'tt',
      'na',
      'bw',
      'zw',
    ],
  },
  {
    key: 'german',
    labelKey: 'podcasts.region.german',
    flag: '🇪🇺',
    countries: ['de', 'at', 'ch', 'lu'],
  },
  {
    key: 'french',
    labelKey: 'podcasts.region.french',
    flag: '🇫🇷',
    countries: ['fr', 'be', 'ca', 'ci', 'sn', 'cm', 'cd', 'mu', 'mg'],
  },
  {
    key: 'spanish',
    labelKey: 'podcasts.region.spanish',
    flag: '🌎',
    countries: [
      'es',
      'mx',
      'ar',
      'cl',
      'co',
      'pe',
      've',
      'uy',
      'ec',
      'cr',
      'do',
      'gt',
      'pa',
      'bo',
      'hn',
      'ni',
      'py',
      'sv',
      'cu',
    ],
  },
  {
    key: 'portuguese',
    labelKey: 'podcasts.region.portuguese',
    flag: '🇵🇹',
    countries: ['pt', 'br', 'ao', 'mz'],
  },
  {
    key: 'italian',
    labelKey: 'podcasts.region.italian',
    flag: '🇮🇹',
    countries: ['it'],
  },
  {
    key: 'dutch',
    labelKey: 'podcasts.region.dutch',
    flag: '🇳🇱',
    countries: ['nl', 'be'],
  },
  {
    key: 'nordic',
    labelKey: 'podcasts.region.nordic',
    flag: '🌨️',
    countries: ['se', 'no', 'dk', 'fi', 'is'],
  },
  {
    key: 'eastern-europe',
    labelKey: 'podcasts.region.easternEurope',
    flag: '🇪🇺',
    countries: ['pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'hr', 'ua', 'ru', 'si', 'ee', 'lv', 'lt', 'by'],
  },
  {
    key: 'east-asia',
    labelKey: 'podcasts.region.eastAsia',
    flag: '🌏',
    countries: ['jp', 'kr', 'cn', 'tw', 'hk', 'mo'],
  },
  {
    key: 'south-asia',
    labelKey: 'podcasts.region.southAsia',
    flag: '🌏',
    countries: ['in', 'pk', 'bd', 'lk', 'np'],
  },
  {
    key: 'southeast-asia',
    labelKey: 'podcasts.region.southeastAsia',
    flag: '🌏',
    countries: ['id', 'my', 'th', 'vn', 'ph', 'sg', 'mm', 'kh', 'la'],
  },
  {
    key: 'turkic',
    labelKey: 'podcasts.region.turkic',
    flag: '🇹🇷',
    countries: ['tr', 'az', 'kz', 'uz', 'kg', 'tm', 'tj'],
  },
  {
    key: 'persian',
    labelKey: 'podcasts.region.persian',
    flag: '🇮🇷',
    countries: ['ir', 'af', 'tj'],
  },
  {
    key: 'african',
    labelKey: 'podcasts.region.african',
    flag: '🌍',
    countries: ['ng', 'ke', 'gh', 'za', 'tz', 'ug', 'et', 'rw', 'cm', 'sn', 'ci', 'zw', 'bw', 'na'],
  },
  {
    key: 'caribbean',
    labelKey: 'podcasts.region.caribbean',
    flag: '🏝️',
    countries: ['jm', 'tt', 'bs', 'bb', 'bz', 'do', 'cu'],
  },
  {
    key: 'worldwide',
    labelKey: 'podcasts.region.worldwide',
    flag: '🌍',
    // Picking the largest 15 podcast markets across all languages
    countries: [
      'us',
      'gb',
      'de',
      'fr',
      'es',
      'it',
      'br',
      'mx',
      'jp',
      'in',
      'sa',
      'ae',
      'kr',
      'au',
      'ca',
    ],
  },
];

/** Resolve a saved country code back to its catalog entry; falls back to SA. */
export function findCountry(code: string | null | undefined): PodcastCountry {
  return podcastCountries.find((c) => c.code === code?.toLowerCase()) ?? podcastCountries[0];
}

/** Resolve a saved region key back to its catalog entry; returns null if unknown. */
export function findRegion(key: string | null | undefined): PodcastRegion | null {
  return podcastRegions.find((r) => r.key === key) ?? null;
}
