
# خطة تطوير قسم الديوان — المحاور (1) المحتوى (3) البحث (6) الأداء

## الوضع الحالي
- **محتوى**: يعتمد على `poetryData.ts` (Fallback) + جداول `diwan_poets/poems/verses` مع RPCs (`diwan_search_poems`, `diwan_search_verses`).
- **بحث**: نصّي عبر `tsvector` + `normalize_arabic` + فلاتر (عصر/بحر/قافية/غرض/وسم).
- **فهارس**: GIN على جميع جداول البحث + B-tree على الـ FKs والفلاتر. **البنية ممتازة أصلاً.**
- **واجهة**: 5 صفحات (Library, Poets, Poet, Poem, Search) — تستخدم React Query لكن بلا virtualization ولا prefetch.

---

## المحور 1 — المحتوى والبيانات

### 1.1 إثراء البيانات (سكربتات)
- **توسيع `seed-from-local.ts`**: حقن كامل لـ `poetryData.ts` إلى السحابة (يبدو أنه ناقص).
- **سكربت `enrich-meters.ts` جديد**: استدلال البحر تلقائياً من نمط التفعيلات لكل بيت غير مصنّف، باستخدام `LOVABLE_API_KEY` (gemini-2.5-flash-lite) دفعة واحدة لكل قصيدة.
- **سكربت `enrich-glossary.ts` جديد**: استخراج 3-5 مفردات صعبة لكل قصيدة + شرحها، تخزينها في جدول جديد `diwan_glossary`.

### 1.2 جداول جديدة
```sql
-- شرح المفردات
CREATE TABLE diwan_glossary (
  id uuid PRIMARY KEY,
  poem_id uuid REFERENCES diwan_poems,
  word text NOT NULL,            -- بصيغته في القصيدة
  word_normalized text NOT NULL, -- normalize_arabic
  meaning text NOT NULL,
  verse_position int             -- البيت الذي ورد فيه
);
CREATE INDEX ON diwan_glossary (poem_id);
CREATE INDEX ON diwan_glossary (word_normalized);

-- التشكيل (اختياري - مخزّن مع البيت)
ALTER TABLE diwan_verses
  ADD COLUMN hemistich1_diacritized text,
  ADD COLUMN hemistich2_diacritized text;
```

### 1.3 واجهة
- في `LibraryPoem.tsx`: زر تبديل **"تشكيل/بلا تشكيل"** (يستخدم الحقول الجديدة إن وُجدت).
- في `LibraryPoem.tsx`: **long-press على أي كلمة** → bottom-sheet يعرض الشرح من `diwan_glossary` (مطابقة بـ `word_normalized`).

---

## المحور 3 — البحث والاكتشاف

### 3.1 RPC جديدة `diwan_smart_search`
- توحيد البحث في القصائد والأبيات والشعراء في استدعاء واحد، مع تجميع النتائج حسب النوع (لإطلاق Universal Search).
- يستخدم `ts_rank_cd` + boost للعنوان (weight A) ولمطابقات الشاعر.

### 3.2 فلاتر متقدّمة
- **فلتر الحقبة الزمنية بالسنة** (slider من -500 إلى 1500 هـ) بدل القائمة الجامدة → يستفيد من `birth_year/death_year` في `diwan_poets`.
- **فلتر "عدد الأبيات"** (قصيدة/مقطوعة/قصيرة جداً) بإضافة `verses_count >= ?`.

### 3.3 اقتراحات ذكية (بدون pgvector)
- RPC `diwan_similar_poems(poem_slug, limit)`: يرجع 5 قصائد بنفس البحر + الغرض + من نفس العصر (ترتيب حسب overlap في `tags`).
- يُعرض كقسم "قصائد مشابهة" أسفل `LibraryPoem.tsx`.

### 3.4 اقتراحات أثناء الكتابة (Autocomplete)
- RPC `diwan_suggest(prefix)`: يرجع أهم 8 شعراء/قصائد تبدأ بالـ prefix، يُستخدم في `SearchBar`.

### 3.5 سجل البحث المحلي
- آخر 8 عمليات بحث في `localStorage` → chips قابلة للنقر تحت شريط البحث في `LibrarySearch.tsx`.

---

## المحور 6 — الأداء

### 6.1 Virtualization
- إضافة `@tanstack/react-virtual` (لو غير موجود) لقوائم:
  - `LibraryPoets.tsx` (قد تتعدى 1000 شاعر).
  - `LibrarySearch.tsx` نتائج الأبيات.
- العتبة: تفعيل فقط لو عدد العناصر > 50.

### 6.2 Prefetch
- في `PoetCard.tsx` و`PoemCard.tsx`: `onPointerEnter` (desktop) و`onTouchStart` (mobile) → `queryClient.prefetchQuery` للصفحة المقصودة.

### 6.3 تقليل حجم الـ payload
- في `diwan_search_poems`: عدم إرجاع `full_text` (الموجود حالياً يبدو خفيفاً لكن نتأكد).
- إرجاع `opening` فقط (مطلع ≤ 200 حرف) لبطاقات النتائج.

### 6.4 Cache layer
- ضبط `staleTime: 5 * 60_000` للـ `useDiwanEras` و`useDiwanLibraryStats` (لا تتغيّر كثيراً).
- ضبط `staleTime: 60_000` لنتائج البحث + `keepPreviousData: true` لتجربة pagination سلسة.

### 6.5 Skeletons دقيقة
- استبدال `<div class="skeleton h-20" />` بـ skeleton matches للبطاقة الحقيقية (يقلّل CLS).

---

## التقنيات
- **DB**: 3 migrations جديدة (`diwan_glossary` + RPC الاقتراحات + RPC المتشابهات + diacritized columns).
- **Frontend**: تعديل `LibraryPoem`, `LibrarySearch`, `LibraryPoets`, `SearchBar`, `PoetCard`, `PoemCard` + hooks جديدة.
- **Scripts**: 2 سكربتات إثراء (ingest يدوي عبر `bun run`).
- **بدون pgvector** لأنه يتطلب extension + رفع ميزانية → سنحقّق "البحث الذكي" بالتركيب الذكي للفلاتر + اقتراحات بنفس البحر/الغرض.

---

## الترتيب المقترح للتنفيذ
1. **Migration**: `diwan_glossary` + columns تشكيل + RPCs (similar_poems, suggest).
2. **Frontend الأداء**: virtualization + prefetch + cache (مكسب فوري).
3. **Frontend البحث**: autocomplete + سجل البحث + قسم "قصائد مشابهة" + فلاتر متقدّمة.
4. **Frontend المحتوى**: زر التشكيل + long-press للشرح.
5. **سكربتات الإثراء** (تشغّلها أنت محلياً عند الحاجة).

تقدير الحجم: ~12 ملفاً جديداً/معدّلاً + migration واحدة.

