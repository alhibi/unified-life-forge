# المرحلة التالية — حملة التنفيذ البصري والهندسي

> نطاق التنفيذ الفعلي لهذه المرحلة، قراراتها، مراحلها، ملكية الملفات، وطريقة
> إثبات النتائج. المرجع البصري: [DESIGN.md](../../DESIGN.md). مصفوفة المسارات:
> [route-coverage.md](./route-coverage.md). نتائج التحقق: [verification.md](./verification.md).

- **التاريخ:** 2026-11-18
- **الأساس المعتمد:** فرع `design-refoundation` عند `22fa7b2c` (على `origin/main` `7e34f503` + دفعتا تصميم)
- **فرع التنفيذ:** `next-phase/visual-execution` (فرع آمن متفرّع من الأساس، لا reset ولا force-push)
- **البيئة:** macOS · Bun 1.4.0 · Node 26.13.1 · Chromium (Playwright) · Vite 8 / Tailwind 4.3
- **حالة البنود:** `Implemented` · `Tested` · `Visually inspected` · `Not verified` — لا تُرقّى حالة بلا دليل.

---

## 0. خط الأساس المسجّل قبل أي تعديل (Gate 0)

| البند | ما سُجّل | الدليل |
|---|---|---|
| حالة Git | `next-phase/visual-execution` متفرّع من `design-refoundation` `22fa7b2c` (شجرة نظيفة) | `git status` |
| سلسلة `bun run verify` | ✅ typecheck + lint + lint:budget + arch + test + build (كاملة، 0 فشل) | مخرج الأمر |
| اختبارات | 2142 اختباراً في 145 ملفاً (السجل السابق) + السلسلة أعادت تشغيلها بنجاح | `bun run verify` |
| تدقيق المسارات الصارم **قبل** التعديل | 82 مساراً × 390/1440 = 164 فحصاً · **36 فشلاً**: small-targets 10 مساراً (256 هدفاً إجمالاً)، float-overlap 22، clipped-headings 5، h1-count 3 | `verification/design/route-audit.json` (نسخة baseline في `verification/reports/route-audit-baseline.json`) |
| تسريب RTL / أخطاء صفحة / أخطاء console | 0 / 0 / 0 في خط الأساس | نفس التقرير |
| لقطات خط الأساس | 82 مساراً × 390 داكن + 1440 داكن (لقطة أعلى + صفحة كاملة) | `verification/design/phase2-before/` + `verification/design/baseline-390/` |
| عيوب P0 المرصودة في المراجعة السابقة | Chess/home dock تداخل، Crypto عنوان مقصوص وأزرار مزدحمة، Weather فراغ رأسي، Portal بلا فرق بصري، Chat/Diwan/Reading/Appearance/Travel Atlas بلا تغيير | مثبتة في same report (clipped-headings / float-overlap / screenshots) |

**لم يكن موجوداً قبل المرحلة:** أداة تدقيق مسارات تحسم النجاح على أخطاء JS وتسريب
الاتجاه وأهداف اللمس والقص والتراكب؛ مصفوفة لقطات كاملة لكل المسارات (82)؛ فحص
تباين على DOM الفعلي لكل ثيم؛ تدقيق صارم للحالات. أُضيفت كلها في هذه المرحلة
(`scripts/audit-routes.mjs` v2، `scripts/capture-matrix.mjs`، `scripts/check-contrast.mjs`، `scripts/audit-allowlist.json`).

---

## 1. نطاق المرحلة

**داخل النطاق:** إعادة تأليف الشاشات الحقيقية عبر المجالات الـ26 والمسارات الـ82
على مستوى التركيب والهرمية والحالات والاستجابة والوصولية، مع إصلاح عيوب P0
المثبتة، وتشديد بوابات القياس، وتوحيد العقد المشترك فقط حيث توجد فجوة مثبتة.

**خارج النطاق (لا يُلمس):** منطق الأعمال، مخططات Supabase/RPC/RLS، عقود API،
المصادقة والصلاحيات، مفاتيح التخزين والتفضيلات، نموذج التنقّل D1، عائلات الثيم
الأربع عشرة وشخصياتها (D2)، الخطوط المحمّلة (D4).

