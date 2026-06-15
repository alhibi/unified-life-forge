# خطة إعادة التنظيم — على 7 مراحل

## النتيجة المستهدفة

كل ميزة في مجلد مستقل بهذا الشكل:
```text
src/features/<feature>/
  pages/         صفحات المسارات (رفيعة)
  components/    مكونات خاصة بالميزة فقط
  hooks/         React Query hooks
  api.ts         كل استدعاءات Supabase للميزة
  types.ts       الأنواع
  queryKeys.ts   مفاتيح الاستعلام
  index.ts       barrel export
```
وقواعد صارمة:
- **لا** استدعاء `supabase` مباشرة من أي صفحة أو مكون — فقط عبر `features/<x>/api.ts`.
- **لا** أنماط `bg-card rounded-2xl p-4` يدوية — فقط `<AppCard>` و`<PageShell>` و`<Section>` و`<IconButton>`.
- المكونات في `src/components/` للـ chrome العام فقط (BottomNav, BackButton, SEO, …).
- الـ hooks في `src/hooks/` للمشترك حقاً فقط (useAuth, useDeviceLocation, …).

---

## أهم نتائج الفحص

- **54 صفحة، 25 مكوناً جذرياً، 13 hook عام** — كثير منها فعلياً خاص بميزة واحدة.
- مكونات ضخمة في غير محلها: `PrayerTimes.tsx` (1253 سطر)، `ChatDrawer.tsx` (1888)، `UmmahPulse` (1363)، `UmmahGlobe` (1208) في `src/components/` الجذر.
- `components/chat/useChat.ts` يحتوي **39 استدعاء Supabase مباشر** بينما `lib/chat/api.ts` هو المكان الصحيح.
- صفحات تستدعي Supabase مباشرة: `Reading.tsx` (6)، `ProfileEdit.tsx` (5).
- hooks تحتوي Supabase خام: `useClipboard`, `usePresence`, `useUnreadMessages`.
- ~40 صفحة لا تستخدم `AppCard`/`PageShell` رغم وجودهما (Weather, Settings, PrayerGuide, Tafsir, QuranVirtues, Sudoku…).
- `lib/chat/` هو المرجع الذهبي — سنطبق نفس النمط على باقي الميزات.

---

## المراحل (كل مرحلة تنتظر موافقتك)

### المرحلة 1 — التوثيق والقواعد *(لا تغييرات وظيفية)*
- إنشاء `docs/architecture/feature-structure.md` يوضح البنية الهدف.
- إنشاء `docs/architecture/data-layer.md` (قاعدة: لا Supabase خارج `api.ts`).
- إنشاء `docs/architecture/ui-primitives.md` (متى تستخدم AppCard/PageShell/Section).
- إنشاء `docs/architecture/feature-map.md` (خريطة الميزات الحالية ومستقبلها).
- تحديث `mem://index.md` بالقواعد الجديدة.

### المرحلة 2 — الميزات السهلة (جزر مستقلة) *(منخفض المخاطر)*
- `src/features/calendar/` ← نقل `ReligiousOccasions.tsx`, `AllOccasions.tsx`, `islamicOccasions.ts`, `islamicEventsCatalog.ts`.
- `src/features/duas/` ← نقل `Duas.tsx` + `data/duas.ts`.
- `src/features/knowledge/` ← نقل `Knowledge.tsx`.
- تحديث استدعاءات الـ imports فقط.

### المرحلة 3 — Weather + Clipboard *(منخفض المخاطر)*
- `src/features/weather/` ← `Weather.tsx`, `WeatherWidget.tsx`, `WeatherForecast.tsx`, `useWeatherData.ts`، ودمج `lib/weather/` بداخل `api.ts` موحّد.
- `src/features/clipboard/` ← `LocationSaver.tsx`, `useClipboard.ts`، استخراج كل استدعاءات Supabase إلى `api.ts`.

### المرحلة 4 — Games *(متوسط — مساحة كبيرة لكن بدون Supabase)*
- `src/features/games/` ← 11 صفحة لعبة + `GameShell.tsx` + بيانات الشطرنج/النرد/الذاكرة + `sudokuSolver`, `gameFeedback`.
- تقسيم `GameShell` إن لزم. لا تغيير منطق لعبة.

### المرحلة 5 — Podcasts + Diwan *(متوسط)*
- `src/features/podcasts/` ← دمج `components/podcasts/` + `lib/podcasts/` + صفحات Podcast، إضافة `types.ts` و`queryKeys.ts`.
- `src/features/diwan/` ← دمج `components/diwan/` + `lib/diwan/` + صفحات Diwan، إضافة `queryKeys.ts`.

### المرحلة 6 — Mihrab / Prayer *(عالي المخاطر — مكون ضخم)*
- `src/features/mihrab/` ← `PrayerTimes.tsx` (مع تقسيمه إلى `PrayerCard`/`QiblaIndicator`/`PrayerCountdown`)، `CurrentTimeSunnah.tsx`، صفحات السنة، `usePrayerTimesCache`, `useAutoPrayerTheme`, `lib/prayerTimes.ts`, `prayerAstronomy.ts`.
- `src/features/prayer-guide/` للدليل المستقل.

### المرحلة 7 — Chat + Settings + Reading *(الأعلى مخاطرة)*
- **Chat:** نقل `components/chat/useChat.ts` ليفوّض كاملاً إلى `lib/chat/api.ts`؛ نقل `usePresence`, `useUnreadMessages` إلى `lib/chat/hooks/`؛ تقسيم `ChatDrawer.tsx` (1888 سطر) إلى `ConversationView`/`MessageArea`/`ComposerBar`.
- **Settings:** تفكيك `AppContext.tsx` إلى `ThemeContext` + `PrayerContext` + `FontContext`؛ استخراج Supabase من `ProfileEdit.tsx` إلى `features/settings/api.ts`.
- **Reading:** رفع استدعاءات Supabase من `Reading.tsx` و`useReadingData.ts` إلى `features/reading/api.ts`.

---

## بعد كل مرحلة
- التحقق من البناء (build) ومن المعاينة (preview).
- لا تغيير في السلوك أو التصميم المرئي.
- الحصول على موافقتك قبل المرحلة التالية.

---

## التفاصيل التقنية

- المسارات في React Router لا تتغير — فقط نُحدّث `App.tsx` و`routePrefetch.ts` للإشارة إلى المواقع الجديدة.
- نستخدم `git mv` معنوياً (نقل الملف ثم تحديث الـ imports) بدون إعادة كتابة المنطق.
- نضيف `index.ts` (barrel) لكل ميزة ليصبح الاستيراد `import { X } from '@/features/weather'`.
- نُبقي `src/integrations/supabase/client.ts` كما هو (auto-generated) — فقط نُغيّر **من** يستورده.
- تعديلات CSS العامة في `src/index.css` و`tailwind.config.ts` تبقى كما هي.

---

## أبدأ بالمرحلة 1 (التوثيق فقط) عند موافقتك؟
