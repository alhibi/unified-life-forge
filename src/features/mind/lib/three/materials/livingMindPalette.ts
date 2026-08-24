/**
 * Living Mind — canonical palette (Stage 1: visual language).
 *
 * Every color used by any Living-Mind material MUST come from this file.
 * Values were chosen against two references:
 *
 *  - Organic side: anatomical wax models + MRI angiography stills — deep
 *    coral/blush tissue, umber pooling in the sulci, golden subsurface warmth
 *    where light grazes thin folds.
 *  - Technological side: brushed graphite/obsidian instrument chassis with
 *    restrained cyan-white circuitry — precision instrument, never arcade.
 */

export interface HemispherePalette {
  /** Primary surface color fed to the material's base color. */
  base: string;
  /** Darker mottle mixed into low-noise regions (crevices read deeper). */
  shadowTone: string;
  /** Lighter mottle mixed into high-noise regions (ridges catch light). */
  lightTone: string;
  /** Emissive/radiant accent (kept subtle; bloom does the rest later). */
  glow: string;
  /** Fresnel/rim energy color shared by both hemispheres' logic. */
  rim: string;
}

/** Organic hemisphere — tissue, wax, angiography warmth. */
export const ORGANIC_PALETTE: HemispherePalette = {
  // Coral clay — the dominant skin of unprocessed thought.
  base: '#A85D42', // hsl(16, 44%, 46%) — desaturated anatomical coral, not toy-red
  // Umber — pools inside sulci so grooves read as depth, not dirt.
  shadowTone: '#3F2018', // hsl(12, 45%, 17%) — near-black umber with red bias
  // Blush — ridge crests catching studio key light.
  lightTone: '#C97B5A', // hsl(18, 51%, 57%) — lifted wax-blush highlight tone
  // Golden translucency — thin-fold backlight, MRI-angiography warmth.
  glow: '#E8B58C', // hsl(27, 67%, 73%) — candlelit skin glow, never yellow-neon
  // Warm rim — grazing-edge energy so the silhouette stays alive.
  rim: '#FFDDB8', // hsl(31, 100%, 86%) — pale apricot fresnel kiss
};

/** Technological hemisphere — graphite instrument, cold precise light. */
export const TECHNO_PALETTE: HemispherePalette = {
  // Obsidian — near-black blue-neutral chassis base.
  base: '#1A1D22', // hsl(218, 13%, 12%) — reads black without dying to pure #000
  // Etched groove floor — one step below base so engraving stays visible.
  shadowTone: '#0E1114', // hsl(210, 18%, 7%) — abyssal panel-line tone
  // Brushed steel streak — anisotropic highlight riding the brush direction.
  lightTone: '#4A525C', // hsl(213, 11%, 33%) — gunmetal sheen, zero saturation excess
  // Circuit trace glow — restrained cyan-WHITE (high lightness kills neon).
  glow: '#9FE8FF', // hsl(194, 100%, 81%) — pale ice-cyan, precision-instrument grade
  // Energized fresnel edge — colder and quieter than the traces.
  rim: '#6FC8E8', // hsl(196, 72%, 67%) — steel-blue rim for silhouette authority
};

/**
 * Secondary accents used sparingly by later stages but defined now so the
 * language stays closed under this palette.
 */
export const ORGANIC_ACCENTS = {
  /** Deep arteriole red — vessel tree tint (Stage: vasculature). */
  vessel: '#B4462F', // hsl(10, 59%, 45%) — oxygenated blood, muted not gory
  /** Moist specular sheen tint for the physical material's sheen layer. */
  sheen: '#F2C9A8', // hsl(27, 74%, 80%) — dewy wax highlight, slightly pinker than glow
} as const;

export const TECHNO_ACCENTS = {
  /** Recently-fired solder joint — momentary white-hot core inside nodes. */
  solderFlare: '#FFE8CC', // hsl(33, 100%, 90%) — thermal flash fading to cyan
  /** Brushed mid-metal for plates/trims that must not glow at all. */
  graphite: '#2B3037', // hsl(215, 12%, 19%) — passive chassis metal
} as const;

/** Studio lighting rig colors — same logic lights both hemispheres. */
export const STUDIO_RIG = {
  /** Key: warm directional from upper-right (flatters the organic side). */
  key: '#FFE3C2', // hsl(31, 100%, 88%) — tungsten-warmed white
  /** Fill: cool low-intensity opposite (keeps the techno side honest). */
  fill: '#BFD4E8', // hsl(214, 41%, 83%) — north-window blue-white
  /** Back/rim: neutral separation light behind both spheres. */
  back: '#FFFFFF', // hsl(0, 0%, 100%) — pure separation, no color cast
} as const;

/** Scene environment neutrals (background/contact-shadow tones). */
export const PREVIEW_STAGE = {
  /** Void backdrop — one step above pure black for silhouette readability. */
  void: '#101114', // hsl(225, 13%, 7%)
  /** Contact shadow tint under the spheres. */
  groundShadow: '#050607', // hsl(210, 29%, 2%)
} as const;

const ALL_VALUES: string[] = [
  ORGANIC_PALETTE.base, ORGANIC_PALETTE.shadowTone, ORGANIC_PALETTE.lightTone, ORGANIC_PALETTE.glow, ORGANIC_PALETTE.rim,
  TECHNO_PALETTE.base, TECHNO_PALETTE.shadowTone, TECHNO_PALETTE.lightTone, TECHNO_PALETTE.glow, TECHNO_PALETTE.rim,
  ORGANIC_ACCENTS.vessel, ORGANIC_ACCENTS.sheen,
  TECHNO_ACCENTS.solderFlare, TECHNO_ACCENTS.graphite,
  STUDIO_RIG.key, STUDIO_RIG.fill, STUDIO_RIG.back,
  PREVIEW_STAGE.void, PREVIEW_STAGE.groundShadow,
];

/** True if `value` is a well-formed `#RRGGBB` literal. */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Palette integrity guard — cheap to run in tests. */
export function assertPaletteIntegrity(): void {
  const seen = new Set<string>();
  for (const v of ALL_VALUES) {
    if (!isHexColor(v)) throw new Error(`Palette value is not #RRGGBB: ${v}`);
    if (seen.has(v.toLowerCase())) throw new Error(`Duplicate palette value: ${v}`);
    seen.add(v.toLowerCase());
  }
}
