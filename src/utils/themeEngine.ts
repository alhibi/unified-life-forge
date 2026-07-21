// ─── Theme Engine ───────────────────────────────────────────
// Generates a full semantic color system from 4 base HSL colors.

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'tonal' | 'vibrant' | 'neutral' | 'expressive';

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  primary: [number, number, number];   // [h, s, l]
  secondary: [number, number, number];
  accent: [number, number, number];
  neutral: [number, number, number];
}

// ─── Presets ────────────────────────────────────────────────
export const themePresets: ThemePreset[] = [
  {
    id: 'paper',
    name: 'ورق وحبر',
    nameEn: 'Paper & Ink',
    // Neutral warm — actual paper/ink tokens are hard-coded in
    // generateThemeTokens() override below (curium aesthetic).
    primary: [34, 33, 11],
    secondary: [34, 20, 33],
    accent: [34, 33, 11],
    neutral: [34, 12, 50],
  },
  {
    id: 'default',
    name: 'كلاسيك',
    nameEn: 'Classic',
    primary: [240, 5, 26],
    secondary: [240, 5, 50],
    accent: [240, 8, 60],
    neutral: [240, 4, 46],
  },
  {
    id: 'midnight',
    name: 'منتصف الليل',
    nameEn: 'Midnight',
    primary: [222, 60, 50],
    secondary: [210, 45, 55],
    accent: [235, 50, 62],
    neutral: [222, 12, 46],
  },
  {
    id: 'rose',
    name: 'روز جولد',
    nameEn: 'Rose Gold',
    primary: [350, 55, 55],
    secondary: [340, 40, 60],
    accent: [10, 50, 58],
    neutral: [350, 8, 46],
  },
  {
    id: 'emerald',
    name: 'زمرد',
    nameEn: 'Emerald',
    primary: [152, 55, 40],
    secondary: [165, 45, 45],
    accent: [140, 50, 50],
    neutral: [152, 8, 44],
  },
  {
    id: 'lavender',
    name: 'لافندر',
    nameEn: 'Lavender',
    primary: [270, 50, 55],
    secondary: [280, 40, 58],
    accent: [255, 48, 62],
    neutral: [270, 8, 46],
  },
  {
    id: 'sunset',
    name: 'غروب',
    nameEn: 'Sunset',
    primary: [25, 80, 52],
    secondary: [35, 70, 55],
    accent: [15, 75, 50],
    neutral: [25, 10, 46],
  },
  {
    id: 'ocean',
    name: 'محيط',
    nameEn: 'Ocean',
    primary: [195, 70, 42],
    secondary: [205, 55, 48],
    accent: [185, 60, 45],
    neutral: [195, 10, 44],
  },
  {
    id: 'neon',
    name: 'نيون',
    nameEn: 'Neon',
    primary: [160, 80, 38],
    secondary: [150, 65, 42],
    accent: [170, 70, 44],
    neutral: [160, 8, 44],
  },
  {
    id: 'coffee',
    name: 'قهوة',
    nameEn: 'Coffee',
    primary: [30, 40, 38],
    secondary: [25, 35, 44],
    accent: [35, 45, 42],
    neutral: [30, 8, 44],
  },
  {
    id: 'cherry',
    name: 'كرزي',
    nameEn: 'Cherry',
    primary: [0, 65, 50],
    secondary: [350, 50, 55],
    accent: [15, 60, 52],
    neutral: [0, 8, 44],
  },
  {
    id: 'gold',
    name: 'ذهبي',
    nameEn: 'Gold',
    primary: [42, 70, 48],
    secondary: [38, 55, 52],
    accent: [48, 65, 50],
    neutral: [42, 10, 44],
  },
  {
    id: 'mono',
    name: 'مونوكروم',
    nameEn: 'Mono',
    primary: [0, 0, 15],
    secondary: [0, 0, 35],
    accent: [0, 0, 50],
    neutral: [0, 0, 46],
  },
  {
    id: 'aurora',
    name: 'شفق',
    nameEn: 'Aurora',
    primary: [280, 65, 52],
    secondary: [170, 60, 45],
    accent: [320, 55, 58],
    neutral: [260, 8, 44],
  },
  {
    id: 'sakura',
    name: 'ساكورا',
    nameEn: 'Sakura',
    primary: [330, 60, 68],
    secondary: [345, 45, 72],
    accent: [15, 55, 65],
    neutral: [330, 10, 50],
  },
  {
    id: 'arctic',
    name: 'قطبي',
    nameEn: 'Arctic',
    primary: [200, 75, 48],
    secondary: [215, 60, 55],
    accent: [180, 55, 42],
    neutral: [205, 12, 46],
  },
  {
    id: 'volcano',
    name: 'بركان',
    nameEn: 'Volcano',
    primary: [8, 75, 48],
    secondary: [25, 85, 52],
    accent: [350, 65, 45],
    neutral: [10, 10, 40],
  },
  {
    id: 'matcha',
    name: 'ماتشا',
    nameEn: 'Matcha',
    primary: [120, 35, 42],
    secondary: [100, 28, 50],
    accent: [80, 40, 48],
    neutral: [110, 8, 46],
  },
  {
    id: 'nebula',
    name: 'سديم',
    nameEn: 'Nebula',
    primary: [260, 55, 48],
    secondary: [290, 50, 55],
    accent: [230, 60, 58],
    neutral: [270, 10, 42],
  },
  {
    id: 'copper',
    name: 'نحاسي',
    nameEn: 'Copper',
    primary: [18, 60, 45],
    secondary: [28, 50, 50],
    accent: [8, 55, 48],
    neutral: [20, 10, 42],
  },
  {
    id: 'mint',
    name: 'نعناع',
    nameEn: 'Mint',
    primary: [165, 55, 45],
    secondary: [145, 45, 50],
    accent: [180, 50, 48],
    neutral: [160, 8, 46],
  },
  // ─── New Artisan Themes ──────────────────────────────────
  {
    id: 'sandstone',
    name: 'حجر رملي',
    nameEn: 'Sandstone',
    primary: [32, 38, 52],
    secondary: [22, 30, 58],
    accent: [45, 42, 48],
    neutral: [28, 12, 48],
  },
  {
    id: 'dusk',
    name: 'شفق بنفسجي',
    nameEn: 'Dusk',
    primary: [265, 32, 45],
    secondary: [290, 25, 52],
    accent: [20, 55, 58],
    neutral: [275, 6, 42],
  },
  {
    id: 'moss',
    name: 'طحلب',
    nameEn: 'Moss',
    primary: [95, 28, 38],
    secondary: [75, 22, 45],
    accent: [55, 35, 50],
    neutral: [85, 6, 44],
  },
  {
    id: 'clay',
    name: 'صلصال',
    nameEn: 'Clay',
    primary: [12, 42, 52],
    secondary: [5, 35, 58],
    accent: [28, 48, 55],
    neutral: [15, 10, 44],
  },
  {
    id: 'storm',
    name: 'عاصفة',
    nameEn: 'Storm',
    primary: [215, 35, 42],
    secondary: [225, 28, 50],
    accent: [195, 40, 48],
    neutral: [220, 8, 40],
  },
  {
    id: 'silk',
    name: 'حرير',
    nameEn: 'Silk',
    primary: [335, 30, 58],
    secondary: [310, 22, 62],
    accent: [355, 35, 55],
    neutral: [330, 6, 50],
  },
  {
    id: 'amber',
    name: 'كهرمان',
    nameEn: 'Amber',
    primary: [38, 65, 45],
    secondary: [28, 50, 50],
    accent: [50, 55, 42],
    neutral: [35, 10, 42],
  },
  {
    id: 'fog',
    name: 'ضباب',
    nameEn: 'Fog',
    primary: [200, 12, 48],
    secondary: [210, 8, 55],
    accent: [185, 15, 52],
    neutral: [200, 4, 46],
  },
  {
    id: 'obsidian',
    name: 'سبج',
    nameEn: 'Obsidian',
    primary: [250, 18, 35],
    secondary: [240, 12, 42],
    accent: [270, 22, 45],
    neutral: [245, 5, 38],
  },
  {
    id: 'terracotta',
    name: 'فخّار',
    nameEn: 'Terracotta',
    primary: [15, 48, 48],
    secondary: [8, 38, 55],
    accent: [30, 52, 52],
    neutral: [18, 8, 44],
  },
];

