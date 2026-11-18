# كتالوج المكوّنات — نظام تصميم amv.life

> **مرجع اختيار المكوّن، لا مرجع القرار البصري.** السلطة البصرية `DESIGN.md` (§3 الرموز، §8 قواعد الصفحات، §9 المكوّنات، §10 الحالات)؛ العقد التنفيذي `.kiro/steering/design-system.md`. كل ما هنا مقروء من شيفرة الفرع `design-refoundation` بتاريخ 2026-11-18.
> القاعدة: إن لم تجد شكلاً هنا، وسّع مكوّناً قائماً أو أضف رمزاً دلالياً مع اختبار — لا تبنِ نسخة محلية.

## 0. نطاق وتحفّظات

- المصادر: `src/components/ui/*`، `src/components/PageHeader.tsx`، `src/components/BackButton.tsx`، `src/index.css` (`.app-*`، `.page-shell`، `@utility type-*`)، `src/test/designSystem.test.ts`.
- كل خاصية مذكورة أدناه موجودة في الشيفرة. ما لم يُقرأ سلوكه فعلياً (بصرياً أو باختبار) موسوم **غير مُتحقَّق**.
- عمود «الحالات» يصف ما ينفّذه المكوّن فعلاً، لا ما ينبغي أن ينفّذه. حيث لا توجد حالة تحميل أو خطأ مدمجة، مكتوب ذلك صراحةً.

## 1. كيف تختار المكوّن

| الحاجة | المكوّن | لا تستخدمه لـ |
|---|---|---|
| إطار صفحة كامل | `PageShell` | خريطة/محادثة/سطح لعبة يملك إطاره |
| ترويسة صفحة | `PageHeader` | ترويسة داخل بطاقة |
| سطح بطاقة | `AppCard` | قائمة متسلسلة |
| قائمة إعدادات/مراجع | `AppList` + `AppRow` | بطاقة لكل صف |
| أيقونة بادئة في صف/ترويسة | `IconChip` | زخرفة أو صورة محتوى |
| ملخّص أرقام | `StatGrid` + `Stat` | رقم داخل جملة |
| قسم بتسمية | `Section` | فاصل بصري فقط |
| فراغ/بحث/انقطاع/خطأ | `StateView` | «لا توجد بيانات» أو رسالة نجاح |
| فعل أساسي/ثانوي | `Button` | أيقونة فقط |
| فعل أيقوني | `IconButton` | فعل نصي |
| حقل نص قصير | `Input` | عرض قيمة للقراءة |
| نص طويل | `Textarea` | محرّر غني |
| اختيار من قائمة | `Select` | قائمة إجراءات |
| مفتاح ثنائي | `Switch` | اختيار من متعدد |
| قيمة متصلة | `Slider` | إدخال رقم دقيق |
| تبويب داخل الصفحة | `Tabs` | تنقّل بين مسارات (Router) |
| طبقة مركزية | `Dialog` | محتوى صفحة كامل |
| تأكيد فعل خطير | `AlertDialog` | نموذج طويل |
| لوح سفلي | `Drawer` | قائمة منبثقة صغيرة |
| لوح جانبي | `Sheet` | محتوى مركز |
| لوح يعمل على المقاسين | `ResponsiveDrawer` | بديل كامل عن الصفحة |
| قائمة إجراءات | `DropdownMenu` | نموذج |
| إجراء بالزر الأيمن | `ContextMenu` | إجراء أساسي |
| شرح أيقونة | `Tooltip` | نص أساسي |
| كشف تفاصيل | `Collapsible` | مجموعة أكورديون (غير موجودة) |
| صورة مستخدم | `Avatar` | شعار أو صورة محتوى |
| اختيار تاريخ | `Calendar` | إدخال تاريخ نصي بسيط |
| معرض أفقي | `Carousel` | شبكة محتوى ثابتة |
| تحميل محجوز | `Skeleton` | دوّارة في وسط الصفحة |
| رقم متغيّر | `AnimatedNumber` / `NumericText` | سعر يتغيّر كل ثانية |
| لحظة احتفال | `SignatureMoment` | أي تفاعل عادي |
| إشعار عابر | `toast` (sonner) | `Toaster` ثانٍ |

## 2. الجدول الرئيسي

