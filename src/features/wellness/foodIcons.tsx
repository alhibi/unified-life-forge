/**
 * Per-food SVG icons — monoline style matching Lucide (24×24, stroke-width 2,
 * round caps/joins). Each icon is a distinct visual representation of the food.
 *
 * Foods without a dedicated icon fall back to their category's Lucide icon
 * (Apple for fruits, Carrot for vegetables, etc.) — which is perfectly
 * acceptable since the food name is always shown alongside the icon.
 *
 * All SVGs are inline React components — no external dependencies.
 */
import React from 'react';
import { CATEGORY_META, categoryOf } from './foodCategories';

/* ─────────────────── Inline SVG icon components ──────────────────────────── */
/* Every icon: viewBox="0 0 24 24", fill="none", stroke="currentColor",
   strokeWidth={2}, strokeLinecap="round", strokeLinejoin="round" */

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ── Fruits ──
const BananaIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M5 20c2-4 4-14 12-14 1 0 2 .5 2 2s-3 5-8 8c-3 2-5 3-6 4" /></svg>
);
const GrapeIcon = (p: any) => (
  <svg {...svgProps} {...p}><circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="12" cy="16" r="2" /><circle cx="12" cy="8" r="2" /><path d="M12 3v3" /></svg>
);
const WatermelonIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M4 18a14 14 0 0 1 16 0" /><path d="M12 4v14" /><path d="M4 18c0-8 4-14 8-14s8 6 8 14" /></svg>
);
const PineappleIcon = (p: any) => (
  <svg {...svgProps} {...p}><ellipse cx="12" cy="14" rx="5" ry="7" /><path d="M12 7V3m-3 5-2-3m6 3 2-3" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
);
const AvocadoIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 2c-4 0-7 5-7 10s3 10 7 10 7-5 7-10S16 2 12 2z" /><circle cx="12" cy="14" r="3" /></svg>
);
const MangoIcon = (p: any) => (
  <svg {...svgProps} {...p}><ellipse cx="12" cy="13" rx="6" ry="8" /><path d="M12 5c0-2 1-3 3-3" /></svg>
);

// ── Vegetables ──
const TomatoIcon = (p: any) => (
  <svg {...svgProps} {...p}><circle cx="12" cy="14" r="7" /><path d="M12 7c-1-2 0-4 2-5m-2 5c1-2 0-4-2-5" /><path d="M9 7h6" /></svg>
);
const BroccoliIcon = (p: any) => (
  <svg {...svgProps} {...p}><circle cx="12" cy="8" r="3" /><circle cx="8" cy="10" r="2.5" /><circle cx="16" cy="10" r="2.5" /><path d="M12 13v8m-2-4h4" /></svg>
);
const EggplantIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 3c1 0 2 1 2 2-2 1-4 4-4 8 0 5 2 8 4 8s4-3 4-8c0-4-2-7-4-8 0-1 1-2 2-2" /><path d="M10 5c-1 0-2-1-2-2" /></svg>
);
const OnionIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 4c-4 0-7 4-7 9 0 4 3 7 7 7s7-3 7-7c0-5-3-9-7-9z" /><path d="M12 4V2" /><path d="M9 10c0-2 1.5-4 3-4s3 2 3 4" /></svg>
);
const MushroomIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 12c-5 0-9-2-9-5s4-5 9-5 9 2 9 5-4 5-9 5z" /><path d="M10 12v7c0 1 1 2 2 2s2-1 2-2v-7" /></svg>
);
const CornIcon = (p: any) => (
  <svg {...svgProps} {...p}><ellipse cx="12" cy="11" rx="4" ry="8" /><path d="M8 11h8m-8 3h8m-8-6h8" /><path d="M12 19v3" /></svg>
);

// ── Meat & Poultry ──
const ChickenLegIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M15 5a5 5 0 0 1-3 9l-2 2-3 3" /><circle cx="15" cy="6" r="4" /><path d="M7 19l1-1" /></svg>
);
const SteakIcon = (p: any) => (
  <svg {...svgProps} {...p}><ellipse cx="12" cy="12" rx="9" ry="7" /><path d="M8 12c1-1 3-1 4 0s3 1 4 0" /><circle cx="9" cy="10" r="1" fill="currentColor" /></svg>
);

