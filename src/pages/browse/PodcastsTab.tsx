import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { Mic, LibraryBig, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

/**
 * Browse → Podcasts tab.
 *
 * A landing page that exposes the two main entry points into the
 * podcast surface (`/podcasts` and `/podcasts/library`). Kept
 * deliberately thin — the heavy player and discovery logic still
 * lives in `pages/Podcasts.tsx`; we just hand the user a clean
 * shortcut from the new `/browse` hub.
 */

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function PodcastsTab() {
  const { language, dir } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const cards = [
    {
      key: 'discover',
      title: isAr ? 'استكشف' : 'Entdecken',
      desc: isAr
        ? 'تصفّح بودكاست العالم العربي والإنجليزي والألماني وأكثر — مصنّفة حسب الموضوع والمنطقة.'
        : 'Stöbere durch arabische, englische, deutsche und weitere Podcasts — nach Genre und Region sortiert.',
      icon: Mic,
      onClick: () => navigate('/podcasts'),
    },
    {
      key: 'library',
      title: isAr ? 'مكتبتي' : 'Meine Bibliothek',
      desc: isAr
        ? 'البودكاست التي تابعتها وحلقاتك المحفوظة.'
        : 'Abonnierte Podcasts und gespeicherte Episoden.',
      icon: LibraryBig,
      onClick: () => navigate('/podcasts/library'),
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {/* Hero teaser */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl border border-violet-300/30 dark:border-violet-500/20 bg-gradient-to-bl from-violet-50 via-card to-violet-50/30 dark:from-violet-950/20 dark:via-card dark:to-violet-950/10 px-4 py-4">
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(167,139,250,0.18) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3.5s ease-in-out infinite',
            }}
          />
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground">
                {isAr ? 'كل شيء للاستماع' : 'Alles zum Hören'}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {isAr
                  ? 'بودكاست من جميع أنحاء العالم، يصلك كل يوم محتوى جديد.'
                  : 'Podcasts aus aller Welt — jeden Tag neue Inhalte.'}
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
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 active:scale-[0.98] transition-all duration-150 text-start"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <c.icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{c.title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{c.desc}</p>
          </div>
          <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.button>
      ))}
    </motion.div>
  );
}
