# حالات التفاعل والتدفقات A / B / C — Interaction States

> مرجع تنفيذي لسلوك الواجهة عبر الزمن: ما يراه المستخدم في البداية، ماذا يحدث أثناء
> التنفيذ، وأين ينتهي. المرجع البصري [DESIGN.md](../../DESIGN.md) §10، وعقد
> المكوّنات [component-catalog.md](./component-catalog.md) §5.
>
> **قاعدة الإثبات:** لا يُعلن تدفّق «متحقَّقاً» بوجود المكوّن، بل بتشغيله في المتصفح
> أو باختبار آلي يعيد إنتاجه. الحالة في الجدول: `Baseline` (موثّق قبل التعديل) ·
> `Implemented` (غُيّر الكود) · `Tested` (اختبار آلي) · `Verified` (فحص متصفح/لقطة + اختبار).

## 0. تصنيف الحالات الملزم

| الحالة | التعريف | متى تنطبق | كيف تُثبت |
|---|---|---|---|
| initial | العرض الأول قبل أي بيانات | كل مسار | لقطة/فحص DOM |
| loading | طلب جارٍ مع حجز مساحة (skeleton بلا قفز) | كل مسار يجلب بيانات | تعطيل الشبكة/تأخيرها |
| populated | بيانات حقيقية | كل مسار له محتوى | بيانات محلية أو fixture |
| empty | لا محتوى لكن الصفحة سليمة بإجراء تالٍ | قوائم/لوحات | لا بيانات (الحالة الحتمية) |
| error | فشل طلب/عملية مع سبب وإعادة محاولة | كل جالب بيانات | اعتراض الطلب/500 |
| offline | انقطاع شبكة يُعرض كانقطاع لا كخطأ بيانات | الجالبات الشبكية | context offline |
| permission-denied | رفض إذن (موقع/إشعارات/ميكروفون) | الخرائط/الطقس/الوسائط | رفض إذن في المتصفح |
| unauthenticated | بوابة دخول بهوية الصفحة لا بطاقة يتيمة | المسارات المحمية | جلسة بلا مستخدم |
| selected | عنصر محدد بحالة مرئية غير لونية فقط | قوائم/تبويبات/شرائح | تفاعل فعلي |
| expanded | طبقة/لوح/تفاصيل مفتوحة مع إدارة تركيز | حوار/درج/قائمة | تفاعل + فحص تركيز |
| editing | نموذج قابل للتعديل مع تحقق ودعم مسودة | نماذج | تفاعل |
| saving | إجراء جارٍ: تعطيل مكرر + مؤشر | كل إرسال | تأخير الشبكة |
| success | نتيجة مرئية + عودة تركيز + خطوة تالية | كل إجراء | تفاعل |
| destructive-confirmation | تأكيد صريح لفعل غير قابل للرجوع | حذف/استبدال | تفاعل |

## 1. عقود التفاعل العابرة (تنطبق على كل المسارات)

| # | العقد | التنفيذ |
|---|---|---|
| I1 | منع النقر المكرر | الزر `isLoading` + `disabled` أثناء الطلب؛ لا نقرتان تُنشئان سجلين. |
| I2 | حجز المساحة | `Skeleton` بنفس أبعاد المحتوى؛ لا قفزة عند وصول البيانات. |
| I3 | الفشل يعيد الحالة السابقة | لا تُبقى واجهة على قيمة لم تُحفظ؛ فشل الإرسال يبقي المسودة. |
| I4 | التمييز بين offline وerror | انقطاع الشبكة `StateView kind="offline"`؛ فشل الخادم `kind="error"` مع إعادة محاولة. |
| I5 | إدارة تركيز الطبقات | فتح الحوار يضع التركيز داخله، Tab محبوس، Esc يغلق، والإغلاق يعيد التركيز إلى المشغّل. مغطّى باختبارات Dialog/Drawer. |
| I6 | قفل التمرير | الطبقات تمنع تمرير الخلفية؛ `overflow` يُعاد بعد الإغلاق. |
| I7 | تأكيد الفعل الخطير | `AlertDialog` بسبب ونتيجة واضحين؛ لا حذف مباشر. |
| I8 | استعادة الموضع | الرجوع يحافظ على موضع القائمة/التمرير (ScrollToTop يستثني الرجوع حيث يجب). |
| I9 | إعلان النتيجة | نجاح ظاهر في المكان؛ `toast` فقط عندما لا يكون الأثر مرئياً بنفسه. |
| I10 | حركة مخفّفة | كل انتقال يحترم `prefers-reduced-motion` ومفتاح التطبيق، ولا يؤخر التفاعل. |
| I11 | حالات التركيز | `focus-visible` 2px + إزاحة على كل عنصر تفاعلي، فوق كل الأسطح. |

