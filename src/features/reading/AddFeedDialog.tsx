import { AnimatePresence,motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  Check, Clock, Globe, Link2, Loader2, Plus, Search, X,
} from '@/lib/icons';

import { getCustomFolders } from './foldersStorage';
import { SourcePill } from './SourcePill';
import {
  describeFrequency,
  type FeedFrequency,
  getFeedFrequencies,
  setFeedFrequency,
} from './storage';
import { timeAgo } from './utils';

/**
 * AddFeedDialog — turns "I have a website I read every day" into an
 * actual subscription. The user pastes a URL (the homepage is fine —
 * no need to know the /feed.xml path), the discover-feed edge function
 * finds every advertised feed, we show a polished preview of each,
 * and the user picks one or more to subscribe to.
 *
 * What this dialog ships:
 *
 *  - **Multi-stage progress strip** instead of a spinner. The
 *    discovery flow has three observable phases (resolving, probing,
 *    matching), each with its own ASCII-style progress block so the
 *    user knows what's happening + roughly how long it'll take.
 *  - **Per-candidate favicon** sitting alongside the SourcePill so
 *    feeds with familiar branding are immediately recognisable.
 *  - **Last 5 article titles** with a "last published" timestamp,
 *    so the user can verify the feed is alive + matches their
 *    expectations before committing.
 *  - **Publication-frequency estimate** ("≈3/day", "weekly") computed
 *    server-side from up to 10 most-recent pubDates and described
 *    by `describeFrequency()` from storage. Cached locally for
 *    instant re-renders.
 */

interface FeedCandidate {
  url: string;
  ok: true;
  title: string;
  description: string;
  itemCount: number;
  items: { title: string; pubDate: string | null; link: string | null }[];
  image?: string;
  favicon?: string;
  language?: string;
  medianGapSeconds: number | null;
  lastPublishedAt: string | null;
}

interface DiscoverResponse {
  candidates: FeedCandidate[];
  site?: {
    url: string;
    title: string;
    description?: string;
    image?: string;
  };
  strategy?: 'direct' | 'declared' | 'probed';
  error?: string;
}

type Stage = 'idle' | 'resolving' | 'probing' | 'results' | 'error';