| الاسم | الدور | الخصائص/المتغيرات | الحالات | قاعدة الاستخدام | ما لا يفعله |
|---|---|---|---|---|---|
| `PageShell` | إطار الصفحة | `width` content/workspace · `flush` · `centered` · `header` · `className` | لا حالات تفاعلية | كل مسار ملء الشاشة، مرة واحدة | لا يصلح لخريطة/محادثة؛ `width` بلا أثر بلا header مع `centered={false}` |
| `PageHeader` | ترويسة واحدة | `title` · `subtitle` · `eyebrow` · `icon` · `right` · `hideBack` · `backTo` · `backFallback` · `sticky` · `variant` · `children` | ثابت؛ sticky عند الطلب | أعلى الصفحة داخل `PageShell` | لا يبنى داخل بطاقة؛ لا يضيف gutter داخل shell |
| `BackButton` | رجوع ذكي | `to` · `onClick` · `fallback` · `ariaLabel` · `className` | hover · focus · pressed | ترويسة أو سطح يحتاج رجوعاً | لا يقرّر الوجهة بدل الراوتر |
| `AppCard` | سطح بطاقة | `tone` 1–6 · `compact` · `flat` · `pressable` · `as` | hover/press عند `pressable` | أي بطاقة مرئية | لا يحمل loading/selected/disabled |
| `AppList` | سطح قائمة | `compact` | — | مجموعة صفوف متجانسة | لا يرتّب صفوفاً بنفسه |
| `AppRow` | صف قائمة | `leading` · `title` · `subtitle` · `value` · `chevron` · `tone` · `as` · `disabled` | hover · pressed · danger | إعداد/مرجع/رابط | لا يملك loading أو skeleton |
| `IconChip` | لوح أيقونة | `size` sm/md/xl · `tone` accent/plain/danger/success | — | بادئة صف/ترويسة/فراغ | ليس بديلاً عن صورة محتوى |
| `StatGrid` | شبكة قياس | `cols` 2/3/4 | — | 2–4 مقاييس | لا يرسم اتجاهاً أو رسماً |
| `Stat` | قياس واحد | `value` · `label` | — | رقم + تسمية | لا أيقونة/اتجاه/نسبة تغيّر |
| `Section` | قسم مكدّس | `label` · `tight` | — | تجميع بطاقات/صفوف | لا يضيف ترويسة صفحة |
| `StateView` | الحالة الفارغة/الخطأ | `kind` · `title` · `body` · `action` · `secondary` · `actions` · `icon` · `children` · `compact` · `bare` | empty/search/offline/error؛ `action.pending` · `action.icon` اختياري (افتراضياً لـerror/offline فقط) | أي شاشة بلا محتوى | لا حالة نجاح؛ لا نص افتراضي |
| `Button` | فعل | `variant` 7 · `size` 6 · `isLoading` · `loadingText` · `activation` · `asChild` | hover · focus · pressed · disabled · loading | فعل نصي أو أيقونة ضمن نظام الزر | لا success/error/selected مدمجة |
| `IconButton` | فعل أيقوني | خصائص `button` فقط | hover · focus · pressed · disabled | ترويسة/شريط أدوات | لا variants ولا loading |
| `Input` | حقل سطر | خصائص `input` | hover · focus · disabled | نص/بحث/تاريخ | لا label ولا خطأ بصري مدمج |
| `Textarea` | حقل متعدد | خصائص `textarea` | hover · focus · disabled | نص طويل | لا عدّاد أحرف تلقائي |
| `Select` | اختيار | عائلة Radix: Root/Trigger/Content/Item/Label/Separator/Group/Value | open/closed · focus · disabled · placeholder | 5+ خيارات أو خيارات طويلة | لا بحث ولا اختيار متعدد |
| `Switch` | ثنائي | خصائص Radix Root | checked/unchecked · focus · disabled | إعداد نعم/لا | لا label ولا loading |
| `Slider` | قيمة متصلة | خصائص Radix Root | focus · disabled · dragging | شدة/مستوى | لا فقاعة قيمة ولا علامات |
| `Tabs` | تبويب داخلي | `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`؛ `dir` افتراضي rtl | active · focus · disabled | 2–5 خيارات داخل صفحة | لا تنقّل مسارات |
| `Dialog` | طبقة مركزية | `onClose` · `autoFocus` + عائلة Radix | open/closed · scrim · focus trap | تأكيد/نموذج/تفاصيل | لا صفحة كاملة؛ يعيد التركيز إلى المشغّل عند الإغلاق (مغطّى باختبار) |
| `AlertDialog` | تأكيد خطير | عائلة Radix؛ Action/Cancel | open/closed | حذف/تخلي عن تغيير | لا إغلاق X؛ لا variant تدميري مدمج |
| `Drawer` | لوح سفلي | `onClose` · `autoFocus` · `shouldScaleBackground` | open/closed · drag · scrim | فعل على الهاتف | لا snap points ملفوفة |
| `Sheet` | لوح جانبي | `side` top/bottom/left/right (افتراضي right) | open/closed · scrim | لوح/تفاصيل | `side` فيزيائي لا منطقي |
| `ResponsiveDrawer` | لوح متجاوب | `open` · `onOpenChange` · `trigger` · `title` · `description` · `children` | Drawer <768px / Dialog ≥768px؛ Dialog 448px بحد 85dvh مع تمرير | نموذج قصير | لا footer مخصّص |
| `Popover` | منبثق | `align` · `sideOffset` | open/closed · focus | معلومة/أدوات صغيرة | ليس قائمة إجراءات |
| `Tooltip` | شرح | `sideOffset` + Provider | open/closed | تسمية أيقونة | ليس نصاً أساسياً |
| `DropdownMenu` | قائمة إجراءات | عائلة كاملة (checkbox/radio/sub/label/separator/shortcut) | open/closed · focus · disabled | إجراءات على عنصر | لا نموذج |
| `ContextMenu` | إجراء سياقي | عائلة كاملة | open/closed · focus · disabled | زر أيمن/ضغط مطوّل | لا إجراء أساسي |
| `Collapsible` | كشف واحد | Root/Trigger/Content | open/closed | تفاصيل إضافية | لا مجموعة أكورديون |
| `Avatar` | صورة مستخدم | `AvatarImage` · `AvatarFallback` | loaded/fallback | هوية شخص | لا حجم مدمج (ثابت 40) |
| `Calendar` | اختيار تاريخ | خصائص `DayPicker` | selected · today · outside · disabled | منتقي تاريخ | RTL على مستوى الغلاف: زوايا منطقية ومسافات gap وأسهم معكوسة |
| `Carousel` | معرض | `opts` · `plugins` · `orientation` · `setApi` | prev/next · focus | شرائح أفقية | أسهمه مواضعها منطقية (-start/-end)؛ إزاحة Embla فيزيائية بطبيعتها وموثّقة |
| `Skeleton` | تحميل محجوز | `variant` · `height` · `width` · `ratio` + المركّبات | pulse (opacity فقط) | حجز مكان المحتوى | لا يُعلن التحميل لكل سطر |
| `AnimatedNumber` | رقم متحرك | `value` · `decimals` · `group` · `prefix` · `suffix` · `duration` | reduced-motion (نظام) | رقم يتغيّر بمعنى | ليس لكل رقم حيّ |
| `NumericText` | رقم ثابت الاتساع | خصائص `span` | — | أسعار/ساعات | لا يحرّك |
| `SignatureMoment` | لحظة موقّعة | `useSignatureMoment` · `SignatureBloom` · `SignatureAnnouncement` | fire/idle + live region | لحظتان فقط: complete/reveal | ليس احتفالاً عاماً |
| `Toaster` / `toast` | إشعار | `theme` من next-themes؛ API sonner | success/error/info/loading | إشعار عابر | لا نظام toast ثانٍ |
| `Label` | تسمية حقل | `htmlFor` + خصائص | — | كل حقل | ليس بديلاً عن `aria-label` لأيقونة |

