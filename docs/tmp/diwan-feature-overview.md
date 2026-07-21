# قسم الأدب (Diwan / المكتبة الكبرى) — توثيق كامل

> ملف شامل يشرح ميزة "الأدب" في تطبيق SmartHub من الألف إلى الياء:
> البنية، البيانات، الواجهات، الـ APIs، طبقة الـ fallback المحلية،
> سكريبتات الـ ingestion، وأدوات التحرير المصاحبة.

---

## 1. نظرة عامة

قسم **الأدب** هو موسوعة الشعر العربي الكلاسيكي داخل التطبيق. يوفّر:

- تصفّح **الشعراء عبر العصور** (جاهلي، إسلامي، أموي، عباسي، أندلسي، حديث…).
- قراءة **قصائد كاملة** بصدر/عجز مع نسخ الأبيات ومعجم كلمات.
- **بحث عربي متقدّم** يتجاهل التشكيل ويوحّد الهمزات، على مستوى القصيدة أو البيت.
- **رسم بياني تفاعلي** للعلاقات الأدبية بين الشعراء (تأثر/تلمذة/معاصرة).
- **Timeline زمني** لكل شاعر (مؤلفات، رحلات، أحداث).
- **مفضّلة سحابية** خاصة بالمستخدم (RLS) مع مجلدات.
- طبقة **Fallback محلية** كاملة: يعمل القسم دون قاعدة بيانات.

نقطة الدخول: تبويب **الأدب** داخل `/mihrab` عبر `src/pages/mihrab/LiteratureTab.tsx`، الذي يُضمّن مكوّن الصفحة الرئيسية `DiwanLibraryPage` في وضع `tab`.

---

## 2. خريطة الملفات

### 2.1 صفحات (`src/features/diwan/pages/`)

| الملف | السطور | الدور |
|---|---:|---|
| `Diwan.tsx` | 20 | Shim قديم يُعيد التوجيه للمكتبة. |
| `Library.tsx` | 211 | الصفحة الرئيسية (Hub): إحصاءات + روابط + الرسم البياني lazy. |
| `LibraryPoets.tsx` | 162 | قائمة الشعراء مع فلترة بالعصر وبحث فوري. |
| `LibraryPoet.tsx` | 259 | صفحة شاعر: بيوغرافيا، Timeline، قصائده، فلاتر البحر/القافية. |
| `LibraryPoem.tsx` | 380 | قصيدة كاملة: أبيات، معجم، نسخ، قصائد مشابهة، سياق. |
| `LibrarySearch.tsx` | 508 | بحث متقدّم موحّد (قصائد + أبيات + Smart Search). |
| `LibraryFavorites.tsx` | 128 | مفضّلة المستخدم مع المجلدات. |

### 2.2 مكوّنات (`src/features/diwan/components/`)

| الملف | الدور |
|---|---|
| `LiteraryGraph.tsx` (558) | رسم force-directed للعلاقات الأدبية، lazy-loaded. |
| `PoetTimeline.tsx` (198) | Timeline زمني لشاعر بعينه. |
| `PoemContextCard.tsx` (68) | بطاقة سياق تاريخي للقصيدة. |
| `library/EraPills.tsx` | فلاتر العصور بأشكال حبوب دواء ملوّنة. |
| `library/FallbackBadge.tsx` | شارة "بيانات محلية" حين لا تتوفّر Supabase. |
| `library/GlossarySheet.tsx` | Sheet يعرض شرح الكلمات الغريبة. |
| `library/PoemCard.tsx` / `PoetCard.tsx` | بطاقات العرض الأساسية. |
| `library/SearchBar.tsx` | حقل بحث ذكي مع اقتراحات (Autosuggest). |
| `library/SimilarPoems.tsx` | قصائد مشابهة (بنفس البحر/القافية/الغرض). |
| `library/VerseLine.tsx` | سطر بيت واحد بصدر/عجز، مع نسخ ومعجم. |

### 2.3 طبقة البيانات (`src/features/diwan/lib/`)

