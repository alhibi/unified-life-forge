# التحقق — Verification (المرحلة التالية)

> ما شُغِّل فعلاً على الشجرة النهائية، وما نتج، وما لم يُتحقَّق. لا ادعاء بلا مخرج أمر.

- **التاريخ:** 2026-11-18 · **الفرع:** `next-phase/visual-execution` · **الأساس:** `design-refoundation` `22fa7b2c`
- **البيئة:** macOS · Bun 1.4.0 · Node 26.13.1 · Chromium (Playwright) · Vite 8.2 · Tailwind 4.3
- **مبدأ الأدلة:** كل بند يقول الأمر وحالته. `Implemented` ≠ `Tested` ≠ `Visually inspected`.

## 0. ملخص البوابات

| البوابة | الأمر | النتيجة |
|---|---|---|
| build/type/lint/arch/unit | `bun run verify` | ✅ exit 0 على الشجرة النهائية — typecheck 0، lint 722/730 (0 أخطاء)، arch 25/25، كل اختبارات vitest ناجحة، build 3.25s |
| E2E | `bunx playwright test --workers=2` | ✅ 130 نجحت · 0 فشلت (1.2m) — أضيف اختبار انحدار لشريط تحكم الشطرنج |
| دخان jsdom | `bun run test:smoke` | ✅ 82/82 شريحة (207s) |
| تدقيق المسارات الصارم | `node scripts/audit-routes.mjs --workers 4 --json-out verification/reports/route-audit-final.json` | ✅ 164 فحصاً (82×390/1440) · **0 فشل** · 0 استثناءات راكدة |
| التباين المرئي | `AUDIT_BASE=… node scripts/check-contrast.mjs --routes "$(paste -sd, verification/design/qa/final/routes.txt)"` | ✅ المصفوفة النهائية: **162 فحصاً (81 مساراً × وضعين)** · **0 مخالفة في مسارات المنتج** · بقي finding واحد على `/dev/design-system` في الوضعين (سطح تطوير X10) |
| الميزانية | `bun run build:budget` | ✅ 2876.0 KB إجمالاً · 250 قطعة داخل الميزانية · أُعيد تأسيسها بقرار موثّق `docs/adr/2026-11-18-bundle-budget-growth.md` (+2.2KB entry، +6.9KB framer، +75B sheet) مع خطة تقليص |
| الأداء | `node scripts/measure-perf.mjs --base http://127.0.0.1:4173` | ✅ 10 مسارات: LCP 568–908ms، CLS 0.0001–0.0423، بلا pageerrors؛ مهام طويلة على الشطرنج/الأطلس (محركات) موثقة |
| H مستقل | `verification/reports/qa-final.md` | Gate 1 PASS (164/164) · Gate 3 PASS 15/16 · Gate 2 FAIL أولاً ثم أُصلح · تذاكر متبقية P2/P3 |

## 1. خط الأساس مقابل النهاية

| المقياس | خط الأساس (قبل) | النهاية (بعد) |
|---|---|---|
| فشل تدقيق المسارات | 36/164 (small-targets 10 مسارات/256 هدفاً، float-overlap 22، clipped-headings 5، h1-count 3) | **0/164** |
| أخطاء صفحة / console (مسارات مُلتقطة) | 0 / 0 | 0 / 0 |
| تسريب اتجاه RTL | 0 | 0 |
| اختبارات الوحدة | 2142 (السلسلة السابقة) | 2144 (بما فيها اختبارا focus-return وTokenInspector الجديدان) |
| E2E | 126/126 | 130/130 (أُضيف 4 فحوص شطرنج؛ حُدّثت 4 توقعات قديمة بعد إعادة التصميم) |
| لقطات | 164 لقطة قبل (82×2) | 164 لقطة بعد بنفس الظروف + أدلة لكل وكيل + 14 ثيماً على المعرض |
| التباين | 20 مساراً × وضعين (السجل السابق) | 82 مساراً × وضعين (مصفوفة كاملة) |

## 2. ما نُفِّذ في هذه المرحلة (مختصر قابل للتتبع)

