/**
 * CategoryGrid — Visual grid of food categories with count badges.
 */
import { motion } from 'framer-motion';
import React from 'react';

import { CATEGORY_INFO } from '../data';
import type { NutritionCategory } from '../types';

type Lang = 'ar';

const VISIBLE_CATEGORIES: NutritionCategory[] = [
  'fruits',
  'vegetables',
  'meat_poultry',
  'fish_seafood',
  'dairy_eggs',
  'grains_cereals',
  'legumes_pulses',
  'nuts_seeds',
  'oils_fats',
  'beverages',
  'spices_herbs',
  'sweets_desserts',
  'prepared_foods',
];

interface Props {
  lang: Lang;
  onSelect: (category: NutritionCategory) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
};

export default function CategoryGrid({ lang, onSelect }: Props) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-2"
    >
      {VISIBLE_CATEGORIES.map((cat) => {
        const info = CATEGORY_INFO[cat];
        if (!info || info.count === 0) return null;
        return (
          <motion.button
            key={cat}
            variants={item}
            onClick={() => onSelect(cat)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 border border-border/30 active:scale-95 transition-all hover:bg-muted/60 relative overflow-hidden"
          >
            <span className="text-display">{info.emoji}</span>
            <span className="text-micro font-medium text-foreground text-center leading-tight line-clamp-2">
              {info.label[lang]}
            </span>
            <span className="absolute top-1.5 end-1.5 text-micro bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-bold">
              {info.count}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
