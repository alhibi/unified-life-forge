import { useNavigate } from 'react-router-dom';

import { AppRow, IconChip } from '@/components/ui/app-shell';
import { useDiwanPrefetch } from '@/features/diwan/lib/hooks';
import type { DiwanPoetSummary } from '@/features/diwan/lib/types';

interface Props {
  poet: DiwanPoetSummary;
}

/**
 * صفّ شاعر داخل قائمة مجمَّعة <AppList>. كان سطرًا داخل بطاقة مخطوطة
 * مخصصة بختم شمع؛ الآن <AppRow> الموحّد، والختم صار شريحة رائدة
 * <IconChip tone="plain"> بالحرف الأول، مع حفظ التسبيق على اللمس/المرور.
 */
export default function PoetCard({ poet }: Props) {
  const navigate = useNavigate();
  const { prefetchPoet } = useDiwanPrefetch();
  const prefetch = () => prefetchPoet(poet.slug);

  const lifespan =
    poet.birth_year && poet.death_year
      ? `${poet.birth_year}–${poet.death_year}م`
      : poet.death_year
        ? `ت ${poet.death_year}م`
        : null;

  // الحرف الأول من اسم الشاعر — بقية هوية الصف
  const firstLetter = poet.name_ar ? poet.name_ar.trim().charAt(0) : 'ش';

  const subtitle = [lifespan, poet.bio].filter(Boolean).join(' · ');

  return (
    <AppRow
      onClick={() => navigate(`/diwan/library/poet/${poet.slug}`)}
      onPointerEnter={prefetch}
      onTouchStart={prefetch}
      chevron
      leading={
        <IconChip tone="plain" aria-hidden>
          <span className="text-body font-bold">{firstLetter}</span>
        </IconChip>
      }
      title={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{poet.name_ar}</span>
          {poet.title && (
            <span className="shrink-0 rounded-sm bg-primary/10 px-2 py-0.5 text-micro font-medium text-primary">
              {poet.title}
            </span>
          )}
        </span>
      }
      subtitle={subtitle || undefined}
      value={
        poet.poems_count > 0
          ? `${poet.poems_count} ${poet.poems_count === 1 ? 'قصيدة' : 'قصائد'}`
          : undefined
      }
    />
  );
}