## 3. تفصيل العائلات

### 3.1 `PageShell`

```tsx
<PageShell header={<PageHeader title="…" />}>…</PageShell>
```

- `width` (افتراضي `content`) يختار أحد العرضين المنشورين: `content` = `--ui-content-max`، و`workspace` = `--ui-workspace-max` عبر `.page-shell-workspace .page-shell-inner`. لا تكتب عرضاً محلياً بدله.
- `centered` (افتراضي `true`) يلفّ المحتوى في `.page-shell-inner`؛ `centered={false}` يلغي العمود — لكن **وجود `header` يتجاوز `centered`** ويرسم العمود دائماً. لذلك `width` بلا أثر فقط في حالة «بلا header + `centered={false}`». البوابة الحالية تستخدم هذا النمط مع عرض يدوي.
- `flush` يضيف `page-shell-flush` (بلا `padding-top`) لصفحة تملك ترويسة لاصقة.
- `header` يُرسم **داخل** العمود، ويُلغي الحشوة العلوية، ويحوّل الحاوية إلى `overflow-x-clip` كي لا يُعطّل `sticky`، ويغلّف الأطفال في `app-stack pt-4`.
- الخلفية والحشوة السفلية (`pb-page`) وآمن المنطقة من `.page-shell` في CSS، لا من الصفحة.

### 3.2 `PageHeader` و`BackButton`

- `compact` (افتراضي): صف واحد بارتفاع `--ui-header-h`، زر رجوع، أيقونة اختيارية، `text-title`، `subtitle` بـ`text-micro`، و`right` في الطرف. عند غياب `right` يُضاف فراغ 44px لموازنة العنوان.
- `display`: شريط علوي (رجوع/eyebrow/right) ثم `type-display` كبير مع `subtitle` و`children` (شرائح/وصف). `eyebrow` و`children` في هذا النمط فقط.
- `sticky` يضيف `z-header app-sticky-header`: سطح معتم + خط شعري، بلا blur أو شفافية محلية.
- الرجوع: `hideBack` يخفيه؛ `backTo` وجهة صلبة؛ `backFallback` يُمرَّر إلى `BackButton` عند غياب تاريخ داخل التطبيق، وإن لم يُمرَّر يهبط إلى `parentPath` (تعليق `PageHeader` يقول `/` لكن الشيفرة لا تفرضه). `BackButton` يجرّب `onClick` ثم `to` ثم الرجوع ثم البديل. الأيقونة `ChevronLeft` معكوسة بـ`rtl:rotate-180`، والاسم «رجوع».
- لا تنسخ الترويسة يدوياً؛ `--header-pad` يساوي 0 داخل `PageShell` كي تحاذي البطاقات.

### 3.3 `AppCard`

- `tone={1..6}` يضيف `rich-widget` و`data-tile-tone` فيتبدّل سطح/حبر البطاقة إلى زوج `--data-N` المقروء، مع بقاء لغة الأزرار والحقول العامة.
- `compact` يقلّص الحشوة إلى `--ui-pad-card-compact`؛ `flat` يجعل السطح `secondary` بلا ظل (بطاقة داخل بطاقة)؛ `pressable` يضيف فيزياء الضغط فقط — استخدمه عندما تكون البطاقة قابلة للنقر، مع `as="button"` كي يحمل الدلالة.
- الشكل الافتراضي: `r-lg × art-corner`، `shadow-2`، بلا حد. الحالات: hover/pressed عبر `interactive-*` عند `pressable`؛ لا disabled/loading/selected.
- `as` يغيّر الوسم فقط، وخصائص النوع تبقى خصائص `div`؛ لا تمرّر `href` إلى `as="a"` بلا تحويل نوع.

### 3.4 `AppList` / `AppRow` / `IconChip`

- القائمة هي السطح (`card` + ظل + قصّ)، والصف هو الوحدة. `compact` يخفض ارتفاع الصف إلى 48px. الفاصل بين الصفوف خط `track` واحد.
- `AppRow`: `leading` (عادة `IconChip`)، `title`، `subtitle`، `value` (مكتوم، `tabular-nums`)، `chevron`، `tone="danger"`، `as` button/a/div، `disabled`.
- الصف `<button type="button">` افتراضاً؛ `as="div"` يصبح تفاعلياً فقط عند تمرير `onClick`. `disabled` يخص زراً فقط. لا loading/selection مدمجة: للاختيار استخدم `value` + أيقونة تحقّق، وللتحميل `SkeletonList`.
- `IconChip`: `size` sm/md/xl و`tone` accent/plain/danger/success. داخل `AppList` تتلوّن الشرائح تلقائياً بدورة `data-1..6`؛ لا تمرّر لوناً. **`sm` حالياً = 40px** (قاعدة `.row-icon`) رغم أن تعليق الشيفرة يقول 32 — تعارض قائم.

### 3.5 `StatGrid` / `Stat` / `Section`

