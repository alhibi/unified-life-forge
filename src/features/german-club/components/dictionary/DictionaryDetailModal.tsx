import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useState } from 'react';

import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Compass,
  Lightbulb,
  Sparkles,
  Volume2,
  X,
} from '@/lib/icons';

import {
  CEFRLevelLabels,
  DictionaryEntry,
  DictionaryWordTypeLabels,
  GENDER_COLORS,
  GENDER_LABELS_AR,
} from '../../types';
import { useDictionaryStore } from '../../useDictionaryStore';
import { enrichEntry } from '../../lib/enrichment';
import { GERMAN_DICTIONARY_DATA } from '../../lib/dictionaryData';

interface DictionaryDetailModalProps {
  entry: DictionaryEntry | null;
  onClose: () => void;
}

export const DictionaryDetailModal: React.FC<DictionaryDetailModalProps> = ({
  entry,
  onClose,
}) => {
  const { isBookmarked, toggleBookmark, setSelectedEntry } = useDictionaryStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (!entry) return null;

  const bookmarked = isBookmarked(entry.id);
  const cefrInfo = CEFRLevelLabels[entry.cefr];
  const genderColor = entry.gender ? GENDER_COLORS[entry.gender] : null;

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.85;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Derive enriched context on the fly (no DB writes, no manual curation)
  const enrichment = enrichEntry(entry, GERMAN_DICTIONARY_DATA, { maxRelated: 5 });

  return (
    <AnimatePresence>
      <motion.div
        key={entry.id}
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-stone-300 bg-[#EFEEE7] text-[#17181C] shadow-2xl p-6 sm:p-8 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Top Header Controls */}
          <div className="flex items-center justify-between border-b border-stone-300/80 pb-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cefrInfo.badge_color}`}>
                {cefrInfo.label_ar}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-200 text-stone-700">
                {DictionaryWordTypeLabels[entry.word_type]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleBookmark(entry.id)}
                className="p-2 rounded-xl bg-stone-200/80 hover:bg-stone-300/80 text-stone-700 transition-colors"
                title={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
              >
                {bookmarked ? (
                  <BookmarkCheck className="w-5 h-5 text-amber-600 fill-amber-600" />
                ) : (
                  <Bookmark className="w-5 h-5 text-stone-600" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-stone-200/80 hover:bg-stone-300/80 text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Word Display */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {genderColor && (
                <span
                  className="w-4 h-4 rounded-full inline-block shadow-xs flex-shrink-0"
                  style={{ backgroundColor: genderColor }}
                  title={entry.gender ? GENDER_LABELS_AR[entry.gender] : ''}
                />
              )}
              <h2 dir="ltr" className="text-3xl sm:text-4xl font-black text-[#17181C] tracking-tight">
                {entry.german}
              </h2>

              <button
                type="button"
                onClick={() => speakText(entry.german)}
                className={`p-2 rounded-2xl border border-stone-300 hover:bg-stone-200 transition-colors ${
                  isPlaying ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white/80 text-stone-800'
                }`}
                title="نطق ألماني واضح"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {entry.ipa && (
              <p dir="ltr" className="text-sm font-mono text-stone-500">
                Pronunciation: [{entry.ipa}]
              </p>
            )}

            <div className="p-4 rounded-2xl bg-white/80 border border-stone-200/90">
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900 leading-relaxed">
                {entry.arabic}
              </h3>
              {enrichment.categoryHintAr && (
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  {enrichment.categoryHintAr}
                </p>
              )}
            </div>
          </div>

          {/* Noun / Verb Detailed Grammar Forms */}
          {entry.word_type === 'noun' && entry.noun_forms && (
            <div className="p-4 rounded-2xl bg-stone-200/60 border border-stone-300/60 space-y-2">
              <h4 className="text-xs font-bold text-[#17324D] uppercase tracking-wider">
                الصيغ الإعرابية والجمع (Grammatische Formen)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {entry.noun_forms.plural_form && (
                  <div>
                    <span className="text-stone-500">الجمع (Plural):</span>{' '}
                    <strong dir="ltr" className="font-bold text-stone-900">{entry.noun_forms.plural_form}</strong>
                  </div>
                )}
                {entry.noun_forms.genitive_singular && (
                  <div>
                    <span className="text-stone-500">المضاف إليه (Genitiv):</span>{' '}
                    <strong dir="ltr" className="font-bold text-stone-900">{entry.noun_forms.genitive_singular}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {entry.word_type === 'verb' && entry.verb_forms && (
            <div className="p-4 rounded-2xl bg-stone-200/60 border border-stone-300/60 space-y-2">
              <h4 className="text-xs font-bold text-[#17324D] uppercase tracking-wider">
                تصريفات الفعل الرئيسية (Stammformen)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {entry.verb_forms.present_3sg && (
                  <div>
                    <span className="text-stone-500">المضارع (Präsens):</span>{' '}
                    <strong dir="ltr" className="font-bold text-stone-900">{entry.verb_forms.present_3sg}</strong>
                  </div>
                )}
                {entry.verb_forms.past_simple && (
                  <div>
                    <span className="text-stone-500">الماضي البسيط (Präteritum):</span>{' '}
                    <strong dir="ltr" className="font-bold text-stone-900">{entry.verb_forms.past_simple}</strong>
                  </div>
                )}
                {entry.verb_forms.perfect && (
                  <div>
                    <span className="text-stone-500">الماضي التام (Perfekt):</span>{' '}
                    <strong dir="ltr" className="font-bold text-stone-900">{entry.verb_forms.perfect}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Examples List */}
          {entry.examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#17181C] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                أمثلة توضيحية من الحياة الواقعية ({entry.examples.length})
              </h4>

              <div className="space-y-2.5">
                {entry.examples.map((ex, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-stone-200/80 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p dir="ltr" className="text-sm font-bold text-stone-900">
                        „{ex.de}"
                      </p>
                      <button
                        type="button"
                        onClick={() => speakText(ex.de)}
                        className="p-1 rounded-lg text-stone-500 hover:text-stone-800 transition-colors"
                        title="استمع للمثال"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-stone-600 font-medium">
                      „{ex.ar}"
                    </p>
                    {ex.context && (
                      <span className="inline-block text-[0.625rem] px-2 py-0.5 rounded bg-stone-100 text-stone-500">
                        السياق: {ex.context}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Synonyms & Antonyms */}
          {(entry.synonyms?.length || entry.antonyms?.length) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {entry.synonyms?.length ? (
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-1">
                  <span className="font-bold text-emerald-900">المترادفات (Synonyme):</span>
                  <p dir="ltr" className="text-emerald-800 font-medium">{entry.synonyms.join(', ')}</p>
                </div>
              ) : null}

              {entry.antonyms?.length ? (
                <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200/80 space-y-1">
                  <span className="font-bold text-rose-900">الأضداد (Antonyme):</span>
                  <p dir="ltr" className="text-rose-800 font-medium">{entry.antonyms.join(', ')}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Cultural & Grammatical Notes */}
          {entry.cultural_note_ar && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                <BookOpen className="w-4 h-4" />
                <span>ملاحظة ثقافية واجتماعية في ألمانيا</span>
              </div>
              <p className="text-xs leading-relaxed">{entry.cultural_note_ar}</p>
            </div>
          )}

          {entry.grammatical_note_ar && (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-sky-800">
                <Lightbulb className="w-4 h-4" />
                <span>إرشاد وقاعدة لغوية</span>
              </div>
              <p className="text-xs leading-relaxed">{entry.grammatical_note_ar}</p>
            </div>
          )}

          {/* Related words — same CEFR + category */}
          {enrichment.relatedWords.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#17324D] uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                كلمات من نفس المجال ({enrichment.relatedWords.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {enrichment.relatedWords.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      const target = GERMAN_DICTIONARY_DATA.find((e) => e.id === w.id);
                      if (target) setSelectedEntry(target);
                    }}
                    className="text-start p-2.5 rounded-xl bg-white border border-stone-200/60 hover:bg-stone-50 hover:border-stone-300 transition-all group"
                  >
                    <p
                      dir="ltr"
                      className="text-sm font-bold text-[#17181C] group-hover:text-[#17324D] truncate"
                      style={{ unicodeBidi: 'isolate' }}
                    >
                      {w.german}
                    </p>
                    <p className="text-xs text-stone-600 truncate">{w.arabic}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};