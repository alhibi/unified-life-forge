import React, { useState } from 'react';
import { toast } from 'sonner';

import { AppCard } from '@/components/ui/app-shell';
import { Loader2, Plus, RefreshCw, Rss, Trash2 } from '@/lib/icons';

import { marginaliaApi } from '../api';
import type { MgSource } from '../types';

/** Long-form essay feeds worth archiving — one tap to add. */
const SUGGESTED: { name: string; url: string }[] = [
  { name: 'Aeon', url: 'https://aeon.co/feed.rss' },
  { name: 'Nautilus', url: 'https://nautil.us/feed/' },
  { name: 'Quanta Magazine', url: 'https://api.quantamagazine.org/feed/' },
  { name: 'The Marginalian', url: 'https://www.themarginalian.org/feed/' },
  { name: 'Noema', url: 'https://www.noemamag.com/feed/' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'Stanford Encyclopedia (new)', url: 'https://plato.stanford.edu/rss/sep.xml' },
  { name: 'Works in Progress', url: 'https://worksinprogress.co/feed/' },
];

interface Props {
  sources: MgSource[];
  onChanged: () => void;
}

/** Feed management: add, enable/disable, refresh one source, delete. */
const SourcesPanel: React.FC<Props> = ({ sources, onChanged }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const existing = new Set(sources.map((s) => s.feed_url.replace(/\/$/, '')));

  const add = async () => {
    const feed = url.trim();
    if (!/^https?:\/\//i.test(feed)) { toast.error('أدخل رابط تغذية صحيحاً (RSS/Atom)'); return; }
    setBusy('add');
    try {
      await marginaliaApi.addSource(name.trim() || new URL(feed).hostname, feed);
      setName(''); setUrl('');
      onChanged();
      toast.success('أُضيف المصدر');
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  const refresh = async (id: string) => {
    setBusy(id);
    try {
      const res = await marginaliaApi.ingest(id);
      toast.success(res.processed ? `تمت معالجة ${res.processed} مقالاً` : 'لا مقالات جديدة');
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  const refreshAll = async () => {
    setBusy('all');
    setProgress('جارٍ الجلب…');
    try {
      const res = await marginaliaApi.ingestAll((done, total, processed) => {
        setProgress(`${done}/${total || '؟'} مصدر · ${processed} مقال`);
      });
      toast.success(
        res.processed
          ? `تمت معالجة ${res.processed} مقالاً من ${res.sources} مصدراً`
          : 'لا مقالات جديدة في كل المصادر',
      );
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); setProgress(null); }
  };

  const quickAdd = async (s: { name: string; url: string }) => {
    setBusy(s.url);
    try {
      await marginaliaApi.addSource(s.name, s.url);
      onChanged();
      toast.success(`أُضيف ${s.name}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  const toggle = async (s: MgSource) => {
    try { await marginaliaApi.setSourceActive(s.id, !s.active); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const remove = async (id: string) => {
    try { await marginaliaApi.removeSource(id); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-3">
      <AppCard className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم المصدر (اختياري)"
          className="w-full text-base rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            dir="ltr"
            className="flex-1 text-base rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={add}
            disabled={busy === 'add'}
            className="shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition disabled:opacity-50"
          >
            {busy === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة
          </button>
        </div>
      </AppCard>

      {sources.length > 0 && (
        <button
          type="button"
          onClick={refreshAll}
          disabled={busy === 'all'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold active:scale-[0.98] transition disabled:opacity-60"
        >
          {busy === 'all'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          {busy === 'all' ? (progress ?? 'جارٍ الجلب…') : 'جلب من كل المصادر'}
        </button>
      )}

      {SUGGESTED.some((s) => !existing.has(s.url.replace(/\/$/, ''))) && (
        <AppCard compact className="space-y-2">
          <p className="text-[0.6875rem] font-bold text-muted-foreground">مصادر مقترحة للمقالات الطويلة</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.filter((s) => !existing.has(s.url.replace(/\/$/, ''))).map((s) => (
              <button
                key={s.url}
                type="button"
                onClick={() => quickAdd(s)}
                disabled={busy === s.url}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs font-medium active:scale-95 transition disabled:opacity-50"
              >
                {busy === s.url
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />}
                {s.name}
              </button>
            ))}
          </div>
        </AppCard>
      )}

      {sources.length === 0 ? (
        <AppCard className="text-center py-8 space-y-2">
          <Rss className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">لا مصادر بعد — أضف تغذية لتبدأ الأرشفة.</p>
        </AppCard>
      ) : sources.map((s) => (
        <AppCard key={s.id} compact className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{s.name}</p>
            <p className="text-[0.6875rem] text-muted-foreground truncate" dir="ltr">{s.feed_url}</p>
            {s.last_error && (
              <p className="text-[0.6875rem] text-destructive mt-0.5">تعذّر الجلب — تحقّق من الرابط</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => toggle(s)}
            className={`text-[0.6875rem] font-bold px-2 py-1 rounded-lg transition ${
              s.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.active ? 'نشط' : 'موقوف'}
          </button>
          <button
            type="button"
            onClick={() => refresh(s.id)}
            disabled={busy === s.id}
            aria-label="تحديث المصدر"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition"
          >
            {busy === s.id
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => remove(s.id)}
            aria-label="حذف المصدر"
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive active:scale-95 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </AppCard>
      ))}
    </div>
  );
};

export default SourcesPanel;
