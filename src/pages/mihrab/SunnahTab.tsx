import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import {
  Clock, Timer, CalendarDays, Trophy, ChevronLeft, ChevronRight,
} from '@/lib/icons';

/**
 * Mihrab → Sunnah tab.
 *
 * Landing surface in front of the three Sunnah sub-pages
 * (`/section/timed-sunnah`, `/section/untimed-sunnah`,
 * `/section/prophetic-day`) plus a placeholder for the upcoming
 * Prophetic Badges feature.
 *
 * Each card mirrors the existing IslamicSections grid styling so
 * the user perceives this as the same set of cards "moved" from
 * the home grid into a dedicated home — not as new content.
 */

import { pageStagger as stagger, pageItem as item } from '@/lib/motion';

interface SunnahCard {
  key: string;
  titleAr: string;
  descAr: string;
  icon: typeof Clock;
  to?: string;
}

const CARDS: SunnahCard[] = [
  {
    key: 'timed',
    titleAr: 'السنن المؤقتة',
    descAr: 'السنن المرتبطة بأوقات الصلاة الخمس ويوم الجمعة.',
    icon: Clock,
    to: '/section/timed-sunnah',
  },
  {
    key: 'untimed',
    titleAr: 'السنن غير المؤقتة',
    descAr: 'سنن نبوية عامة في الطعام واللباس والآداب والمعاملات.',
    icon: Timer,
    to: '/section/untimed-sunnah',
  },
  {
    key: 'day',
    titleAr: 'اليوم النبوي',
    descAr: 'يوم النبي ﷺ من الفجر إلى الفجر، مع السنن المرتبطة بكل فترة.',
    icon: CalendarDays,
    to: '/section/prophetic-day',
  },
  {
    key: 'badges',
    titleAr: 'أوسمة نبوية',
    descAr: 'تتبَّع التزامك بالسنن واحصد أوسمة نبوية. (قريباً)',
    icon: Trophy,
    // No `to` — handled as "coming soon" inline.
  },
];

export default function SunnahTab() {
  const { dir } = useApp();
  const navigate = useNavigate();
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  // Per-card "coming soon" badge that briefly replaces the title when
  // the user taps a placeholder card. Same UX as the legacy
  // IslamicSections grid had for these placeholders.
  const [soon, setSoon] = useState<string | null>(null);

  const onCardClick = (card: SunnahCard) => {
    if (card.to) {
      navigate(card.to);
      return;
    }
    setSoon(card.key);
    window.setTimeout(() => setSoon(prev => (prev === card.key ? null : prev)), 1200);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {CARDS.map(card => {
        const Icon = card.icon;
        const showSoon = soon === card.key;
        const title = showSoon ? 'قريباً' : card.titleAr;
        const isPlaceholder = !card.to;

        return (
          <motion.button
            key={card.key}
            variants={item}
            onClick={() => onCardClick(card)}
            className={`surface-depth surface-depth-pressable w-full flex items-center gap-3 p-4 rounded-xl hover:border-primary/30 text-start ${isPlaceholder ? 'opacity-80' : ''}`}
          >
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground transition-all duration-200">{title}</p>
                {isPlaceholder && !showSoon && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-semibold tracking-wide">
                    قريباً
                  </span>
                )}
              </div>
              {!showSoon && (
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{card.descAr}</p>
              )}
            </div>
            <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
          </motion.button>
        );
      })}
    </motion.div>
  );
}
