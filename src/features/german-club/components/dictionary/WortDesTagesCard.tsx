import React, { useState } from 'react';

import { AppCard, IconButton } from '@/components/ui/app-shell';
import { Bookmark, BookmarkCheck, BookOpen, Sparkles, Volume2 } from '@/lib/icons';

import { CEFRLevelLabels, DictionaryEntry, GENDER_COLORS } from '../../types';
import { useDictionaryStore } from '../../useDictionaryStore';

interface WortDesTagesCardProps {
  entry: DictionaryEntry;
  onSelect: (entry: DictionaryEntry) => void;
}

export const WortDesTagesCard: React.FC<WortDesTagesCardProps> = ({ entry, onSelect }) => {
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
      className="group cursor-pointer transition-motion"
    >
      <div className="mb-4 flex items-center justify-between border-b border-track pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-mini font-bold uppercase tracking-wider text-primary">
              كلمة اليوم المميزة (Wort des Tages)
            </h3>
            <p className="text-micro text-muted-foreground">تم اختيارها لمستوى صياغتها وأهميتها</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(entry.id);
            }}
            title={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
            aria-label={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
          >
            {bookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-signal fill-signal" aria-hidden />
            ) : (
              <Bookmark className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
          </IconButton>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {genderColor && (
              <span
                className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: genderColor }}
                title={entry.gender}
              />
            )}

            <span
              dir="ltr"
              className="text-hero font-extrabold tracking-tight text-foreground"
              style={{ unicodeBidi: 'isolate' }}
            >
              {entry.german}
            </span>

            <IconButton
              onClick={speakGerman}
              className={isPlaying ? 'text-signal' : 'text-foreground'}
              title="استمع للنطق الأصلي"
              aria-label="استمع للنطق الأصلي"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>

          <span className={`rounded-full border px-2.5 py-1 text-micro font-bold ${cefrInfo.badge_color}`}>
            {cefrInfo.label_ar}
          </span>
        </div>

        {entry.ipa && (
          <p dir="ltr" className="font-mono text-mini text-muted-foreground">
            [{entry.ipa}]
          </p>
        )}

        <p className="text-lead font-bold leading-snug text-foreground">{entry.arabic}</p>

        {entry.examples[0] && (
          <div className="space-y-1 rounded-lg border border-track bg-secondary/40 p-3">
            <p dir="ltr" className="text-mini font-medium text-foreground">
              "{entry.examples[0].de}"
            </p>
            <p className="text-mini text-muted-foreground">"{entry.examples[0].ar}"</p>
          </div>
        )}

        {entry.cultural_note_ar && (
          <div className="flex items-start gap-2 rounded-lg border border-signal/30 bg-signal/10 p-2.5 text-mini text-foreground">
            <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" aria-hidden />
            <span>{entry.cultural_note_ar}</span>
          </div>
        )}
      </div>
    </AppCard>
  );
};
