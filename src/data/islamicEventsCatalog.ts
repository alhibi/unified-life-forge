/**
 * Comprehensive Hijri-calendar events catalog (Sunni / Universal only).
 *
 * Originally adapted from the Khushu open-source project
 * (https://github.com/greykaizen/khushu — `app/src/main/assets/catalogs/islamic-month-events.json`)
 * and trimmed to events recognised in mainstream Sunni Islamic tradition.
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

/**
 * Perspective tag retained for type-compatibility with downstream code.
 * The catalog only ever uses `UNIVERSAL` or `SUNNI` — sectarian/Shia events
 * are intentionally excluded from this build.
 */
export type EventPerspective = 'UNIVERSAL' | 'SUNNI';

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
        day: 9,
        title: 'Day of Tasua',
        titleAr: 'يوم تاسوعاء',
        description:
          'The ninth of Muharram. The Prophet (PBUH) intended to fast it alongside Ashura to differ from the People of the Book.',
        descriptionAr:
          'اليوم التاسع من محرم. عزم النبي ﷺ على صيامه مع عاشوراء مخالفةً لأهل الكتاب، فيُستحب صيامه مع العاشر.',
        type: 'RELIGIOUS',
        perspective: 'UNIVERSAL',
      },
      {
        day: 10,
        title: 'The Day of Ashura',
        titleAr: 'يوم عاشوراء',
        description:
          'A day of great virtue: Allah saved Prophet Musa and Bani Israel from Pharaoh on this day. The Prophet (PBUH) said its fast expiates the sins of the previous year.',
        descriptionAr:
          'يوم عظيم القدر: نجَّى الله فيه نبيَّه موسى عليه السلام وبني إسرائيل من فرعون. قال النبي ﷺ في صيامه: "أحتسب على الله أن يكفّر السنة التي قبله". صيامه مستحب.',
        type: 'RELIGIOUS',
        isMajorHoliday: true,
        perspective: 'UNIVERSAL',
      },
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
    ],
  },

  // ── 2. Safar ────────────────────────────────────────────────────────
  {
    monthId: 2,
    monthName: 'Safar',
    monthNameAr: 'صفر',
    events: [
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
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
        titleAr: 'وفاة النبي محمد ﷺ',
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
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
    ],
  },

  // ── 6. Jumada al-Thani ──────────────────────────────────────────────
  {
    monthId: 6,
    monthName: 'Jumada al-Thani',
    monthNameAr: 'جمادى الآخرة',
    events: [
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
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
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
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
        day: 17,
        title: 'Nuzool al-Quran (First Revelation)',
        titleAr: 'نزول القرآن (بدء الوحي)',
        description:
          'The first verses of the Quran were revealed to Prophet Muhammad (PBUH) through Jibreel (AS) in the Cave of Hira during Ramadan.',
        descriptionAr:
          'نزل أول الوحي على النبي محمد ﷺ بواسطة جبريل عليه السلام في غار حراء بقوله: «اقرأ باسم ربك الذي خلق» (العلق:1). فعاد ﷺ مرتعدًا إلى السيدة خديجة التي كانت أول من آمن به وقالت له: "والله لا يخزيك الله أبدًا". بدأت بهذه اللحظة رحلة الوحي التي امتدت 23 عامًا.',
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
        title: 'Last Ten Nights of Ramadan',
        titleAr: 'العشر الأواخر من رمضان',
        description:
          'The last ten nights of Ramadan, in which Laylat al-Qadr is sought. The Prophet (PBUH) used to intensify worship and observe i\'tikaf during these nights.',
        descriptionAr:
          'العشر الأواخر من شهر رمضان، يلتمس فيها المسلمون ليلة القدر. كان النبي ﷺ يجتهد فيها في العبادة ويعتكف، ويوقظ أهله لقيام الليل.',
        type: 'RECURRING_RITUAL',
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
      AYYAM_AL_BID(13),
      AYYAM_AL_BID(14),
      AYYAM_AL_BID(15),
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
