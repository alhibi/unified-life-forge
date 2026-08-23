# Atlas Scout v3 — «الاستكشاف الذاتي» خطة الترقية الكبرى

> **For Hermes:** تنفيذ متسلسل مباشر (المهام صغيرة ومحددة). لا حاجة لـ subagents.

**Goal:** تحويل أطلس سكاوت من «زر يشغّل بحثاً» إلى محرك استكشاف ذاتي: اختيار مدينة/دولة مفضلة يُطلق حملة بحث عميق في الخلفية فوراً — بدون أي نقر إضافي — وتنتهي بملف تعريفي كامل للمدينة (Brief) + دفاتير أماكن موثقة بالصور والأجواء والإحداثيات.

**Architecture:** نفس عقد v2 المجرّب (GEOCODE→DISCOVER→DEDUP→DEPTH→FILE عبر OpenRouter مع كتابة قاعدة البيانات قبل SSE) + مرحلتان جديدتان: **BRIEF** (ملف المدينة التحريري) و**AUTO** (إطلاق من العميل دون انتظار). الحالة الحية للهدف تُخزَّن على صف الهدف نفسه ليعرض السجل شارات التقدم حتى بعد مغادرة الصفحة.

**Tech Stack:** Supabase (migration + edge function Deno)، OpenRouter (`google/gemini-2.5-flash`، مجاني التكلفة النسبية وقوي مع `:online`)، React lazy tab، Zod على كل حد قراءة، vitest على نواة نقية مشتركة بين الويب والدالة الطرفية.

---

## Task 1 — Migration `20260825000000_atlas_scout_v3.sql`

**Objective:** أعمدة الحركة الذاتية + جدول ملفات المدن.

**Files:** Create `supabase/migrations/20260825000000_atlas_scout_v3.sql`

```sql
ALTER TABLE public.atlas_watch_targets
  ADD COLUMN IF NOT EXISTS auto_scout_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_auto_scout_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_status text NOT NULL DEFAULT 'idle'
    CHECK (last_run_status IN ('idle','running','done','failed','empty'));

ALTER TABLE public.atlas_scout_runs
  ADD COLUMN IF NOT EXISTS trigger text NOT NULL DEFAULT 'manual'
    CHECK (trigger IN ('manual','auto'));

CREATE TABLE IF NOT EXISTS public.atlas_target_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.atlas_watch_targets(id) ON DELETE CASCADE,
  intro_ar text NOT NULL,
  character_ar text,
  food_scene_ar text,
  nature_escape_ar text,
  practical_ar text,
  when_to_go text,
  best_months smallint[] NOT NULL DEFAULT '{}',
  sources text[] NOT NULL DEFAULT '{}',
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS atlas_target_briefs_target_unique
  ON public.atlas_target_briefs(target_id);
ALTER TABLE public.atlas_target_briefs ENABLE ROW LEVEL SECURITY;
-- policies: select/insert/update/delete where auth.uid() = user_id
```

**Verify:** SQL يقرأ بصرياً؛ التطبيق على السحابة قرار المستخدم (db push).

---

## Task 2 — نواة الأنبوب: عقود الـBrief (`scoutPipeline.ts`)

**Files:** Modify `src/features/travel-atlas/lib/scoutPipeline.ts`

أضيف:
- `interface CityBriefDraft { introAr, characterAr, foodSceneAr, natureEscapeAr, practicalAr, whenToGo, bestMonths[], sources[] }`
- `parseBrief(raw: unknown): CityBriefDraft | null` — null إذا غاب introAr؛ يعيد استخدام cleanText/normalizeBestMonths.
- `briefSystemPrompt(): string` — عقد JSON صريح (٧ حقول عربية، حقائق لا اختراع، مصادر).
- `isAutoRun(depth, trigger?)` مساعد صغير؟ — لا، YAGNI؛ العمق يحدده العميل.

