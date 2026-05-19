import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ScrollText, Copy, Check, ClipboardCopy, Feather, ChevronLeft, ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { notify } from '@/lib/notify';
import { useDiwanPoem } from '@/lib/diwan/hooks';
import PoemContextCard from '@/components/diwan/PoemContextCard';

/**
 * صفحة قصيدة كاملة. تعرض الأبيات بصدر/عجز، تسمح بنسخ بيت أو
 * القصيدة كاملة، وتعرض السياق التاريخي إن وُجد لها في
 * poetTimelines.poemContexts (نُعيد استخدام مكوّن السياق الحالي).
 */
export default function LibraryPoemPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { dir } = useApp();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const poem = useDiwanPoem(slug);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (poem.isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5">
        <div className="skeleton h-10 w-40 mb-4" />
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => <div key={i} className="skeleton h-8 w-full" />)}
        </div>
      </div>
    );
  }

  if (!poem.data) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5 text-center">
        <BackButton onClick={() => navigate('/diwan/library')} />
        <p className="text-muted-foreground mt-8">لم يُعثر على هذه القصيدة.</p>
      </div>
    );
  }

  const p = poem.data;
  const verses = p.verses ?? [];

  const copyVerse = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    notify.copied();
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    const text = `${p.title}\n${p.poet_name}${p.era_name ? ' — ' + p.era_name : ''}\n\n` +
      verses.map(v => v.hemistich2 ? `${v.hemistich1}    ${v.hemistich2}` : v.hemistich1).join('\n');
    navigator.clipboard.writeText(text);
    notify.copied();
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title={`${p.title} — ${p.poet_name}`}
        description={p.opening ?? ''}
        path={`/diwan/library/poem/${p.slug}`}
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <BackButton onClick={() => navigate(-1)} />
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold tracking-tight text-foreground line-clamp-1 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary shrink-0" />
              {p.title}
            </h1>
            <Link
              to={`/diwan/library/poet/${p.poet_slug}`}
              className="text-[11px] text-primary hover:underline mt-0.5 flex items-center gap-1"
            >
              <Feather className="w-3 h-3" />
              {p.poet_name}
              {p.era_name && <span className="text-muted-foreground">— {p.era_name}</span>}
              <Chevron className="w-3 h-3 opacity-60" />
            </Link>
          </div>
        </div>

        {/* Meta tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {p.kind && (
            <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {p.kind}
            </span>
          )}
          {p.meter && (
            <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400">
              البحر: {p.meter}
            </span>
          )}
          {p.rhyme && (
            <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              قافية: {p.rhyme}
            </span>
          )}
          <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
            {verses.length} {verses.length === 1 ? 'بيت' : 'أبيات'}
          </span>
          <button
            onClick={copyAll}
            className="ms-auto flex items-center gap-1 text-[11px] text-primary font-medium px-2.5 py-1 rounded-lg bg-primary/10 active:bg-primary/20 transition-colors"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            نسخ الكل
          </button>
        </div>

        {/* Historical context if available */}
        <PoemContextCard poemTitle={p.title} poetId={p.poet_slug} />

        {/* Verses */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.02 } } }}
          className="rounded-3xl bg-card border border-border/40 p-3 sm:p-5"
        >
          {verses.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-[13px]">
              لا توجد أبيات محفوظة لهذه القصيدة بعد.
            </p>
          ) : (
            <div className="space-y-1">
              {verses.map((v, i) => {
                const text = v.hemistich2 ? `${v.hemistich1}    ${v.hemistich2}` : v.hemistich1;
                return (
                  <motion.button
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 4 },
                      show:   { opacity: 1, y: 0 },
                    }}
                    onClick={() => copyVerse(text, i)}
                    className="w-full group relative py-2 px-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors text-center"
                    aria-label="نسخ البيت"
                  >
                    {v.hemistich2 ? (
                      <div className="grid grid-cols-2 gap-4 items-baseline">
                        <p
                          className="text-[15px] sm:text-[16px] text-foreground leading-[2] text-end"
                          style={{ fontFamily: "'Amiri', serif" }}
                        >
                          {v.hemistich1}
                        </p>
                        <p
                          className="text-[15px] sm:text-[16px] text-foreground leading-[2] text-start"
                          style={{ fontFamily: "'Amiri', serif" }}
                        >
                          {v.hemistich2}
                        </p>
                      </div>
                    ) : (
                      <p
                        className="text-[15px] text-foreground leading-[2]"
                        style={{ fontFamily: "'Amiri', serif" }}
                      >
                        {v.hemistich1}
                      </p>
                    )}
                    <span className={`absolute top-1/2 -translate-y-1/2 start-1 opacity-0 group-hover:opacity-100 transition-opacity ${copiedIdx === i ? 'opacity-100' : ''}`}>
                      {copiedIdx === i
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Source link */}
        {p.source_url && (
          <a
            href={p.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
          >
            <ExternalLink className="w-3 h-3" />
            المصدر الأصلي
          </a>
        )}
      </div>
    </div>
  );
}
