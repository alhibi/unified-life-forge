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
  ScrollText,
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
    key: 'mihrab',
    path: '/mihrab',
    label: 'المحراب',
    caption: 'MIHRAB',
    description: 'القرآن، الأذكار، والسنن',
    cat: 'spirit',
    icon: BookOpen,
    keywords: 'mihrab quran محراب قرآن أذكار سنن تفسير دعاء',
    links: [
      { path: '/mihrab', label: 'المحراب', note: 'القرآن والتلاوة', icon: BookOpen },
      { path: '/duas', label: 'الأدعية', note: 'أذكار الصباح والمساء', icon: HandHeart },
      { path: '/tafsir', label: 'التفسير', note: 'شرح الآيات', icon: ScrollText },
      { path: '/mihrab/prayer-guide', label: 'دليل الصلاة', note: 'خطوة بخطوة', icon: BookMarked },
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
    key: 'browse',
    path: '/browse',
    label: 'اطلاع',
    caption: 'BROWSE',
    description: 'مقالات، بودكاست، ومتابعات',
    cat: 'mind',
    icon: Compass,
    keywords: 'browse articles podcast اطلاع مقالات بودكاست rss قراءة',
    links: [
      { path: '/browse', label: 'الاستكشاف', note: 'المتابعات اليومية', icon: Compass },
      { path: '/podcasts', label: 'البودكاست', note: 'المكتبة والسجل', icon: Mic },
      { path: '/reading', label: 'القراءة', note: 'المقالات وقائمة القراءة', icon: Newspaper },
    ],
  },
  {
    key: 'knowledge',
    path: '/knowledge',
    label: 'المعرفة',
    caption: 'KNOWLEDGE',
    description: 'موسوعة ومونوغرافات مفهرسة',
    cat: 'mind',
    icon: Crown,
    keywords: 'knowledge معرفة موسوعة أرشيف ديوان شعر ملاحظات ذاكرة',
    links: [
      { path: '/knowledge', label: 'الموسوعة', note: 'المدخل الرئيسي', icon: Crown },
      { path: '/diwan/library', label: 'مكتبة الديوان', note: 'الشعراء والقصائد', icon: Library },
      { path: '/archive', label: 'الأرشيف', note: 'المحفوظات والقراءة', icon: Archive },
      { path: '/pkm', label: 'الذاكرة', note: 'الملاحظات والخرائط', icon: Brain },
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
