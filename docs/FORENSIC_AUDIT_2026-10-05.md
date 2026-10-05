# تدقيق جنائي شامل — amv.life / `smarthub`

**التاريخ:** 2026-10-05
**الفرع:** `arena/01a10c3b-unified-life-forge` (من `main` @ `9907283`)
**الإصدار:** 1.5.0
**الحجم:** 911 ملف مصدري إنتاجي · ~497,000 سطر · 82 مسار · 89 جدول · 20 دالة طرفية · 85 هجرة

---

## 0. منهجية التدقيق وحدوده

### ما نُفِّذ فعلياً (لا تحليل نظري فقط)

| الإجراء | النتيجة |
|---|---|
| `npm install` | ❌ فشل (ERESOLVE) → نجح بـ `--legacy-peer-deps` |
| `tsc --noEmit` | ✅ نظيف (0 أخطاء) |
| `eslint .` | ⚠️ 3 أخطاء · 833 تحذير |
| `lint-budget` | ❌ الميزانية مُتجاوَزة بـ 175 تحذيراً + السكربت نفسه مكسور |
| `vitest run` | ✅ 1870 نجحت · 7 تخطّت (130 ملف) |
| `vite build` | ❌ **فشل** → ✅ نجح بعد تثبيت تبعية مفقودة |
| تحميل 82 مسار في بيئة تشغيل (jsdom + React 19 + المتجر الحقيقي) | 8 مسارات تنهار · 4 عالقة · 70 تعمل |
| خريطة استيراد كاملة (1040 ملف، static + dynamic) | 24 ملفاً يتيماً · 48 غير قابل للوصول |
| إعادة تشغيل متسلسلة لـ 85 هجرة مع احترام `DROP POLICY` | 192 سياسة حيّة · 3 ثغرات وصول |
| فحص أحجام الحزمة الفعلية بعد بناء ناجح | 28.5 MB · 1.11 MB gzip في المسار الحرج |

### حدود لا بد من ذكرها بصراحة

1. **لا متصفح حقيقي.** تنزيل Chromium محجوب في هذه البيئة (`playwright.azureedge.net` و`googlechromelabs.github.io` غير قابلين للوصول). استُعيض عنه بتركيب فعلي لـ `<App/>` في jsdom مع التوجيه الحقيقي والمخازن الحقيقية — وهذا يُثبت الانهيارات والحالات الفارغة، لكنه **لا يُثبت** مشاكل التخطيط البصري، الحركة، أو الأداء المُدرَك.
2. **لا وصول شبكي إلى Supabase.** `nmrckgzmluoavgucqvjh.supabase.co` محجوب هنا، فلم أستطع تنفيذ فحص RLS حيّ. كل نتائج الأمان أدناه مستخرجة من **إعادة تشغيل الهجرات بالترتيب** — وهي دقيقة بقدر ما يكون المخطط المُهاجَر مطابقاً للإنتاج.
3. **أخطاء `ResizeObserver` / `IntersectionObserver` في 8 مسارات ليست أعطالاً إنتاجية** — jsdom لا يوفّر هذه الواجهات والمتصفحات الحديثة توفّرها. لكنها تكشف مشكلة حقيقية من نوع آخر، موثّقة في البند **BUG-14**.

---

## 1. التشخيص التنفيذي

> التطبيق **ليس نموذجاً أولياً** — فيه هندسة حقيقية ومكلفة: 1870 اختباراً تمرّ، مصادقة موحّدة بنمط singleton مع حارس سباق، تشفير طرف-لطرف للمحادثات، طبقة offline على Dexie، سياسات RLS على كل الجداول الـ89، وحدود أخطاء، وقياس أداء (telemetry). هناك اهتمام حقيقي بالحرفة في عشرات المواضع.
>
> **لكن الفجوة بين ما يَعِد به المستودع عن نفسه وما يفعله فعلياً واسعة وخطيرة.** الوثيقة المعمارية (`AGENTS.md`) تصف طبقة حالة Zustand كـ«المحرّك الأساسي» — وهي **غير قابلة للوصول من التطبيق الحيّ إطلاقاً**. ويصف مخططات Zod للتحقّق كمصدر وحيد — **لا يستوردها التطبيق**. وملف الحراسة يصف أربعة مستويات صلاحيات — **مستويان فقط موصولان، ولا مسار واحد في التطبيق كله يتطلّب جلسة**. والـ`verify` المذكور في الوثيقة يشغّل typecheck+lint+budget+test — **بينما هو في `package.json` مجرد `vitest run`**. ولا يوجد أي سير عمل CI يشغّل اختباراً أو linting على الإطلاق؛ السير الوحيد ينشر إلى Supabase.
>
> **النمط المتكرّر — والسبب الجذري الأعمق — هو: البنية التحتية للضمانات موجودة ومعطّلة.** اختبار RLS «العدائي» الذي صُمّم ليكون آخر خط دفاع يقرأ متغيرات بيئة غير موجودة، فيعود `null` ويمرّ 30 اختباراً **دون أن ينفّذ طلباً واحداً** (8 ملّي ثانية). ولو كان قد عمل، لفشل فوراً: فهو يُدرج `places` ضمن الجداول الخاصة، بينما السياسة الحيّة هي `FOR SELECT TO anon USING (true)` — **أي أن مواقع GPS المحفوظة لكل المستخدمين مقروءة لأي شخص يملك المفتاح العام المضمَّن في الحزمة**. الاختبار والمخطط يتناقضان تناقضاً مباشراً، ولم يكتشفه أحد لأن الاختبار خامل.
>
> **الحالة الحقيقية:** منتج بسطح ميزات ضخم (26 وحدة) وعمق تنفيذ متفاوت جداً، يقف على بنية تحتية للجودة *تبدو* صارمة وهي في الواقع غير منفَّذة. **ليس جاهزاً للإطلاق**: ثغرة خصوصية حرجة واحدة على الأقل، تحميل أولي 1.11 MB مضغوط، بناء إنتاجي يفشل على أي مدير حزم غير bun، ولا مسار استرداد لكلمة مرور منسية.

---

## 2. خريطة النظام (كيف يعمل فعلياً)

### 2.1 الطبقات الحيّة

```
main.tsx
 ├─ initTelemetry()  installChunkRecovery()  bootMotion()  registerServiceWorker()
 └─ <App/>
     QueryClientProvider (staleTime 5د · gcTime 15د · retry 1 · لا refetchOnFocus)
      └ AppProvider ──────────── تفضيلات/سمة/t() ← localStorage
        └ SystemEngineProvider
          └ IconProvider ─────── ⚠ import * as Phosphor (الحزمة كاملة)
            └ VoicePlayer / ImageUpload / PodcastPlayer / Tooltip
              └ ErrorBoundary → BrowserRouter
                 ├ Runners: AutoPrayerTheme · Presence · Network · VisitTracker · StreakGuardian
                 ├ NativeShell · EdgeSwipeBack · PortalBackButton · PodcastMiniPlayer
                 └ AnimatedRoutes → <AnimatePresence> → 82 Route، كل واحد ملفوف بـ ErrorBoundary
```

**المصادقة الحيّة:** `src/hooks/useAuth.tsx` — singleton على مستوى الوحدة، اشتراك واحد في `onAuthStateChange`، عدّاد `activeRequestId` يمنع سباق الاستجابات. **هذا الجزء مكتوب جيداً.**

**الحالة:** React Context (`AppContext`, `SystemEngineContext`) + React Query + `localStorage` مباشرة في **75 ملفاً / 470 موضعاً**. Zustand موجود كتبعية لكنه **غير مستخدم في المسار الحيّ**.

### 2.2 الطبقات الميتة (موجودة، مُختبَرة، غير موصولة)

```
src/stores/{authStore,systemStore,fitnessStore,index}.ts   ← AGENTS.md يسمّيها «المحرّكات الأساسية»
        ↑ المستهلك الوحيد
src/features/fitness/model/useFitnessEngine.ts             (ميت)
        ↑
src/features/fitness/ui/pages/FitnessDashboardPage.tsx     (ميت)
        ↑
src/features/fitness/index.tsx                             (لا يستورده أحد — نهاية السلسلة)

src/utils/validation/schemas.ts    ← AGENTS.md: «كل البيانات الواردة تُتحقَّق هنا» (غير مستورَد)
src/lib/auth/localAuthStore.ts     ← وضع مصادقة محلّي لا يمكن تفعيله أبداً (انظر BUG-06)
src/lib/optimistic.ts              ← runOptimistic + rollback، مُختبَر، غير مستخدم
src/hooks/useManagedEffect.ts      ← مُختبَر، غير مستخدم
src/features/weather/engine/PWSAggregator.ts + sources/ + types/   ← نظام محطات طقس كامل، ميت
src/components/routing/RouteGuards.tsx → PublicRoute, AuthenticatedRoute   ← 0 استخدام
```

### 2.3 تدفق مُثبَت من الواجهة إلى القاعدة والعودة

| الميزة | UI → State → Service → API → DB → UI | الحالة |
|---|---|---|
| تسجيل الدخول | `Auth.tsx` → `signIn` → `supabase.auth` → `onAuthStateChange` → `applySession` → `profiles` → listeners → re-render | ✅ متّصل بالكامل |
| أوقات الصلاة | `PrayerTimes` → `adhan` محلياً → عرض | ✅ (عُرض `العصر 12:32 م` في التشغيل) |
| رفع صورة محادثة | `ImageUploadContext` → `XHR POST` إلى **`undefined/storage/...`** | ❌ **مقطوع** (BUG-02) |
| محادثة جماعية | `GroupChat` → `useChatMessages` → `supabase.channel()` → **throw** | ❌ **ينهار** (BUG-03) |
| إعدادات الخصوصية | Toggle → `profiles.privacy_settings` JSONB → **لا سياسة تقرؤها** | ❌ **بلا أثر** (SEC-02) |
| الأماكن المحفوظة | `places` → سياستان متناقضتان، الأوسع تفوز | ❌ **مكشوفة** (SEC-01) |

