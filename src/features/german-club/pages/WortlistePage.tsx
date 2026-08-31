import { motion, useReducedMotion } from 'framer-motion';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { Bookmark, Sparkles } from '@/lib/icons';

import { SpeakPlayer } from '../components/SpeakPlayer';
import { GERMAN_DICTIONARY_DATA } from '../lib/dictionaryData';
import { deriveInsights, summarizeInsights } from '../lib/wortliste';
import { GERMAN_CLUB_TOKENS } from '../types';
import { useDictionaryStore } from '../useDictionaryStore';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const CEFR_COLORS: Record<(typeof CEFR_LEVELS)[number], string> = {
  A1: '#10b981',
  A2: '#14b8a6',
  B1: '#0ea5e9',
  B2: '#6366f1',
  C1: '#f59e0b',
  C2: '#f43f5e',
};

/**
 * Deine Wortliste — your saved German words.
 *
 * The quiet twin of the dictionary. No learning metrics, no streaks.
 * Just a beautiful list of words the user has personally kept.
 *
 * Empty state is honest: "Du hast noch nichts gespeichert" — not a CTA,
 * not a shaming reminder.
 */
export const WortlistePage: React.FC = () => {
  const navigate = useNavigate();
  const { bookmarkedIds, setSelectedEntry, toggleBookmark } = useDictionaryStore();
  const shouldReduceMotion = useReducedMotion() ?? false;

  // Resolve bookmarks to dictionary entries
  const entries = useMemo(() => {
    const set = new Set(bookmarkedIds);
    return GERMAN_DICTIONARY_DATA.filter((e) => set.has(e.id));
  }, [bookmarkedIds]);

  const insights = useMemo(() => deriveInsights(entries), [entries]);
  const summary = useMemo(() => summarizeInsights(insights), [insights]);

  return (
    <PageShell centered={false} flush>
      <SEO
        title="قائمة كلماتي — النادي الألماني"
        description="الكلمات والعبارات التي حفظتها في النادي للرجوع إليها متى شئت."
        path="/german-club/wortliste"
      />

      <div
        className="min-h-screen pb-16 transition-colors"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* App Bar */}
        <div className="app-sticky-header z-30 px-4 py-3 flex items-center justify-between border-b border-stone-300/60 bg-[#EFEEE7]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none">
                قائمة كلماتي
              </h1>
              <span className="text-[0.625rem] font-mono font-bold text-[#17324D] tracking-widest uppercase">
                DEINE WORTLISTE
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/german-club/dictionary?tab=bookmarks')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-300/80 text-stone-700 hover:bg-stone-200/60 transition-colors flex items-center gap-1.5"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#17324D]" />
            عرض في القاموس
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {entries.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Insights Card — quiet mirror */}
              <motion.section
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="p-5 rounded-3xl border bg-white/60"
                style={{ borderColor: `${GERMAN_CLUB_TOKENS.oak}33` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[0.625rem] font-mono font-bold uppercase tracking-widest text-[#17324D]">
                    مرآة
                  </span>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">{summary}</p>

                {/* CEFR distribution as a tiny bar chart */}
                {insights.total > 0 && (
                  <div className="mt-4">
                    <p className="text-[0.625rem] font-mono uppercase tracking-wider text-stone-500 mb-2">
                      التوزيع حسب المستوى
                    </p>
                    <div className="flex items-end gap-1 h-10">
                      {CEFR_LEVELS.map((lvl) => {
                        const count = insights.cefrCounts[lvl] ?? 0;
                        const pct = insights.total > 0 ? count / insights.total : 0;
                        const heightPct = Math.max(pct > 0 ? 8 : 0, pct * 100);
                        return (
                          <div key={lvl} className="flex-1 flex flex-col items-center gap-1">
                            <motion.div
                              initial={shouldReduceMotion ? false : { height: 0 }}
                              animate={{ height: `${heightPct}%` }}
                              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                              className="w-full rounded-t-md"
                              style={{
                                backgroundColor: CEFR_COLORS[lvl],
                                opacity: count === 0 ? 0.15 : 1,
                              }}
                              title={`${lvl}: ${count} كلمة`}
                            />
                            <span className="text-[0.625rem] font-mono font-bold text-stone-500">
                              {lvl}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top categories chips */}
                {insights.topCategories.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {insights.topCategories.slice(0, 4).map((c) => (
                      <span
                        key={c.category}
                        className="text-[0.625rem] font-medium px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-700"
                      >
                        {c.category} · {c.count}
                      </span>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* The list */}
              <section className="space-y-2">
                {entries.map((entry) => (
                  <WortlisteRow
                    key={entry.id}
                    entry={entry}
                    onOpen={() => setSelectedEntry(entry)}
                    onRemove={() => toggleBookmark(entry.id)}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
};

const EmptyState: React.FC = () => (
  <div className="text-center py-16 space-y-3">
    <Bookmark className="w-10 h-10 mx-auto text-stone-300" />
    <h3 className="text-base font-bold text-stone-700">قائمة كلماتك فارغة</h3>
    <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
      تصفّح القاموس أو الرفوف. حين تجد كلمة تستحق البقاء، احفظها. ستجدها هنا.
    </p>
  </div>
);

interface WortlisteRowProps {
  entry: ReturnType<typeof GERMAN_DICTIONARY_DATA.find>;
  onOpen: () => void;
  onRemove: () => void;
  shouldReduceMotion: boolean;
}

const WortlisteRow: React.FC<WortlisteRowProps> = ({ entry, onOpen, onRemove, shouldReduceMotion }) => {
  if (!entry) return null;

  return (
    <motion.div
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 p-3 rounded-2xl border bg-white group hover:border-stone-400 transition-colors"
      style={{ borderColor: `${GERMAN_CLUB_TOKENS.oak}22` }}
    >
      <button type="button" onClick={onOpen} className="flex-1 text-start min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            dir="ltr"
            className="font-bold text-[#17181C] truncate"
            style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}
          >
            {entry.german}
          </p>
          {entry.ipa && (
            <span className="text-xs font-mono text-stone-500" dir="ltr">
              [{entry.ipa}]
            </span>
          )}
        </div>
        <p className="text-xs text-stone-600 truncate">{entry.arabic}</p>
        <div className="mt-1 flex items-center gap-1 text-[0.625rem] font-mono uppercase tracking-wider text-stone-400">
          <span>{entry.cefr}</span>
          <span className="text-stone-300">·</span>
          <span>{entry.category}</span>
        </div>
      </button>

      <SpeakPlayer text={[entry.german]} variant="pill" />

      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-xs font-medium text-stone-400 hover:text-rose-600 transition-colors px-2 py-1"
        title="إزالة من القائمة"
      >
        إزالة
      </button>
    </motion.div>
  );
};

export default WortlistePage;
