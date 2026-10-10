// Listening History page.
//
// Chronological feed of every episode the user has listened to
// (or marked as played). Built on the `history` slice added to
// the store — no new data model, just a view over existing state.
//
// Unified design-system pass: PageHeader + AppList/AppRow rows +
// <StateView> empty state; the per-row press hacks are gone (the global
// press rule owns tactile feedback).

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, AppRow } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { upgradeArtwork } from '@/features/podcasts/lib/itunes';
import { encodeFeedUrl } from '@/features/podcasts/lib/route';
import {
  clearHistoryWithNotify as clearHistory,
  type HistoryEntry,
  removeHistoryEntryWithNotify as removeHistoryEntry,
  useHistory,
} from '@/features/podcasts/lib/store';
import { Trash2 } from '@/lib/icons';

function formatRelative(ms: number, lang: 'ar'): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (lang === 'ar') {
    if (mins < 1) return '\u0627\u0644\u0622\u0646';
    if (mins < 60) return `\u0642\u0628\u0644 ${mins} \u062f`;
    if (hrs < 24) return `\u0642\u0628\u0644 ${hrs} \u0633`;
    if (days < 7) return `\u0642\u0628\u0644 ${days} \u064a\u0648\u0645`;
    return new Date(ms).toLocaleDateString('ar');
  } else {
    if (mins < 1) return 'Jetzt';
    if (mins < 60) return `vor ${mins} Min`;
    if (hrs < 24) return `vor ${hrs} Std`;
    if (days < 7) return `vor ${days} Tagen`;
    return new Date(ms).toLocaleDateString('de-DE');
  }
}

function formatPosition(pos: number, dur: number, lang: 'ar'): string {
  const pct = dur > 0 ? Math.round((pos / dur) * 100) : 0;
  if (lang === 'ar') {
    if (pct >= 98) return '\u0645\u0643\u062a\u0645\u0644 \u2713';
    return `${pct}%`;
  }
  if (pct >= 98) return 'Fertig \u2713';
  return `${pct}%`;
}

function HistoryRow({
  entry,
  onClick,
  onRemove,
}: {
  entry: HistoryEntry;
  onClick: () => void;
  onRemove: () => void;
}) {
  const lang = 'ar';
  const artwork = entry.podcastImageUrl;
  const pct =
    entry.duration > 0 ? Math.min(100, Math.max(0, (entry.position / entry.duration) * 100)) : 0;

  return (
    <AppRow
      as="div"
      onClick={onClick}
      leading={
        <span className="block w-12 h-12 rounded-xl overflow-hidden bg-muted/40 shrink-0">
          {artwork && (
            <img src={upgradeArtwork(artwork, 100)} alt="" className="w-full h-full object-cover" />
          )}
        </span>
      }
      title={entry.episodeTitle}
      subtitle={
        <span className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <span>{formatRelative(entry.listenedAt, lang)}</span>
            <span
              className="tabular-nums font-medium"
              style={{
                color: entry.completed
                  ? 'var(--podcast-primary, hsl(var(--primary)))'
                  : 'currentColor',
                opacity: entry.completed ? 1 : 0.5,
              }}
            >
              {formatPosition(entry.position, entry.duration, lang)}
            </span>
          </span>
          {!entry.completed && (
            <span className="block mt-0.5 h-[3px] rounded-full bg-muted/40 overflow-hidden max-w-[200px]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: 'var(--podcast-primary, hsl(var(--primary)))',
                }}
              />
            </span>
          )}
        </span>
      }
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={'\u0625\u0632\u0627\u0644\u0629'}
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-motion shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </AppRow>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const lang = 'ar';
  const history = useHistory();

  const grouped = useMemo(() => {
    const now = Date.now();
    const today = new Date(now).setHours(0, 0, 0, 0);
    const yesterday = today - 86_400_000;
    const weekAgo = today - 7 * 86_400_000;
    const groups: { label: string; items: HistoryEntry[] }[] = [];
    let currentLabel = '';
    let currentItems: HistoryEntry[] = [];
    for (const entry of history) {
      let label: string;
      if (entry.listenedAt >= today)
        label = '\u0627\u0644\u064a\u0648\u0645';
      else if (entry.listenedAt >= yesterday)
        label = '\u0623\u0645\u0633';
      else if (entry.listenedAt >= weekAgo)
        label =
          '\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639';
      else label = '\u0623\u0642\u062f\u0645';
      if (label !== currentLabel) {
        if (currentItems.length > 0) groups.push({ label: currentLabel, items: currentItems });
        currentLabel = label;
        currentItems = [entry];
      } else {
        currentItems.push(entry);
      }
    }
    if (currentItems.length > 0) groups.push({ label: currentLabel, items: currentItems });
    return groups;
  }, [history, lang]);

  return (
    <div className="min-h-screen bg-background pb-page">
      <SEO
        title={
          '\u0633\u062c\u0644 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0639'
        }
        description={
          '\u0627\u0644\u062d\u0644\u0642\u0627\u062a \u0627\u0644\u062a\u064a \u0627\u0633\u062a\u0645\u0639\u062a \u0625\u0644\u064a\u0647\u0627 \u0645\u0624\u062e\u0631\u064b\u0627.'
        }
        path="/podcasts/history"
      />
      <PageHeader
        sticky
        title={'سجل الاستماع'}
        className="max-w-lg mx-auto"
        right={
          history.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearHistory()}
              className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {'\u0645\u0633\u062d \u0627\u0644\u0643\u0644'}
              </span>
            </Button>
          ) : null
        }
      />
      <div className="max-w-lg mx-auto pt-4">
        {history.length === 0 ? (
          <StateView
            kind="empty"
            title={'لا يوجد سجل استماع'}
            body={'الحلقات التي تنتهي من الاستماع إليها ستظهر هنا.'}
            action={{ label: 'استكشاف البودكاست', onClick: () => navigate('/podcasts') }}
            className="mx-4 mt-8"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {grouped.map((group) => (
              <div key={group.label} className="mb-2 px-4">
                <h2 className="text-mini font-semibold text-muted-foreground uppercase tracking-[0.06em] px-1 py-2">
                  {group.label}
                </h2>
                <AppList>
                  {group.items.map((entry) => (
                    <HistoryRow
                      key={entry.episodeId + entry.listenedAt}
                      entry={entry}
                      onClick={() => {
                        if (entry.feedOrigin)
                          navigate(`/podcasts/${encodeFeedUrl(entry.feedOrigin)}`);
                      }}
                      onRemove={() => removeHistoryEntry(entry.episodeId)}
                    />
                  ))}
                </AppList>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