---

## 3. جرد الأخطاء (Bug Inventory)

### 🔴 CRITICAL

---

#### SEC-01 — تسريب مواقع GPS لجميع المستخدمين لأي زائر مجهول

| | |
|---|---|
| **الموقع** | `supabase/migrations/20260724000000_travel_atlas.sql` · `places`, `place_photos`, `place_links` |
| **السبب الجذري** | سياسات RLS في Postgres **تُجمَّع بـ OR** (permissive). الجدول يحمل سياستين متناقضتين؛ الأوسع تُلغي الأضيق عملياً. |

**الدليل** (من إعادة تشغيل الهجرات بالترتيب، 192 سياسة حيّة):
```
-- places --
  public read places   :: FOR SELECT TO anon, authenticated USING (true)     ← تفوز
  Users read own places:: FOR SELECT TO authenticated USING (auth.uid() = user_id)
  owner writes places  :: FOR ALL TO authenticated USING (auth.uid() = user_id) ...
```
والجدول بيانات مستخدم صريحة:
```sql
CREATE TABLE public.places (
  user_id  UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  location GEOGRAPHY(POINT, 4326) NOT NULL,   -- إحداثيات دقيقة
  description_ar TEXT, rating NUMERIC(2,1), cover_photo_url TEXT, ...
```

**السلوك الملاحَظ:** أي شخص يملك المفتاح العام — وهو **مضمَّن نصّياً في `src/integrations/supabase/client.ts:37`** ويُشحن في كل حزمة — يستطيع `GET /rest/v1/places?select=*` ويحصل على كل الأماكن المحفوظة لكل المستخدمين بإحداثياتها.

**السلوك المتوقَّع:** `places` بيانات خاصة. اختبار المستودع نفسه يقول ذلك: `src/test/rlsHostileClient.test.ts:33-35` يُدرج `places` و`place_photos` في `PRIVATE_TABLES` ويؤكّد أن العميل المجهول يحصل على **صفر صفوف**.

**لماذا لم يُكتشف:** الاختبار **لا يعمل إطلاقاً** — انظر `TEST-01`. لو عمل ليوم واحد لفشل فوراً.

**الأثر:** كشف سجلّ مواقع جغرافية. هذا تسريب بيانات شخصية حسّاسة بمعنى GDPR، وليس مجرد خلل.
**الإصلاح:** `DROP POLICY "public read places" ON public.places;` (ونظيراتها على `place_photos`, `place_links`). إن كان المقصود كتالوج أماكن عامّاً، فصله في جدول `curated_places` منفصل.
**خطر الانحدار:** صفحة `/travel-atlas/explore` قد تعتمد على القراءة المجهولة — تحتاج اختباراً بعد الإصلاح.

---

#### SEC-02 — إعدادات الخصوصية الثلاث لا تفعل شيئاً (تحكّم وهمي)

| | |
|---|---|
| **الموقع** | `src/features/profile/components/ProfilePrivacySettingsTab.tsx` · `migrations/20260822000000_profile_grand_upgrade.sql` |

الواجهة تعرض ثلاثة مفاتيح صريحة للمستخدم:
- `hide_location` — «إخفاء الموقع الجغرافي — عدم عرض موقعك الحالي في رأس الملف الشخصي»
- `hide_activity` — «إخفاء سجل الأنشطة والإحصائيات — منع الزوار من رؤية إحصائيات اللياقة واللغات والمعرفة»
- `hide_online_status` — «إخفاء حالة الاتصال»

**الدليل:**
```
$ grep -rn "privacy_settings" supabase/migrations/*.sql | grep -iE "polic|using|check"
(فارغ)
```
لا سياسة RLS، ولا View، ولا RPC يقرأ `privacy_settings`. وهي مخزَّنة كـ JSONB على صفّ `profiles` الذي هو نفسه مقروء للجميع:
```
profiles :: "Public profiles are viewable by everyone"
            FOR SELECT USING (is_public = true OR auth.uid() = user_id)   ← لا TO clause ⇒ يشمل anon
profiles.is_public  BOOLEAN DEFAULT true                                   ← عام افتراضياً
```

**الملاحَظ:** تفعيل «إخفاء الموقع» يكتب `{"hide_location": true}` ثم **لا شيء**. أي زائر مجهول يستطيع قراءة `location`, `status_text`, `bio`, `title`, `social_links`, `website_url` — **ويقرأ قيم مفاتيح الخصوصية نفسها**.
**المتوقَّع:** الإخفاء يُفرَض على الخادم.
**الأثر:** المستخدم يتّخذ قراراً بناءً على ضمان غير موجود. أخطر من غياب الميزة.
**الإصلاح:** View آمن `public_profiles` يُسقط الأعمدة حسب `privacy_settings`، ويُلغى الوصول المباشر لـ`profiles` لغير المالك. وتحويل `is_public` إلى `DEFAULT false`.

---

#### BUILD-01 — البناء الإنتاجي يفشل على أي مدير حزم غير bun

| | |
|---|---|
| **الموقع** | `package.json` · `src/features/games/components/chess3d/Board3D.tsx:13` · `src/features/mind/components/MindScene.tsx:3` |

**إعادة الإنتاج:**
```
$ npm install --legacy-peer-deps && npx vite build
error during build:
Error: [vite]: Rolldown failed to resolve import "postprocessing"
from "node_modules/@react-three/postprocessing/dist/index.js".
✗ Build failed in 13.77s

$ npm install --no-save postprocessing && npx vite build
✓ built in 12.92s                     ← سبب واحد، لا غير
```

**السبب الجذري:** `@react-three/postprocessing@3.1.0` يُعلن `postprocessing: ^6.36.0` كـ peerDependency. **`postprocessing` غير مذكور في `dependencies`.** bun يثبّت الـpeers تلقائياً فيبدو كل شيء سليماً محلياً؛ npm/pnpm/yarn-strict لا تفعل.
**الأثر:** أي مساهم أو CI أو fork لا يستخدم bun لا يستطيع بناء المشروع. ومسارا `/games/chess` (اللوح ثلاثي الأبعاد) و`/pkm/mind` يعتمدان عليه.
**الخطر الكامن:** `postprocessing@6.39.4` يتطلّب `three >= 0.168 < 0.186`؛ المشروع على `three@0.185.1` — **على بُعد إصدار ثانوي واحد من الكسر الصامت**، وRenovate مضبوط على الدمج التلقائي للتحديثات الثانوية (CI-01).
**الإصلاح:** `"postprocessing": "^6.39.0"` في `dependencies` + تثبيت `three` على `0.185.x`.

---

#### CI-01 — الدمج التلقائي للتبعيات يعمل بلا أي فحص

| | |
|---|---|
| **الموقع** | `renovate.json:7-12` · `.github/workflows/` |

```json
{ "matchUpdateTypes": ["patch","minor"], "automerge": true,
  "requiredStatusChecks": ["verify","e2e","Enforce bundle budget"] }
```

**الدليل:**
```
$ find .github -type f
.github/workflows/supabase-deploy.yml        ← السير الوحيد
```
لا توجد وظيفة باسم `verify`، ولا `e2e`، ولا `Enforce bundle budget`. كما أن `requiredStatusChecks` كمصفوفة **خيار مُهمل/مُزال** في إصدارات Renovate الحديثة ويُتجاهَل.

**الملاحَظ:** تحديثات patch/minor تُدمج في `main` تلقائياً **دون typecheck ولا lint ولا اختبار ولا e2e ولا ميزانية حزمة**.
**الأثر المركّب:** دمج في `main` → يُطلق `supabase-deploy.yml` إن لمس `supabase/**`. سلسلة من الدمج الأعمى إلى نشر الإنتاج.
**الإصلاح:** سير عمل `verify.yml` فعلي (typecheck + lint + lint:budget + test) و`e2e.yml`، وحماية الفرع، واستبدال `requiredStatusChecks` بالصيغة المدعومة.

---

#### TEST-01 — طقم اختبارات الأمان كامل لا ينفّذ شيئاً (30 اختباراً وهمياً)

| | |
|---|---|
| **الموقع** | `src/test/rlsHostileClient.test.ts:20-21, 56, 71` |

```ts
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const anon = URL && KEY ? createClient(URL, KEY, …) : null;     // ← null
…
it.each(PRIVATE_TABLES)('cannot read rows from %s', async (table) => {
  if (!anon || !reachable) return;    // ← خروج فوري، صفر تأكيدات
```

**الدليل المُنفَّذ:**
```
AUDIT_ENV| VITE_SUPABASE_URL = undefined
AUDIT_ENV| VITE_SUPABASE_PUBLISHABLE_KEY = undefined
AUDIT_ENV| isSupabaseConfigured = true        ← العميل المركزي يعمل بفضل الـfallback
…
✓ src/test/rlsHostileClient.test.ts (30 tests) 8ms    ← 30 رحلة شبكة في 8ms = مستحيل
```

**المفارقة:** `client.ts` أُضيفت إليه بيانات اعتماد احتياطية مضمَّنة تحديداً ليعمل التطبيق بلا `.env`. لكن هذا الاختبار **لا يستخدم العميل المركزي**، فيعطّل نفسه بصمت. والتعليق يقول «وظيفة e2e هي التي يُتوقَّع أن تملك الاتصال» — **ولا توجد وظيفة e2e** (CI-01).
**الأثر:** الضمان الأمني الوحيد الآلي في المستودع معطَّل، وهو السبب المباشر لعدم اكتشاف SEC-01.
**الإصلاح:** `import { supabase } from '@/integrations/supabase/client'` أو إعادة استخدام نفس ثوابت الـfallback، و**الفشل بصوت عالٍ** عند انعدام الاتصال بدل التخطّي.

---

#### BUG-02 — رفع الصور في المحادثات مكسور كلياً بلا `.env`

