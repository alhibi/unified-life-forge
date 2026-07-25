import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  ChevronLeft, Database, HardDrive, Image as ImageIcon,
  RefreshCw, Trash2,
} from '@/lib/icons';

import { ConfirmDialog } from './ConfirmDialog';
import { offlineDb } from './offlineDb';
import {
  getOfflinePrefs,
  type OfflinePrefs,
  storeOfflinePrefs,
} from './storage';

/**
 * StorageView — the "manage what's saved on this device" panel for
 * the reading feature.
 *
 * Renders four blocks:
 *   1. Live storage gauge: bytes used vs. quota (StorageManager API),
 *      with a coloured progress bar so heavy users notice when they're
 *      pushing the browser limit.
 *   2. Counts: how many articles + cached images are in the offline
 *      store. The image count comes from the Service Worker's Cache
 *      Storage (queried via `reading:estimate` postMessage).
 *   3. Auto-cache controls: "always keep last N unread offline" + an
 *      opt-in for image bytes (off by default since images are 90 %
 *      of the cache).
 *   4. Actions: "Clear cached images" (preserves saved articles),
 *      "Clear archive" (preserves bookmarks list, only blanks the
 *      IDB store), "Re-cache now" (forces an immediate sync). All
 *      destructive actions ask for confirmation first.
 *
 * Bookmarks themselves live in localStorage and are NEVER touched by
 * any of the destructive actions — clearing the offline cache is a
 * disk-pressure tool, not a "forget what I saved" tool.
 */

interface Stats {
  articles: number;
  quotaBytes: number;
  usageBytes: number;
  /** Cross-origin images cached by the SW. -1 if SW unavailable. */
  imageCount: number;
  /** App-shell entries in the SW runtime cache. */
  runtimeCount: number;
}

type ConfirmAction = 'clear-images' | 'clear-archive' | null;

