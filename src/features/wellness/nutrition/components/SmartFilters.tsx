/**
 * SmartFilters — Dietary tag filters panel.
 */
import { motion } from 'framer-motion';
import React from 'react';

import type { DietaryTag } from '../types';

type Lang = 'ar';

interface Props {
  lang: Lang;
  activeTags: DietaryTag[];
  onTagsChange: (tags: DietaryTag[]) => void;
  onClose?: () => void;
}

const FILTER_TAGS: { tag: DietaryTag; label: { ar: string; }; emoji: string }[] = [
  { tag: 'halal', label: { ar: 'حلال', }, emoji: '☪️' },
  { tag: 'vegan', label: { ar: 'نباتي', }, emoji: '🌱' },
  { tag: 'vegetarian', label: { ar: 'نباتي+', }, emoji: '🥬' },
  { tag: 'gluten_free', label: { ar: 'بلا غلوتين', }, emoji: '🌾' },
  { tag: 'dairy_free', label: { ar: 'بلا ألبان', }, emoji: '🥛' },
  { tag: 'high_protein', label: { ar: 'عالي البروتين', }, emoji: '💪' },
  { tag: 'high_fiber', label: { ar: 'عالي الألياف', }, emoji: '🌿' },
  { tag: 'low_carb', label: { ar: 'قليل الكربوهيدرات', }, emoji: '📉' },
  { tag: 'keto_friendly', label: { ar: 'كيتو', }, emoji: '🥑' },
  { tag: 'heart_healthy', label: { ar: 'صحة القلب', }, emoji: '❤️' },
  { tag: 'anti_inflammatory', label: { ar: 'مضاد التهاب', }, emoji: '🛡️' },
  { tag: 'brain_food', label: { ar: 'غذاء الدماغ', }, emoji: '🧠' },
  { tag: 'muscle_building', label: { ar: 'بناء عضلات', }, emoji: '🏋️' },
  { tag: 'weight_loss', label: { ar: 'فقدان وزن', }, emoji: '⚖️' },
  { tag: 'energy_boost', label: { ar: 'طاقة', }, emoji: '⚡' },
  { tag: 'immune_boost', label: { ar: 'مناعة', }, emoji: '🛡️' },
  { tag: 'gut_health', label: { ar: 'صحة أمعاء', }, emoji: '🦠' },
  { tag: 'skin_health', label: { ar: 'صحة بشرة', }, emoji: '✨' },
  { tag: 'bone_health', label: { ar: 'صحة عظام', }, emoji: '🦴' },
];

export default function SmartFilters({ lang, activeTags, onTagsChange, onClose: _onClose }: Props) {
  const toggle = (tag: DietaryTag) => {
    if (activeTags.includes(tag)) {
      onTagsChange(activeTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...activeTags, tag]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-mini font-semibold text-foreground">
            {'فلترة حسب'}
          </span>
          {activeTags.length > 0 && (
            <button onClick={() => onTagsChange([])} className="text-micro text-primary">
              {'مسح الكل'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TAGS.map(({ tag, label, emoji }) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggle(tag)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-micro font-medium transition-all active:scale-95 ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border border-border/50 text-foreground/70'
                }`}
              >
                <span>{emoji}</span>
                <span>{label[lang]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
