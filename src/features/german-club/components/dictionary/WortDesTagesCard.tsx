import React, { useState } from 'react';
import { Volume2, Bookmark, BookmarkCheck, Sparkles, BookOpen } from '@/lib/icons';
import { DictionaryEntry, CEFRLevelLabels, GENDER_COLORS } from '../../types';
import { useDictionaryStore } from '../../useDictionaryStore';
import { GERMAN_CLUB_TOKENS } from '../../types';

interface WortDesTagesCardProps {
  entry: DictionaryEntry;
  onSelect: (entry: DictionaryEntry) => void;
}

export const WortDesTagesCard: React.FC<WortDesTagesCardProps> = ({ entry, onSelect }) => {
  const { isBookmarked, toggleBookmark } = useDictionaryStore();
  const bookmarked = isBookmarked(entry.id);
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
      className="relative overflow-hidden rounded-3xl border-2 border-[#17324D]/20 p-5 sm:p-6 bg-gradient-to-br from-stone-100 via-amber-50/40 to-stone-200/80 shadow-md cursor-pointer hover:border-[#17324D]/40 transition-all group"
    >
      <div className="flex items-center justify-between border-b border-stone-300/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-[#17324D]/10 text-[#17324D]">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-[#17324D] uppercase tracking-wider">
              كلمة اليوم المميزة (Wort des Tages)
            </h3>
            <p className="text-[0.625rem] text-stone-500">تم اختيارها لمستوى صياغتها وأهميتها</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(entry.id);
            }}
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-stone-700 shadow-xs transition-colors"
            title={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
          >
            {bookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-amber-600 fill-amber-600" />
            ) : (
              <Bookmark className="w-4 h-4 text-stone-500" />
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

            <span dir="ltr" className="text-2xl sm:text-3xl font-extrabold text-[#17181C] tracking-tight">
              {entry.german}
            </span>

            <button
              type="button"
              onClick={speakGerman}
              className={`p-1.5 rounded-xl border border-stone-300/80 hover:bg-stone-200/80 transition-all ${
                isPlaying ? 'scale-110 bg-amber-100 border-amber-400 text-amber-800' : 'text-stone-700 bg-white/60'
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
          <p dir="ltr" className="text-xs font-mono text-stone-500">
            [{entry.ipa}]
          </p>
        )}

        <p className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
          {entry.arabic}
        </p>

        {entry.examples[0] && (
          <div className="p-3 rounded-2xl bg-white/70 border border-stone-200/80 space-y-1">
            <p dir="ltr" className="text-xs font-medium text-stone-800">
              "{entry.examples[0].de}"
            </p>
            <p className="text-xs text-stone-600">
              "{entry.examples[0].ar}"
            </p>
          </div>
        )}

        {entry.cultural_note_ar && (
          <div className="flex items-start gap-2 text-xs text-stone-700 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
            <BookOpen className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <span>{entry.cultural_note_ar}</span>
          </div>
        )}
      </div>
    </div>
  );
};