export function StorageView({
  bookmarksCount,
  onBack,
  onRecacheNow,
}: {
  bookmarksCount: number;
  onBack: () => void;
  onRecacheNow: () => Promise<void> | void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<OfflinePrefs>(() => getOfflinePrefs());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  /**
   * Round-trip a `reading:estimate` postMessage to the Service Worker
   * to get cross-origin image counts (which `navigator.storage.estimate`
   * does not expose directly). Resolves to null if no SW is active.
   */
  const querySwEstimate = (): Promise<{ imageCount: number; runtimeCount: number } | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) {
        resolve(null);
        return;
      }
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 1500);
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        const data = e.data as {
          type?: string;
          imageCount?: number;
          runtimeCount?: number;
        };
        if (data?.type === 'reading:estimate-result') {
          resolve({
            imageCount: data.imageCount ?? 0,
            runtimeCount: data.runtimeCount ?? 0,
          });
        } else {
          resolve(null);
        }
      };
      try {
        navigator.serviceWorker.controller.postMessage(
          { type: 'reading:estimate' },
          [channel.port2],
        );
      } catch {
        clearTimeout(timer);
        resolve(null);
      }
    });
  };

  const reload = async () => {
    try {
      const base = await offlineDb.storageEstimate();
      const sw = await querySwEstimate();
      setStats({
        articles: base.articles,
        quotaBytes: base.quotaBytes,
        usageBytes: base.usageBytes,
        imageCount: sw?.imageCount ?? -1,
        runtimeCount: sw?.runtimeCount ?? -1,
      });
    } catch {
      setStats({
        articles: 0,
        quotaBytes: 0,
        usageBytes: 0,
        imageCount: -1,
        runtimeCount: -1,
      });
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  function patch(p: Partial<OfflinePrefs>) {
    const next = { ...prefs, ...p };
    setPrefs(next);
    storeOfflinePrefs(next);
  }

  async function clearImagesCache() {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'reading:clear-images' });
      // Give the SW a tick to actually drop the cache, then re-measure.
      await new Promise((r) => setTimeout(r, 350));
      await reload();
      toast.success('تم مسح الصور المؤقتة');
    } finally {
      setBusy(false);
    }
  }

  async function clearArchive() {
    setBusy(true);
    try {
      const removed = await offlineDb.clearArticles();
      await reload();
      toast.success(
        `تم مسح ${removed} مقال من الذاكرة المؤقتة`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function reCache() {
    setBusy(true);
    try {
      await onRecacheNow();
      await reload();
      toast.success('تم تحديث الذاكرة المؤقتة');
    } finally {
      setBusy(false);
    }
  }

  const usagePct = stats && stats.quotaBytes > 0
    ? Math.min(100, (stats.usageBytes / stats.quotaBytes) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 app-sticky-header-card z-raised">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={'رجوع'}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <HardDrive className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold flex-1">
          {'التخزين دون اتصال'}
        </h3>
        <button
          type="button"
          onClick={reload}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={'تحديث'}
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Storage gauge */}
        <section className="rounded-2xl bg-card border border-border/50 p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[0.6875rem] uppercase tracking-wider font-bold text-muted-foreground">
              {'استهلاك المساحة'}
            </span>
            <span className="text-[0.6875rem] text-muted-foreground tabular-nums" dir="ltr">
              {stats ? `${formatBytes(stats.usageBytes)} / ${formatBytes(stats.quotaBytes) || '—'}` : '—'}
            </span>
          </div>
          <div
            className="h-2 rounded-full bg-foreground/8 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(usagePct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={'استهلاك المساحة'}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePct}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{
                background: usagePct > 85
                  ? 'hsl(var(--destructive))'
                  : usagePct > 60
                    ? 'hsl(38 90% 55%)'
                    : 'hsl(var(--primary))',
              }}
            />
          </div>
          <p className="text-[0.625rem] text-muted-foreground/70 mt-2">
            {'يشمل الرقم المقالات المخزنة + الصور المخبأة في Service Worker.'}
          </p>
        </section>

        {/* Counts grid — two rows of two on phones, four-up on tablets */}
        <section className="grid grid-cols-2 gap-3">
          <Stat
            icon={<Database className="h-4 w-4" />}
            label={'مقالات مخزنة'}
            value={stats?.articles ?? 0}
          />
          <Stat
            icon={<Database className="h-4 w-4" />}
            label={'مرجعيات محفوظة'}
            value={bookmarksCount}
          />
          <Stat
            icon={<ImageIcon className="h-4 w-4" />}
            label={'صور مخبأة'}
            value={stats && stats.imageCount >= 0 ? stats.imageCount : '—'}
            hint={stats && stats.imageCount < 0
              ? ('بدون Service Worker')
              : undefined}
          />
          <Stat
            icon={<HardDrive className="h-4 w-4" />}
            label={'ملفات التطبيق'}
            value={stats && stats.runtimeCount >= 0 ? stats.runtimeCount : '—'}
            hint={stats && stats.runtimeCount < 0
              ? ('بدون Service Worker')
              : undefined}
          />
        </section>

        {/* Auto-cache controls */}
        <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-bold mb-1">
              {'الحفظ التلقائي'}
            </h4>
            <p className="text-[0.6875rem] text-muted-foreground">
              {'احتفظ بآخر مقالات غير مقروءة جاهزة للقراءة بدون اتصال.'}
            </p>
          </div>
          <div>
            <p className="text-[0.625rem] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              {'العدد'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {([0, 10, 25, 50, 100, 250, 500] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => patch({ autoCacheCount: n })}
                  aria-pressed={prefs.autoCacheCount === n}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    prefs.autoCacheCount === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {n === 0 ? ('إيقاف') : n}
                </button>
              ))}
            </div>
          </div>
          <ToggleRow
            icon={<ImageIcon className="h-4 w-4" />}
            label={'تخزين الصور'}
            description={'الصور تشكّل معظم الحجم. أوقفها لتوفير المساحة.'}
            on={prefs.cacheImages}
            onChange={(v) => patch({ cacheImages: v })}
          />
          <div>
            <p className="text-[0.625rem] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              {'مدة الاحتفاظ'}
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {'دائم — لا تُحذف المقالات أبداً'}
              </span>
            </div>
            <p className="text-[0.625rem] text-muted-foreground/70 mt-2">
              {'كل المقالات تُحفظ للأبد. أرشيفك ينمو باستمرار ولا يُفقد أي محتوى.'}
            </p>
          </div>
        </section>

        {/* Actions */}
        <section className="rounded-2xl bg-card border border-border/50 divide-y divide-border/40">
          <ActionRow
            icon={<RefreshCw className="h-4 w-4" />}
            label={'إعادة الحفظ الآن'}
            description={'مزامنة فورية مع آخر المقالات.'}
            onClick={reCache}
            busy={busy}
          />
          <ActionRow
            icon={<ImageIcon className="h-4 w-4" />}
            label={'مسح الصور المؤقتة'}
            description={'يبقي نصوص المقالات. عادةً يحرر الجزء الأكبر من المساحة.'}
            onClick={() => setConfirmAction('clear-images')}
            busy={busy}
            destructive
          />
          <ActionRow
            icon={<Trash2 className="h-4 w-4" />}
            label={'مسح الأرشيف بالكامل'}
            description={'لا يحذف المرجعيات (قائمة الحفظ في الإعدادات).'}
            onClick={() => setConfirmAction('clear-archive')}
            busy={busy}
            destructive
          />
        </section>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'clear-archive'
          ? { ar: 'مسح كل المقالات المخزّنة؟', en: 'Clear all cached articles?' }
          : { ar: 'مسح الصور المخبأة؟', en: 'Clear image cache?' }}
        description={confirmAction === 'clear-archive'
          ? {
              ar: 'سيتم حذف نصوص المقالات الموجودة دون اتصال. قائمة المرجعيات في الإعدادات لن تتأثر.',
              en: 'Article text saved offline will be removed. Your bookmarks list is preserved.',
            }
          : {
              ar: 'سيُعاد تنزيل الصور تلقائيًا عند الحاجة في حال توفّر الإنترنت.',
              en: 'Images will be re-downloaded on demand the next time you’re online.',
            }}
        confirmLabel={{ ar: 'مسح', en: 'Clear' }}
        onConfirm={async () => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'clear-archive') await clearArchive();
          else if (action === 'clear-images') await clearImagesCache();
        }}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      />
    </motion.div>
  );
}

// ─── helper components ─────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/50 p-3.5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center">
          {icon}
        </span>
        <span className="text-[0.625rem] uppercase tracking-wider font-bold">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {hint && (
        <p className="text-[0.625rem] text-muted-foreground/70 mt-0.5">{hint}</p>
      )}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className="w-full flex items-center gap-3 -mx-1 px-1 py-1.5 text-start"
    >
      <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[0.6875rem] text-muted-foreground leading-snug">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
          on ? 'bg-primary' : 'bg-foreground/15'
        }`}
      >
        <motion.span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white "
          initial={false}
          animate={{ left: on ? 'calc(100% - 1.125rem)' : '0.125rem' }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}

function ActionRow({
  icon,
  label,
  description,
  onClick,
  busy,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void | Promise<void>;
  busy: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => { void onClick(); }}
      disabled={busy}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/15 transition-colors text-start disabled:opacity-50"
    >
      <span
        className={`w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 ${
          destructive
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold ${destructive ? 'text-destructive' : ''}`}>
          {label}
        </span>
        <span className="block text-[0.6875rem] text-muted-foreground leading-snug">
          {description}
        </span>
      </span>
    </button>
  );
}

function formatBytes(n: number): string {
  if (!n || n <= 0) return '0';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