## 2. التدفّقات A / B / C

### 2.1 إرسال رسالة — /chat, /chat/g/:id (G5)

- **A:** الحقل في التركيز، زر الإرسال معطّل حتى يوجد نص، آخر الرسائل مقروءة، بلا رسائل → StateView بسياق المحادثة.
- **B:** إرسال optimistic بعلامة «قيد الإرسال»؛ الزر/H1 معطّل، لا إرسال مكرر؛ فشل → الرسالة تبقى بعلامة فشل + إعادة محاولة؛ offline → شريط انقطاع لا خطأ بيانات.
- **C:** الرسالة مؤكدة بالوقت، التركيز يعود للحقل، فشل متكرر بـtoast.error + إعادة محاولة.
- **الحالة:** Baseline — `GroupComposer` يستخدم textarea خاماً وزراً دائرياً يدوياً بلا دوّارة إرسال (مخالفة موثقة في الكتالوج). المالك: F.

### 2.2 حفظ إعداد — /settings/** (G4)

- **A:** قائمة صفوف مع القيمة الحالية، الحفظ الفوري المحلي لا يحتاج زراً، الشبكي يحتاج زراً واحداً واضحاً.
- **B:** تبديل optimistic فوري، تعطيل الصف أثناء الطلب، لا toast لكل نقرة، فشل → إرجاع القيمة.
- **C:** القيمة تثبت؛ toast.success فقط إن لم يكن الأثر ظاهراً؛ فشل → toast.error + إعادة محاولة + عودة التركيز.
- **الحالة:** Baseline — أغلب الإعدادات محلية (Zustand/persist) فلا حالة B؛ الشبكية تحتاج B صريحة. المالك: B (إعدادات الواجهة/المظهر/الصلاة) وE/F/G حسب الوجهة.

### 2.3 بحث — /german-club/dictionary, /diwan/library/search, /podcasts (G4)

- **A:** حقل بحث في التركيز + تبويبات + عدد النتائج؛ الاستعلام الفارغ يعرض الكل لا «لا نتائج».
- **B:** debounce مع SkeletonList أو aria-busy، وإبقاء النتائج السابقة حتى تصل الجديدة (لا وميض).
- **C:** صفر → StateView kind="search" يعيد الاستعلام ويقترح توسيعاً؛ فشل → error + action؛ offline → offline؛ مسح الاستعلام يعيد الكل.
- **الحالة:** Baseline — GermanDictionary يستخدم StateView search فعلاً؛ Diwan search وPodcasts يحتاجان مراجعة. المالك: C/F.

### 2.4 إنشاء قيد أرشيف — /archive/new (G4/G2)

- **A:** PageShell + PageHeader + نموذج، زر أساسي معطّل حتى تصح المدخلات، الخطأ بجانب الحقل.
- **B:** isLoading + loadingText، الحقول معطّلة، إلغاء متاح، تقدّم حقيقي للعملية الطويلة.
- **C:** نجاح → /archive/:id + toast.success؛ فشل → المسودة سليمة + رسالة محددة + إعادة محاولة.
- **الحالة:** Baseline — ArchiveNew يستخدم select خاماً وزراً بكبسولة يدوية وstyle fontSize (مخالفات موثقة). المالك: C.

### 2.5 بدء لعبة شطرنج — /games/chess (G7)

