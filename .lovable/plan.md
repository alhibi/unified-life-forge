# خطة تطوير SmartHub الشاملة

رؤية موحّدة: تطبيق يومي يشعر المستخدم أنه "حي يتنفس معه"، بأداء أصيل (Native-feel)، هوية بصرية ناضجة، ومحتوى ذكي يتكيّف مع الوقت والمكان والحالة.

---

## 1. الهوية البصرية والنظام التصميمي (Visual Foundation)

**الهدف:** تجربة بصرية متماسكة تشبه تطبيقات Apple/Arc/Linear بدل المظهر العام.

- **توحيد رموز التصميم (Design Tokens):** مراجعة شاملة لـ `index.css` و`tailwind.config.ts` لإزالة أي ألوان مكتوبة يدوياً في المكونات واستبدالها بـ semantic tokens (`--primary`, `--surface-1/2/3`, `--live`, `--ink`, `--whisper`).
- **نظام طبقات Obsidian Depth v2:** ثلاث طبقات عمق فقط (`surface-base`, `surface-raised`, `surface-floating`) مع ظلال inset/outset محددة، يطبَّق على كل البطاقات والـ drawers.
- **نظام Motion موحّد:** توسيع `src/lib/motion.ts` ليكون المصدر الوحيد للحركة (durations, easings, spring presets). إزالة كل `transition-all` العشوائية.
- **Typography Scale:** سُلّم خطوط ثابت (display/title/body/caption/micro) بأحجام ووزن وleading محددة، مع IBM Plex Arabic + Inter.
- **Iconography:** مراجعة `src/lib/icons.tsx` لتوحيد سُمك الخط (1.5px) والحجم الافتراضي، وإزالة أي أيقونات خارج النظام.

## 2. هندسة المعلومات والتنقّل (IA & Navigation)

- **تبسيط شريط التنقل:** التأكد من 5 تبويبات قصوى (Home, Mihrab, Knowledge, Chat, More) مع نقل الباقي إلى صفحة Browse hub.
- **شريط علوي ذكي:** PageHeader موحّد عبر كل الصفحات الفرعية مع BackButton + عنوان + إجراء واحد فقط (no clutter).
- **Deep-linking كامل:** كل drawer/sheet/modal لها route خاص يدعم زر الرجوع للنظام (مهم للـ PWA).
- **Prefetch ذكي:** تحسين `routePrefetch.ts` ليجلب الصفحة التالية المتوقعة عند الـ hover/focus.

## 3. الصفحة الرئيسية: Living Home

**الهدف:** كل ثانية على الـ Home تعطي قيمة فورية.

- **Living Ribbon v2:** بطاقة سياق ديناميكية واحدة في الأعلى تتحول حسب الوقت: قبل الفجر → دعاء، عند الصلاة → مؤقت، بعد العصر → سورة الكهف، ليلاً → ورد المساء.
- **Greeting ذكي:** يستخدم اسم المستخدم + حالة الطقس + أقرب صلاة في جملة واحدة طبيعية.
- **ترتيب الأقسام حسب الوقت:** الصلاة أعلى عند اقترابها، الطقس أعلى صباحاً، السنة الحالية تظهر فقط في وقتها.
- **Skeleton states أنيقة:** لكل widget shimmer مخصص بدل blank flashes.

## 4. تجربة الصلاة (Prayer Experience)

- **عدّاد تنازلي بصري:** حلقة تقدّم دائرية حول الصلاة القادمة مع نبض خفيف في آخر 10 دقائق.
- **وضع الصلاة (Prayer Mode):** عند الأذان، شاشة تتعتم تلقائياً، تكبّر الخط، وتعرض الأذكار بعد الصلاة.
- **خريطة القبلة:** بوصلة دقيقة باستخدام DeviceOrientation API مع animation سلس.
- **تنبيهات ذكية:** notification 10 دقائق قبل + عند الأذان + تذكير سنن بعدية.

## 5. المراسلة (Chat) — الصقل النهائي

- **أداء قائمة الرسائل:** virtualization كامل (react-virtual) للمحادثات الطويلة (>200 رسالة).
- **Reactions:** نظام ردود فعل (👍 ❤️ 🤲) مع long-press menu.
- **Reply quoting:** swipe-to-reply موجود، لكن تحسين عرض الاقتباس داخل الفقاعة.
- **Read receipts متقدّمة:** عرض من قرأ ومتى في group chats.
- **Voice messages 2.0:** تسريع 1.5x/2x، waveform تفاعلي، transcript تلقائي اختياري عبر Lovable AI.
- **Offline queue:** الرسائل المرسلة بدون شبكة تُحفظ وتُرسل تلقائياً عند العودة.

## 6. المعرفة والمحتوى (Knowledge & Content)

