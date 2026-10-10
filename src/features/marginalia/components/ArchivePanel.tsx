import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AppCard, IconButton } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
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
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="ألصق رابط مقال…"
            dir="ltr"
            className="flex-1"
          />
          <Button onClick={add} disabled={adding} className="shrink-0">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
            {adding ? 'يُحلّل…' : 'أرشِف'}
          </Button>
        </div>
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground pointer-events-none" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الأرشيف…"
            className="ps-3 pe-9"
          />
        </div>
      </AppCard>

      {filtered.length === 0 ? (
        articles.length ? (
          <StateView
            kind="search"
            compact
            title="لا نتائج مطابقة"
            body={`لا مقال في الأرشيف يطابق «${query.trim()}». جرّب كلمة أقصر أو ابحث في العنوان.`}
          />
        ) : (
          <StateView
            kind="empty"
            compact
            title="الأرشيف فارغ"
            body="ألصق رابط مقال في الأعلى ليُحلَّل ويُضاف، أو أضف مصدر تغذية من تبويب المصادر ليبدأ الجمع تلقائياً."
          />
        )
      ) : filtered.map((a) => (
        <AppCard key={a.id} className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-meta font-bold leading-snug line-clamp-2">{a.title || a.url}</p>
              <p className="text-micro text-muted-foreground mt-0.5">
                {a.author ? `${a.author} · ` : ''}{a.word_count.toLocaleString('en-US')} كلمة
                {a.status === 'error' ? ' · تعذّر التحليل' : a.status === 'queued' ? ' · قيد المعالجة' : ''}
              </p>
            </div>
            <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label="فتح المقال"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition">
              <ExternalLink className="w-4 h-4" />
            </a>
            <IconButton
              aria-label="حذف من الأرشيف"
              onClick={async () => {
                try { await marginaliaApi.removeArticle(a.id); onChanged(); }
                catch (e) { toast.error((e as Error).message); }
              }}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </IconButton>
          </div>
          {a.summary && (
            <p className="text-mini leading-relaxed text-muted-foreground whitespace-pre-line line-clamp-4">
              {a.summary}
            </p>
          )}
          {a.domain_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {a.domain_tags.map((t) => (
                <span key={t} dir="ltr" className="text-micro font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
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
