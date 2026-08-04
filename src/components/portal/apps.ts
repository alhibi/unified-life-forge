/**
 * Portal app registry — the single source of truth for the launcher.
 *
 * The portal used to inline this list inside `Portal.tsx`, which meant the
 * page component owned data, filtering, search keywords AND layout. Lifting
 * it here keeps the page presentational and lets the detail panel, the
 * search index and the (future) quick-action surfaces read one list.
 *
 * Design-system note: icons come from `@/lib/icons` (the product-wide
 * Phosphor set) — the portal no longer ships its own parallel glyph family.
 */
import {
  Activity,
  Archive,
  BookMarked,
  BookOpen,
  Brain,
  Calendar,
  ChevronRight,
  CloudSun,
  Compass,
  Crown,
  Dumbbell,
  Gamepad2,
  Globe,
  Grid3X3,
  HandHeart,
  type IconComponent,
  Languages,
  Layers,
  Library,
  Luggage,
  MapPinned,
  MessageCircle,
  MessageSquareText,
  Mic,
  Newspaper,
  PenLine,
  Puzzle,
  Scale,
  ScrollText,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Swords,
} from '@/lib/icons';

/** Filter buckets shown as the launcher's segmented control. */
export type PortalCategory = 'spirit' | 'body' | 'mind' | 'play';

export interface PortalLink {
  path: string;
  label: string;
  /** One-line explanation shown under the label in the detail panel. */
  note: string;
  icon: IconComponent;
}

export interface PortalApp {
  /** Stable id — also the localStorage key for pins and recents. */
  key: string;
  path: string;
  /** Arabic display name. */
  label: string;
  /** Wide-tracked latin micro-caps shown under the name. */
  caption: string;
  /** One short line describing what lives inside. */
  description: string;
  cat: PortalCategory;
  icon: IconComponent;
  /** Extra search terms (Arabic + latin) so the filter finds the app. */
  keywords: string;
  links: PortalLink[];
}