| | |
|---|---|
| **الموقع** | `src/contexts/ImageUploadContext.tsx:181-211` |

```ts
const token   = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
…
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const url = `${supabaseUrl}/storage/v1/object/chat-files/${path}`;
xhr.open('POST', url);
xhr.setRequestHeader('apikey', anonKey);
```

**الدليل المُنفَّذ:**
```
AUDIT_ENV| ImageUploadContext upload URL = undefined/storage/v1/object/chat-files/u1/c1/123.jpg
```

**السبب الجذري — ثلاثة أنماط لنفس القيمة:**
1. `integrations/supabase/client.ts` → `env || FALLBACK_CONST` ✅
2. `features/archive/api.ts:5` → `env || 'https://nmrckgzmluoavgucqvjh.supabase.co'` (نسخة ثانية مكرّرة من نفس الرابط) ⚠️
3. `contexts/ImageUploadContext.tsx` → `env` فقط ❌

شبكة الأمان أُضيفت في ملف واحد ونُسيت في الباقي.

**الملاحَظ:** `xhr.open('POST', 'undefined/storage/…')` يُحَلّ نسبياً إلى `https://<host>/undefined/storage/…` → 404 → يرفض المتعهّد بـ `Upload failed: 404`. ويُرسَل الترويسة `apikey: undefined`.
**المتوقَّع:** الرفع ينجح في نفس السيناريوهات الثلاثة التي يسمّيها تعليق `client.ts` صراحةً (حزم منشورة قبل حقن المتغيّرات، نسخ GitHub الخارجية، `dev` محلي بلا `.env`).
**الإصلاح:** استيراد `supabase.storage.from('chat-files').upload()` أو تصدير `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` من `client.ts` واستهلاكهما في كل مكان. **منع `import.meta.env.VITE_SUPABASE_*` خارج `client.ts` بقاعدة ESLint.**

---

#### BUG-03 — المحادثة الجماعية تنهار عند فتحها (مُعاد إنتاجه في التشغيل)

| | |
|---|---|
| **الموقع** | `src/lib/chat/hooks/useChatMessages.ts:131-158` |

**الدليل المُلتقَط من تركيب `/chat/g/:chatId` الفعلي:**
```
AUDIT_ERR|/chat/g/00000000-…|ErrorBoundary caught:
  cannot add `postgres_changes` callbacks for realtime:chat:00000000-… after `subscribe()`
```

```ts
useEffect(() => {
  const channel = supabase.channel(`chat:${chatId}`);   // يُعيد القناة القائمة إن وُجدت
  channel.on('postgres_changes', …).on(…).on(…).subscribe();
  return () => { supabase.removeChannel(channel); };     // ⚠ غير متزامن، لا يُنتظَر
}, [chatId, qc, queryKey, viewerId]);                    // ⚠ viewerId يتغيّر null → id
```

**السبب الجذري:** `viewerId` يأتي من `useAuth()` ويتحوّل حتماً من `undefined` إلى معرّف المستخدم بعد استرجاع الجلسة ⇒ يُعاد تشغيل الـeffect. التنظيف يستدعي `removeChannel` (غير متزامن)، ثم يُستدعى `supabase.channel()` **فوراً وبشكل متزامن** فيُعيد نفس كائن القناة الذي ما يزال في حالة `joined`. استدعاء `.on()` على قناة مُشترَكة يرمي استثناءً **داخل الـeffect** ⇒ React يصعّده ⇒ ErrorBoundary. يتفاقم مع `<AnimatePresence>` الذي يُبقي الصفحة الخارجة مركّبة أثناء تركيب الداخلة (نفس اسم القناة مرّتين).
**الملاحَظ:** شاشة «حدث خطأ غير متوقع» بدل المحادثة، لكل مستخدم مسجَّل دخول، في كل مرة.
**الإصلاح:** اسم قناة فريد لكل تركيب (`chat:${chatId}:${instanceId}`)، إخراج `viewerId`/`queryKey` من مصفوفة التبعيات (استخدام ref)، و`await supabase.removeChannel()` قبل إعادة الاشتراك.
**خطر الانحدار:** `useChatMembers.ts:31` و`usePresence.ts:401` و`useUnreadMessages.ts:118` و`KeywordAlertsView.tsx:156` و`ShelfDetail.tsx:70` تتبع **نفس النمط** — يجب تدقيقها معاً.

---

#### DB-01 — سلسلة الهجرات لا يمكن تطبيقها على قاعدة بيانات جديدة

| | |
|---|---|
| **الموقع** | `20260724000000_travel_atlas.sql` ↔ `20260724210734_cea01ba6….sql` |

```
$ grep -hoP "CREATE TABLE (?!IF NOT EXISTS)(?:public\.)?[a-z_]+" supabase/migrations/*.sql | sort | uniq -c | awk '$1>1'
      2 public.places
      2 public.place_photos
      2 public.countries

$ grep -rn "DROP TABLE.*places" supabase/migrations/*.sql
(فارغ)
```
ثلاثة جداول تُنشَأ مرّتين بـ `CREATE TABLE` بدون `IF NOT EXISTS` وبلا `DROP` بينهما، **وبمخططين مختلفين** (النسخة الأولى فيها `user_id` و`GEOGRAPHY(POINT)`، الثانية بلا `user_id`).

**الملاحَظ:** `supabase db reset` أو بناء بيئة staging جديدة يفشل بـ `relation "places" already exists` عند الهجرة الثانية.
**لماذا لا يظهر:** الإنتاج يعمل لأن الهجرة الأولى طُبّقت قبل كتابة الثانية، و`scripts/supabase-migrate-remote.py` يتخطّى المُطبَّق.
**الأثر:** **لا يمكن إعادة بناء قاعدة البيانات من الصفر** — لا تعافي من كارثة، ولا بيئة اختبار، ولا تطوير محلّي. تصنيف Hidden/Critical: لن يظهر إلا في أسوأ لحظة ممكنة.
**الإصلاح:** تعديل الهجرات التاريخية لتكون idempotent (`IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN IF NOT EXISTS`)، والتحقّق بـ CI يُعيد تشغيل كل السلسلة على قاعدة فارغة في كل PR.

---

#### UX-01 — لا توجد أي وسيلة لاستعادة كلمة مرور منسية

| | |
|---|---|
| **الموقع** | `src/hooks/useAuth.tsx:40-54` · `src/pages/Auth.tsx` |

```ts
const USERNAME_DOMAIN = 'smartapp.local';
function usernameToEmail(raw) { return `${raw.toLowerCase().trim()}@${USERNAME_DOMAIN}`; }
```
الحسابات تُنشأ ببريد اصطناعي `<username>@smartapp.local` **لا يملكه المستخدم ولا يوجد أصلاً**.

```
$ grep -rniE "resetPassword|forgot|نسيت كلمة|استعادة كلمة" src --include=*.tsx
(لا نتيجة ذات صلة)
```

**الملاحَظ:** مستخدم ينسى كلمة مروره يفقد حسابه وكل بياناته نهائياً. لا بريد، لا هاتف، لا أسئلة أمان، لا رمز استرداد.
**المتوقَّع:** أي مسار استرداد.
**الأثر:** فقدان بيانات دائم من إجراء يحدث لنسبة معتبرة من المستخدمين. يتفاقم بغياب تصدير البيانات.
**الإصلاح:** بريد اختياري حقيقي وقت التسجيل، أو رموز استرداد تُعرَض مرة واحدة، أو ربط OAuth.

---

### 🟠 HIGH

---

#### SEC-03 — تصعيد صلاحيات المشرف عبر حقل يكتبه المستخدم نفسه

| | |
|---|---|
| **الموقع** | `src/hooks/useAdmin.ts:34-37` |

تعليق `RouteGuards.tsx:60-62` يَعِد:
> *«The role is read from the database (`user_roles`), **never from local storage, so it cannot be granted by editing the browser**.»*

الشيفرة الفعلية:
```ts
if (!error && data) { setIsAdmin(true); }
else {
  const isMetaAdmin = user!.user_metadata?.role === 'admin'
                   || user!.app_metadata?.role === 'admin';
  setIsAdmin(Boolean(isMetaAdmin));
}
```

**السبب الجذري:** `user_metadata` **قابل للكتابة من العميل** عبر `supabase.auth.updateUser({ data: { role: 'admin' } })` بالمفتاح العام. (`app_metadata` ليس كذلك — المشكلة في الأول حصراً.) كما أن الفرع يُفعَّل أيضاً عند **أي خطأ عابر** في استعلام `user_roles` (شبكة/RLS)، فيرتدّ النظام من مصدر موثوق إلى مصدر مزوَّر.

**السلسلة الكاملة:** `/german-club/review` هو المسار الوحيد خلف `AdminRoute`. وقاعدة البيانات **لا تمنع** الكتابة أيضاً:
```
content_generation_jobs   :: "allow authenticated manages jobs"
                             FOR ALL USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role')
generation_job_rejections :: "authenticated manages rejections"  FOR ALL USING (auth.uid() IS NOT NULL)
model_performance_stats   :: "authenticated manages performance stats" FOR ALL USING (auth.uid() IS NOT NULL)
```
السياسات **مسمّاة «admin manages…» لكنها تمنح كل مستخدم مسجَّل صلاحية SELECT/INSERT/UPDATE/DELETE كاملة**. ولا دالة طرفية واحدة تتحقّق من الدور:
```
$ grep -rn "user_roles" supabase/functions --include=*.ts
(فارغ)
```
**الإصلاح:** حذف ارتداد `user_metadata` كلياً؛ عند فشل الاستعلام ⇒ `isAdmin=false`. واستبدال سياسات `auth.uid() IS NOT NULL` بـ `public.has_role(auth.uid(), 'admin')` (الدالة موجودة بالفعل في `20260718000000`، وغير مستخدمة).

---

#### ARCH-01 — طبقة الحالة الموثّقة كـ«المحرّك الأساسي» غير موجودة في التطبيق الحيّ

