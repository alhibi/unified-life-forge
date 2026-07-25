import type { Wallpaper } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Voice recording waveform fallback heights.
// MUST be deterministic — using `Math.random()` at module init meant the
// pattern silently changed between hot reloads / route lazy loads, which
// looked like glitching when the user navigated back.
// ─────────────────────────────────────────────────────────────────────────────
export const WAVEFORM_HEIGHTS: number[] = (() => {
  // Linear-congruential generator with a fixed seed so the bars are stable
  // across the whole app and across builds.
  let seed = 0x6f57c11b;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  return Array.from({ length: 24 }, () => Math.round(rand() * 18 + 4));
})();

// ─────────────────────────────────────────────────────────────────────────────
// Reactions (first row is "quick" in long-press menu)
// ─────────────────────────────────────────────────────────────────────────────
export const QUICK_EMOJIS = ['❤️', '👍', '😂', '🔥', '😢', '👏'];

// ─────────────────────────────────────────────────────────────────────────────
// Legacy emoji-picker shape — kept as an empty list for backwards-compat.
// The real picker is the Apple emoji-mart sheet rendered by EmojiPicker.tsx.
// ─────────────────────────────────────────────────────────────────────────────
export interface EmojiCategory {
  id: string;
  icon: string;
  labelAr: string;
  emojis: string[];
}
export const EMOJI_CATEGORIES: EmojiCategory[] = [];
export const EXTRA_EMOJIS: string[] = QUICK_EMOJIS.slice();

// ─────────────────────────────────────────────────────────────────────────────
// Chat wallpapers – pure CSS gradients for zero-asset performance.
// ─────────────────────────────────────────────────────────────────────────────
export const WALLPAPERS: Wallpaper[] = [
  {
    id: 'default',
    labelAr: 'افتراضي',
    label: 'Standard',
    background: 'hsl(var(--background))',
  },
  {
    id: 'cream',
    labelAr: 'كريمي',
    label: 'Cream',
    background: '#f5efe6',
  },
  {
    id: 'sky',
    labelAr: 'سماوي',
    label: 'Sky',
    background: '#e3f0fb',
  },
  {
    id: 'sage',
    labelAr: 'أخضر فاتح',
    label: 'Sage',
    background: '#e8f1ea',
  },
  {
    id: 'peach',
    labelAr: 'خوخي',
    label: 'Peach',
    background: '#fbe6dc',
  },
  {
    id: 'lavender',
    labelAr: 'لافندر',
    label: 'Lavender',
    background: '#ebe6fb',
  },
  {
    id: 'mist',
    labelAr: 'ضباب',
    label: 'Mist',
    background: '#eef0f3',
  },
  {
    id: 'sunset',
    labelAr: 'غروب',
    label: 'Sunset',
    background: '#f4dcd0',
  },
  {
    id: 'midnight',
    labelAr: 'منتصف الليل',
    label: 'Midnight',
    background: '#101522',
    isDark: true,
  },
  {
    id: 'forest',
    labelAr: 'غابة',
    label: 'Forest',
    background: '#0f1d18',
    isDark: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Self-destruct options
// ─────────────────────────────────────────────────────────────────────────────
export const SELF_DESTRUCT_OPTIONS: Array<{ valueSeconds: number | null; labelAr: string; }> = [
  { valueSeconds: null,    labelAr: 'إيقاف', },
  { valueSeconds: 30,      labelAr: '30 ثانية', },
  { valueSeconds: 300,     labelAr: '5 دقائق', },
  { valueSeconds: 3600,    labelAr: 'ساعة', },
  { valueSeconds: 86400,   labelAr: 'يوم', },
  { valueSeconds: 604800,  labelAr: 'أسبوع', },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mute duration choices. -1 = forever, 0 = unmute, otherwise seconds.
// ─────────────────────────────────────────────────────────────────────────────
export const MUTE_DURATION_OPTIONS: Array<{ valueSeconds: number; labelAr: string; }> = [
  { valueSeconds: 3600,    labelAr: 'ساعة', },
  { valueSeconds: 28800,   labelAr: '8 ساعات', },
  { valueSeconds: 86400,   labelAr: 'يوم', },
  { valueSeconds: 604800,  labelAr: 'أسبوع', },
  { valueSeconds: -1,      labelAr: 'دائماً', },
];

// ─────────────────────────────────────────────────────────────────────────────
// Storage key for all client-side chat preferences (localStorage).
// Scoped by user id so different accounts on one browser stay isolated.
// ─────────────────────────────────────────────────────────────────────────────
export const CHAT_PREFS_KEY = (userId: string) => `ulf.chat.prefs.${userId}`;

// Max text message length to insert into DB (defensive, not enforced in schema)
export const MAX_MESSAGE_LENGTH = 4096;
