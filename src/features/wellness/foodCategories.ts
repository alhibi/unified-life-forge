/**
 * Food categorization: maps every food key to a precise group
 * with a Lucide icon and a stable color token. Replaces the random
 * emoji icons with consistent visual taxonomy.
 */
import {
  Apple, Citrus, Cherry, Carrot, Leaf, Salad, Beef, Fish, Egg,
  Milk, Bean, Nut, Wheat, CupSoda, Droplet, Droplets, Sprout, Cookie,
  type LucideIcon,
} from '@/lib/icons';
import type { Lang } from './wellnessData';

export type FoodCategory =
  | 'fruit' | 'citrus' | 'berry'
  | 'vegetable' | 'leafy' | 'starchy_veg'
  | 'meat' | 'seafood' | 'egg' | 'dairy'
  | 'legume' | 'nut_seed' | 'grain'
  | 'beverage' | 'water' | 'fat_oil' | 'spice_herb' | 'sweet_treat';

export interface CategoryMeta {
  icon: LucideIcon;
  /** tailwind text color class for the icon */
  color: string;
  /** tailwind background tint (10% alpha) for the icon chip */
  bg: string;
  label: Record<Lang, string>;
  /** sort order for sectioning */
  order: number;
}

export const CATEGORY_META: Record<FoodCategory, CategoryMeta> = {
  fruit:        { icon: Apple,    color: 'text-red-500',     bg: 'bg-red-500/10',     order: 1,  label: { ar: 'فواكه',        de: 'Obst'              } },
  citrus:       { icon: Citrus,   color: 'text-orange-500',  bg: 'bg-orange-500/10',  order: 2,  label: { ar: 'حمضيات',       de: 'Zitrusfrüchte'     } },
  berry:        { icon: Cherry,   color: 'text-pink-500',    bg: 'bg-pink-500/10',    order: 3,  label: { ar: 'توتيات',       de: 'Beeren'            } },
  vegetable:    { icon: Carrot,   color: 'text-orange-400',  bg: 'bg-orange-400/10',  order: 4,  label: { ar: 'خضروات',       de: 'Gemüse'            } },
  leafy:        { icon: Leaf,     color: 'text-emerald-500', bg: 'bg-emerald-500/10', order: 5,  label: { ar: 'ورقيات خضراء', de: 'Blattgemüse'       } },
  starchy_veg:  { icon: Salad,    color: 'text-amber-600',   bg: 'bg-amber-600/10',   order: 6,  label: { ar: 'خضروات نشوية', de: 'Stärkegemüse'      } },
  meat:         { icon: Beef,     color: 'text-rose-500',    bg: 'bg-rose-500/10',    order: 7,  label: { ar: 'لحوم ودواجن',  de: 'Fleisch & Geflügel'} },
  seafood:      { icon: Fish,     color: 'text-sky-500',     bg: 'bg-sky-500/10',     order: 8,  label: { ar: 'مأكولات بحرية',de: 'Meeresfrüchte'     } },
  egg:          { icon: Egg,      color: 'text-amber-400',   bg: 'bg-amber-400/10',   order: 9,  label: { ar: 'بيض',          de: 'Eier'              } },
  dairy:        { icon: Milk,     color: 'text-blue-300',    bg: 'bg-blue-300/10',    order: 10, label: { ar: 'ألبان',        de: 'Milchprodukte'     } },
  legume:       { icon: Bean,     color: 'text-purple-500',  bg: 'bg-purple-500/10',  order: 11, label: { ar: 'بقوليات',      de: 'Hülsenfrüchte'     } },
  nut_seed:     { icon: Nut,      color: 'text-amber-700',   bg: 'bg-amber-700/10',   order: 12, label: { ar: 'مكسرات وبذور', de: 'Nüsse & Samen'     } },
  grain:        { icon: Wheat,    color: 'text-yellow-500',  bg: 'bg-yellow-500/10',  order: 13, label: { ar: 'حبوب ونشويات', de: 'Getreide'          } },
  beverage:     { icon: CupSoda,  color: 'text-cyan-500',    bg: 'bg-cyan-500/10',    order: 14, label: { ar: 'مشروبات',      de: 'Getränke'          } },
  water:        { icon: Droplets, color: 'text-cyan-400',    bg: 'bg-cyan-400/10',    order: 15, label: { ar: 'ماء',          de: 'Wasser'            } },
  fat_oil:      { icon: Droplet,  color: 'text-yellow-600',  bg: 'bg-yellow-600/10',  order: 16, label: { ar: 'دهون وزيوت',   de: 'Fette & Öle'       } },
  spice_herb:   { icon: Sprout,   color: 'text-emerald-600', bg: 'bg-emerald-600/10', order: 17, label: { ar: 'توابل وأعشاب', de: 'Gewürze & Kräuter' } },
  sweet_treat:  { icon: Cookie,   color: 'text-amber-500',   bg: 'bg-amber-500/10',   order: 18, label: { ar: 'حلويات',       de: 'Süßes'             } },
};