`AGENTS.md §2`: *«Global application state is managed via zustand. Core engines (Auth, System, Fitness) are configured with persistence, strict action interfaces, and explicit `partialize` methods.»*

**الدليل** (خريطة استيراد كاملة من `main.tsx`، static + dynamic):
```
### غير قابل للوصول من main.tsx:
  src/stores/authStore.ts
  src/stores/systemStore.ts
  src/stores/fitnessStore.ts
  src/stores/index.ts
  src/utils/validation/schemas.ts        ← AGENTS.md §1: «كل البيانات تُتحقَّق هنا»
  src/utils/validation/index.ts
  src/features/fitness/model/useFitnessEngine.ts
  src/features/fitness/ui/pages/FitnessDashboardPage.tsx
  … + 40 أخرى
```
المستهلك الوحيد للمتاجر الثلاثة هو `useFitnessEngine.ts` ← يستهلكه `FitnessDashboardPage.tsx` ← يستهلكه `features/fitness/index.tsx` ← **لا يستورده أحد**.

**الأثر:** 11 اختباراً أخضر يحرس شيفرة لا تعمل. أي وكيل أو مطوّر جديد يقرأ `AGENTS.md` سيعدّل الطبقة الخاطئة. والواجهة الحقيقية `/fitness` تنفَّذ في `src/pages/Fitness.tsx` بتنفيذ موازٍ ثانٍ.
**القرار المطلوب:** حذف أو وصل — لا إبقاء.

---

#### ARCH-02 — ثلاثة أنماط متنافسة لبوّابة المصادقة، وأفضلها غير مستخدَم

| النمط | الاستخدام | يعيد المستخدم بعد الدخول؟ | زر للمتابعة؟ |
|---|---|---|---|
| `AuthenticatedRoute` (`RouteGuards.tsx`) | **0 مسار** | يُمرّر `state.from` — **و`Auth.tsx` لا يقرأ `location.state` أبداً** | — |
| `<AuthGuard>` (`components/AuthGuard.tsx`) | **1 صفحة** (`/wellness`) | `?next=` ✅ يُقرأ في `Auth.tsx:86` | ✅ |
| شروط `if (!user)` يدوية | **17 ملفاً** | ❌ | غالباً ❌ |

**الأسوأ** — `src/features/marginalia/pages/Marginalia.tsx:103-113`:
```tsx
if (!user) return (<PageShell><BackButton/>
  <AppCard className="text-center py-10">
    <p>سجّل الدخول لبناء أرشيفك الشخصي.</p>
  </AppCard></PageShell>);
```
نصّ فقط. **لا زر، لا رابط، لا مسار للأمام.** مُثبَت في التشغيل: `AUDIT|/marginalia|len=2139|text="سجّل الدخول لبناء أرشيفك الشخصي."`

**نتيجة جانبية:** **لا مسار واحد من الـ82 يتطلّب جلسة.** الحماية كلها داخل المكوّنات، متفاوتة وقابلة للنسيان.

---

#### BUG-04 — انتهاء الجلسة غير معالَج على 81 مساراً من 82

```
useAuth.tsx:171   window.dispatchEvent(new CustomEvent('auth-session-expired'))
AuthGuard.tsx:38  window.addEventListener('auth-session-expired', handleExpired)
```
`AuthGuard` **لا يُركَّب إلا داخل `/wellness`**. في كل مكان آخر يُطلَق الحدث ولا يستمع إليه أحد.

**الملاحَظ:** انتهاء صلاحية الرمز ⇒ المستخدم يبقى على شاشة تبدو سليمة، كل إجراء يفشل بصمت، ولا توست ولا إعادة توجيه.
**الإصلاح:** نقل المستمع إلى مكوّن جذر دائم التركيب (بجانب `NetworkConnectivityListener` في `App.tsx`).

---

#### BUG-05 — زر «إعادة المحاولة» في حدود الأخطاء لا يستطيع التعافي من أي خطأ حتمي

`src/components/ErrorBoundary.tsx:38-40`:
```ts
handleRetry = () => { this.setState({ hasError: false }); };
```
لا `key` للإجبار على إعادة التركيب، لا إعادة ضبط للحالة، لا عدّاد محاولات، لا تمييز بين خطأ عابر وحتمي.

**الملاحَظ:** في BUG-03، الضغط على «إعادة المحاولة» يُعيد عرض نفس الأبناء ⇒ نفس الـeffect ⇒ نفس الاستثناء ⇒ نفس الشاشة. حلقة لانهائية بلا تقدّم.
**الإصلاح:** `key` تصاعدي على الأبناء، وحدّ أقصى للمحاولات، وتحويل الزر إلى «إعادة تحميل الصفحة» بعد فشلين.

---

#### DX-01 — مُلحق البناء يكتب في شيفرة مُتتبَّعة بـgit عند كل `dev`

**مُلاحَظ أثناء هذا التدقيق** — بعد `npx vite` ظهر فجأة:
```
$ git status --short
 M supabase/functions/mcp/index.ts

-import { auth, defineMcp } from "npm:@lovable.dev/mcp-js@0.26.1";
+import { auth, defineMcp } from "npm:@lovable.dev/mcp-js@0.26.3";
```
`mcpPlugin()` (`vite.config.ts:69`) يُولّد ويكتب ملف دالة طرفية **مُتتبَّعة** عند كل إقلاع لخادم التطوير، مثبّتاً أي إصدار موجود محلياً.

**الأثر المركّب:** `supabase-deploy.yml` يُطلَق على `paths: supabase/functions/**`. مطوّر يُشغّل `bun run dev` ثم `git commit -a` **ينشر دالة طرفية إلى الإنتاج دون قصد**.
**الإصلاح:** إخراج الناتج إلى مجلد مُولَّد غير مُتتبَّع، أو تشغيل المُلحق في وضع البناء فقط، أو إضافة فحص CI يرفض انحراف الملف المُولَّد.

---

#### DEPLOY-01 — سير النشر ينشر دالة واحدة من أصل 20، وتعليقه يقول العكس

`.github/workflows/supabase-deploy.yml`:
```yaml
# ... and all declared edge functions are redeployed.
- name: Deploy edge functions
  run: supabase functions deploy atlas-scout --linked
```
```
$ ls supabase/functions | grep -v _shared | wc -l
20
```
19 دالة — من ضمنها `dexscreener-proxy`, `archive-generate`, `mcp`, `extract-article`, `check-premium-entitlement` — **لا تُنشَر أبداً تلقائياً**. أي تعديل عليها يُدمج في `main` ويبدو منشوراً وليس كذلك. انحراف صامت بين المستودع والإنتاج.

---

#### PERF-01 — 641 KB مضغوطة من الأيقونات في المسار الحرج

`src/lib/icons.tsx:20`:
```ts
import * as PhosMod from '@phosphor-icons/react';   // استيراد نطاق لكامل الـbarrel (~9000 وحدة)
```
استيراد النطاق **يُلغي الـtree-shaking كلياً**.

**القياس على بناء ناجح:**
```
3434.6 KB → 641.2 KB gz   assets/icons-uC-Zb_A3.js      ← مُشار إليه من index.html
 477.4 KB →  64.8 KB gz   assets/index-….css
 289.4 KB →  93.1 KB gz   assets/index-….js
 …
إجمالي التحميل الأوّلي: 5.24 MB خام | 1.11 MB gzip
```
تعليق `vite.config.ts:24-28` يَعِد بتصفية مكتبات الأيقونات من الـpreload — لكن المرشّح يستثني `icons-alt` فقط، و**الحزمة الأساسية `icons` تمرّ**. مُلحق `phosphorPruneWeights()` موجود ولم يُقلّص شيئاً يُذكر.
**الأثر:** على 3G (~400 kbps) ≈ **23 ثانية حتى أول رسم**. في تطبيق عربي موجّه للجوال أساساً.
**الإصلاح:** استيرادات مُسمّاة أو `@phosphor-icons/react/dist/csr/<Icon>`، أو توليد barrel يقتصر على الأيقونات الـ263 المستخدمة فعلياً.

---

#### PERF-02 — حزمة واحدة بـ6.5 MB من ملف مصدري واحد بـ7.8 MB

```
6553.9 KB  BayanDashboard-DvBto-UM.js            (395 KB gz)
-rw-r--r-- 7863380  src/features/diwan/data/bayanLinguisticDatabaseLarge.ts
```
قاعدة بيانات لغوية ضخمة مكتوبة كـTypeScript مُستورَد ثابتاً ⇒ تُحلَّل وتُترجَم على الخيط الرئيسي عند فتح `/diwan/bayan`.

**مُثبَت في التشغيل:** بعد **6 ثوانٍ** كاملة، المسار ما يزال على هيكل التحميل:
```
BLANK|/diwan/bayan|htmlLen=4029|visibleText=""
BLANK_SKEL|/diwan/bayan|skeletons=28|spinners=0
```
**التناقض:** المستودع يملك بالفعل النمط الصحيح — `poetryData.ts` يجلب `/data/diwan-poetry.json` كأصل وقت التشغيل. نفس المشكلة، حلّان مختلفان.
**الإصلاح:** تحويله إلى JSON في `public/data/` مع جلب عند الطلب + فهرسة.

---

### 🟡 MEDIUM

**BUG-06 — وضع مصادقة محلّي كامل لا يمكن تفعيله أبداً.** `isSupabaseConfigured` أصبح `true` دائماً بعد إضافة الـfallbacks (مُثبَت: `AUDIT_ENV| isSupabaseConfigured = true`). كل فروع `if (!isSupabaseConfigured)` في `useAuth.tsx` ميتة ⇒ `src/lib/auth/localAuthStore.ts` بأكمله (ومعه ملف اختباره) شيفرة ميتة تُشحن. وتعليق `client.ts:1-16` يصف سلوكاً (اعتراض `fetch` وإرجاع 503، استخدام نطاق `.invalid`) **غير موجود في الشيفرة إطلاقاً** — توثيق كاذب.

