import React, { useState } from 'react';

import { Bookmark, BookmarkCheck, ChevronLeft,Volume2 } from '@/lib/icons';

import { CEFRLevelLabels, DictionaryEntry, DictionaryWordTypeLabels, GENDER_COLORS } from '../../types';
import { useDictionaryStore } from '../../useDictionaryStore';

interface DictionaryCardProps {
  entry: DictionaryEntry;
  onSelect: (entry: DictionaryEntry) => void;
}

const DictionaryCardImpl: React.FC<DictionaryCardProps> = ({ entry, onSelect }) => {
  // Field selectors, not the whole store: a filter change elsewhere must not
  // re-render every mounted card.
  const bookmarked = useDictionaryStore((s) => s.bookmarkedIds.includes(entry.id));
  const toggleBookmark = useDictionaryStore((s) => s.toggleBookmark);
  const [isPlaying, setIsPlaying] = useState(false);

  const speakGerman = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(entry.german);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const cefrInfo = CEFRLevelLabels[entry.cefr];
  const genderColor = entry.gender ? GENDER_COLORS[entry.gender] : null;

  return (
    <div
      onClick={() => onSelect(entry)}
      className="p-4 sm:p-5 rounded-2xl border border-[hsl(var(--track))] bg-card hover:bg-white hover:shadow-md transition-motion cursor-pointer space-y-3 group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full border ${cefrInfo.badge_color}`}>
            {entry.cefr}
          </span>
          <span className="text-[0.625rem] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground">
            {DictionaryWordTypeLabels[entry.word_type]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={speakGerman}
            className={`p-1.5 rounded-lg border border-[hsl(var(--track))] hover:bg-secondary transition-colors ${
              isPlaying ? 'bg-signal border-signal text-signal' : 'text-muted-foreground'
            }`}
            title="نطق ألماني"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(entry.id);
            }}
            className="p-1.5 rounded-lg border border-[hsl(var(--track))] hover:bg-secondary text-muted-foreground transition-colors"
            title={bookmarked ? 'إزالة من الحفظ' : 'حفظ الكلمة'}
          >
            {bookmarked ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-signal fill-signal" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          {genderColor && (
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: genderColor }}
            />
          )}
          <h4 dir="ltr" className="text-lg sm:text-xl font-bold text-[hsl(var(--foreground))] tracking-tight group-hover:text-[hsl(var(--primary))] transition-colors">
            {entry.german}
          </h4>
          {entry.ipa && (
            <span dir="ltr" className="text-xs font-mono text-muted-foreground">
              [{entry.ipa}]
            </span>
          )}
        </div>

        <p className="text-sm font-bold text-foreground line-clamp-1">
          {entry.arabic}
        </p>
      </div>

      {entry.examples[0] && (
        <p dir="ltr" className="text-xs text-muted-foreground truncate bg-secondary p-2 rounded-xl">
          "{entry.examples[0].de}"
        </p>
      )}

      <div className="flex items-center justify-between text-[0.625rem] text-muted-foreground pt-1 border-t border-[hsl(var(--track))]">
        <span>اضغط للتفاصيل والشيوع</span>
        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:-translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

// 5,000+ entries live in this list — the memo boundary is what keeps scrolling
// cheap when an unrelated store field changes.
export const DictionaryCard = React.memo(DictionaryCardImpl);