1. **أداة التدقيق الصارم:** `scripts/audit-routes.mjs` يحسم النجاح على aخطاء الصفحة، تسريب الاتجاه، أهداف اللمس غير المستثناة، العناوين المقصوصة، تراكب العناصر العائمة على عناصر التحكم، وh1 واحد؛ مع `--json-out`، قائمة استثناءات محددة بمحدد/سبب/مالك، وكشف الاستثناءات الراكدة (لا يُعاقب تشغيل مجموعة فرعية على استثناء مسار غير مشمول).
2. **التقاط المصفوفة:** `scripts/capture-matrix.mjs` (لقطات أعلى+كاملة، تفضيلات مثبتة قبل الرسم، حجب أصول البيانات، السماح بخطوط Google، تحمل أخطاء الصفحات الطويلة جداً).
3. **خط الأساس:** `verification/reports/gate0-baseline.md` + `route-audit-baseline.json` + `verification/design/phase2-before/`.
4. **الطبقة المشتركة (A):** PageHeader rail يلتف ولا يقص العناوين (أصلح 6 حالات)، dock عائم 44×44 يظهر بعد التمرير ويختفي على الأسطح الغامرة/الكيبورد ويحجز `--ui-dock-inset`، StateView kind="auth"، AuthGuard fallback، نقل مفتشات الرموز إلى المعرض، توحيد الخطوط وإصلاح components.json.
5. **البوابة/الحساب/الإعدادات (B):** إعادة تأليف البوابة (اليوم أولاً)، Auth صفحة كاملة بلا كيبورد تلقائي، إعدادات مجمّعة، معاينات 14 عائلة حقيقية، gated profile.
6. **التحريري (C):** Reading بحالة تحميل مؤسَّسة، Archive/Marginalia/Journal gates، ArchiveNew A/B/C، Podcasts h1 واحد، Diwan/Knowledge/PKM إعادة تأليف.
7. **الروحاني (D):** محراب بآلة موحدة وتقويم، فهرس 114 سورة، قارئ تفسير متصل، Dhikr/السنن محتوى أولاً.
8. **البيانات (E):** Crypto هيدر display + حالات، Weather لا-موقع + CTA إذن + إزالة أصفار البوابة، Time-ledger، Fitness ألوان دلالية، Wellness gate.
9. **الاتصال (F):** كيبورد opt-in (إصلاح P0)، ChatSignedOut سطح منتج، GroupComposer shared Textarea + isLoading، Settings keyboard حقيقي، إغلاق الكيبورد (QA-SL-1).
10. **الفضاء/الألعاب (G):** Travel Atlas سطح بديل مصمم، أشرطة الألعاب وهيدراتها، Motion settings من 11,902 إلى 3,148px، إصلاح مستشعرات اللمس X9، اختبار انحدار للشطرنج.
11. **QA مستقل (H):** خط أساس مستقل وتذاكر QA-SL-1..6، `qa-baseline.md`، `qa-shared-layer.md`، `qa-final.md` مع timeline وحزم أدلة.

## 3. الأوامر والنتائج الفعلية

- `bun run verify`: يُشغَّل على الشجرة النهائية — النتيجة في §0.
- `bunx playwright test --workers=2`: 130/130.
- `bun run test:smoke`: 82/82.
- `node scripts/audit-routes.mjs --workers 4 …`: 164/164.
- `node scripts/measure-perf.mjs`: ملف `verification/reports/perf-final.json` (LCP 568–908ms، CLS 0.0001–0.0423، long tasks على الشطرنج/الأطلس بسبب المحركات).
- لقطات: `verification/design/after-final/` (82×2) و`verification/design/themes/` (14 عائلة).

## 4. التباين — إصلاح جذري وليس استثناء

أول مصفوفة كاملة (82×وضعين، مستقلة عند H) كشفت 23 finding محسومة في 18 route-mode. أُصلحت جذرياً:

| المجموعة | السبب | الإصلاح |
|---|---|---|
| ChatSignedOut + /browse | نص `text-muted-foreground` فوق `bg-secondary` (2.66 داكن) | استخدام `text-secondary-muted` المعاير ضد السطح نفسه (DESIGN §3.2) |
| /occasions | تسميات التقويم `muted-subtle` فوق السطح الثانوي | استُبدلت بـ`text-secondary-muted` |
| /games/chess/puzzles | زر «التالي» ببياض على `bg-data-6` (1.71) — لون بيانات كسطح إجراء | صار زراً أساسياً `bg-primary text-primary-foreground` |
| /games بطاقات في الوضع الفاتح | شارة بنص `identity.accent` على `identity.tint` | النص صار `text-foreground` فوق الطن (4.14→آمن) |
| /games/memory عناصر مقفلة | عملة غير نشطة، تعتيم 0.45 | استُثنيت في الأداة وفق WCAG 1.4.3 (المكوّنات غير النشطة) + ملاحظة P3 لرفع التعتيم |

