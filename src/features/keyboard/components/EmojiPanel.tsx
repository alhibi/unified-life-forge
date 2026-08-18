import { memo, useCallback, useState } from 'react';

import { X } from '@/lib/icons';
import { haptics } from '@/lib/native';

interface EmojiPanelProps {
  onInsertEmoji: (emoji: string) => void;
  onClose: () => void;
}

const RECENT_EMOJI_STORAGE = 'smarthub:soft-keyboard-recent-emojis';
const DEFAULT_RECENTS = ['❤️', '😊', '😂', '👍', '🤲', '🤍', '🌹', '✨', '😍', '🙏', '🔥', '🎉'];

export function getRecentEmojis(): string[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(RECENT_EMOJI_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_RECENTS;
}

export function saveRecentEmoji(emoji: string): string[] {
  const current = getRecentEmojis();
  const next = [emoji, ...current.filter((e) => e !== emoji)].slice(0, 24);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(RECENT_EMOJI_STORAGE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

const STATIC_EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'وجوه وانفعالات',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐',
      '🤓', '😎', '🥸', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
      '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨', '😤', '😠', '😡', '🤬',
    ],
  },
  {
    id: 'arabic_islamic',
    name: 'إسلامية وعربية',
    emojis: [
      '🕌', '🕋', '🌙', '⭐', '📿', '📖', '🕊️', '🌴', '☕', '🗡️', '🇸🇦', '🇦🇪',
      '🇶🇦', '🇰🇼', '🇴🇲', '🇧🇭', '🇯🇴', '🇪🇬', '🇮🇶', '🇩🇿', '🇲🇦', '🇵🇸', '🇸🇾', '🇱🇧',
      '🇾🇪', '🇸🇩', '🇱🇾', '🇹🇳', '🇲🇷', '🇸🇴', '🇩🇯', '🇰🇲', '📜', '⛲', '🏺', '🐫',
    ],
  },
  {
    id: 'hands',
    name: 'تعبيرات يد',
    emojis: [
      '👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '🖕', '👇', '☝️', '🫵', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '🫲', '🫱',
      '🤝', '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿',
    ],
  },
  {
    id: 'nature',
    name: 'طبيعة وحيوانات',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', 'koala', '🐯', '🦁',
      '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰',
      '🌹', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌚', '🌕', '🌖',
    ],
  },
  {
    id: 'symbols_kaomoji',
    name: 'رمزية وكاوموجي',
    emojis: [
      '(⁠◕⁠ᴗ⁠◕⁠✿)', '(⁠•⁠‿⁠•⁠)', '(⁠｡⁠•̀⁠ᴗ⁠-⁠)⁠✧', '(⁠^⁠.⁠^⁠)', '(⁠/⁠¯⁠◡⁠Line⁠)', '(⁠¬⁠_⁠¬⁠)',
      '(⁠ ⁠•⁠_⁠•⁠ ⁠)', '(⁠-_-⁠)⁠zzZ', '(⁠;⁠_⁠;⁠)', '(⁠T⁠_⁠T⁠)', '(⁠*⁠_⁠*⁠)', '(⁠O⁠_⁠o⁠)',
      '¯\\_(ツ)_/¯', '( ͡° ͜ʖ ͡°)', '(•_•)', '( •_•)>⌐■-■', '(⌐■_■)', 'ʕ•ᴥ•ʔ',
    ],
  },
];

/**
 * Integrated Multi-Category Emoji & Kaomoji Quick Picker Panel with "المستخدَم مؤخراً" row.
 */
export const EmojiPanel = memo(function EmojiPanel({
  onInsertEmoji,
  onClose,
}: EmojiPanelProps) {
  const [recents, setRecents] = useState<string[]>(() => getRecentEmojis());
  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = [
    {
      id: 'recents',
      name: 'المستخدَم مؤخراً',
      emojis: recents,
    },
    ...STATIC_EMOJI_CATEGORIES,
  ];

  const activeCategory = allCategories[activeCatIndex] ?? allCategories[0];

  const displayedEmojis = searchQuery
    ? allCategories.flatMap((c) => c.emojis).filter((e) =>
        e.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : activeCategory.emojis;

  const handleSelect = useCallback(
    (emoji: string) => {
      onInsertEmoji(emoji);
      const nextRecents = saveRecentEmoji(emoji);
      setRecents(nextRecents);
      haptics('selection');
    },
    [onInsertEmoji],
  );

  return (
    <div className="flex h-56 w-full flex-col border-t border-border/40 bg-[hsl(var(--surface-1))]/98 p-2 backdrop-blur-xl">
      {/* Header Tabs */}
      <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-1.5 px-1">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto no-scrollbar" dir="rtl">
          {allCategories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCatIndex(idx);
                setSearchQuery('');
                haptics('selection');
              }}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-micro font-medium transition-all ${
                idx === activeCatIndex && !searchQuery
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
      <div className="grid flex-1 grid-cols-8 gap-2 overflow-y-auto p-1 text-2xl" dir="rtl">
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleSelect(emoji);
            }}
            className="flex h-9 items-center justify-center rounded-xl bg-[hsl(var(--surface-2))]/40 text-lg transition-transform active:scale-125 hover:bg-[hsl(var(--surface-2))]"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});
