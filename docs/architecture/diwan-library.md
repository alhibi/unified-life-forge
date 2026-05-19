# المكتبة الكبرى — دمج adab.com

> **الديوان العربي الكلاسيكي** كقاعدة بيانات حيّة داخل التطبيق:
> آلاف الشعراء، عشرات الآلاف من القصائد، ملايين الأبيات،
> مع بحث عربي متقدّم يتجاهل التشكيل ويوحّد الهمزات.

---

## المعمارية

```
┌──────────────┐  scrape  ┌──────────────┐  ingest  ┌──────────────┐
│  adab.com    │ ───────▶ │  JSONL files │ ───────▶ │  Supabase DB │
└──────────────┘          │  (out/)      │          │  + RPCs      │
                          └──────────────┘          └──────┬───────┘
                                                           │
                          ┌──────────────┐                 │ React Query
                          │ poetryData.ts│ ── seed ────────┤
                          │ (محلي قديم)  │                 ▼
                          └──────────────┘          ┌──────────────┐
                                                    │ src/pages/   │
                                                    │   diwan/*    │
                                                    └──────────────┘
```

كل طبقة منفصلة: تستطيع تشغيل scrape بلا ingest، أو ingest بلا scrape (من الـ seed المحلي)، أو UI بلا قاعدة بيانات (يستخدم البيانات المحلّية تلقائيًا).

---

## الملفات الجديدة

| المسار | الدور |
|---|---|
| `supabase/migrations/20260519100000_diwan_library.sql` | الجداول + الفهارس + RPCs + RLS |
| `scripts/diwan/types.ts` | الأنواع المتبادلة |
| `scripts/diwan/normalize.ts` | تطبيع عربي + slugify + استخراج بحر/قافية |
| `scripts/diwan/scrape-adab.ts` | الـ scraper |
| `scripts/diwan/ingest.ts` | رفع JSONL إلى Supabase |
| `scripts/diwan/seed-from-local.ts` | بذر سريع من `src/data/poetryData.ts` |
| `src/lib/diwan/types.ts` | أنواع الـ UI |
| `src/lib/diwan/api.ts` | استدعاء Supabase RPCs |
| `src/lib/diwan/local-fallback.ts` | بديل في الذاكرة من البيانات المحلية |
| `src/lib/diwan/hooks.ts` | hooks بـ TanStack Query مع fallback |
| `src/components/diwan/library/*` | بطاقات + بحث + شارات عصور |
| `src/pages/diwan/Library.tsx` | الصفحة الرئيسية (Hub) |
| `src/pages/diwan/LibraryPoets.tsx` | قائمة الشعراء |
| `src/pages/diwan/LibraryPoet.tsx` | شاعر مفرد |
| `src/pages/diwan/LibraryPoem.tsx` | قصيدة مفردة |
| `src/pages/diwan/LibrarySearch.tsx` | البحث المتقدّم |

---

## نموذج البيانات

```
diwan_eras    (id, name_ar, period_label, color, sort_order, …)
diwan_poets   (id, slug, era_id, name_ar, title, bio, birth_year, death_year, poems_count, verses_count, search_vector)
diwan_poems   (id, slug, poet_id, era_id, title, kind, meter, rhyme, opening, full_text, tags[], search_vector)
diwan_verses  (id, poem_id, poet_id, position, hemistich1, hemistich2, search_vector)
diwan_user_favorites (user_id, poem_id, notes)
```

ميزات الـ schema:
- **بحث عربي** عبر `normalize_arabic()` المُعرَّفة سابقًا — يتجاهل التشكيل ويوحّد ا/أ/إ/آ، ى/ي، ة/ه، ويزيل الكشيدة.
- **`search_vector`** عمود محتسَب على كل جدول لبحث FTS فوري.
- **GIN indexes** على `search_vector` و `tags[]`.
- **RLS عام للقراءة** — كل بيانات الأدب public-read.
- **RLS مخصّص للـ favorites** — كل مستخدم يرى الخاصة به فقط.

### الـ RPCs

| الدالة | الاستخدام |
|---|---|
| `diwan_list_poets(era, q, limit, offset)` | شعراء بفلتر العصر + بحث |
| `diwan_list_poems_by_poet(slug, q, meter, rhyme, …)` | قصائد شاعر |
| `diwan_search_poems(q, era, poet, meter, rhyme, kind, tag, …)` | بحث متقدم |
| `diwan_search_verses(q, era, …)` | بحث على مستوى البيت |
| `diwan_get_poem(slug)` | قصيدة كاملة + أبياتها كـ JSONB |
| `diwan_library_stats()` | إحصاءات الواجهة الرئيسية |

---

## التشغيل

### المتطلبات

- Node 20+ (الـ scraper يستخدم `fetch` المدمج)
- npm i -D `tsx` و `@supabase/supabase-js` (إن لم تكن مثبّتة)
- متغيّرات بيئة:
  ```
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # للـ ingestion فقط — لا تكشفها
  ```

