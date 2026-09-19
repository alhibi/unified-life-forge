import React, { useState } from 'react';

import { Bookmark, BookmarkCheck, BookOpen,Sparkles, Volume2 } from '@/lib/icons';

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
    <div
      onClick={() => onSelect(entry)}
      className="relative overflow-hidden rounded-3xl border-2 border-[hsl(var(--primary))]/20 p-5 sm:p-6 bg-gradient-to-br from-secondary/40 via-signal/40 to-secondary/40 shadow-md cursor-pointer hover:border-[hsl(var(--primary))]/40 transition-motion group"
    >
      <div className="flex items-center justify-between border-b border-[hsl(var(--track))] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
            <Sparkles className="w-4 h-4 text-signal" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase tracking-wider">
              كلمة اليوم المميزة (Wort des Tages)
            </h3>
            <p className="text-[0.625rem] text-muted-foreground">تم اختيارها لمستوى صياغتها وأهميتها</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(entry.id);
            }}
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-foreground shadow-xs transition-colors"
            title={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
          >
            {bookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-signal fill-signal" />
            ) : (
              <Bookmark className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            {genderColor && (
              <span
                className="w-3.5 h-3.5 rounded-full inline-block shadow-xs flex-shrink-0"
                style={{ backgroundColor: genderColor }}
                title={entry.gender}
              />
            )}

            <span dir="ltr" className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">
              {entry.german}
            </span>

            <button
              type="button"
              onClick={speakGerman}
              className={`p-1.5 rounded-xl border border-[hsl(var(--track))] hover:bg-secondary transition-motion ${
                isPlaying ? 'scale-110 bg-signal border-signal text-signal' : 'text-foreground bg-white/60'
              }`}
              title="استمع للنطق الأصلي"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <span
            className={`text-[0.625rem] font-bold px-2.5 py-1 rounded-full border ${cefrInfo.badge_color}`}
          >
            {cefrInfo.label_ar}
          </span>
        </div>

        {entry.ipa && (
          <p dir="ltr" className="text-xs font-mono text-muted-foreground">
            [{entry.ipa}]
          </p>
        )}

        <p className="text-base sm:text-lg font-bold text-foreground leading-snug">
          {entry.arabic}
        </p>

        {entry.examples[0] && (
          <div className="p-3 rounded-2xl bg-white/70 border border-[hsl(var(--track))] space-y-1">
            <p dir="ltr" className="text-xs font-medium text-foreground">
              "{entry.examples[0].de}"
            </p>
            <p className="text-xs text-muted-foreground">
              "{entry.examples[0].ar}"
            </p>
          </div>
        )}

        {entry.cultural_note_ar && (
          <div className="flex items-start gap-2 text-xs text-foreground bg-signal/80 p-2.5 rounded-xl border border-signal/80">
            <BookOpen className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
            <span>{entry.cultural_note_ar}</span>
          </div>
        )}
      </div>
    </div>
  );
};
