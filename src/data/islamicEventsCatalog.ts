/**
 * Comprehensive Hijri-calendar events catalog.
 *
 * Sourced from the Khushu open-source project
 * (https://github.com/greykaizen/khushu — `app/src/main/assets/catalogs/islamic-month-events.json`)
 * and ported to TypeScript with Arabic translations for bilingual display.
 *
 * Each event is keyed by Hijri (month, day) so it recurs every Hijri year.
 * Consecutive days with identical content (e.g. Ayyam al-Bid 13-14-15) are
 * automatically merged into a single span at runtime — see `mergeConsecutiveSpans`
 * in `islamicOccasions.ts`.
 */

export type EventType =
  | 'HISTORICAL'
  | 'RELIGIOUS'
  | 'RECURRING_RITUAL'
  | 'BIRTH'
  | 'DEATH';

export type EventPerspective = 'UNIVERSAL' | 'SUNNI' | 'SHIA';

export interface RawIslamicEvent {
  /** Hijri day (1-30) */
  day: number;
  /** English title */
  title: string;
  /** Arabic title */
  titleAr: string;
  /** English description */
  description: string;
  /** Arabic description */
  descriptionAr: string;
  /** Optional explanatory note (English) */
  notes?: string;
  /** Optional explanatory note (Arabic) */
  notesAr?: string;
  type: EventType;
  perspective: EventPerspective;
  /** Optional Hijri year of the historical event (negative = before Hijra) */
  yearAh?: number;
  /** Whether to highlight as a major holiday */
  isMajorHoliday?: boolean;
}

export interface RawIslamicMonth {
  monthId: number;       // 1..12
  monthName: string;     // English name
  monthNameAr: string;   // Arabic name
  isSacred?: boolean;    // أشهر حُرم
  events: RawIslamicEvent[];
}

// ── Reusable Ayyam al-Bid template (the recommended fast on the white-moon days) ──
const AYYAM_AL_BID = (day: number): RawIslamicEvent => ({
  day,
  title: 'Ayyam al-Bid (White Days)',
  titleAr: 'أيام البيض',
  description: 'Highly recommended fasts of the full moon days.',
  descriptionAr: 'صيام مستحب لأيام اكتمال القمر (الثالث عشر، الرابع عشر، الخامس عشر).',
  type: 'RECURRING_RITUAL',
  perspective: 'UNIVERSAL',
});

const AYYAM_AT_TASHRIQ = (day: number): RawIslamicEvent => ({
  day,
  title: 'Ayyam at-Tashriq',
  titleAr: 'أيام التشريق',
  description: 'Days of eating, drinking, and remembering Allah following Eid al-Adha.',
  descriptionAr: 'أيام أكل وشرب وذكر لله بعد عيد الأضحى. الصيام فيها محرم.',
  type: 'RELIGIOUS',
  perspective: 'UNIVERSAL',
});

