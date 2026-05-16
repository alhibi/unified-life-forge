import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Globe, Link2, Loader2, Plus, Search, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeedSource } from './types';
import { CATEGORIES } from './feeds';
import { SourcePill } from './SourcePill';

/**
 * Dialog that turns "I have a website I read every day" into an
 * actual subscription. The user pastes a URL (the homepage is fine —
 * no need to know the /feed.xml path), the discover-feed edge function
 * finds every advertised feed, we show a small preview of each, and
 * the user picks one or more to subscribe to.
 *
 * If the URL the user pastes is itself a valid RSS/Atom feed, the
 * function returns a single candidate immediately so the flow is
 * unchanged for power users.
 */

interface FeedCandidate {
  url: string;
  ok: true;
  title: string;
  description: string;
  itemCount: number;
  itemTitles: string[];
  image?: string;
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

export function AddFeedDialog({
  open,
  isAr,
  existingUrls,
  onClose,
  onAdd,
}: {
  open: boolean;
  isAr: boolean;
  existingUrls: Set<string>;
  onClose: () => void;
  onAdd: (url: string, name: string, category: string) => boolean;
}) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'searching' | 'results' | 'error'
  >('idle');
  const [response, setResponse] = useState<DiscoverResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [category, setCategory] = useState('news');
  const [adding, setAdding] = useState<string | null>(null);

  // Reset when dialog re-opens
  useEffect(() => {
    if (open) {
      setInput('');
      setStatus('idle');
      setResponse(null);
      setErrorMsg('');
      setCategory('news');
    }
  }, [open]);

  const handleDiscover = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setStatus('searching');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.functions.invoke(
        'discover-feed',
        { body: { url: trimmed } },
      );
      if (error) throw error;
      const payload = data as DiscoverResponse;
      if (payload.error) {
        setErrorMsg(payload.error);
      }
      setResponse(payload);
      setStatus('results');
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message || (isAr ? 'تعذّر البحث' : 'Search failed'));
    }
  };

  const handleAddCandidate = async (c: FeedCandidate) => {
    if (existingUrls.has(c.url)) {
      toast.info(isAr ? 'موجود بالفعل' : 'Already subscribed');
      return;
    }
    setAdding(c.url);
    const ok = onAdd(c.url, c.title, category);
    if (ok) {
      toast.success(isAr ? `تمت إضافة ${c.title}` : `Added ${c.title}`);
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div
          className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full sm:max-w-lg bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[88vh] flex flex-col"
        >
          <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold">
                {isAr ? 'إضافة مصدر' : 'Add a feed'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr
                  ? 'الصق رابط الموقع — سنبحث عن الخلاصات تلقائياً'
                  : 'Paste a website URL — we’ll find its feeds'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-accent/50"
              aria-label={isAr ? 'إغلاق' : 'Close'}
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
                  className="ps-10 h-10 text-sm rounded-xl"
                  disabled={status === 'searching'}
                />
              </div>
              <Button
                onClick={handleDiscover}
                disabled={!input.trim() || status === 'searching'}
                className="shrink-0 h-10 rounded-xl"
              >
                {status === 'searching'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Category selector — applies to all picks from this dialog */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
                {isAr ? 'الفئة' : 'Category'}
              </span>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                    category === c.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-accent/30 text-muted-foreground hover:bg-accent/50 border border-transparent'
                  }`}
                >
                  {isAr ? c.ar : c.en}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {status === 'idle' && (
              <EmptyHint isAr={isAr} />
            )}
            {status === 'searching' && (
              <SearchingState isAr={isAr} />
            )}
            {status === 'error' && (
              <ErrorState isAr={isAr} message={errorMsg} />
            )}
            {status === 'results' && response && (
              <ResultsList
                response={response}
                isAr={isAr}
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

function EmptyHint({ isAr }: { isAr: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
      <Globe className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">
        {isAr
          ? 'مثال: bbc.com — أو الصق رابط RSS مباشرةً'
          : 'Example: bbc.com — or paste an RSS URL directly'}
      </p>
    </div>
  );
}

function SearchingState({ isAr }: { isAr: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">
        {isAr ? 'نبحث عن الخلاصات...' : 'Looking for feeds...'}
      </p>
    </div>
  );
}

function ErrorState({ isAr, message }: { isAr: boolean; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
      <X className="h-8 w-8 text-destructive/60" />
      <p className="text-sm text-muted-foreground max-w-xs">
        {message ||
          (isAr ? 'لم يتم العثور على خلاصات' : 'No feeds discovered')}
      </p>
    </div>
  );
}

function ResultsList({
  response,
  isAr,
  existingUrls,
  addingUrl,
  onAdd,
  errorMsg,
}: {
  response: DiscoverResponse;
  isAr: boolean;
  existingUrls: Set<string>;
  addingUrl: string | null;
  onAdd: (c: FeedCandidate) => void;
  errorMsg: string;
}) {
  const cands = response.candidates;
  if (cands.length === 0) {
    return (
      <ErrorState
        isAr={isAr}
        message={errorMsg ||
          (isAr
            ? 'لا توجد خلاصات على هذا الموقع'
            : 'No feeds advertised on this site')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {response.site && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/15">
          {response.site.image
            ? (
              <img
                src={response.site.image}
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
            <p className="text-sm font-semibold truncate">
              {response.site.title}
            </p>
            {response.site.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {response.site.description}
              </p>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary font-bold shrink-0">
            {response.strategy === 'direct'
              ? (isAr ? 'مباشر' : 'Direct')
              : response.strategy === 'declared'
                ? (isAr ? 'معلَن' : 'Declared')
                : (isAr ? 'مكتشف' : 'Probed')}
          </span>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
        {isAr
          ? `${cands.length} خلاصة متاحة`
          : `${cands.length} available feed${cands.length === 1 ? '' : 's'}`}
      </p>
      {cands.map((c) => {
        const already = existingUrls.has(c.url);
        const adding = addingUrl === c.url;
        return (
          <motion.div
            key={c.url}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 p-3 bg-card"
          >
            <div className="flex items-start gap-3">
              <SourcePill name={c.title} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{c.title}</p>
                {c.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {c.description}
                  </p>
                )}
                <p
                  className="text-[10px] text-muted-foreground/70 truncate mt-1"
                  dir="ltr"
                >
                  {c.url}
                </p>
              </div>
              {already
                ? (
                  <span className="px-2.5 py-1.5 rounded-xl bg-foreground/5 text-muted-foreground text-[11px] font-medium shrink-0 inline-flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {isAr ? 'مضافة' : 'Added'}
                  </span>
                )
                : (
                  <Button
                    size="sm"
                    onClick={() => onAdd(c)}
                    disabled={adding}
                    className="shrink-0 h-9 rounded-xl"
                  >
                    {adding
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                )}
            </div>
            {c.itemTitles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  {isAr
                    ? `آخر ${c.itemTitles.length} مقالات`
                    : `Latest ${c.itemTitles.length} article${c.itemTitles.length === 1 ? '' : 's'}`}
                </p>
                {c.itemTitles.map((t, i) => (
                  <p key={i} className="text-[12px] line-clamp-1">
                    <span className="text-muted-foreground/60 me-1.5 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {t}
                  </p>
                ))}
                {c.itemCount > c.itemTitles.length && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {isAr
                      ? `+${c.itemCount - c.itemTitles.length} مقالات أخرى`
                      : `+${c.itemCount - c.itemTitles.length} more articles`}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
