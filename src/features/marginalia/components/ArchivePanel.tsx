import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AppCard } from '@/components/ui/app-shell';
import { ExternalLink, Loader2, Plus, Search as SearchIcon, Trash2 } from '@/lib/icons';

import { marginaliaApi } from '../api';
import type { MgArticle } from '../types';

interface Props {
  articles: MgArticle[];
  onChanged: () => void;
}

/** The archive: paste a URL, browse what's been read and embedded. */
const ArchivePanel: React.FC<Props> = ({ articles, onChanged }) => {
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      (a.title ?? '').toLowerCase().includes(q) ||
      (a.summary ?? '').toLowerCase().includes(q) ||
      a.domain_tags.some((t) => t.includes(q)),
    );
  }, [articles, query]);

  const REASON_TEXT: Record<string, string> = {
    extraction_blocked: 'الموقع يمنع القراءة الآلية — جرّب رابط النسخة الكاملة أو موقعاً آخر',
    unsafe_url: 'رابط غير مدعوم',
  };

  const add = async () => {
    const value = url.trim();
    if (!/^https?:\/\//i.test(value)) { toast.error('أدخل رابط مقال صحيحاً'); return; }
    setAdding(true);
    try {
      const { outcome } = await marginaliaApi.addArticle(value);
      if (outcome.status === 'error') {
        toast.error(REASON_TEXT[outcome.reason ?? ''] ?? 'تعذّر أرشفة هذا الرابط');
        onChanged();
        return;
      }
      if (outcome.status === 'skipped') toast.success('المقال موجود في الأرشيف مسبقاً');
      else toast.success('أُضيف المقال إلى الأرشيف');
      setUrl('');
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setAdding(false); }
  };

  return (
    <div className="space-y-3">
      <AppCard className="space-y-2">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="ألصق رابط مقال…"
            dir="ltr"
            className="flex-1 text-base rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={add}
            disabled={adding}
            className="shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {adding ? 'يُحلّل…' : 'أرشِف'}
          </button>
        </div>
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الأرشيف…"
            className="w-full text-base rounded-xl bg-muted/40 border border-border/40 ps-3 pe-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </AppCard>

      {filtered.length === 0 ? (
        <AppCard className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {articles.length ? 'لا نتائج مطابقة' : 'الأرشيف فارغ — أضف مقالاً أو مصدراً.'}
          </p>
        </AppCard>
      ) : filtered.map((a) => (
        <AppCard key={a.id} className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug line-clamp-2">{a.title || a.url}</p>
              <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                {a.author ? `${a.author} · ` : ''}{a.word_count.toLocaleString('en-US')} كلمة
                {a.status === 'error' ? ' · تعذّر التحليل' : a.status === 'queued' ? ' · قيد المعالجة' : ''}
              </p>
            </div>
            <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label="فتح المقال"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition">
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              aria-label="حذف من الأرشيف"
              onClick={async () => {
                try { await marginaliaApi.removeArticle(a.id); onChanged(); }
                catch (e) { toast.error((e as Error).message); }
              }}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {a.summary && (
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground whitespace-pre-line line-clamp-4">
              {a.summary}
            </p>
          )}
          {a.domain_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {a.domain_tags.map((t) => (
                <span key={t} dir="ltr" className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          )}
        </AppCard>
      ))}
    </div>
  );
};

export default ArchivePanel;
