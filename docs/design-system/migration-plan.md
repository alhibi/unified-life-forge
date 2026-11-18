# خطة الترحيل وحالة كل مجال — Migration Plan

> حالة الترحيل تُقاس بالشيفرة والاختبارات، لا بالنية. كل صف يقول ما نُفِّذ في هذا
> الفرع، وما تبقّى، وما لم يُتحقَّق بصرياً.

- **الفرع:** design-refoundation · **الأساس:** origin/main 7e34f503 · **التاريخ:** 2026-11-18
- **المرجع:** [DESIGN.md](../../DESIGN.md) · [route-coverage.md](./route-coverage.md) · [verification.md](./verification.md)

## 0. الدفعات

| الدفعة | النطاق | الحالة |
|---|---|---|
| **0 — Baseline** | جرد 82 مساراً و26 مجالاً، قياس الميزانيات، 60 لقطة (10 مسارات × 3 عروض × وضعين)، تشغيل verify/e2e | **مكتمل** |
| **1 — Governance** | DESIGN.md جديد، AGENTS.md، عقد kiro، README، خرائط المعمارية، وسم HISTORICAL | **مكتمل** (راجع تقرير الوكيل) |
| **2 — Foundations** | عقد الأدوار الدلالية + اختبار 44 حالة لكل العائلات، PageShell width، سلم z، حد الطباعة 12px، تنظيف الخطوط والملاحظات، تشديد الميزانيات | **مكتمل** |
| **3 — Components & grammar** | كتالوج المكوّنات، معرض /dev/design-system، قواعد الصفحات السبع | **مكتمل** (الكتالوج + المعرض) |
| **4 — Migration** | Portal/Shell ثم المحتوى والبيانات والمحادثة والخرائط والألعاب | **جزئي** — التفصيل أدناه |
| **5 — Verification** | verify/e2e/smoke + لقطات بعد + تباين + تقرير | **مكتمل بحدود** (انظر verification.md) |

## 1. ما تغيّر في هذا الفرع (بالملفات)

