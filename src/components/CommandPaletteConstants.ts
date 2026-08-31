import {
  BookOpen,
  Compass,
  Dumbbell,
  Gamepad2,
  MapPin,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
} from '@/lib/icons';

/** Custom event any surface (e.g. a mobile toolbar button) can dispatch. */
export const COMMAND_PALETTE_EVENT = 'app:command-palette';

/** Open the palette from anywhere — used by touch surfaces with no Cmd+K. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
}

export const ROUTES: { path: string; label: string; keywords: string; icon: typeof Compass }[] = [
  {
    path: '/',
    label: 'البوابة الرئيسية',
    keywords: 'home portal start بوابة رئيسية',
    icon: Compass,
  },
  {
    path: '/mihrab',
    label: 'المحراب — القرآن والأذكار',
    keywords: 'mihrab quran dhikr محراب قرآن أذكار',
    icon: BookOpen,
  },
  {
    path: '/wellness',
    label: 'العافية — التدريب والتغذية',
    keywords: 'wellness fitness nutrition عافية تدريب تغذية',
    icon: Dumbbell,
  },
  {
    path: '/chat',
    label: 'المحادثات والرسائل',
    keywords: 'chat messages محادثات رسائل',
    icon: MessageSquare,
  },
  {
    path: '/browse',
    label: 'اطلاع — مقالات وبودكاست',
    keywords: 'browse articles podcasts اطلاع مقالات بودكاست',
    icon: Compass,
  },
  {
    path: '/knowledge',
    label: 'المعرفة — الموسوعة',
    keywords: 'knowledge encyclopedia معرفة موسوعة',
    icon: Shield,
  },
  { path: '/games', label: 'الألعاب', keywords: 'games play ألعاب', icon: Gamepad2 },
  {
    path: '/weather',
    label: 'الطقس بالتفصيل',
    keywords: 'weather forecast طقس توقعات',
    icon: MapPin,
  },
  {
    path: '/pkm',
    label: 'الذاكرة — الملاحظات',
    keywords: 'pkm notes ذاكرة ملاحظات',
    icon: Sparkles,
  },
  { path: '/journal', label: 'مذكرتي', keywords: 'journal diary مذكرة يوميات', icon: BookOpen },
  {
    path: '/travel-atlas',
    label: 'أطلس الرحلات — خريطة أماكنك',
    keywords: 'travel atlas places map أطلس رحلات أماكن خريطة سفر سياحة دول',
    icon: MapPin,
  },
  {
    path: '/travel-atlas/trips',
    label: 'رحلاتي — تخطيط الرحلات',
    keywords: 'trips itinerary plan رحلات خطة مسار جدول',
    icon: MapPin,
  },
  { path: '/archive', label: 'أرشيف المعرفة', keywords: 'archive أرشيف', icon: Shield },
  {
    path: '/settings',
    label: 'الإعدادات',
    keywords: 'settings preferences إعدادات',
    icon: Settings,
  },
];