- **A:** GameShell برقعة خاملة، اختيار النمط/الصعوبة، زر «ابدأ» أساسي، التركيز على البدء.
- **B:** الرقعة والخيارات معطّلة مع aria-busy أثناء تهيئة المحرّك، Skeleton/Suspense لمشهد 3D الكسول.
- **C:** الرقعة تبدأ ومؤشر الدور ظاهر والتركيز ينتقل للرقعة؛ فشل تهيئة → StateView error + إعادة محاولة؛ النهاية → Dialog تقرير + toast.
- **الحالة:** Baseline — GameShell موجود، ويجب التحقق من تبويباته (أزرار Button لا Tabs) وعدم تغطية dock للإجراء الأساسي على 360×640. المالك: G.

### 2.6 إضافة رحلة — /travel-atlas/trips (G6)

- **A:** PageHeader + زر أساسي يفتح ResponsiveDrawer (Drawer هاتف/Dialog واسع) بحقول عنوان وتاريخ وإلغاء/تأكيد.
- **B:** التأكيد isLoading ومعطّل، النموذج يبقى مفتوحاً والقيم محفوظة؛ لا إدخال optimistic للمعرّف.
- **C:** نجاح → إغلاق اللوح وتصفير الحقول والانتقال للتفاصيل؛ فشل → toast.error، اللوح مفتوح، إعادة المحاولة ممكنة.
- **الحالة:** Baseline — TripsPage يبني page-shell يدوياً ويستخدم .skeleton/.empty-state القديمة وبلا دوّارة إرسال. المالك: G.

### 2.7 فتح قارئ/تفاصيل — /archive/:id, /podcasts/:id, /diwan/library/poem/:slug (G2)

- **A:** العنوان والميتاداتا واضحة، عمود قراءة، أدوات هادئة، h1 واحد.
- **B:** تحميل المحتوى بحجز مساحة، فشل → StateView error مع رجوع؛ التنقل بين الفصول يحافظ على الموضع.
- **C:** نهاية القراءة → تنقّل للفصل التالي/السابق، حفظ الموضع، عودة.
- **الحالة:** Baseline — المسارات الديناميكية تحتاج fixture لاختبارها؛ لا بيانات محلية في line الأساس. المالك: C.

### 2.8 بوابة الدخول — /auth, /profile, والمحمي (G4)

- **A:** هوية الصفحة + شرح ما وراء البوابة + حقول مرئية وCTA أساسي + مخرج ثانوي؛ لا كيبورد يغطي النموذج.
- **B:** إرسال isLoading، أخطاء بجانب الحقول، لا كشف لكلمة المرور، لا إعادة إرسال.
- **C:** نجاح → العودة إلى الوجهة الأصلية؛ فشل → رسالة محددة وبقاء القيم (عدا كلمة المرور).
- **الحالة:** Baseline — **P0**: /auth و/profile يفتحان لوحة مفاتيح عربية داخلية تغطي الحقول وCTA؛ والبطاقة اليتيمة بلا هوية صفحة. المالك: B (التكوين) + F (سياسة الكيبورد) + A (AuthGuard fallback).

### 2.9 حفظ ورد يومي — /mihrab, /quran (G1/G2)

- **A:** بطاقة الورد تُظهر التقدّم الحالي وخيار القدر، الزر الأساسي واضح.
- **B:** الحفظ optimistic مع تعطيل مؤقت، فشل → إرجاع التقدّم + رسالة.
- **C:** تقدّم محدّث + تأكيد؛ لا احتفال يحوّل العبادة إلى لعبة (البوصلة).
- **الحالة:** Baseline — WirdCard موجود؛ يحتاج تحقق بصري/تفاعلي. المالك: D.

## 3. مصفوفة القواعد × الحالات