export function AddFeedDialog({
  open,
  existingUrls,
  onClose,
  onAdd,
}: {
  open: boolean;
  existingUrls: Set<string>;
  onClose: () => void;
  onAdd: (url: string, name: string, category: string) => boolean;
}) {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [response, setResponse] = useState<DiscoverResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [customFolders] = useState<string[]>(getCustomFolders);
  const [category, setCategory] = useState(customFolders[0] || 'news');

  const allFolders = useMemo(() => {
    return customFolders.map(f => ({ id: f, ar: f, en: f.charAt(0).toUpperCase() + f.slice(1) }));
  }, [customFolders]);
  const [adding, setAdding] = useState<string | null>(null);

  // Reset when dialog re-opens
  useEffect(() => {
    if (open) {
      setInput('');
      setStage('idle');
      setResponse(null);
      setErrorMsg('');
      setCategory('news');
    }
  }, [open]);

  const handleDiscover = async () => {
    let trimmed = input.trim();
    if (!trimmed) return;

    // Advanced Input Normalization & Intelligent Discovery logic
    // If the user inputs a name or a partial domain, we auto-enrich it
    if (!/^https?:\/\//i.test(trimmed)) {
      if (trimmed.includes('.') && !trimmed.includes(' ')) {
        trimmed = `https://${trimmed}`;
      } else {
        toast.error('أدخل رابط موقع أو رابط RSS، مثل example.com');
        return;
      }
    }

    setStage('resolving');
    setErrorMsg('');
    setResponse(null);

    const stageBump = setTimeout(() => setStage('probing'), 600);
    try {
      const { data, error } = await supabase.functions.invoke(
        'discover-feed',
        { body: { url: trimmed } },
      );
      clearTimeout(stageBump);
      if (error) throw error;
      const payload = data as DiscoverResponse;

      const freqMap = getFeedFrequencies();
      for (const c of payload.candidates || []) {
        if (c.medianGapSeconds && c.medianGapSeconds > 0) {
          const f: FeedFrequency = {
            medianMinutes: Math.round(c.medianGapSeconds / 60),
            samples: Math.min(10, c.items.length),
            computedAt: Date.now(),
          };
          freqMap[c.url] = f;
          setFeedFrequency(c.url, f);
        }
      }
      if (payload.error) setErrorMsg(payload.error);
      setResponse(payload);
      setStage('results');
    } catch (e: unknown) {
      clearTimeout(stageBump);
      setStage('error');
      const err = e as Error;
      setErrorMsg(err?.message || ('تعذّر البحث'));
    }
  };

  const handleAddCandidate = async (c: FeedCandidate) => {
    if (existingUrls.has(c.url)) {
      toast.info('موجود بالفعل');
      return;
    }
    setAdding(c.url);
    const ok = onAdd(c.url, c.title, category);
    if (ok) {
      toast.success(`تمت إضافة ${c.title}`);
    }
    setAdding(null);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-drawer flex items-end sm:items-center justify-center"
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full sm:max-w-lg bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col"
        >
          <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-body font-bold">
                {'إضافة مصدر'}
              </h3>
              <p className="text-mini text-muted-foreground mt-0.5">
                {'الصق رابط الموقع — سنبحث عن الخلاصات تلقائياً'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-accent/50"
              aria-label={'إغلاق'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 border-b border-border/30">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  dir="ltr"
                  placeholder="example.com"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDiscover();
                  }}
                  className="ps-10 h-10 text-meta rounded-xl"
                  disabled={stage === 'resolving' || stage === 'probing'}
                />
              </div>
              <Button
                onClick={handleDiscover}
                disabled={!input.trim() || stage === 'resolving' || stage === 'probing'}
                className="shrink-0 h-10 rounded-xl"
              >
                {stage === 'resolving' || stage === 'probing'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Category selector — applies to all picks from this dialog */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
              <span className="text-micro uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
                {'المجلد'}
              </span>
              {allFolders.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-2.5 py-1 rounded-full text-micro font-medium shrink-0 transition-colors ${
                    category === c.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-accent/30 text-muted-foreground hover:bg-accent/50 border border-transparent'
                  }`}
                >
                  {c.ar}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {stage === 'idle' && <EmptyHint />}
            {(stage === 'resolving' || stage === 'probing') && (
              <ProgressStrip stage={stage} />
            )}
            {stage === 'error' && <ErrorState message={errorMsg} />}
            {stage === 'results' && response && (
              <ResultsList
                response={response}
                language={'ar'}
                existingUrls={existingUrls}
                addingUrl={adding}
                onAdd={handleAddCandidate}
                errorMsg={errorMsg}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Stage components ─────────────────────────────────────────────────

function EmptyHint() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
      <Globe className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-meta text-muted-foreground max-w-xs">
        {'مثال: bbc.com — أو الصق رابط RSS مباشرةً'}
      </p>
    </div>
  );
}

function ProgressStrip({ stage, }: { stage: Stage; }) {
  const stages = [
    { id: 'resolving', ar: 'حل العنوان', en: 'Resolving address' },
    { id: 'probing', ar: 'فحص الخلاصات', en: 'Probing feed paths' },
    { id: 'parsing', ar: 'استخراج المعاينة', en: 'Reading previews' },
  ] as const;
  const currentIdx = stage === 'resolving' ? 0 : stage === 'probing' ? 1 : 2;
  return (
    <div className="space-y-3 py-4">
      {stages.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-xl shrink-0 inline-flex items-center justify-center transition-colors ${
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/15 text-primary'
                    : 'bg-foreground/8 text-muted-foreground'
              }`}
            >
              {done
                ? <Check className="h-3.5 w-3.5" />
                : active
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <span className="text-micro tabular-nums">{i + 1}</span>}
            </span>
            <span
              className={`text-mini font-medium ${
                active ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {s.ar}
            </span>
            {active && (
              <span className="ms-auto text-micro text-muted-foreground/70">
                {'جارٍ...'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
      <X className="h-8 w-8 text-destructive/60" />
      <p className="text-meta text-muted-foreground max-w-xs">
        {message ||
          ('لم يتم العثور على خلاصات')}
      </p>
    </div>
  );
}

function ResultsList({
  response,
  language,
  existingUrls,
  addingUrl,
  onAdd,
  errorMsg,
}: {
  response: DiscoverResponse;
  language: string;
  existingUrls: Set<string>;
  addingUrl: string | null;
  onAdd: (c: FeedCandidate) => void;
  errorMsg: string;
}) {
  const cands = response.candidates;
  if (cands.length === 0) {
    return (
      <ErrorState
        message={errorMsg ||
          ('لا توجد خلاصات على هذا الموقع')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {response.site && <SiteHeader site={response.site} response={response} />}
      <p className="text-micro text-muted-foreground font-semibold uppercase tracking-wider">
        {`${cands.length} خلاصة متاحة`}
      </p>
      {cands.map((c) => (
        <CandidateCard
          key={c.url}
          c={c}
          language={language}
          already={existingUrls.has(c.url)}
          adding={addingUrl === c.url}
          onAdd={() => onAdd(c)}
        />
      ))}
    </div>
  );
}

function SiteHeader({
  site,
  response,
}: {
  site: NonNullable<DiscoverResponse['site']>;
  response: DiscoverResponse;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/15">
      {site.image
        ? (
          <img
            src={site.image}
            alt=""
            className="w-10 h-10 rounded-xl object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )
        : (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary" />
          </div>
        )}
      <div className="flex-1 min-w-0">
        <p className="text-meta font-semibold truncate">{site.title}</p>
        {site.description && (
          <p className="text-micro text-muted-foreground line-clamp-1">
            {site.description}
          </p>
        )}
      </div>
      <span className="text-micro uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary font-bold shrink-0">
        {response.strategy === 'direct'
          ? ('مباشر')
          : response.strategy === 'declared'
            ? ('معلَن')
            : ('مكتشف')}
      </span>
    </div>
  );
}

function CandidateCard({
  c,
  language,
  already,
  adding,
  onAdd,
}: {
  c: FeedCandidate;
  language: string;
  already: boolean;
  adding: boolean;
  onAdd: () => void;
}) {
  const [faviconOk, setFaviconOk] = useState(true);
  const cadence = useMemo(() => {
    if (!c.medianGapSeconds || c.medianGapSeconds <= 0) return '';
    return describeFrequency(
      {
        medianMinutes: Math.round(c.medianGapSeconds / 60),
        samples: Math.min(10, c.items.length),
        computedAt: Date.now(),
      },
    );
  }, [c.medianGapSeconds, c.items.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 p-3 bg-card"
    >
      <div className="flex items-start gap-3">
        {c.favicon && faviconOk
          ? (
            <img
              src={c.favicon}
              alt=""
              className="w-9 h-9 rounded-xl object-contain bg-foreground/5 p-1.5 shrink-0"
              onError={() => setFaviconOk(false)}
            />
          )
          : (
            <SourcePill name={c.title} size="md" />
          )}
        <div className="flex-1 min-w-0">
          <p className="text-meta font-bold truncate">{c.title}</p>
          {c.description && (
            <p className="text-micro text-muted-foreground line-clamp-2 mt-0.5">
              {c.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {cadence && (
              <span className="text-micro text-muted-foreground inline-flex items-center gap-1 bg-foreground/5 rounded-full px-2 py-0.5">
                <Clock className="h-2.5 w-2.5" />
                {cadence}
              </span>
            )}
            {c.lastPublishedAt && (
              <span className="text-micro text-muted-foreground">
                {'آخر نشر '}
                {timeAgo(c.lastPublishedAt, language)}
              </span>
            )}
            {c.itemCount > 0 && (
              <span className="text-micro text-muted-foreground tabular-nums">
                · {`${c.itemCount} عنصر`}
              </span>
            )}
          </div>
          <p className="text-micro text-muted-foreground/70 truncate mt-1.5" dir="ltr">
            {c.url}
          </p>
        </div>
        {already
          ? (
            <span className="px-2.5 py-1.5 rounded-xl bg-foreground/5 text-muted-foreground text-micro font-medium shrink-0 inline-flex items-center gap-1">
              <Check className="h-3 w-3" />
              {'مضافة'}
            </span>
          )
          : (
            <Button
              size="sm"
              onClick={onAdd}
              disabled={adding}
              className="shrink-0 h-9 rounded-xl"
            >
              {adding
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Plus className="h-3.5 w-3.5" />}
            </Button>
          )}
      </div>
      {c.items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
          <p className="text-micro text-muted-foreground uppercase tracking-wider font-semibold mb-1">
            {`آخر ${c.items.length} مقالات`}
          </p>
          {c.items.map((it, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-muted-foreground/60 tabular-nums text-micro font-mono shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-mini line-clamp-1 flex-1">{it.title}</p>
              {it.pubDate && (
                <span className="text-micro text-muted-foreground/70 shrink-0">
                  {timeAgo(it.pubDate, language)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