// ── Seafood ──
const FishIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M2 12s4-5 10-5 10 5 10 5-4 5-10 5S2 12 2 12z" /><path d="M20 12l2-2m-2 2l2 2" /><circle cx="7" cy="12" r="1" fill="currentColor" /></svg>
);
const ShrimpIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M18 6c0 3-2 5-5 6l-5 4c-1 1-2 0-2-1v-2c0-2 2-4 4-5l4-2c2-1 4 0 4 0z" /><path d="M18 6c1-2 0-4-2-4" /></svg>
);

// ── Eggs ──
const EggIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 3c-4 0-6 5-6 9a6 6 0 0 0 12 0c0-4-2-9-6-9z" /></svg>
);
const FriedEggIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 3C8 3 4 6 4 11c0 4 3 8 8 8s8-4 8-8c0-5-4-8-8-8z" /><circle cx="12" cy="12" r="3" /></svg>
);

// ── Dairy ──
const CheeseIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M2 18l10-6 10 6v2H2z" /><path d="M2 18V8l10 4" /><circle cx="7" cy="16" r="1" /><circle cx="14" cy="17" r="1" /></svg>
);
const MilkIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M8 2h8l1 4v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V6z" /><path d="M8 6h8" /><path d="M9 10c1 1 2 1 3 0s2-1 3 0" /></svg>
);

// ── Grains ──
const BreadIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M5 10c0-3 3-5 7-5s7 2 7 5" /><rect x="5" y="10" width="14" height="9" rx="2" /><path d="M8 14h8" /></svg>
);
const RiceIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M6 18c0-4 3-7 6-7s6 3 6 7" /><path d="M6 18h12" /><ellipse cx="10" cy="14" rx="1" ry="1.5" /><ellipse cx="14" cy="14" rx="1" ry="1.5" /><ellipse cx="12" cy="12" rx="1" ry="1.5" /></svg>
);
const PastaIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M4 16c2-2 5-3 8-3s6 1 8 3" /><path d="M6 8c2 3 4 5 6 5s4-2 6-5" /><path d="M8 4c1 2 2 4 4 4s3-2 4-4" /></svg>
);

// ── Nuts ──
const NutIcon = (p: any) => (
  <svg {...svgProps} {...p}><ellipse cx="12" cy="13" rx="5" ry="6" /><path d="M10 7c1-2 3-2 4 0" /><path d="M9 13c1-1 2-1 3 0s2 1 3 0" /></svg>
);
const PeanutIcon = (p: any) => (
  <svg {...svgProps} {...p}><ellipse cx="12" cy="8" rx="3" ry="4" /><ellipse cx="12" cy="16" rx="3" ry="4" /><path d="M9 12h6" /></svg>
);

// ── Beverages ──
const CoffeeIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" /></svg>
);
const TeaCupIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M17 8h2a3 3 0 0 1 0 6h-2" /><path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><path d="M7 3c0 1 1 2 2 2s2-1 2-2" /></svg>
);

// ── Oils ──
const OilBottleIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M10 2h4v4l2 2v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-2V2z" /><path d="M10 12c1 1 3 1 4 0" /></svg>
);

// ── Spices ──
const GingerIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 8c-2 0-4 2-4 4s2 6 5 6c2 0 3-2 3-4" /><path d="M12 8c2-1 5 0 5 3" /><path d="M12 8c-1-2-3-3-5-2" /></svg>
);
const HoneyIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M8 6h8l1 3v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V9z" /><path d="M8 6c0-2 2-4 4-4s4 2 4 4" /><path d="M8 12h8" /><path d="M10 15h4" /></svg>
);
const ChocolateIcon = (p: any) => (
  <svg {...svgProps} {...p}><rect x="4" y="6" width="16" height="12" rx="2" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="9" y1="6" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="18" /></svg>
);

// ── Water ──
const WaterDropIcon = (p: any) => (
  <svg {...svgProps} {...p}><path d="M12 2c-4 6-7 9-7 13a7 7 0 0 0 14 0c0-4-3-7-7-13z" /></svg>
);

