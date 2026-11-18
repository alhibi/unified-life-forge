# مصفوفة تغطية المسارات — Route × Feature × Grammar × States × Viewport × Theme

> مرجع تشغيلي مشتق من الشيفرة، لا من خريطة قديمة. يُحدَّث مع كل مسار جديد أو
> تغيير في قاعدته. المرجع البصري: [DESIGN.md](../../DESIGN.md).

- **تاريخ الجرد:** 2026-11-18 · **المراجعة:** `7e34f503` · **الفرع:** `design-refoundation`
- **طريقة العدّ:** `grep 'path="' src/App.tsx` ثم مطابقة كل `<Route>` بمكوّن الصفحة
  عبر `lazy(loadX)` و`import()`. العدد النهائي: **82 مساراً منتجياً + سطح تطوير واحد** في 73 ملف صفحة.
- **التحقق البصري:** 10 مسارات ملتقطة في `verification/design/before/` على
  360×800 و768×1024 و1440×900، فاتح وداكن، ثيم `expressive`. الباقي **غير
  مُتحقَّق بصرياً بعد** (انظر §6).

## 0. ملخص الأرقام

| البند | العدد |
|---|---|
| مسارات منتجية | 82 |
| أسطح تطوير | 1 (/dev/design-system) |
| ملفات صفحات فريدة | 73 |
| مسارات ديناميكية (`:`) | 10 |
| تحويلات (redirect) | 4 (`/index`, `/now`, `/settings/theme`, `/settings/font`) |
| أسماء بديلة لنفس الصفحة | 2 (`/profile` ≈ `/settings/profile`, `/crypto/` = `/crypto`) |
| تبويبات دائمة | 3 (`/`, `/games`, `/chat`) |
| مسارات داخلية/تطويرية | 2 (`/dev/material-preview`, `/.lovable/oauth/consent`) + `*` |
| عائلات المجالات | 26 |

## 1. القواعد السبع (Page Grammars)

| الرمز | القاعدة | الهيكل الملزم | الحالات الأساسية |
|---|---|---|---|
| **G1** | بوابة/نظرة عامة | ترويسة هوية/وصول + منطقة اليوم + أقسام/شبكة + لوحة تفاصيل على الواسع | تحميل، بلا مثبّت، ممتلئ، خطأ شبكة، بلا اتصال |
| **G2** | تحريري/قراءة | `PageHeader display` + عمود قراءة + فهرس/أدوات + تنقّل فصول | تحميل، فارغ، خطأ، ممتلئ، إعدادات القارئ |
| **G3** | بيانات/قياس | ترويسة مضغوطة + قياسات + مخطط/جدول بعرض مساحة العمل + فلاتر | تحميل، إذن مرفوض، خطأ، ممتلئ، فلترة |
| **G4** | قوائم/مراجع/إعدادات/نماذج | ترويسة مضغوطة + `AppList`/`AppRow` أو شبكة مرجعية + بحث | تحميل، فارغ، بحث بلا نتائج، خطأ، حفظ معلّق/فاشل |
| **G5** | محادثة | رأس محادثة + تسلسل زمني + حقل ثابت + حالات شبكة | غير مسجّل، تحميل، محادثة فارغة، إرسال، فشل، بلا اتصال |
| **G6** | خرائط/فضاء | خريطة تملأ الإطار + طبقات/أدوات عائمة + لوحة مكان | تحميل، إذن موقع مرفوض، فارغ، خطأ بلاطات، مكان محدد |
| **G7** | ألعاب/سطح كائني | إطار لعب + تحكم محيط + سجل/تقييم + إعداد | خامل، تشغيل، إيقاف، فوز/خسارة، تلميح، حركة مقلّلة |

**قواعد التصنيف:** القاعدة تُختار من طبيعة المحتوى لا من اسم المجال. صفحة بيانات
داخل مجال تحريري تبقى G3؛ محرّر داخل صفحة قراءة يتبع G4 في أدواته مع بقاء G2
للقراءة. المسار المحوَّل لا قاعدة له.

## 2. مصفوفة العروض والثيمات للتحقق

