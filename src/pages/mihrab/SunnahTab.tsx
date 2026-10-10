/**
 * Mihrab → Sunnah tab.
 *
 * The fourth card here used to be a placeholder («أوسمة نبوية … قريباً») that
 * flashed "soon" for 1.2 s and did nothing else. It is gone, replaced by
 * SunnahTracker: a real daily checklist the user composes themselves, whose
 * ticks feed the header streak.
 *
 * The three existing deep links stay, as a plain list under the tracker.
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { AppList, AppRow, IconChip } from '@/components/ui/app-shell';
import SunnahTracker from '@/features/mihrab/components/SunnahTracker';
import { CalendarDays, Clock, Timer } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

const LINKS = [
  {
    to: '/section/timed-sunnah',
    icon: Clock,
    title: 'السنن المؤقتة',
    detail: 'السنن المرتبطة بأوقات الصلاة الخمس ويوم الجمعة.',
  },
  {
    to: '/section/untimed-sunnah',
    icon: Timer,
    title: 'السنن غير المؤقتة',
    detail: 'سنن عامة في الطعام واللباس والآداب والمعاملات.',
  },
  {
    to: '/section/prophetic-day',
    icon: CalendarDays,
    title: 'اليوم النبوي',
    detail: 'يوم النبي ﷺ من الفجر إلى الفجر، وسنن كل فترة.',
  },
] as const;

export default function SunnahTab() {
  const navigate = useNavigate();

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <SunnahTracker />
      </motion.div>

      <motion.div variants={item}>
        <AppList>
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <AppRow
                key={link.to}
                onClick={() => navigate(link.to)}
                chevron
                leading={
                  <IconChip tone="plain" aria-hidden>
                    <Icon className="h-5 w-5" />
                  </IconChip>
                }
                title={link.title}
                subtitle={link.detail}
              />
            );
          })}
        </AppList>
      </motion.div>
    </motion.div>
  );
}
