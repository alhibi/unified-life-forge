# خطة تطوير النادي الألماني — "Der Club Reference"

> وثيقة خطة تطوير لميزة `german-club` في `unified-life-forge` (amv.life).
> الفلسفة: **مرجع عصري لجيل Z** — مكان جاهز لأخذ الكلمات والعبارات والمصطلحات والجمل **بدون تدريس تقليدي، بدون تعليم، بدون نظام مكافآت**.

**تاريخ الإصدار:** 31 أغسطس 2026 (المراجعة 2 — إعادة التموضع بعد فهم المستخدم)
**النطاق:** `src/features/german-club/`

---

## 0. المبدأ المؤسس

النادي ليس تطبيق تعلم لغة. النادي **مرجع لغوي سريع** — مثل Urban Dictionary أو Kamus Arab-German في المكتبة، لكنه:

- **ألماني/عربي** بشكل معمّق
- **مُحدَّث بالـAI** (توليد مستمر للكلمات والعبارات)
- **مصنَّف بالسياق** (مواقف حقيقية، لا قوائم أكاديمية)
- **مُحفَّز بالفضول** لا بالإنجاز

> **يأتي → يأخذ → يذهب.** بدون Streak، بدون XP، بدون "اختبر نفسك"، بدون إشعارات ضغط.

---

## 1. تشخيص الوضع الحالي

### ✅ ما يعمل (نقاط قوة حقيقية)
- **رفوف المواقف** (64+ رف) — القهوة، الطقس، Bürgeramt، قطارات DB، كلمات Denglisch، أمثال، لهجات بافارية، إلخ. **هذا هو جوهر النادي**.
- **القاموس الضخم** (132K سطر، ~25,000+ كلمة) مع CEFR + gender + noun_forms + examples.
- **الفرن (Furnace Button)** — زر توليد محتوى AI لكل رف. **ميزة تمييزية حقيقية**.
- **Wort des Tages** — كلمة يوم من القاموس.
- **Bookmark** + بحث متقدم.
- **Grammar Corner** — مرجع قواعد (لا كورس).
- **Content Review** — لوحة مراجعة AI.

### ❌ ما يُربك الفلسفة (يجب إزالته أو إعادة تأطيره)
- `SessionMomentumLine` — "جلسة تعليمية"، **يحذف**.
- `BewaehrungsprobeStamp` — "ختم اجتياز"، **يحذف** أو يُعاد تأطيره كـ"شارة استكشاف".
- `toggleEntryMastered` — "أتقنتُ"، **يُعاد** إلى `entry.archived` أو `entry.saved`.
- `checkShelfMastery` — **يحذف**.
- `animatedMasteryIds` — **يحذف**.

### 🟡 ما يُحايد (يُترك لكن لا يُضاف عليه)
- نظام `is_premium` للرفوف — يُحايد، النادي كله مجاني ومتاح.
- شارات الـmastery في الـUI — **تُحذف** أو تتحول إلى "شارة تصفح".

---

## 2. الرؤية الجديدة: ماذا يعني "غير عادي" لجيل Z

### 2.1 ما هو **مرجع** وليس **درس**
| ❌ ليس | ✅ هو |
|---|---|
| تطبيق تعليم | قاموس عميق |
| يرسل لك إشعارات تذكير | موجود دائماً حين تحتاجه |
| يحسب XP | يحسب **ثراء المحتوى** |
| يختبر حفظك | يعرض كل شيء دفعة واحدة |
| يُعلِّم القواعد خطوة بخطوة | يعرض القواعد في **سياق** مع أمثلة حية |
| يقول "أنت في A2" | يقول "تحتاج Bürgeramt؟ افتح هذا الرف" |
| Streak | Bookmark شخصي |
| دروس يومية | **محتوى يومي طازج** (Wort des Tages، Sprichwort des Tages، Lied der Woche) |

### 2.2 عناصر "غير عادية" مدروسة لجيل Z

#### 🎯 A. **البحث بواقعية**
- اكتب بالإنجليزية أو العربية أو الألمانية (بحث تقريبي fuzzy)
- يحفظ آخر 10 عمليات بحث
- يحفظ الكلمات التي حفظتها (=Bookmark)
- **NO gamification** للحفظ.