### 1) تشغيل الـ migration

```bash
# إن كنت تستخدم Supabase CLI:
supabase db push

# أو افتح SQL editor في Supabase Studio والصق محتوى:
#   supabase/migrations/20260519100000_diwan_library.sql
```

### 2) خيار سريع — بَذر من البيانات المحلية (بدون scrape)

```bash
npx tsx scripts/diwan/seed-from-local.ts
npx tsx scripts/diwan/ingest.ts
```

سيُنشأ في `scripts/diwan/out/`:
- `eras.jsonl`
- `poets.jsonl`
- `poems_full.jsonl`

ثم تُرفع إلى Supabase. تحصل على شعراء/قصائد `poetryData.ts` كاملة في الـ DB، والمكتبة تعمل فورًا.

### 3) السحب الكامل من adab.com (يستغرق ساعات)

```bash
# الجلب — ينزّل HTML إلى cache ثم يولّد JSONL في out/
npx tsx scripts/diwan/scrape-adab.ts fetch --all

# الرفع
npx tsx scripts/diwan/ingest.ts
```

نصائح:
- يحترم rate-limit بـ 1.5 ثانية بين الطلبات.
- يخزّن HTML خامًا في `scripts/diwan/cache/`؛ إذا انقطع الاتصال، أعِد التشغيل وسيتجاوز ما في الـ cache.
- لإعادة parse فقط (بعد تعديل selectors)، احذف `out/` فقط واترك `cache/`.

### 4) أوامر متخصّصة

```bash
# جلب شعراء عصر بعينه فقط
npx tsx scripts/diwan/scrape-adab.ts fetch --poets-of=jahili

# رفع قسم بعينه فقط
npx tsx scripts/diwan/ingest.ts --only=poets
npx tsx scripts/diwan/ingest.ts --only=verses

# تنظيف وإعادة رفع
npx tsx scripts/diwan/ingest.ts --truncate
```

---

## دمج مصادر إضافية

`scripts/diwan/ingest.ts` يقبل أيّ JSONL يطابق `RawPoet`/`RawPoem`. يمكن مثلًا:
- استيراد [Ashaar dataset](https://github.com/ARBML/Ashaar) — حوّل CSV إلى JSONL بنفس الـ shape، ضع `source: 'ashaar'`، شغّل `ingest.ts`.
- استيراد aldiwan.net بكتابة scraper مماثل.

`source` و `external_id` يضمنان تفرّد الصفّ — يمكنك دمج عدّة مصادر دون تكرار.

---

## السلوك في الـ UI

- إذا كانت Supabase مكوّنة وفيها بيانات ⇒ يستخدمها.
- إذا كانت Supabase غير مكوّنة أو فارغة ⇒ يسقط تلقائيًا للبيانات المحلية في `src/data/poetryData.ts`.
- التحوّل **شفّاف بالكامل** — لا حاجة لتعديل أي شيء في الـ UI.

---

## التكامل مع القديم

- `LiteraryGraph` يبقى يعمل من `literaryConnections.ts` المحلية — قسم منفصل عن المكتبة الكبرى.
- `PoetTimeline` و `PoemContextCard` يعملان تلقائيًا في صفحات المكتبة لأن الـ `poet_slug = poet.id` للبذر المحلي.
- لشعراء adab.com (slugs مختلفة) لن يظهر timeline — وهذا متوقّع، لأنه data ثري قمت أنت بصنعه يدويًا.

---

## ما المُكتمل من الميزات

| الميزة | الحالة |
|---|---|
| تصفّح بالعصر | ✓ |
| بطاقة الشاعر + بيوغرافيا + إحصائيات | ✓ |
| بحث في القصائد بالنص | ✓ |
| بحث في الأبيات بالنص (للبيت المسموع) | ✓ |
| فلاتر بالبحر | ✓ |
| فلاتر بالقافية | ✓ |
| فلاتر بالغرض/الموضوع | ✓ |
| قصيدة كاملة بصدر/عجز | ✓ |
| نسخ بيت/كل القصيدة | ✓ |
| مفضّلة المستخدم (للمسجَّلين) | ✓ (RPC + RLS) — UI مستقبلي |
| ربط الشاعر القديم بصفحة المكتبة | ✓ |

---

## التوسعة المستقبلية

ميزات يفتحها هذا الـ schema بسهولة:
- **محرّك العَروض** ([qawafi](https://github.com/ARBML/qawafi)): يكفي إضافة عمود `verses.scansion` ودالة لاستخراج التفعيلات.
- **مفضّلة المستخدم** كـ UI: كل البنية موجودة، فقط إضافة شاشة.
- **اكتشاف الموضوعات (LDA/BERT topic modeling)**: شغّل سكريبت Python على `verses.normalized_text` وأنتج tags تلقائيًا.
- **التعرّف على البيت المُلَحَّن**: بحث الأبيات بالـ FTS الموجود يُنجز ذلك فوريًا.