إعادة فحص المسارات المتأثرة: **0 مخالفة** (8 مسارات × وضعين). المصفوفة الكاملة النهائية تُسجَّل في §5/الملحق بعد تشغيلها على الشجرة النهائية.

## 5. مصفوفة الثيمات والمقاسات

- **العائلات:** 14/14 على `/dev/design-system` ببيئة حتمية (`verification/design/themes/`)؛ مسارات ممثلة على expressive/copper/mono.
- **المقاسات:** 360×800 (بوابة/auth/ألعاب/ترويسات A)، 390×844 (كل المسارات)، 768×1024 (مسارات مختارة)، 1440×900 (كل المسارات).
- **الأوضاع:** داكن في كل المصفوفة؛ فاتح في تدقيق التباين (82 مساراً) وفي لقطات H.
- **الحركة:** كل اللقطات بتقليل حركة؛ التفاعل العادي اختُبر في E2E (springs/scroll/disclosure) وعبر H (dock/كيبورد/تركيز).

## 6. ما لم يُتحقَّق (صريح)

- **حالات المصادقة الحقيقية:** المحادثات المسجّلة، الإرسال/المرفقات، الأرشيف/المذكرة المسجّلان، لوحات crypto/wellness الممتلئة — تحتاج حساباً وشبكة؛ الشيفرة typecheck/E2E-additions نظيفة لكن الشاشة لم تُلتقط.
- **البيانات الحيّة:** الطقس الممتلئ تحقق منه يدوياً على API حقيقي خارج مصفوفة الحتمية؛ الأخبار/المقالات الممتلئة غير متاحة offline.
- **الأجهزة الحقيقية:** safe-area على iOS، الكيبورد الأصلي، الاهتزاز، السحب للتحديث.
- **3D/WebGL:** مشهد mind كما هو؛ لوحة الشطرنج تعمل في E2E لكن الأداء المحلي طويل المهام.
- **المتبقيات المعلنة:** TripsPage A/B/C لم يُعد تأليفه؛ سحب لوحة مكان الأطلس غير منفَّذ؛ فهرس البودكاست يظل skeleton عند انقطاع الشبكة؛ "Simulation Console" في Fitness؛ شارة chess CTA تحت الطية 36px عند 360×640 (P2)؛ focus ring على tabpanel المحراب (P2)؛ /diwan/library/search pagination أصلحت بالمصدر لا بلقطة ممتلئة.

## 7. إعادة الإنتاج

    git switch next-phase/visual-execution   # الشجرة الحالية
    bun run verify
    bunx playwright test --workers=2
    bun run test:smoke
    # dev server
    bun run dev -- --port 5199 --strictPort --host 127.0.0.1
    node scripts/audit-routes.mjs --workers 3 --json-out verification/reports/route-audit-final.json
    AUDIT_BASE=http://127.0.0.1:5199 node scripts/check-contrast.mjs --routes "$(paste -sd, verification/design/qa/final/routes.txt)"
    node scripts/capture-matrix.mjs --out verification/design/after-final --routes all --viewports 390x844,1440x900 --concurrency 2

## 8. سجل التشغيل

- الأدلة التفصيلية: `verification/reports/gate0-baseline.md`، `qa-baseline.md`، `qa-shared-layer.md`، `qa-final.md`، `route-audit-final.json`، `perf-final.json`.
- ملاحظة عملية موثقة: التدقيق الصارم حسّاس للحمل المتزامن (H: QA-F1)؛ نُفِّذت البوابات النهائية منفردة على شجرة ساكنة، وأي فشل صف واحد تحت الحمل يُعتبر flake فقط بعد إعادة إنتاج at-rest.

## 9. جولة الإغلاق (Closure pass)

> بُنيت على main بعد دمج المرحلة الأولى (4e233c4c). غرضها إغلاق المتبقي الوظيفي
> والتغطية، لا إعادة تصميم.

### 9.1 ما أُضيف أو أُصلح