**Tests:** `lib/__tests__/scoutPipeline.test.ts` += حالات parseBrief (سليم/ناقص/مهمل/شهر خارج النطاق) + وجود مفاتيح العقد في البرومبت.

---

## Task 3 — الدالة الطرفية v3 (`atlas-scout/index.ts`)

**Modify:**
1. RequestBody += `auto?: boolean`.
2. إنشاء الـrun بـ`trigger: body.auto ? 'auto' : 'manual'`.
3. بعد إنشاء الـrun: تحديث هدف `last_run_status='running'` (وفي finalize: done/failed/empty + last_auto_scout_at عند auto).
4. **Stage 6 BRIEF** (kind='city' فقط، بعد FILE):
   - فحص وجود brief؛ إن غاب: `callJSON(briefSystemPrompt(), scopeNote + سياق الأماكن الموثقة اليوم, 2400, online=true)` → parseBrief → insert (on conflict target_id do nothing) → `sse("brief",{ok:true})` / catch → `sse("brief",{ok:false})` — لا يفسدRun أبداً.
5. الالتزام: كل كتابة DB قبل SSE (عقد عدم الزومبي).

---

## Task 4 — العميل (`scoutApi.ts`)

**Modify:**
- TargetRowSchema += `last_run_status` (enum افتراضي idle)، `last_auto_scout_at` nullable.
- `runAutoScout(target: WatchTarget): Promise<boolean>` — POST بنفس جسم scout + `depth:'deep', auto:true`، يتحقق `res.ok` فقط ولا يقرأ الستريم (fire-and-forget؛ الدالة تكمل بغض النظر).
- `listBrief(targetId): Promise<TargetBrief | null>` + `BriefRowSchema`.
- `setAutoScout(id, enabled)` (للمفتاح اليدوي في الشارة طويلاً؟ — YAGNI الآن، يكفي وجود العمود).

**Tests:** parseSseFrame يظل؛ لا شبكة في الاختبارات.

---

## Task 5 — الواجهة (`AtlasScoutTab.tsx`)

**Modify:**
1. `handleAdd`: بعد نجاح addTarget → `void atlasScoutApi.runAutoScout(target)` + toast «انطلق البحث العميق…» + ضبط حالة الهدف locally 'running'.
2. شارة على كل هدف في السجل: spinner (running) / نقطة (idle) / ✓ (done) / ⚠ (failed) من `lastRunStatus`.
3. `CityBriefCard` فوق الدفاتير: بطاقة افتتاحية (intro/شخصية/مشهد الطعام/هروب الطبيعة/عملي/متى تزور) — تظهر عند توفر brief للمدينة.
4. زر «اكتشف الآن» يبقى للبحث اليدوي الإضافي (deep) كما هو.
5. Empty state: «اختر مدينتك المفضلة — سنبدأ البحث العميق فوراً وبالخلفية».

---

## Task 6 — مداخل بوابة الأطلس (`components/portal/apps.ts`)

links للأطلس += `{ path: '/travel-atlas', label: 'المفضلات الذكية', note: 'بحث عميق تلقائي', icon: Sparkles }` (Sparkles مستورد أصلاً؟ تحقق واستورد من lib/icons).

---

## Task 7 — التحقق والتسليم

1. `bun run verify` (كل الاختبارات) + typecheck + lint على الملفات الملموسة.
2. build إنتاجي.
3. commit واحد واضح + push main.
4. تذكير المستخدم: `supabase db push` ثم `supabase functions deploy atlas-scout`.

## Risks / Tradeoffs
- **مدة الدالة**: brief يضيف ~30-60 ثانية؛ ميزانية RUN_BUDGET_MS = 8د كافية.
- **fire-and-forget**: لو سقط الاتصال قبل بدء الستريم قد لا ينطلق البحث — نعالجها بفحص res.ok وإظهار خطأ صادق عند الفشل.
- **تكلفة OpenRouter**: flash فقط + عمق deep الافتراضي؛ deepest يبقى يدوياً.
