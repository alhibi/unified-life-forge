# نظام التصميم — عقد التنفيذ

> **مشتق من `DESIGN.md` ولا يخالفه.** هذا الملف هو ما يُقرأ قبل كتابة JSX: قواعد
> موجزة قابلة للفحص. الشرح والقرارات والاستثناءات في `DESIGN.md`؛ الحقائق الهندسية
> في `AGENTS.md`.

## 0. الجملة الحاكمة

**منتج واحد، غرفة واحدة بإضاءة تتغيّر.** تتوحّد المحاذاة والإيقاع والطباعة
والسلوك والحالات والهيكل؛ تتنوّع مادة الثيم (14 عائلة)، وألوان البيانات،
والمعالجة التحريرية والخرائط/الألعاب. لا تُسطَّح الثيمات، ولا تُقوَّس كل الشاشات
في قالب واحد.

### مصادر الحقيقة

| الطبقة | الملف |
|---|---|
| الأدوار اللونية، الأسطح، الطبقات | `src/index.css` (`:root` + `@theme` + `@utility`) |
| توليد قيم كل ثيم/وضع | `src/utils/themeEngine.ts` + `themeArtDirections.ts` |
| العرض/الكثافة/الزوايا/اللمس | `src/lib/interfaceScale.ts` |
| الطباعة | `src/lib/fonts.ts` + `--fs-*` |
| الحركة | `src/lib/motion.ts` + `motionPreferences.ts` |
| الهيكل | `src/components/ui/app-shell.tsx` |
| الترويسة | `src/components/PageHeader.tsx` |
| الحالات | `src/components/ui/state-view.tsx` |
| الاستثناءات | `docs/design-system/visual-exceptions.md` |

## 1. الرموز فقط

- استخدم الأدوار الدلالية: `background`, `surface-0..3`, `card`, `foreground`,
  `muted-foreground`, `muted-foreground-subtle`, `border`, `input`, `ring`,
  `primary(-foreground|-container)`, `secondary`, `secondary-muted`, `tertiary`, `accent`,
  `success`, `warning`, `destructive`, `data-1..6`, `track`, `navigation`,
  `overlay-surface`.
- ممنوع hex/rgb/hsl خام في كروم الواجهة، وممنوع `bg-blue-500` أو ما شابه.
- ممنوع `style={{ color: ... , fontSize: ... }}` لعنصر واجهة؛ القيم الديناميكية
  المحسوبة والرسوم/3D مستثناة بسبب تقني.
- اللون وحده لا يحمل حالة أو معنى.

## 2. الثيمات

- **14 عائلة** + `dynamic`، من سجل `themePresets` (لا تعدّها من تعليق قديم).
- لا تفرّع مكوّناً على `theme === '...'`؛ إن احتجت مادة خاصة فهي في
  `themeArtDirections` لا في الصفحة.
- تفضيلات المستخدم (ثيم/وضع/OLED/نمط اللوحة/رفع السطح/الكثافة/العرض/الزوايا/
  الحدود/الحركة/الخط) تعلو الافتراضيات ولا تُكسر.
- كل ثيم يجب أن يمرّ فحص التباين: نص ≥4.55:1 على اللوحة **و** البطاقة، والحاويات
  و`on-*` ≥4.5:1.

## 3. الطباعة

- الواجهة: **IBM Plex Sans Arabic + Inter Tight**، أوزان 400–700 فقط.
- **ممنوع وزن 300** (غير محمّل للعربية) و**ممنوع tracking سالب على العربية**
  (`tracking-tight`).
- سلم: micro ~12 · mini ~12.6 · meta ~14.2 · body 16 · lead 18 · title ~20 ·
  display ~23 · hero ~25.6 (base 16 × 1.125، حدود 12–34).
- الأدوار: `type-display` (وصول المجال) · `type-title` (صفحة) · `type-section`
  (قسم) · `type-body` · `type-label`/`type-meta` (وصف).
- ممنوع `text-[Npx]`؛ استخدم `rem` أو رمز السلم.
- Amiri/Tajawal مادة تحريرية للشعر/القرآن/الديوان فقط، وليست خط الواجهة.
- الأرقام `tabular-nums` في القياسات.

## 4. RTL والمحتوى المختلط

- خصائص منطقية فقط: `ms/me/ps/pe/start/end/text-start/text-end`.
  ممنوع `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left/right`, `border-l/r`,
  `rounded-tl/tr/bl/br`.
- `left-*`/`right-*` فقط للتوسيط أو لهندسة فيزيائية حقيقية (رقعة، خريطة).
- العربية لغة الواجهة الوحيدة. **لكن** محتوى German Club (`german` +
  `arabic_translation`) والنص اللاتيني والأرقام محتوى أصيل: يُعرض داخل تدفّق
  عربي، ويُغلَّف المقطع بـ`dir="ltr"` عند الحاجة. لا تحذف بيانات ألمانية ولا
  تقلب الشاشة من أجلها. الممنوع هو لغة واجهة ثانية (`Language` بعضو واحد).

## 5. العرض والمسافات والشكل

- عرضان فقط: `--ui-content-max` (432/512/608/مخصص/كامل) للقراءة والنماذج
  والقوائم، و`--ui-workspace-max` (72rem) للوحة/البيانات/الجداول عبر
  `<PageShell width="workspace">`. ممنوع `max-w-screen-*` أو عرض ثالث.