**BUG-07 — عدّاد يُعرض دائماً صفراً.** `src/features/time-ledger/components/LayerToggleBar.tsx:31-34`:
```ts
const layerCounts = useMemo(() => {
  // This would ideally come from the parent, but for now we use a placeholder
  return new Map<TimeLedgerSource, number>();   // فارغة دائماً
}, []);
```
النتيجة: الفرع `{count > 0 && …}` (السطر 100) **شيفرة لا تُبلَغ أبداً**، وكل `title` يقول للمستخدم «`<الطبقة>`: 0 إدخال» — **معلومة خاطئة** حتى حين تحتوي الطبقة بيانات. وفي السطر 43 `onClick={() => {}}` على `AppCard pressable` — مؤشّر «قابل للضغط» بلا سلوك.

**BUG-08 — `loadSettings`/`saveSettings` واجهة ميتة وغامضة العقد.** `useAuth.tsx:300-317` يصدّرهما ضمن `UseAuthResult`؛ **صفر مستهلك** (نتائج grep في `App.tsx` هي تصادم تسمية مع مُحمِّل صفحة كسول). كما أن `loadSettings` يُعيد `null` لثلاث حالات مختلفة (لا مستخدم / خطأ / لا إعدادات) — لو استُخدم لكان خطر فقدان بيانات: خطأ شبكة عابر يُقرأ كـ«لا إعدادات» ⇒ كتابة الافتراضيات فوق إعدادات الخادم.

**BUG-09 — تسجيل الخروج يدمّر بيانات محلية ثم قد يفشل.** `useAuth.tsx:230-290` يمسح المسودّات، ثم `clearAtlasCache()`، ثم مفاتيح التشفير، **ثم** `await supabase.auth.signOut()`. إن فشل الأخير (شبكة)، المستخدم يبقى مسجّلاً **وقد فقد مسودّاته وذاكرة الأطلس ومفاتيح الجلسة**. عملية مدمّرة غير ذرّية بلا تراجع. (يستحق الذكر: `AccountPrivacySection.tsx:108` يعلّق بأن «signOut مرن ولا يرمي أبداً» — وهذا **غير صحيح**.)

**BUG-10 — ابتلاع صامت لخطأ جلب الملف الشخصي.** `useAuth.tsx:120-124`: `const { data } = await supabase.from('profiles')…` — حقل `error` مُهمَل. عند الفشل ⇒ `currentProfile = null` بصمت ⇒ واجهة «مسجَّل دخول بلا ملف» دون أي إشارة أو إعادة محاولة.

**BUG-11 — لا مهلة زمنية على أي استعلام Supabase.** 510 موضع استدعاء `.from()`/`.rpc()`، و43 استخدام فقط لـ`AbortController`/`AbortSignal.timeout` في 22 ملفاً. `supabase-js` بلا مهلة افتراضية. **مُثبَت:** `/archive/1` يعرض دوّاراً لا ينتهي بعد 6 ثوانٍ على شبكة ميتة — بينما الشيفرة نفسها (`ArchiveReader.tsx:500-517`) مكتوبة جيداً (`alive` guard + `catch` + `finally`). المشكلة ليست في معالجة الخطأ بل في أن الخطأ لا يصل أبداً.

**BUG-12 — تقسيم كود مُعلَن لا يحدث.** تحذيرات البناء:
```
[INEFFECTIVE_DYNAMIC_IMPORT] src/features/german-club/lib/search/index.ts dynamically imported
  by QuickLookup.tsx but also statically imported by QuickLookup.tsx
[INEFFECTIVE_DYNAMIC_IMPORT] src/lib/chat/idbCache.ts dynamically imported by settings.ts
  but also statically imported by useChatMessages.ts, useChats.ts, index.ts
```
`import()` موجود، والفائدة صفر.

**BUG-13 — نسختان من three.js في نفس الحزمة.** مُلتقَط في التشغيل على ثلاثة مسارات:
```
AUDIT_WARN|/dev/material-preview|THREE.WARNING: Multiple instances of Three.js being imported.
AUDIT_WARN|/games/chess|…   AUDIT_WARN|/journal|…
```
`vite.config.ts` يحتوي `dedupe: ['react','react-dom',…]` ولا يذكر `three`. النتيجة: حزمة `react-three-fiber` 894 KB + ازدواج `instanceof` قد يكسر مقارنات المواد.

**BUG-14 — ثماني شاشات غير قابلة للاختبار ومعتمدة على واجهات متصفح بلا حماية.** المسارات التي انهارت في التركيب الفعلي:
```
/settings/appearance · /settings/theme · /settings/font · /settings/interface · /settings/motion
/journal · /travel-atlas/countries · /diwan/library/poets
→ "ResizeObserver is not defined" / "IntersectionObserver is not defined"
/podcasts  → "el?.scrollIntoView is not a function"
```
هذه ليست أعطالاً في المتصفحات الحديثة. **لكنها تكشف ثلاث مشاكل حقيقية:**
1. `src/test/setup.ts` يُوفّر بديلاً لـ`matchMedia` فقط ⇒ **كامل قسم الإعدادات لا يمكن اختباره بأي اختبار** — وهذا يفسّر غياب اختبارات له.
2. لا كشف قدرات: التطبيق يُشحن عبر Capacitor إلى WebView عشوائي على أندرويد؛ واجهة مفقودة تُسقط الشاشة كلها.
3. `/podcasts` تموت بسبب استدعاء تمرير تجميلي. `el?.scrollIntoView` يحرس `el` من `null` ولا يحرس من غياب الدالة. **تحسين تجميلي يجب ألّا يملك القدرة على إسقاط صفحة.**
**النموذج الصحيح موجود في المستودع:** `/auth` واجهت نفس خطأ `ResizeObserver` من `SoftKeyboard`، فالتقطه `KeyboardErrorBoundary` وعُرضت الصفحة كاملة. النمط موجود، ولم يُطبَّق حيث يلزم.

**QA-01 — ميزانية الـlint مُتجاوَزة والسكربت نفسه مكسور.**
```
$ node scripts/lint-budget.mjs
Error: spawnSync bunx ENOENT          ← يُثبّت bunx بشكل صلب (السطر 30)

الفعلي: 833 تحذيراً · الميزانية: 658 · 3 أخطاء
REGRESSION unused-imports/no-unused-vars  budget  61 → found 147  (+86)
REGRESSION @typescript-eslint/no-explicit-any budget 191 → found 237  (+46)
REGRESSION react-hooks/set-state-in-effect budget  88 → found 100  (+12)
REGRESSION simple-import-sort/imports     budget   0 → found  12  (+12)
REGRESSION react-refresh/only-export-components budget 25 → found 36 (+11)
REGRESSION react-hooks/refs               budget 187 → found 196   (+9)
REGRESSION @typescript-eslint/ban-ts-comment budget 14 → found 18   (+4)
```
السكربت يحذّر حرفياً: *«Raising the budget hides them — that is what put this repo 635 errors deep in the first place»* — ثم لا يشغّله أحد لأن **لا CI** وغير مُدرَج في `verify`. و237 استخدام `any` يناقض `AGENTS.md §1` مباشرة.

**QA-02 — `@ts-nocheck` يُلغي فحص الأنواع عن طبقة بيانات المحادثة كاملة.** 14 ملفاً، منها 9 في `src/lib/chat/` (api.ts, types.ts, useChatMessages, useChatReactions, useChatSearch, settings, notifications, mediaPipeline, imageCompression). السبب المُعلَن: *«schema mismatch: code references tables/RPCs not in current generated types»*. تأكيد الانحراف:
```
جداول مستخدَمة وغير موجودة في types.ts: chats, message_drafts, diwan_poems, diwan_poets,
  diwan_eras, diwan_folders, diwan_folder_items, diwan_user_favorites   (9 جداول)
```
`tsc --noEmit` النظيف **يعطي انطباعاً مضلّلاً**. (نقطة إيجابية: كل الـ39 RPC المُشار إليها موجودة فعلاً في الهجرات — تحقّقتُ منها واحدة واحدة.)

**QA-03 — ستة اختبارات لعامل الخدمة لا تعمل أبداً.** `build/__tests__/appShellServiceWorker.test.ts:21` → `describe.runIf(hasBuild)` حيث `hasBuild = existsSync('dist/sw.js')`. لا CI يبني قبل الاختبار ⇒ `↓ 6 skipped` في كل تشغيل. والاختبارات مصمَّمة تحديداً لالتقاط فشل صامت («a placeholder that never got substituted… the app then just has no offline support»). ضمان عدم الفشل الصامت، مُعطَّل صامتاً.

**QA-04 — ميزانية التصميم مسرح.** `src/test/designSystem.test.ts`:
| القاعدة | الفعلي | الميزانية | الهامش |
|---|---|---|---|
| `bg-card` | 367 | 367 | **0** ✅ سقّاطة حقيقية |
| `text-[Nrem]` | 170 | **1800** | **1630** ❌ لا يمكن أن تفشل |
| قيم hex مكتوبة يدوياً | **658** | — | ❌ لا قاعدة، رغم حظرها في `AGENTS.md §3` |
| `style={{…}}` سطري | **760** | — | ❌ لا قاعدة، رغم حظرها في `AGENTS.md §3` |

وتعليقات الملف توثّق رفع الميزانية ثلاث مرات (`351→352→367`) — سقّاطة تُرفَع ليست سقّاطة. كما أن اختبارين يحتويان شيفرة مشوّهة من codemod (شرط `['z-0',…].includes(match[0])` مكرَّر ومتداخل داخل اختبار أحجام الخطوط حيث `match[0]` هو `text-[0.5rem]` — صحيح بالصدفة، بلا معنى).