- `StatGrid` يضبط `--stat-cols` من `cols` (2/3/4)؛ `Stat` يأخذ `value` و`label` فقط، والقيمة `tabular-nums` بحجم `--fs-display`. لا أيقونة ولا اتجاه ولا نسبة تغيّر — هذه ليست بطاقة KPI.
- `Section` يرسم `label` بـ`.app-section-label` (على سلم العنوان، 600) ثم `app-stack` (24) أو `app-stack-sm` (12) عند `tight`. لا يكرّر ترويسة الصفحة ولا يضيف حداً.

### 3.6 `StateView`

- أربعة أنواع فقط: `empty` (لا شيء بعد، ادعُ للفعل الأول)، `search` (استعلام بلا نتيجة، اقترح تضييقاً/توسيعاً)، `offline` (الشبكة معروفة الغياب، لا تلُم المستخدم)، `error` (فشل فعلي + إعادة محاولة).
- `title` و`body` **إلزاميان** بلا نص افتراضي؛ `body` جملتان كحد أقصى. `action` كائن `{label,onClick,pending?}`، و`secondary` رابط/نص أهدأ، و`actions` يستبدل صف الإجراء كاملاً، و`icon`/children للتفاصيل، و`compact` و`bare` للحجم/إسقاط اللوح.
- اللوح: `rounded-2xl` + حد متقطّع + `bg-secondary`، بارتفاع محجوز 15rem (9rem مضغوط) كي لا يقفز التبديل.
- `error` يحمل `role="alert"` وغيره `role="status"`. **أيقونة الإجراء مثبّتة على `RefreshCcw`** حتى لإجراء «أنشئ»، و`pending` يعطّل الزر ويدير الأيقونة؛ الزر داخلياً `button` خام لا `Button` (بلا variants/حجم).

### 3.7 `Button` و`IconButton`

- المتغيرات: `default` · `secondary` · `outline` · `tonal` · `ghost` · `link` · `destructive`. الأحجام: `default` (48) · `xs` (28) · `sm` (38) · `lg` (46) · `icon` (48 دائري) · `icon-sm` (48 دائري بأيقونة أصغر). **`lg` الحالي أقصر من `default`**؛ لا تعتمد عليه للتكبير.
- `isLoading` يستبدل المحتوى كله بدوّارة + «جاري التحميل...» أو `loadingText`، ويعطّل الزر ويضيف `aria-busy`. لا يوجد success/error/selected مدمج؛ استخدم `toast` أو حالة محيطة.
- `activation="press"` (الافتراضي) يشغّل `onClick` عند `pointerdown` لغير `submit/reset` ثم يمنع النقرة التالية. لأي ضغط مطوّل/سحب استخدم `activation="click"`.
- `IconButton` = `.app-icon-btn`: 44×44، دائري، `secondary` + ظل تحكم، hover `accent`، focus عام، pressed بظل مضغوط. لا variants ولا `isLoading`؛ للأيقونة داخل زر نصي استخدم `Button size="icon"`.

### 3.8 الحقول

- `Input` و`Textarea` و`SelectTrigger` تشترك في `.app-control`: حشوة من `--ui-pad-card`، نصف قطر `r-md`، خلفية `secondary`، حد شعري داخلي، ارتفاع أدنى `--ui-control-h` (48، و44 عند ≤767px)، وخلفية `background` عند التركيز مع حلقة `ring`.
- **لا حالة خطأ بصرية**: الشيفرة لا تعالج `aria-invalid`/error. أضف `aria-invalid` + نص خطأ + أيقونة، ولا تعتمد على اللون وحده.
- `Textarea` متعدد الأسطر (`app-control-multiline`) بارتفاع أدنى 1.82× وقابل للتحجيم رأسياً. `Label` منفصل؛ اربطه بـ`htmlFor`.
- `Select` عائلة Radix كاملة، محتواها `glass-overlay z-drawer`، عناصرها `text-meta`. لا بحث ولا اختيار متعدد.
- `Switch` مفتاح ثنائي بمنطقة لمس 44 عبر `:after`، `checked` = `primary`، لا label/loading/error. `Slider` صف 44 وthumb 20 بمنطقة لمس 44؛ لا فقاعة قيمة ولا علامات.
- الحالات المشتركة: hover (للحقول)، focus، disabled. لا يوجد `isLoading` لأي حقل؛ استخدم `SkeletonField` أثناء التحميل و`disabled` أثناء الإرسال.

### 3.9 `Tabs`

- `Tabs` يمرّر `dir="rtl"` افتراضاً؛ `TabsList` كبسولة `secondary` بعرض كامل وحد داخلي؛ `TabsTrigger` نشط بـ`primary-container`؛ `TabsContent` بفاصل `mt-4`.
- لا `variant`/حجم/اتجاه. للفلترة أو التبديل داخل الصفحة فقط؛ لا تستخدمه لتنقّل المسارات، ولا تضع أكثر من 5 خيارات.

### 3.10 الطبقات