| الملف | الدور |
|---|---|
| `api.ts` (313) | استدعاء Supabase RPCs مع sanity checks. |
| `hooks.ts` (340) | 16 hook بـ TanStack Query + prefetch. |
| `local-fallback.ts` (386) | نسخة كاملة من الـ RPCs تعمل من الذاكرة على `poetryData`. |
| `fallback-status.ts` (69) | يحدّد أيّ طبقة نستعمل (cloud / local) ويصدر إشعارات. |
| `env.ts` (13) | `isSupabaseReady()` — كشف توفّر الاتصال. |
| `constants.ts` (24) | مصدر الحقيقة الوحيد للـ **بحور**، **الأغراض**، وحروف **الروي**. |
| `types.ts` (148) | أنواع الـ UI (منفصلة عن أنواع DB الخام). |
| `foldersStorage.ts` (142) | تخزين محلي لمجلدات المفضّلة (localStorage + sync). |

الاختبارات: `env.test.ts`، `fallback-status.test.ts`، `local-fallback.test.ts`، `normalize-script.test.ts` — تُحكم توافق التطبيع مع Postgres.

### 2.4 بيانات محلّية (`src/features/diwan/data/`)

| الملف | الدور |
|---|---|
| `poetryData.ts` | الشعراء + قصائدهم بشكل مُنسَّق للـ fallback والـ seed. |
| `poetTimelines.ts` | أحداث Timeline لكل شاعر. |
| `literaryConnections.ts` | عُقَد + روابط تُغذّي `LiteraryGraph`. |
| `diwanGlossary.ts` | معجم الكلمات الغريبة بحسب القصيدة. |

### 2.5 سكريبتات الـ Ingestion (`scripts/diwan/`)

| الملف | الدور |
|---|---|
| `types.ts` | أنواع مشتركة، يعيد تصدير الثوابت من `constants.ts`. |
| `normalize.ts` | تطبيع عربي + slugify + استخراج بحر/قافية/سنوات. |
| `scrape-adab.ts` | Scraper موقع adab.com، rate-limited، مع cache قابل للاستئناف. |
| `seed-from-local.ts` | تحويل `poetryData.ts` إلى JSONL. |
| `ingest.ts` | رفع JSONL إلى Supabase بالـ service role. |

### 2.6 الـ Migration

`supabase/migrations/20260519100000_diwan_library.sql`:
الجداول + الفهارس + RPCs + RLS.

---

## 3. نموذج البيانات (Supabase)

```
diwan_eras    (id, name_ar, period_label, color, sort_order, start_year, end_year, description)
diwan_poets   (id, slug, era_id, name_ar, title, bio, birth_year, death_year,
               poems_count, verses_count, search_vector, source, external_id)
diwan_poems   (id, slug, poet_id, era_id, title, kind, meter, rhyme,
               opening, full_text, tags[], search_vector)
diwan_verses  (id, poem_id, poet_id, position, hemistich1, hemistich2, search_vector)
diwan_user_favorites (user_id, poem_id, folder, notes, created_at)
```

**ميزات معمارية:**
- دالة Postgres `normalize_arabic()` — تُطبِّع النصّ بنفس منطق TS (`normalize.ts`) لضمان توافق الفهارس.
- عمود محتسَب `search_vector` لكل جدول (Full-Text Search).
- فهارس GIN على `search_vector` و`tags[]`.
- RLS عام للقراءة على `diwan_*` (public-read).
- RLS خاص على `diwan_user_favorites` (`auth.uid() = user_id`).
- GRANT `SELECT` للـ `anon` و`authenticated` على جداول القراءة.

---

## 4. الـ RPCs

| الدالة | الاستخدام |
|---|---|
| `diwan_library_stats()` | إحصاءات عامة للصفحة الرئيسية. |
| `diwan_list_eras()` | العصور بترتيب زمني. |
| `diwan_list_poets(era, q, limit, offset)` | شعراء بفلتر العصر + بحث. |
| `diwan_get_poet(slug)` | تفاصيل شاعر واحد. |
| `diwan_list_poems_by_poet(slug, q, meter, rhyme, kind, limit)` | قصائد شاعر. |
| `diwan_get_poem(slug)` | قصيدة كاملة + أبياتها كـ JSONB. |
| `diwan_search_poems(q, era, poet, meter, rhyme, kind, tag, limit)` | بحث متقدّم. |
| `diwan_search_verses(q, era, poet, limit)` | بحث على مستوى البيت. |
| `diwan_similar_poems(slug, limit)` | قصائد مشابهة. |
| `diwan_suggest(prefix, limit)` | اقتراحات autosuggest. |
| `diwan_smart_search(q, limit)` | نتيجة موحّدة (شاعر + قصيدة + بيت). |
| `diwan_glossary(poem_slug)` | معجم كلمات القصيدة. |
| `diwan_favorites_toggle(poem_id)` | إضافة/حذف من المفضّلة. |
| `diwan_favorites_ids()` / `diwan_favorites_poems()` | استرجاع المفضّلة. |