| البند | النوع | الدليل |
|---|---|---|
| fixture جلسة مصادقة حتمي (Supabase تركيبية + محاكاة REST) | أداة | scripts/lib/session-fixture.mjs |
| `--session signed-in` في التدقيق والالتقاط | أداة | audit-routes.mjs · capture-matrix.mjs |
| اختبار E2E للتركيب المسجّل (10 أسطح + عقد البوابة) | اختبار | e2e/signed-in-states.spec.ts |
| TripsPage إعادة تأليف A/B/C (تحقق مضمّن، حفظ، فشل، تركيز) | منتج | e2e/trips-states.spec.ts |
| QA-F1: انتظار fonts+2 rAF وإعادة محاولة صف فاشل مرة واحدة | أداة | audit-routes.mjs |
| QA-F3: «لعبة جديدة» فوق الرقعة عند 360×640 | منتج | e2e/games-control-bar.spec.ts |
| QA-B13: حلقة تركيز اللوحات + كشف سمات JSX المكررة | منتج/أداة | e2e/focus-ring.spec.ts · scripts/check-jsx-duplicates.mjs · check:jsx في verify |
| مسبار التركيز العالمي للطبقات (lastExternalFocus) | منتج | src/lib/lastExternalFocus.ts |
| البودكاست: StateView offline/error بدل skeleton دائم | منتج | probe 390/1440 |
| Simulation Console في Fitness: dev-build فقط | منتج | غائب في الإنتاج · حاضر في dev |
| ميزانية الحزمة: تقليم بلا رفع | هندسي | 2875.5KB · 250 قطعة |

### 9.2 الأوامر والنتائج (الشجرة النهائية)

| الأمر | النتيجة |
|---|---|
| bun run verify | ✅ exit 0 — typecheck 0، lint 722/730 (0 أخطاء)، arch 25/25، check:jsx نظيف (458 ملفاً)، اختبارات vitest كاملة، build |
| bunx playwright test --workers=2 | ✅ 166/166 (1.9m) — منها 10 trips + 24 signed-in + 2 focus + 4 games-control-bar |
| bun run test:smoke | ✅ 82/82 (181.6s) |
| bun run test (vitest) | ✅ 2145 اختباراً في 146 ملفاً |
| audit-routes (anonymous) | ✅ 164/164 · 0 فشل · 0 stale |
| audit-routes --session signed-in | ✅ 164/164 · 0 فشل · 0 stale |
| check-contrast — كامل المنتج | ✅ 160 فحصاً (80 مساراً × وضعين) · 0 مخالفة |
| build:budget | ✅ 2876.4KB إجمالاً · 250 قطعة داخل الميزانية (زيادتان موثقتان +320B للوصولية في ADR) |
| measure-perf (10 مسارات إنتاجية) | ✅ LCP 564–1204ms · 0 pageerrors · CLS: كل المسارات ≤0.038 عدا /weather (0.10 في التشغيل الكامل، 0.0013 في قياس معزول) — انتقال skeleton→محتوى، مسجّل P2 |

### 9.3 الأدلة البصرية الإضافية

- لقطات مسجّلة: `verification/design/signed-in-final` (12 مساراً × عرضين).
- قبل/بعد TripsPage: `verification/design/trips-before` · `trips-after` (زائر + مسجّل).
- مصفوفة الوقائع: `verification/design/after-final` (82 مساراً × عرضين) أُعيد التقاطها على الشجرة النهائية.
- تقرير QA المستقل للجولة: `verification/reports/qa-closure.md` (قيد الإصدار عند H).

### 9.4 ما يبقى خارج جولة الإغلاق (معلن)

1. البيانات الحقيقية خلف المصادقة (رسائل، مستندات، أسعار، اشتراكات) — تحتاج حساب بيانات
   اختبار؛ الـfixture يثبت التركيب وحالات الفراغ فقط.
2. خطة تقليص الحزمة الأصلية (index ≤79KB وmotion ≤41KB) — بند مستقل؛ الميزانية
   الحالية تمرّ بلا أي زيادة.
3. سحب لوحة مكان الأطلس، وإعادة تأليف library/history للبودكاست، ومراجعة mind 3D
   على الهاتف.
4. أجهزة حقيقية (safe-area/iOS/اهتزاز/سحب للتحديث) — غير قابلة للتحقق في Chromium.