/* ─────────────────── Food key → Icon component mapping ───────────────────── */

/**
 * Maps specific food keys to their dedicated SVG icon component.
 * Foods not listed here use their category's Lucide icon as fallback.
 */
const FOOD_ICON_MAP: Record<string, React.FC<any>> = {
  // Fruits
  banana: BananaIcon,
  grape: GrapeIcon,
  watermelon: WatermelonIcon,
  pineapple: PineappleIcon,
  avocado: AvocadoIcon,
  mango: MangoIcon,
  raisins: GrapeIcon,

  // Vegetables
  tomato: TomatoIcon,
  broccoli: BroccoliIcon,
  eggplant: EggplantIcon,
  onion: OnionIcon,
  garlic: OnionIcon,
  mushroom: MushroomIcon,
  corn: CornIcon,

  // Meat
  chicken: ChickenLegIcon,
  beef: SteakIcon,
  lamb: SteakIcon,
  liver: SteakIcon,
  turkey: ChickenLegIcon,
  duck: ChickenLegIcon,

  // Seafood
  fish: FishIcon,
  salmon: FishIcon,
  tuna: FishIcon,
  sardines: FishIcon,
  mackerel: FishIcon,
  shrimp: ShrimpIcon,

  // Eggs
  eggs: EggIcon,
  egg_yolk: FriedEggIcon,

  // Dairy
  cheese: CheeseIcon,
  cottage_cheese: CheeseIcon,
  feta: CheeseIcon,
  milk: MilkIcon,
  yogurt: MilkIcon,
  kefir: MilkIcon,
  labneh: MilkIcon,

  // Grains
  whole_bread: BreadIcon,
  pita: BreadIcon,
  rice: RiceIcon,
  brown_rice: RiceIcon,
  pasta: PastaIcon,

  // Nuts
  almonds: NutIcon,
  walnuts: NutIcon,
  pistachios: NutIcon,
  cashews: NutIcon,
  hazelnuts: NutIcon,
  brazil_nuts: NutIcon,
  pecans: NutIcon,
  peanuts: PeanutIcon,

  // Beverages
  coffee: CoffeeIcon,
  tea: TeaCupIcon,
  green_tea: TeaCupIcon,
  black_tea: TeaCupIcon,
  herbal_tea: TeaCupIcon,
  matcha: TeaCupIcon,

  // Oils
  olive_oil: OilBottleIcon,
  coconut_oil: OilBottleIcon,
  fish_oil: OilBottleIcon,

  // Spices
  ginger: GingerIcon,

  // Water
  water: WaterDropIcon,

  // Sweet treats
  honey: HoneyIcon,
  dark_chocolate: ChocolateIcon,
};

/* ─────────────────── Public FoodIcon component ───────────────────────────── */

export interface FoodIconProps {
  /** Food key from the FOODS catalog, or `custom:<name>` for user entries. */
  foodKey: string;
  /** Visual size of the chip in px. Default 36. */
  size?: number;
  /**
   * Override the chip shape. Default `rounded-xl`. Use `rounded-full` for
   * compact inline chips (e.g. food chips inside text).
   */
  shape?: string;
}

/**
 * Renders a per-food icon inside a tinted chip. Uses a dedicated SVG when
 * available, otherwise falls back to the food's category Lucide icon.
 * All icons share the same monoline stroke style for visual consistency.
 */
export function FoodIcon({ foodKey, size = 36, shape = 'rounded-xl' }: FoodIconProps) {
  const cleanKey = foodKey.startsWith('custom:') ? foodKey.slice(7) : foodKey;
  const cat = categoryOf(cleanKey);
  const meta = CATEGORY_META[cat];

  // Try dedicated icon first, fall back to category icon
  const IconComponent = FOOD_ICON_MAP[cleanKey] ?? meta.icon;

  const iconSize = Math.round(size * 0.5);

  return (
    <div
      className={`${shape} ${meta.bg} flex items-center justify-center shrink-0`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <IconComponent
        className={meta.color}
        width={iconSize}
        height={iconSize}
        strokeWidth={2}
      />
    </div>
  );
}