#### 🎨 B. **بطاقات محتوى ثرية**
كل بطاقة ليست "كلمة + ترجمة". بل:
- الكلمة/العبارة الألمانية
- النطق (IPA + زر سماع)
- الجنس بالألوان
- 2-3 أمثلة في سياقات مختلفة
- ملاحظة استخدام (Register: formal/informal/slang)
- متعلقات: كلمات في نفس الرف، كلمات متضادة، مركّبات (zusammengesetzte)

#### 🌊 C. **Furnace Engine** (التوليد الذكي)
- زر "شغّل الفرن" على كل رف: AI يولّد كلمات/عبارات جديدة للسياق
- عند توليد 25 → تصبح "رف جاهز" (لا "مكتمل")
- شفافية: عدد الكلمات المولّدة vs المراجعة بشرياً

#### 🗣️ D. **النطق متعدد المصادر**
- IPA مُخزَّن
- زر استماع (browser TTS)
- ربط اختياري بـWiktionary للمزيد

#### 🎭 E. **لهجات ومناطق**
- رفوف مخصصة للهجات: Bavarian، Swabian، Kölsch، Austrian/Swiss
- ملاحظات عن الفروق الإقليمية

#### 💬 F. **عبارات وجمل حقيقية**
- ليست كلمات معزولة فقط — بل **عبارات كاملة** في كل رف
- "Wie läuft's?" مع السياق: متى تُقال، لمن، ردود الفعل المقبولة

#### 🧩 G. **تركيب وتفاعل**
- "استخدم هذه الكلمة في جملة" — أداة تجريب (مع تصحيح نحوي بسيط)
- لا حفظ إجباري، فقط تجريب حر

#### 📚 H. **القاموس منفصل لكن متكامل**
- `/german-club/dictionary` — 25,000+ كلمة كاملة CEFR
- `/german-club` — رفوف مواقفية محدودة لكن عميقة
- ربط: من القاموس اضغط "انظر الرفوف المتعلقة" → قائمة رفوف تستخدم هذه الكلمة

#### 🎁 I. **محتوى ينمو يومياً (بدون إشعار)**
- `Wort des Tages` — كلمة يوم من القاموس
- `Sprichwort des Tages` — مثل/حكمة يومية
- `Satz des Tages` — جملة مفيدة
- `Kulturperle` — معلومة ثقافية (عيد، طعام، عادة)
- **الظهور: في الصفحة الرئيسية، بدون notification.**

---

## 3. البنية المعمارية (الـFSD shape المطلوب)

```
src/features/german-club/
  api.ts                       ★ نقل كل استدعاءات Supabase هنا
  queryKeys.ts                 ★ جديد
  types.ts                     (موجود)
  useGermanClubStore.ts        (موجود - يُنقّى)
  useDictionaryStore.ts        (موجود)
  pages/
    GermanClubHome.tsx         (إعادة كتابة - لوحة مرجعية لا تعليمية)
    GermanDictionary.tsx       (موجود - تحسينات)
    ShelfDetail.tsx            (تبسيط - عرض مرجعي)
    GrammarCorner.tsx          (موجود - تحسينات)
    ContentReviewAdmin.tsx     (موجود)
  components/
    ShelfCard.tsx              (تبسيط - إزالة mastered UI)
    EntryCard.tsx              (تحسين - ثراء المحتوى)
    DictionaryCard.tsx         (موجود - تحسينات)
    FurnaceButton.tsx          (موجود)
    GenderDot.tsx              (موجود)
    GenerationModal.tsx        (موجود)
    DailyContent/              ★ جديد
      WortDesTages.tsx
      SprichwortDesTages.tsx
      Kulturperle.tsx
    Reference/                 ★ جديد
      QuickLookup.tsx          (شريط بحث علوي دائم)
      SavedBookmarksPanel.tsx
      ContextExamples.tsx      (أمثلة متعددة للكلمة)
      CrossShelfLinks.tsx      (ربط الكلمة بالرفوف)
  hooks/
    useDailyContent.ts         ★ جديد
    useContextualSearch.ts     ★ جديد
    useCrossShelfLinks.ts      ★ جديد
  lib/
    dataset/                   (موجود - 132K سطر)
    dictionaryData.ts          (موجود)
    surgeAnimation.ts          (موجود - يُستخدم فقط للـFurnace)
    daily/
      seeds.ts                 ★ توليد يومي ثابت (seed)
  data/
    idioms/                    ★ جداول الأمثال منفصلة
    sayings/                   ★ أمثال وحكم يومية
    cultural/                  ★ معلومات ثقافية
    collocations/              ★ تراكيب شائعة
  __tests__/
```

