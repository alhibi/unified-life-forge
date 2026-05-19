import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, Sparkles } from 'lucide-react';
import { useDiwanSimilarPoems, useDiwanPrefetch } from '@/lib/diwan/hooks';

interface Props { slug: string; }

/**
 * يعرض حتى 6 قصائد مشابهة (نفس البحر/الغرض/العصر/الوسوم).
 * يختفي بسلاسة إن لم تتوفّر تشابهات.
 */
export default function SimilarPoems({ slug }: Props) {
  const q = useDiwanSimilarPoems(slug, 6);
  const { prefetchPoem } = useDiwanPrefetch();
  const list = q.data ?? [];
  if (q.isLoading || list.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground mb-2 px-1">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        قصائد مشابهة
      </h2>
      <div className="space-y-2">
        {list.map((p) => (
          <Link
            key={p.slug}
            to={`/diwan/library/poem/${p.slug}`}
            onPointerEnter={() => prefetchPoem(p.slug)}
            onTouchStart={() => prefetchPoem(p.slug)}
            className="block rounded-xl bg-card border border-border/30 p-3 active:scale-[0.99] transition"
          >
            <div className="flex items-start gap-2">
              <ScrollText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-semibold text-foreground truncate">{p.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  <span className="text-primary font-medium">{p.poet_name}</span>
                  {p.meter && <> · {p.meter}</>}
                  {p.kind && <> · {p.kind}</>}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}