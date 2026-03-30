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
    };
  }

  // ─── Dark Mode ──────────────────────────────
  const bgL = isBlack ? 0 : 8;
  const cardL = isBlack ? 5 : 12;
  const secL = isBlack ? 8 : 16;
  const mutL = isBlack ? 10 : 18;
  const borderL = isBlack ? 12 : 18;
  const bgS = isBlack ? 0 : ns * 0.7;
  const cardS = isBlack ? 0 : ns * 0.6;

  return {
    '--background':           hsl(nH, bgS, bgL),
    '--foreground':           hsl(nH, ns * 0.3, 92),
    '--card':                 hsl(nH, cardS, cardL),
    '--card-foreground':      hsl(nH, ns * 0.3, 92),
    '--popover':              hsl(nH, cardS, cardL),
    '--popover-foreground':   hsl(nH, ns * 0.3, 92),
    '--primary':              hsl(pH, clamp(ps * 0.85, 0, 100), 60),
    '--primary-foreground':   hsl(nH, bgS, bgL),
    '--secondary':            hsl(sH, clamp(ss * 0.3, 0, 100), secL),
    '--secondary-foreground': hsl(sH, ss * 0.3, 78),
    '--muted':                hsl(nH, clamp(ns * 0.3, 0, 100), mutL),
    '--muted-foreground':     hsl(nH, ns * 0.2, 52),
    '--accent':               hsl(aH, clamp(as * 0.3, 0, 100), secL),
    '--accent-foreground':    hsl(aH, clamp(as * 0.7, 0, 100), 65),
    '--destructive':          hsl(0, 62, 45),
    '--destructive-foreground': hsl(0, 0, 100),
    '--success':              hsl(142, 50, 45),
    '--success-foreground':   hsl(0, 0, 100),
    '--warning':              hsl(38, 75, 55),
    '--warning-foreground':   hsl(38, 80, 8),
    '--error':                hsl(0, 62, 50),
    '--error-foreground':     hsl(0, 0, 100),
    '--border':               hsl(nH, clamp(ns * 0.3, 0, 100), borderL),
    '--input':                hsl(nH, clamp(ns * 0.3, 0, 100), borderL),
    '--ring':                 hsl(pH, clamp(ps * 0.85, 0, 100), 60),
    '--sidebar-background':   hsl(nH, bgS, isBlack ? 2 : 6),
    '--sidebar-foreground':   hsl(nH, ns * 0.2, 90),
    '--sidebar-primary':      hsl(pH, clamp(ps * 0.85, 0, 100), 60),
    '--sidebar-primary-foreground': hsl(nH, bgS, bgL),
    '--sidebar-accent':       hsl(nH, clamp(ns * 0.3, 0, 100), isBlack ? 8 : 14),
    '--sidebar-accent-foreground': hsl(nH, ns * 0.2, 90),
    '--sidebar-border':       hsl(nH, clamp(ns * 0.3, 0, 100), borderL),
    '--sidebar-ring':         hsl(pH, clamp(ps * 0.85, 0, 100), 60),
  };
}

// ─── Apply tokens to DOM ────────────────────────────────────
export function applyThemeTokens(tokens: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
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