---

## 2. قرارات المرحلة (مسجّلة مع سبب)

| # | القرار | السبب | الأثر |
|---|---|---|---|
| N1 | البدء من `design-refoundation` لا من `main` المحلي المتأخر | `main` المحلي متأخر 115 التزاماً ويحمل تعديلات قديمة غير محفوظة (Oct 10)؛ `design-refoundation` هو الخط النشط الذي وصفته المراجعة | لا يفقد أي عمل قائم؛ `main` وworktrees الأخرى تبقى كما هي |
| N2 | فرع تنفيذ جديد `next-phase/visual-execution` نظيف من الأساس المعتمد | عزل الحملة عن تاريخ الفرع مع إمكانية التراجع | العمل قابل للدمج بـ PR |
| N3 | لا يعدّل أي وكيل ملفاً مشتركاً؛ طلبات المشترك تُوجَّه إلى مالك الطبقة (A) والمنسّق | منع تنازع tokens/CSS/المكوّنات | نطاقات كتابة مفكوكة (disjoint) |
| N4 | `scripts/audit-routes.mjs` يحسم `row.ok` على: pageerrors، تسريب RTL، أهداف اللمس غير المستثناة، القص الهرمي، تراكب العناصر العائمة على عناصر التحكم، h1 واحد | التقرير السابق كان يحسب ثم يتجاهل هذه القياسات | 36 فشلاً ظهرت فوراً في line الأساس |
| N5 | الاستثناءات في `scripts/audit-allowlist.json` بمفتاح مسار+فحص+محدد+سبب+مالك+مرجع، ومدخل لا يطابق شيئاً يُفشل التدقيق كـstale | منع الاستثناء العام وإخفاء الفشل | كل استثناء قابل للفحص وإعادة التقييم |
| N6 | بيئة اللقطات حتمية: ملف تفضيلات مثبّت قبل الرسم، حجب أصول البيانات الخارجية، السماح بخطوط Google فقط، تقليل الحركة | مقارنة before/after بنفس البيانات والحالة والثيم | لا تُنسب فروقات الشبكة إلى التصميم |
| N7 | الحالة «الفارغة/غير المتصلة» هي خط الأساس البصري الحتمي؛ الحالات الممتلئة تُلتقط حيث توجد بيانات محلية حقيقية | لا بيانات وهمية في المنتج أو في الأدلة | ما لا يمكن ملؤه موسوم `Not verified` صراحة |
| N8 | أهداف اللمس داخل الرقاع/الكلمات/الشبكات الكثيفة تُستثنى بمحدد دقيق ومسافة فصل (X9)؛ الأزرار المستقلة 44×44 بلا استثناء | WCAG 2.5.8 يسمح بروابط النص المتصل ولا يسمح بأزرار مستقلة صغيرة | إزالة 256 هدفاً صغيراً مسجّلاً أو تبريرها |
| N9 | مسارات التطوير (`/dev/*`, `/.lovable/*`) تُفحص لكن لا تُحسب كأسطح منتج في بوابات التسليم | ليست ضمن تجربة المستخدم | توثيق صريح |

---

## 3. المراحل وبواباتها