- `Dialog`: `DialogContent` بعرض `--ui-content-max`، `p-6`، سطح `app-overlay-surface` (`surface-3` + حد قوي + `shadow-4`)، تعتيم `.app-scrim`، زر إغلاق X في `end`. يركّز أول عنصر قابل للتركيز (`autoFocus`)، ويغلق بـEscape عبر `onClose`، ويترك `onCloseAutoFocus` الافتراضي يعيد التركيز إلى المشغّل (مغطّى باختبار انحدار).
- `AlertDialog`: بلا زر X؛ `AlertDialogAction` يستخدم `buttonVariants()` (primary) و`Cancel` يستخدم `outline`. لا variant تدميري مدمج؛ مرّر `className` بأدوار `destructive` (‏`cn` يدمج).
- `Drawer`: vaul، يلتصق بالأسفل، `rounded-t-xl`، مقبض سحب بارتفاع 44 يعمل زر إغلاق، `onClose`، و`shouldScaleBackground=false` افتراضاً.
- `Sheet`: `side` = top/bottom/left/right، افتراضي `right`. المواضع **فيزيائية**؛ في RTL الحافة اليمنى هي البداية، لذا الافتراضي يقرأ كـ«بداية».
- `ResponsiveDrawer`: `useIsMobile` عند 768px؛ Drawer سفلي على الهاتف وDialog على الواسع، بعنوان/وصف/محتوى فقط. نسخة الحاسوب تستخدم sm:max-w-md (448px) وبحد أقصى 85dvh مع تمرير، فلا تُقصّ في الشاشات القصيرة.
- `Popover`: `w-72` و`p-4` وسطح `glass-overlay z-drawer`؛ بلا سهم. `Tooltip` يحتاج `TooltipProvider` (مثبّت في `App`)؛ لا تأخير مخصّص.
- كل الطبقات تستخدم `z-drawer` حالياً (لا `picker/sheet/modal` من السلّم) — **غير مُتحقَّق** أنه مقصود، لكنه الواقع.

### 3.11 القوائم والكشف

- `DropdownMenu`/`ContextMenu`: عناصر `text-meta`، `focus:bg-accent`، checkbox/radio بمؤشر، `Sub` بسهم، `Shortcut`، `Separator`. سطح `glass-overlay z-drawer`.
- فرق قائم: فاصل `DropdownMenu` يستخدم `bg-muted` وفاصل `ContextMenu` يستخدم `bg-border` — لا تعتمد على تطابقهما.
- `Collapsible`: كشف واحد بحركة `animate-collapse-*`؛ لا يوجد `accordion.tsx` في المستودع رغم ذكر التعليق له.

### 3.12 `Skeleton`

- `variant`: `block` · `text` · `circle` · `pill`؛ `height`/`width` (رقم = px) و`ratio` لحجز الصندوق. يتحرّك بالعتامة فقط (`animate-pulse`)، ويُخفى عن قارئ الشاشة.
- المركّبات: `SkeletonGroup` (`role=status` + `aria-busy` مرة واحدة)، `SkeletonText`، `SkeletonRow`، `SkeletonList`، `SkeletonCard`، `SkeletonField`، `SkeletonForm`، `SkeletonPage`، `SkeletonMedia`.
- القاعدة: احجز صندوق المحتوى النهائي؛ لا تضع `role=status` على كل شريط، ولا تستبدل `StateView` بـskeleton دائم.

### 3.13 `Avatar` / `Calendar` / `Carousel`

- `Avatar` ثابت 40×40 دائري، `AvatarFallback` بخلفية `muted`؛ لا خاصية حجم — مرّر `className` (وهذا خروج عن العقد لا يُنصح به). لا حلقة/حالة اتصال.
- `Calendar` غلاف `react-day-picker@8` بـ`buttonVariants`؛ يستخدم `space-x-4` و`rounded-l-md/r-md` الفيزيائية — **مخالفة RTL قائمة**، وRTL الكامل **غير مُتحقَّق**.
- `Carousel` (Embla): أزرار سابقة/تالية `h-8 w-8` (32px) ومواضع `-left-12/-right-12` الفيزيائية؛ أقل من هدف اللمس 44 — لا تستخدمه كتنقّل أساسي على الهاتف.

### 3.14 `AnimatedNumber` / `SignatureMoment` / `Toaster`

- `AnimatedNumber`: `tabular-nums`، `dir="ltr"`، يكتب `textContent` بلا re-render، ويحترم `useReducedMotion` (تفضيل النظام). **مفتاح الحركة الداخلي غير مُتحقَّق** لهذا المكوّن. `NumericText` للقيم الحيّة التي يجب ألا تتحرك.
- `SignatureMoment`: `kind` = `complete` أو `reveal` فقط؛ `fire()` يشغّل اهتزازاً/صوتاً/حلقة 620ms، ويُرجع `active` و`announcement` لـ`SignatureBloom`/`SignatureAnnouncement`. الحلقة زخرفية بالكامل، وتُحذف مع تقليل الحركة.
- `Toaster` (sonner) مثبّت مرة واحدة في `App`؛ استورد `toast` من `@/components/ui/sonner`. لا RTL مخصّص ولا `dir` ممرّر — سلوك RTL **غير مُتحقَّق**.

## 4. قواعد التركيب (G1–G7)

**G1 بوابة/نظرة عامة** — إطار واسع + ترويسة هوية + منطقة اليوم + أقسام. لا بطاقة موحّدة لكل مجال؛ الشبكة تتنفّس على الواسع.

```tsx
<PageShell width="workspace" flush className="pb-page">
  <PortalHeader />
  <section className="pb-page">
    <StatGrid cols={3}>…</StatGrid>
    <Section label="…"><div className="grid gap-4 md:grid-cols-2">…</div></Section>
  </section>
</PageShell>
```

**G2 تحريري/قراءة** — `PageHeader display` + عمود قراءة واحد + أدوات هادئة + تنقّل فصول. لا شبكة بطاقات على النص.

```tsx
<PageShell header={<PageHeader variant="display" sticky title="…" eyebrow="…" />}>
  <article className="type-body">…</article>
  <Section label="أدوات"><AppList compact>…</AppList></Section>
</PageShell>
```

**G3 بيانات/قياس** — ترويسة مضغوطة + قياسات + مخطط/جدول بعرض مساحة العمل + فلاتر. `StatGrid` أعلى، `AppCard` للمخطط، والجدول يتحول قائمة قبل أن يُقصّ.

