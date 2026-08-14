import React, { useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Loader2, Plus, RefreshCw, Rss, Trash2 } from '@/lib/icons';
import { toast } from 'sonner';

import { marginaliaApi } from '../api';
import type { MgSource } from '../types';

interface Props {
  sources: MgSource[];
  onChanged: () => void;
}

/** Feed management: add, enable/disable, refresh one source, delete. */
const SourcesPanel: React.FC<Props> = ({ sources, onChanged }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

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