/** Explicit mapping: every food key → category. */
export const FOOD_CATEGORY: Record<string, FoodCategory> = {
  // fruit
  apple: 'fruit', pear: 'fruit', grape: 'fruit', watermelon: 'fruit', melon: 'fruit',
  pineapple: 'fruit', mango: 'fruit', peach: 'fruit', banana: 'fruit', kiwi: 'fruit',
  papaya: 'fruit', guava: 'fruit', avocado: 'fruit', fig: 'fruit', apricot: 'fruit',
  raisins: 'fruit', prunes: 'fruit', dates: 'fruit',
  // citrus
  orange: 'citrus', lemon: 'citrus', grapefruit: 'citrus',
  // berry
  strawberry: 'berry', cherry: 'berry', blueberry: 'berry', raspberry: 'berry',
  pomegranate: 'berry',
  // vegetable
  tomato: 'vegetable', cucumber: 'vegetable', bell_pepper: 'vegetable', onion: 'vegetable',
  garlic: 'vegetable', zucchini: 'vegetable', eggplant: 'vegetable', cauliflower: 'vegetable',
  cabbage: 'vegetable', brussels_sprouts: 'vegetable', asparagus: 'vegetable',
  green_beans: 'vegetable', peas: 'vegetable', beet: 'vegetable', radish: 'vegetable',
  okra: 'vegetable', artichoke: 'vegetable', mushroom: 'vegetable',
  broccoli: 'vegetable', carrot: 'vegetable',
  // leafy
  spinach: 'leafy', kale: 'leafy', celery: 'leafy', arugula: 'leafy',
  lettuce: 'leafy', parsley: 'leafy', cilantro: 'leafy', mint: 'leafy', molokhia: 'leafy',
  // starchy veg
  potato: 'starchy_veg', sweet_potato: 'starchy_veg', pumpkin: 'starchy_veg', corn: 'starchy_veg',
  // meat
  chicken: 'meat', beef: 'meat', liver: 'meat', turkey: 'meat', lamb: 'meat', duck: 'meat',
  // seafood
  fish: 'seafood', salmon: 'seafood', tuna: 'seafood', sardines: 'seafood',
  mackerel: 'seafood', shrimp: 'seafood', oyster: 'seafood',
  // egg
  eggs: 'egg', egg_yolk: 'egg',
  // dairy
  yogurt: 'dairy', milk: 'dairy', cheese: 'dairy', cottage_cheese: 'dairy',
  feta: 'dairy', kefir: 'dairy', butter: 'dairy', ghee: 'dairy',
  labneh: 'dairy', kishk: 'dairy',
  // legume
  beans: 'legume', lentils: 'legume', chickpeas: 'legume', black_beans: 'legume',
  edamame: 'legume', tofu: 'legume', tempeh: 'legume', hummus: 'legume',
  falafel: 'legume', fava_beans: 'legume',
  // nuts & seeds
  almonds: 'nut_seed', walnuts: 'nut_seed', pistachios: 'nut_seed', cashews: 'nut_seed',
  hazelnuts: 'nut_seed', brazil_nuts: 'nut_seed', peanuts: 'nut_seed', pecans: 'nut_seed',
  chia_seeds: 'nut_seed', flax_seeds: 'nut_seed', pumpkin_seeds: 'nut_seed',
  sunflower_seeds: 'nut_seed', sesame: 'nut_seed', tahini: 'nut_seed',
  // grain
  oats: 'grain', rice: 'grain', brown_rice: 'grain', quinoa: 'grain', bulgur: 'grain',
  couscous: 'grain', barley: 'grain', whole_bread: 'grain', pita: 'grain', pasta: 'grain',
  freekeh: 'grain',
  // beverage
  coffee: 'beverage', tea: 'beverage', green_tea: 'beverage', black_tea: 'beverage',
  herbal_tea: 'beverage', matcha: 'beverage', orange_juice: 'beverage',
  pomegranate_juice: 'beverage', coconut_water: 'beverage',
  // water
  water: 'water',
  // fat & oil
  olive_oil: 'fat_oil', coconut_oil: 'fat_oil', fish_oil: 'fat_oil',
  // spice & herb
  turmeric: 'spice_herb', ginger: 'spice_herb', cinnamon: 'spice_herb',
  black_seed: 'spice_herb', saffron: 'spice_herb', zaatar: 'spice_herb',
  // sweet treat
  honey: 'sweet_treat', dark_chocolate: 'sweet_treat',
};

export function categoryOf(key: string): FoodCategory {
  return FOOD_CATEGORY[key] ?? 'vegetable';
}
