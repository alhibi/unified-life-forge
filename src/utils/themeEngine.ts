import { applyRootTokens } from '@/lib/rootTokens';

// ─── Token Architecture ─────────────────────────────────────
// Exactly 4 roles per mode, no exceptions.
// Roles: bg, surface, ink, accent.
// Font family: Inter Display (set globally as sole typeface).

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'tonal' | 'vibrant' | 'neutral' | 'expressive';
export type Hsl = [number, number, number];
export type ThemeScale = [Hsl, Hsl, Hsl, Hsl, Hsl, Hsl, Hsl];

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

export interface ThemeColorSet {
  bg: string;      // hex string e.g. '#E4DFDB'
  surface: string; // hex string e.g. '#E3D7CD'
  ink: string;     // hex string e.g. '#3F3F3F'
  accent: string;  // hex string e.g. '#E45B60'
}

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  font: 'Inter Display';
  light: ThemeColorSet;
  dark: ThemeColorSet;
  // ── Legacy Compatibility ───────────────────────────────
  scale: ThemeScale;
  primary: Hsl;
  secondary: Hsl;
  accent: Hsl;
  neutral: Hsl;
}

export const INK: Hsl = [0, 0, 24.7]; // hex #3F3F3F
export const INK_CSS = 'hsl(0 0% 24.7%)';
export const INK_HEX = '#3F3F3F';

export type SurfaceLift = 'flat' | 'subtle' | 'lifted';

// Convert Hex to Hsl array
export function hexToHsl(hex: string): Hsl {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100 * 10) / 10,
    Math.round(l * 100 * 10) / 10,
  ];
}

// Convert Hsl array to css string e.g. "27 14.3% 87.6%"
function hslToString([h, s, l]: Hsl): string {
  return `${h} ${s}% ${l}%`;
}

// Convert Hex directly to space-separated Hsl string
function hexToHslString(hex: string): string {
  return hslToString(hexToHsl(hex));
}

// Convert Hsl array to hex string
function hslToHex([h, s, l]: Hsl): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lFrac - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

function definePreset(
  id: string,
  name: string,
  nameEn: string,
  light: ThemeColorSet,
  dark: ThemeColorSet
): ThemePreset {
  const lightBgHsl = hexToHsl(light.bg);
  const lightSurfHsl = hexToHsl(light.surface);
  const lightInkHsl = hexToHsl(light.ink);
  const lightAccHsl = hexToHsl(light.accent);

  // Compute a mock scale of 7 tones walked down lightness ladder for backwards compatibility
  const scale: ThemeScale = [
    lightBgHsl, // 50
    lightSurfHsl, // 100
    [lightAccHsl[0], lightAccHsl[1], Math.min(90, lightAccHsl[2] + 12)], // 200
    lightAccHsl, // 300
    [lightInkHsl[0], lightInkHsl[1], Math.min(80, lightInkHsl[2] + 24)], // 400
    [lightInkHsl[0], lightInkHsl[1], Math.min(80, lightInkHsl[2] + 12)], // 500
    lightInkHsl, // 600
  ];

  return {
    id,
    name,
    nameEn,
    font: 'Inter Display',
    light,
    dark,
    scale,
    primary: lightAccHsl,
    secondary: lightSurfHsl,
    accent: lightAccHsl,
    neutral: lightInkHsl,
  };
}

