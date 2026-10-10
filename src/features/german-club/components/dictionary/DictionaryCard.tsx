import React, { useState } from 'react';

import { AppCard, IconButton } from '@/components/ui/app-shell';
import { Bookmark, BookmarkCheck, ChevronLeft, Volume2 } from '@/lib/icons';

import {
  CEFRLevelLabels,
  DictionaryEntry,
  DictionaryWordTypeLabels,
  GENDER_COLORS,
} from '../../types';
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
    <AppCard
      as="div"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(entry);
        }
      }}
      className="group cursor-pointer space-y-3 transition-motion"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-micro font-bold ${cefrInfo.badge_color}`}>
            {entry.cefr}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-micro font-medium text-foreground">
            {DictionaryWordTypeLabels[entry.word_type]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            onClick={speakGerman}
            className={isPlaying ? 'text-signal' : 'text-muted-foreground'}
            title="نطق ألماني"
            aria-label="نطق ألماني"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(entry.id);
            }}
            className="text-muted-foreground"
            title={bookmarked ? 'إزالة من الحفظ' : 'حفظ الكلمة'}
            aria-label={bookmarked ? 'إزالة من الحفظ' : 'حفظ الكلمة'}
          >
            {bookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-signal fill-signal" aria-hidden />
            ) : (
              <Bookmark className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            )}
          </IconButton>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          {genderColor && (
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: genderColor }}
            />
          )}
          <h4
            dir="ltr"
            className="text-title font-bold tracking-tight text-foreground transition-colors group-hover:text-primary"
          >
            {entry.german}
          </h4>
          {entry.ipa && (
            <span dir="ltr" className="font-mono text-mini text-muted-foreground">
              [{entry.ipa}]
            </span>
          )}
        </div>

        <p className="line-clamp-1 text-body font-bold text-foreground">{entry.arabic}</p>
      </div>

      {entry.examples[0] && (
        <p dir="ltr" className="truncate rounded-md bg-secondary/50 p-2 text-mini text-muted-foreground">
          "{entry.examples[0].de}"
        </p>
      )}

      <div className="flex items-center justify-between border-t border-track pt-1 text-micro text-muted-foreground">
        <span>اضغط للتفاصيل والشيوع</span>
        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-x-1" aria-hidden />
      </div>
    </AppCard>
  );
};

// 5,000+ entries live in this list — the memo boundary is what keeps scrolling
// cheap when an unrelated store field changes.
export const DictionaryCard = React.memo(DictionaryCardImpl);