**QA-05 — ميزانية الحزمة ملف ميت.** `bundle-budget.json` (`maxBytes: 20777036`، ملاحظة عن «abort protocol 0.8») **لا يقرؤه أي سكربت أو سير عمل** (`grep -rl bundle-budget` خارج node_modules/.git ⇒ فارغ). الواقع: `dist = 28.5 MB` ⇒ **تجاوز 44%**.

**UX-02 — تسجيل الدخول يُنزل المستخدم على `/settings`.** `Auth.tsx:93`: `const successTarget = nextTarget ?? '/settings'`. القادم من البوابة يجد نفسه في الإعدادات. بالإضافة إلى تأخير اصطناعي 550ms (`setTimeout` بلا تنظيف، السطران 148 و157) قبل التنقّل.
*نقطة إيجابية:* الحماية من الإرسال المزدوج في `Auth.tsx:111` (`submittingRef || loading || success`) **صحيحة ومُحكمة** — نموذج يُحتذى.

**UX-03 — رسالة خطأ تقول شيئاً غير صحيح.** `LibraryFavorites.tsx:108` تعرض «الاتصال بالخادم غير مُهيّأ في هذه النسخة» بناءً على `sbReady` — بينما `isSupabaseConfigured === true` دائماً. المستخدم يُعطى سبباً خاطئاً لمشكلة أخرى.

**A11Y-01 — 48 `<img>` بلا `alt`**، و6 `<div onClick>` بلا `role`/`tabIndex` (غير قابلة للوصول بلوحة المفاتيح ولا لقارئ الشاشة).
*نقطة إيجابية:* `<html lang="ar" dir="rtl">` صحيح، 183 ملفاً تستخدم `aria-label`، واختبار `mutedForegroundContrast` يفحص 104 حالة تباين — اهتمام حقيقي موجود، لكنه غير مكتمل.

---

### 🔵 LOW

- **3 أخطاء ESLint**: `GERMAN_CLUB_TOKENS` غير مستخدَم في `SatzKulturperleCards.tsx:7` و`WortschatzSpiegel.tsx:6`؛ `Rss` غير مستخدَم في `SourcesPanel.tsx:6`.
- **توجيه eslint-disable عديم الفائدة**: `KeywordAlertsView.tsx:182`.
- **مسار مكرّر**: `/crypto` و`/crypto/` معرّفان بشكل منفصل في `App.tsx` لنفس المكوّن.
- **مرجع مكسور في التوثيق**: `src/features/profile/lib/cache/index.ts:13,156` يوثّق `import … from '../lib/cache'` — مسار لا يُحَلّ.
- **147 من 319 مفتاح i18n ميتة (46%)**. ومنظومة `translate()` كاملة يستهلكها `PrayerTimes.tsx` عملياً فقط، بينما باقي التطبيق يكتب العربية نصّاً مباشراً. نمطان لنفس المشكلة.
- **13 ثغرة أمنية في التبعيات** (6 عالية: `braces`, `micromatch`, `fast-glob`, `chokidar`, `tailwindcss`, `lovable-tagger` — كلها devDependencies).
- **`@emoji-mart/react@1.1.1`** لا يدعم React 19 (`peer react@"^16.8 || ^17 || ^18"`) — يفشل `npm install` بدون `--legacy-peer-deps`.
- **`verification/`** يحتوي ملفات `.webm` ولقطات شاشة مُلتزَمة في git — تضخيم للمستودع.
- **167 استدعاء `console.*`** في شيفرة الإنتاج.

---

### ⚫ HIDDEN / LATENT

| # | المشكلة | متى تنفجر |
|---|---|---|
| H-1 | **22% من قفل الحزم (299/1357 إدخالاً) يشير إلى سجلّ خاص** `europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache` بينما `Dockerfile` يستخدم `bun install --frozen-lockfile` | عند بناء Docker خارج بنية Lovable — غير قابل للوصول من هنا |
| H-2 | `postprocessing@6.39.4` يتطلّب `three >= 0.168 < 0.186`؛ المشروع على `0.185.1` | أول ترقية ثانوية لـ`three` — **تُدمج تلقائياً** عبر CI-01 |
| H-3 | DB-01: الهجرات غير قابلة لإعادة التشغيل | أول تعافٍ من كارثة أو بيئة staging |
| H-4 | نمط قناة realtime المكسور (BUG-03) مكرَّر في **6 ملفات** | تحت ضغط إعادة التركيب / تغيّر الجلسة |
| H-5 | 100 مخالفة `react-hooks/set-state-in-effect` + 196 `react-hooks/refs` | عند تفعيل React Compiler أو الوضع المتزامن |
| H-6 | سياسات مكرّرة متناقضة على 7 جداول (`crypto_watchlist` بها 8 سياسات = طقمان متطابقان) | عند حذف طقم واحد ظناً أنه زائد ⇒ الآخر قد يكون الأضيق أو الأوسع |
| H-7 | `places` مُنشأ بمخططين مختلفين؛ الإنتاج يحمل أحدهما ولا أحد يعرف أيهما يقيناً | عند مطابقة المخطط أو توليد الأنواع |

---

## 4. جرد الشيفرة الميتة

### 4.1 ملفات لا يستوردها أي ملف (24)

```
src/features/{archive,calendar,diwan,duas,games,journal,knowledge,marginalia,podcasts,travel-atlas}/index.ts
src/features/chat/components/groups/index.ts · src/features/fitness/ui/pages/index.ts
src/stores/index.ts · src/utils/helpers/index.ts · src/utils/validation/index.ts
      ↑ 14 ملف barrel من سقالة FSD التي يفرضها AGENTS.md §5 ولا يستخدمها أحد

src/features/fitness/HealthConnectCard.tsx
src/features/fitness/LiveSessionPanel.tsx
src/features/fitness/StatsPanel.tsx
src/features/fitness/index.tsx
src/features/diwan/lib/foldersStorage.ts
src/features/games/hooks/queryKeys.ts
src/integrations/lovable/index.ts
src/lib/mcp/index.ts                    (يُستهلك وقت البناء بواسطة mcpPlugin — انظر DX-01)
```

### 4.2 شيفرة موجودة من أجل اختباراتها فقط (5)

```
src/hooks/useManagedEffect.ts                    (7 اختبارات)
src/lib/optimistic.ts                            (4 اختبارات — runOptimistic + rollback)
src/features/weather/sources/PWSNetworkAdapter.ts
src/features/profile/data/avatarPresets.ts
src/utils/validation.ts
```
> `src/lib/optimistic.ts` لافت: المستودع يملك أداة تحديث تفاؤلي مع تراجع مُختبَرة بالكامل، **ولا يستخدمها** — بينما الفجوة «غياب التحديثات التفاؤلية/التراجع» مفتوحة في عدة ميزات.

### 4.3 طبقات ميتة كاملة (غير قابلة للوصول من `main.tsx`)

```
src/stores/{authStore,systemStore,fitnessStore}.ts        + 11 اختباراً أخضر
src/utils/validation/schemas.ts                           ← مذكور كمصدر وحيد في AGENTS.md
src/features/fitness/{model/useFitnessEngine, ui/pages/FitnessDashboardPage,
                      ui/components/{FitnessActivityChart,FitnessDashboardSkeleton,
                      FitnessErrorBoundary}, healthConnect}        ← تنفيذ لياقة موازٍ ثانٍ
src/features/weather/{engine/PWSAggregator, sources/PWSNetworkAdapter, types/PWSObservation}
src/lib/auth/localAuthStore.ts                            ← فروعه الحارسة لا تتحقّق أبداً
src/components/routing/RouteGuards.tsx → PublicRoute, AuthenticatedRoute
```

### 4.4 فروع ومنطق لا يُبلَغ

| الموقع | الفرع | السبب |
|---|---|---|
| `useAuth.tsx` ×6 | `if (!isSupabaseConfigured)` | ثابت `true` منذ إضافة الـfallbacks |
| `LayerToggleBar.tsx:100` | `{count > 0 && …}` | `layerCounts` خريطة فارغة دائماً |
| `useAdmin.ts:35-37` | ارتداد `user_metadata` | يُبلَغ — وهذه هي المشكلة (SEC-03) |
| `client.ts:1-16` | السلوك الموصوف (503 / `.invalid`) | غير مُنفَّذ أصلاً |

### 4.5 ازدواج تنفيذ

| المجال | النسخة أ | النسخة ب | الحيّ |
|---|---|---|---|
| المحادثة | `features/chat/components/useChat.ts` (1746 سطراً، 230 تحذير lint) | `src/lib/chat/` (38 ملفاً، 6727 سطراً) | **كلاهما** — القديم في `ChatDrawer`، الجديد في `/chat/g/*` |
| اللياقة | `src/pages/Fitness.tsx` | `features/fitness/ui/pages/FitnessDashboardPage.tsx` | أ فقط |
| الحالة | Context + React Query + localStorage | Zustand (`src/stores/`) | أ فقط |
| بوّابة المصادقة | `RouteGuards` · `AuthGuard` · 17 شرطاً يدوياً | — | ب + ج |
| النصوص | `i18n/ar.json` + `t()` | عربية مكتوبة مباشرة | ب فعلياً |
| رابط Supabase | `client.ts` fallback | ثابت مكرّر في `archive/api.ts` | قيمة واحدة، 3 أنماط |

---

## 5. ما هو مفقود (Missing Pieces)