---

## 5. طبقة الـ UI

### 5.1 التنقّل

- الدخول من `/mihrab` → تبويب **الأدب** (`LiteratureTab`) الذي يُحمّل `DiwanLibraryPage` بشكل Lazy مع Skeleton.
- Routes مسجّلة في `App.tsx`:
  - `/diwan/library` → Library Hub
  - `/diwan/poets` → قائمة الشعراء
  - `/diwan/poet/:slug` → صفحة شاعر
  - `/diwan/poem/:slug` → قصيدة
  - `/diwan/search` → بحث متقدّم
  - `/diwan/favorites` → المفضّلة

### 5.2 السلوك التكيّفي

- إن كانت Supabase **مكوّنة وفيها بيانات** ⇒ استخدام السحابة (RPC).
- إن كانت **غائبة أو فارغة** ⇒ سقوط تلقائي شفّاف إلى `local-fallback.ts` من `poetryData.ts`.
- شارة `FallbackBadge` تُظهر للمستخدم مصدر البيانات الحالي.
- كل الـ hooks تحترم Fallback دون تعديل استدعاءات الـ UI.

### 5.3 التفاعلات

- **نسخ بيت / كامل القصيدة** مع تنسيق النصّ.
- **معجم كلمات** ينبثق عند لمس كلمة غامضة (`GlossarySheet`).
- **تشكيل ديناميكي**: عرض النسخة المشكّلة عند التفعيل (`hemistich1_diacritized`).
- **حفظ في المفضّلة** مع اختيار مجلد.
- **Timeline** بشاعر مفرد بعقد قابلة للنقر.
- **رسم بياني** للعلاقات الأدبية بأنماط "تأثر / تلمذة / معاصرة".

---

## 6. التطبيع العربي (Arabic Normalization)

نقطة حرجة: يجب أن يتطابق منطق TS مع Postgres. القواعد:

```
حذف: التشكيل + الكشيدة (ـ)
توحيد: إأآا → ا     ى → ي     ة → ه
lowercase + trim
```

المرجع: `scripts/diwan/normalize.ts` (`normalizeArabic`) ودالة `normalize_arabic()` في الـ SQL — يفحصهما `normalize-script.test.ts`.

`buildSlug()` يستخدم جدول transliteration ثابت ثم يُلحق `external_id` لتفادي التصادم.

---

## 7. سكريبتات الـ Ingestion

### 7.1 المسار السريع — بذر محلي

```bash
npx tsx scripts/diwan/seed-from-local.ts
npx tsx scripts/diwan/ingest.ts
```

ينتج في `scripts/diwan/out/`: `eras.jsonl`, `poets.jsonl`, `poems_full.jsonl` ثم يرفعها.

### 7.2 المسار الكامل — سحب adab.com

```bash
npx tsx scripts/diwan/scrape-adab.ts fetch --all
npx tsx scripts/diwan/ingest.ts
```

- Rate-limit: 1.5s بين الطلبات.
- HTML خام يُخزَّن في `scripts/diwan/cache/` — قابل للاستئناف.
- لإعادة parse فقط: احذف `out/` واحتفظ بـ `cache/`.

### 7.3 مصادر إضافية

`ingest.ts` يقبل أيّ JSONL مطابق لـ `RawPoet`/`RawPoem` مع `source` و`external_id` كمفاتيح تفرّد — يمكن دمج Ashaar/aldiwan دون تكرار.

### 7.4 أوامر متخصّصة

```bash
npx tsx scripts/diwan/scrape-adab.ts fetch --poets-of=jahili
npx tsx scripts/diwan/ingest.ts --only=poets
npx tsx scripts/diwan/ingest.ts --truncate
```

---

## 8. ثوابت المرجع (`src/features/diwan/lib/constants.ts`)