```tsx
<PageShell width="workspace" header={<PageHeader title="…" sticky right={<IconButton …/>} />}>
  <div className="app-stack">
    <StatGrid cols={4}>…</StatGrid>
    <AppCard>…chart/table…</AppCard>
  </div>
</PageShell>
```

**G4 قوائم/مراجع/إعدادات** — ترويسة مضغوطة + بحث + `Section` + `AppList`/`AppRow` أو شبكة مرجعية. الحفظ المعلّق يخص الصف، لا الصفحة.

```tsx
<PageShell header={<PageHeader title="…" />}>
  <Input type="search" … />
  <Section label="…"><AppList><AppRow leading={<IconChip>…</IconChip>} … /></AppList></Section>
</PageShell>
```

**G5 محادثة** — رأس + تسلسل + حقل ثابت؛ إطار `100dvh` عمودي لا `PageShell`، `min-h-0` للسكرول، و`--kb-inset`/`env(safe-area-inset-bottom)` للحقل.

```tsx
<div className="flex h-[100dvh] min-h-0 flex-col">
  <PageHeader title="…" sticky />
  <div className="min-h-0 flex-1 overflow-y-auto">…رسائل / StateView / SkeletonList…</div>
  <div className="shrink-0 border-t border-border pb-[env(safe-area-inset-bottom)]">…composer…</div>
</div>
```

**G6 خرائط/فضاء** — خريطة تملأ الإطار + أدوات عائمة `z-float` + لوح مكان `Sheet`. لا تغلّف الخريطة في بطاقة.

```tsx
<div className="relative h-[100dvh] overflow-hidden">
  <PageHeader title="…" />
  <div className="absolute inset-0">…map…</div>
  <div className="absolute inset-x-3 bottom-3 z-float flex gap-2">…</div>
  <Sheet>…مكان…</Sheet>
</div>
```

**G7 ألعاب/سطح كائني** — `GameShell` (`min-h-dvh` + `pb-page` + `PageHeader`) + لوحة اللعب + تحكم محيط + سجل/إعداد في لوح. اللوحة تسبق الزخرفة.

```tsx
<GameShell title="…" icon={…} rules={[…]} stats={[…]} options={[…]}>
  <div className="relative mx-auto aspect-square w-full max-w-[…]">…board…</div>
  <StatGrid cols={3}>…</StatGrid>
  <Dialog>…ترقية/تقرير…</Dialog>
</GameShell>
```

## 5. الحالات A / B / C

### 1) إرسال رسالة — G5

- **A:** الحقل في التركيز، زر الإرسال معطّل حتى يوجد نص غير فارغ، شريط الرد/التعديل ظاهر إن وُجد، وآخر الرسائل مقروءة. لا رسائل → `StateView bare kind="empty"` بنص يخص المحادثة.
- **B:** زر الإرسال `isLoading`/معطّل والحقل غير قابل للتحرير، والرسالة تظهر optimistic بعلامة «قيد الإرسال». فشل → الرسالة تبقى بعلامة فشل وإجراء إعادة محاولة، لا تختفي.
- **C:** الرسالة مؤكدة بالوقت، التركيز يعود للحقل، والفشل المتكرر يُعلن بـ`toast.error` مع إعادة المحاولة؛ انقطاع الشبكة يظهر كـ`offline` لا كخطأ بيانات.
- **المكوّنات:** `Textarea` + `Button` (إرسال) + `Avatar` + `StateView` + `SkeletonList` + `toast`.
- **الواقع:** `GroupComposer` الحالي يستخدم `textarea` خاماً وزر إرسال دائري يدوياً ولا يعرض دوّارة إرسال — **مخالفة قائمة**، و`isSending` يعطّل فقط.

### 2) حفظ إعداد — G4

- **A:** `AppList` من `AppRow`، والمفتاح/`Select` يعرض القيمة الحالية، مع تسمية ووصف. الحفظ الفوري (محلي) لا يحتاج زر حفظ؛ الشبكي يحتاج زراً واحداً واضحاً.
- **B:** التبديل optimistic فوراً، ويُعطّل الصف/`Switch` أثناء الطلب، ولا `toast` لكل نقرة. فشل → إرجاع القيمة السابقة، لا إبقاء الواجهة على قيمة لم تُحفظ.
- **C:** النجاح يثبّت القيمة (و`toast.success` فقط إن لم يكن الأثر ظاهراً)؛ الفشل `toast.error` مع سبب وإجراء إعادة محاولة، والتركيز يعود إلى عنصر التحكم.
- **المكوّنات:** `Section` + `AppList`/`AppRow` + `Switch`/`Select`/`Slider` + `toast`.
- **الواقع:** إعدادات كثيرة محلية (Zustand/persist) فلا حالة B لها؛ الشبكية تحتاج B صريحة.

### 3) بحث في القاموس — G4

- **A:** `Input` بحث في التركيز + `Tabs` (الكل/المحفوظات) + عدد النتائج + الشبكة/القائمة. الاستعلام الفارغ يعرض الكل، وليس `search`.
- **B:** تأخير (debounce) مع `SkeletonList` أو `aria-busy` على منطقة النتائج، وإبقاء النتائج السابقة مرئية حتى تصل الجديدة (لا وميض فراغ).
- **C:** نتائج؛ صفر → `StateView kind="search"` يعيد الاستعلام ويقترح تضييقاً/توسيعاً؛ فشل → `kind="error"` مع `action` إعادة المحاولة؛ انقطاع → `kind="offline"`. مسح الاستعلام يعيد الكل.
- **المكوّنات:** `Input` + `Tabs` + `AppList`/`AppRow` أو شبكة + `StateView` + `SkeletonList`.
- **الواقع:** `GermanDictionary` يستخدم `StateView kind="search"` فعلاً؛ البحث/الفرز في الصفحة نفسها.