| المحور | القيم الملزمة |
|---|---|
| العرض | 360×800 · 390×844 · 768×1024 · 1440×900 · 1920×1080 |
| الوضع | فاتح · داكن · OLED أسود (حيث يظهر) |
| الثيم | 14 عائلة؛ الاختبار الكامل للعائلات على المعرض + مسارات عالية الخطورة (`/`, `/settings/appearance`, `/weather`, `/diwan`)؛ بقية المسارات على `expressive` + `copper` + `mono` |
| الحالة | A/B/C لكل تدفّق + فراغ/خطأ/بلا اتصال |
| الحركة | عادي · مقلّل (نظام) · مقلّل (مفتاح داخلي) |

## 3. المصفوفة الكاملة (82 مساراً)

**قراءة الأعمدة:** القاعدة من §1؛ «الحالات» هي الحالات التي يجب أن تملك تصميماً
واختباراً؛ «لقطة» تعني وجود لقطة حالية في `verification/design/before`، لا أنها
غطّت كل الحالات.

### البوابة والتنقّل (4)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 1 | `/` | Portal | `pages/Portal.tsx` | G1 | تحميل · فارغ (لا مثبّت) · ممتلئ · خطأ شبكة · بلا اتصال | البوابة (Portal) — التبويب الرئيسي | ✓ |
| 2 | `/index` | — | `—` | — | — | تحويل إلى البوابة | — |
| 16 | `/browse` | BrowsePage | `pages/Browse.tsx` | G1 | تحميل · فارغ (لا مثبّت) · ممتلئ · خطأ شبكة · بلا اتصال | — | — |
| 78 | `/now` | — | `—` | — | — | تحويل إلى البوابة | — |

### الألعاب (7)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 3 | `/games` | Games | `features/games/pages/Games.tsx` | G1 | تحميل · فارغ (لا مثبّت) · ممتلئ · خطأ شبكة · بلا اتصال | تبويب دائم (Games) | — |
| 35 | `/games/sudoku` | SudokuPage | `features/games/pages/Sudoku.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | — |
| 36 | `/games/chess` | ChessPage | `features/games/pages/Chess.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | ✓ |
| 37 | `/games/chess/puzzles` | ChessPuzzlePage | `features/games/pages/ChessPuzzle.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | — |
| 38 | `/games/chess/career` | ChessCareerPage | `features/games/pages/ChessCareer.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | — |
| 39 | `/games/memory` | MemoryGame | `features/games/pages/MemoryGame.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | — |
| 40 | `/games/memory/adventure` | MemoryAdventurePage | `features/games/pages/MemoryAdventure.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | — |

### المحادثة (4)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 4 | `/chat` | Chat | `features/chat/pages/Chat.tsx` | G5 | غير مسجّل · تحميل · محادثة فارغة · إرسال · فشل إرسال · بلا اتصال | تبويب دائم (Chat) — يتطلب دخولاً | ✓ |
| 5 | `/chat/groups` | GroupsIndexPage | `features/chat/pages/GroupsIndex.tsx` | G5 | غير مسجّل · تحميل · محادثة فارغة · إرسال · فشل إرسال · بلا اتصال | — | — |
| 6 | `/chat/settings` | ChatSettingsPage | `features/chat/pages/ChatSettings.tsx` | G5 | غير مسجّل · تحميل · محادثة فارغة · إرسال · فشل إرسال · بلا اتصال | — | — |
| 7 | `/chat/g/:chatId` | GroupChatPage | `features/chat/pages/GroupChat.tsx` | G5 | غير مسجّل · تحميل · محادثة فارغة · إرسال · فشل إرسال · بلا اتصال | مسار ديناميكي | — |