| الفئة | الفجوة | الشدّة |
|---|---|---|
| ميزة | **استعادة كلمة المرور** — لا بريد، لا رموز، لا OAuth | 🔴 |
| ميزة | **تصدير بيانات المستخدم** (يوجد حذف حساب فقط) | 🟠 |
| أمان | **إنفاذ الخصوصية على الخادم** لـ`privacy_settings` | 🔴 |
| أمان | **تحقّق من الدور في الدوال الطرفية** — صفر من 20 | 🟠 |
| أمان | **تقييد معدّل** على التسجيل/الدخول | 🟠 |
| CI | **سير عمل `verify`** (typecheck + lint + budget + test) | 🔴 |
| CI | **سير عمل `e2e`** — 7 ملفات Playwright موجودة ولا تُشغَّل أبداً | 🟠 |
| CI | **فحص ميزانية الحزمة** — الملف موجود، القارئ غائب | 🟡 |
| CI | **فحص إعادة تشغيل الهجرات** على قاعدة فارغة | 🔴 |
| حالات | **مهلة + إعادة محاولة** على 510 استعلام Supabase | 🟠 |
| حالات | **معالجة انتهاء الجلسة** على 81/82 مسار | 🟠 |
| حالات | **تعافٍ حقيقي** في `ErrorBoundary` | 🟠 |
| اختبار | **كامل قسم `/settings`** غير قابل للتركيب في الاختبارات (BUG-14) | 🟠 |
| اختبار | **بدائل `ResizeObserver`/`IntersectionObserver`** في `src/test/setup.ts` | 🟡 |
| اختبار | **اختبار RLS فعّال** (الحالي وهمي) | 🔴 |
| وصول | `alt` على 48 صورة · `role`/`tabIndex` على 6 عناصر قابلة للنقر | 🟡 |
| رصد | **لا مقاييس خادم** — `telemetry.ts` عميل فقط، و`VITE_SENTRY_DSN` اختياري | 🟡 |
| توثيق | `AGENTS.md` يصف نظاماً غير موجود (§1 Zod · §2 Zustand · §4 verify) | 🟠 |

---

## 6. مصفوفة المخاطر

| # | المشكلة | الشدّة | الاحتمال | الأثر | الأولوية |
|---|---|---|---|---|---|
| SEC-01 | تسريب مواقع GPS لكل المستخدمين لأي مجهول | Critical | **قائم الآن** | تسريب بيانات شخصية | **P0** |
| SEC-02 | مفاتيح الخصوصية بلا أثر | Critical | **قائم الآن** | خرق ثقة + تنظيمي | **P0** |
| BUILD-01 | البناء يفشل خارج bun | Critical | مؤكّد | لا بناء / لا نشر | **P0** |
| TEST-01 | طقم أمان وهمي (30 اختباراً) | Critical | مؤكّد | سبب SEC-01 | **P0** |
| CI-01 | دمج تلقائي بلا فحص | Critical | مؤكّد | انحدار → إنتاج | **P0** |
| BUG-02 | رفع صور المحادثة مكسور | Critical | مؤكّد بلا `.env` | ميزة أساسية ميتة | **P0** |
| BUG-03 | انهيار المحادثة الجماعية | Critical | عالٍ | ميزة معطّلة | **P0** |
| UX-01 | لا استعادة كلمة مرور | Critical | حتمي بالوقت | فقدان حساب دائم | **P0** |
| DB-01 | هجرات غير قابلة لإعادة التشغيل | Critical | عند الحاجة | لا تعافٍ | **P1** |
| SEC-03 | تصعيد صلاحيات المشرف | High | متوسط | وصول إداري | **P1** |
| DEPLOY-01 | 19/20 دالة لا تُنشَر | High | مؤكّد | انحراف صامت | **P1** |
| PERF-01 | 641 KB أيقونات في المسار الحرج | High | مؤكّد | ~23s على 3G | **P1** |
| BUG-04 | انتهاء الجلسة غير معالَج | High | عالٍ | إرباك صامت | **P1** |
| ARCH-01 | طبقة حالة ميتة موثّقة كأساسية | High | مؤكّد | إهدار + تضليل | **P1** |
| DX-01 | مُلحق يكتب في شيفرة مُتتبَّعة | High | مؤكّد | نشر غير مقصود | **P1** |
| PERF-02 | حزمة 6.5 MB | High | مؤكّد | شاشة عالقة | **P2** |
| ARCH-02 | 3 أنماط حراسة | High | مؤكّد | ثغرات + تضارب | **P2** |
| BUG-05 | «إعادة المحاولة» لا تتعافى | High | عالٍ | طريق مسدود | **P2** |
| BUG-06…14, QA-01…05 | متنوّع | Medium | — | — | **P2-P3** |

---

## 7. تحليل الأسباب الجذرية

وراء ~60 نتيجة، **خمسة أسباب جذرية متكرّرة**:

**السبب 1 — ضمانات مُعطَّلة بصمت (الأخطر).**
الفشل الآمن اختير في كل مرة على الفشل الصاخب: اختبار RLS يُرجِع `return` عند غياب الاتصال؛ اختبارات عامل الخدمة `runIf(hasBuild)`؛ ميزانية lint لا يشغّلها أحد؛ ميزانية حزمة لا يقرؤها أحد؛ Renovate يشير إلى فحوص غير موجودة. **كل آلية ضمان في هذا المستودع تفشل إلى اللون الأخضر.** هذا سبب SEC-01 وBUILD-01 وQA-01.
→ *العلاج:* كل بوّابة تفشل بصوت عالٍ عند عجزها عن التنفيذ.

**السبب 2 — التوثيق كأمنية لا كوصف.**
`AGENTS.md` يصف Zod وZustand و`verify` — ولا شيء منها موصول. `RouteGuards` يصف أربعة مستويات، اثنان موصولان، والتعليق عن «لا يمكن منحه بتعديل المتصفح» **يناقض الشيفرة تحت ثلاثة أسطر منه**. `client.ts` يصف اعتراض `fetch` ونطاق `.invalid` غير موجودين. سير النشر يقول «all edge functions» وينشر واحدة.
→ *العلاج:* اختبارات تنفّذ الادّعاءات المعمارية (مثل: «`src/stores/*` مُستورَد من الرسم البياني لـ`main.tsx`»).

**السبب 3 — إصلاحات جزئية لا تنتشر.**
الـfallback للبيئة أُضيف في `client.ts`، نُسي في `ImageUploadContext` (BUG-02)، ونُسخ نصّياً في `archive/api.ts`. نمط `ErrorBoundary` حول واجهة متصفح طُبّق على لوحة المفاتيح ولم يُطبَّق على 8 شاشات (BUG-14). الثغرة العامة في `chat-files` أُصلحت بامتياز في هجرة لاحقة — بينما نفس الخطأ بالضبط في `places` لم يُلمَس (SEC-01).
→ *العلاج:* عند إصلاح فئة خطأ، فحص آلي يمنع تكرارها (قاعدة ESLint، اختبار على مستوى المخطط).

**السبب 4 — ميزات تُستبدَل ولا تُحذَف.**
تنفيذان للياقة، طبقتا محادثة، ثلاث بوّابات مصادقة، منظومتا نصوص، أربع طبقات حالة (Context + Query + Zustand + localStorage)، 24 ملفاً يتيماً، 147 مفتاح i18n ميت. 497 ألف سطر وجزء معتبر منه لا يُنفَّذ أبداً.
→ *العلاج:* `knip`/`ts-prune` في CI مع سقّاطة حقيقية بهامش صفر.

**السبب 5 — السقّاطات تُرفَع بدل أن تُحترَم.**
`bg-card: 351→352→367`. `text-[Nrem]` بميزانية 1800 لواقع 170. `lint-budget` متجاوَز بـ175 وغير مُشغَّل. السقّاطة التي تُرفَع ليست سقّاطة.
→ *العلاج:* هامش صفر، أو حذف الميزانية والاعتراف بأنها ليست مفروضة.

---

## 8. خطة الإصلاح

### المرحلة 0 — فوري (أيام، حجب الإطلاق)