// ─── Style modifiers ────────────────────────────────────────
// Each style adjusts saturation & lightness offsets for the generated tokens
interface StyleModifier {
  satMul: number;      // multiply saturation
  surfaceSatMul: number; // surface area saturation
  accentBoost: number;   // extra saturation for accent surfaces
}

const styleModifiers: Record<ThemeStyle, StyleModifier> = {
  tonal:      { satMul: 0.7,  surfaceSatMul: 0.5,  accentBoost: 0 },
  vibrant:    { satMul: 1.2,  surfaceSatMul: 0.6,  accentBoost: 8 },
  neutral:    { satMul: 0.3,  surfaceSatMul: 0.15, accentBoost: 0 },
  expressive: { satMul: 1.0,  surfaceSatMul: 0.8,  accentBoost: 12 },
};

// ─── Helper ─────────────────────────────────────────────────
function hsl(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(Math.max(0, Math.min(100, s)))}% ${Math.round(Math.max(0, Math.min(100, l)))}%`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ─── Token Generation ───────────────────────────────────────
export function generateThemeTokens(
  preset: ThemePreset,
  style: ThemeStyle,
  isDark: boolean,
  isBlack: boolean,
): Record<string, string> {
  // ─── Paper & Ink override (curium aesthetic) ─────────────
  // Hard-coded warm cream + ink tokens. Style modifiers are
  // intentionally ignored to keep the paper-notebook identity
  // pure across every UI control.
  if (preset.id === 'paper') {
    if (!isDark) {
      // Light: paper canvas, ink text
      return {
        '--background':           '34 33% 93%',  // #f5f0e8 paper
        '--foreground':           '240 8% 11%',  // #1a1a1f ink
        '--card':                 '38 50% 97%',  // #fbf8f3
        '--card-foreground':      '240 8% 11%',
        '--popover':              '38 50% 97%',
        '--popover-foreground':   '240 8% 11%',
        '--primary':              '240 8% 11%',  // ink
        '--primary-foreground':   '34 33% 93%',  // paper
        '--secondary':            '36 22% 89%',  // #ebe6dd
        '--secondary-foreground': '240 8% 11%',
        '--muted':                '36 22% 89%',
        '--muted-foreground':     '36 6% 33%',   // #5a5650
        '--accent':               '36 22% 89%',
        '--accent-foreground':    '240 8% 11%',
        '--destructive':          '0 54% 50%',
        '--destructive-foreground': '34 33% 96%',
        '--success':              '128 49% 36%',
        '--success-foreground':   '34 33% 96%',
        '--warning':              '36 78% 39%',
        '--warning-foreground':   '34 33% 96%',
        '--error':                '0 54% 50%',
        '--error-foreground':     '34 33% 96%',
        '--border':               '36 21% 80%',  // #d6cfc1
        '--input':                '36 21% 80%',
        '--ring':                 '240 8% 11%',
        '--sidebar-background':   '34 33% 93%',
        '--sidebar-foreground':   '240 8% 11%',
        '--sidebar-primary':      '240 8% 11%',
        '--sidebar-primary-foreground': '34 33% 93%',
        '--sidebar-accent':       '36 22% 89%',
        '--sidebar-accent-foreground': '240 8% 11%',
        '--sidebar-border':       '36 21% 80%',
        '--sidebar-ring':         '240 8% 11%',
        '--radius':               '0.625rem',
      };
    }
    // Dark: Antique dark manuscript aesthetic (#12110f to #1a1916 range instead of neutral grey/black)
    const bgL = isBlack ? 0 : 5;
    const surfL = isBlack ? 4 : 8;
    const surfOffL = isBlack ? 6 : 11;
    const borderL = isBlack ? 8 : 12;
    return {
      '--background':           `34 10% ${bgL}%`,   // Warm manuscript black
      '--foreground':           '34 25% 91%',       // Soft aged paper white
      '--card':                 `34 8% ${surfL}%`,  // Smooth dark parchment
      '--card-foreground':      '34 25% 91%',
      '--popover':              `34 8% ${surfL}%`,
      '--popover-foreground':   '34 25% 91%',
      '--primary':              '34 30% 86%',       // Soft paper gold/cream accent
      '--primary-foreground':   `34 10% ${bgL}%`,
      '--secondary':            `34 10% ${surfOffL}%`,
      '--secondary-foreground': '34 25% 91%',
      '--muted':                `34 10% ${surfOffL}%`,
      '--muted-foreground':     '34 12% 58%',       // Perfect readability for notes
      '--accent':               `34 10% ${surfOffL}%`,
      '--accent-foreground':    '34 30% 86%',
      '--destructive':          '0 78% 66%',
      '--destructive-foreground': `34 10% ${bgL}%`,
      '--success':              '128 45% 62%',
      '--success-foreground':   `34 10% ${bgL}%`,
      '--warning':              '38 75% 65%',
      '--warning-foreground':   `34 10% ${bgL}%`,
      '--error':                '0 78% 66%',
      '--error-foreground':     `34 10% ${bgL}%`,
      '--border':               `34 10% ${borderL}%`, // Subtle manuscript separators
      '--input':                `34 10% ${borderL}%`,
      '--ring':                 '34 30% 86%',
      '--sidebar-background':   `34 10% ${bgL}%`,
      '--sidebar-foreground':   '34 25% 91%',
      '--sidebar-primary':      '34 30% 86%',
      '--sidebar-primary-foreground': `34 10% ${bgL}%`,
      '--sidebar-accent':       `34 10% ${surfOffL}%`,
      '--sidebar-accent-foreground': '34 25% 91%',
      '--sidebar-border':       `34 10% ${borderL}%`,
      '--sidebar-ring':         '34 30% 86%',
      '--radius':               '0.625rem',
    };
  }

  const mod = styleModifiers[style];
  const [pH, pS, pL] = preset.primary;
  const [sH, sS, _sL] = preset.secondary;
  const [aH, aS, _aL] = preset.accent;
  const [nH, nS, _nL] = preset.neutral;

  const ps = clamp(pS * mod.satMul, 0, 100);
  const ss = clamp(sS * mod.satMul, 0, 100);
  const as = clamp(aS * mod.satMul + mod.accentBoost, 0, 100);
  const ns = clamp(nS * mod.surfaceSatMul, 0, 100);

  if (!isDark) {
    // ─── Light Mode ──────────────────────────────
    return {
      '--background':           hsl(nH, ns * 0.6, 98),
      '--foreground':           hsl(nH, ns * 0.5, 10),
      '--card':                 hsl(nH, ns * 0.5, 100),
      '--card-foreground':      hsl(nH, ns * 0.5, 10),
      '--popover':              hsl(nH, ns * 0.5, 100),
      '--popover-foreground':   hsl(nH, ns * 0.5, 10),
      '--primary':              hsl(pH, ps, 50),
      '--primary-foreground':   hsl(0, 0, 100),
      '--secondary':            hsl(sH, ss * 0.35, 93),
      '--secondary-foreground': hsl(sH, ss * 0.4, 32),
      '--muted':                hsl(nH, ns * 0.4, 91),
      '--muted-foreground':     hsl(nH, ns * 0.3, 46),
      '--accent':               hsl(aH, as * 0.35, 93),
      '--accent-foreground':    hsl(aH, as * 0.9, 48),
      '--destructive':          hsl(0, 72, 51),
      '--destructive-foreground': hsl(0, 0, 100),
      '--success':              hsl(142, 60, 40),
      '--success-foreground':   hsl(0, 0, 100),
      '--warning':              hsl(38, 85, 50),
      '--warning-foreground':   hsl(38, 90, 10),
      '--error':                hsl(0, 72, 51),
      '--error-foreground':     hsl(0, 0, 100),
      '--border':               hsl(nH, ns * 0.5, 89),
      '--input':                hsl(nH, ns * 0.5, 89),
      '--ring':                 hsl(pH, ps, 50),
      '--sidebar-background':   hsl(nH, ns * 0.5, 97),
      '--sidebar-foreground':   hsl(pH, ps * 0.6, 26),
      '--sidebar-primary':      hsl(pH, ps, 50),
      '--sidebar-primary-foreground': hsl(0, 0, 100),
      '--sidebar-accent':       hsl(nH, ns * 0.4, 95),
      '--sidebar-accent-foreground': hsl(pH, ps * 0.6, 26),
      '--sidebar-border':       hsl(nH, ns * 0.4, 91),
      '--sidebar-ring':         hsl(pH, ps, 50),
      '--radius':               '0.875rem',
    };
  }

  // ─── Dark Mode ──────────────────────────────
  // Improved contrast, deeper dark backdrops and cohesive Obsidian Depth style.
  const bgL = isBlack ? 0 : 6;        // Slightly darker base (#0d0d0f vs #141416) for extreme luxury feel
  const cardL = isBlack ? 4 : 11;     // Obsidian surface depth
  const secL = isBlack ? 7 : 14;      // Harmonized secondary background
  const mutL = isBlack ? 8 : 15;      // Smoother muted color transition
  const borderL = isBlack ? 8 : 13;   // Softened border to remove harsh outlines (Obsidian Depth principle)
  const bgS = isBlack ? 0 : ns * 0.6;
  const cardS = isBlack ? 0 : ns * 0.55;

  return {
    '--background':           hsl(nH, bgS, bgL),
    '--foreground':           hsl(nH, ns * 0.25, 94), // Enhanced text contrast (94% vs 92%)
    '--card':                 hsl(nH, cardS, cardL),
    '--card-foreground':      hsl(nH, ns * 0.25, 94),
    '--popover':              hsl(nH, cardS, cardL),
    '--popover-foreground':   hsl(nH, ns * 0.25, 94),
    '--primary':              hsl(pH, clamp(ps * 0.9, 0, 100), 62), // Slightly boosted primary saturation & brightness for premium glow
    '--primary-foreground':   hsl(nH, bgS, bgL),
    '--secondary':            hsl(sH, clamp(ss * 0.28, 0, 100), secL),
    '--secondary-foreground': hsl(sH, ss * 0.25, 82), // Elevated secondary contrast
    '--muted':                hsl(nH, clamp(ns * 0.25, 0, 100), mutL),
    '--muted-foreground':     hsl(nH, ns * 0.18, 56), // Muted text contrast adjusted for perfect readability
    '--accent':               hsl(aH, clamp(as * 0.28, 0, 100), secL),
    '--accent-foreground':    hsl(aH, clamp(as * 0.75, 0, 100), 68),
    '--destructive':          hsl(0, 68, 48),
    '--destructive-foreground': hsl(0, 0, 100),
    '--success':              hsl(142, 55, 48),
    '--success-foreground':   hsl(0, 0, 100),
    '--warning':              hsl(38, 80, 58),
    '--warning-foreground':   hsl(38, 85, 8),
    '--error':                hsl(0, 68, 52),
    '--error-foreground':     hsl(0, 0, 100),
    '--border':               hsl(nH, clamp(ns * 0.25, 0, 100), borderL),
    '--input':                hsl(nH, clamp(ns * 0.25, 0, 100), borderL),
    '--ring':                 hsl(pH, clamp(ps * 0.9, 0, 100), 62),
    '--sidebar-background':   hsl(nH, bgS, isBlack ? 2 : 5),
    '--sidebar-foreground':   hsl(nH, ns * 0.2, 92),
    '--sidebar-primary':      hsl(pH, clamp(ps * 0.9, 0, 100), 62),
    '--sidebar-primary-foreground': hsl(nH, bgS, bgL),
    '--sidebar-accent':       hsl(nH, clamp(ns * 0.25, 0, 100), isBlack ? 6 : 12),
    '--sidebar-accent-foreground': hsl(nH, ns * 0.2, 92),
    '--sidebar-border':       hsl(nH, clamp(ns * 0.25, 0, 100), borderL),
    '--sidebar-ring':         hsl(pH, clamp(ps * 0.9, 0, 100), 62),
    '--radius':               '0.875rem',
  };
}

// ─── Apply tokens to DOM ────────────────────────────────────
export function applyThemeTokens(tokens: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

// ─── Material Design 3 — "Indigo Night" baseline scheme ──────
// Exact tokens from the M3 baseline (hex → HSL conversions verified).
// Light:
//   Primary               #6750A4 → 256 34% 48%
//   On Primary            #FFFFFF → 0   0%  100%
//   Primary Container     #EADDFF → 263 100% 93%
//   On Primary Container  #21005D → 261 100% 18%
//   Secondary             #625B71 → 259 11% 40%
//   On Secondary          #FFFFFF → 0   0%  100%
//   Secondary Container   #E8DEF8 → 263 65% 92%
//   On Secondary Container#1D192B → 254 26% 13%
//   Tertiary              #7D5260 → 341 21% 41%
//   Tertiary Container    #FFD8E4 → 342 100% 92%
//   On Tertiary Container #31111D → 338 48% 13%
//   Error                 #B3261E → 3   71% 41%
//   Surface               #FFFBFE → 315 100% 99%
//   On Surface            #1C1B1F → 255 7% 11%
//   Surface Variant       #E7E0EC → 275 24% 90%
//   On Surface Variant    #49454F → 264 7% 29%
//   Outline               #79747E → 270 4% 47%
//   Outline Variant       #CAC4D0 → 270 11% 79%
// Dark (M3 baseline):
//   Primary               #D0BCFF → 258 100% 87%
//   On Primary            #381E72 → 259 58% 28%
//   Primary Container     #4F378B → 257 43% 38%
//   On Primary Container  #EADDFF → 263 100% 93%
//   Secondary Container   #4A4458 → 258 13% 31%
//   On Secondary Container#E8DEF8 → 263 65% 92%
//   Tertiary              #EFB8C8 → 343 63% 83%
//   Tertiary Container    #633B48 → 341 25% 31%
//   On Tertiary Container #FFD8E4 → 342 100% 92%
//   Error                 #F2B8B5 → 3   70% 83%
//   Surface               #1C1B1F → 255 7% 11%
//   On Surface            #E6E1E5 → 312 9% 89%
//   Surface Variant       #49454F → 264 7% 29%
//   On Surface Variant    #CAC4D0 → 270 11% 79%
//   Outline               #938F99 → 264 5% 58%
export function generateMD3Tokens(isDark: boolean, isBlack: boolean): Record<string, string> {
  if (!isDark) {
    return {
      // Surface family
      '--background':           '315 100% 99%',
      '--foreground':           '255 7% 11%',
      '--card':                 '315 100% 99%',
      '--card-foreground':      '255 7% 11%',
      '--popover':              '315 100% 99%',
      '--popover-foreground':   '255 7% 11%',
      // Primary
      '--primary':              '256 34% 48%',
      '--primary-foreground':   '0 0% 100%',
      // Secondary → mapped to MD3 secondary-container/on-secondary-container
      '--secondary':            '263 65% 92%',
      '--secondary-foreground': '254 26% 13%',
      // Muted → MD3 surface-variant / on-surface-variant
      '--muted':                '275 24% 90%',
      '--muted-foreground':     '264 7% 29%',
      // Accent → MD3 tertiary-container / on-tertiary-container
      '--accent':               '342 100% 92%',
      '--accent-foreground':    '338 48% 13%',
      // Status
      '--destructive':          '3 71% 41%',
      '--destructive-foreground': '0 0% 100%',
      '--success':              '142 60% 40%',
      '--success-foreground':   '0 0% 100%',
      '--warning':              '38 85% 50%',
      '--warning-foreground':   '38 90% 10%',
      '--error':                '3 71% 41%',
      '--error-foreground':     '0 0% 100%',
      // Outlines
      '--border':               '270 11% 79%', // outline-variant — softer for separators
      '--input':                '270 4% 47%',  // outline — sharper for input borders
      '--ring':                 '256 34% 48%',
      // Sidebar
      '--sidebar-background':   '315 100% 99%',
      '--sidebar-foreground':   '254 26% 13%',
      '--sidebar-primary':      '256 34% 48%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent':       '263 100% 93%', // primary-container
      '--sidebar-accent-foreground': '261 100% 18%',
      '--sidebar-border':       '270 11% 79%',
      '--sidebar-ring':         '256 34% 48%',
      // Extra MD3 tokens (consumable by components that want to opt in)
      '--md3-primary':          '256 34% 48%',
      '--md3-on-primary':       '0 0% 100%',
      '--md3-primary-container':'263 100% 93%',
      '--md3-on-primary-container':'261 100% 18%',
      '--md3-secondary':        '259 11% 40%',
      '--md3-secondary-container':'263 65% 92%',
      '--md3-tertiary':         '341 21% 41%',
      '--md3-tertiary-container':'342 100% 92%',
      '--md3-surface':          '315 100% 99%',
      '--md3-surface-variant':  '275 24% 90%',
      '--md3-outline':          '270 4% 47%',
      '--md3-outline-variant':  '270 11% 79%',
      '--md3-surface-tint':     '256 34% 48%',
      // MD3 shape system
      '--radius':               '1rem', // 16px – medium component shape
    };
  }

  // ─── Dark Mode (M3 baseline) ──────────────────────────────
  const surfaceL  = isBlack ? 0  : 11;   // #1C1B1F → 11%
  const cardL     = isBlack ? 4  : 14;
  const containerSatScale = isBlack ? 0.9 : 1;
  return {
    '--background':           `255 ${isBlack ? 0 : 7}% ${surfaceL}%`,
    '--foreground':           '312 9% 89%',
    '--card':                 `255 ${isBlack ? 0 : 7}% ${cardL}%`,
    '--card-foreground':      '312 9% 89%',
    '--popover':              `255 ${isBlack ? 0 : 7}% ${cardL}%`,
    '--popover-foreground':   '312 9% 89%',
    '--primary':              '258 100% 87%',     // #D0BCFF
    '--primary-foreground':   '259 58% 28%',      // #381E72
    '--secondary':            `258 ${Math.round(13 * containerSatScale)}% ${isBlack ? 22 : 31}%`, // #4A4458
    '--secondary-foreground': '263 65% 92%',      // #E8DEF8
    '--muted':                `264 ${Math.round(7 * containerSatScale)}% ${isBlack ? 22 : 29}%`,  // #49454F
    '--muted-foreground':     '270 11% 79%',      // #CAC4D0
    '--accent':               `341 ${Math.round(25 * containerSatScale)}% ${isBlack ? 22 : 31}%`, // #633B48
    '--accent-foreground':    '342 100% 92%',     // #FFD8E4
    '--destructive':          '3 70% 83%',        // #F2B8B5
    '--destructive-foreground': '359 100% 21%',
    '--success':              '142 50% 65%',
    '--success-foreground':   '142 60% 12%',
    '--warning':              '38 75% 70%',
    '--warning-foreground':   '38 80% 8%',
    '--error':                '3 70% 83%',
    '--error-foreground':     '359 100% 21%',
    '--border':               `264 ${isBlack ? 4 : 6}% ${isBlack ? 24 : 32}%`,
    '--input':                '264 5% 58%',
    '--ring':                 '258 100% 87%',
    '--sidebar-background':   `255 ${isBlack ? 0 : 7}% ${isBlack ? 4 : 8}%`,
    '--sidebar-foreground':   '312 9% 89%',
    '--sidebar-primary':      '258 100% 87%',
    '--sidebar-primary-foreground': '259 58% 28%',
    '--sidebar-accent':       `257 43% ${isBlack ? 28 : 38}%`, // primary-container dark #4F378B
    '--sidebar-accent-foreground': '263 100% 93%',
    '--sidebar-border':       `264 ${isBlack ? 4 : 6}% ${isBlack ? 18 : 25}%`,
    '--sidebar-ring':         '258 100% 87%',
    // Extra MD3 tokens
    '--md3-primary':          '258 100% 87%',
    '--md3-on-primary':       '259 58% 28%',
    '--md3-primary-container':`257 43% ${isBlack ? 28 : 38}%`,
    '--md3-on-primary-container':'263 100% 93%',
    '--md3-secondary':        '263 27% 81%',
    '--md3-secondary-container':`258 ${Math.round(13 * containerSatScale)}% ${isBlack ? 22 : 31}%`,
    '--md3-tertiary':         '343 63% 83%',
    '--md3-tertiary-container':`341 ${Math.round(25 * containerSatScale)}% ${isBlack ? 22 : 31}%`,
    '--md3-surface':          `255 ${isBlack ? 0 : 7}% ${surfaceL}%`,
    '--md3-surface-variant':  `264 ${Math.round(7 * containerSatScale)}% ${isBlack ? 22 : 29}%`,
    '--md3-outline':          '264 5% 58%',
    '--md3-outline-variant':  `264 7% ${isBlack ? 24 : 32}%`,
    '--md3-surface-tint':     '258 100% 87%',
    '--radius':               '1rem',
  };
}

// ─── Dynamic theme from image ───────────────────────────────
export function extractDominantColor(img: HTMLImageElement): [number, number, number] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [220, 50, 50];
  
  canvas.width = 64;
  canvas.height = 64;
  ctx.drawImage(img, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;
  
  let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;
  for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
    const r = data[i], g = data[i+1], b = data[i+2];
    // Skip very dark/light pixels
    const brightness = (r + g + b) / 3;
    if (brightness > 30 && brightness < 220) {
      rTotal += r; gTotal += g; bTotal += b; count++;
    }
  }
  
  if (count === 0) return [220, 50, 50];
  const r = rTotal / count, g = gTotal / count, b = bTotal / count;
  return rgbToHsl(r, g, b);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function createDynamicPreset(baseHsl: [number, number, number]): ThemePreset {
  const [h, s, l] = baseHsl;
  return {
    id: 'dynamic',
    name: 'ديناميكي',
    nameEn: 'Dynamic',
    primary: [h, clamp(s, 30, 80), clamp(l, 35, 55)],
    secondary: [(h + 30) % 360, clamp(s * 0.8, 20, 60), clamp(l + 5, 40, 58)],
    accent: [(h + 330) % 360, clamp(s * 0.9, 25, 70), clamp(l, 38, 55)],
    neutral: [h, clamp(s * 0.15, 0, 15), 46],
  };
}

// ─── Dynamic Tonal MD3 Tokens ───────────────────────────────
export function generateMD3TonalTokens(preset: ThemePreset, isDark: boolean, isBlack: boolean): Record<string, string> {
  const [pH, pS] = preset.primary;
  const [sH, sS] = preset.secondary;
  const [aH, aS] = preset.accent;
  const [nH, nS] = preset.neutral;

  if (!isDark) {
    const bg = hsl(nH, nS * 0.3, 98);
    const card = hsl(nH, nS * 0.35, 94); // MD3 surface container
    return {
      '--background': bg,
      '--foreground': hsl(nH, nS * 0.5, 12),
      '--card': card,
      '--card-foreground': hsl(nH, nS * 0.5, 12),
      '--popover': card,
      '--popover-foreground': hsl(nH, nS * 0.5, 12),
      '--primary': hsl(pH, clamp(pS * 0.8, 30, 80), 40),
      '--primary-foreground': '0 0% 100%',
      '--secondary': hsl(sH, clamp(sS * 0.5, 10, 40), 90),
      '--secondary-foreground': hsl(sH, clamp(sS * 0.6, 20, 50), 15),
      '--muted': hsl(nH, nS * 0.3, 90),
      '--muted-foreground': hsl(nH, nS * 0.3, 40),
      '--accent': hsl(aH, clamp(aS * 0.6, 20, 50), 90),
      '--accent-foreground': hsl(aH, clamp(aS * 0.7, 30, 60), 20),
      '--destructive': '3 71% 41%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '142 60% 40%',
      '--success-foreground': '0 0% 100%',
      '--warning': '38 85% 50%',
      '--warning-foreground': '38 90% 10%',
      '--error': '3 71% 41%',
      '--error-foreground': '0 0% 100%',
      '--border': hsl(nH, nS * 0.4, 82),
      '--input': hsl(nH, nS * 0.4, 50),
      '--ring': hsl(pH, pS, 40),
      '--radius': '1.5rem',
    };
  } else {
    const bgL = isBlack ? 0 : 7;
    const cardL = isBlack ? 4 : 12;
    const bg = hsl(nH, nS * 0.2, bgL);
    const card = hsl(nH, nS * 0.25, cardL);
    return {
      '--background': bg,
      '--foreground': hsl(nH, nS * 0.1, 91),
      '--card': card,
      '--card-foreground': hsl(nH, nS * 0.1, 91),
      '--popover': card,
      '--popover-foreground': hsl(nH, nS * 0.1, 91),
      '--primary': hsl(pH, clamp(pS * 0.9, 40, 90), 80),
      '--primary-foreground': hsl(pH, pS, 20),
      '--secondary': hsl(sH, clamp(sS * 0.4, 10, 30), 28),
      '--secondary-foreground': hsl(sH, clamp(sS * 0.5, 20, 40), 91),
      '--muted': hsl(nH, nS * 0.2, 20),
      '--muted-foreground': hsl(nH, nS * 0.15, 68),
      '--accent': hsl(aH, clamp(aS * 0.4, 15, 40), 28),
      '--accent-foreground': hsl(aH, clamp(aS * 0.5, 20, 50), 91),
      '--destructive': '3 70% 83%',
      '--destructive-foreground': '359 100% 21%',
      '--success': '142 50% 65%',
      '--success-foreground': '142 60% 12%',
      '--warning': '38 75% 70%',
      '--warning-foreground': '38 80% 8%',
      '--error': '3 70% 83%',
      '--error-foreground': '359 100% 21%',
      '--border': hsl(nH, nS * 0.2, 30),
      '--input': hsl(nH, nS * 0.2, 58),
      '--ring': hsl(pH, pS, 80),
      '--radius': '1.5rem',
    };
  }
}

// ─── Dynamic iOS 2024 Tokens ────────────────────────────────
export function generateiOSTokens(preset: ThemePreset, isDark: boolean, isBlack: boolean): Record<string, string> {
  const [pH, pS] = preset.primary;

  if (!isDark) {
    return {
      '--background': '240 14% 96%', // iOS system grouped background (#F2F2F7)
      '--foreground': '0 0% 0%',
      '--card': '0 0% 100%', // Pure white
      '--card-foreground': '0 0% 0%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '0 0% 0%',
      '--primary': hsl(pH, clamp(pS, 65, 100), 50), // Apple-style vibrant preset primary
      '--primary-foreground': '0 0% 100%',
      '--secondary': '240 5% 91%',
      '--secondary-foreground': '240 5% 15%',
      '--muted': '240 5% 93%',
      '--muted-foreground': '240 5% 52%',
      '--accent': '240 5% 95%',
      '--accent-foreground': hsl(pH, pS, 50),
      '--destructive': '354 100% 56%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '120 100% 35%',
      '--success-foreground': '0 0% 100%',
      '--warning': '35 100% 50%',
      '--warning-foreground': '0 0% 100%',
      '--error': '354 100% 56%',
      '--error-foreground': '0 0% 100%',
      '--border': '240 6% 88%',
      '--input': '240 6% 88%',
      '--ring': hsl(pH, pS, 50),
      '--radius': '0.75rem', // 12px
    };
  } else {
    const bg = isBlack ? '0 0% 0%' : '240 4% 10%'; // #000000 or #1C1C1E
    const card = isBlack ? '0 0% 4%' : '240 4% 17%'; // #1C1C1E or #2C2C2E
    return {
      '--background': bg,
      '--foreground': '0 0% 100%',
      '--card': card,
      '--card-foreground': '0 0% 100%',
      '--popover': card,
      '--popover-foreground': '0 0% 100%',
      '--primary': hsl(pH, clamp(pS, 65, 100), 60),
      '--primary-foreground': '0 0% 0%',
      '--secondary': '240 4% 22%',
      '--secondary-foreground': '240 4% 92%',
      '--muted': '240 4% 19%',
      '--muted-foreground': '240 2% 62%',
      '--accent': '240 4% 16%',
      '--accent-foreground': hsl(pH, pS, 60),
      '--destructive': '354 100% 64%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '120 100% 45%',
      '--success-foreground': '0 0% 0%',
      '--warning': '35 100% 55%',
      '--warning-foreground': '0 0% 0%',
      '--error': '354 100% 64%',
      '--error-foreground': '0 0% 100%',
      '--border': '240 4% 24%',
      '--input': '240 4% 24%',
      '--ring': hsl(pH, pS, 60),
      '--radius': '0.75rem',
    };
  }
}

// ─── Pure Aura Tokens ───────────────────────────────────────
export function generateAuraTokens(preset: ThemePreset, isDark: boolean, isBlack: boolean): Record<string, string> {
  const [pH, pS] = preset.primary;

  if (!isDark) {
    return {
      '--background': '36 20% 96%', // Warm linen sand
      '--foreground': '36 15% 15%',
      '--card': '36 25% 99%', // Clean silk
      '--card-foreground': '36 15% 15%',
      '--popover': '36 25% 99%',
      '--popover-foreground': '36 15% 15%',
      '--primary': hsl(pH, clamp(pS * 0.7, 20, 60), 40),
      '--primary-foreground': '0 0% 100%',
      '--secondary': '36 12% 91%',
      '--secondary-foreground': '36 15% 20%',
      '--muted': '36 10% 93%',
      '--muted-foreground': '36 8% 48%',
      '--accent': '36 12% 91%',
      '--accent-foreground': hsl(pH, clamp(pS * 0.7, 20, 60), 40),
      '--destructive': '0 45% 48%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '145 35% 42%',
      '--success-foreground': '0 0% 100%',
      '--warning': '35 60% 45%',
      '--warning-foreground': '0 0% 100%',
      '--error': '0 45% 48%',
      '--error-foreground': '0 0% 100%',
      '--border': '36 12% 88%',
      '--input': '36 12% 88%',
      '--ring': hsl(pH, pS * 0.7, 40),
      '--radius': '1.75rem',
    };
  } else {
    const bg = isBlack ? '0 0% 0%' : '240 8% 7%'; // Deep obsidian
    const card = isBlack ? '0 0% 4%' : '240 6% 12%'; // Pure obsidian slate
    return {
      '--background': bg,
      '--foreground': '240 4% 92%',
      '--card': card,
      '--card-foreground': '240 4% 92%',
      '--popover': card,
      '--popover-foreground': '240 4% 92%',
      '--primary': hsl(pH, clamp(pS * 0.8, 30, 70), 65),
      '--primary-foreground': bg,
      '--secondary': '240 6% 16%',
      '--secondary-foreground': '240 4% 85%',
      '--muted': '240 6% 14%',
      '--muted-foreground': '240 3% 62%',
      '--accent': '240 6% 16%',
      '--accent-foreground': hsl(pH, clamp(pS * 0.8, 30, 70), 65),
      '--destructive': '0 60% 60%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '145 45% 55%',
      '--success-foreground': '0 0% 0%',
      '--warning': '35 70% 65%',
      '--warning-foreground': '0 0% 0%',
      '--error': '0 60% 60%',
      '--error-foreground': '0 0% 100%',
      '--border': '240 5% 18%',
      '--input': '240 5% 18%',
      '--ring': hsl(pH, pS * 0.8, 65),
      '--radius': '1.75rem',
    };
  }
}
