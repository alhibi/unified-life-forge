/**
 * PortalDayTools — the four things a person actually does around today.
 *
 * The launcher holds twenty destinations, but the day itself has a small,
 * stable set of daily actions: the Hijri calendar, the step-by-step prayer
 * guide, today's adhkar and the prayer calculation settings. They are real
 * routes with real destinations — no invented counts, no dead CTAs — and they
 * give the "today" band a readable end rail on wide screens instead of a
 * second empty column.
 */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppList, AppRow, IconChip } from '@/components/ui/app-shell';
import { CalendarDays, Compass, HandHeart, Settings2 } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';

interface DayTool {
  key: string;
  label: string;
  note: string;
  path: string;
  icon: typeof CalendarDays;
}

const TOOLS: readonly DayTool[] = [
  {
    key: 'occasions',
    label: 'المناسبات الهجرية',
    note: 'التقويم وما بقي من مناسبات',
    path: '/occasions',
    icon: CalendarDays,
  },
  {
    key: 'prayer-guide',
    label: 'دليل الصلاة',
    note: 'خطوات الصلاة ومواقيتها',
    path: '/mihrab/prayer-guide',
    icon: Compass,
  },
  {
    key: 'adhkar',
    label: 'أذكار اليوم',
    note: 'أذكار الصباح والمساء',
    path: '/dhikr',
    icon: HandHeart,
  },
  {
    key: 'prayer-settings',
    label: 'إعدادات الصلاة',
    note: 'طريقة الحساب والمذهب',
    path: '/settings/prayer',
    icon: Settings2,
  },
];

function PortalDayToolsImpl({ className }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="portal-tools-h" className={className}>
      <h2
        id="portal-tools-h"
        className="mb-3 text-meta font-semibold text-muted-foreground"
      >
        أدوات اليوم
      </h2>
      <AppList>
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <AppRow
              key={tool.key}
              onClick={() => navigate(tool.path)}
              onMouseEnter={() => prefetchRoute(tool.path)}
              onFocus={() => prefetchRoute(tool.path)}
              leading={
                <IconChip size="sm">
                  <Icon className="h-4 w-4" aria-hidden />
                </IconChip>
              }
              title={tool.label}
              subtitle={tool.note}
              chevron
            />
          );
        })}
      </AppList>
    </section>
  );
}

export const PortalDayTools = memo(PortalDayToolsImpl);
export default PortalDayTools;