| البوابة | المحتوى | الحالة |
|---|---|---|
| **Gate 0 — Baseline** | جرد، git، verify، تدقيق صارم، لقطات كاملة، سجل عيوب | ✅ مكتمل (انظر §0) |
| **Gate 1 — P0 Repair** | Chess dock، Crypto header/empty، Weather empty، Portal recompose، أداة التدقيق، البقايا المتقادمة | ✅ مكتمل — انظر §8 |
| **Gate 2 — Shared Contract** | إصلاح فجوات PageHeader/الأهداف/الطبقات فقط؛ لا إعادة اختراع | ✅ مكتمل (A) — PageHeader rail، dock 44px، StateView auth، AuthGuard fallback، نقل مفتشات الرموز للمعرض، index.html/components.json |
| **Gate 3 — Parallel Feature Execution** | B–G يعيدون تأليف مجالاتهم على نطاقات منفصلة | ⚠️ مكتمل جزئياً — B/C/E/G أنجزوا نطاقهم الأساسي وأبلغوا عن متبقٍّ موثق؛ D مكتمل؛ F مكتمل؛ C دفعة ثانية جارية |
| **Gate 4 — Continuous Integration & QA** | دمج دفعات صغيرة + تحقق H بعد كل دفعة + إصلاح فوري | ✅ مكتمل — H أصدر qa-shared-layer.md، وعالجنا QA-SL-1/2/3 |
| **Gate 5 — Full Product Sweep** | جولة مستقلة على المسارات/الحالات/الثيمات/المقاسات، عيوب غير مذكورة | ✅ مكتمل — H: 164/164، تباين كامل، 16 فحص تفاعل، مصفوفة 82×2 بعد + 14 ثيماً |
| **Gate 6 — Closure** | مصفوفة تغطية كاملة أو استثناءات موثقة، تقرير نهائي بأدلة | ✅ مكتمل — verification.md، route-coverage §8، qa-final.md، ADR الميزانية، تقرير ختامي |

## 8. ملخص دفعات Gate 1–4

| الدفعة | المالك | ما نُفِّذ فعلياً | المتبقي المعلن |
|---|---|---|---|
| Shared layer | A | PageHeader يحوي التفاف الترويسة (إصلاح 6 عناوين مقصوصة)؛ dock عائم 44px يظهر بعد التمرير ويختفي على الأسطح الغامرة/الكيبورد؛ StateView kind=auth؛ AuthGuard fallback؛ نقل مفتشي الرموز إلى المعرض؛ توحيد الخطوط في index.html وcomponents.json | مراجعة تحقق نهائية فقط |
| Portal/Auth/Settings | B | إعادة تأليف البوابة (اليوم أولاً + لوحة تفاعل + شبكة مجالات بهوية X1)؛ Auth بصفحة كاملة وبلا كيبورد تلقائي؛ Settings/Apperance/Interface هيكلة جديدة وإزالة أدوات المطوّر | /occasions، /browse، /settings/prayer (تمديد قصير جارٍ) |
| Editorial | C | Reading مؤسَّس بحالة تحميل حقيقية؛ Archive/Marginalia/Journal gates؛ ArchiveNew A/B/C؛ Podcasts h1 واحد + StateView؛ ربط JournalGate في App.tsx | Diwan/Knowledge/PKM (دفعة ثانية جارية) |
| Spiritual | D | محراب بآلة 2×2 وتقويم 28 يوماً؛ /quran فهرس 114 سورة؛ /tafsir قارئ آيات متصل + تفسير مضمّن؛ /dhikr محتوى أولاً؛ صفحات السنن | لا شيء حرج؛ حالات موسّعة للتوثيق |
| Data | E | Crypto هيدر display + empty/error مضغوط؛ Weather لا-موقع بتكوين حقيقي + CTA إذن؛ Time-ledger رؤوس حالات موحدة؛ Fitness إزالة ألوان غير دلالية؛ Wellness gate؛ Mind fallback | WeatherWidget في البوابة (إصلاح جارٍ)؛ Populated crypto غير مُتحقَّق |
| Comms | F | سياسة كيبورد opt-in (إصلاح P0)؛ Chat signed-out سطح منتج موحّد؛ GroupComposer بلا textarea خام + isLoading؛ Settings keyboard حقيقي؛ German grammar h1 + LTR معزول | إرسال/مرفقات مسجّلة غير مُتحقَّقة؛ QA-SL-1 إغلاق الكيبورد (إصلاح جارٍ) |
| Spatial/Games | G | Travel Atlas سطح بديل مُصمّم + رؤوس؛ Games/Sudoku/Memory أشرطة تحكم وh1؛ Motion settings من 11,902 إلى 3,148px + مفتش للمعرض؛ اختبار dock/الزر الأساسي | TripsPage A/B/C، سحب لوحة المكان (موثّق) |
| QA مستقل | H | خط أساس مستقل + qa-shared-layer.md + تذاكر QA-SL-1..5 + فحص تفاعلي للدخول/التركيز/dock/الكيبورد | qa-final بعد التجميد |

