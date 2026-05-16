import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellRing, ChevronLeft, ExternalLink, Loader2, Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeedSource } from './types';
import { timeAgo } from './utils';
import { SourcePill } from './SourcePill';

/**
 * KeywordAlertsView — manages a per-user list of keywords. The cron
 * job (check-keyword-alerts edge function) scans new articles every
 * 30 minutes against these and writes hits into keyword_alert_hits.
 * The UI shows both the list of alerts and the unseen hits inbox.
 *
 * Realtime: we subscribe to inserts on keyword_alert_hits filtered by
 * user_id so a hit landing during cron run shows up live.
 */

type MatchMode = 'any' | 'whole_word' | 'phrase';

interface AlertRow {
  id: string;
  keyword: string;
  match_mode: MatchMode;
  source_filter: string[] | null;
  enabled: boolean;
  created_at: string;
}

interface AlertHit {
  id: string;
  alert_id: string;
  article_link: string;
  article_title: string;
  source_name: string | null;
  matched_at: string;
  seen: boolean;
}

export function KeywordAlertsView({
  isAr,
  language,
  enabledFeeds,
  onBack,
  onOpenLink,
}: {
  isAr: boolean;
  language: string;
  enabledFeeds: FeedSource[];
  onBack: () => void;
  onOpenLink: (link: string, title: string, source: string | null) => void;
}) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [hits, setHits] = useState<AlertHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [matchMode, setMatchMode] = useState<MatchMode>('any');
  const [creating, setCreating] = useState(false);
  const [filteredSources, setFilteredSources] = useState<string[]>([]);

  // ─── Initial load + realtime ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          if (!cancelled) {
            setLoading(false);
            toast.error(isAr ? 'يلزم تسجيل الدخول' : 'Sign in required');
          }
          return;
        }
        const userId = userData.user.id;
        const [aRes, hRes] = await Promise.all([
          supabase.from('keyword_alerts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase.from('keyword_alert_hits')
            .select('*')
            .eq('user_id', userId)
            .order('matched_at', { ascending: false })
            .limit(100),
        ]);
        if (cancelled) return;
        if (aRes.data) setAlerts(aRes.data as AlertRow[]);
        if (hRes.data) setHits(hRes.data as AlertHit[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();

    let chan: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      chan = supabase
        .channel(`alert-hits-${data.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'keyword_alert_hits',
            filter: `user_id=eq.${data.user.id}`,
          },
          (payload) => {
            const row = payload.new as AlertHit;
            setHits((prev) => [row, ...prev].slice(0, 200));
            toast.info(
              isAr
                ? `تطابق جديد: ${row.article_title}`
                : `New match: ${row.article_title}`,
            );
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (chan) supabase.removeChannel(chan);
    };
  }, [isAr]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  async function addAlert() {
    const k = keyword.trim();
    if (k.length < 2) return;
    setCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error(isAr ? 'يلزم تسجيل الدخول' : 'Sign in required');
        return;
      }
      const { data, error } = await supabase.from('keyword_alerts')
        .insert({
          user_id: userData.user.id,
          keyword: k,
          match_mode: matchMode,
          source_filter: filteredSources.length > 0 ? filteredSources : null,
          enabled: true,
        })
        .select()
        .single();
      if (error) throw error;
      setAlerts((prev) => [data as AlertRow, ...prev]);
      setKeyword('');
      setFilteredSources([]);
      toast.success(isAr ? 'تم إنشاء التنبيه' : 'Alert created');
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'تعذّر الإنشاء' : 'Could not create'));
    } finally {
      setCreating(false);
    }
  }

  async function toggleEnabled(alert: AlertRow) {
    const next = !alert.enabled;
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, enabled: next } : a))
    );
    await supabase.from('keyword_alerts')
      .update({ enabled: next })
      .eq('id', alert.id);
  }

  async function deleteAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from('keyword_alerts').delete().eq('id', id);
    toast.success(isAr ? 'تم الحذف' : 'Deleted');
  }

  async function markHitSeen(hit: AlertHit) {
    setHits((prev) =>
      prev.map((h) => (h.id === hit.id ? { ...h, seen: true } : h))
    );
    await supabase.from('keyword_alert_hits')
      .update({ seen: true })
      .eq('id', hit.id);
  }

  async function markAllHitsSeen() {
    const unseen = hits.filter((h) => !h.seen);
    if (unseen.length === 0) return;
    setHits((prev) => prev.map((h) => ({ ...h, seen: true })));
    await supabase.from('keyword_alert_hits')
      .update({ seen: true })
      .in('id', unseen.map((h) => h.id));
  }

  async function runCheckNow() {
    toast.info(isAr ? 'جاري الفحص...' : 'Checking...');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.functions.invoke(
        'check-keyword-alerts',
        { body: userData.user ? { user_id: userData.user.id } : {} },
      );
      if (error) throw error;
      toast.success(isAr ? 'تم الفحص' : 'Check complete');
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'فشل الفحص' : 'Check failed'));
    }
  }

  const unseenCount = hits.filter((h) => !h.seen).length;

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
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold flex-1">
          {isAr ? 'تنبيهات الكلمات' : 'Keyword alerts'}
        </h3>
        {unseenCount > 0 && (
          <button
            type="button"
            onClick={markAllHitsSeen}
            className="text-[11px] text-primary font-semibold px-2 py-1 rounded-lg hover:bg-primary/10"
          >
            {isAr ? 'تحديد الكل' : 'Mark all read'}
          </button>
        )}
        <button
          type="button"
          onClick={runCheckNow}
          className="text-[11px] font-semibold px-2 py-1 rounded-lg hover:bg-accent/40 text-muted-foreground"
        >
          {isAr ? 'فحص الآن' : 'Check now'}
        </button>
      </div>

      {/* Add new alert */}
      <div className="px-4 py-3 border-b border-border/30 space-y-2.5">
        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && keyword.trim().length >= 2) addAlert();
            }}
            placeholder={isAr ? 'كلمة للمراقبة...' : 'Watch a keyword...'}
            className="flex-1 h-10 text-sm rounded-xl"
            disabled={creating}
          />
          <Button
            onClick={addAlert}
            disabled={keyword.trim().length < 2 || creating}
            className="h-10 rounded-xl"
          >
            {creating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold me-1">
            {isAr ? 'المطابقة' : 'Match'}
          </span>
          {([['any', 'أي'], ['whole_word', 'كلمة كاملة'], ['phrase', 'عبارة']] as const).map(
            ([id, ar]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMatchMode(id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  matchMode === id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-accent/30 text-muted-foreground hover:bg-accent/50 border border-transparent'
                }`}
              >
                {isAr ? ar : id.replace('_', ' ')}
              </button>
            ),
          )}
        </div>
        {enabledFeeds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold me-1">
              {isAr ? 'في' : 'In'}
            </span>
            {enabledFeeds.map((f) => {
              const active = filteredSources.includes(f.name);
              return (
                <button
                  key={f.url}
                  type="button"
                  onClick={() =>
                    setFilteredSources((prev) =>
                      active
                        ? prev.filter((n) => n !== f.name)
                        : [...prev, f.name],
                    )}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    active
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-accent/30 text-muted-foreground hover:bg-accent/50 border border-transparent'
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
            {filteredSources.length > 0 && (
              <button
                type="button"
                onClick={() => setFilteredSources([])}
                className="text-[10px] text-muted-foreground underline"
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alerts + hits */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {!loading && alerts.length === 0 && hits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground max-w-xs">
              {isAr
                ? 'أضف كلمة لتُعلَم عند ظهورها في أي مقال جديد'
                : 'Add a keyword to be notified whenever it appears in a new article'}
            </p>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              {isAr ? 'تنبيهات نشطة' : 'Active alerts'}
            </p>
            <div className="space-y-1.5">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl ${
                    alert.enabled ? 'bg-accent/15' : 'bg-accent/5 opacity-60'
                  }`}
                >
                  <BellRing
                    className={`h-3.5 w-3.5 shrink-0 ${
                      alert.enabled ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {alert.keyword}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {isAr
                        ? alert.match_mode === 'any'
                          ? 'أي تطابق'
                          : alert.match_mode === 'whole_word'
                            ? 'كلمة كاملة'
                            : 'عبارة كاملة'
                        : alert.match_mode.replace('_', ' ')}
                      {alert.source_filter && alert.source_filter.length > 0 &&
                        ` · ${alert.source_filter.length} ${
                          isAr ? 'مصدر' : 'sources'
                        }`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEnabled(alert)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      alert.enabled
                        ? 'text-primary hover:bg-primary/10'
                        : 'text-muted-foreground hover:bg-accent/40'
                    }`}
                  >
                    {alert.enabled
                      ? (isAr ? 'مفعّل' : 'On')
                      : (isAr ? 'متوقف' : 'Off')}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAlert(alert.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10"
                    aria-label={isAr ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hits.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              {isAr ? 'تطابقات حديثة' : 'Recent matches'}
            </p>
            <AnimatePresence initial={false}>
              {hits.map((hit) => (
                <motion.button
                  key={hit.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    onOpenLink(hit.article_link, hit.article_title, hit.source_name);
                    if (!hit.seen) markHitSeen(hit);
                  }}
                  className={`w-full text-start p-3 rounded-xl mb-1.5 transition-colors flex gap-3 items-start ${
                    hit.seen
                      ? 'bg-transparent hover:bg-accent/15 opacity-70'
                      : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  {!hit.seen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-2">
                      {hit.article_title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {hit.source_name && (
                        <>
                          <SourcePill name={hit.source_name} size="sm" />
                          <span className="text-[11px] text-muted-foreground">
                            {hit.source_name}
                          </span>
                        </>
                      )}
                      <span className="text-[11px] text-muted-foreground/70">
                        {timeAgo(hit.matched_at, language)}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
