import { motion, useReducedMotion } from 'framer-motion';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { Bookmark, Sparkles } from '@/lib/icons';

import { SpeakPlayer } from '../components/SpeakPlayer';
import { GERMAN_DICTIONARY_DATA } from '../lib/dictionaryData';
import { deriveInsights, summarizeInsights } from '../lib/wortliste';
import type { DictionaryEntry } from '../types';
import { useDictionaryStore } from '../useDictionaryStore';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const CEFR_COLORS: Record<(typeof CEFR_LEVELS)[number], string> = {
  A1: 'hsl(var(--data-1))',
  A2: 'hsl(var(--data-1))',
  B1: 'hsl(var(--data-4))',
  B2: 'hsl(var(--data-6))',
  C1: 'hsl(var(--data-3))',
  C2: 'hsl(var(--data-5))',
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
    <PageShell centered={false} flush className="px-4 pt-4 sm:pt-6">
      <SEO
        title="قائمة كلماتي — النادي الألماني"
        description="الكلمات والعبارات التي حفظتها في النادي للرجوع إليها متى شئت."
        path="/german-club/wortliste"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-page">
        {/* App Bar */}
        <PageHeader
          title="قائمة كلماتي"
          subtitle={<span className="font-mono">DEINE WORTLISTE</span>}
          right={
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => navigate('/german-club/dictionary?tab=bookmarks')}
            >
              <Bookmark className="h-3.5 w-3.5 text-primary" aria-hidden />
              عرض في القاموس
            </Button>
          }
        />

        {entries.length === 0 ? (
          <StateView
            kind="empty"
            title="قائمة كلماتك فارغة"
            body="تصفّح القاموس أو الرفوف. حين تجد كلمة تستحق البقاء، احفظها. ستجدها هنا."
            action={{ label: 'إلى القاموس', onClick: () => navigate('/german-club/dictionary') }}
          />
        ) : (
          <>
            {/* Insights Card — quiet mirror */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <AppCard as="section" aria-label="مرآة محفوظاتك">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden />
                  <span className="font-mono text-micro font-bold uppercase tracking-widest text-primary">
                    مرآة
                  </span>
                </div>
                <p className="text-body leading-relaxed text-foreground">{summary}</p>

                {/* CEFR distribution as a tiny bar chart. The bars animate on
                    transform only (scaleY from the baseline) — height never
                    animates, so the strip never re-runs layout. */}
                {insights.total > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 font-mono text-micro uppercase tracking-wider text-muted-foreground">
                      التوزيع حسب المستوى
                    </p>
                    <div className="flex h-10 items-end gap-1">
                      {CEFR_LEVELS.map((lvl) => {
                        const count = insights.cefrCounts[lvl] ?? 0;
                        const pct = insights.total > 0 ? count / insights.total : 0;
                        const heightPct = Math.max(pct > 0 ? 8 : 0, pct * 100);
                        return (
                          <div key={lvl} className="flex flex-1 flex-col items-center gap-1">
                            <motion.div
                              initial={shouldReduceMotion ? false : { scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                              className="w-full origin-bottom rounded-t-md"
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: CEFR_COLORS[lvl],
                                opacity: count === 0 ? 0.15 : 1,
                              }}
                              title={`${lvl}: ${count} كلمة`}
                            />
                            <span className="font-mono text-micro font-bold text-muted-foreground">
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
                        className="rounded-full bg-secondary px-2 py-0.5 text-micro font-medium text-foreground"
                      >
                        {c.category} · <span className="tabular-nums">{c.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </AppCard>
            </motion.div>

            {/* The list */}
            <AppList aria-label="الكلمات المحفوظة">
              {entries.map((entry) => (
                <WortlisteRow
                  key={entry.id}
                  entry={entry}
                  onOpen={() => setSelectedEntry(entry)}
                  onRemove={() => toggleBookmark(entry.id)}
                />
              ))}
            </AppList>
          </>
        )}
      </div>
    </PageShell>
  );
};

interface WortlisteRowProps {
  entry: DictionaryEntry;
  onOpen: () => void;
  onRemove: () => void;
}

const WortlisteRow: React.FC<WortlisteRowProps> = ({ entry, onOpen, onRemove }) => {
  return (
    <AppRow
      as="div"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer"
      title={
        <span className="flex items-baseline gap-2">
          <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
            {entry.german}
          </span>
          {entry.ipa && (
            <span className="font-mono text-mini font-normal text-muted-foreground" dir="ltr">
              [{entry.ipa}]
            </span>
          )}
        </span>
      }
      subtitle={
        <>
          <span className="block truncate">{entry.arabic}</span>
          <span className="mt-1 flex items-center gap-1 font-mono text-micro uppercase tracking-wider text-muted-foreground">
            <span>{entry.cefr}</span>
            <span>·</span>
            <span>{entry.category}</span>
          </span>
        </>
      }
    >
      <SpeakPlayer text={[entry.german]} variant="pill" />

      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 text-muted-foreground hover:text-data-5"
        title="إزالة من القائمة"
      >
        إزالة
      </Button>
    </AppRow>
  );
};

export default WortlistePage;