// ─── Theme Presets ──────────────────────────────────────────
export const themePresets: ThemePreset[] = [
  definePreset(
    'default',
    'كلاسيك',
    'Classic',
    { bg: '#E4DFDB', surface: '#E3D7CD', ink: '#3F3F3F', accent: '#E45B60' },
    { bg: '#1A1A1A', surface: '#3F3F3F', ink: '#E4DFDB', accent: '#E45B60' }
  ),
  definePreset(
    'paper',
    'ورق وحبر',
    'Paper & Ink',
    { bg: '#F5F0E8', surface: '#FBF8F3', ink: '#1A1A1F', accent: '#8A5B3D' },
    { bg: '#12110F', surface: '#1A1916', ink: '#F2E9D8', accent: '#B8492E' }
  ),
  definePreset(
    'mono',
    'مونوكروم',
    'Mono',
    { bg: '#F5F5F5', surface: '#FFFFFF', ink: '#1A1A1A', accent: '#1A1A1A' },
    { bg: '#121212', surface: '#1E1E1E', ink: '#F5F5F5', accent: '#FFFFFF' }
  ),
  definePreset(
    'coffee',
    'قهوة',
    'Coffee',
    { bg: '#F3EFE9', surface: '#EAE3D8', ink: '#3E2723', accent: '#8D6E63' },
    { bg: '#1E1410', surface: '#2D1E18', ink: '#EFEBE9', accent: '#A1887F' }
  ),
  definePreset(
    'fog',
    'ضباب',
    'Fog',
    { bg: '#EAF0F6', surface: '#DCE5ED', ink: '#2B3842', accent: '#4F708C' },
    { bg: '#151B22', surface: '#242C35', ink: '#EAF0F6', accent: '#7295B3' }
  ),
  definePreset(
    'obsidian',
    'سبج',
    'Obsidian',
    { bg: '#E6E4E2', surface: '#F0EDE9', ink: '#1A1917', accent: '#B8860B' },
    { bg: '#0A0A0B', surface: '#151517', ink: '#F5F2EB', accent: '#D4AF37' }
  ),
  definePreset(
    'midnight',
    'منتصف الليل',
    'Midnight',
    { bg: '#E6E9F0', surface: '#D2D7E5', ink: '#121E31', accent: '#2A52BE' },
    { bg: '#080E1A', surface: '#162235', ink: '#E6E9F0', accent: '#5381E6' }
  ),
  definePreset(
    'rose',
    'روز جولد',
    'Rose Gold',
    { bg: '#F9F1F2', surface: '#F2DFE2', ink: '#4A2A2E', accent: '#C87D88' },
    { bg: '#1A0E10', surface: '#2E181C', ink: '#F9F1F2', accent: '#E2A9B1' }
  ),
  definePreset(
    'emerald',
    'زمرد',
    'Emerald',
    { bg: '#E8F5E9', surface: '#C8E6C9', ink: '#1B5E20', accent: '#2E7D32' },
    { bg: '#0A110C', surface: '#122216', ink: '#E8F5E9', accent: '#4CAF50' }
  ),
  definePreset(
    'lavender',
    'لافندر',
    'Lavender',
    { bg: '#F3EBF5', surface: '#E6D7E8', ink: '#3E2445', accent: '#8E44AD' },
    { bg: '#160E1A', surface: '#271733', ink: '#F3EBF5', accent: '#BB8FCE' }
  ),
  definePreset(
    'sunset',
    'غروب',
    'Sunset',
    { bg: '#FDF5E6', surface: '#FAEBD7', ink: '#5C2E2B', accent: '#FF7F50' },
    { bg: '#140C0A', surface: '#22120F', ink: '#FFF5EE', accent: '#FF7F50' }
  ),
  definePreset(
    'ocean',
    'محيط',
    'Ocean',
    { bg: '#E0F2F1', surface: '#B2DFDB', ink: '#004D40', accent: '#00796B' },
    { bg: '#001211', surface: '#002926', ink: '#E0F2F1', accent: '#26A69A' }
  ),
];

