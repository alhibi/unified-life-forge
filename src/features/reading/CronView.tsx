import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertCircle, Check, ChevronLeft, Clock, Database,
  Loader2, Play, RefreshCw, Wifi,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeedSource } from './types';
import { SourcePill } from './SourcePill';
import { timeAgo } from './utils';

/**
 * CronView — visibility into the background machinery that keeps the
 * archive fresh.
 *
 * Three sections, top to bottom:
 *   1. Schedule summary: the two pg_cron jobs we run
 *      (rss-refresh-feeds every 30 min, rss-keyword-alerts at :05/:35)
 *      with their last run time + status pulled from the
 *      reading_cron_status RPC. The user can click "Run now" on each
 *      job to force an immediate invocation.
 *   2. Per-feed health: a table of every feed the user is subscribed
 *      to, joined with rss_feed_meta to show last_fetched_at,
 *      last_status, item_count_last, consecutive_failures. Failing
 *      feeds float to the top so problems are visible at a glance.
 *   3. Recent run history: the last 20 invocations across both jobs,
 *      with start time, duration, and any error message.
 *
 * No data is mutated by this view (other than the explicit "Run now"
 * buttons which call the functions directly).
 */

interface CronRun {
  jobname: string;
  status: string;
  start_time: string;
  end_time: string | null;
  return_message: string | null;
}

interface FeedMeta {
  source_url: string;
  last_fetched_at: string | null;
  last_status: number | null;
  last_error: string | null;
  consecutive_failures: number;
  item_count_last: number | null;
}