export const ISLAMIC_EVENTS_CATALOG: RawIslamicMonth[] = [
  // ── 1. Muharram ─────────────────────────────────────────────────────
  {
    monthId: 1,
    monthName: 'Muharram',
    monthNameAr: 'محرم',
    isSacred: true,
    events: [
      {
        day: 1,
        title: 'Islamic New Year',
        titleAr: 'رأس السنة الهجرية',
        description:
          'The first day of the Hijri calendar, marking the migration of Prophet Muhammad (PBUH) from Makkah to Madinah, established during the Caliphate of Umar ibn al-Khattab.',
        descriptionAr:
          'أول يوم من التقويم الهجري، ويوافق ذكرى هجرة النبي محمد ﷺ من مكة إلى المدينة، وقد أُسِّس هذا التقويم في عهد الخليفة عمر بن الخطاب رضي الله عنه.',
        type: 'HISTORICAL',
        yearAh: 1,
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      {
        day: 2,
        title: 'Arrival of Al-Hussain at Karbala',
        titleAr: 'وصول الحسين إلى كربلاء',
        description:
          'Imam Hussain ibn Ali (RA) arrived at the plain of Karbala in 61 AH after being intercepted by a cavalry unit. His caravan of around 72 fighters and their families was halted near the Euphrates, far from Makkah or Madinah.',
        descriptionAr:
          'وصل الإمام الحسين بن علي رضي الله عنه إلى أرض كربلاء سنة 61هـ بعد أن اعترضته كتيبة من الفرسان بقيادة الحر بن يزيد الرياحي. كان قد خرج من مكة رافضًا مبايعة يزيد، استجابةً لرسائل أهل الكوفة، فأُجبِر على النزول قرب الفرات بعيدًا عن أمن مكة والمدينة.',
        type: 'HISTORICAL',
        yearAh: 61,
        perspective: 'UNIVERSAL',
      },
      {
        day: 7,
        title: 'Water Access Cut in Karbala',
        titleAr: 'منع الماء في كربلاء',
        description:
          'On Muharram 7, the Umayyad army blocked Imam Hussain\'s camp from the Euphrates, cutting their water supply for the final three days before Ashura.',
        descriptionAr:
          'في السابع من محرم منع جيشُ بني أمية بقيادة عمر بن سعد، بأمر من عبيد الله بن زياد، الإمامَ الحسينَ ومن معه من الوصول إلى ماء الفرات، فاحتمل النساء والأطفال والأصحاب شدة العطش في حر الصحراء قبل يوم عاشوراء بثلاث ليالٍ.',
        type: 'HISTORICAL',
        yearAh: 61,
        perspective: 'SHIA',
      },
      {
        day: 7,
        title: 'The Conquest of Khaybar',
        titleAr: 'فتح خيبر',
        description:
          'The definitive end of the threat from the northern fortresses in 7 AH. It established important precedents for land tax (Kharaj) and treaty law.',
        descriptionAr:
          'القضاء النهائي على تهديد حصون اليهود في الشمال سنة 7هـ، وأرست هذه الغزوة أحكام الخراج ومعاهدات الذمة في الإسلام.',
        type: 'HISTORICAL',
        yearAh: 7,
        perspective: 'UNIVERSAL',
      },
      {
        day: 10,
        title: 'The Day of Ashura',
        titleAr: 'يوم عاشوراء',
        description:
          'A day of immense significance: the liberation of Prophet Musa and Bani Israel from Pharaoh, and the martyrdom of Imam Hussain ibn Ali in 61 AH.',
        descriptionAr:
          'يوم عظيم القدر: نجَّى الله فيه نبيَّه موسى عليه السلام وبني إسرائيل من فرعون، وفيه استُشهد الإمام الحسين بن علي رضي الله عنه سنة 61هـ. صيامه مستحب.',
        type: 'RELIGIOUS',
        yearAh: 61,
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 25,
        title: 'Passing of Imam Ali ibn al-Hussain',
        titleAr: 'وفاة الإمام علي زين العابدين',
        description:
          'The death of the fourth Imam, Zain al-Abidin, known for his piety and the collection of supplications As-Sahifa al-Sajjadiyya.',
        descriptionAr:
          'وفاة الإمام علي بن الحسين الملقَّب بزين العابدين، رابع أئمة أهل البيت عند الشيعة، المعروف بزهده وعبادته وبمجموعته الدعائية الصحيفة السجادية، سنة 95هـ.',
        type: 'DEATH',
        yearAh: 95,
        perspective: 'SHIA',
      },
    ],
  },

  // ── 2. Safar ────────────────────────────────────────────────────────
  {
    monthId: 2,
    monthName: 'Safar',
    monthNameAr: 'صفر',
    events: [
      {
        day: 1,
        title: 'Battle of Siffin',
        titleAr: 'موقعة صفين',
        description:
          'A prolonged confrontation in 37 AH between Caliph Ali ibn Abi Talib (RA) and Muawiyah on the banks of the Euphrates. The arbitration that followed deepened the political fracture in the Muslim community.',
        descriptionAr:
          'مواجهة طويلة سنة 37هـ بين الخليفة علي بن أبي طالب رضي الله عنه ومعاوية بن أبي سفيان والي الشام على ضفاف الفرات. رفع جيش معاوية المصاحف على الرماح طلبًا للتحكيم، فعمّق التحكيمُ الذي تلا ذلك الانقسامَ في الأمة وأدى إلى ظهور الخوارج.',
        type: 'HISTORICAL',
        yearAh: 37,
        notes:
          'The battle spanned Dhul Hijjah 36 AH through Safar 37 AH. The specific day within the month is not definitively recorded.',
        notesAr:
          'استمرت المعركة من ذي الحجة 36هـ إلى صفر 37هـ. اليوم المحدد من الشهر غير ثابت في المصادر الكلاسيكية.',
        perspective: 'UNIVERSAL',
      },
      {
        day: 7,
        title: 'Birth of Imam Musa al-Kadhim',
        titleAr: 'مولد الإمام موسى الكاظم',
        description:
          'Birth of the seventh Imam, known for his restraint of anger and deep scholarship, in 128 AH.',
        descriptionAr:
          'مولد الإمام موسى الكاظم سابع أئمة الإثني عشرية، المعروف بكظم الغيظ وعلمه العميق، سنة 128هـ.',
        type: 'BIRTH',
        yearAh: 128,
        perspective: 'SHIA',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 17,
        title: 'Passing of Imam Ali al-Rida',
        titleAr: 'وفاة الإمام علي الرضا',
        description:
          'The eighth Imam passed away in Tus (modern-day Mashhad) in 203 AH.',
        descriptionAr:
          'توفي الإمام علي بن موسى الرضا، ثامن أئمة أهل البيت عند الشيعة، في طوس (مشهد حالياً) سنة 203هـ.',
        type: 'DEATH',
        yearAh: 203,
        perspective: 'SHIA',
      },
      {
        day: 20,
        title: "Arba'een",
        titleAr: 'الأربعين',
        description:
          'The fortieth day following the martyrdom of Imam Hussain, marking the return of the household of the Prophet to Karbala.',
        descriptionAr:
          'اليوم الأربعون من شهادة الإمام الحسين رضي الله عنه، ويُحيي فيه الشيعةُ ذكرى عودة أهل بيت النبي إلى كربلاء.',
        type: 'HISTORICAL',
        yearAh: 61,
        perspective: 'SHIA',
      },
      {
        day: 28,
        title: 'Wafat of Prophet Muhammad (PBUH)',
        titleAr: 'وفاة النبي محمد ﷺ',
        description:
          'The passing of the Final Messenger of Allah in 11 AH, as observed in Shia tradition.',
        descriptionAr:
          'وفاة خاتم الرسل ﷺ سنة 11هـ، كما هو معروف في الرواية الشيعية. توفي ﷺ في المدينة بعد مرض قصير.',
        type: 'DEATH',
        yearAh: 11,
        isMajorHoliday: true,
        notes:
          '28 Safar is the date preserved in Shia tradition. The majority of Sunni scholars cite 12 Rabi\' al-Awwal.',
        notesAr:
          '28 صفر هو التاريخ المحفوظ في الرواية الشيعية، بينما يذكر جمهور علماء أهل السنة 12 ربيع الأول. كلا التاريخين يُحييان بالحزن والذكر.',
        perspective: 'SHIA',
      },
      {
        day: 29,
        title: 'Hijra: Departure from Makkah',
        titleAr: 'الهجرة: الخروج من مكة',
        description:
          'The night Prophet Muhammad (PBUH) left Makkah with Abu Bakr (RA) to the Cave of Thawr to begin the migration.',
        descriptionAr:
          'الليلة التي خرج فيها النبي ﷺ مع أبي بكر الصديق رضي الله عنه إلى غار ثور لبدء الهجرة.',
        type: 'HISTORICAL',
        yearAh: 1,
        notes:
          'Most accounts place this at the very end of Safar or the opening days of Rabi\' al-Awwal 1 AH.',
        notesAr:
          'تذكر أكثر الروايات أن الخروج كان في أواخر صفر أو أوائل ربيع الأول من السنة الأولى للهجرة. مكث ﷺ في غار ثور ثلاث ليالٍ.',
        perspective: 'UNIVERSAL',
      },
    ],
  },

  // ── 3. Rabi' al-Awwal ───────────────────────────────────────────────
  {
    monthId: 3,
    monthName: "Rabi' al-Awwal",
    monthNameAr: 'ربيع الأول',
    events: [
      {
        day: 1,
        title: 'Laylat al-Mabit',
        titleAr: 'ليلة المبيت',
        description:
          "Ali ibn Abi Talib slept in the Prophet's bed to deceive the assassins while the Prophet (PBUH) migrated.",
        descriptionAr:
          'نام الإمام علي بن أبي طالب رضي الله عنه في فراش النبي ﷺ ليلة الهجرة ليُضلِّل المتربصين بقتله بينما خرج النبي ﷺ مهاجرًا.',
        type: 'HISTORICAL',
        yearAh: 1,
        notes:
          'This event occurred the night immediately before the Prophet\'s departure from Makkah.',
        notesAr:
          'وقعت هذه الحادثة في الليلة التي سبقت خروج النبي ﷺ من مكة، وموضعها بين أواخر صفر وأوائل ربيع الأول.',
        perspective: 'UNIVERSAL',
      },
      {
        day: 8,
        title: 'Passing of Imam Hasan al-Askari',
        titleAr: 'وفاة الإمام حسن العسكري',
        description: 'The death of the eleventh Imam in Samarra in 260 AH.',
        descriptionAr: 'وفاة الإمام حسن العسكري، الحادي عشر من أئمة الإثني عشرية، في سامراء سنة 260هـ.',
        type: 'DEATH',
        yearAh: 260,
        perspective: 'SHIA',
      },
      {
        day: 12,
        title: 'Birth of Prophet Muhammad (PBUH) — Mawlid an-Nabi',
        titleAr: 'المولد النبوي الشريف',
        description:
          'The most widely recognized date for the birth of the Prophet (PBUH) in the Year of the Elephant.',
        descriptionAr:
          'التاريخ الأشهر لمولد النبي محمد ﷺ في عام الفيل، عند جمهور علماء أهل السنة.',
        type: 'BIRTH',
        isMajorHoliday: true,
        perspective: 'SUNNI',
      },
      {
        day: 12,
        title: 'Arrival at Quba',
        titleAr: 'الوصول إلى قباء',
        description:
          'The Prophet (PBUH) reached Quba on the outskirts of Madinah and established the first mosque in Islam.',
        descriptionAr:
          'وصل النبي ﷺ إلى قباء على مشارف المدينة وأسَّس أول مسجد في الإسلام.',
        type: 'HISTORICAL',
        yearAh: 1,
        perspective: 'UNIVERSAL',
      },
      {
        day: 12,
        title: 'Wafat of Prophet Muhammad (PBUH)',
        titleAr: 'وفاة النبي محمد ﷺ (الرواية السنية)',
        description:
          'The passing of the Final Messenger of Allah in 11 AH in Madinah, as established by the majority of Sunni scholars.',
        descriptionAr:
          'وفاة النبي ﷺ سنة 11هـ في المدينة، عند جمهور علماء أهل السنة. توفي ﷺ في بيت عائشة رضي الله عنها وعمره 63 عامًا.',
        type: 'DEATH',
        yearAh: 11,
        isMajorHoliday: true,
        notes:
          'This same date is also observed as Mawlid an-Nabi — the Prophet\'s birthday.',
        notesAr:
          'يوافق هذا التاريخ ذكرى المولد النبوي أيضًا — يوم الميلاد ويوم الوفاة في نفس اليوم بحسب الرواية السنية.',
        perspective: 'SUNNI',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 17,
        title: 'Birth of Prophet Muhammad (PBUH) — Shia tradition',
        titleAr: 'مولد النبي ﷺ (الرواية الشيعية)',
        description:
          'The date traditionally observed for the birth of the Prophet (PBUH) in Shia history.',
        descriptionAr:
          'التاريخ المتبع في الرواية الشيعية لمولد النبي محمد ﷺ.',
        type: 'BIRTH',
        isMajorHoliday: true,
        perspective: 'SHIA',
      },
      {
        day: 17,
        title: "Birth of Imam Ja'far al-Sadiq",
        titleAr: 'مولد الإمام جعفر الصادق',
        description:
          "Birth of the sixth Imam and the founder of the Ja'fari school of jurisprudence in 83 AH.",
        descriptionAr:
          'مولد الإمام جعفر الصادق سادس أئمة أهل البيت ومؤسس المذهب الجعفري في الفقه، سنة 83هـ.',
        type: 'BIRTH',
        yearAh: 83,
        perspective: 'SHIA',
      },
      {
        day: 18,
        title: 'Construction of Al-Masjid an-Nabawi',
        titleAr: 'بدء بناء المسجد النبوي',
        description:
          "The formal beginning of the construction of the Prophet's Mosque in Madinah.",
        descriptionAr:
          'البدء الرسمي ببناء المسجد النبوي الشريف في المدينة المنورة.',
        type: 'HISTORICAL',
        yearAh: 1,
        perspective: 'UNIVERSAL',
      },
    ],
  },

  // ── 4. Rabi' al-Thani ───────────────────────────────────────────────
  {
    monthId: 4,
    monthName: "Rabi' al-Thani",
    monthNameAr: 'ربيع الآخر',
    events: [
      {
        day: 8,
        title: 'Birth of Imam Hasan al-Askari',
        titleAr: 'مولد الإمام حسن العسكري',
        description:
          'Alternative date for the birth of the eleventh Imam in Madinah, 232 AH.',
        descriptionAr:
          'تاريخ بديل لمولد الإمام حسن العسكري، الحادي عشر من أئمة الإثني عشرية، في المدينة سنة 232هـ.',
        type: 'BIRTH',
        yearAh: 232,
        perspective: 'SHIA',
      },
      {
        day: 10,
        title: 'Passing of Fatima bint Musa',
        titleAr: 'وفاة فاطمة بنت موسى المعصومة',
        description:
          "Death of the daughter of the seventh Imam, known as Bibi Ma'sumah Qom, in 201 AH.",
        descriptionAr:
          'وفاة السيدة فاطمة بنت موسى الكاظم، أخت الإمام الرضا، المعروفة بفاطمة المعصومة، في قم سنة 201هـ.',
        type: 'DEATH',
        yearAh: 201,
        perspective: 'SHIA',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
    ],
  },

  // ── 5. Jumada al-Awwal ──────────────────────────────────────────────
  {
    monthId: 5,
    monthName: 'Jumada al-Awwal',
    monthNameAr: 'جمادى الأولى',
    events: [
      {
        day: 5,
        title: 'Birth of Zainab bint Ali (RA)',
        titleAr: 'مولد السيدة زينب بنت علي',
        description:
          "Birth of the granddaughter of the Prophet (PBUH), known for her eloquence and pivotal role in preserving the message of Islam post-Karbala.",
        descriptionAr:
          'مولد السيدة زينب بنت علي بن أبي طالب رضي الله عنها، حفيدة النبي ﷺ، المعروفة ببلاغتها ودورها العظيم في حفظ رسالة الإسلام بعد كربلاء.',
        type: 'BIRTH',
        yearAh: 5,
        perspective: 'UNIVERSAL',
      },
      {
        day: 8,
        title: "Battle of Mu'tah",
        titleAr: 'غزوة مؤتة',
        description:
          'The first major engagement between the Muslims and the Byzantine-allied forces in 8 AH. Three commanders fell in succession before Khalid ibn al-Walid took command and preserved the army.',
        descriptionAr:
          'أول مواجهة كبرى بين المسلمين والقوات البيزنطية وحلفائها سنة 8هـ قرب مؤتة في الأردن الحالية. سقط ثلاثة قادة تباعًا: زيد بن حارثة، ثم جعفر بن أبي طالب، ثم عبد الله بن رواحة رضي الله عنهم. تولى خالد بن الوليد القيادة فحفظ الجيش بانسحابه التكتيكي البارع، فلقَّبه النبي ﷺ بـ"سيف الله".',
        type: 'HISTORICAL',
        yearAh: 8,
        perspective: 'UNIVERSAL',
      },
      {
        day: 10,
        title: 'Passing of Fatima az-Zahra (RA) — Sunni narration',
        titleAr: 'وفاة فاطمة الزهراء (الرواية السنية)',
        description:
          "One of the narrated dates for the passing of the Prophet's daughter in 11 AH.",
        descriptionAr:
          'أحد التواريخ الواردة في بعض روايات أهل السنة لوفاة السيدة فاطمة الزهراء بنت النبي ﷺ سنة 11هـ.',
        type: 'DEATH',
        yearAh: 11,
        notes:
          'The Shia consensus places her passing on 3 Jumada al-Thani, 75 days after the Prophet\'s Wafat.',
        notesAr:
          'الإجماع الشيعي يضع وفاتها في 3 جمادى الآخرة، أي بعد 75 يومًا من وفاة النبي ﷺ في 28 صفر.',
        perspective: 'SUNNI',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 15,
        title: 'Birth of Imam Ali ibn al-Hussain (Zain al-Abidin)',
        titleAr: 'مولد الإمام علي زين العابدين',
        description:
          "Birth of the fourth Imam in the Ahl al-Bayt lineage, renowned for his asceticism and the collection of prayers known as As-Sahifa al-Sajjadiyya.",
        descriptionAr:
          'مولد الإمام علي بن الحسين زين العابدين، رابع أئمة أهل البيت، المعروف بزهده وكتاب الأدعية الصحيفة السجادية. سنة 38هـ.',
        type: 'BIRTH',
        yearAh: 38,
        perspective: 'SHIA',
      },
      {
        day: 17,
        title: 'The Battle of Jamal',
        titleAr: 'موقعة الجمل',
        description:
          'A civil conflict in 36 AH near Basra, named after the camel upon which Aisha (RA) was mounted.',
        descriptionAr:
          'فتنة داخلية سنة 36هـ قرب البصرة، سُمِّيت بالجمل نسبةً إلى الجمل الذي كانت تركبه السيدة عائشة رضي الله عنها. خرج طلحة والزبير وعائشة رضي الله عنهم يطالبون بالقصاص لقتلة عثمان قبل مبايعة علي رضي الله عنه. انتصر علي رضي الله عنه فيها، وقُتل طلحة والزبير، ورد عائشة إلى المدينة معززة مكرَّمة.',
        type: 'HISTORICAL',
        yearAh: 36,
        perspective: 'UNIVERSAL',
      },
    ],
  },

  // ── 6. Jumada al-Thani ──────────────────────────────────────────────
  {
    monthId: 6,
    monthName: 'Jumada al-Thani',
    monthNameAr: 'جمادى الآخرة',
    events: [
      {
        day: 3,
        title: 'Passing of Fatima az-Zahra (RA)',
        titleAr: 'وفاة فاطمة الزهراء (الرواية الشيعية)',
        description:
          "The date most widely observed by the Ahl al-Bayt for the martyrdom and passing of the daughter of the Prophet.",
        descriptionAr:
          'التاريخ الأكثر اعتمادًا عند أهل البيت لشهادة ووفاة السيدة فاطمة الزهراء بنت النبي ﷺ، بعد 75 يومًا من وفاة أبيها ﷺ في 28 صفر سنة 11هـ.',
        type: 'DEATH',
        yearAh: 11,
        notes:
          'A separate date in Jumada al-Awwal is cited in certain Sunni narrations.',
        notesAr:
          'هناك تاريخ آخر في جمادى الأولى مذكور في بعض روايات أهل السنة. اختلاف التاريخ مسألة تاريخية لا تنقص من قدر السيدة الزهراء رضي الله عنها.',
        perspective: 'SHIA',
      },
      AYYAM_AL_BID(13),
      {
        day: 13,
        title: 'Death of Umm ul-Banin',
        titleAr: 'وفاة أم البنين',
        description:
          'Passing of Fatima bint Hizam, the wife of Ali ibn Abi Talib and mother of Abbas ibn Ali, known for her immense loyalty and devotion to the family of the Prophet.',
        descriptionAr:
          'وفاة السيدة فاطمة بنت حزام أم البنين، زوجة الإمام علي بن أبي طالب وأم العباس بن علي، المعروفة بشدة وفائها وحبها لأهل بيت النبي ﷺ. سنة 64هـ.',
        type: 'DEATH',
        yearAh: 64,
        perspective: 'SHIA',
      },
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 20,
        title: 'Birth of Fatima az-Zahra (RA)',
        titleAr: 'مولد فاطمة الزهراء',
        description:
          "The birth of the 'Leader of the Women of Paradise' in Makkah, five years before the official start of the Prophetic mission.",
        descriptionAr:
          'مولد سيدة نساء أهل الجنة فاطمة الزهراء بنت النبي ﷺ في مكة، قبل البعثة بخمس سنوات.',
        type: 'BIRTH',
        yearAh: -5,
        perspective: 'UNIVERSAL',
      },
      {
        day: 22,
        title: 'Passing of Caliph Abu Bakr as-Siddiq (RA)',
        titleAr: 'وفاة الخليفة أبي بكر الصديق',
        description:
          "The death of the first Rightly Guided Caliph and the closest companion of the Prophet (PBUH) in 13 AH.",
        descriptionAr:
          'وفاة أول الخلفاء الراشدين وأقرب أصحاب النبي ﷺ، أبي بكر الصديق رضي الله عنه، سنة 13هـ.',
        type: 'DEATH',
        yearAh: 13,
        perspective: 'UNIVERSAL',
      },
    ],
  },

  // ── 7. Rajab ────────────────────────────────────────────────────────
  {
    monthId: 7,
    monthName: 'Rajab',
    monthNameAr: 'رجب',
    isSacred: true,
    events: [
      {
        day: 1,
        title: 'Beginning of Rajab',
        titleAr: 'أول رجب',
        description:
          'The start of one of the four sacred months in the Islamic calendar, a time of heightened spiritual significance.',
        descriptionAr:
          'بداية شهر رجب، أحد الأشهر الحرم الأربعة في التقويم الإسلامي، شهر له فضل ومكانة خاصة في الإسلام.',
        type: 'RELIGIOUS',
        perspective: 'UNIVERSAL',
      },
      {
        day: 1,
        title: 'Birth of Imam Muhammad al-Baqir',
        titleAr: 'مولد الإمام محمد الباقر',
        description:
          "Birth of the fifth Imam, known as 'the splitter of knowledge' for his vast contributions to Islamic law and science.",
        descriptionAr:
          'مولد الإمام محمد الباقر، خامس أئمة أهل البيت، الملقَّب بباقر العلم لعظيم إسهاماته في الفقه والعلوم الإسلامية، سنة 57هـ.',
        type: 'BIRTH',
        yearAh: 57,
        perspective: 'SHIA',
      },
      {
        day: 13,
        title: 'Birth of Ali ibn Abi Talib (RA)',
        titleAr: 'مولد علي بن أبي طالب',
        description:
          "The birth of the Prophet's cousin, son-in-law, and the fourth Rightly Guided Caliph, in the precinct of the Kaaba in Makkah, 23 years before the Hijra.",
        descriptionAr:
          'مولد الإمام علي بن أبي طالب رضي الله عنه، ابن عم النبي ﷺ وزوج ابنته، رابع الخلفاء الراشدين، في جوف الكعبة المشرَّفة قبل الهجرة بـ 23 سنة.',
        type: 'BIRTH',
        yearAh: -23,
        notes:
          'The detail of birth at the Kaaba is recorded in classical biographical works and holds particular significance in Shia tradition.',
        notesAr:
          'تفصيل ولادته داخل الكعبة أو عندها مذكور في كتب السيرة الكلاسيكية كابن إسحاق، وله مكانة خاصة في الرواية الشيعية.',
        perspective: 'UNIVERSAL',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 25,
        title: 'Martyrdom of Imam Musa al-Kadhim',
        titleAr: 'استشهاد الإمام موسى الكاظم',
        description:
          'The passing of the seventh Imam in Baghdad after years of imprisonment during the Abbasid Caliphate in 183 AH.',
        descriptionAr:
          'وفاة الإمام موسى الكاظم سابع أئمة أهل البيت في بغداد بعد سنوات من السجن في عهد الخلافة العباسية، سنة 183هـ.',
        type: 'DEATH',
        yearAh: 183,
        perspective: 'SHIA',
      },
      {
        day: 27,
        title: "Al-Isra' wal-Mi'raj",
        titleAr: 'الإسراء والمعراج',
        description:
          'The miraculous Night Journey of Prophet Muhammad (PBUH) from Makkah to Jerusalem and his subsequent ascension to the Heavens.',
        descriptionAr:
          'الرحلة المعجزة للنبي محمد ﷺ ليلًا من المسجد الحرام بمكة إلى المسجد الأقصى بالقدس، ثم عُرج به إلى السماوات العلى.',
        type: 'RELIGIOUS',
        yearAh: -1,
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      {
        day: 27,
        title: 'Liberation of Jerusalem',
        titleAr: 'تحرير القدس',
        description:
          'In 583 AH (1187 CE), Sultan Salahuddin al-Ayyubi recaptured Jerusalem from the Crusaders after 88 years of occupation, following his decisive victory at the Battle of Hattin.',
        descriptionAr:
          'في سنة 583هـ (1187م) استعاد السلطان صلاح الدين الأيوبي بيت المقدس من الصليبيين بعد 88 عامًا من الاحتلال، إثر انتصاره الحاسم في معركة حطين. ضمن سلامة المدنيين، وعاد الأذان يصدح من المسجد الأقصى. يُعد نموذجًا خالدًا للفروسية والعدل في الإسلام.',
        type: 'HISTORICAL',
        yearAh: 583,
        perspective: 'UNIVERSAL',
      },
    ],
  },

  // ── 8. Sha'ban ──────────────────────────────────────────────────────
  {
    monthId: 8,
    monthName: "Sha'ban",
    monthNameAr: 'شعبان',
    events: [
      {
        day: 3,
        title: 'Birth of Imam Hussain ibn Ali (RA)',
        titleAr: 'مولد الإمام الحسين بن علي',
        description:
          "The birth of the Prophet's second grandson and the martyr of Karbala in 4 AH.",
        descriptionAr:
          'مولد سبط النبي ﷺ الإمام الحسين بن علي رضي الله عنه، سيد شباب أهل الجنة وشهيد كربلاء، سنة 4هـ.',
        type: 'BIRTH',
        yearAh: 4,
        perspective: 'UNIVERSAL',
      },
      {
        day: 4,
        title: 'Birth of Abbas ibn Ali (RA)',
        titleAr: 'مولد العباس بن علي',
        description:
          'Birth of the son of Ali ibn Abi Talib and Umm ul-Banin, celebrated for his peerless bravery and loyalty in 26 AH.',
        descriptionAr:
          'مولد العباس بن علي بن أبي طالب وأمه أم البنين، صاحب اللواء يوم كربلاء، المشهور بشجاعته الفائقة ووفائه، سنة 26هـ.',
        type: 'BIRTH',
        yearAh: 26,
        perspective: 'SHIA',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      {
        day: 15,
        title: "Laylat al-Bara'at (Mid-Sha'ban)",
        titleAr: 'ليلة النصف من شعبان (ليلة البراءة)',
        description:
          'The Night of Records or Forgiveness, where Muslims pray for divine mercy and the deceased.',
        descriptionAr:
          'ليلة النصف من شعبان، وتُعرف بليلة البراءة. ليلة قيام واستغفار وذكر، يدعو فيها المسلمون لله بالمغفرة وللأموات بالرحمة.',
        type: 'RELIGIOUS',
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      AYYAM_AL_BID(15),
      {
        day: 15,
        title: 'Change of the Qibla',
        titleAr: 'تحويل القبلة',
        description:
          'The official shift of the direction of prayer from Masjid al-Aqsa in Jerusalem to the Kaaba in Makkah during 2 AH.',
        descriptionAr:
          'تحويل القبلة من المسجد الأقصى في القدس إلى الكعبة المشرَّفة في مكة، سنة 2هـ.',
        type: 'RELIGIOUS',
        yearAh: 2,
        perspective: 'UNIVERSAL',
      },
      {
        day: 15,
        title: 'Birth of Imam Muhammad al-Mahdi',
        titleAr: 'مولد الإمام محمد المهدي',
        description:
          'The birth of the twelfth and final Imam of the Twelver lineage in Samarra, 255 AH.',
        descriptionAr:
          'مولد الإمام محمد المهدي، الثاني عشر والأخير من أئمة الإثني عشرية، في سامراء سنة 255هـ.',
        type: 'BIRTH',
        yearAh: 255,
        perspective: 'SHIA',
      },
    ],
  },

  // ── 9. Ramadan ──────────────────────────────────────────────────────
  {
    monthId: 9,
    monthName: 'Ramadan',
    monthNameAr: 'رمضان',
    events: [
      {
        day: 1,
        title: 'Beginning of Ramadan',
        titleAr: 'أول رمضان',
        description:
          'The formal decree establishing fasting during the month of Ramadan as one of the Five Pillars of Islam, occurring in the second year after Hijra.',
        descriptionAr:
          'بداية شهر رمضان المبارك، الشهر الذي فُرض فيه الصيام ركنًا من أركان الإسلام الخمسة سنة 2هـ، شهر القرآن وليلة القدر.',
        type: 'RELIGIOUS',
        yearAh: 2,
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      {
        day: 10,
        title: "Passing of Khadija bint Khuwaylid",
        titleAr: 'وفاة السيدة خديجة بنت خويلد',
        description:
          "The death of the Prophet Muhammad's first wife and first convert to Islam, marking the beginning of 'Am al-Huzn (The Year of Sorrow).",
        descriptionAr:
          'وفاة أم المؤمنين خديجة بنت خويلد رضي الله عنها، أولى زوجات النبي ﷺ وأول من آمن به. مثَّلت وفاتها بداية "عام الحزن" قبل البعثة بثلاث سنوات.',
        type: 'DEATH',
        yearAh: -3,
        perspective: 'UNIVERSAL',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 15,
        title: 'Birth of Al-Hasan ibn Ali',
        titleAr: 'مولد الإمام الحسن بن علي',
        description:
          'The birth of the eldest son of Ali ibn Abi Talib and Fatimah az-Zahra, and the first grandson of Prophet Muhammad (PBUH) in 3 AH.',
        descriptionAr:
          'مولد الإمام الحسن بن علي بن أبي طالب وفاطمة الزهراء، أكبر أحفاد النبي ﷺ، سنة 3هـ.',
        type: 'BIRTH',
        yearAh: 3,
        perspective: 'UNIVERSAL',
      },
      {
        day: 17,
        title: 'Nuzool al-Quran (First Revelation)',
        titleAr: 'نزول القرآن (بدء الوحي)',
        description:
          'The first verses of the Quran were revealed to Prophet Muhammad (PBUH) through Jibreel (AS) in the Cave of Hira during Ramadan.',
        descriptionAr:
          'نزل أول الوحي على النبي محمد ﷺ بواسطة جبريل عليه السلام في غار حراء بقوله: «اقرأ باسم ربك الذي خلق» (العلق:1). فعاد ﷺ مرتعدًا إلى السيدة خديجة التي كانت أول من آمن به وقالت له: "والله لا يخزيك الله أبدًا". بدأت بهذا اللحظة رحلة الوحي التي امتدت 23 عامًا.',
        type: 'RELIGIOUS',
        isMajorHoliday: true,
        notes:
          'The exact night of the first revelation is not definitively known — Day 17 is the most cited classical date.',
        notesAr:
          'لم تُعرف الليلة الأولى للوحي على وجه التحديد، لكنها في العشر الأواخر من رمضان. يوم 17 هو الأكثر ذكرًا في كتب السيرة. ترتبط روحيًا بليلة القدر.',
        perspective: 'UNIVERSAL',
      },
      {
        day: 17,
        title: 'Battle of Badr',
        titleAr: 'غزوة بدر الكبرى',
        description:
          'The first major military engagement in Islamic history where a smaller Muslim force defeated the Quraish army.',
        descriptionAr:
          'أول مواجهة عسكرية كبرى في تاريخ الإسلام، انتصرت فيها قوة مسلمة قليلة العدد على جيش قريش الكبير، فأرسى اللهُ بها هيبةَ الإسلام السياسيةَ والعسكريةَ سنة 2هـ.',
        type: 'HISTORICAL',
        yearAh: 2,
        perspective: 'UNIVERSAL',
      },
      {
        day: 20,
        title: 'Fath Makkah (Conquest of Makkah)',
        titleAr: 'فتح مكة',
        description:
          'The bloodless re-entry into Makkah by Prophet Muhammad (PBUH) and 10,000 companions in 8 AH, resulting in the removal of idols from the Kaaba.',
        descriptionAr:
          'دخول النبي ﷺ مكة فاتحًا بعشرة آلاف من أصحابه سنة 8هـ دون إراقة دماء، وكسر الأصنام من حول الكعبة المشرَّفة وتطهيرها.',
        type: 'HISTORICAL',
        yearAh: 8,
        perspective: 'UNIVERSAL',
      },
      {
        day: 21,
        title: 'Martyrdom of Ali ibn Abi Talib',
        titleAr: 'استشهاد علي بن أبي طالب',
        description:
          'The death of the fourth Rightly Guided Caliph following the assassination by Abd al-Rahman ibn Muljam in Kufa, 40 AH.',
        descriptionAr:
          'استشهاد الإمام علي بن أبي طالب رضي الله عنه، رابع الخلفاء الراشدين، إثر طعنه على يد عبد الرحمن بن ملجم في الكوفة سنة 40هـ.',
        type: 'DEATH',
        yearAh: 40,
        perspective: 'UNIVERSAL',
      },
      {
        day: 27,
        title: 'Laylat al-Qadr (The Night of Power)',
        titleAr: 'ليلة القدر',
        description:
          'The night traditionally observed as the most likely date for the first revelation of the Quran and considered better than a thousand months.',
        descriptionAr:
          'الليلة الأرجح لنزول القرآن الكريم، وهي خير من ألف شهر، وتُلتمس في الوتر من العشر الأواخر من رمضان.',
        type: 'RELIGIOUS',
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
    ],
  },

  // ── 10. Shawwal ─────────────────────────────────────────────────────
  {
    monthId: 10,
    monthName: 'Shawwal',
    monthNameAr: 'شوال',
    events: [
      {
        day: 1,
        title: 'Eid al-Fitr',
        titleAr: 'عيد الفطر',
        description:
          'The festival of breaking the fast, marking the end of Ramadan. A day of gratitude and congregational prayer.',
        descriptionAr:
          'عيد الفطر المبارك، يأتي بعد انتهاء شهر رمضان، وهو يوم شكر وفرح وصلاة العيد جماعةً. الصيام فيه محرم.',
        type: 'RELIGIOUS',
        yearAh: 2,
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      {
        day: 5,
        title: 'Battle of Khandaq (The Trench)',
        titleAr: 'غزوة الخندق (الأحزاب)',
        description:
          'In Shawwal 5 AH, a coalition of about 10,000 fighters besieged Madinah. On Salman al-Farisi\'s advice, the Muslims dug a defensive trench — a tactic unknown in Arabian warfare.',
        descriptionAr:
          'في شوال سنة 5هـ تجمع حوالي 10,000 مقاتل من الأحزاب لحصار المدينة. أشار سلمان الفارسي رضي الله عنه بحفر خندق دفاعي شمال المدينة، وهي خطة غير معروفة في الحرب العربية. عجز الأحزاب عن اقتحام الخندق وتفرَّقوا بعد 27 يومًا. أنزل الله في ذلك سورة الأحزاب (33: 9-27).',
        type: 'HISTORICAL',
        yearAh: 5,
        perspective: 'UNIVERSAL',
      },
      {
        day: 6,
        title: 'Six Days of Shawwal',
        titleAr: 'صيام الست من شوال',
        description:
          'A highly recommended (Mustahabb) act of worship which, when combined with Ramadan, is equivalent to fasting for the entire year.',
        descriptionAr:
          'صيام مستحب لستة أيام من شوال. من أتبع رمضان بصيام ست من شوال كان كصيام الدهر، كما ورد في الحديث الصحيح.',
        type: 'RELIGIOUS',
        yearAh: 2,
        perspective: 'UNIVERSAL',
      },
      {
        day: 7,
        title: 'Battle of Uhud',
        titleAr: 'غزوة أحد',
        description:
          'The second major military encounter between the Muslims and the Meccan Quraish in 3 AH, resulting in significant losses for the Muslims.',
        descriptionAr:
          'ثاني المواجهات الكبرى بين مسلمي المدينة وقريش مكة سنة 3هـ، استُشهد فيها سبعون من الصحابة على رأسهم حمزة بن عبد المطلب رضي الله عنه.',
        type: 'HISTORICAL',
        yearAh: 3,
        notes:
          "Classical sources including Ibn Hisham and Bukhari place this on 7 Shawwal 3 AH.",
        notesAr:
          'تذكر المصادر الكلاسيكية كابن هشام وابن إسحاق وصحيح البخاري في كتاب المغازي أن المعركة وقعت في 7 شوال سنة 3هـ.',
        perspective: 'UNIVERSAL',
      },
      {
        day: 7,
        title: 'Martyrdom of Hamza ibn Abdul Muttalib',
        titleAr: 'استشهاد حمزة بن عبد المطلب',
        description:
          "The death of the Prophet's uncle, known as 'Asadullah' (The Lion of Allah), during the Battle of Uhud in 3 AH.",
        descriptionAr:
          'استشهاد أسد الله سيد الشهداء حمزة بن عبد المطلب رضي الله عنه، عم النبي ﷺ، يوم غزوة أحد سنة 3هـ.',
        type: 'DEATH',
        yearAh: 3,
        perspective: 'UNIVERSAL',
      },
      {
        day: 8,
        title: 'The Battle of Hunayn',
        titleAr: 'غزوة حنين',
        description:
          'Occurred immediately after the Conquest of Makkah in 8 AH. Mentioned in the Quran (9:25) regarding the lesson of reliance on Allah over pride in numbers.',
        descriptionAr:
          'وقعت بعد فتح مكة مباشرة سنة 8هـ، وذكرها الله في سورة التوبة (9:25) درسًا في عدم الاغترار بكثرة العدد والاعتماد على الله وحده.',
        type: 'HISTORICAL',
        yearAh: 8,
        perspective: 'UNIVERSAL',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 25,
        title: "Passing of Imam Ja'far al-Sadiq",
        titleAr: 'وفاة الإمام جعفر الصادق',
        description:
          "The death of the sixth Imam of the Ahl al-Bayt and the polymath founder of the Ja'fari school of law in 148 AH.",
        descriptionAr:
          'وفاة الإمام جعفر الصادق سادس أئمة أهل البيت ومؤسس المذهب الجعفري في الفقه، سنة 148هـ.',
        type: 'DEATH',
        yearAh: 148,
        perspective: 'SHIA',
      },
    ],
  },

  // ── 11. Dhu al-Qidah ────────────────────────────────────────────────
  {
    monthId: 11,
    monthName: 'Dhu al-Qidah',
    monthNameAr: 'ذو القعدة',
    isSacred: true,
    events: [
      {
        day: 1,
        title: "Birth of Fatima bint Musa (Al-Ma'sumah)",
        titleAr: 'مولد فاطمة المعصومة',
        description:
          'The birth of the daughter of the seventh Imam and sister of Imam Ali al-Rida, revered for her scholarship and piety, in 173 AH.',
        descriptionAr:
          'مولد السيدة فاطمة المعصومة بنت الإمام موسى الكاظم وأخت الإمام علي الرضا، سنة 173هـ.',
        type: 'BIRTH',
        yearAh: 173,
        perspective: 'SHIA',
      },
      {
        day: 5,
        title: 'Treaty of Hudaybiyyah',
        titleAr: 'صلح الحديبية',
        description:
          "A 10-year peace treaty signed in 6 AH between Prophet Muhammad (PBUH) and the Quraysh near Makkah. Allah called it a 'manifest victory' (Quran 48:1).",
        descriptionAr:
          'معاهدة سلام لعشر سنوات وُقعت سنة 6هـ بين النبي ﷺ وقادة قريش قرب مكة. ورغم بنود بدت في ظاهرها غير مواتية، سمَّاها الله تعالى "فتحًا مبينًا" (الفتح:1). أوقفت الحرب وفتحت الجزيرة لانتشار الإسلام، ودخل الناس في دين الله أفواجًا.',
        type: 'HISTORICAL',
        yearAh: 6,
        perspective: 'UNIVERSAL',
      },
      {
        day: 11,
        title: 'Birth of Imam Ali al-Rida',
        titleAr: 'مولد الإمام علي الرضا',
        description:
          'The birth of the eighth Imam of the Ahl al-Bayt in Madinah, 148 AH, known for his theological debates.',
        descriptionAr:
          'مولد الإمام علي بن موسى الرضا، ثامن أئمة أهل البيت، في المدينة سنة 148هـ، اشتُهر بمناظراته العلمية ودوره في البلاط العباسي.',
        type: 'BIRTH',
        yearAh: 148,
        perspective: 'SHIA',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 25,
        title: 'Dahw al-Ard',
        titleAr: 'دحو الأرض',
        description:
          'A day marking the traditional spreading of the earth from beneath the Kaaba and the birth of Prophet Ibrahim and Prophet Isa.',
        descriptionAr:
          'يوم له معنى ديني: تُذكر فيه روايةُ بسط الأرض من تحت الكعبة، ومولد النبيين إبراهيم وعيسى عليهما السلام.',
        type: 'RELIGIOUS',
        perspective: 'SHIA',
      },
      {
        day: 29,
        title: 'Passing of Imam Muhammad al-Jawad',
        titleAr: 'وفاة الإمام محمد الجواد',
        description:
          'The martyrdom of the ninth Imam, also known as At-Taqi, in Baghdad at the age of 25 in 220 AH.',
        descriptionAr:
          'استشهاد الإمام محمد الجواد المعروف بالتقي، تاسع أئمة أهل البيت، في بغداد وعمره خمسة وعشرون عامًا، سنة 220هـ.',
        type: 'DEATH',
        yearAh: 220,
        perspective: 'SHIA',
      },
    ],
  },

  // ── 12. Dhu al-Hijjah ───────────────────────────────────────────────
  {
    monthId: 12,
    monthName: 'Dhu al-Hijjah',
    monthNameAr: 'ذو الحجة',
    isSacred: true,
    events: [
      {
        day: 1,
        title: 'Marriage of Ali ibn Abi Talib and Fatima az-Zahra',
        titleAr: 'زواج علي وفاطمة الزهراء',
        description:
          "The sacred union of the Prophet's daughter and cousin in 2 AH, which established the lineage of the Ahl al-Bayt.",
        descriptionAr:
          'الزواج الميمون بين الإمام علي بن أبي طالب والسيدة فاطمة الزهراء بنت النبي ﷺ سنة 2هـ، وهو الزواج الذي تأسست به ذرية أهل البيت.',
        type: 'HISTORICAL',
        yearAh: 2,
        perspective: 'UNIVERSAL',
      },
      {
        day: 1,
        title: 'First Ten Days of Dhu al-Hijjah',
        titleAr: 'العشر الأوائل من ذي الحجة',
        description:
          'A period of high virtue for fasting, remembrance (dhikr), and good deeds, considered superior to all other days.',
        descriptionAr:
          'العشر الأوائل من ذي الحجة، أفضل أيام الدنيا. مستحب فيها الإكثار من العبادة والذكر والصيام والصدقة.',
        type: 'RECURRING_RITUAL',
        perspective: 'UNIVERSAL',
      },
      {
        day: 7,
        title: 'Passing of Imam Muhammad al-Baqir',
        titleAr: 'وفاة الإمام محمد الباقر',
        description:
          'The death of the fifth Imam in Madinah, 114 AH, a pivotal figure in the codification of Islamic law and traditions.',
        descriptionAr:
          'وفاة الإمام محمد الباقر، خامس أئمة أهل البيت، في المدينة سنة 114هـ. شخصية محورية في تدوين الفقه والحديث.',
        type: 'DEATH',
        yearAh: 114,
        perspective: 'SHIA',
      },
      {
        day: 8,
        title: 'Hajjat al-Wada (Farewell Pilgrimage)',
        titleAr: 'حجة الوداع',
        description:
          "Prophet Muhammad's only and final complete Hajj in 10 AH. On the Day of Arafah he delivered the landmark Farewell Sermon.",
        descriptionAr:
          'حجة النبي ﷺ الوحيدة والأخيرة سنة 10هـ، رافقه فيها عشرات الآلاف من الصحابة. وفي يوم عرفة ألقى ﷺ خطبة الوداع التي أرست أصول حقوق الإنسان والمساواة والإخاء في الإسلام.',
        type: 'HISTORICAL',
        yearAh: 10,
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      {
        day: 9,
        title: 'Day of Arafah',
        titleAr: 'يوم عرفة',
        description:
          'The pinnacle of the Hajj pilgrimage where pilgrims gather at Mount Arafat to pray and seek forgiveness.',
        descriptionAr:
          'الركن الأعظم للحج، يقف فيه الحجيج على صعيد عرفات بالدعاء والاستغفار. صيامه مستحب لغير الحاج، يكفّر سنتين كما ورد في الحديث.',
        type: 'RELIGIOUS',
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      {
        day: 10,
        title: 'Eid al-Adha',
        titleAr: 'عيد الأضحى',
        description:
          'The Festival of Sacrifice, commemorating the willingness of Prophet Ibrahim (AS) to sacrifice his son in obedience to Allah.',
        descriptionAr:
          'عيد الأضحى المبارك، يخلِّد ذكرى استعداد النبي إبراهيم عليه السلام للتضحية بابنه طاعةً لأمر الله. يوم عيد ونحر للأضاحي. الصيام فيه محرم.',
        type: 'RELIGIOUS',
        yearAh: 2,
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      AYYAM_AT_TASHRIQ(11),
      AYYAM_AT_TASHRIQ(12),
      AYYAM_AT_TASHRIQ(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
      {
        day: 18,
        title: 'Eid al-Ghadir',
        titleAr: 'عيد الغدير',
        description:
          "The declaration at Ghadir Khumm where Prophet Muhammad announced Ali ibn Abi Talib as the 'Mawla' (master) of the believers in 10 AH.",
        descriptionAr:
          'إعلان غدير خم، حيث قال النبي ﷺ لعلي بن أبي طالب رضي الله عنه: "من كنت مولاه فعلي مولاه"، سنة 10هـ بعد عودته من حجة الوداع.',
        type: 'HISTORICAL',
        yearAh: 10,
        isMajorHoliday: true,
        perspective: 'SHIA',
      },
      {
        day: 24,
        title: 'Event of Mubahala',
        titleAr: 'حادثة المباهلة',
        description:
          'The formal challenge of mutual imprecation between the Prophet and the Christians of Najran in 10 AH.',
        descriptionAr:
          'دعوة المباهلة بين النبي ﷺ ونصارى نجران سنة 10هـ، بحضور علي وفاطمة والحسنين عليهم السلام، ونزول قوله تعالى: "فمن حاجَّك فيه من بعد ما جاءك من العلم..." (آل عمران: 61).',
        type: 'HISTORICAL',
        yearAh: 10,
        perspective: 'SHIA',
      },
      {
        day: 26,
        title: 'Assassination of Caliph Umar ibn al-Khattab',
        titleAr: 'استشهاد الخليفة عمر بن الخطاب',
        description:
          'The fatal stabbing of the second Rightly Guided Caliph by Abu Lu\'lu\'a in Madinah in 23 AH.',
        descriptionAr:
          'استشهاد الخليفة الراشد الثاني عمر بن الخطاب رضي الله عنه طعنًا على يد أبي لؤلؤة المجوسي في المدينة المنورة، سنة 23هـ.',
        type: 'DEATH',
        yearAh: 23,
        perspective: 'UNIVERSAL',
      },
    ],
  },
];
