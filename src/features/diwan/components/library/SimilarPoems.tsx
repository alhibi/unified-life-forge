import { useNavigate } from 'react-router-dom';

import { AppList, AppRow, Section } from '@/components/ui/app-shell';
import { useDiwanPrefetch, useDiwanSimilarPoems } from '@/features/diwan/lib/hooks';
import { ScrollText, Sparkles } from '@/lib/icons';

interface Props {
  slug: string;
}

/**
 * يعرض حتى 6 قصائد مشابهة (نفس البحر/الغرض/العصر/الوسوم) في قائمة
 * مجمَّعة واحدة. كان كل صف بطاقة مستقلة بظل وحدود مخصصة؛ الآن صفوف
 * <AppRow> داخل <AppList> كبقية قوائم التصفّح.
 */
export default function SimilarPoems({ slug }: Props) {
  const q = useDiwanSimilarPoems(slug, 6);
  const navigate = useNavigate();
  const { prefetchPoem } = useDiwanPrefetch();
  const list = q.data ?? [];
  if (q.isLoading || list.length === 0) return null;

  return (
    <Section
      label={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          قصائد مشابهة
        </span>
      }
    >
      <AppList>
        {list.map((p) => (
          <AppRow
            key={p.slug}
            onClick={() => navigate(`/diwan/library/poem/${p.slug}`)}
            onPointerEnter={() => prefetchPoem(p.slug)}
            onTouchStart={() => prefetchPoem(p.slug)}
            chevron
            leading={<ScrollText className="h-5 w-5 text-primary" aria-hidden />}
            title={p.title}
            subtitle={`${p.poet_name}${p.meter ? ` · ${p.meter}` : ''}${
              p.kind ? ` · ${p.kind}` : ''
            }`}
          />
        ))}
      </AppList>
    </Section>
  );
}
