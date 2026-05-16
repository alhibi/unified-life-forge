import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Database, HardDrive, Image as ImageIcon,
  RefreshCw, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { offlineDb } from './offlineDb';
import {
  type OfflinePrefs,
  getOfflinePrefs,
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
 *   2. Counts: how many articles + images are in the offline cache.
 *   3. Auto-cache controls: "always keep last N unread offline" + an
 *      opt-in for image bytes (off by default since images are 90 %
 *      of the cache).
 *   4. Actions: "Clear cached images" (preserves saved articles),
 *      "Clear archive" (preserves bookmarks list, only blanks the
 *      IDB store), "Re-cache now" (forces an immediate sync).
 *
 * Bookmarks themselves live in localStorage and are NEVER touched by
 * any of the destructive actions — clearing the offline cache is a
 * disk-pressure tool, not a "forget what I saved" tool.
 */

interface Stats {
  articles: number;
  quotaBytes: number;
  usageBytes: number;
}

export function StorageView({
  isAr,
  bookmarksCount,
  onBack,
  onRecacheNow,
}: {
  isAr: boolean;
  bookmarksCount: number;
  onBack: () => void;
  onRecacheNow: () => Promise<void> | void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<OfflinePrefs>(() => getOfflinePrefs());

  const reload = async () => {
    try {
      const s = await offlineDb.storageEstimate();
      setStats(s);
    } catch {
      setStats({ articles: 0, quotaBytes: 0, usageBytes: 0 });
    }
  };

  useEffect(() => {
    reload();
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
      toast.success(isAr ? 'تم مسح الصور المؤقتة' : 'Image cache cleared');
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
        isAr
          ? `تم مسح ${removed} مقال من الذاكرة المؤقتة`
          : `Cleared ${removed} archived article${removed === 1 ? '' : 's'}`,
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
      toast.success(isAr ? 'تم تحديث الذاكرة المؤقتة' : 'Cache refreshed');
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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <HardDrive className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold flex-1">
          {isAr ? 'التخزين دون اتصال' : 'Offline storage'}
        </h3>
        <button
          type="button"
          onClick={reload}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Storage gauge */}
        <section className="rounded-2xl bg-card border border-border/50 p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              {isAr ? 'استهلاك المساحة' : 'Space used'}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums" dir="ltr">
              {stats ? `${formatBytes(stats.usageBytes)} / ${formatBytes(stats.quotaBytes) || '—'}` : '—'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
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
          <p className="text-[10px] text-muted-foreground/70 mt-2">
            {isAr
              ? 'يشمل الرقم المقالات المخزنة + الصور المخبأة في Service Worker.'
              : 'Includes archived articles + Service Worker image cache.'}
          </p>
        </section>

        {/* Counts grid */}
        <section className="grid grid-cols-2 gap-3">
          <Stat
            icon={<Database className="h-4 w-4" />}
            label={isAr ? 'مقال مخزن' : 'Articles cached'}
            value={stats?.articles ?? 0}
          />
          <Stat
            icon={<Database className="h-4 w-4" />}
            label={isAr ? 'مرجعية محفوظة' : 'Bookmarked'}
            value={bookmarksCount}
          />
        </section>

        {/* Auto-cache controls */}
        <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-bold mb-1">
              {isAr ? 'الحفظ التلقائي' : 'Auto-cache'}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {isAr
                ? 'احتفظ بآخر مقالات غير مقروءة جاهزة للقراءة بدون اتصال.'
                : 'Keep your most recent unread articles ready for offline reading.'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              {isAr ? 'العدد' : 'Count'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {([0, 10, 25, 50, 100] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => patch({ autoCacheCount: n })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    prefs.autoCacheCount === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {n === 0 ? (isAr ? 'إيقاف' : 'Off') : n}
                </button>
              ))}
            </div>
          </div>
          <ToggleRow
            icon={<ImageIcon className="h-4 w-4" />}
            label={isAr ? 'تخزين الصور' : 'Cache images'}
            description={isAr
              ? 'الصور تشكّل معظم الحجم. أوقفها لتوفير المساحة.'
              : 'Images are 90 % of disk usage. Turn off to save space.'}
            on={prefs.cacheImages}
            onChange={(v) => patch({ cacheImages: v })}
          />
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              {isAr ? 'مدة الاحتفاظ' : 'Retention'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {([30, 60, 90, 180, 365] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => patch({ retentionDays: d })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors tabular-nums ${
                    prefs.retentionDays === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {isAr
                    ? d >= 365 ? 'سنة' : `${d} يوم`
                    : d >= 365 ? '1 year' : `${d} days`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-2">
              {isAr
                ? 'المقالات المرجعية محمية ولا تُحذف بالعمر.'
                : 'Bookmarked articles are exempt from age pruning.'}
            </p>
          </div>
        </section>

        {/* Actions */}
        <section className="rounded-2xl bg-card border border-border/50 divide-y divide-border/40">
          <ActionRow
            icon={<RefreshCw className="h-4 w-4" />}
            label={isAr ? 'إعادة الحفظ الآن' : 'Re-cache now'}
            description={isAr
              ? 'مزامنة فورية مع آخر المقالات.'
              : 'Sync the offline store with your latest articles.'}
            onClick={reCache}
            busy={busy}
          />
          <ActionRow
            icon={<ImageIcon className="h-4 w-4" />}
            label={isAr ? 'مسح الصور المؤقتة' : 'Clear image cache'}
            description={isAr
              ? 'يبقي نصوص المقالات. عادةً يحرر الجزء الأكبر من المساحة.'
              : 'Keeps article text. Usually frees the bulk of the space.'}
            onClick={clearImagesCache}
            busy={busy}
            destructive
          />
          <ActionRow
            icon={<Trash2 className="h-4 w-4" />}
            label={isAr ? 'مسح الأرشيف بالكامل' : 'Clear all cached articles'}
            description={isAr
              ? 'لا يحذف المرجعيات (قائمة الحفظ في الإعدادات).'
              : 'Bookmarks list is preserved.'}
            onClick={clearArchive}
            busy={busy}
            destructive
          />
        </section>
      </div>
    </motion.div>
  );
}

// ─── helper components ─────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/50 p-3.5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center">
          {icon}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-bold">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
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
      className="w-full flex items-center gap-3 -mx-1 px-1 py-1.5 text-start"
    >
      <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[11px] text-muted-foreground leading-snug">
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
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
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
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/15 transition-colors text-start"
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
        <span className="block text-[11px] text-muted-foreground leading-snug">
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
