import { useNavigate } from 'react-router-dom';

import { AppRow } from '@/components/ui/app-shell';
import { useDiwanPrefetch } from '@/features/diwan/lib/hooks';
import type { DiwanPoemSearchResult, DiwanPoemSummary } from '@/features/diwan/lib/types';
import { ScrollText } from '@/lib/icons';

interface Props {
  poem: DiwanPoemSummary | DiwanPoemSearchResult;
  showPoet?: boolean;
}

/**
 * صفّ قصيدة داخل قائمة مجمَّعة <AppList>. كان سطرًا داخل بطاقة مخطوطة
 * مخصصة؛ الآن صف قياسي من نظام القوائم — الفواصل والضغط والهندسة يديرها
 * <AppRow> الموحّد، ويبقى التسبيق (prefetch) على اللمس/المرور.
 */
export default function PoemCard({ poem, showPoet }: Props) {
  const search = poem as DiwanPoemSearchResult;
  const navigate = useNavigate();
  const { prefetchPoem } = useDiwanPrefetch();
  const prefetch = () => prefetchPoem(poem.slug);

  const subtitle =
    showPoet && search.poet_name
      ? poem.opening
        ? `${search.poet_name} · ${poem.opening}`
        : search.poet_name
      : poem.opening ?? undefined;

  return (
    <AppRow
      onClick={() => navigate(`/diwan/library/poem/${poem.slug}`)}
      onPointerEnter={prefetch}
      onTouchStart={prefetch}
      chevron
      leading={<ScrollText className="h-5 w-5 text-primary" aria-hidden />}
      title={poem.title}
      subtitle={subtitle}
      value={
        poem.verses_count > 0
          ? `${poem.verses_count} ${poem.verses_count === 1 ? 'بيت' : 'أبيات'}`
          : undefined
      }
    />
  );
}