// ─── Dynamic theme from image ───────────────────────────────
export function extractDominantColor(img: HTMLImageElement): [number, number, number] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [358, 72, 62];

  canvas.width = 64;
  canvas.height = 64;
  ctx.drawImage(img, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;

  let rTotal = 0,
    gTotal = 0,
    bTotal = 0,
    count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness > 30 && brightness < 220) {
      rTotal += r;
      gTotal += g;
      bTotal += b;
      count++;
    }
  }

  if (count === 0) return [358, 72, 62];
  const r = rTotal / count,
    g = gTotal / count,
    b = bTotal / count;

  // Convert RGB to Hsl
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN) h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6;
    else if (max === gN) h = ((bN - rN) / d + 2) / 6;
    else h = ((rN - gN) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function createDynamicPreset(baseHsl: [number, number, number]): ThemePreset {
  const [h, s] = baseHsl;
  const lightBgHex = hslToHex([h, Math.max(5, s * 0.4), 88]);
  const lightSurfHex = hslToHex([h, Math.max(5, s * 0.5), 82]);
  const lightInkHex = hslToHex([h, Math.max(5, s * 0.2), 24]);
  const lightAccHex = hslToHex([h, Math.max(25, s * 1.1), 60]);

  const darkBgHex = hslToHex([h, Math.max(5, s * 0.15), 10]);
  const darkSurfHex = hslToHex([h, Math.max(5, s * 0.25), 24]);
  const darkInkHex = hslToHex([h, Math.max(5, s * 0.4), 88]);
  const darkAccHex = hslToHex([h, Math.max(25, s * 1.1), 60]);

  return definePreset(
    'dynamic',
    'ديناميكي',
    'Dynamic',
    { bg: lightBgHex, surface: lightSurfHex, ink: lightInkHex, accent: lightAccHex },
    { bg: darkBgHex, surface: darkSurfHex, ink: darkInkHex, accent: darkAccHex }
  );
}

// ─── Token Generation ───────────────────────────────────────
export function generateThemeTokens(
  preset: ThemePreset,
  style: ThemeStyle,
  isDark: boolean,
  isBlack: boolean,
  _lift: SurfaceLift = 'subtle'
): Record<string, string> {
  const modeColors = isDark ? preset.dark : preset.light;
  let bgHex = modeColors.bg;

  // Handle computed extra-dark background for black mode
  if (isDark && isBlack) {
    bgHex = '#080808'; // Pure extra-dark sub-black background for OLED Black Mode
  }

  const bgHsl = hexToHsl(bgHex);
  const surfHsl = hexToHsl(modeColors.surface);
  const inkHsl = hexToHsl(modeColors.ink);
  const accHsl = hexToHsl(modeColors.accent);

  const bgStr = hslToString(bgHsl);
  const surfStr = hslToString(surfHsl);
  const inkStr = hslToString(inkHsl);
  const accStr = hslToString(accHsl);

  // Derive secondary/tertiary/disabled/hover/pressed states as opacity variants of the 4 roles ONLY.
  // Using the exact schema specified in §1 and §3.
  const borderStr = `${hslToString(inkHsl)} / 0.1`;       // ink @ 10% opacity
  const inputStr = `${hslToString(inkHsl)} / 0.15`;       // ink @ 15% opacity
  const secondaryStr = `${hslToString(inkHsl)} / 0.1`;   // ink @ 10% opacity (neutral recess/background)
  const secondaryFgStr = `${hslToString(inkHsl)} / 0.85`; // ink @ 85% opacity
  const mutedStr = `${hslToString(inkHsl)} / 0.08`;       // ink @ 8% opacity
  const mutedFgStr = `${hslToString(inkHsl)} / 0.7`;       // ink @ 70% opacity (secondary text)
  const disabledStr = `${hslToString(inkHsl)} / 0.4`;    // ink @ 40% opacity (disabled state)

  const accentHighlightStr = `${hslToString(accHsl)} / 0.12`; // accent @ 12% opacity (subtle highlight)

  // Primary Foreground is ink (high contrast text) in light, and bg in dark mode.
  const primaryFgStr = isDark ? bgStr : inkStr;

  // Card soft shadow values:
  // Light mode: 0 1px 3px rgba(63,63,63,0.08)
  // Dark mode: 0 1px 3px rgba(0,0,0,0.25)
  const cardShadow = isDark
    ? '0 1px 3px rgba(0,0,0,0.25)'
    : '0 1px 3px rgba(63,63,63,0.08)';

  // Re-generate standard scale mapping for backward compatibility
  const scaleVars: Record<string, string> = {
    '--theme-ink': inkStr,
    '--scrim': `${hslToString(isDark ? [0, 0, 5] : [0, 0, 15])} / 0.6`,
  };

  SCALE_STEPS.forEach((name, i) => {
    // Legacy mapping to satisfy components requesting --theme-50, etc.
    const stepHsl = preset.scale[i];
    scaleVars[`--theme-${name}`] = hslToString(stepHsl);
  });

  return {
    ...scaleVars,
    '--background': bgStr,
    '--foreground': inkStr,
    '--card': surfStr,
    '--card-foreground': inkStr,
    '--popover': surfStr,
    '--popover-foreground': inkStr,
    '--secondary': secondaryStr,
    '--secondary-foreground': secondaryFgStr,
    '--muted': mutedStr,
    '--muted-foreground': mutedFgStr,
    '--accent': secondaryStr,
    '--accent-foreground': accStr,
    '--primary': accStr,
    '--primary-foreground': primaryFgStr,
    '--disabled': disabledStr,
    // Status colors - functional and verified
    '--destructive': '358 72% 50%',
    '--destructive-foreground': '0 0% 100%',
    '--success': '145 50% 36%',
    '--success-foreground': '0 0% 100%',
    '--warning': '38 85% 45%',
    '--warning-foreground': '38 90% 10%',
    '--error': '358 72% 50%',
    '--error-foreground': '0 0% 100%',
    // Lines
    '--border': borderStr,
    '--input': inputStr,
    '--ring': accStr,
    // Sidebar mirrors
    '--sidebar-background': bgStr,
    '--sidebar-foreground': inkStr,
    '--sidebar-primary': accStr,
    '--sidebar-primary-foreground': primaryFgStr,
    '--sidebar-accent': secondaryStr,
    '--sidebar-accent-foreground': accStr,
    '--sidebar-border': borderStr,
    '--sidebar-ring': accStr,
    // Live active states
    '--live': accStr,
    '--live-soft': `${hslToString(accHsl)} / 0.16`,
    '--live-glow': accStr,
    // Extra elements
    '--card-shadow': cardShadow,
    '--accent-highlight': accentHighlightStr,
  };
}

// ─── Legacy Compat Token Generators ─────────────────────────
export function generateLegacyThemeTokens(
  preset: ThemePreset,
  style: ThemeStyle,
  isDark: boolean,
  isBlack: boolean
): Record<string, string> {
  return generateThemeTokens(preset, style, isDark, isBlack);
}

export function generateMD3Tokens(isDark: boolean, isBlack: boolean): Record<string, string> {
  return generateThemeTokens(themePresets[0], 'neutral', isDark, isBlack);
}

export function generateMD3TonalTokens(
  preset: ThemePreset,
  isDark: boolean,
  isBlack: boolean
): Record<string, string> {
  return generateThemeTokens(preset, 'neutral', isDark, isBlack);
}

export function generateiOSTokens(
  preset: ThemePreset,
  isDark: boolean,
  isBlack: boolean
): Record<string, string> {
  return generateThemeTokens(preset, 'neutral', isDark, isBlack);
}

export function generateAuraTokens(
  preset: ThemePreset,
  isDark: boolean,
  isBlack: boolean
): Record<string, string> {
  return generateThemeTokens(preset, 'neutral', isDark, isBlack);
}

// ─── Helpers for Preview / Swatches ──────────────────────────
export function getThemeScale(preset: ThemePreset, _style: ThemeStyle = 'neutral'): Hsl[] {
  // Return the 4 roles' Hsl representations for rendering swatches
  const light = preset.light;
  return [
    hexToHsl(light.bg),
    hexToHsl(light.surface),
    hexToHsl(light.accent),
    hexToHsl(light.ink),
  ];
}

export function getThemeScaleColors(preset: ThemePreset, _style: ThemeStyle = 'neutral'): string[] {
  const light = preset.light;
  return [
    light.bg,
    light.surface,
    light.accent,
    light.ink,
  ];
}

export function applyThemeTokens(tokens: Record<string, string>) {
  applyRootTokens(tokens);
}
