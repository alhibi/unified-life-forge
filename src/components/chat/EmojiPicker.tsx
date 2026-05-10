import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EMOJI_CATEGORIES } from './constants';

interface EmojiPickerProps {
  isAr: boolean;
  onPick: (emoji: string) => void;
  /** When true, clicking outside is handled by parent (e.g. collapse panel). */
  compact?: boolean;
}

const RECENT_KEY = 'ulf.chat.recentEmojis';
const RECENT_MAX = 24;

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch { return []; }
}

function pushRecent(emoji: string): string[] {
  const current = getRecent().filter(e => e !== emoji);
  current.unshift(emoji);
  const trimmed = current.slice(0, RECENT_MAX);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed)); } catch { /* quota */ }
  return trimmed;
}

/**
 * Categorized emoji picker used in the composer.
 * - Horizontal category strip (scrollable, with "recent" as first category)
 * - Grid of emojis below; taps insert at caret via parent callback.
 */
const EmojiPicker: React.FC<EmojiPickerProps> = ({ isAr, onPick, compact }) => {
  const [recent, setRecent] = useState<string[]>(() => getRecent());
  const [activeId, setActiveId] = useState<string>(recent.length > 0 ? 'recent' : 'smileys');

  const categories = useMemo(() => {
    const cats = [...EMOJI_CATEGORIES];
    if (recent.length > 0) {
      cats.unshift({ id: 'recent', icon: '🕘', labelAr: 'الأخيرة', labelDe: 'Zuletzt', emojis: recent });
    }
    return cats;
  }, [recent]);

  const activeCat = categories.find(c => c.id === activeId) || categories[0];

  const handlePick = (e: string) => {
    onPick(e);
    setRecent(pushRecent(e));
  };

  return (
    <div className={cn('bg-background border-t border-border/15 flex flex-col', compact ? 'h-[260px]' : 'h-[320px]')}>
      {/* Category strip */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto scrollbar-none border-b border-border/10" dir="ltr">
        {categories.map(cat => {
          const active = cat.id === activeId;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              className={cn(
                'shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-[18px] transition-all',
                active ? 'bg-primary/15 scale-105' : 'active:bg-accent/40'
              )}
              aria-label={isAr ? cat.labelAr : cat.labelDe}
            >
              {cat.icon}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/60">
          {isAr ? activeCat.labelAr : activeCat.labelDe}
        </div>
        <div className="grid grid-cols-8 gap-0.5 px-1.5 py-1.5" dir="ltr">
          {activeCat.emojis.map((emoji, i) => (
            <motion.button
              key={`${activeCat.id}-${emoji}-${i}`}
              onClick={() => handlePick(emoji)}
              whileTap={{ scale: 1.25 }}
              className="aspect-square flex items-center justify-center text-[22px] rounded-lg active:bg-accent/30 transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
