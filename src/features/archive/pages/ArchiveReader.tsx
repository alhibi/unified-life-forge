import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageShell, AppCard } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { Loader2, Clock, BookOpen } from '@/lib/icons';
import { archiveApi } from '../api';
import type { ArchiveDocument } from '../types';

function readingTime(w: number) { return Math.max(1, Math.round(w / 220)); }

export default function ArchiveReader() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ArchiveDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    archiveApi.get(id)
      .then(d => { if (alive) setDoc(d); })
      .catch(e => alive && setErr(e.message || 'خطأ'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  if (loading) return (
    <PageShell>
      <div className="flex items-center gap-3"><BackButton /></div>
      <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    </PageShell>
  );

  if (err || !doc) return (
    <PageShell>
      <div className="flex items-center gap-3"><BackButton /></div>
      <AppCard className="text-center py-10">
        <p className="text-sm text-muted-foreground">{err || 'المستند غير موجود'}</p>
      </AppCard>
    </PageShell>
  );

  return (
    <PageShell>
      <SEO title={`${doc.title} — الأرشيف`} description={doc.abstract || doc.topic} path={`/archive/${doc.id}`} />
      <div className="flex items-center gap-3 mb-2">
        <BackButton />
        <span className="font-mono text-[10px] text-primary/70 tracking-wider">
          № {String(doc.accession_number).padStart(6, '0')}
        </span>
      </div>

      <header className="py-4 border-b border-border/30 mb-3">
        <h1 className="text-2xl font-bold text-foreground leading-tight mb-3" style={{ fontFamily: 'var(--font-serif, serif)' }}>
          {doc.title}
        </h1>
        {doc.abstract && (
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-3 italic">
            {doc.abstract}
          </p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readingTime(doc.word_count)} د قراءة</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {doc.word_count.toLocaleString('ar-EG')} كلمة</span>
          <span className="px-2 py-0.5 rounded-full bg-muted/50">{doc.complexity}</span>
        </div>
        {doc.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {doc.tags.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
            ))}
          </div>
        )}
      </header>

      <article
        className="archive-prose leading-loose text-[16px] text-foreground pb-16"
        style={{ fontFamily: 'var(--font-serif, serif)' }}
      >
        <ReactMarkdown
          components={{
            h1: () => null, // hide the top H1; we already rendered it in header
            h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-foreground mt-8 mb-3 border-b border-border/30 pb-2" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-foreground mt-6 mb-2" {...props} />,
            p:  ({ node, ...props }) => <p className="mb-4 leading-loose" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pr-6 mb-4 space-y-1" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pr-6 mb-4 space-y-1" {...props} />,
            blockquote: ({ node, ...props }) => <blockquote className="border-r-2 border-primary/50 pr-3 my-3 italic text-muted-foreground" {...props} />,
            code: ({ node, ...props }) => <code className="bg-muted px-1 py-0.5 rounded text-[13px]" {...props} />,
          }}
        >
          {doc.content}
        </ReactMarkdown>
      </article>
    </PageShell>
  );
}