export function CronView({
  language,
  feedSources,
  onBack,
}: {
  language: string;
  feedSources: FeedSource[];
  onBack: () => void;
}) {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [meta, setMeta] = useState<FeedMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyJob, setBusyJob] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const feedUrls = feedSources.map((f) => f.url);
      const [runsRes, metaRes] = await Promise.all([
        supabase.rpc('reading_cron_status', { max_rows: 30 }),
        feedUrls.length > 0
          ? supabase.from('rss_feed_meta').select('*').in('source_url', feedUrls)
          : Promise.resolve({ data: [] as FeedMeta[] }),
      ]);
      if (runsRes.data) setRuns(runsRes.data as CronRun[]);
      if (metaRes.data) setMeta(metaRes.data as FeedMeta[]);
    } catch (e) {
      // Likely the helper isn't deployed yet OR the user lacks
      // execute permission. Fall back to feed metadata only.
      console.warn('cron status:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function trigger(fn: 'fetch-rss-cron' | 'check-keyword-alerts') {
    setBusyJob(fn);
    try {
      const { error } = await supabase.functions.invoke(fn, { body: {} });
      if (error) throw error;
      toast.success('تم تشغيل المهمة');
      // Give the run a moment to record, then refetch.
      setTimeout(() => { void load(); }, 1500);
    } catch (e: any) {
      toast.error(
        e?.message ||
          ('تعذّر تشغيل المهمة'),
      );
    } finally {
      setBusyJob(null);
    }
  }

  // Group runs by jobname → most-recent-first.
  const byJob = useMemo(() => {
    const map = new Map<string, CronRun[]>();
    for (const r of runs) {
      if (!map.has(r.jobname)) map.set(r.jobname, []);
      map.get(r.jobname)!.push(r);
    }
    return map;
  }, [runs]);

  const lastRefresh = byJob.get('rss-refresh-feeds')?.[0];
  const lastAlerts = byJob.get('rss-keyword-alerts')?.[0];

  // Health rows: join feedSources with metadata; failing feeds first.
  const healthRows = useMemo(() => {
    const metaByUrl = new Map(meta.map((m) => [m.source_url, m] as const));
    const rows = feedSources.map((f) => ({
      feed: f,
      meta: metaByUrl.get(f.url),
    }));
    rows.sort((a, b) => {
      const aFail = a.meta?.consecutive_failures || 0;
      const bFail = b.meta?.consecutive_failures || 0;
      if (aFail !== bFail) return bFail - aFail;
      const aTime = a.meta?.last_fetched_at
        ? new Date(a.meta.last_fetched_at).getTime() : 0;
      const bTime = b.meta?.last_fetched_at
        ? new Date(b.meta.last_fetched_at).getTime() : 0;
      return bTime - aTime;
    });
    return rows;
  }, [feedSources, meta]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={'رجوع'}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold flex-1">
          {'حالة التحديث'}
        </h3>
        <button
          type="button"
          onClick={() => { void load(); }}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={'تحديث'}
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Schedule summary */}
        <section className="rounded-2xl bg-card border border-border/50 divide-y divide-border/30">
          <JobRow
            jobName={'تحديث الخلاصات'}
            schedule={'كل ٣٠ دقيقة'}
            run={lastRefresh}
            language={language}
            onTrigger={() => { void trigger('fetch-rss-cron'); }}
            busy={busyJob === 'fetch-rss-cron'}
          />
          <JobRow
            jobName={'فحص التنبيهات'}
            schedule={'الدقيقة ٠٥ و ٣٥'}
            run={lastAlerts}
            language={language}
            onTrigger={() => { void trigger('check-keyword-alerts'); }}
            busy={busyJob === 'check-keyword-alerts'}
          />
        </section>

        {/* Per-feed health */}
        <section>
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 inline-flex items-center gap-1.5">
            <Database className="h-3 w-3" />
            {'صحة المصادر'}
          </p>
          <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/30">
            {healthRows.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                {'لا توجد مصادر'}
              </div>
            )}
            {healthRows.map(({ feed, meta }) => (
              <FeedHealthRow
                key={feed.url}
                feed={feed}
                meta={meta}
                language={language}
              />
            ))}
          </div>
        </section>

        {/* Recent runs */}
        <section>
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {'آخر التشغيلات'}
          </p>
          {loading && runs.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
          {!loading && runs.length === 0 && (
            <div className="rounded-2xl bg-card border border-border/50 px-4 py-6 text-center text-[12px] text-muted-foreground">
              {'لا توجد سجلات. تأكد من إعدادات pg_cron.'}
            </div>
          )}
          {runs.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/30">
              {runs.slice(0, 20).map((r, i) => (
                <RunRow key={i} run={r} language={language} />
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────

function JobRow({
  jobName,
  schedule,
  run,
  language,
  onTrigger,
  busy,
}: {
  jobName: string;
  schedule: string;
  run: CronRun | undefined;
  language: string;
  onTrigger: () => void;
  busy: boolean;
}) {
  const okStatus = run?.status?.toLowerCase() === 'succeeded'
    || run?.status?.toLowerCase() === 'success';
  return (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          okStatus
            ? 'bg-primary/10 text-primary'
            : run
              ? 'bg-destructive/10 text-destructive'
              : 'bg-foreground/8 text-muted-foreground'
        }`}
      >
        {busy
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : okStatus
            ? <Check className="h-4 w-4" />
            : run
              ? <AlertCircle className="h-4 w-4" />
              : <Wifi className="h-4 w-4" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{jobName}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground">
            {schedule}
          </span>
          {run && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[10px] text-muted-foreground">
                {'آخر تشغيل '}
                {timeAgo(run.start_time, language)}
              </span>
            </>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onTrigger}
        disabled={busy}
        className="shrink-0 h-8 rounded-xl text-[11px]"
      >
        <Play className="h-3 w-3 me-1" />
        {'تشغيل'}
      </Button>
    </div>
  );
}

function FeedHealthRow({
  feed,
  meta,
  language,
}: {
  feed: FeedSource;
  meta: FeedMeta | undefined;
  language: string;
}) {
  const failing = (meta?.consecutive_failures || 0) > 0;
  const cached = meta?.last_status === 304;
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <SourcePill name={feed.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{feed.name}</p>
          {!feed.enabled && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 rounded bg-foreground/10 text-muted-foreground">
              {'موقوف'}
            </span>
          )}
          {failing && (
            <span
              className="text-[10px] uppercase tracking-wider px-1.5 rounded bg-destructive/15 text-destructive font-bold tabular-nums"
              title={meta?.last_error || ''}
            >
              {`${meta?.consecutive_failures} فشل`}
            </span>
          )}
          {cached && !failing && (
            <span
              className="text-[10px] uppercase tracking-wider px-1.5 rounded bg-foreground/10 text-muted-foreground"
              title={'مخبأ - بدون تغيير'}
            >
              304
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {meta?.last_fetched_at && (
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(meta.last_fetched_at, language)}
            </span>
          )}
          {meta?.item_count_last !== null && meta?.item_count_last !== undefined && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {`${meta.item_count_last} مقال`}
              </span>
            </>
          )}
          {meta?.last_status && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span
                className={`text-[10px] tabular-nums font-mono ${
                  failing
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                HTTP {meta.last_status}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RunRow({
  run,
  language,
}: {
  run: CronRun;
  language: string;
}) {
  const ok = run.status.toLowerCase() === 'succeeded'
    || run.status.toLowerCase() === 'success';
  const dur = run.end_time
    ? Math.max(
      0,
      new Date(run.end_time).getTime() - new Date(run.start_time).getTime(),
    )
    : null;
  const isAlertJob = run.jobname === 'rss-keyword-alerts';
  return (
    <div className="px-4 py-2.5 flex items-center gap-3">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          ok ? 'bg-emerald-500' : 'bg-destructive'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate">
          {isAlertJob
            ? ('فحص التنبيهات')
            : ('تحديث الخلاصات')}
          <span className="text-muted-foreground/70 ms-1.5 font-normal">
            {timeAgo(run.start_time, language)}
          </span>
        </p>
        {!ok && run.return_message && (
          <p className="text-[10px] text-destructive line-clamp-1 mt-0.5" dir="ltr">
            {run.return_message}
          </p>
        )}
      </div>
      {dur !== null && (
        <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0 font-mono">
          {dur < 1000 ? `${dur} ms` : `${(dur / 1000).toFixed(1)} s`}
        </span>
      )}
    </div>
  );
}
