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

import { GERMAN_DICTIONARY_DATA } from '../../lib/dictionaryData';
import { enrichEntry } from '../../lib/enrichment';
import {
  CEFRLevelLabels,
  DictionaryEntry,
  DictionaryWordTypeLabels,
  GENDER_COLORS,
  GENDER_LABELS_AR,
} from '../../types';
import { useDictionaryStore } from '../../useDictionaryStore';

interface DictionaryDetailModalProps {
  entry: DictionaryEntry | null;
  onClose: () => void;
}

export const DictionaryDetailModal: React.FC<DictionaryDetailModalProps> = ({
  entry,
  onClose,
}) => {
  // Selectors only: typing in the search field must not re-render the open modal.
  const toggleBookmark = useDictionaryStore((s) => s.toggleBookmark);
  const setSelectedEntry = useDictionaryStore((s) => s.setSelectedEntry);
  const bookmarkedIds = useDictionaryStore((s) => s.bookmarkedIds);
  const isBookmarked = (id: string) => bookmarkedIds.includes(id);
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
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[hsl(var(--track))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-2xl p-6 sm:p-8 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Top Header Controls */}
          <div className="flex items-center justify-between border-b border-[hsl(var(--track))] pb-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cefrInfo.badge_color}`}>
                {cefrInfo.label_ar}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-foreground">
                {DictionaryWordTypeLabels[entry.word_type]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleBookmark(entry.id)}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary text-foreground transition-colors"
                title={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
              >
                {bookmarked ? (
                  <BookmarkCheck className="w-5 h-5 text-signal fill-signal" />
                ) : (
                  <Bookmark className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary text-foreground transition-colors"
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
              <h2 dir="ltr" className="text-3xl sm:text-4xl font-black text-[hsl(var(--foreground))] tracking-tight">
                {entry.german}
              </h2>

              <button
                type="button"
                onClick={() => speakText(entry.german)}
                className={`p-2 rounded-2xl border border-[hsl(var(--track))] hover:bg-secondary transition-colors ${
                  isPlaying ? 'bg-signal border-signal text-signal' : 'bg-white/80 text-foreground'
                }`}
                title="نطق ألماني واضح"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {entry.ipa && (
              <p dir="ltr" className="text-sm font-mono text-muted-foreground">
                Pronunciation: [{entry.ipa}]
              </p>
            )}

            <div className="p-4 rounded-2xl bg-white/80 border border-[hsl(var(--track))]">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-relaxed">
                {entry.arabic}
              </h3>
              {enrichment.categoryHintAr && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {enrichment.categoryHintAr}
                </p>
              )}
            </div>
          </div>

          {/* Noun / Verb Detailed Grammar Forms */}
          {entry.word_type === 'noun' && entry.noun_forms && (
            <div className="p-4 rounded-2xl bg-secondary border border-[hsl(var(--track))] space-y-2">
              <h4 className="text-xs font-bold text-[hsl(var(--primary))] uppercase tracking-wider">
                الصيغ الإعرابية والجمع (Grammatische Formen)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {entry.noun_forms.plural_form && (
                  <div>
                    <span className="text-muted-foreground">الجمع (Plural):</span>{' '}
                    <strong dir="ltr" className="font-bold text-foreground">{entry.noun_forms.plural_form}</strong>
                  </div>
                )}
                {entry.noun_forms.genitive_singular && (
                  <div>
                    <span className="text-muted-foreground">المضاف إليه (Genitiv):</span>{' '}
                    <strong dir="ltr" className="font-bold text-foreground">{entry.noun_forms.genitive_singular}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {entry.word_type === 'verb' && entry.verb_forms && (
            <div className="p-4 rounded-2xl bg-secondary border border-[hsl(var(--track))] space-y-2">
              <h4 className="text-xs font-bold text-[hsl(var(--primary))] uppercase tracking-wider">
                تصريفات الفعل الرئيسية (Stammformen)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {entry.verb_forms.present_3sg && (
                  <div>
                    <span className="text-muted-foreground">المضارع (Präsens):</span>{' '}
                    <strong dir="ltr" className="font-bold text-foreground">{entry.verb_forms.present_3sg}</strong>
                  </div>
                )}
                {entry.verb_forms.past_simple && (
                  <div>
                    <span className="text-muted-foreground">الماضي البسيط (Präteritum):</span>{' '}
                    <strong dir="ltr" className="font-bold text-foreground">{entry.verb_forms.past_simple}</strong>
                  </div>
                )}
                {entry.verb_forms.perfect && (
                  <div>
                    <span className="text-muted-foreground">الماضي التام (Perfekt):</span>{' '}
                    <strong dir="ltr" className="font-bold text-foreground">{entry.verb_forms.perfect}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Examples List */}
          {entry.examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-signal" />
                أمثلة توضيحية من الحياة الواقعية ({entry.examples.length})
              </h4>

              <div className="space-y-2.5">
                {entry.examples.map((ex, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-[hsl(var(--track))] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p dir="ltr" className="text-sm font-bold text-foreground">
                        „{ex.de}"
                      </p>
                      <button
                        type="button"
                        onClick={() => speakText(ex.de)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="استمع للمثال"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      „{ex.ar}"
                    </p>
                    {ex.context && (
                      <span className="inline-block text-[0.625rem] px-2 py-0.5 rounded bg-card text-muted-foreground">
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
                <div className="p-3 rounded-xl bg-data-1/80 border border-data-1/80 space-y-1">
                  <span className="font-bold text-data-1">المترادفات (Synonyme):</span>
                  <p dir="ltr" className="text-data-1 font-medium">{entry.synonyms.join(', ')}</p>
                </div>
              ) : null}

              {entry.antonyms?.length ? (
                <div className="p-3 rounded-xl bg-data-5/80 border border-data-5/80 space-y-1">
                  <span className="font-bold text-data-5">الأضداد (Antonyme):</span>
                  <p dir="ltr" className="text-data-5 font-medium">{entry.antonyms.join(', ')}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Cultural & Grammatical Notes */}
          {entry.cultural_note_ar && (
            <div className="p-4 rounded-2xl bg-signal border border-signal text-signal space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-signal">
                <BookOpen className="w-4 h-4" />
                <span>ملاحظة ثقافية واجتماعية في ألمانيا</span>
              </div>
              <p className="text-xs leading-relaxed">{entry.cultural_note_ar}</p>
            </div>
          )}

          {entry.grammatical_note_ar && (
            <div className="p-4 rounded-2xl bg-data-4 border border-data-4 text-data-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-data-4">
                <Lightbulb className="w-4 h-4" />
                <span>إرشاد وقاعدة لغوية</span>
              </div>
              <p className="text-xs leading-relaxed">{entry.grammatical_note_ar}</p>
            </div>
          )}

          {/* Related words — same CEFR + category */}
          {enrichment.relatedWords.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[hsl(var(--primary))] uppercase tracking-wider flex items-center gap-1.5">
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
                    className="text-start p-2.5 rounded-xl bg-white border border-[hsl(var(--track))] hover:bg-card hover:border-[hsl(var(--track))] transition-motion group"
                  >
                    <p
                      dir="ltr"
                      className="text-sm font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] truncate"
                      style={{ unicodeBidi: 'isolate' }}
                    >
                      {w.german}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{w.arabic}</p>
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