1. **SEC-01** `DROP POLICY "public read places" / "public read place_photos" / "public read place_links"` — ثم التحقّق بعميل مجهول.
2. **SEC-02** `is_public DEFAULT false` + View `public_profiles` يُسقط الأعمدة حسب `privacy_settings` + إلغاء القراءة المباشرة لـ`profiles` لغير المالك.
3. **TEST-01** توصيل `rlsHostileClient.test.ts` بـ`client.ts`، و**الفشل** عند انعدام الاتصال. *(شغّله قبل #1 — يجب أن يفشل. ثم بعد #1 — يجب أن ينجح.)*
4. **BUILD-01** إضافة `"postprocessing": "^6.39.0"` وتثبيت `three` على `0.185.x`.
5. **CI-01** سير عمل `verify.yml`: `typecheck && lint && lint:budget && test`. حماية الفرع. تعطيل automerge حتى يمرّ أخضر.
6. **BUG-02** توحيد قراءة بيانات Supabase في `client.ts` + قاعدة ESLint تمنع `import.meta.env.VITE_SUPABASE_*` خارجه.
7. **SEC-03** حذف ارتداد `user_metadata`؛ وتحويل سياسات `auth.uid() IS NOT NULL` إلى `has_role(auth.uid(),'admin')`.

### المرحلة 1 — قبل الإطلاق (أسابيع)

8. **BUG-03** إصلاح نمط قناة realtime + تدقيق المواضع الستة المتشابهة.
9. **UX-01** مسار استعادة الحساب (بريد اختياري أو رموز استرداد).
10. **PERF-01** استيرادات أيقونات مُسمّاة → إخراج 641 KB من المسار الحرج. *الهدف: ≤ 250 KB gzip أوّلياً.*
11. **BUG-04** نقل مستمع `auth-session-expired` إلى جذر `App.tsx`.
12. **DX-01 + DEPLOY-01** إخراج ناتج mcp من git؛ ونشر كل الدوال الطرفية الـ20.
13. **DB-01** جعل الهجرات idempotent + فحص CI يُعيد تشغيلها على قاعدة فارغة.
14. **BUG-11** غلاف مهلة موحّد (10s) حول كل استعلامات Supabase + حالة خطأ قابلة لإعادة المحاولة.
15. **BUG-05** `key` تصاعدي + حدّ محاولات في `ErrorBoundary`.

### المرحلة 2 — قابل للتأجيل

16. **PERF-02** تحويل `bayanLinguisticDatabaseLarge.ts` إلى JSON يُجلب عند الطلب.
17. **BUG-13** `dedupe: ['three']`.
18. **BUG-14** بدائل `ResizeObserver`/`IntersectionObserver` في `src/test/setup.ts` ⇒ يفتح قسم الإعدادات للاختبار؛ و`el?.scrollIntoView?.()`.
19. **A11Y-01** `alt` على 48 صورة؛ `role`/`tabIndex` على 6 عناصر.
20. **QA-04/05** قاعدة hex مكتوب يدوياً؛ خفض ميزانية `text-[Nrem]` إلى 175؛ توصيل `bundle-budget.json` بسير عمل.
21. تشغيل `e2e` من Playwright (7 ملفات جاهزة) في CI.

### المرحلة 3 — يُحذَف

22. `src/stores/*` + `useFitnessEngine` + `features/fitness/{ui,model,index.tsx,HealthConnectCard,LiveSessionPanel,StatsPanel,healthConnect}` + اختباراتها الـ11.
23. `src/lib/auth/localAuthStore.ts` + فروع `!isSupabaseConfigured` الستة + ملف اختباره.
24. 14 ملف barrel يتيماً · `PublicRoute` · `AuthenticatedRoute` (أو وصلها — انظر #26) · `loadSettings`/`saveSettings` · `features/weather/{engine,sources,types}/PWS*` · `diwan/lib/foldersStorage.ts` · `games/hooks/queryKeys.ts` · 147 مفتاح i18n · `verification/videos/`.
25. التعليقات التي تصف سلوكاً غير موجود (`client.ts:1-16`, `RouteGuards.tsx:60-62`, `supabase-deploy.yml:5-6`, `AccountPrivacySection.tsx:108`).

### المرحلة 4 — يحتاج إعادة تصميم لا ترقيعاً

26. **المصادقة والصلاحيات.** مصدر واحد: وصل `AuthenticatedRoute` على كل مسار يحتاج جلسة، حذف الـ17 شرطاً اليدوي، توحيد عقد العودة على `?next=`، وتحقّق من الدور في كل دالة طرفية.
27. **طبقة المحادثة.** `useChat.ts` القديم (1746 سطراً، 230 تحذيراً) و`src/lib/chat/` الجديد (6727 سطراً) يعملان معاً. اختيار واحد وترحيل كامل. وإزالة `@ts-nocheck` بإعادة توليد `types.ts` من المخطط الحيّ.
28. **إستراتيجية الحالة.** أربع طبقات (Context + Query + Zustand الميت + 470 لمسة `localStorage` مباشرة). توحيدها على React Query للخادم + Context للتفضيلات + غلاف واحد مُدقَّق النوع لـ`localStorage`.
29. **البيانات الثابتة الضخمة.** 7.8 MB TypeScript + 2.4 MB قاموس ألماني + أطلس أغذية… عقد واحد: كل مجموعة بيانات ثابتة تُشحن كـJSON في `public/data/` وتُجلب عند الطلب.

---

## 9. درجة الصحة النهائية

| البُعد | الدرجة | التبرير |
|---|---|---|
| **الوظيفية** | **5.5 / 10** | 70 من 82 مساراً تُصيّر محتوى حقيقياً، وحالات فارغة ممتازة في Travel Atlas وPodcasts وTime Ledger وDiwan. لكن المحادثة الجماعية تنهار، رفع الصور مقطوع، مفاتيح الخصوصية بلا أثر، وعدّاد السجل الزمني يكذب. |
| **الموثوقية** | **4 / 10** | 1870 اختباراً تمرّ — لكن 30 منها وهمية، و6 لا تعمل، وقسم الإعدادات غير قابل للاختبار بنيوياً. لا مهلة على 510 استعلام. زر التعافي لا يتعافى. انتهاء الجلسة غير معالَج على 81/82 مسار. |
| **تجربة الاستخدام** | **6 / 10** | حرفة بصرية عالية وتصميم عربي/RTL صحيح من الأساس، ورسائل فارغة مكتوبة بعناية حقيقية. لكن: لا استرداد لكلمة المرور، طريق مسدود في Marginalia، ثلاثة سلوكيات مختلفة لنفس بوّابة الدخول، ورسالة خطأ تعطي سبباً خاطئاً. |
| **الأداء** | **3 / 10** | **1.11 MB gzip** تحميل أوّلي، منها 641 KB أيقونات لا تُشجَّر. حزمة 6.5 MB تُبقي شاشة على الهيكل أكثر من 6 ثوانٍ. 28.5 MB dist، تجاوز 44% لميزانية لا يقرؤها أحد. نسختان من three.js. |
| **المعمارية** | **4 / 10** | FSD معلَن ومطبَّق جزئياً. أربع طبقات حالة، ازدواج في اللياقة والمحادثة والنصوص والبوّابات. الطبقة الموثّقة كـ«أساسية» غير قابلة للوصول. 24 ملفاً يتيماً. **لكن** `useAuth` singleton و`src/lib/chat/` الجديد مصمَّمان جيداً. |
| **الأمان** | **3 / 10** | RLS مُفعَّل على 89/89 جدولاً و192 سياسة حيّة — بنية جادّة، وثغرة `chat-files` أُصلحت بامتياز. لكن `places` مكشوف للمجهولين، الخصوصية غير مفروضة، الأدمن قابل للانتحال عبر `user_metadata`، صفر تحقّق دور في 20 دالة طرفية، واختبار الأمان الوحيد لا يُنفَّذ. |
| **إمكانية الوصول** | **5.5 / 10** | `lang="ar" dir="rtl"` صحيح، 183 ملفاً بـ`aria-label`، فحص تباين على 104 حالة، منع للاتجاهات الفيزيائية، أرضية 10px لحجم الخط. لكن 48 صورة بلا `alt`، 6 عناصر نقر غير قابلة للوصول، ولا تحقّق فعلي من ترتيب التركيز. |
| **قابلية الصيانة** | **3.5 / 10** | typecheck نظيف وprettier وimport-sort وسقّاطات موجودة. لكن: 833 تحذيراً (تجاوز 175)، 237 `any`، 14 ملف `@ts-nocheck` تُلغي الفحص عن طبقة المحادثة، **صفر CI**، ووثيقة معمارية تصف نظاماً غير موجود. |

### **الإجمالي المرجَّح: 4.3 / 10 — غير جاهز للإطلاق**

---

## 10. ما يستحق الحفاظ عليه

> التدقيق الصادق يذكر ما هو جيد، لأن خطة الإصلاح يجب ألّا تهدمه.

- **`src/hooks/useAuth.tsx`** — singleton على مستوى الوحدة، اشتراك واحد، `activeRequestId` يحرس من سباق الاستجابات. حلّ صحيح لمشكلة حقيقية، وموثَّق بأمانة.
- **سلسلة إصلاح `chat-files`** (`20260331` → `20260402000352` → `20260402101541` → سياسة واعية بالمجموعات) — بالضبط كيف يُغلَق خلل أمني تدريجياً. السياسة النهائية سليمة.
- **الحالات الفارغة وحالات عدم العثور** — `/travel-atlas/DE`، `/travel-atlas/trips/1`، `/diwan/library/poem/<غير موجود>`، `/section/timed-sunnah/1`، `/podcasts/9999`، `/time-ledger`: كلها رسائل عربية مكتوبة بعناية مع مخرج واضح. مُتحقَّق منها في التشغيل.
- **الحماية من الإرسال المزدوج في `Auth.tsx:111`** — `submittingRef || loading || success` يغطي النقر السريع وEnter spam ونافذة الـ550ms. مُحكمة.
- **`KeyboardErrorBoundary`** — عزل واجهة متصفح مفقودة داخل مكوّن بدل إسقاط الصفحة. النمط الصحيح؛ ينقص تعميمه.
- **التدهور اللطيف في Travel Atlas** — «الخريطة غير مدعومة على هذا الجهاز» بدل شاشة بيضاء، مع استمرار عمل باقي الصفحة.
- **`src/lib/chat/`** — مفاتيح استعلام مُهيكلة، ترقيم صفحات، تخزين IDB، توفيق بـ`client_id`، تشفير طرف-لطرف. تصميم جيد يعيقه `@ts-nocheck` وخلل قناة واحد.
- **`i18n/index.ts`** — توثيق صريح لحذف اللغة الألمانية مع اتحاد أحادي العضو يمنع عودتها، **واختبار يفرض ذلك**. هذا هو الشكل الصحيح لإنفاذ القرار المعماري — ويجب تعميمه على بقية ادّعاءات `AGENTS.md`.
- **`storageQuota` و`circuitBreaker` و`optimistic` و`telemetry`** — أدوات مكتوبة جيداً ومُختبَرة. الأولان مستخدمان؛ الثالث يحتاج وصلاً فقط.

---

### ملحق: الأوامر المُستخدَمة لإعادة إنتاج هذا التدقيق

```bash
npm install --legacy-peer-deps            # ERESOLVE بدونها (@emoji-mart/react vs React 19)
npx tsc -p tsconfig.app.json --noEmit     # نظيف
npx eslint . -f json -o lint.json         # 3 أخطاء · 833 تحذيراً
node scripts/lint-budget.mjs              # spawnSync bunx ENOENT
npx vitest run                            # 1870 ✓ · 7 ↓
npx vite build                            # ❌ postprocessing
npm i --no-save postprocessing && npx vite build   # ✓ 12.92s — سبب واحد مؤكّد
du -sb dist                               # 29,907,698 بايت مقابل ميزانية 20,777,036
```
خريطة الاستيراد، إعادة تشغيل الهجرات، ومجموعة تركيب المسارات الـ82 نُفِّذت بسكربتات مؤقّتة
(`/tmp/graph2.mjs`, `/tmp/rls2.mjs`, وملف اختبار Vitest مؤقّت تحت `src/__audit__/` **حُذف بعد الانتهاء**).
**لم تُعدَّل أي شيفرة منتج أثناء هذا التدقيق؛ شجرة git نظيفة.**