- **بحث موحّد:** Command Palette (⌘K) يبحث في القرآن، الأذكار، الشعر، RSS، الرسائل، الأماكن — كله في مكان واحد.
- **Reading mode عالمي:** أي محتوى طويل (RSS، شعر، أحاديث) يفتح في reader موحّد بنفس tokens الطباعة.
- **Bookmarks موحّدة:** الحافظة الحالية تتطوّر لتشمل tags، folders، وبحث داخلي.
- **AI Companion:** زر "اشرح" / "لخّص" / "ترجم" على أي نص (آية، حديث، خبر) عبر Lovable AI Gateway.

## 7. الإشعارات والتنبيهات (Smart Notifications)

- **مركز إشعارات داخلي:** Inbox واحد يجمع: رسائل، أذان، أخبار من keywords، تذكيرات صلاة.
- **Quiet hours:** إعدادات صامتة (مثلاً ليلاً) تطبَّق على كل المصادر.
- **Per-source controls:** المستخدم يتحكم بكل مصدر إشعار على حدة.

## 8. الأداء (Performance Pass)

- **Bundle audit:** تحليل bundle size عبر `rollup-plugin-visualizer`، تقسيم code-splitting للصفحات الثقيلة (Diwan, Wellness, Games).
- **Image pipeline:** كل الصور عبر `<img loading="lazy" decoding="async">` + srcset، وضغط WebP.
- **Critical CSS:** استخراج CSS الرئيسي للصفحة الأولى inline في `index.html`.
- **Font loading:** `font-display: swap` + preload للخط الأساسي فقط.
- **PWA upgrade:** service worker كامل (workbox) للـ offline-first على الصفحات الرئيسية.
- **Web Vitals target:** LCP < 1.5s، INP < 100ms، CLS < 0.05.

## 9. الوصولية والـ i18n

- **ARIA audit شامل:** كل button/dialog/menu لها aria-label عربي وألماني صحيح.
- **Keyboard navigation:** Tab/Esc/Enter يعمل في كل drawer وmodal.
- **Color contrast:** التأكد من 4.5:1 في كل الثيمات الـ 28.
- **RTL polish:** مراجعة كل صفحة في RTL خاصة الـ charts والـ timelines.
- **Screen reader testing:** اختبار مع VoiceOver/TalkBack.

## 10. الأمان والـ Backend

- **RLS audit:** مراجعة كل policy في Supabase والتأكد من عدم وجود ثغرات.
- **Rate limiting:** على edge functions الحساسة (RSS fetch, search).
- **Input sanitization:** خاصة في الرسائل و RSS HTML.
- **Session management:** refresh tokens، logout على كل الأجهزة.

## 11. تجربة الانطباع الأول (Onboarding)

- **Welcome flow:** 3 شاشات قصيرة (اللغة → الموقع → الإشعارات) بدلاً من رمي المستخدم في الواجهة.
- **Empty states:** كل قائمة فارغة لها رسم/أيقونة ودعوة واضحة للإجراء.
- **First-run hints:** tooltips خفيفة على الميزات الرئيسية تظهر مرة واحدة.

## 12. القياس والتحسين المستمر

- **Analytics خفيفة:** تتبّع أي ميزات تُستخدم فعلاً (privacy-first، بدون tracking خارجي).
- **Error boundary موحّد:** كل route محاط بـ ErrorBoundary مع رسالة عربية لطيفة + زر "أعد المحاولة".
- **Feedback channel:** زر "أرسل ملاحظة" في الإعدادات يفتح composer مباشر.

---

## خريطة التنفيذ المقترحة (مراحل)

```text
Phase 1 — Foundation (الأساس)
  ├─ Design tokens audit + Motion system
  ├─ Typography scale + Icon system
  └─ Navigation polish + PageHeader unification

Phase 2 — Core Experience (الجوهر)
  ├─ Living Home v2 + Prayer Mode
  ├─ Command Palette + Universal Search
  └─ Bookmarks v2 + AI Companion

Phase 3 — Communication (التواصل)
  ├─ Chat virtualization + Reactions
  ├─ Voice 2.0 + Offline queue
  └─ Notification center

Phase 4 — Polish (الصقل)
  ├─ Performance pass (bundle, images, PWA)
  ├─ Accessibility + RTL audit
  └─ Onboarding + Empty states + Error boundaries
```

---

## ملاحظة

هذه خطة مرجعية شاملة. لن أنفّذ شيئاً قبل أن تختار من أين نبدأ. اقترح أن نبدأ بـ **Phase 1** (الأساس البصري) لأنه يرفع جودة كل ما يأتي بعده تلقائياً، ثم ننتقل لما تراه الأولوية.

أي مرحلة/بند تريد البدء به؟