| القاعدة | حالات ملزمة إضافية | مسارات التمثيل |
|---|---|---|
| G1 بوابة/نظرة عامة | initial · loading · empty (لا مثبّت) · populated · error · offline | /, /browse, /games, /mihrab, /diwan |
| G2 تحريري/قراءة | loading · empty · error · populated · editing (إن وُجد) | /quran, /tafsir, /diwan/library/**, /reading, /archive/:id, /knowledge, /journal |
| G3 بيانات/قياس | loading · permission-denied · error · empty · populated · selected/filtered | /weather, /wellness, /fitness, /crypto, /time-ledger, /diwan/bayan |
| G4 قوائم/إعدادات | loading · empty · search · saving · success · destructive-confirmation | /settings/**, /german-club/**, /podcasts/**, /archive, /pkm |
| G5 محادثة | unauthenticated · loading · empty · sending · failed · offline | /chat/** |
| G6 خرائط/فضاء | loading · permission-denied · empty · error tiles · expanded detail | /travel-atlas/** |
| G7 ألعاب/سطح | idle · running · paused · win/loss · hint · reduced motion | /games/**, /pkm/mind, /settings/keyboard |

## 4. إجراء الفحص (قابل لإعادة الإنتاج)

1. الحالة الحتمية: `node scripts/audit-routes.mjs --routes <...> --json-out <...>`
2. اللقطات: `node scripts/capture-matrix.mjs --routes <...> --viewports 390x844 --modes dark` (شبكة خارجية محجوبة، خطوط مسموحة).
3. التفاعل (Playwright): افتح الطبقة → تحقق أن Escape يغلق وأن التركيز يعود إلى المشغّل؛ أرسل نموذجاً بضغط مزدوج وتحقق من طلب واحد؛ أوقف الشبكة وتحقق من kind="offline" لا kind="error".
4. أدلة H المستقلة في `verification/reports/qa-*.md`.

## 5. فجوات خط الأساس (تُحدَّث مع كل دفعة)

| # | الفجوة | المسار | المالك | الحالة |
|---|---|---|---|---|
| S1 | لوحة المفاتيح الداخلية تغطي نموذج الدخول | /auth, /profile | B+F+A | جارٍ |
| S2 | حالات محمية/فارغة يتيمة بلا هوية صفحة | /chat, /wellness, /journal, /archive, /marginalia | B (النمط) + C/E/F | جارٍ |
| S3 | GroupComposer بلا دوّارة إرسال/حالة فشل | /chat | F | جارٍ |
| S4 | ArchiveNew عناصر تحكم خام | /archive/new | C | جارٍ |
| S5 | TripsPage empty/skeleton قديمان وبلا دوّارة | /travel-atlas/trips | G | جارٍ |
| S6 | مسارات ديناميكية بلا fixture (قصيدة/رحلة/بودكاست/غرفة) | متعدد | C/G/F | Not verified |
| S7 | حالات أذونات الموقع (خرائط/طقس) غير مختبرة تفاعلياً | /travel-atlas, /weather | E/G | Not verified |

## 6. حالة التحقق النهائية (2026-11-18، بعد التجميد)

| التدفّق | الحالة | الدليل |
|---|---|---|
| إرسال رسالة (واجهة المرسل) | Implemented + Reviewed بالشيفرة؛ المُرسل الفعلي **Not verified** (يتطلب جلسة) | GroupComposer: Textarea مشترك + Button isLoading/loadingText |
| حفظ إعداد | Implemented · Tested (E2E يقرأ القيم المحسوبة) · Visually inspected | e2e/motion-and-interface.spec.ts + settings captures |
| بحث القاموس | Implemented · Tested (حالات search/error) · Visually inspected | audit + after/f-comms |
| إنشاء قيد أرشيف | Implemented (A/B/C) · **B/C غير visible offline** | ArchiveNew + audit |
| بدء لعبة شطرنج | Implemented · Tested (E2E 130/130) · Visually inspected | e2e/games-control-bar.spec.ts |
| إضافة رحلة | Implemented (A/B/C) · Not visually verified (authenticated write path) | TripsPage — إعادة التأليف الكامل باقية |
| بوابة الدخول | Implemented · Tested (H 15/16) · Visually inspected | qa-final.md، auth-390/1440 |
| حفظ ورد | Implemented · Verified بصرياً في /mihrab | after/d-spiritual |
| فتح/إغلاق الطبقات | Implemented · Tested (7/7 focus spec) · Verified (H) | overlayFocusReturn.test.tsx + qa-final |
| كيبورد التطبيق | Implemented · Tested (QA-SL-1 open→close) | SoftKeyboardToggle + qa-final |
| أزرار الأمان/التأكيد | Existing AlertDialog flows unchanged · Not re-verified each route | — |

**قاعدة الإغلاق:** كل ما هو `Not verified` أعلاه مذكور في verification.md §6 مع السبب؛ لا يُنسب إليه نجاح.
