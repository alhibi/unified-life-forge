import { memo, useState } from 'react';

import { X } from '@/lib/icons';
import { haptics } from '@/lib/native';

interface EmojiPanelProps {
  onInsertEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'شائعة',
    emojis: ['❤️', '😊', '😂', '👍', '🤲', '🤍', '🌹', '✨', '😍', '🙏', '🔥', '🎉', '💯', '👏', '🕊️', '🌿'],
  },
  {
    name: 'وجوه',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘'],
  },
  {
    name: 'إسلامية وعربية',
    emojis: ['🕌', '🕋', '🌙', '⭐', '📿', '📖', '🕊️', '🌴', '☕', '🗡️', '🇸🇦', '🇦🇪', '🇶🇦', '🇰🇼', '🇴🇲', '🇧🇭'],
  },
  {
    name: 'تعبيرات يد',
    emojis: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚'],
  },
];

/**
 * Integrated Emoji & Kaomoji Quick Picker Panel.
 */
export const EmojiPanel = memo(function EmojiPanel({
  onInsertEmoji,
  onClose,
}: EmojiPanelProps) {
  const [activeCatIndex, setActiveCatIndex] = useState(0);

  const activeCategory = EMOJI_CATEGORIES[activeCatIndex] ?? EMOJI_CATEGORIES[0];

  return (
    <div className="flex h-52 w-full flex-col border-t border-border/40 bg-[hsl(var(--surface-1))]/95 p-2 backdrop-blur-xl">
      {/* Header Tabs */}
      <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-1.5 px-1">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto no-scrollbar">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => {
                setActiveCatIndex(idx);
                haptics('selection');
              }}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-micro font-medium transition-all ${
                idx === activeCatIndex
                  ? 'bg-[hsl(var(--live))] text-white shadow-sm'
                  : 'bg-[hsl(var(--surface-2))] text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(var(--surface-2))]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="grid flex-1 grid-cols-8 gap-2 overflow-y-auto p-1 text-2xl">
        {activeCategory.emojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onInsertEmoji(emoji);
              haptics('selection');
            }}
            className="flex h-9 items-center justify-center rounded-xl bg-[hsl(var(--surface-2))]/40 transition-transform active:scale-125 hover:bg-[hsl(var(--surface-2))]"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});