### 3.1 الجداول (Supabase) — لا تغيير جذري
- `german_shelves`, `german_entries`, `german_grammar_notes` — **تبقى كما هي**.
- ❌ **حذف** أي جداول تعلمية (إن وُجدت لاحقاً في مراحل قادمة): `german_card_state`, `german_review_sessions`, `german_cefr_progress`, `german_streak`, `german_story_progress`.
- ❌ **حذف** `mastered_entry_ids`, `mastered_shelf_ids`, `animated_mastery_ids` من localStorage.

### 3.2 localStorage فقط للحفظ الشخصي
- `bookmarkedIds` (موجود).
- `recentSearches` (موجود).
- `furnaceLastTriggered` (اختياري — تذكير شخصي محلي فقط، لا ضغط).

---

## 4. المراحل (6 مراحل على 8 أسابيع — أقل تعقيداً)

### 🟢 المرحلة 0: التنظيف (الأسبوع 1)
**الهدف:** إزالة كل أثر للتعليم والمكافآت.

| المهمة | تفاصيل | ساعات |
|---|---|---|
| 0.1 | إزالة `SessionMomentumLine` من `ShelfDetail` | 1 |
| 0.2 | إزالة `BewaehrungsprobeStamp` أو إعادة تأطيره كـ"شارة تصفح" | 2 |
| 0.3 | إزالة `masteredShelfIds`, `masteredEntryIds`, `animatedMasteryIds` من الـstore | 3 |
| 0.4 | تبسيط `EntryCard`: إزالة `isMastered` UI state | 1 |
| 0.5 | تبسيط `ShelfCard`: إزالة `isMastered` و"اكتمل الرف" | 1 |
| 0.6 | تعديل الـtests لتُطابق السلوك الجديد (35 اختبار) | 3 |
| 0.7 | تحديث `germanClub.test.ts` — لا mastered assertions | 2 |
| **Verification** | `bun run typecheck` ✓ · `bun run lint` ✓ · `bun run test` ✓ | — |

### 🟡 المرحلة 1: المحتوى اليومي (الأسبوع 2)
**الهدف:** كل يوم محتوى جديد — Wort/Sprichwort/Satz/Kulturperle.

| المهمة | تفاصيل | ساعات |
|---|---|---|
| 1.1 | `lib/daily/seeds.ts` — مصفوفة 365 Wort/Sprichwort/Satz/Kulturperle (محتوى مكتوب يدوياً لـ90 يوماً، الباقي من pools) | 6 |
| 1.2 | `hooks/useDailyContent.ts` — deterministic (نفس اليوم = نفس المحتوى) | 2 |
| 1.3 | `components/DailyContent/WortDesTages.tsx` | 2 |
| 1.4 | `components/DailyContent/SprichwortDesTages.tsx` (مع الترجمة الحرفية والمعنى) | 3 |
| 1.5 | `components/DailyContent/Kulturperle.tsx` | 2 |
| 1.6 | إضافة DailyContent للـHome (لا notification، فقط على الصفحة) | 3 |
| 1.7 | اختبارات: same-day-same-content, day-rollover | 2 |
| **Verification** | +20 اختبار، verify ✓ | — |

### 🔵 المرحلة 2: البحث الذكي المحسّن (الأسبوع 3)
**الهدف:** بحث فوري بأي لغة، مع نتائج غنية.

| المهمة | تفاصيل | ساعات |
|---|---|---|
| 2.1 | `lib/search/fuzzyMultiLang.ts` — بحث تقريبي ألماني/عربي/إنجليزي | 4 |
| 2.2 | `hooks/useContextualSearch.ts` — debounced + suggestions | 3 |
| 2.3 | `components/Reference/QuickLookup.tsx` — شريط بحث علوي في كل صفحات النادي | 4 |
| 2.4 | عرض نتائج البحث في modal: 3 أنواع (كلمة/عبارة/رف) | 4 |
| 2.5 | اختبارات: 100 استعلام شائع، التغطية اللغوية | 3 |
| **Verification** | +25 اختبار، verify ✓ | — |

