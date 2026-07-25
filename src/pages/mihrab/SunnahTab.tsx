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

import SunnahTracker from '@/features/mihrab/components/SunnahTracker';
import { CalendarDays, ChevronLeft, Clock, Timer } from '@/lib/icons';
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

      <motion.div variants={item} className="space-y-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(link.to)}
              className="app-card app-card-pressable flex w-full items-center gap-3 text-start"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-meta font-semibold text-foreground">{link.title}</span>
                <span className="mt-0.5 block text-mini text-muted-foreground">{link.detail}</span>
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
            </button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
