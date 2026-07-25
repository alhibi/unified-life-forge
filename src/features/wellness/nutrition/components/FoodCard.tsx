/**
 * FoodCard — Compact food item card with macro highlights.
 */
import { motion } from 'framer-motion';
import React from 'react';

import { Flame, Heart } from '@/lib/icons';

import type { NutritionFoodItem } from '../types';
import { isFavorite } from '../utils';

type Lang = 'ar';

interface Props {
  food: NutritionFoodItem;
  lang: Lang;
  onClick: () => void;
  compact?: boolean;
}

export default function FoodCard({ food, lang, onClick, compact }: Props) {
  const n = food.nutrition;
  const fav = isFavorite(food.id);

  return (
    <motion.button
      layout
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition-all text-start relative"
    >
      {/* Emoji icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ backgroundColor: `${food.color}15` }}
      >
        {food.emoji}
      </div>

      {/* Name & category */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-semibold text-foreground truncate">{food.name[lang]}</p>
        {!compact && (
          <div className="flex items-center gap-3 mt-1 text-[0.625rem] text-muted-foreground" dir="ltr">
            <span className="inline-flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 text-orange-500" />
              <span className="font-semibold text-foreground">{n.kcal}</span>
              <span>kcal</span>
            </span>
            <span className="text-rose-500 font-medium">P:{n.protein}g</span>
            <span className="text-amber-500">C:{n.carbs}g</span>
            <span className="text-cyan-500">F:{n.fat}g</span>
          </div>
        )}
      </div>

      {/* Favorite indicator */}
      {fav && <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />}

      {/* GI badge */}
      {food.glycemicIndex != null && food.glycemicIndex > 0 && !compact && (
        <div
          className={`shrink-0 text-[0.625rem] font-bold px-1.5 py-0.5 rounded-md ${
            food.glycemicIndex <= 35
              ? 'bg-emerald-500/10 text-emerald-600'
              : food.glycemicIndex <= 55
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-red-500/10 text-red-600'
          }`}
        >
          GI {food.glycemicIndex}
        </div>
      )}
    </motion.button>
  );
}