export const PORTAL_APPS: readonly PortalApp[] = [
  {
    key: 'now',
    path: '/now',
    label: 'الرئيسي',
    caption: 'NOW',
    description: 'الصلاة، الطقس، ونبض الأمة',
    cat: 'spirit',
    icon: Sparkles,
    keywords: 'now home صلاة طقس رئيسي الآن نبض',
    links: [
      { path: '/now', label: 'لوحة الآن', note: 'الصلاة القادمة وسنة الوقت', icon: Sun },
      { path: '/weather', label: 'الطقس', note: 'الحالة، الأشعة، وجودة الهواء', icon: CloudSun },
      { path: '/occasions', label: 'المناسبات', note: 'التقويم الهجري والمواسم', icon: Calendar },
    ],
  },
  {
    key: 'quran',
    path: '/quran',
    label: 'القرآن',
    caption: 'QURAN',
    description: 'المصحف الشريف والتلاوة والتفسير',
    cat: 'spirit',
    icon: BookOpen,
    keywords: 'quran quran quran quran قرآن مصحف تلاوة تفسير',
    links: [
      { path: '/quran', label: 'القرآن الكريم', note: 'تلاوة الورد اليومي والختمة', icon: BookOpen },
      { path: '/tafsir', label: 'التفسير', note: 'شرح وتفسير الآيات الكريمة', icon: ScrollText },
    ],
  },
  {
    key: 'dhikr',
    path: '/dhikr',
    label: 'الذكر',
    caption: 'DHIKR',
    description: 'أذكار الصباح والمساء والتسبيح',
    cat: 'spirit',
    icon: HandHeart,
    keywords: 'dhikr duas أذكار أذكار أدعية ذكر صباح مساء تسبيح سبحة',
    links: [
      { path: '/dhikr', label: 'الذكر والأذكار', note: 'المسبحة الإلكترونية وأذكار اليوم', icon: HandHeart },
    ],
  },
  {
    key: 'sunnah',
    path: '/sunnah',
    label: 'السنة',
    caption: 'SUNNAH',
    description: 'السنن اليومية واليوم النبوي',
    cat: 'spirit',
    icon: BookMarked,
    keywords: 'sunnah سنن سنة نبوية اليوم النبوي رسول الله',
    links: [
      { path: '/sunnah', label: 'السنّة النبوية', note: 'السنن اليومية والtracker', icon: BookMarked },
      { path: '/section/timed-sunnah', label: 'السنن المؤقتة', note: 'المرتبطة بالأوقات', icon: BookMarked },
      { path: '/section/untimed-sunnah', label: 'السنن غير المؤقتة', note: 'يومية عامة', icon: ScrollText },
      { path: '/section/prophetic-day', label: 'اليوم النبوي', note: 'ثمانية أطوار', icon: Sun },
    ],
  },
  {
    key: 'diwan',
    path: '/diwan',
    label: 'الأدب',
    caption: 'DIWAN',
    description: 'الشعراء والقصائد والمختارات الشعرية',
    cat: 'mind',
    icon: Library,
    keywords: 'diwan poetry أدب ديوان شعر شعراء قصائد أدبيات مكتبة',
    links: [
      { path: '/diwan', label: 'الأدب العربي', note: 'المكتبة الكبرى ومجالس الأدب', icon: Library },
      { path: '/diwan/library/search', label: 'البحث في القصائد', note: 'بحث في 3 ملايين بيت', icon: Search },
      { path: '/diwan/library/poets', label: 'شجرة الشعراء', note: 'الشعراء مرتبون بالعصور', icon: PenLine },
      { path: '/diwan/library/favorites', label: 'المفضلة الخاصة', note: 'قصائدك المحفوظة والفريدة', icon: BookMarked },
      { path: '/diwan/bayan', label: 'البيان الإعرابي والبلاغي', note: 'محلل عروضي وصرفي عميق', icon: Sparkles },
    ],
  },
  {
    key: 'wellness',
    path: '/wellness',
    label: 'العافية',
    caption: 'WELLNESS',
    description: 'تدريب، تغذية، ومذكرة',
    cat: 'body',
    icon: Dumbbell,
    keywords: 'wellness fitness عافية تدريب تغذية رياضة مذكرة يوميات',
    links: [
      { path: '/wellness', label: 'مركز العافية', note: 'التمارين والخطط', icon: Dumbbell },
      { path: '/journal', label: 'مذكرتي', note: 'تدوين الحال والعادات', icon: PenLine },
    ],
  },
  {
    key: 'fitness',
    path: '/fitness',
    label: 'اللياقة البدنية',
    caption: 'FITNESS',
    description: 'تتبع المسارات الجغرافية، جداول التمارين، وتطور مؤشرات الجسم',
    cat: 'body',
    icon: Activity,
    keywords: 'fitness running walking tracking gps body weight لياقة بدنية مشي جري تتبع جداول تمارين وزن جسم',
    links: [
      { path: '/fitness', label: 'تتبع الأنشطة الحية', note: 'تتبع GPS ذكي وحالة التسارع', icon: Activity },
      { path: '/fitness', label: 'جداول التمارين الأسبوعية', note: 'تخطيط الجلسات ومؤقت الاستراحة', icon: Calendar },
      { path: '/fitness', label: 'مؤشرات وتطور الجسم', note: 'تسجيل قياسات الوزن ونسبة الدهون', icon: Scale },
    ],
  },
  {
    key: 'journal',
    path: '/journal',
    label: 'مذكرتي',
    caption: 'JOURNAL',
    description: 'دفتر يومي يعكس توازنك وعاداتك',
    cat: 'body',
    icon: PenLine,
    keywords: 'journal diary مذكرة يوميات مذكرتي عافية',
    links: [
      { path: '/journal', label: 'مذكرتي', note: 'تدوين الحال والعادات', icon: PenLine },
    ],
  },
  {
    key: 'chat',
    path: '/chat',
    label: 'الدردشة',
    caption: 'CHAT',
    description: 'محادثات خاصة ومجموعات',
    cat: 'mind',
    icon: MessageCircle,
    keywords: 'chat messages دردشة محادثات رسائل مجموعات قنوات',
    links: [
      { path: '/chat', label: 'المحادثات', note: 'كل الرسائل', icon: MessageSquareText },
      { path: '/chat/groups', label: 'المجموعات والقنوات', note: 'الغرف المشتركة', icon: Layers },
      { path: '/chat/settings', label: 'إعدادات الدردشة', note: 'الخصوصية والتنبيهات', icon: Settings2 },
    ],
  },
  {
    key: 'podcasts',
    path: '/podcasts',
    label: 'البودكاست',
    caption: 'PODCASTS',
    description: 'المكتبة والحلقات والسجل',
    cat: 'mind',
    icon: Mic,
    keywords: 'podcasts audio بودكاست حلقات صوت استماع',
    links: [
      { path: '/podcasts', label: 'الاستكشاف', note: 'كل البودكاست', icon: Compass },
      { path: '/podcasts/library', label: 'مكتبتي', note: 'الاشتراكات والمحفوظ', icon: Library },
      { path: '/podcasts/history', label: 'السجل', note: 'ما استمعت إليه', icon: Archive },
    ],
  },
  {
    key: 'reading',
    path: '/reading',
    label: 'القراءة',
    caption: 'READING',
    description: 'المقالات ومصادر الأخبار',
    cat: 'mind',
    icon: Newspaper,
    keywords: 'reading articles rss قراءة مقالات أخبار اطلاع مصادر',
    links: [
      { path: '/reading', label: 'موجز القراءة', note: 'أحدث المقالات', icon: Newspaper },
      { path: '/reading/discover', label: 'اكتشاف المصادر', note: 'مكتبة الخلاصات', icon: Compass },
    ],
  },
  {
    key: 'knowledge',
    path: '/knowledge',
    label: 'المعرفة',
    caption: 'KNOWLEDGE',
    description: 'موسوعة، أرشيف، وذاكرة',
    cat: 'mind',
    icon: Crown,
    keywords: 'knowledge معرفة موسوعة أرشيف ملاحظات ذاكرة',
    links: [
      { path: '/knowledge', label: 'الموسوعة', note: 'المدخل الرئيسي', icon: Crown },
      { path: '/archive', label: 'الأرشيف', note: 'المحفوظات والقراءة', icon: Archive },
      { path: '/pkm', label: 'الذاكرة', note: 'الملاحظات والخرائط', icon: Brain },
    ],
  },
  {
    key: 'archive',
    path: '/archive',
    label: 'أرشيف المعرفة',
    caption: 'ARCHIVE',
    description: 'مونوغرافات وأبحاث مولّدة بذكاء اصطناعي',
    cat: 'mind',
    icon: Archive,
    keywords: 'archive أرشيف مونوغرافات معرفة بحث ذكاء',
    links: [
      { path: '/archive', label: 'الأرشيف المعرفي', note: 'المحفوظات والقراءة', icon: Archive },
      { path: '/archive/new', label: 'توليد جديد', note: 'مونوغراف ذكي لموضوع جديد', icon: Sparkles },
    ],
  },
  {
    key: 'pkm',
    path: '/pkm',
    label: 'الذاكرة الرقمية',
    caption: 'MEMORY',
    description: 'ملاحظات محلية بوسم متداخل وبحث فوري',
    cat: 'mind',
    icon: Brain,
    keywords: 'pkm notes memory ذاكرة ملاحظات مذكرتي وسم الذاكرة الرقمية',
    links: [
      { path: '/pkm', label: 'الذاكرة الشخصية', note: 'ملاحظاتك وأفكارك المصنفة', icon: Brain },
    ],
  },
  {
    key: 'atlas',
    path: '/travel-atlas',
    label: 'أطلس الرحلات',
    caption: 'ATLAS',
    description: 'خريطة أماكنك ورحلاتك',
    cat: 'mind',
    icon: MapPinned,
    keywords: 'atlas travel trips map أطلس رحلات سفر خريطة أماكن دول مدن سياحة وجهات',
    links: [
      { path: '/travel-atlas', label: 'الخريطة', note: 'دولك على الكرة الأرضية', icon: Globe },
      { path: '/travel-atlas/trips', label: 'رحلاتي', note: 'الخطط يومًا بيوم', icon: Luggage },
    ],
  },
  {
    key: 'games',
    path: '/games',
    label: 'الألعاب',
    caption: 'GAMES',
    description: 'شطرنج، سودوكو، وأزواج الذاكرة',
    cat: 'play',
    icon: Gamepad2,
    keywords: 'games ألعاب شطرنج سودوكو ذاكرة تحديات',
    links: [
      { path: '/games', label: 'صالة الألعاب', note: 'الملف والتقدّم', icon: Gamepad2 },
      { path: '/games/chess', label: 'الشطرنج', note: 'مباريات وألغاز', icon: Swords },
      { path: '/games/sudoku', label: 'سودوكو', note: 'خمس درجات', icon: Grid3X3 },
      { path: '/games/memory', label: 'أزواج الذاكرة', note: 'أطوار متعددة', icon: Puzzle },
    ],
  },
  {
    key: 'de-learning',
    path: '/de-learning',
    label: 'ديوان الألمانية',
    caption: 'DE-LEARNING',
    description: 'تعلم الألمانية بأسلوب منهجي برابط لغوي مبتكر مع لغتك العربية',
    cat: 'mind',
    icon: Languages,
    keywords: 'de-learning german lingo language study ألماني ألمانية لغة دراسة ديوان فكر',
    links: [
      { path: '/de-learning', label: 'ديوان الألمانية', note: 'اللوحة الرئيسية للوحدات والدروس', icon: Languages },
    ],
  },
] as const;

export const PORTAL_CATEGORIES: readonly { key: PortalCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'spirit', label: 'الروح' },
  { key: 'body', label: 'الجسد' },
  { key: 'mind', label: 'العقل' },
  { key: 'play', label: 'اللعب' },
] as const;

export function findApp(key: string): PortalApp | undefined {
  return PORTAL_APPS.find((a) => a.key === key);
}

/** Arabic-aware normaliser: strips tashkeel and unifies alef/ya/ta-marbuta. */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .toLowerCase()
    .trim();
}

/**
 * Substring match across name, caption, description, deep-link labels and
 * keywords. Deliberately not fuzzy: on a seven-item launcher a fuzzy matcher
 * returns everything and reads as broken.
 */
export function matchesQuery(app: PortalApp, rawQuery: string): boolean {
  const q = normalizeArabic(rawQuery);
  if (!q) return true;
  const haystack = normalizeArabic(
    [app.label, app.caption, app.description, app.keywords, ...app.links.map((l) => l.label)].join(' '),
  );
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export { ChevronRight };
