/**
 * DayCard — Collapsible day group in the timeline.
 *
 * Renders a date header with summary counts, and expands to show
 * individual entries grouped by source layer.
 */

import { useMemo } from 'react';
import { ChevronDown, Clock, CheckCircle, AlertCircle, HelpCircle } from '@/lib/icons';
import { AnimatePresence, motion } from 'framer-motion';

import { AppCard, Section } from '@/components/ui/app-shell';
import type { TimeLedgerDayGroup, TimeLedgerEntry, TimeLedgerSource, TimeLedgerLayerConfig } from '../types';
import TimeLedgerEntryItem from './TimeLedgerEntryItem';

interface DayCardProps {
  dayGroup: TimeLedgerDayGroup;
  isExpanded: boolean;
  onToggle: () => void;
  getLayerConfig: (source: TimeLedgerSource) => TimeLedgerLayerConfig | undefined;
  index: number;
}

export default function DayCard({
  dayGroup,
  isExpanded,
  onToggle,
  getLayerConfig,
  index,
}: DayCardProps) {
  const { date, entries, summary } = dayGroup;

  // Format date for display (Arabic)
  const formattedDate = useMemo(() => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [date]);

  // Group entries by source for layered display
  const entriesBySource = useMemo(() => {
    const map = new Map<TimeLedgerSource, TimeLedgerEntry[]>();
    for (const entry of entries) {
      if (!map.has(entry.source)) map.set(entry.source, []);
      map.get(entry.source)!.push(entry);
    }
    return map;
  }, [entries]);

  // Sort sources by layer order (from TIME_LEDGER_LAYERS)
  const sortedSources = useMemo(() => {
    return Array.from(entriesBySource.keys()).sort((a, b) => {
      const configA = getLayerConfig(a);
      const configB = getLayerConfig(b);
      const indexA = configA ? TIME_LEDGER_LAYER_ORDER.indexOf(configA.source) : 99;
      const indexB = configB ? TIME_LEDGER_LAYER_ORDER.indexOf(configB.source) : 99;
      return indexA - indexB;
    });
  }, [entriesBySource, getLayerConfig]);

  // Layer order constant (must match types.ts)
  const TIME_LEDGER_LAYER_ORDER: TimeLedgerSource[] = [
    'calendar',
    'habits',
    'fitness',
    'weather',
    'knowledge',
    'quick-capture',
    'prayer',
    'journal',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <AppCard className="group overflow-hidden">
        {/* Day Header */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors text-start"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Date indicator line */}
            <div className="relative flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-primary/20 animate-ping" />
            </div>

            <div className="min-w-0">
              <p className="text-meta font-bold text-foreground truncate">{formattedDate}</p>
              <p className="text-micro text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {summary.total} إدخال
                </span>
                {summary.hasIncompleteTasks && (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertCircle className="h-3 w-3" aria-hidden />
                    مهام معلقة
                  </span>
                )}
                {summary.hasUnfinishedHabits && (
                  <span className="flex items-center gap-1 text-warning">
                    <HelpCircle className="h-3 w-3" aria-hidden />
                    عادات غير مكتملة
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Source badges */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {Array.from(entriesBySource.entries())
              .sort(([a], [b]) => {
                const configA = getLayerConfig(a);
                const configB = getLayerConfig(b);
                const indexA = configA ? TIME_LEDGER_LAYER_ORDER.indexOf(configA.source) : 99;
                const indexB = configB ? TIME_LEDGER_LAYER_ORDER.indexOf(configB.source) : 99;
                return indexA - indexB;
              })
              .map(([source, sourceEntries]) => {
                const config = getLayerConfig(source);
                return (
                  <span
                    key={source}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium border"
                    style={{
                      backgroundColor: config ? `${config.color}15` : 'var(--muted)',
                      borderColor: config ? `${config.color}40` : 'var(--border)',
                      color: config ? config.color : 'var(--muted-foreground)',
                    }}
                    title={`${config?.labelAr ?? source}: ${sourceEntries.length}`}
                  >
                    {sourceEntries.length}
                  </span>
                );
              })}
          </div>

          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="border-t border-border/30 pt-3 space-y-4">
                {sortedSources.map((source) => {
                  const sourceEntries = entriesBySource.get(source)!;
                  const config = getLayerConfig(source);

                  if (!config) return null;

                  return (
                    <Section
                      key={source}
                      label={
                        <span
                          className="flex items-center gap-1.5"
                          style={{ color: config.color }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                          {config.labelAr} ({sourceEntries.length})
                        </span>
                      }
                      tight
                    >
                      <div className="space-y-2">
                        {sourceEntries.map((entry) => (
                          <TimeLedgerEntryItem
                            key={entry.id}
                            entry={entry}
                            layerConfig={config}
                          />
                        ))}
                      </div>
                    </Section>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AppCard>
    </motion.div>
  );
}