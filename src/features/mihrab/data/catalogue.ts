/**
 * Mihrab catalogue — the dhikr and sunnah the practice layer tracks.
 *
 * Kept as data, separate from the store and from the UI, so adding an item is a
 * one-line change with no component edits. Sources are named on every entry:
 * an app that puts words in a user's mouth as worship must be able to say where
 * they came from.
 */

export interface DhikrEntry {
  id: string;
  /** The words themselves. */
  text: string;
  /** Short label for the chip / counter header. */
  label: string;
  /** Conventional repetition count, used as the default target. */
  defaultTarget: number;
  /** Attribution. */
  source: string;
  /** Optional note on when it is said. */
  when?: string;
}

export const DHIKR_CATALOGUE: readonly DhikrEntry[] = [
  {
    id: 'subhan-allah',
    text: 'سُبْحَانَ اللَّهِ',
    label: 'سبحان الله',
    defaultTarget: 33,
    source: 'متفق عليه',
    when: 'بعد كل صلاة',
  },
  {
    id: 'alhamdulillah',
    text: 'الْحَمْدُ لِلَّهِ',
    label: 'الحمد لله',
    defaultTarget: 33,
    source: 'متفق عليه',
    when: 'بعد كل صلاة',
  },
  {
    id: 'allahu-akbar',
    text: 'اللَّهُ أَكْبَرُ',
    label: 'الله أكبر',
    defaultTarget: 34,
    source: 'متفق عليه',
    when: 'بعد كل صلاة',
  },
  {
    id: 'la-ilaha-illa-allah',
    text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    label: 'لا إله إلا الله',
    defaultTarget: 100,
    source: 'رواه البخاري',
    when: 'في اليوم',
  },
  {
    id: 'istighfar',
    text: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    label: 'الاستغفار',
    defaultTarget: 100,
    source: 'رواه البخاري',
    when: 'في اليوم',
  },
  {
    id: 'salat-nabi',
    text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    label: 'الصلاة على النبي ﷺ',
    defaultTarget: 100,
    source: 'مستحب في اليوم، وخاصة الجمعة',
    when: 'في اليوم',
  },
  {
    id: 'hawla',
    text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    label: 'لا حول ولا قوة إلا بالله',
    defaultTarget: 33,
    source: 'متفق عليه',
  },
  {
    id: 'subhan-wa-bihamdih',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    label: 'سبحان الله وبحمده',
    defaultTarget: 100,
    source: 'رواه البخاري',
    when: 'صباحاً ومساءً',
  },
  {
    id: 'hasbi-allah',
    text: 'حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ',
    label: 'حسبي الله ونعم الوكيل',
    defaultTarget: 40,
    source: 'أثر',
  },
];

export function findDhikr(id: string): DhikrEntry | undefined {
  return DHIKR_CATALOGUE.find((d) => d.id === id);
}

/* ── sunnah checklist ───────────────────────────────────────────────── */

export type SunnahSlot = 'morning' | 'day' | 'evening' | 'night' | 'anytime';

export interface SunnahEntry {
  id: string;
  title: string;
  /** One line on what the practice is. */
  detail: string;
  slot: SunnahSlot;
  source: string;
}

export const SUNNAH_SLOTS: readonly { key: SunnahSlot; label: string }[] = [
  { key: 'morning', label: 'الصباح' },
  { key: 'day', label: 'النهار' },
  { key: 'evening', label: 'المساء' },
  { key: 'night', label: 'الليل' },
  { key: 'anytime', label: 'في أي وقت' },
];

export const SUNNAH_CATALOGUE: readonly SunnahEntry[] = [
  {
    id: 'adhkar-sabah',
    title: 'أذكار الصباح',
    detail: 'ورد الصباح بعد الفجر إلى الضحى.',
    slot: 'morning',
    source: 'أذكار مأثورة',
  },
  {
    id: 'duha',
    title: 'صلاة الضحى',
    detail: 'ركعتان أو أكثر بعد ارتفاع الشمس.',
    slot: 'morning',
    source: 'رواه مسلم',
  },
  {
    id: 'rawatib',
    title: 'السنن الرواتب',
    detail: 'اثنتا عشرة ركعة موزعة على الصلوات الخمس.',
    slot: 'day',
    source: 'رواه مسلم',
  },
  {
    id: 'siwak',
    title: 'السواك',
    detail: 'عند كل وضوء وصلاة وعند الاستيقاظ.',
    slot: 'anytime',
    source: 'متفق عليه',
  },
  {
    id: 'sadaqa',
    title: 'صدقة اليوم',
    detail: 'ولو باليسير، فالصدقة تُطفئ الخطيئة.',
    slot: 'anytime',
    source: 'رواه الترمذي',
  },
  {
    id: 'quran-wird',
    title: 'ورد القرآن',
    detail: 'قدر ثابت من التلاوة كل يوم.',
    slot: 'anytime',
    source: 'سنة مؤكدة',
  },
  {
    id: 'adhkar-masaa',
    title: 'أذكار المساء',
    detail: 'ورد المساء بعد العصر إلى المغرب.',
    slot: 'evening',
    source: 'أذكار مأثورة',
  },
  {
    id: 'ayat-kursi',
    title: 'آية الكرسي قبل النوم',
    detail: 'من قرأها عند منامه لم يزل عليه حافظ من الله.',
    slot: 'night',
    source: 'رواه البخاري',
  },
  {
    id: 'witr',
    title: 'الوتر',
    detail: 'آخر صلاة الليل، ولا تُترك سفراً ولا حضراً.',
    slot: 'night',
    source: 'متفق عليه',
  },
  {
    id: 'wudu-before-sleep',
    title: 'الوضوء قبل النوم',
    detail: 'والنوم على الشق الأيمن.',
    slot: 'night',
    source: 'متفق عليه',
  },
  {
    id: 'ikhlas-muawwidhat',
    title: 'الإخلاص والمعوذتان',
    detail: 'ثلاثاً بعد الفجر وبعد المغرب وعند النوم.',
    slot: 'anytime',
    source: 'رواه أبو داود والترمذي',
  },
  {
    id: 'smile',
    title: 'إفشاء السلام والبِشر',
    detail: 'السلام على من عرفت ومن لم تعرف، وتبسّمك صدقة.',
    slot: 'anytime',
    source: 'متفق عليه',
  },
];

export function findSunnah(id: string): SunnahEntry | undefined {
  return SUNNAH_CATALOGUE.find((s) => s.id === id);
}

/** Sunnahs offered by default when the user has committed to nothing yet. */
export const SUGGESTED_SUNNAH: readonly string[] = [
  'adhkar-sabah',
  'rawatib',
  'adhkar-masaa',
  'ayat-kursi',
  'witr',
];