### 4) إنشاء قيد أرشيف — G4/G2

- **A:** `PageShell` + `PageHeader` + نموذج (`Textarea` للموضوع، `AppList`/`AppRow` للعمق) وزر أساسي معطّل حتى تصحّ المدخلات. الخطأ يظهر بجانب الحقل لا كـ`toast` وحده.
- **B:** الزر `isLoading` مع `loadingText`، وكل الحقول معطّلة، وزر إلغاء متاح. العملية الطويلة تعرض تقدماً حقيقياً (لا دوّارة لا نهائية) وتحجز مكانها.
- **C:** النجاح → انتقال إلى `/archive/:id` + `toast.success`؛ الفشل → الحالة السابقة محفوظة، رسالة محددة، وإجراء «أعد المحاولة». لا تفقد النص المُدخل.
- **المكوّنات:** `PageShell` + `PageHeader` + `AppCard` + `Textarea` + `AppList`/`AppRow` + `Button isLoading` + `toast`.
- **الواقع:** `ArchiveNew` يستخدم `PageShell`/`AppCard`/`AppRow`، لكن زر البدء `rounded-full` يدوي و`style={{fontSize:16}}` و`select` خام — **مخالفات قائمة**.

### 5) بدء لعبة شطرنج — G7

- **A:** `GameShell` مع رقعة خاملة، اختيار النمط/الصعوبة عبر `Tabs` أو `AppList`، وزر «ابدأ» أساسي. التركيز على البدء لا على الرقعة.
- **B:** الرقعة وقائمة الخيارات معطّلة مع `aria-busy` أثناء تهيئة المحرّك، و`Skeleton`/`Suspense fallback` لمشهد 3D الكسول. لا شريط تقدم وهمي.
- **C:** الرقعة تبدأ، مؤشر الدور ظاهر، والتركيز ينتقل إلى الرقعة. فشل تحميل المشهد/المحرّك → `StateView kind="error"` مع إعادة محاولة. النهاية → `Dialog` تقرير المباراة + `toast`.
- **المكوّنات:** `GameShell` + `PageHeader` + `Button` + `Tabs` + `StateView` + `Dialog` + `toast`.
- **الواقع:** `Chess` يستخدم `GameShell` و`MatchReportDialog`؛ تبويبات `GameShell` أزرار `Button` لا `Tabs` — **غير مُتحقَّق** إن كان ذلك مقصوداً.

### 6) إضافة رحلة — G6

- **A:** `PageHeader` + زر أساسي يفتح `ResponsiveDrawer` (Drawer على الهاتف/Dialog على الواسع) فيه `Input` عنوان و`Input type="date"` للبداية/النهاية، و`DialogFooter` بإلغاء/تأكيد.
- **B:** التأكيد `isLoading` ومعطّل، والنموذج يبقى مفتوحاً، والقيم محفوظة؛ لا إدخال optimistic للقائمة قبل معرفة المعرّف.
- **C:** النجاح → إغلاق اللوح، تصفير الحقول، انتقال إلى تفاصيل الرحلة. الفشل → `toast.error` بوصف واضح، اللوح مفتوح، والقيم سليمة، وإعادة المحاولة بالضغط مرة أخرى.
- **المكوّنات:** `PageShell`/`PageHeader` + `ResponsiveDrawer` أو `Dialog` + `Input` + `Label` + `Button` + `StateView kind="empty"` + `toast`.
- **الواقع:** `TripsPage` يستخدم `Dialog` و`Input` و`toast`، لكنه يبني `page-shell` يدوياً و`.skeleton`/`.empty-state` القديمين، ويستخدم `disabled={isPending}` بلا دوّارة — **مخالفات قائمة**.

## 6. الأخطاء الشائعة

| الخطأ | الصحيح | لماذا |
|---|---|---|
| `bg-card rounded-2xl border border-border` | `<AppCard>` أو `.app-card` | سطح واحد، ظل/حد/حشوة من العقد |
| بطاقة لكل صف في قائمة | `AppList` + `AppRow` | القائمة سطح والصف وحدة |
| `pb-24` / `pb-28` / `pb-32` | `.pb-page` | لا شريط تنقّل سفلي؛ الحشوة محسوبة مرة |
| زر نصي `rounded-full` | `rounded-button` (`--r-md`) | الكبسولة للشريحة/المضغوط فقط |
| `z-50` / `z-[9990]` | `z-header` / `z-drawer` / `z-float`… | الرقم الخام لا يشرح الترتيب |
| `#hex` أو `rgb()` في الكروم | `bg-surface-2` / `text-primary` | الأدوار فقط |
| `text-[13px]` أو `style={{fontSize}}` | `text-mini` / `type-*` | px لا يتبع تفضيل حجم النص |
| `sticky top-0 backdrop-blur` | `PageHeader sticky` أو `.app-sticky-header` | سطح/خط واحد لكل الترويسات |
| `ml-4 mr-4 pl-2 pr-2 text-left` | `ms-4 me-4 ps-2 pe-2 text-start` | منطقي فقط في RTL |
| `tracking-tight` على العربية | بلا tracking | يقطع اتصال الحروف |
| `font-black` / `font-extrabold` | `font-bold` | 800/900 غير محمّلين للعربية |
| `min-h-screen` | `min-h-dvh` | شريط المتصفح يغيّر الارتفاع |
| `active:scale-95` أو `whileTap` | `.app-pressable` العام | ضغط واحد يتبع التفضيل |
| `max-w-lg` / `max-w-screen-*` / `max-w-[var(--ui-workspace-max)]` يدوي | `PageShell width="content|workspace"` | عرضان فقط، والرمز يملكهما |
| `shadow-md` / `shadow-lg` | `elevation-1..4` | العمق المسمّى فقط |
| `<div onClick>` كبطاقة | `AppCard as="button" pressable` | دلالة ولوحة مفاتيح |
| زر أيقونة 32px يدوي | `IconButton` (44×44) | هدف لمس |
| «لا توجد بيانات» | `StateView` بنوع وسبب وخطوة تالية | الفراغ حالة مصمّمة |
| `overflow-hidden` لصفحة بترويسة لاصقة | `PageShell header` (`overflow-x-clip`) | `hidden` يعطّل `sticky` |
| `Toaster` ثانٍ أو snackbar محلي | `toast` من sonner | نظام إشعار واحد |
| `cubic-bezier`/مدة محلية | `src/lib/motion.ts` و`--motion-*` | منحنى/مدة واحدة |