## 9. أدلة الدفعات

- لقطات قبل/بعد لكل وكيل في `verification/design/{before,after}/<agent>/…`
- تقارير التدقيق الصارم: `verification/reports/audit-{a,b,c,d,e,f,g,...}.json`
- تقرير QA المستقل: `verification/reports/qa-shared-layer.md`
- تقرير البوابة الأولى: `verification/reports/gate0-baseline.md`

---

## 4. الفرق والملكية (Disjoint write scopes)

| وكيل | الدور | نطاق الكتابة |
|---|---|---|
| `lead` | المنسّق ومالك التكامل والبوابات والوثائق | `scripts/**`، `docs/design-system/**`، `verification/**`، `DESIGN.md`، `.kiro/**`، `README.md`، دمج الدفعات |
| A | Design Systems & Shared UI | `src/index.css`، `src/components/ui/**`، `PageHeader`، `PortalBackButton`، `src/lib/layout.ts`، `interfaceScale`، `index.html`، `components.json` |
| B | Portal & Account Experience | `pages/Portal`، `components/portal/**`، `features/{account,appearance,profile,calendar}/**`، صفحات settings/auth/browse |
| C | Editorial & Knowledge | `features/{archive,diwan,journal,knowledge,marginalia,pkm,podcasts,reading}/**`، `pages/Reading` |
| D | Spiritual | `features/{mihrab,duas}/**`، صفحات quran/tafsir/dhikr/sunnah/prayer-guide |
| E | Data & Insight | `features/{crypto,fitness,mind,time-ledger,weather,wellness}/**`، `pages/{Fitness,Wellness}` |
| F | Communication & Input | `features/{chat,german-club,keyboard}/**`، `pages/KeyboardSettings` |
| G | Spatial & Games | `features/{travel-atlas,games,motion}/**`، `pages/MotionSettings` |
| H | Independent QA | للقراءة فقط على الشيفرة؛ يكتب `verification/reports/**` و`verification/design/qa/**` |

**بروتوكول الدمج:** لا يودع أي وكيل. المنسّق يراجع `git diff` لكل دفعة، يشغّل
`bun run verify` + التدقيق الصارم + لقطات، ثم يودع دفعة صغيرة واحدة. أي تعارض
في CSS/tokens يحلّه مالك الطبقة المشتركة لا الفريق المستهلك.

---

## 5. اصطلاحات الأدلة

- لقطات: `verification/design/{before|after}/<agent>/<viewport>/<theme>-<mode>/<route>[-‑full].png`
- تقارير آلية: `verification/reports/` (route audit, contrast, performance)
- أدلة H: `verification/reports/qa-*.md` + `verification/design/qa/`
- كل صورة مرتبطة بهدف تصميم في التقرير النهائي؛ لا صورة بلا تفسير.

---

## 6. سجل المخاطر

| الخطر | التخفيف |
|---|---|
| تعارض كتابة بين وكلاء | نطاقات منفصلة معلنة + ممنوع تعديل المشترك + مراجعة diff عند الدمج |
| تقديم «تجميل» بلا تغيير تركيبي حقيقي | شرط لقطة before/after + قرار تصميمي مكتوب لكل شاشة |
| كسر وظائف أثناء الترحيل البصري | لا منطق أعمال؛ verify + e2e + smoke بعد كل دفعة؛ H يعيد الفحص |
| بيانات الشبكة تجعل اللقطات غير حتمية | حجب أصول البيانات + ملف تفضيلات مثبّت (N6/N7) |
| تباين داخل حاويات ملوّنة لا تغطيه الاختبارات | `audit:contrast` على DOM الفعلي لكل مسار/وضع + إصلاحات جذرية للأدوار |
| توسّع غير مضبوط للاستثناءات | كل استثناء محدد + سبب + مالك + فحص stale |

---

## 7. سجل التغييرات

| التاريخ | التغيير |
|---|---|
| 2026-11-18 | إنشاء الوثيقة، تسجيل Gate 0، إطلاق B–G + H، بدء Gate 1/2 |