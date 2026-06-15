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
  /** Localized German name. */
  nameDe: string;
  /** Flag emoji (regional indicators). */
  flag: string;
  /** Primary content language (BCP-47 short). Drives region grouping. */
  lang: string;
}

export const podcastCountries: PodcastCountry[] = [
  /* ============== Arabic-speaking (default region for this app) ============ */
  { code: 'sa', name: 'Saudi Arabia',         nameAr: 'السعودية',         nameDe: 'Saudi-Arabien',         flag: '🇸🇦', lang: 'ar' },
  { code: 'ae', name: 'United Arab Emirates', nameAr: 'الإمارات',         nameDe: 'VAE',                   flag: '🇦🇪', lang: 'ar' },
  { code: 'eg', name: 'Egypt',                nameAr: 'مصر',              nameDe: 'Ägypten',               flag: '🇪🇬', lang: 'ar' },
  { code: 'kw', name: 'Kuwait',               nameAr: 'الكويت',           nameDe: 'Kuwait',                flag: '🇰🇼', lang: 'ar' },
  { code: 'qa', name: 'Qatar',                nameAr: 'قطر',              nameDe: 'Katar',                 flag: '🇶🇦', lang: 'ar' },
  { code: 'bh', name: 'Bahrain',              nameAr: 'البحرين',          nameDe: 'Bahrain',               flag: '🇧🇭', lang: 'ar' },
  { code: 'om', name: 'Oman',                 nameAr: 'عُمان',             nameDe: 'Oman',                  flag: '🇴🇲', lang: 'ar' },
  { code: 'jo', name: 'Jordan',               nameAr: 'الأردن',           nameDe: 'Jordanien',             flag: '🇯🇴', lang: 'ar' },
  { code: 'lb', name: 'Lebanon',              nameAr: 'لبنان',            nameDe: 'Libanon',               flag: '🇱🇧', lang: 'ar' },
  { code: 'iq', name: 'Iraq',                 nameAr: 'العراق',           nameDe: 'Irak',                  flag: '🇮🇶', lang: 'ar' },
  { code: 'ye', name: 'Yemen',                nameAr: 'اليمن',            nameDe: 'Jemen',                 flag: '🇾🇪', lang: 'ar' },
  { code: 'ma', name: 'Morocco',              nameAr: 'المغرب',           nameDe: 'Marokko',               flag: '🇲🇦', lang: 'ar' },
  { code: 'dz', name: 'Algeria',              nameAr: 'الجزائر',          nameDe: 'Algerien',              flag: '🇩🇿', lang: 'ar' },
  { code: 'tn', name: 'Tunisia',              nameAr: 'تونس',             nameDe: 'Tunesien',              flag: '🇹🇳', lang: 'ar' },
  { code: 'ly', name: 'Libya',                nameAr: 'ليبيا',            nameDe: 'Libyen',                flag: '🇱🇾', lang: 'ar' },

  /* ============== German-speaking ========================================== */
  { code: 'de', name: 'Germany',              nameAr: 'ألمانيا',          nameDe: 'Deutschland',           flag: '🇩🇪', lang: 'de' },
  { code: 'at', name: 'Austria',              nameAr: 'النمسا',           nameDe: 'Österreich',            flag: '🇦🇹', lang: 'de' },
  { code: 'ch', name: 'Switzerland',          nameAr: 'سويسرا',           nameDe: 'Schweiz',               flag: '🇨🇭', lang: 'de' },
  { code: 'lu', name: 'Luxembourg',           nameAr: 'لوكسمبورغ',        nameDe: 'Luxemburg',             flag: '🇱🇺', lang: 'de' },

  /* ============== English-speaking ========================================= */
  { code: 'us', name: 'United States',        nameAr: 'الولايات المتحدة', nameDe: 'USA',                   flag: '🇺🇸', lang: 'en' },
  { code: 'gb', name: 'United Kingdom',       nameAr: 'المملكة المتحدة',  nameDe: 'Vereinigtes Königr.',   flag: '🇬🇧', lang: 'en' },
  { code: 'ca', name: 'Canada',               nameAr: 'كندا',             nameDe: 'Kanada',                flag: '🇨🇦', lang: 'en' },
  { code: 'au', name: 'Australia',            nameAr: 'أستراليا',         nameDe: 'Australien',            flag: '🇦🇺', lang: 'en' },
  { code: 'ie', name: 'Ireland',              nameAr: 'أيرلندا',          nameDe: 'Irland',                flag: '🇮🇪', lang: 'en' },
  { code: 'nz', name: 'New Zealand',          nameAr: 'نيوزيلندا',        nameDe: 'Neuseeland',            flag: '🇳🇿', lang: 'en' },
  { code: 'za', name: 'South Africa',         nameAr: 'جنوب أفريقيا',     nameDe: 'Südafrika',             flag: '🇿🇦', lang: 'en' },
  { code: 'sg', name: 'Singapore',            nameAr: 'سنغافورة',         nameDe: 'Singapur',              flag: '🇸🇬', lang: 'en' },
  { code: 'hk', name: 'Hong Kong',            nameAr: 'هونغ كونغ',        nameDe: 'Hongkong',              flag: '🇭🇰', lang: 'en' },
  { code: 'ph', name: 'Philippines',          nameAr: 'الفلبين',          nameDe: 'Philippinen',           flag: '🇵🇭', lang: 'en' },
  { code: 'ng', name: 'Nigeria',              nameAr: 'نيجيريا',          nameDe: 'Nigeria',               flag: '🇳🇬', lang: 'en' },
  { code: 'ke', name: 'Kenya',                nameAr: 'كينيا',            nameDe: 'Kenia',                 flag: '🇰🇪', lang: 'en' },
  { code: 'gh', name: 'Ghana',                nameAr: 'غانا',             nameDe: 'Ghana',                 flag: '🇬🇭', lang: 'en' },
  { code: 'mt', name: 'Malta',                nameAr: 'مالطا',            nameDe: 'Malta',                 flag: '🇲🇹', lang: 'en' },
  { code: 'jm', name: 'Jamaica',              nameAr: 'جامايكا',          nameDe: 'Jamaika',               flag: '🇯🇲', lang: 'en' },
  { code: 'in', name: 'India',                nameAr: 'الهند',            nameDe: 'Indien',                flag: '🇮🇳', lang: 'en' },
  { code: 'pk', name: 'Pakistan',             nameAr: 'باكستان',          nameDe: 'Pakistan',              flag: '🇵🇰', lang: 'en' },
  { code: 'lk', name: 'Sri Lanka',            nameAr: 'سريلانكا',         nameDe: 'Sri Lanka',             flag: '🇱🇰', lang: 'en' },
  { code: 'bd', name: 'Bangladesh',           nameAr: 'بنغلاديش',         nameDe: 'Bangladesch',           flag: '🇧🇩', lang: 'en' },

  /* ============== French-speaking ========================================== */
  { code: 'fr', name: 'France',               nameAr: 'فرنسا',            nameDe: 'Frankreich',            flag: '🇫🇷', lang: 'fr' },
  { code: 'be', name: 'Belgium',              nameAr: 'بلجيكا',           nameDe: 'Belgien',               flag: '🇧🇪', lang: 'fr' },
  { code: 'sn', name: 'Senegal',              nameAr: 'السنغال',          nameDe: 'Senegal',               flag: '🇸🇳', lang: 'fr' },
  { code: 'ci', name: 'Côte d\u2019Ivoire',   nameAr: 'ساحل العاج',       nameDe: 'Elfenbeinküste',        flag: '🇨🇮', lang: 'fr' },

  /* ============== Spanish-speaking ========================================= */
  { code: 'es', name: 'Spain',                nameAr: 'إسبانيا',          nameDe: 'Spanien',               flag: '🇪🇸', lang: 'es' },
  { code: 'mx', name: 'Mexico',               nameAr: 'المكسيك',          nameDe: 'Mexiko',                flag: '🇲🇽', lang: 'es' },
  { code: 'ar', name: 'Argentina',            nameAr: 'الأرجنتين',        nameDe: 'Argentinien',           flag: '🇦🇷', lang: 'es' },
  { code: 'cl', name: 'Chile',                nameAr: 'تشيلي',            nameDe: 'Chile',                 flag: '🇨🇱', lang: 'es' },
  { code: 'co', name: 'Colombia',             nameAr: 'كولومبيا',         nameDe: 'Kolumbien',             flag: '🇨🇴', lang: 'es' },
  { code: 'pe', name: 'Peru',                 nameAr: 'بيرو',             nameDe: 'Peru',                  flag: '🇵🇪', lang: 'es' },
  { code: 've', name: 'Venezuela',            nameAr: 'فنزويلا',          nameDe: 'Venezuela',             flag: '🇻🇪', lang: 'es' },
  { code: 'uy', name: 'Uruguay',              nameAr: 'أوروغواي',         nameDe: 'Uruguay',               flag: '🇺🇾', lang: 'es' },
  { code: 'ec', name: 'Ecuador',              nameAr: 'الإكوادور',        nameDe: 'Ecuador',               flag: '🇪🇨', lang: 'es' },
  { code: 'bo', name: 'Bolivia',              nameAr: 'بوليفيا',          nameDe: 'Bolivien',              flag: '🇧🇴', lang: 'es' },
  { code: 'cr', name: 'Costa Rica',           nameAr: 'كوستاريكا',        nameDe: 'Costa Rica',            flag: '🇨🇷', lang: 'es' },
  { code: 'do', name: 'Dominican Republic',   nameAr: 'الدومينيكان',      nameDe: 'Dominikanische Rep.',   flag: '🇩🇴', lang: 'es' },
  { code: 'gt', name: 'Guatemala',            nameAr: 'غواتيمالا',        nameDe: 'Guatemala',             flag: '🇬🇹', lang: 'es' },
  { code: 'hn', name: 'Honduras',             nameAr: 'هندوراس',          nameDe: 'Honduras',              flag: '🇭🇳', lang: 'es' },
  { code: 'ni', name: 'Nicaragua',            nameAr: 'نيكاراغوا',        nameDe: 'Nicaragua',             flag: '🇳🇮', lang: 'es' },
  { code: 'pa', name: 'Panama',               nameAr: 'بنما',             nameDe: 'Panama',                flag: '🇵🇦', lang: 'es' },
  { code: 'py', name: 'Paraguay',             nameAr: 'باراغواي',         nameDe: 'Paraguay',              flag: '🇵🇾', lang: 'es' },
  { code: 'sv', name: 'El Salvador',          nameAr: 'السلفادور',        nameDe: 'El Salvador',           flag: '🇸🇻', lang: 'es' },

  /* ============== Portuguese-speaking ====================================== */
  { code: 'pt', name: 'Portugal',             nameAr: 'البرتغال',         nameDe: 'Portugal',              flag: '🇵🇹', lang: 'pt' },
  { code: 'br', name: 'Brazil',               nameAr: 'البرازيل',         nameDe: 'Brasilien',             flag: '🇧🇷', lang: 'pt' },
  { code: 'ao', name: 'Angola',               nameAr: 'أنغولا',           nameDe: 'Angola',                flag: '🇦🇴', lang: 'pt' },
  { code: 'mz', name: 'Mozambique',           nameAr: 'موزمبيق',          nameDe: 'Mosambik',              flag: '🇲🇿', lang: 'pt' },

  /* ============== Italian ================================================== */
  { code: 'it', name: 'Italy',                nameAr: 'إيطاليا',          nameDe: 'Italien',               flag: '🇮🇹', lang: 'it' },

  /* ============== Dutch ==================================================== */
  { code: 'nl', name: 'Netherlands',          nameAr: 'هولندا',           nameDe: 'Niederlande',           flag: '🇳🇱', lang: 'nl' },

  /* ============== Nordic ==================================================== */
  { code: 'se', name: 'Sweden',               nameAr: 'السويد',           nameDe: 'Schweden',              flag: '🇸🇪', lang: 'sv' },
  { code: 'no', name: 'Norway',               nameAr: 'النرويج',          nameDe: 'Norwegen',              flag: '🇳🇴', lang: 'no' },
  { code: 'dk', name: 'Denmark',              nameAr: 'الدنمارك',         nameDe: 'Dänemark',              flag: '🇩🇰', lang: 'da' },
  { code: 'fi', name: 'Finland',              nameAr: 'فنلندا',           nameDe: 'Finnland',              flag: '🇫🇮', lang: 'fi' },
  { code: 'is', name: 'Iceland',              nameAr: 'آيسلندا',          nameDe: 'Island',                flag: '🇮🇸', lang: 'is' },

  /* ============== Eastern Europe / Slavic ================================== */
  { code: 'pl', name: 'Poland',               nameAr: 'بولندا',           nameDe: 'Polen',                 flag: '🇵🇱', lang: 'pl' },
  { code: 'cz', name: 'Czechia',              nameAr: 'التشيك',           nameDe: 'Tschechien',            flag: '🇨🇿', lang: 'cs' },
  { code: 'sk', name: 'Slovakia',             nameAr: 'سلوفاكيا',         nameDe: 'Slowakei',              flag: '🇸🇰', lang: 'sk' },
  { code: 'hu', name: 'Hungary',              nameAr: 'المجر',            nameDe: 'Ungarn',                flag: '🇭🇺', lang: 'hu' },
  { code: 'ro', name: 'Romania',              nameAr: 'رومانيا',          nameDe: 'Rumänien',              flag: '🇷🇴', lang: 'ro' },
  { code: 'bg', name: 'Bulgaria',             nameAr: 'بلغاريا',          nameDe: 'Bulgarien',             flag: '🇧🇬', lang: 'bg' },
  { code: 'hr', name: 'Croatia',              nameAr: 'كرواتيا',          nameDe: 'Kroatien',              flag: '🇭🇷', lang: 'hr' },
  { code: 'si', name: 'Slovenia',             nameAr: 'سلوفينيا',         nameDe: 'Slowenien',             flag: '🇸🇮', lang: 'sl' },
  { code: 'ee', name: 'Estonia',              nameAr: 'إستونيا',          nameDe: 'Estland',               flag: '🇪🇪', lang: 'et' },
  { code: 'lv', name: 'Latvia',               nameAr: 'لاتفيا',           nameDe: 'Lettland',              flag: '🇱🇻', lang: 'lv' },
  { code: 'lt', name: 'Lithuania',            nameAr: 'ليتوانيا',         nameDe: 'Litauen',               flag: '🇱🇹', lang: 'lt' },
  { code: 'ua', name: 'Ukraine',              nameAr: 'أوكرانيا',         nameDe: 'Ukraine',               flag: '🇺🇦', lang: 'uk' },
  { code: 'ru', name: 'Russia',               nameAr: 'روسيا',            nameDe: 'Russland',              flag: '🇷🇺', lang: 'ru' },
  { code: 'by', name: 'Belarus',              nameAr: 'بيلاروسيا',        nameDe: 'Belarus',               flag: '🇧🇾', lang: 'be' },

  /* ============== Greek / Balkan =========================================== */
  { code: 'gr', name: 'Greece',               nameAr: 'اليونان',          nameDe: 'Griechenland',          flag: '🇬🇷', lang: 'el' },
  { code: 'cy', name: 'Cyprus',               nameAr: 'قبرص',             nameDe: 'Zypern',                flag: '🇨🇾', lang: 'el' },

  /* ============== Turkic / Caucasus / Central Asia ========================= */
  { code: 'tr', name: 'Turkey',               nameAr: 'تركيا',            nameDe: 'Türkei',                flag: '🇹🇷', lang: 'tr' },
  { code: 'az', name: 'Azerbaijan',           nameAr: 'أذربيجان',         nameDe: 'Aserbaidschan',         flag: '🇦🇿', lang: 'az' },
  { code: 'kz', name: 'Kazakhstan',           nameAr: 'كازاخستان',        nameDe: 'Kasachstan',            flag: '🇰🇿', lang: 'kk' },
  { code: 'uz', name: 'Uzbekistan',           nameAr: 'أوزبكستان',        nameDe: 'Usbekistan',            flag: '🇺🇿', lang: 'uz' },
  { code: 'kg', name: 'Kyrgyzstan',           nameAr: 'قيرغيزستان',       nameDe: 'Kirgisistan',           flag: '🇰🇬', lang: 'ky' },
  { code: 'tj', name: 'Tajikistan',           nameAr: 'طاجيكستان',        nameDe: 'Tadschikistan',         flag: '🇹🇯', lang: 'tg' },
  { code: 'tm', name: 'Turkmenistan',         nameAr: 'تركمانستان',       nameDe: 'Turkmenistan',          flag: '🇹🇲', lang: 'tk' },
  { code: 'am', name: 'Armenia',              nameAr: 'أرمينيا',          nameDe: 'Armenien',              flag: '🇦🇲', lang: 'hy' },
  { code: 'ge', name: 'Georgia',              nameAr: 'جورجيا',           nameDe: 'Georgien',              flag: '🇬🇪', lang: 'ka' },
  { code: 'mn', name: 'Mongolia',             nameAr: 'منغوليا',          nameDe: 'Mongolei',              flag: '🇲🇳', lang: 'mn' },

  /* ============== East Asia ================================================ */
  { code: 'jp', name: 'Japan',                nameAr: 'اليابان',          nameDe: 'Japan',                 flag: '🇯🇵', lang: 'ja' },
  { code: 'kr', name: 'South Korea',          nameAr: 'كوريا الجنوبية',   nameDe: 'Südkorea',              flag: '🇰🇷', lang: 'ko' },
  { code: 'cn', name: 'China',                nameAr: 'الصين',            nameDe: 'China',                 flag: '🇨🇳', lang: 'zh' },
  { code: 'tw', name: 'Taiwan',               nameAr: 'تايوان',           nameDe: 'Taiwan',                flag: '🇹🇼', lang: 'zh' },
  { code: 'mo', name: 'Macao',                nameAr: 'ماكاو',            nameDe: 'Macau',                 flag: '🇲🇴', lang: 'zh' },

  /* ============== South / Southeast Asia (non-English) ===================== */
  { code: 'th', name: 'Thailand',             nameAr: 'تايلاند',          nameDe: 'Thailand',              flag: '🇹🇭', lang: 'th' },
  { code: 'vn', name: 'Vietnam',              nameAr: 'فيتنام',           nameDe: 'Vietnam',               flag: '🇻🇳', lang: 'vi' },
  { code: 'id', name: 'Indonesia',            nameAr: 'إندونيسيا',        nameDe: 'Indonesien',            flag: '🇮🇩', lang: 'id' },
  { code: 'my', name: 'Malaysia',             nameAr: 'ماليزيا',          nameDe: 'Malaysia',              flag: '🇲🇾', lang: 'ms' },
  { code: 'mm', name: 'Myanmar',              nameAr: 'ميانمار',          nameDe: 'Myanmar',               flag: '🇲🇲', lang: 'my' },
  { code: 'kh', name: 'Cambodia',             nameAr: 'كمبوديا',          nameDe: 'Kambodscha',            flag: '🇰🇭', lang: 'km' },
  { code: 'la', name: 'Laos',                 nameAr: 'لاوس',             nameDe: 'Laos',                  flag: '🇱🇦', lang: 'lo' },
  { code: 'np', name: 'Nepal',                nameAr: 'نيبال',            nameDe: 'Nepal',                 flag: '🇳🇵', lang: 'ne' },

  /* ============== Africa (non-Arabic) ====================================== */
  { code: 'tz', name: 'Tanzania',             nameAr: 'تنزانيا',          nameDe: 'Tansania',              flag: '🇹🇿', lang: 'sw' },
  { code: 'ug', name: 'Uganda',               nameAr: 'أوغندا',           nameDe: 'Uganda',                flag: '🇺🇬', lang: 'sw' },
  { code: 'zw', name: 'Zimbabwe',             nameAr: 'زيمبابوي',         nameDe: 'Simbabwe',              flag: '🇿🇼', lang: 'en' },
  { code: 'bw', name: 'Botswana',             nameAr: 'بوتسوانا',         nameDe: 'Botswana',              flag: '🇧🇼', lang: 'en' },
  { code: 'mu', name: 'Mauritius',            nameAr: 'موريشيوس',         nameDe: 'Mauritius',             flag: '🇲🇺', lang: 'fr' },
  { code: 'et', name: 'Ethiopia',             nameAr: 'إثيوبيا',          nameDe: 'Äthiopien',             flag: '🇪🇹', lang: 'am' },
  { code: 'rw', name: 'Rwanda',               nameAr: 'رواندا',           nameDe: 'Ruanda',                flag: '🇷🇼', lang: 'rw' },
  { code: 'cm', name: 'Cameroon',             nameAr: 'الكاميرون',        nameDe: 'Kamerun',               flag: '🇨🇲', lang: 'fr' },
  { code: 'cd', name: 'DR Congo',             nameAr: 'الكونغو',          nameDe: 'DR Kongo',              flag: '🇨🇩', lang: 'fr' },
  { code: 'mg', name: 'Madagascar',           nameAr: 'مدغشقر',           nameDe: 'Madagaskar',            flag: '🇲🇬', lang: 'mg' },
  { code: 'na', name: 'Namibia',              nameAr: 'ناميبيا',          nameDe: 'Namibia',               flag: '🇳🇦', lang: 'en' },

  /* ============== Caribbean & Central America ============================== */
  { code: 'tt', name: 'Trinidad & Tobago',    nameAr: 'ترينيداد وتوباغو', nameDe: 'Trinidad & Tobago',     flag: '🇹🇹', lang: 'en' },
  { code: 'bs', name: 'Bahamas',              nameAr: 'الباهاما',         nameDe: 'Bahamas',               flag: '🇧🇸', lang: 'en' },
  { code: 'bb', name: 'Barbados',             nameAr: 'بربادوس',          nameDe: 'Barbados',              flag: '🇧🇧', lang: 'en' },
  { code: 'bz', name: 'Belize',              nameAr: 'بليز',             nameDe: 'Belize',                flag: '🇧🇿', lang: 'en' },
  { code: 'cu', name: 'Cuba',                 nameAr: 'كوبا',             nameDe: 'Kuba',                  flag: '🇨🇺', lang: 'es' },

  /* ============== Other ==================================================== */
  { code: 'il', name: 'Israel',               nameAr: 'إسرائيل',          nameDe: 'Israel',                flag: '🇮🇱', lang: 'he' },
  { code: 'ir', name: 'Iran',                 nameAr: 'إيران',            nameDe: 'Iran',                  flag: '🇮🇷', lang: 'fa' },
  { code: 'af', name: 'Afghanistan',          nameAr: 'أفغانستان',        nameDe: 'Afghanistan',           flag: '🇦🇫', lang: 'fa' },
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
    countries: ['sa', 'ae', 'eg', 'kw', 'qa', 'bh', 'om', 'jo', 'lb', 'iq', 'ma', 'dz', 'tn', 'ye', 'ly'],
  },
  {
    key: 'english',
    labelKey: 'podcasts.region.english',
    flag: '🌐',
    countries: ['us', 'gb', 'ca', 'au', 'ie', 'nz', 'za', 'sg', 'in', 'ng', 'ke', 'ph', 'gh', 'jm', 'tt', 'na', 'bw', 'zw'],
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
    countries: ['es', 'mx', 'ar', 'cl', 'co', 'pe', 've', 'uy', 'ec', 'cr', 'do', 'gt', 'pa', 'bo', 'hn', 'ni', 'py', 'sv', 'cu'],
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
    countries: ['us', 'gb', 'de', 'fr', 'es', 'it', 'br', 'mx', 'jp', 'in', 'sa', 'ae', 'kr', 'au', 'ca'],
  },
];

/** Resolve a saved country code back to its catalog entry; falls back to SA. */
export function findCountry(code: string | null | undefined): PodcastCountry {
  return podcastCountries.find(c => c.code === code?.toLowerCase()) ?? podcastCountries[0];
}

/** Resolve a saved region key back to its catalog entry; returns null if unknown. */
export function findRegion(key: string | null | undefined): PodcastRegion | null {
  return podcastRegions.find(r => r.key === key) ?? null;
}