| التغيير | الملفات | الأثر |
|---|---|---|
| إطاران معتمدان بدل عرض واحد | src/components/ui/app-shell.tsx · src/index.css | PageShell width=workspace؛ لوحات البيانات لم تعد محبوسة في 512px |
| اعتماد مساحة العمل | features/crypto/pages/CryptoWatchlist.tsx · pages/Wellness.tsx · pages/Fitness.tsx · features/time-ledger/pages/TimeLedger.tsx | 4 لوحات بيانات اتسعت على 768/1440 |
| ترويسة الطقس الفارغة | features/weather/pages/Weather.tsx | PageHeader + h2 + مساحة عمل؛ حالة «اختر موقعاً» صارت جزءاً من المنتج |
| شبكة أهداف الورد | features/mihrab/components/WirdCard.tsx | 2×2 على الهاتف بدل التفاف يترك خياراً وحيداً في سطر |
| شريط نشاط محراب | src/pages/Mihrab.tsx | تسمية + role=img بدل 20 عموداً صامتاً |
| شريط تحكم الشطرنج | features/games/pages/Chess.tsx | فعل أساسي واحد + شبكة 3 أعمدة؛ لا كبسولات |
| إزالة بقايا التنقّل السفلي | src/App.tsx | لا حشوة سفلية ميتة ولا ALL_NAV_PATHS |
| سلم z | 13 ملفاً | z-raised/z-sticky/z-drawer/z-base بدل الأرقام |
| حد الطباعة | 18 ملفاً (الطقس/المعرفة/لوحة المفاتيح) | text-micro بدل 10–11px |
| خطوط ميتة | src/main.tsx · src/index.css | إزالة 20 استيراداً غير مستخدم (Cormorant/Montserrat/Outfit/Figtree/Sora/Manrope) |
| بوابات | src/test/designSystem.test.ts · src/utils/__tests__/themeContract.test.ts · e2e/*.spec.ts | ميزانيات مشدودة + عقد أدوار + إصلاح اختبارين قديمين |
| معرض مرجعي | src/pages/DesignSystemGallery.tsx + مسار /dev/design-system | 14 عائلة + أدوار + طباعة + مكوّنات + حالات + قواعد |
| إصلاح انهيار مسار | src/features/german-club/components/dictionary/DictionaryVirtualGrid.tsx | قياس الصفوف لا يُشغَّل بلا صندوق حقيقي؛ مسار القاموس يُركَّب بدل أن يسقط على ErrorBoundary |
| إصلاح مكوّنات مشتركة | dialog/drawer/state-view/calendar/carousel/ResponsiveDrawer | عودة التركيز للزر بعد الإغلاق، أيقونة StateView اختيارية، RTL للتقويم/المعرض، ارتفاع الدرج 85dvh مع تمرير |
| h1 لكل مسار | archive reader · mind · explore map · sunnah detail · time-ledger · chat groups/group | لا مسار بلا ترويسة دلالية؛ كشفها audit:routes |

## 2. حالة المجالات الستة والعشرين

الرموز: ✅ رُحّل وتحقّق منه في الشيفرة · ◐ جزئي · ○ لم يُمسّ · ⚠ يحتاج قراراً.

| المجال | القاعدة | ما نُفِّذ | المتبقي |
|---|---|---|---|
| account | G4 | لا شيء مباشرة؛ يورث الإعدادات | توحيد شاشات الحساب مع SettingsHub |
| appearance | G4 | يستخدم PageShell/PageHeader مسبقاً؛ الثيمات كلها في المعرض | معاينة مباشرة لكل عائلة داخل صفحة المظهر |
| archive | G2 (reader) / G4 (home) | لا شيء | ترويسة الأرشيف الموحّدة، فحص الوضع السينمائي على 360 |
| calendar | G3 | لا شيء | توحيد شبكة المناسبات مع StatGrid |
| chat | G5 | حالة غير المسجّل أصبحت صفحة كاملة (PageShell + PageHeader + StateView)؛ h1 للمجموعات والمحادثة | فحص الحقل الثابت على الهاتف وحالات الإرسال الفاشل |
| crypto | G3 | width=workspace | مقياس/مخطط على 768 |
| diwan | G1/G2/G4 | لا شيء | توحيد ترويسة المكتبة، فحص عمود الشعر على 360 |
| duas | redirect | مسار تحويل إلى /mihrab (تبويب الذكر) | توثيقه كتحويل في كل الخرائط (تم) |
| fitness | G3 | width=workspace | فحص لوحات التمارين على 768؛ FitnessDashboardPage القديمة ميتة |
| games | G7 | شريط تحكم الشطرنج | Sudoku/Memory: نفس نمط السطح والأزرار |
| german-club | G4 | أُصلح انهيار /german-club/dictionary؛ عُزلت العبارات الألمانية في Wort des Tages وDetDetailModal وGrammar Corner | فحص LTR للعناوين المركّبة في ShelfCard عند توفّر بيانات |
| journal | G2/G4 | لا شيء | محرّر اليومية: حالات الحفظ/الخطأ |
| keyboard | G7 | حد الطباعة 12px | فحص أهداف اللمس والتباين على الهاتف |
| knowledge | G2 | حد الطباعة 12px | توحيد عمود القراءة وترويسة الفئات |
| marginalia | G2 | لا شيء | فحص الرسم/الشبكة والحالات |
| mihrab | G1 | تسمية شريط النشاط + شبكة الورد | توحيد شرائح المasthead (4 كبسولات) |
| mind | G7 | لا شيء | لا يلمس 3D؛ فحص أدوات التحكم المحيطة |
| motion | G4 | لا شيء | معاينة الحركة داخل الإعدادات |
| pkm | G4 | لا شيء | قائمة/محرر: حالات فارغ/حفظ |
| podcasts | G4/G6 | لا شيء | غلاف/مشغّل: حالات التشغيل والخطأ |
| profile | G4 | لا شيء | توحيد تبويبات النشاط |
| reading | G2 | ترويسة PageHeader موحّدة داخل PageShell، شرائح عربية عبر خريطة فئات صريحة، فلاتر كشريط أدوات، حالات StateView، وحذف مجلد بهدف لمس 44px | فحص القائمة الفرعية (no-feeds) وسلوك السحب للتحديث على جهاز |
| time-ledger | G3 | width=workspace + h1 في حالات التحميل/الفراغ/الخطأ + StateView للخطأ | فحص الإدخال السريع على 360 |
| travel-atlas | G6 | لا شيء | فحص الأدوات العائمة وRTL |
| weather | G3 | ترويسة الفارغ + h2 + إزالة مقاس px | توحيد الترويسة اللاصقة مع PageHeader (قرار مقصود: ترويسة المجال تحمل الموقع/الإحداثيات) |
| wellness | G3 | width=workspace | فحص تبويبات الغذاء/التمرين على 768 |

## 3. العمل المتبقي بترتيب الأولوية

1. **Reading (G2):** ترويسة الصفحة لا تستخدم PageHeader؛ شرائح الفئات إنجليزية من
   مزوّد الخلاصات. قرار مقترح: خريطة تسميات عربية للفئات المعروفة + PageHeader
   compact + StateView موحّد للخطأ. يحتاج وقتاً لأن ListHeader 603 أسطر.
2. **Portal desktop:** اللوحة المرافقة منفصلة عن لوحة اليوم بفجوة كبيرة؛ يحتاج
   إعادة تركيب (12 عموداً) لا تغيير منطق.
3. **Games (بقية الألعاب):** توحيد أشرطة التحكم على نمط الشطرنج الجديد.
4. **German Club:** فحص LTR للكلمات والمصطلحات داخل جمل عربية.
5. **Chat auth state:** استخدام StateView + ترويسة بدل بطاقة وحيدة في فراغ.
6. **Archive/PKM/Podcasts:** حالات الحفظ والفراغ والخطأ.

## 4. قواعد الترحيل

- لا تخلط إعادة كتابة منطق مع ترحيل بصري في commit واحد.
- ابدأ بالأساس المشترك (PageShell/PageHeader/AppList/StateView) قبل الشاشة.
- بعد كل دفعة: bun run verify + لقطة على 360 و1440 + فحص تباين.
- كل مكوّن جديد يحتاج صفاً في الكتالوج وقاعدة في الاختبار.
- الميزانيات تنزل فقط؛ رفعها قرار مكتوب هنا.
