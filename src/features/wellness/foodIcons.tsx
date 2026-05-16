/**
 * Per-food realistic icons.
 *
 * Maps every food key from the FOODS catalog to a specific Unicode emoji
 * that visually represents the actual food. Falls back to the category
 * Lucide icon if a key is missing or marked as "no good emoji exists".
 *
 * Why emoji: Unicode food emojis are the only universally available source
 * of full-color, realistic food artwork that ships in every modern OS font
 * (Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji). Using a single
 * source guarantees visual consistency across foods — every icon has the
 * same illustration style, scale, and color saturation.
 */
import React from 'react';
import { CATEGORY_META, categoryOf } from './foodCategories';

/** key → emoji. Every entry is the most direct visual match available. */
export const FOOD_EMOJI: Record<string, string> = {
  // ── Fruits ──────────────────────────────────────────────
  apple: '🍎',
  pear: '🍐',
  grape: '🍇',
  watermelon: '🍉',
  melon: '🍈',
  pineapple: '🍍',
  mango: '🥭',
  peach: '🍑',
  banana: '🍌',
  kiwi: '🥝',
  papaya: '🍈', // closest visual, no dedicated papaya emoji
  guava: '🍈',
  avocado: '🥑',
  fig: '🍑', // no fig emoji; falls through to category in fallback
  apricot: '🍑',
  raisins: '🍇',
  prunes: '🍑',
  dates: '🌴', // palm; specific date fruit not in standard set

  // ── Citrus ──────────────────────────────────────────────
  orange: '🍊',
  lemon: '🍋',
  grapefruit: '🍊',

  // ── Berries ─────────────────────────────────────────────
  strawberry: '🍓',
  cherry: '🍒',
  blueberry: '🫐',
  raspberry: '🍓',
  pomegranate: '🍎',

  // ── Vegetables ──────────────────────────────────────────
  tomato: '🍅',
  cucumber: '🥒',
  bell_pepper: '🫑',
  onion: '🧅',
  garlic: '🧄',
  zucchini: '🥒',
  eggplant: '🍆',
  cauliflower: '🥦',
  cabbage: '🥬',
  brussels_sprouts: '🥬',
  asparagus: '🥬',
  green_beans: '🫛',
  peas: '🫛',
  beet: '🥕',
  radish: '🥕',
  okra: '🫛',
  artichoke: '🥬',
  mushroom: '🍄',
  broccoli: '🥦',
  carrot: '🥕',

  // ── Leafy ───────────────────────────────────────────────
  spinach: '🥬',
  kale: '🥬',
  celery: '🥬',
  arugula: '🥬',
  lettuce: '🥬',
  parsley: '🌿',
  cilantro: '🌿',
  mint: '🌿',
  molokhia: '🌿',

  // ── Starchy veg ─────────────────────────────────────────
  potato: '🥔',
  sweet_potato: '🍠',
  pumpkin: '🎃',
  corn: '🌽',

  // ── Meat & poultry ──────────────────────────────────────
  chicken: '🍗',
  beef: '🥩',
  liver: '🥩',
  turkey: '🦃',
  lamb: '🥩',
  duck: '🦆',

  // ── Seafood ─────────────────────────────────────────────
  fish: '🐟',
  salmon: '🐟',
  tuna: '🐟',
  sardines: '🐟',
  mackerel: '🐟',
  shrimp: '🦐',
  oyster: '🦪',

  // ── Eggs ────────────────────────────────────────────────
  eggs: '🥚',
  egg_yolk: '🍳',

  // ── Dairy ───────────────────────────────────────────────
  yogurt: '🥛',
  milk: '🥛',
  cheese: '🧀',
  cottage_cheese: '🧀',
  feta: '🧀',
  kefir: '🥛',
  butter: '🧈',
  ghee: '🧈',
  labneh: '🥛',
  kishk: '🥛',

  // ── Legumes ─────────────────────────────────────────────
  beans: '🫘',
  lentils: '🫘',
  chickpeas: '🫘',
  black_beans: '🫘',
  edamame: '🫛',
  tofu: '🧈',
  tempeh: '🧈',
  hummus: '🫘',
  falafel: '🫘',
  fava_beans: '🫘',

  // ── Nuts & seeds ────────────────────────────────────────
  almonds: '🌰',
  walnuts: '🌰',
  pistachios: '🌰',
  cashews: '🌰',
  hazelnuts: '🌰',
  brazil_nuts: '🌰',
  peanuts: '🥜',
  pecans: '🌰',
  chia_seeds: '🌱',
  flax_seeds: '🌱',
  pumpkin_seeds: '🎃',
  sunflower_seeds: '🌻',
  sesame: '🌱',
  tahini: '🌱',

  // ── Grains ──────────────────────────────────────────────
  oats: '🌾',
  rice: '🍚',
  brown_rice: '🍚',
  quinoa: '🌾',
  bulgur: '🌾',
  couscous: '🌾',
  barley: '🌾',
  whole_bread: '🍞',
  pita: '🫓',
  pasta: '🍝',
  freekeh: '🌾',

  // ── Beverages ───────────────────────────────────────────
  coffee: '☕',
  tea: '🍵',
  green_tea: '🍵',
  black_tea: '🍵',
  herbal_tea: '🍵',
  matcha: '🍵',
  orange_juice: '🍹',
  pomegranate_juice: '🍹',
  coconut_water: '🥥',

  // ── Water ───────────────────────────────────────────────
  water: '💧',

  // ── Fats & oils ─────────────────────────────────────────
  olive_oil: '🫒',
  coconut_oil: '🥥',
  fish_oil: '🐟',

  // ── Spices & herbs ──────────────────────────────────────
  turmeric: '🌿',
  ginger: '🫚',
  cinnamon: '🌿',
  black_seed: '🌱',
  saffron: '🌸',
  zaatar: '🌿',

  // ── Sweet treats ────────────────────────────────────────
  honey: '🍯',
  dark_chocolate: '🍫',
};

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
 * Renders a per-food icon: a specific emoji for the food when one exists,
 * sitting inside a chip that is tinted with its category color so the
 * grid still reads as a coherent set.
 */
export function FoodIcon({ foodKey, size = 36, shape = 'rounded-xl' }: FoodIconProps) {
  // Strip "custom:" prefix so user-named foods still get a category guess
  const cleanKey = foodKey.startsWith('custom:') ? foodKey.slice(7) : foodKey;
  const cat = categoryOf(cleanKey);
  const meta = CATEGORY_META[cat];
  const emoji = FOOD_EMOJI[cleanKey];

  // Emoji should occupy ~62% of the chip — large enough to read clearly
  // without crowding the chip border.
  const emojiSize = Math.round(size * 0.62);

  return (
    <div
      className={`${shape} ${meta.bg} flex items-center justify-center shrink-0`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {emoji ? (
        <span
          className="leading-none select-none"
          style={{
            // Force the emoji-bearing system fonts so the icon renders with
            // colored OS artwork even if the app font does not include emoji
            // glyphs. Falls back to the platform's color emoji font.
            fontFamily:
              '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", system-ui, sans-serif',
            fontSize: emojiSize,
            // Vertical optical centering — emojis usually render with extra
            // baseline padding that pushes them visually high inside flex.
            lineHeight: 1,
            transform: 'translateY(0.5px)',
          }}
        >
          {emoji}
        </span>
      ) : (
        // Fallback: the category Lucide icon, sized proportionally
        <meta.icon
          className={meta.color}
          strokeWidth={2}
          style={{ width: emojiSize * 0.7, height: emojiSize * 0.7 }}
        />
      )}
    </div>
  );
}
