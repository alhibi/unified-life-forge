import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, BellRing, ChevronLeft, ChevronDown, ExternalLink,
  Loader2, LogIn, Moon, Pencil, Plus, Trash2, X,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeedSource } from './types';
import { timeAgo } from './utils';
import { SourcePill } from './SourcePill';
import { useNotifications } from './useNotifications';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * KeywordAlertsView — manages a per-user list of keywords. The cron
 * job (check-keyword-alerts edge function) scans new articles every
 * 30 minutes against these and writes hits into keyword_alert_hits.
 *
 * What this view delivers, end-to-end:
 *   - Alert CRUD (create / enable-toggle / delete) with source filter
 *     + match-mode (any / whole_word / phrase).
 *   - "Check now" button to trigger the edge function manually.
 *   - Realtime hit feed: postgres_changes on keyword_alert_hits with
 *     a per-user filter. New hits land instantly.
 *   - Browser notifications: opt-in via the standard Notification
 *     permission flow. When granted, every burst of inserts also
 *     fires a system notification (with a 2 s coalescing window so a
 *     30-row cron run produces ONE notification, not 30).
 *   - Quiet hours: a "no notifications between HH:mm and HH:mm"
 *     setting that handles wrap-around (22:00 → 07:00).
 *   - Snooze for 1 h / 8 h / 24 h, with a clear-snooze action.
 *   - Frequency mode: "instant" or "digest" (an in-app reminder
 *     that the cron has been running but no individual notifications
 *     fired — useful when the user wants the data but not the
 *     interruptions).
 *   - Inbox of recent hits with mark-as-read + mark-all-read.
 *
 * State that survives reload lives in localStorage (notification
 * prefs) and Postgres (alerts + hits).
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
  onSignIn,
}: {
  isAr: boolean;
  language: string;
  enabledFeeds: FeedSource[];
  onBack: () => void;
  onOpenLink: (link: string, title: string, source: string | null) => void;
  /** Optional handler invoked when an unauthenticated user taps the
   *  sign-in CTA. The parent typically navigates to /auth. When
   *  omitted, the CTA falls back to a `window.location.href` jump. */
  onSignIn?: () => void;
}) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [hits, setHits] = useState<AlertHit[]>([]);
  const [loading, setLoading] = useState(true);
  /** null while we haven't checked yet; '' when explicitly anonymous. */
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [matchMode, setMatchMode] = useState<MatchMode>('any');
  const [creating, setCreating] = useState(false);
  const [filteredSources, setFilteredSources] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Alert currently being edited, if any. Editing reuses the same
   *  form fields as creation but commits via UPDATE instead of INSERT. */
  const [editingAlert, setEditingAlert] = useState<AlertRow | null>(null);
  /** Pending alert deletion — shown in a confirmation dialog. */
  const [pendingDelete, setPendingDelete] = useState<AlertRow | null>(null);

  const notifications = useNotifications();
  const { prefs: notifPrefs, permission, request, notify, mute, setPrefs: setNotifPrefs } =
    notifications;

  // Burst-of-inserts: many alerts can match new articles within 30ms
  // when the cron fires. Coalesce into a single browser notification
  // (and a single in-app toast as fallback) per 2 s window.
  const burstRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    titles: string[];
  }>({ timer: null, titles: [] });

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          if (!cancelled) {
            setAuthUserId('');
            setLoading(false);
          }
          return;
        }
        const userId = userData.user.id;
        if (!cancelled) setAuthUserId(userId);
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
            const burst = burstRef.current;
            burst.titles.push(row.article_title);
            if (burst.timer) clearTimeout(burst.timer);
            burst.timer = setTimeout(() => {
              flushBurst();
            }, 2000);
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (chan) supabase.removeChannel(chan);
      if (burstRef.current.timer) clearTimeout(burstRef.current.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr]);

  /** Coalesced delivery: prefer a browser notification when granted +
   *  not muted + outside quiet hours. Otherwise fall back to an
   *  in-app toast. Either way, we collapse the burst into one. */
  function flushBurst() {
    const burst = burstRef.current;
    const count = burst.titles.length;
    if (count === 0) {
      burst.timer = null;
      return;
    }
    const firstTitle = burst.titles[0];
    burst.titles = [];
    burst.timer = null;

    // Digest mode silences individual notifications; the user will
    // see the inbox count + badge instead. We still update the
    // in-app inbox state above; here we just skip the notification.
    if (notifPrefs.frequency === 'digest') return;

    const title = isAr
      ? count === 1 ? 'تطابق جديد' : `${count} تطابقات جديدة`
      : count === 1 ? 'New match' : `${count} new matches`;
    const body = count === 1 ? firstTitle : firstTitle + (
      isAr ? ` و ${count - 1} أخرى` : ` and ${count - 1} more`
    );

    const result = notify({
      title,
      body,
      tag: 'reading-alerts',
    });
    if (!result.ok) {
      // Fall back to a toast so we don't drop the signal entirely.
      toast.info(`${title} · ${body}`);
    }
  }

  // ─── Alert mutations ────────────────────────────────────────────────────
  /** Create a new alert with the form values, OR commit an edit to
   *  the alert currently in `editingAlert`. */
  async function commitAlert() {
    const k = keyword.trim();
    if (k.length < 2) return;
    setCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error(isAr ? 'يلزم تسجيل الدخول' : 'Sign in required');
        return;
      }
      const sources = filteredSources.length > 0 ? filteredSources : null;
      if (editingAlert) {
        const { data, error } = await supabase.from('keyword_alerts')
          .update({
            keyword: k,
            match_mode: matchMode,
            source_filter: sources,
          })
          .eq('id', editingAlert.id)
          .select()
          .single();
        if (error) throw error;
        setAlerts((prev) =>
          prev.map((a) => (a.id === editingAlert.id ? (data as AlertRow) : a))
        );
        setEditingAlert(null);
        toast.success(isAr ? 'تم التحديث' : 'Updated');
      } else {
        const { data, error } = await supabase.from('keyword_alerts')
          .insert({
            user_id: userData.user.id,
            keyword: k,
            match_mode: matchMode,
            source_filter: sources,
            enabled: true,
          })
          .select()
          .single();
        if (error) throw error;
        setAlerts((prev) => [data as AlertRow, ...prev]);
        toast.success(isAr ? 'تم إنشاء التنبيه' : 'Alert created');
      }
      setKeyword('');
      setMatchMode('any');
      setFilteredSources([]);
    } catch (e: unknown) {
      // Wrap raw Postgres errors in a friendlier message — the user
      // doesn't need to see "duplicate key value violates unique
      // constraint" as a literal toast.
      const raw = e instanceof Error ? e.message : '';
      const friendly = /duplicate|unique/i.test(raw)
        ? (isAr ? 'هذا التنبيه موجود مسبقاً' : 'This alert already exists')
        : raw || (isAr ? 'تعذّر الحفظ' : 'Could not save');
      toast.error(friendly);
    } finally {
      setCreating(false);
    }
  }

  /** Discard the current edit and reset the form. */
  function cancelEdit() {
    setEditingAlert(null);
    setKeyword('');
    setMatchMode('any');
    setFilteredSources([]);
  }

  /** Begin editing an existing alert — populates the form with its
   *  current values. The user can then commit via the same flow as
   *  creation. */
  function startEdit(alert: AlertRow) {
    setEditingAlert(alert);
    setKeyword(alert.keyword);
    setMatchMode(alert.match_mode);
    setFilteredSources(alert.source_filter || []);
    // Scroll the form into view so the user sees the populated values.
    setTimeout(() => {
      const el = document.getElementById('keyword-alert-input');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLInputElement | null)?.focus();
    }, 50);
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

  async function confirmDeleteAlert() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (editingAlert?.id === id) cancelEdit();
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
  const muteRemaining = computeMuteRemaining(notifPrefs.mutedUntil);

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

      {/* Auth gate — replaces all controls below the header until the
          user signs in. Without this the keyword form and inbox were
          showing in a non-functional state, leaving users with a
          dead-end "Sign in required" toast they couldn't act on. */}
      {!loading && authUserId === '' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="w-14 h-14 rounded-2xl bg-primary/10 inline-flex items-center justify-center">
            <Bell className="h-7 w-7 text-primary" />
          </span>
          <div className="space-y-1.5 max-w-xs">
            <h4 className="text-base font-bold">
              {isAr ? 'سجّل الدخول لاستخدام التنبيهات' : 'Sign in to use alerts'}
            </h4>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {isAr
                ? 'تنبيهات الكلمات تحتاج إلى حسابك حتى نحفظها بأمان عبر الأجهزة.'
                : 'Keyword alerts need your account so we can sync them securely across devices.'}
            </p>
          </div>
          <Button
            onClick={() => {
              if (onSignIn) onSignIn();
              else if (typeof window !== 'undefined') window.location.href = '/auth';
            }}
            className="rounded-xl"
            size="sm"
          >
            <LogIn className="h-3.5 w-3.5 me-1.5" />
            {isAr ? 'تسجيل الدخول' : 'Sign in'}
          </Button>
        </div>
      )}

      {/* Notification status strip (only visible when authed) */}
      {authUserId && (
        <div className="px-4 py-2.5 border-b border-border/30 bg-card/40">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center gap-3 group"
        >
          <span
            className={`w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 ${
              permission === 'granted' && notifPrefs.enabled && !muteRemaining
                ? 'bg-primary/15 text-primary'
                : 'bg-foreground/8 text-muted-foreground'
            }`}
          >
            {muteRemaining
              ? <BellOff className="h-4 w-4" />
              : permission === 'granted' && notifPrefs.enabled
                ? <BellRing className="h-4 w-4" />
                : <Bell className="h-4 w-4" />}
          </span>
          <div className="flex-1 min-w-0 text-start">
            <p className="text-[13px] font-semibold truncate">
              {permission === 'unsupported'
                ? (isAr ? 'الإشعارات غير مدعومة' : 'Notifications unsupported')
                : permission === 'denied'
                  ? (isAr ? 'الإشعارات مرفوضة' : 'Notifications blocked')
                  : permission !== 'granted'
                    ? (isAr ? 'الإشعارات غير مفعّلة' : 'Notifications off')
                    : !notifPrefs.enabled
                      ? (isAr ? 'الإشعارات متوقفة' : 'Notifications paused')
                      : muteRemaining
                        ? (isAr
                          ? `كتم لمدة ${muteRemaining}`
                          : `Muted ${muteRemaining}`)
                        : notifPrefs.frequency === 'digest'
                          ? (isAr ? 'وضع الموجز' : 'Digest mode')
                          : (isAr ? 'الإشعارات مفعّلة' : 'Notifications on')}
            </p>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {isAr
                ? 'اضغط لتعديل الإعدادات'
                : 'Tap to adjust preferences'}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              settingsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {settingsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="pt-3 pb-1 space-y-3">
                {/* Permission action */}
                {permission !== 'granted' && permission !== 'unsupported' && (
                  <Button
                    onClick={() => { void request(); }}
                    size="sm"
                    className="w-full rounded-xl h-9"
                  >
                    <Bell className="h-3.5 w-3.5 me-1.5" />
                    {permission === 'denied'
                      ? (isAr
                        ? 'فعّل الإشعارات من إعدادات المتصفح'
                        : 'Enable in browser settings')
                      : (isAr ? 'السماح بالإشعارات' : 'Allow notifications')}
                  </Button>
                )}

                {/* Master toggle (only useful when permission is granted) */}
                {permission === 'granted' && (
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-[12px] font-medium">
                      {isAr ? 'تشغيل الإشعارات' : 'Notifications on'}
                    </span>
                    <Toggle
                      on={notifPrefs.enabled}
                      onChange={(v) => setNotifPrefs({ ...notifPrefs, enabled: v })}
                    />
                  </div>
                )}

                {/* Sound toggle */}
                {permission === 'granted' && notifPrefs.enabled && (
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-[12px] font-medium">
                      {isAr ? 'صوت' : 'Play sound'}
                    </span>
                    <Toggle
                      on={notifPrefs.sound}
                      onChange={(v) => setNotifPrefs({ ...notifPrefs, sound: v })}
                    />
                  </div>
                )}

                {/* Frequency: instant vs digest */}
                {permission === 'granted' && notifPrefs.enabled && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                      {isAr ? 'التكرار' : 'Frequency'}
                    </p>
                    <div className="flex gap-1.5">
                      <SegButton
                        active={notifPrefs.frequency === 'instant'}
                        onClick={() => setNotifPrefs({ ...notifPrefs, frequency: 'instant' })}
                        label={isAr ? 'فوري' : 'Instant'}
                      />
                      <SegButton
                        active={notifPrefs.frequency === 'digest'}
                        onClick={() => setNotifPrefs({ ...notifPrefs, frequency: 'digest' })}
                        label={isAr ? 'موجز' : 'Digest'}
                      />
                    </div>
                  </div>
                )}

                {/* Quiet hours */}
                {permission === 'granted' && notifPrefs.enabled && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                      <Moon className="h-3 w-3" />
                      {isAr ? 'ساعات الهدوء' : 'Quiet hours'}
                    </p>
                    <div className="flex items-center gap-2">
                      <TimeInput
                        value={notifPrefs.quietStart}
                        onChange={(v) => setNotifPrefs({ ...notifPrefs, quietStart: v })}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {isAr ? 'إلى' : 'to'}
                      </span>
                      <TimeInput
                        value={notifPrefs.quietEnd}
                        onChange={(v) => setNotifPrefs({ ...notifPrefs, quietEnd: v })}
                      />
                    </div>
                  </div>
                )}

                {/* Snooze actions */}
                {permission === 'granted' && notifPrefs.enabled && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                      {isAr ? 'كتم مؤقت' : 'Snooze'}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      <SnoozeChip
                        label={isAr ? 'ساعة' : '1 h'}
                        onClick={() => mute(60)}
                      />
                      <SnoozeChip
                        label={isAr ? '٨ ساعات' : '8 h'}
                        onClick={() => mute(60 * 8)}
                      />
                      <SnoozeChip
                        label={isAr ? '٢٤ ساعة' : '24 h'}
                        onClick={() => mute(60 * 24)}
                      />
                      {muteRemaining && (
                        <button
                          type="button"
                          onClick={() => mute(null)}
                          className="px-3 py-1 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive"
                        >
                          {isAr ? 'إلغاء الكتم' : 'Clear snooze'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Test button */}
                {permission === 'granted' && (
                  <Button
                    onClick={() => {
                      const r = notify({
                        title: isAr ? 'اختبار الإشعار' : 'Test notification',
                        body: isAr
                          ? 'سيظهر مثل هذا عند تطابق كلمة'
                          : 'This is what a keyword match will look like',
                        force: true,
                      });
                      if (!r.ok) {
                        toast.error(isAr ? 'الإشعار لم يفعّل' : 'Notification could not fire');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl h-9"
                  >
                    {isAr ? 'إرسال إشعار تجريبي' : 'Send a test notification'}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Add new alert (or edit existing) */}
      {authUserId && (
      <div className="px-4 py-3 border-b border-border/30 space-y-2.5">
        {editingAlert && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-[12px] font-bold text-primary inline-flex items-center gap-1.5 truncate">
              <Pencil className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {isAr
                  ? `تعديل: ${editingAlert.keyword}`
                  : `Editing: ${editingAlert.keyword}`}
              </span>
            </span>
            <button
              type="button"
              onClick={cancelEdit}
              className="p-1 rounded-md hover:bg-primary/15"
              aria-label={isAr ? 'إلغاء التعديل' : 'Cancel edit'}
            >
              <X className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            id="keyword-alert-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && keyword.trim().length >= 2) commitAlert();
              if (e.key === 'Escape' && editingAlert) cancelEdit();
            }}
            placeholder={isAr ? 'كلمة للمراقبة...' : 'Watch a keyword...'}
            className="flex-1 h-10 text-sm rounded-xl"
            disabled={creating}
            dir="auto"
          />
          <Button
            onClick={commitAlert}
            disabled={keyword.trim().length < 2 || creating}
            className="h-10 rounded-xl"
            aria-label={editingAlert
              ? (isAr ? 'حفظ' : 'Save')
              : (isAr ? 'إنشاء تنبيه' : 'Create alert')}
          >
            {creating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : editingAlert
                ? <Pencil className="h-4 w-4" />
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
      )}

      {/* Alerts + hits */}
      {authUserId && (
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
                    aria-label={alert.enabled
                      ? (isAr ? 'إيقاف التنبيه' : 'Disable alert')
                      : (isAr ? 'تفعيل التنبيه' : 'Enable alert')}
                    role="switch"
                    aria-checked={alert.enabled}
                  >
                    {alert.enabled
                      ? (isAr ? 'مفعّل' : 'On')
                      : (isAr ? 'متوقف' : 'Off')}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(alert)}
                    className="p-1.5 rounded-lg hover:bg-accent/40"
                    aria-label={isAr ? 'تعديل' : 'Edit'}
                    title={isAr ? 'تعديل' : 'Edit'}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(alert)}
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
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        isAr={isAr}
        title={{ ar: 'حذف هذا التنبيه؟', en: 'Delete this alert?' }}
        description={pendingDelete
          ? {
              ar: `سيتم حذف تنبيه "${pendingDelete.keyword}" بشكل دائم. التطابقات الحالية في الصندوق لن تتأثر.`,
              en: `“${pendingDelete.keyword}” will be permanently removed. Existing matches in your inbox are not affected.`,
            }
          : undefined}
        confirmLabel={{ ar: 'حذف', en: 'Delete' }}
        onConfirm={confirmDeleteAlert}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </motion.div>
  );
}

// ─── small UI helpers ─────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
        on ? 'bg-primary' : 'bg-foreground/15'
      }`}
      aria-pressed={on}
    >
      <motion.span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white "
        initial={false}
        animate={{ left: on ? 'calc(100% - 1.125rem)' : '0.125rem' }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

function SegButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
      }`}
    >
      {label}
    </button>
  );
}

function SnoozeChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[11px] font-medium bg-accent/30 text-muted-foreground hover:bg-accent/50"
    >
      {label}
    </button>
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background border border-border/60 rounded-lg text-[12px] px-2 py-1 tabular-nums"
      dir="ltr"
    />
  );
}

function computeMuteRemaining(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const ms = t - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (60 * 60_000));
  if (hours >= 1) return `${hours}h`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins}m`;
}
