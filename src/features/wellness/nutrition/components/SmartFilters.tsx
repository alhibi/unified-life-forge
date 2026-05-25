/**
 * SmartFilters — Dietary tag filters panel.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { DietaryTag } from '../types';

type Lang = 'ar' | 'de';

interface Props {
  lang: Lang;
  activeTags: DietaryTag[];
  onTagsChange: (tags: DietaryTag[]) => void;
  onClose: () => void;
}

const FILTER_TAGS: { tag: DietaryTag; label: { ar: string; de: string }; emoji: string }[] = [
  { tag: 'halal', label: { ar: 'حلال', de: 'Halal' }, emoji: '☪️' },
  { tag: 'vegan', label: { ar: 'نباتي', de: 'Vegan' }, emoji: '🌱' },
  { tag: 'vegetarian', label: { ar: 'نباتي+', de: 'Vegetarisch' }, emoji: '🥬' },
  { tag: 'gluten_free', label: { ar: 'بلا غلوتين', de: 'Glutenfrei' }, emoji: '🌾' },
  { tag: 'dairy_free', label: { ar: 'بلا ألبان', de: 'Milchfrei' }, emoji: '🥛' },
  { tag: 'high_protein', label: { ar: 'عالي البروتين', de: 'Proteinreich' }, emoji: '💪' },
  { tag: 'high_fiber', label: { ar: 'عالي الألياف', de: 'Ballaststoffreich' }, emoji: '🌿' },
  { tag: 'low_carb', label: { ar: 'قليل الكربوهيدرات', de: 'Low-Carb' }, emoji: '📉' },
  { tag: 'keto_friendly', label: { ar: 'كيتو', de: 'Keto' }, emoji: '🥑' },
  { tag: 'heart_healthy', label: { ar: 'صحة القلب', de: 'Herzgesund' }, emoji: '❤️' },
  { tag: 'anti_inflammatory', label: { ar: 'مضاد التهاب', de: 'Entzündungshemmend' }, emoji: '🛡️' },
  { tag: 'brain_food', label: { ar: 'غذاء الدماغ', de: 'Brainfood' }, emoji: '🧠' },
  { tag: 'muscle_building', label: { ar: 'بناء عضلات', de: 'Muskelaufbau' }, emoji: '🏋️' },
  { tag: 'weight_loss', label: { ar: 'فقدان وزن', de: 'Abnehmen' }, emoji: '⚖️' },
  { tag: 'energy_boost', label: { ar: 'طاقة', de: 'Energie' }, emoji: '⚡' },
  { tag: 'immune_boost', label: { ar: 'مناعة', de: 'Immunsystem' }, emoji: '🛡️' },
  { tag: 'gut_health', label: { ar: 'صحة أمعاء', de: 'Darmgesundheit' }, emoji: '🦠' },
  { tag: 'skin_health', label: { ar: 'صحة بشرة', de: 'Hautgesundheit' }, emoji: '✨' },
  { tag: 'bone_health', label: { ar: 'صحة عظام', de: 'Knochengesundheit' }, emoji: '🦴' },
];

export default function SmartFilters({ lang, activeTags, onTagsChange, onClose }: Props) {
  const toggle = (tag: DietaryTag) => {
    if (activeTags.includes(tag)) {
      onTagsChange(activeTags.filter(t => t !== tag));
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
          <span className="text-xs font-semibold text-foreground">
            {lang === 'ar' ? 'فلترة حسب' : 'Filtern nach'}
          </span>
          {activeTags.length > 0 && (
            <button onClick={() => onTagsChange([])} className="text-[10px] text-primary">
              {lang === 'ar' ? 'مسح الكل' : 'Alle löschen'}
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
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all active:scale-95 ${
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