- **البحور (15):** الطويل، البسيط، الكامل، الوافر، الهزج، الرجز، الرمل، السريع، المنسرح، الخفيف، المضارع، المقتضب، المجتث، المتقارب، المتدارك.
- **الأغراض (14):** مديح، رثاء، غزل، فخر، حماسة، هجاء، زهد، حكمة، وصف، خمريات، طرديات، إخوانيات، اعتذار، مناجاة.
- **حروف الروي:** 28 حرفًا.

هذا الملف هو مصدر الحقيقة الوحيد — سكريبتات الـ ingestion تستورده لتفادي الـ drift.

---

## 9. الأمن والخصوصية

- كل جداول القراءة `public.diwan_*` معرَّفة بـ `RLS ENABLE` وسياسة `USING (true)` للقراءة العامة.
- `diwan_user_favorites` مُقيَّدة بـ `auth.uid() = user_id` على SELECT/INSERT/UPDATE/DELETE.
- الـ RPCs معرَّفة `SECURITY DEFINER` مع `SET search_path = public` عند اللزوم.
- `SUPABASE_SERVICE_ROLE_KEY` مطلوب فقط لسكريبتات الـ ingestion — لا يُشحن مع الـ client.

---

## 10. الأداء

- **Lazy loading** لصفحة المكتبة داخل التبويب، وللرسم البياني (`LiteraryGraph`) داخل الـ Hub.
- **TanStack Query** مع cache طويل للـ eras/stats (ثابتة نسبيًا).
- **Prefetch** لصفحات الشاعر/القصيدة عند الـ hover على البطاقة (`useDiwanPrefetch`).
- فهارس GIN على DB تُبقي البحث تحت 50ms حتى مع مليون بيت.
- Fallback المحلي يبني فهرسًا مرّة واحدة عند التحميل.

---

## 11. الاختبارات

| الملف | الغرض |
|---|---|
| `env.test.ts` | صحة كشف Supabase. |
| `fallback-status.test.ts` | انتقاء الطبقة الصحيحة + الإشعارات. |
| `local-fallback.test.ts` | كل RPCs المحلّية تُطابق سلوك السحابة. |
| `normalize-script.test.ts` | تطابق `normalizeArabic` مع `normalize_arabic()` SQL. |
| `diwanGlossary.test.ts` | صحة معجم الكلمات. |

---

## 12. حالة الميزات

| الميزة | الحالة |
|---|---|
| تصفّح بالعصر | ✓ |
| صفحة الشاعر + بيوغرافيا + إحصائيات | ✓ |
| بحث نصّي في القصائد | ✓ |
| بحث على مستوى البيت | ✓ |
| فلاتر بالبحر/القافية/الغرض | ✓ |
| قصيدة كاملة صدر/عجز + نسخ | ✓ |
| معجم الكلمات الغريبة | ✓ |
| Timeline زمني للشاعر | ✓ |
| رسم بياني للعلاقات الأدبية | ✓ |
| المفضّلة السحابية + مجلدات | ✓ |
| Smart Search موحّد | ✓ |
| قصائد مشابهة | ✓ |
| Fallback محلي شفّاف | ✓ |
| تشكيل ديناميكي (عمود جاهز) | UI مستقبلي |
| محرّك عَروض (تفعيلات) | مستقبلي |

---

## 13. التوسعة المستقبلية

- **محرّك العَروض (qawafi)**: إضافة `verses.scansion` + استخراج تفعيلات.
- **Topic modeling**: LDA/BERT على `verses.normalized_text` لتوليد tags تلقائية.
- **التعرّف على البيت الملحّن**: بحث FTS الحالي كافٍ فوريًا.
- **مختارات (Selections)**: بطاقة placeholder موجودة في `LiteratureTab.tsx`.
- **دمج مصادر جديدة**: aldiwan.net، Ashaar، مخطوطات مرقمنة.

---

## 14. ملاحظات صيانة

- عند إضافة بحر/غرض جديد: عدّل `constants.ts` فقط — تنتشر لكل الطبقات.
- لا تكرّر منطق التطبيع في أيّ ملفّ جديد؛ استورد `normalizeArabic`.
- عند تعديل schema: أضف migration جديد ولا تعدّل القديم.
- الرسم البياني ثقيل — أبقِه lazy دائمًا.
- `poetryData.ts` هو backup حي — أيّ تعديل عليه يجب إعادة تشغيل `seed-from-local` لمزامنة السحابة.