- المسافات 4/8/12/16/24/32/40 فقط، من `--ui-stack-gap(-sm)` و`--ui-pad-card`.
- الكثافة: مضغوط/متوازن/مريح، وأهداف اللمس 44–48.
- الزوايا: `xs 8 · sm 12 · md 16 · lg 24 · xl 32`؛ `2xl`/`3xl` = `xl` عمداً.
  ممنوع `rounded-[Npx]`. `rounded-full` للأفاتار/النقطة/زر الأيقونة/الشريحة
  المختارة فقط — لا لزر نصي ولا لبطاقة.
- الترويسة: `<PageHeader>` (`compact`/`display`، `sticky`)؛ لا تبنِ ترويسة
  `sticky top-0` خاصة ولا blur يدوياً.
- الحشوة السفلية: `.pb-page` فقط؛ لا `pb-24/28/32` (لا يوجد شريط تنقّل سفلي).
- `min-height: 100dvh`، `env(safe-area-inset-*)`، `--kb-inset`، `--ui-safe-extra`.

## 6. العمق والمادة

- الفصل = طن السطح + مسافة + حدّ شعري. الحدّ وظيفي، لا إطار لكل عنصر.
- العمق المسمّى فقط: `elevation-1..4` لسطح يطفو فعلاً (بطاقة/منبثق/حوار).
- ممنوع في الكروم: تدرّج زخرفي، glow/halo، noise، glassmorphism، `backdrop-blur`
  يدوي، ظلال Tailwind الخام (`shadow-sm/md/lg/xl/2xl` أُعيد توجيهها إلى السلم)،
  ظل ملوّن، shimmer زخرفي.
- التدرّج مسموح داخل رسم/خريطة يرمز كمية أو حالة، مع تعليق يوضح الدلالة (X7).

## 7. الحركة

- المدد والمنحنيات من `src/lib/motion.ts` و`--motion-*`؛ لا `cubic-bezier` جديد.
- حرّك `transform`/`opacity` فقط.
- ضغط اللمس عالمي؛ ممنوع `active:scale-*` أو `whileTap`.
- كل حركة تحترم تقليل الحركة (نظام + مفتاح داخلي). لا حركة دخول سينمائية لصفحة
  عادية.

## 8. z-index

السلم في `@theme`: `z-scrim 5 · raised 10 · sticky 20 · header 30 · float 40 ·
drawer 50/51 · sheet 60/61 · picker 70/71 · nested 80/81 · deep 90/91 ·
keyboard 95 · fullscreen 100/110 · player 120 · queue 130 · modal 150 ·
overlay 200 · lightbox 210 · toast 300`.
**ممنوع أي رقم خام** (`z-50`, `z-[81]`): القيمة غير المعرّفة لا تولّد قاعدة.

## 9. قواعد الصفحات (سبع)

1. بوابة/نظرة عامة · 2. تحريري/قراءة · 3. بيانات/قياس · 4. قوائم ومراجع
وإعدادات · 5. محادثة · 6. خرائط/فضاء · 7. ألعاب/سطح كائني.
المرجع: `DESIGN.md` §8 و`docs/design-system/route-coverage.md`. اختر القاعدة من
طبيعة المحتوى، ثم استخدم `PageShell`/`PageHeader`/`AppList`/`AppCard`/
`StateView` كما تلائم — لا تفرض بطاقة على نص طويل ولا نصاً على جدول.

## 10. المكوّنات والممنوعات

- السطح: `<AppCard>` أو `.app-card`؛ لا `bg-card + rounded-* + border` يدوياً.
- الصفوف: `<AppList>` + `<AppRow>`؛ القائمة سطح والصف وحدة.
- الأزرار: `<Button>` / `<IconButton>` (44×44). الحقول: `<Input>`/`<Textarea>`/
  `<Select>`/`<Switch>`/`<Slider>`. التبويبات: `<Tabs>`.
- الطبقات: `Dialog`/`AlertDialog`/`Drawer`/`Sheet`/`ResponsiveDrawer`/`Popover`
  الموجودة؛ `.app-scrim` و`.app-overlay-surface` هما التعتيم والسطح الوحيدان.
- الحالات: `<StateView kind="empty|search|offline|error">` بعنوان ونص محددين
  وإجراء حقيقي — لا «لا توجد بيانات».
- الإشعارات: `sonner` فقط.
- الأيقونات: `@/lib/icons`؛ الأوزان المتاحة `regular/fill/bold` فقط.

## 11. الحالات A/B/C

لكل تدفّق: البداية (ما الظاهر/المحدَّد/التركيز)، أثناء التنفيذ (تعطيل، تحميل
محجوز، optimistic، خطأ يعيد الحالة)، النهاية (نجاح/فراغ/فشل، عودة التركيز،
إجراء تالٍ/إعادة محاولة). الزر ليس مكتملاً لأنه ينقر.

## 12. البوابة

```bash
bun run verify        # typecheck + lint + lint:budget + arch + test + build
bun run e2e
bun run test:smoke
```

- `src/test/designSystem.test.ts` ميزانيات تنزل ولا ترتفع.
- `themeIntegrity` يغطي 14 عائلة × وضعين + التباين.
- أي تعديل UI بلا لقطة على 360 و768 و1440 (فاتح/داكن) غير مُتحقَّق.