### الروحانيات (12)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 9 | `/duas` | DuasPage | `features/duas/pages/Duas.tsx` | — | — | تحويل إلى /mihrab (تبويب الذكر) | — |
| 10 | `/quran` | QuranPage | `pages/Quran.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 11 | `/dhikr` | DhikrPage | `pages/Dhikr.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 12 | `/sunnah` | SunnahPage | `pages/Sunnah.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 17 | `/mihrab` | MihrabPage | `pages/Mihrab.tsx` | G1 | تحميل · فارغ (لا مثبّت) · ممتلئ · خطأ شبكة · بلا اتصال | — | ✓ |
| 18 | `/mihrab/prayer-guide` | PrayerGuidePage | `pages/PrayerGuide.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 54 | `/section/timed-sunnah` | TimedSunnahPage | `pages/TimedSunnah.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 55 | `/section/timed-sunnah/:categoryId` | SunnahDetailPage | `pages/SunnahDetail.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | مسار ديناميكي | — |
| 56 | `/section/untimed-sunnah` | UntimedSunnahPage | `pages/UntimedSunnah.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 57 | `/section/prophetic-day` | PropheticDayPage | `pages/PropheticDay.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 58 | `/section/quran-virtues` | QuranVirtuesPage | `pages/QuranVirtues.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 59 | `/tafsir` | TafsirPage | `pages/Tafsir.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |

### الأدب والقراءة والمعرفة (17)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 15 | `/diwan` | DiwanPage | `features/diwan/pages/Diwan.tsx` | G1 | تحميل · فارغ (لا مثبّت) · ممتلئ · خطأ شبكة · بلا اتصال | — | ✓ |
| 20 | `/knowledge` | KnowledgePage | `features/knowledge/pages/Knowledge.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 27 | `/journal` | JournalPage | `features/journal/pages/JournalHome.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 42 | `/reading` | ReadingPage | `pages/Reading.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | ✓ |
| 43 | `/marginalia` | MarginaliaPage | `features/marginalia/pages/Marginalia.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 64 | `/diwan/library` | DiwanLibraryPage | `features/diwan/pages/Library.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 65 | `/diwan/library/search` | DiwanLibrarySearchPage | `features/diwan/pages/LibrarySearch.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 66 | `/diwan/library/poets` | DiwanLibraryPoetsPage | `features/diwan/pages/LibraryPoets.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 67 | `/diwan/library/poet/:slug` | DiwanLibraryPoetPage | `features/diwan/pages/LibraryPoet.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | مسار ديناميكي | — |
| 68 | `/diwan/library/poem/:slug` | DiwanLibraryPoemPage | `features/diwan/pages/LibraryPoem.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | مسار ديناميكي | — |
| 69 | `/diwan/library/favorites` | DiwanLibraryFavoritesPage | `features/diwan/pages/LibraryFavorites.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 70 | `/diwan/bayan` | BayanDashboardPage | `features/diwan/pages/BayanDashboard.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | — | — |
| 71 | `/archive` | ArchiveHomePage | `features/archive/pages/ArchiveHome.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 72 | `/archive/new` | ArchiveNewPage | `features/archive/pages/ArchiveNew.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 73 | `/archive/:id` | ArchiveReaderPage | `features/archive/pages/ArchiveReader.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | مسار ديناميكي | — |
| 74 | `/pkm` | PKMPage | `features/pkm/pages/PKM.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 75 | `/pkm/mind` | MindPage | `features/mind/pages/Mind.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | — |

### البيانات والقياس (7)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 13 | `/wellness` | WellnessPage | `pages/Wellness.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | — | — |
| 14 | `/fitness` | FitnessPage | `pages/Fitness.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | — | — |
| 19 | `/weather` | WeatherPage | `features/weather/pages/Weather.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | — | ✓ |
| 41 | `/occasions` | AllOccasionsPage | `features/calendar/pages/AllOccasions.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | — | — |
| 77 | `/time-ledger` | TimeLedgerPage | `features/time-ledger/pages/TimeLedger.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | — | — |
| 79 | `/crypto` | CryptoWatchlistPage | `features/crypto/pages/CryptoWatchlist.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | — | — |
| 80 | `/crypto/` | CryptoWatchlistPage | `features/crypto/pages/CryptoWatchlist.tsx` | G3 | تحميل · فارغ/إذن مرفوض · خطأ · ممتلئ · فلترة | اسم بديل مع شرطة | — |

### السفر والخرائط (7)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 28 | `/travel-atlas` | TravelAtlasPage | `features/travel-atlas/pages/TravelAtlasPage.tsx` | G6 | تحميل · إذن موقع مرفوض · فارغ · خطأ بلاطات · مكان محدد | — | ✓ |
| 29 | `/travel-atlas/explore` | TravelExplorePage | `features/travel-atlas/pages/ExploreMapPage.tsx` | G6 | تحميل · إذن موقع مرفوض · فارغ · خطأ بلاطات · مكان محدد | — | — |
| 30 | `/travel-atlas/countries` | TravelCountriesPage | `features/travel-atlas/pages/CountryStampsPage.tsx` | G6 | تحميل · إذن موقع مرفوض · فارغ · خطأ بلاطات · مكان محدد | — | — |
| 31 | `/travel-atlas/place/:placeId` | TravelPlacePage | `features/travel-atlas/pages/PlaceDetailPage.tsx` | G6 | تحميل · إذن موقع مرفوض · فارغ · خطأ بلاطات · مكان محدد | مسار ديناميكي | — |
| 32 | `/travel-atlas/trips` | TravelTripsPage | `features/travel-atlas/pages/TripsPage.tsx` | G6 | تحميل · إذن موقع مرفوض · فارغ · خطأ بلاطات · مكان محدد | — | — |
| 33 | `/travel-atlas/trips/:tripId` | TravelTripPage | `features/travel-atlas/pages/TripDetailPage.tsx` | G6 | تحميل · إذن موقع مرفوض · فارغ · خطأ بلاطات · مكان محدد | مسار ديناميكي | — |
| 34 | `/travel-atlas/:countryId` | TravelMapPage | `features/travel-atlas/pages/CountryMapPage.tsx` | G6 | تحميل · إذن موقع مرفوض · فارغ · خطأ بلاطات · مكان محدد | مسار ديناميكي | — |

### الألمانية (6)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 21 | `/german-club` | GermanClubHomePage | `features/german-club/pages/GermanClubHome.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | ✓ |
| 22 | `/german-club/dictionary` | GermanDictionaryPage | `features/german-club/pages/GermanDictionary.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 23 | `/german-club/shelf/:slug` | ShelfDetailPage | `features/german-club/pages/ShelfDetail.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | مسار ديناميكي | — |
| 24 | `/german-club/grammar` | GrammarCornerPage | `features/german-club/pages/GrammarCorner.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 25 | `/german-club/review` | ContentReviewAdminPage | `features/german-club/pages/ContentReviewAdmin.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 26 | `/german-club/wortliste` | GermanWortlistePage | `features/german-club/pages/WortlistePage.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |

### الصوت (4)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 60 | `/podcasts` | PodcastsPage | `features/podcasts/pages/Podcasts.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 61 | `/podcasts/library` | PodcastLibraryPage | `features/podcasts/pages/PodcastLibrary.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 62 | `/podcasts/history` | PodcastHistoryPage | `features/podcasts/pages/History.tsx` | G2 | تحميل · فارغ · خطأ · ممتلئ · إعدادات القارئ | — | — |
| 63 | `/podcasts/:id` | PodcastDetailPage | `features/podcasts/pages/PodcastDetail.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | مسار ديناميكي | — |

### الهوية والإعدادات (11)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 8 | `/settings` | SettingsPage | `pages/Settings.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 44 | `/settings/appearance` | AppearanceSettingsPage | `pages/AppearanceSettings.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | ✓ |
| 45 | `/settings/interface` | InterfaceSettingsPage | `pages/InterfaceSettings.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 46 | `/settings/theme` | — | `—` | — | — | تحويل إلى المظهر | — |
| 47 | `/auth` | AuthPage | `pages/Auth.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 48 | `/settings/profile` | ProfileEditPage | `pages/ProfileEdit.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 49 | `/profile` | ProfileEditPage | `pages/ProfileEdit.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | اسم بديل لصفحة تعديل الملف | — |
| 50 | `/settings/keyboard` | KeyboardSettingsPage | `pages/KeyboardSettings.tsx` | G7 | خامل · تشغيل · إيقاف مؤقت · فوز/خسارة · تلميح · حركة مقلّلة | — | — |
| 51 | `/settings/font` | — | `—` | — | — | تحويل إلى المظهر | — |
| 52 | `/settings/motion` | MotionSettingsPage | `pages/MotionSettings.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |
| 53 | `/settings/prayer` | PrayerSettingsPage | `pages/PrayerSettings.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | — | — |

### داخلي (4)

