import React, { useEffect } from 'react';
import { PageShell } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { BookOpen, Sparkles } from '@/lib/icons';
import { useGermanClubStore } from '../useGermanClubStore';
import { GERMAN_CLUB_TOKENS } from '../types';

export const GrammarCorner: React.FC = () => {
  const { grammarNotes, isLoadingGrammar, fetchGrammarNotes } = useGermanClubStore();

  useEffect(() => {
    fetchGrammarNotes();
  }, [fetchGrammarNotes]);

  return (
    <PageShell centered={false} flush>
      <SEO
        title="زاوية القواعد — النادي الألماني"
        description="قواعد وتوضيحات نحوية مبسطة وموضوعية مع الأمثلة التفاعلية."
        path="/german-club/grammar"
      />

      <div
        className="min-h-screen pb-20 transition-colors"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* Sticky App Bar Header */}
        <div className="app-sticky-header z-30 px-4 py-3 flex items-center justify-between border-b border-stone-300/60">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none">
                زاوية القواعد (Grammar Corner)
              </h1>
              <span className="text-[0.625rem] font-mono font-bold text-[#17324D] tracking-widest uppercase">
                GRAMMATIK — DER CLUB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#17324D]/10 text-[#17324D] text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>نحو سياقي</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-[#17181C]">
              قواعد عملية ومصممة للواقع
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              توضيحات نحو سياقية مبسطة تركز على الأفعال المنفصلة وأدوات التعريف، مربوطة بالأمثلة العملية.
            </p>
          </div>

          {isLoadingGrammar ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-stone-200/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {grammarNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border p-6 space-y-3 transition-all"
                  style={{
                    backgroundColor: GERMAN_CLUB_TOKENS.paper,
                    borderColor: `${GERMAN_CLUB_TOKENS.oak}33`,
                    boxShadow: '0 4px 16px -4px rgba(23, 24, 28, 0.04)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-stone-200/80 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#17181C]">
                        {note.title_ar}
                      </h3>
                      {note.title_de && (
                        <span
                          className="text-xs font-mono text-[#17324D] font-semibold"
                          dir="ltr"
                          style={{ unicodeBidi: 'isolate' }}
                        >
                          {note.title_de}
                        </span>
                      )}
                    </div>

                    <span className="text-[0.6875rem] font-bold px-2.5 py-0.5 rounded bg-stone-200/70 text-stone-700">
                      مستوى {note.difficulty_level}
                    </span>
                  </div>

                  <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line font-normal">
                    {note.body_md}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1 text-[#17324D] font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      مرتبطة برفوف المواقف اليومية
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default GrammarCorner;
