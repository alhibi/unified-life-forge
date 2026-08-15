import { motion } from 'framer-motion';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import { ChevronLeft, ChevronRight, LibraryBig, Mic, Sparkles } from '@/lib/icons';
/**
 * Browse → Podcasts tab.
 *
 * A landing page that exposes the two main entry points into the
 * podcast surface (`/podcasts` and `/podcasts/library`). Kept
 * deliberately thin — the heavy player and discovery logic still
 * lives in `pages/Podcasts.tsx`; we just hand the user a clean
 * shortcut from the new `/browse` hub.
 */
import { pageItem as item,pageStagger as stagger } from '@/lib/motion';

export default function PodcastsTab() {
  const { dir } = useApp();
  const navigate = useNavigate();
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const cards = [
    {
      key: 'discover',
      title: 'استكشف',
      desc: 'تصفّح بودكاست العالم العربي والإنجليزي والألماني وأكثر — مصنّفة حسب الموضوع والمنطقة.',
      icon: Mic,
      onClick: () => navigate('/podcasts'),
    },
    {
      key: 'library',
      title: 'مكتبتي',
      desc: 'البودكاست التي تابعتها وحلقاتك المحفوظة.',
      icon: LibraryBig,
      onClick: () => navigate('/podcasts/library'),
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {/* Hero teaser */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-xl bg-card border border-border px-4 py-4">
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-mini font-bold text-foreground">
                {'كل شيء للاستماع'}
              </p>
              <p className="text-micro text-muted-foreground leading-snug mt-0.5">
                {'بودكاست من جميع أنحاء العالم، يصلك كل يوم محتوى جديد.'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action cards */}
      {cards.map(c => (
        <motion.button
          key={c.key}
          variants={item}
          onClick={c.onClick}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 active:scale-[0.98] transition-all duration-150 text-start"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <c.icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-meta font-bold text-foreground">{c.title}</p>
            <p className="text-micro text-muted-foreground leading-snug mt-0.5 line-clamp-2">{c.desc}</p>
          </div>
          <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.button>
      ))}
    </motion.div>
  );
}
