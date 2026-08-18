import React, { useState } from 'react';
import { Volume2, Bookmark, BookmarkCheck, ChevronLeft } from '@/lib/icons';
import { DictionaryEntry, CEFRLevelLabels, DictionaryWordTypeLabels, GENDER_COLORS } from '../../types';
import { useDictionaryStore } from '../../useDictionaryStore';

interface DictionaryCardProps {
  entry: DictionaryEntry;
  onSelect: (entry: DictionaryEntry) => void;
}

export const DictionaryCard: React.FC<DictionaryCardProps> = ({ entry, onSelect }) => {
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
      className="p-4 sm:p-5 rounded-2xl border border-stone-300/80 bg-stone-100/70 hover:bg-white hover:shadow-md transition-all cursor-pointer space-y-3 group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full border ${cefrInfo.badge_color}`}>
            {entry.cefr}
          </span>
          <span className="text-[0.625rem] font-medium px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
            {DictionaryWordTypeLabels[entry.word_type]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={speakGerman}
            className={`p-1.5 rounded-lg border border-stone-300/60 hover:bg-stone-200/60 transition-colors ${
              isPlaying ? 'bg-amber-100 border-amber-300 text-amber-800' : 'text-stone-600'
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
            className="p-1.5 rounded-lg border border-stone-300/60 hover:bg-stone-200/60 text-stone-600 transition-colors"
            title={bookmarked ? 'إزالة من الحفظ' : 'حفظ الكلمة'}
          >
            {bookmarked ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-stone-400" />
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
          <h4 dir="ltr" className="text-lg sm:text-xl font-bold text-[#17181C] tracking-tight group-hover:text-[#17324D] transition-colors">
            {entry.german}
          </h4>
          {entry.ipa && (
            <span dir="ltr" className="text-xs font-mono text-stone-500">
              [{entry.ipa}]
            </span>
          )}
        </div>

        <p className="text-sm font-bold text-stone-800 line-clamp-1">
          {entry.arabic}
        </p>
      </div>

      {entry.examples[0] && (
        <p dir="ltr" className="text-xs text-stone-600 truncate bg-stone-200/50 p-2 rounded-xl">
          "{entry.examples[0].de}"
        </p>
      )}

      <div className="flex items-center justify-between text-[0.625rem] text-stone-500 pt-1 border-t border-stone-200/60">
        <span>اضغط للتفاصيل والشيوع</span>
        <ChevronLeft className="w-3.5 h-3.5 text-stone-400 group-hover:-translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