### 🟣 المرحلة 3: إثراء البطاقات (الأسبوع 4)
**الهدف:** كل بطاقة كنز صغير، لا مجرد "كلمة + ترجمة".

| المهمة | تفاصيل | ساعات |
|---|---|---|
| 3.1 | توسيع `DictionaryEntry` بـ`related_words`, `opposites`, `compounds` (zusammengesetzte) | 3 |
| 3.2 | `components/Reference/ContextExamples.tsx` — 2-3 أمثلة متنوعة | 3 |
| 3.3 | `components/Reference/CrossShelfLinks.tsx` — اضغط على الكلمة → "هذه الكلمة في رفوف: قهوة، Bürgeramt، مطعم" | 4 |
| 3.4 | `components/EntryCard.tsx` — نسخة جديدة ثرية | 4 |
| 3.5 | `components/dictionary/DictionaryDetailModal.tsx` — تحسين العرض | 3 |
| 3.6 | اختبارات: cross-shelf link accuracy, related-word coverage | 3 |
| **Verification** | +30 اختبار، verify ✓ | — |

### 🟠 المرحلة 4: اللهجات والمناطق (الأسبوع 5)
**الهدف:** رفوف مخصصة للهجات مع نطق IPA وملاحظات.

| المهمة | تفاصيل | ساعات |
|---|---|---|
| 4.1 | `data/idioms/` — 50+ مثل ألماني/بافاري/سويسري | 4 |
| 4.2 | `data/sayings/` — حكم + regional variants | 3 |
| 4.3 | رفوف مخصصة: Bavarian، Swabian، Kölsch، Austrian/Swiss (موجودة في الـfallback — تأكيد بيانات) | 3 |
| 4.4 | `components/Reference/DialectNote.tsx` — بطاقة "هذا يقال في بافاريا فقط" | 3 |
| 4.5 | `components/Reference/RegionalVariant.tsx` — مقارنة اللهجات | 4 |
| 4.6 | اختبارات: dialect identifiers, regional data integrity | 3 |
| **Verification** | +25 اختبار، verify ✓ | — |

### 🔴 المرحلة 5: التحسينات النهائية (الأسبوع 6-8)
**الهدف:** مرجع متكامل وقابل للاكتشاف.

| المهمة | تفاصيل | ساعات |
|---|---|---|
| 5.1 | `pages/GermanClubHome.tsx` — إعادة كتابة كلوحة مرجعية: شريط بحث علوي، DailyContent، رفوف، Quick Access | 6 |
| 5.2 | `pages/ShelfDetail.tsx` — تبسيط لعرض مرجعي | 4 |
| 5.3 | بحث سريع عالمي في الـNavbar (اختياري) | 4 |
| 5.4 | إضافة `/german-club/quick` — صفحة وصول سريع (كلمات + عبارات + أمثال + ثقافة) | 4 |
| 5.5 | تنظيف الـconsole، تحسين الأداء | 3 |
| 5.6 | توثيق README في `features/german-club/` | 2 |
| 5.7 | اختبار E2E: رحلة المستخدم الكاملة | 4 |
| **Verification** | 200+ اختبار على مستوى الميزة، verify ✓ | — |

---

## 5. مبادئ التصميم المعماري (Hard Rules)

### 5.1 لا تعقيد تعلّمي
- لا Spaced Repetition. لا FSRS. لا SM-2. لا Quiz. لا Flashcard sessions.
- لا Streak. لا XP. لا Levels. لا Progress bar نسبة.
- لا Daily Notifications. لا push reminders.
- لا Dashboard تعليمي.

### 5.2 ما **يبقى** من النظام الحالي
- ✅ `useGermanClubStore` (الرفوف، الـentries، الجرامَر).
- ✅ `useDictionaryStore` (Bookmarks، البحث، Wort des Tages).
- ✅ `FurnaceButton` + `GenerationModal`.
- ✅ `GrammarCorner`.
- ✅ `ContentReviewAdmin`.
- ✅ `WortDesTagesCard` (موجود).