| # | المسار | الصفحة | الملف | القاعدة | الحالات | ملاحظة | لقطة |
|---|---|---|---|---|---|---|---|
| 76 | `/dev/material-preview` | MaterialPreviewPage | `features/mind/pages/MaterialPreviewPage.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | سطح تطوير/مرجعي | — |
| 81 | `/.lovable/oauth/consent` | OAuthConsentPage | `pages/OAuthConsent.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | تكامل داخلي | — |
| 82 | `*` | NotFound | `pages/NotFound.tsx` | G4 | تحميل · فارغ · بحث بلا نتائج · خطأ · ممتلئ · حفظ معلّق/فاشل | 404 داخل التطبيق | — |
| 83 | `/dev/design-system` | DesignSystemGallery | `pages/DesignSystemGallery.tsx` | G4 | معرض ثابت: عائلات/أدوار/مكوّنات/حالات | سطح تطوير جديد (غير منتجي) | — |

## 4. التحويلات والأسماء البديلة والمسارات الديناميكية

| النوع | المسارات | القاعدة |
|---|---|---|
| تحويل على مستوى الراوتر | /index → / · /now → / · /settings/theme → /settings/appearance · /settings/font → /settings/appearance | لا تصميم؛ يُختبر في smoke فقط |
| تحويل على مستوى المكوّن | /duas → /mihrab (تبويب الذكر) | لا تصميم؛ يجري ضبط التبويب قبل التحويل |
| اسم بديل لنفس الصفحة | /profile = /settings/profile · /crypto/ = /crypto | تصميم واحد، مساران |
| تبويبات دائمة | / · /games · /chat | تبقى مركّبة بعد أول زيارة (PersistentTabs) |
| ديناميكية | /chat/g/:chatId · /german-club/shelf/:slug · /travel-atlas/place/:placeId · /travel-atlas/trips/:tripId · /travel-atlas/:countryId · /podcasts/:id · /archive/:id · /diwan/library/poem/:slug · /diwan/library/poet/:slug · /section/timed-sunnah/:categoryId | تحتاج بيانات fixture لاختبار الحالات |
| داخلية/تطويرية | /dev/material-preview · /dev/design-system · /.lovable/oauth/consent · * | خارج التنقّل والبحث |

## 5. تغطية المجالات

حالة كل مجال (ما رُحّل، ما تبقّى، ما لم يُتحقَّق) في
[migration-plan.md](./migration-plan.md) §2. لا تُعتبر المصفوفة أعلاه إعلان
اكتمال: وجود مسار في الجدول يعني أنه **مصنَّف**، لا أنه **مُتحقَّق**.

## 6. حالة التحقق البصري

| ما | العدد | الحالة |
|---|---|---|
| فحص آلي لكل المسارات (Chromium 390/1440) | 82 × 2 = 164 | ✅ 0 تجاوز، 0 سقوط، 0 بلا h1، 0 تسريب اتجاه |
| لقطات 390 لكل مسار | 82 | في verification/design/routes-390 + ورقتا تواصل |
| مصفوفة قبل/بعد مفصّلة | 60 + 60 | 10 مسارات × 3 عروض × وضعين (expressive) |
| لقطات ما بعد الترحيل الأحدث | 48 | verification/design/after2 (12 مساراً × عرضين × وضعين) |
| المعرض (14 عائلة) | 4–24 | verification/design/gallery* |

**الفجوة المتبقية:** الحالات العميقة للمسارات الديناميكية (قصيدة حقيقية، رحلة
بها بيانات، بودكاست محدد، رسائل دردشة) تحتاج بيانات fixture؛ الفحص الحالي
يثبت التركيب والترويسة وعدم التجاوز، لا صحة المحتوى داخل كل حالة.

## 7. صيانة المصفوفة

- كل مسار جديد في src/App.tsx يجب أن يظهر هنا بالمعرّف التالي وقاعدته.
- كل تغيير في قاعدة صفحة يُحدَّث في DESIGN.md §8 وهنا معاً.
- كل تحويل جديد يُدرج في §4، لا كصف تصميم.
- المراجعة الدورية: عند كل تغيير في App.tsx شغّل عدّ المسارات وقارنه بـ83
  (82 منتجياً + معرض تطوير).
