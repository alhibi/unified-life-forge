import React, { useState } from 'react';

import { AppCard, IconButton } from '@/components/ui/app-shell';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Compass,
  Lightbulb,
  Sparkles,
  Volume2,
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
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pe-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-mini font-bold ${cefrInfo.badge_color}`}>
                {cefrInfo.label_ar}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-mini font-semibold text-foreground">
                {DictionaryWordTypeLabels[entry.word_type]}
              </span>
            </div>
            <IconButton
              onClick={() => toggleBookmark(entry.id)}
              className="text-foreground"
              title={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
              aria-label={bookmarked ? 'إزالة من المحفوظات' : 'حفظ الكلمة'}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-5 w-5 text-signal fill-signal" aria-hidden />
              ) : (
                <Bookmark className="h-5 w-5 text-muted-foreground" aria-hidden />
              )}
            </IconButton>
          </div>
          <DialogTitle className="sr-only">{entry.german}</DialogTitle>
          <DialogDescription className="sr-only">
            تفاصيل الكلمة: النطق، الترجمات، الصيغ النحوية والأمثلة.
          </DialogDescription>
        </DialogHeader>

        {/* Main Word Display */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {genderColor && (
              <span
                className="inline-block h-4 w-4 flex-shrink-0 rounded-full"
                style={{ backgroundColor: genderColor }}
                title={entry.gender ? GENDER_LABELS_AR[entry.gender] : ''}
              />
            )}
            <h2 dir="ltr" className="text-display font-black tracking-tight text-foreground">
              {entry.german}
            </h2>

            <IconButton
              onClick={() => speakText(entry.german)}
              className={isPlaying ? 'text-signal' : 'text-foreground'}
              title="نطق ألماني واضح"
              aria-label="نطق ألماني واضح"
            >
              <Volume2 className="h-5 w-5" aria-hidden />
            </IconButton>
          </div>

          {entry.ipa && (
            <p dir="ltr" className="font-mono text-body text-muted-foreground">
              Pronunciation: [{entry.ipa}]
            </p>
          )}

          <div className="rounded-lg border border-track bg-secondary/40 p-4">
            <h3 className="text-title font-bold leading-relaxed text-foreground">
              {entry.arabic}
            </h3>
            {enrichment.categoryHintAr && (
              <p className="mt-1.5 text-mini leading-relaxed text-muted-foreground">
                {enrichment.categoryHintAr}
              </p>
            )}
          </div>
        </div>

        {/* Noun / Verb Detailed Grammar Forms */}
        {entry.word_type === 'noun' && entry.noun_forms && (
          <div className="space-y-2 rounded-lg border border-track bg-secondary/40 p-4">
            <h4 className="text-mini font-bold uppercase tracking-wider text-primary">
              الصيغ الإعرابية والجمع (Grammatische Formen)
            </h4>
            <div className="grid grid-cols-1 gap-3 text-mini sm:grid-cols-2">
              {entry.noun_forms.plural_form && (
                <div>
                  <span className="text-muted-foreground">الجمع (Plural):</span>{' '}
                  <strong dir="ltr" className="font-bold text-foreground">
                    {entry.noun_forms.plural_form}
                  </strong>
                </div>
              )}
              {entry.noun_forms.genitive_singular && (
                <div>
                  <span className="text-muted-foreground">المضاف إليه (Genitiv):</span>{' '}
                  <strong dir="ltr" className="font-bold text-foreground">
                    {entry.noun_forms.genitive_singular}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        {entry.word_type === 'verb' && entry.verb_forms && (
          <div className="space-y-2 rounded-lg border border-track bg-secondary/40 p-4">
            <h4 className="text-mini font-bold uppercase tracking-wider text-primary">
              تصريفات الفعل الرئيسية (Stammformen)
            </h4>
            <div className="grid grid-cols-1 gap-3 text-mini sm:grid-cols-3">
              {entry.verb_forms.present_3sg && (
                <div>
                  <span className="text-muted-foreground">المضارع (Präsens):</span>{' '}
                  <strong dir="ltr" className="font-bold text-foreground">
                    {entry.verb_forms.present_3sg}
                  </strong>
                </div>
              )}
              {entry.verb_forms.past_simple && (
                <div>
                  <span className="text-muted-foreground">الماضي البسيط (Präteritum):</span>{' '}
                  <strong dir="ltr" className="font-bold text-foreground">
                    {entry.verb_forms.past_simple}
                  </strong>
                </div>
              )}
              {entry.verb_forms.perfect && (
                <div>
                  <span className="text-muted-foreground">الماضي التام (Perfekt):</span>{' '}
                  <strong dir="ltr" className="font-bold text-foreground">
                    {entry.verb_forms.perfect}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Examples List */}
        {entry.examples.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-1.5 text-body font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-signal" aria-hidden />
              أمثلة توضيحية من الحياة الواقعية ({entry.examples.length})
            </h4>

            <div className="space-y-2.5">
              {entry.examples.map((ex, idx) => (
                <div key={idx} className="space-y-1 rounded-lg border border-track p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p dir="ltr" className="text-body font-bold text-foreground">
                      „{ex.de}"
                    </p>
                    <IconButton
                      onClick={() => speakText(ex.de)}
                      className="text-muted-foreground"
                      title="استمع للمثال"
                      aria-label="استمع للمثال"
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden />
                    </IconButton>
                  </div>
                  <p className="text-mini font-medium text-muted-foreground">„{ex.ar}"</p>
                  {ex.context && (
                    <span className="inline-block rounded bg-secondary px-2 py-0.5 text-micro text-muted-foreground">
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
          <div className="grid grid-cols-1 gap-3 text-mini sm:grid-cols-2">
            {entry.synonyms?.length ? (
              <div className="space-y-1 rounded-md border border-data-1/30 bg-data-1/10 p-3">
                <span className="font-bold text-data-1">المترادفات (Synonyme):</span>
                <p dir="ltr" className="font-medium text-data-1">
                  {entry.synonyms.join(', ')}
                </p>
              </div>
            ) : null}

            {entry.antonyms?.length ? (
              <div className="space-y-1 rounded-md border border-data-5/30 bg-data-5/10 p-3">
                <span className="font-bold text-data-5">الأضداد (Antonyme):</span>
                <p dir="ltr" className="font-medium text-data-5">
                  {entry.antonyms.join(', ')}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Cultural & Grammatical Notes */}
        {entry.cultural_note_ar && (
          <div className="space-y-1.5 rounded-lg border border-signal/30 bg-signal/10 p-4">
            <div className="flex items-center gap-1.5 text-mini font-bold text-signal">
              <BookOpen className="h-4 w-4" aria-hidden />
              <span>ملاحظة ثقافية واجتماعية في ألمانيا</span>
            </div>
            <p className="text-mini leading-relaxed">{entry.cultural_note_ar}</p>
          </div>
        )}

        {entry.grammatical_note_ar && (
          <div className="space-y-1.5 rounded-lg border border-data-4/30 bg-data-4/10 p-4">
            <div className="flex items-center gap-1.5 text-mini font-bold text-data-4">
              <Lightbulb className="h-4 w-4" aria-hidden />
              <span>إرشاد وقاعدة لغوية</span>
            </div>
            <p className="text-mini leading-relaxed">{entry.grammatical_note_ar}</p>
          </div>
        )}

        {/* Related words — same CEFR + category */}
        {enrichment.relatedWords.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-mini font-bold uppercase tracking-wider text-primary">
              <Compass className="h-3.5 w-3.5" aria-hidden />
              كلمات من نفس المجال ({enrichment.relatedWords.length})
            </h4>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {enrichment.relatedWords.map((w) => (
                <AppCard
                  key={w.id}
                  flat
                  as="button"
                  onClick={() => {
                    const target = GERMAN_DICTIONARY_DATA.find((e) => e.id === w.id);
                    if (target) setSelectedEntry(target);
                  }}
                  className="text-start transition-motion hover:bg-secondary"
                >
                  <p
                    dir="ltr"
                    className="truncate text-body font-bold text-foreground transition-colors hover:text-primary"
                    style={{ unicodeBidi: 'isolate' }}
                  >
                    {w.german}
                  </p>
                  <p className="truncate text-mini text-muted-foreground">{w.arabic}</p>
                </AppCard>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