## 7. جدول التغطية (`src/test/designSystem.test.ts`)

| القاعدة | النوع | ما تفحصه فعلاً |
|---|---|---|
| `bg-card` | ميزانية ≤79 | **لا تفرض `AppCard`**؛ تمنع تجاوز العدد فقط |
| `text-[Npx]` | صفر | أحجام px ممنوعة |
| `text-[Nrem]` < 0.75 | صفر | أرضية 12px |
| `text-[Nrem]` | ميزانية ≤11 | أحجام عشوائية لا تزيد |
| `rounded-[...]` | ميزانية ≤9 | الزوايا من السلّم 8/12/16/24/32 |
| `bg-gradient`/`linear-gradient`/`radial-gradient` | ميزانية ≤10 | التدرّج للبيانات/العمل الفني فقط (X7/X8) |
| `backdrop-blur` | ميزانية ≤8 | الضبابية للاستثناءات المسجّلة فقط |
| `z-[N]` / `z-N` خام | صفر | سلّم الطبقات |
| `sticky top-0` + `backdrop-blur` | صفر | ترويسة يدوية |
| `ml/mr/pl/pr` · `text-left/right` · `border-l/r` · `rounded-tl/tr/bl/br` | صفر | RTL منطقي |
| `font-black/extrabold` | صفر | سلّم 400–700 |
| `tracking-tight(er)` | صفر | منع tracking سالب |
| `min-h-screen` | صفر | `dvh` فقط |
| `active:scale-*` · `whileTap` | صفر | ضغط واحد |
| `max-w-lg` | صفر | عرض المحتوى |
| `pb-24/28/32` | صفر | لا شريط تنقّل سفلي |
| مفاتيح لغة ألمانية (`de:`) | صفر | لغة واجهة واحدة |
| `PageShell` · `PageHeader` · `AppCard` · `AppList/AppRow` · `StateView` · `Button` · `IconButton` · الحقول · الطبقات · `Skeleton` · `Avatar` | **عرفي فقط** | لا اختبار يفرض استعمالها |
| `rounded-full` على زر نصي · `elevation-*` · الأدوار اللونية · هدف اللمس 44 · الحالات A/B/C | **عرفي فقط** | تُراجع بصرياً/بالمراجعة |

الأرقام أعلاه من نسخة الاختبار الحالية؛ القاعدة أن تنزل ولا ترتفع، فاقرأها من الملف قبل الاستشهاد. `build/__tests__/tailwindTokens.test.ts` يفحص وجود أصناف الرموز، و`themeIntegrity` يفحص التباين — خارج هذا الملف.

## 8. ملحق: فجوات مُتحقَّقة بين العقد والشيفرة

1. `PageShell width` بلا أثر بلا `header` مع `centered={false}` (لا `.page-shell-inner`)، ووجود `header` يتجاوز `centered` عمداً؛ و`Portal`/`Weather`/`TravelAtlas` ما زالت تبني العرض أو الإطار يدوياً.
2. `Button size="lg"` = 46px أقصر من `default` 48px، و`Button size="icon"` = 48 بينما `IconButton` = 44.
3. `IconChip size="sm"` = 40px فعلياً (تعليق الشيفرة يقول 32).
4. `StateView.action` أيقونته ثابتة `RefreshCcw`، والزر خام لا `Button`؛ لا `kind="success"`.
5. الطبقات تعيد التركيز إلى المشغّل عند الإغلاق (Dialog/Drawer/Sheet/ResponsiveDrawer) — مغطّى باختبارات overlayFocusReturn.
6. `ResponsiveDrawer` على الحاسوب يستخدم `max-w-[425px]` خارج عقد العرضين.
7. `Calendar` يحمل أصنافاً فيزيائية (`space-x-4`, `rounded-l/r-md`)، و`Carousel` أزراره 32px ومواضعه `-left/-right` — لا RTL/لمس مضمونان.
8. كل الطبقات تستخدم `z-drawer`، لا مستويات `picker/sheet/modal` المعرّفة في السلّم؛ وفواصل القائمتين مختلفة (`bg-muted` مقابل `bg-border`).
9. `GroupComposer` و`TripsPage` و`ArchiveNew` تتجاوز البدائل (`Textarea`/`Skeleton`/`StateView`/`Button`) بأدوات يدوية — **مخالفات قائمة** لا نماذج يُحتذى بها.
10. `Collapsible` يذكر `Accordion` في تعليقه، ولا يوجد `accordion.tsx` في المستودع.

_آخر تحقق: قراءة الشيفرة في `design-refoundation` بتاريخ 2026-11-18. أي سلوك بصري (RTL، تركيز، تقليل حركة) غير المُختبر أعلاه يبقى **غير مُتحقَّق** حتى تُلتقط لقطة/اختبار._
