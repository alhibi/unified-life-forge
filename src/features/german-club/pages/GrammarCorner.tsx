import React, { useEffect } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { BookOpen, Sparkles } from '@/lib/icons';

import { useGermanClubStore } from '../useGermanClubStore';

export const GrammarCorner: React.FC = () => {
  const { grammarNotes, isLoadingGrammar, fetchGrammarNotes } = useGermanClubStore();

  useEffect(() => {
    fetchGrammarNotes();
  }, [fetchGrammarNotes]);

  return (
    <PageShell centered={false} flush className="px-4 pt-4 sm:pt-6">
      <SEO
        title="زاوية القواعد — النادي الألماني"
        description="قواعد وتوضيحات نحوية مبسطة وموضوعية مع الأمثلة التفاعلية."
        path="/german-club/grammar"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-page">
        {/* App Bar */}
        <PageHeader
          title="زاوية القواعد (Grammar Corner)"
          subtitle={<span className="font-mono">GRAMMATIK — DER CLUB</span>}
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-mini font-bold text-primary">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              <span>نحو سياقي</span>
            </span>
          }
        />

        <section className="space-y-1">
          <h2 className="type-title text-foreground">قواعد عملية ومصممة للواقع</h2>
          <p className="text-mini leading-relaxed text-muted-foreground">
            توضيحات نحو سياقية مبسطة تركز على الأفعال المنفصلة وأدوات التعريف، مربوطة بالأمثلة العملية.
          </p>
        </section>

        {isLoadingGrammar ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {grammarNotes.map((note) => (
              <AppCard key={note.id} as="section">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-track pb-3">
                    <div>
                      <h3 className="text-title font-bold text-foreground">{note.title_ar}</h3>
                      {note.title_de && (
                        <span
                          className="font-mono text-mini font-semibold text-primary"
                          dir="ltr"
                          style={{ unicodeBidi: 'isolate' }}
                        >
                          {note.title_de}
                        </span>
                      )}
                    </div>

                    <span className="rounded bg-secondary px-2.5 py-0.5 text-micro font-bold text-foreground">
                      مستوى {note.difficulty_level}
                    </span>
                  </div>

                  <div className="whitespace-pre-line text-body font-normal leading-relaxed text-foreground">
                    {note.body_md}
                  </div>

                  <div className="flex items-center justify-between pt-2 text-mini text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-primary">
                      <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden />
                      مرتبطة برفوف المواقف اليومية
                    </span>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default GrammarCorner;