### 5.3 Strict Type Safety (موجود في AGENTS.md)
- لا `any`. كل إضافة (related_words، compounds) مُعرَّفة صراحة في `types.ts`.
- Zod schema عند استلام بيانات AI جديدة.
- Discriminated unions لحالات الكلمات (A1..C2, register, gender).

### 5.4 Feature-Sliced Design
- كل استدعاء Supabase في `api.ts` فقط.
- لا استيراد مباشر من `@/integrations/supabase/client` خارج `api.ts`.
- `index.ts` هو السطح العام.

### 5.5 لا مكافآت ولا إشعارات ضغط
- ❌ لا "أحسنت!".
- ❌ لا "لقد أتممتَ الرف!".
- ❌ لا "+10 XP".
- ❌ لا "🔥 7 أيام متتالية".
- ✅ نعم: "هذا الرف يحتوي 25 كلمة. افتحه متى شئت."

### 5.6 الاختبارات شرط للرفع
كل ميزة تجتاز `bun run verify` قبل الـcommit.

### 5.7 الأداء (للمرجع السريع)
- قاموس 132K سطر مقسّم chunks مع lazy load.
- البحث يجب أن يكون < 50ms لأول نتيجة.
- الـDaily Content precomputed (لا حساب في الـrender).

---

## 6. مؤشرات النجاح (KPIs)

| المؤشر | الهدف |
|---|---|
| عدد الـtests | +200 (35 → 235+) |
| تغطية الكود للـlib/ | ≥75% |
| `bun run verify` | ✓ بدون تحذيرات |
| زمن البحث لأول نتيجة | <50ms (median) |
| حجم bundle للنادي | <250KB gzipped (lazy) |
| عدد المحتوى اليومي | 4 عناصر (Wort/Sprichwort/Satz/Kulturperle) |
| عدد رفوف اللهجات | ≥5 |
| عدد الأمثال والـSayings | ≥100 |

---

## 7. ما يجعل هذا "غير عادي" لجيل Z

### قبل (المحاولة الأولى — خاطئة)
- ❌ Streak، XP، جلسات 7 دقائق، FSRS، تذكيرات.
- ❌ "معلم صبور يجلس معك".

### بعد (الفهم الصحيح)
- ✅ **مرجع فوري** — أسرع من Google.
- ✅ **محتوى منظَّم بالسياق** — لا أكاديمياً.
- ✅ **كل بطاقة كنز** — أمثلة + IPA + register + مركّبات + ربط.
- ✅ **ينمو بالـAI** (الفرن) بدون إزعاج.
- ✅ **محتوى يومي يطفو على الصفحة الرئيسية** — بدون notification.
- ✅ **بحث بأي لغة** — عربي/إنجليزي/ألماني.
- ✅ **لهجات ومناطق** — كل ألماني مختلف.
- ✅ **بدون وعي تعليمي** — يفتح، يقرأ، يخرج.

### المعيار الذهبي
> **هل يمكن لمستخدم أن يفتح النادي 5 مرات في الأسبوع بدون أي شعور بـ"يجب أن أفعل"؟**
> إذا الجواب نعم → المنتج ناجح.
> إذا شعر بـ"يجب أن أتم مراجعة اليوم" → أعد التصميم.

---

## 8. خطة التنفيذ الفورية

1. **اعتماد هذه الخطة المُعدَّلة** — ✅.
2. **تنفيذ المرحلة 0 (التنظيف)** — 4-6 ساعات، تحرير فوري للضغط عن المستخدم.
3. **تنفيذ المرحلة 1 (المحتوى اليومي)** — يضيف القيمة دون تعقيد.
4. **تأجيل باقي المراحل** لتقييم بعد المرحلة 0+1.

---

## 9. ملاحظات ختامية

- **ما لم نُضفه أفضل مما أضفناه**: الأهم هو ما **حذفناه** (mastered، streak، progress).
- **الإحساس المطلوب**: فتح قاموس في مكتبة — متى شئت، لأي سؤال، بدون محاسبة.
- **التحدي الحقيقي**: مقاومة إغراء إضافة "تحسينات تعليمية" تخدم الـengagement metrics لا المستخدم.

---

**حالة الرفع:** لم يُرفع إلى main بعد — هذه وثيقة تخطيط فقط.