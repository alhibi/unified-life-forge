import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import {
  Newspaper, BookmarkCheck, Search, Settings2, Bell, BookOpen,
  ChevronLeft, ChevronRight,
} from '@/lib/icons';

/**
 * Browse → Articles tab ("اقرأ").
 *
 * Thin landing in front of the Reading (`/reading`) feature. Surfaces
 * the most-used entry points so the user doesn't have to dig through
 * the in-page header on the Reading list view itself.
 *
 * Every card navigates to `/reading` — the destination view inside
 * Reading is selected by the user's last-known sub-view (Reading
 * remembers it). For first visits, they all land on the article list,
 * which is the right default.
 */

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function ArticlesTab() {
  const { language, dir } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const primary = {
    title: isAr ? 'آخر المقالات' : 'Neueste Artikel',
    desc: isAr
      ? 'تابع أحدث القصص من المصادر التي تختارها.'
      : 'Verfolge die neuesten Geschichten aus deinen Quellen.',
    icon: Newspaper,
    onClick: () => navigate('/reading'),
  };

  const secondary = [
    {
      key: 'bookmarks',
      title: isAr ? 'المحفوظات' : 'Lesezeichen',
      desc: isAr ? 'مقالات حفظتها للقراءة لاحقاً.' : 'Gespeicherte Artikel zum späteren Lesen.',
      icon: BookmarkCheck,
    },
    {
      key: 'search',
      title: isAr ? 'البحث في الأرشيف' : 'Archivsuche',
      desc: isAr ? 'ابحث عبر كل المقالات المحفوظة.' : 'Suche durch alle archivierten Artikel.',
      icon: Search,
    },
    {
      key: 'reader',
      title: isAr ? 'وضع القراءة' : 'Lesemodus',
      desc: isAr ? 'الصق رابطاً لقراءته بدون إعلانات.' : 'Link einfügen — werbefrei lesen.',
      icon: BookOpen,
    },
    {
      key: 'alerts',
      title: isAr ? 'تنبيهات الكلمات' : 'Stichwort-Alerts',
      desc: isAr ? 'تنبيهات عند ذكر كلمات تختارها.' : 'Benachrichtigungen für deine Stichwörter.',
      icon: Bell,
    },
    {
      key: 'manage',
      title: isAr ? 'إدارة المصادر' : 'Quellen verwalten',
      desc: isAr ? 'أضِف وعطّل واحذف خلاصات RSS.' : 'RSS-Feeds hinzufügen oder entfernen.',
      icon: Settings2,
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {/* Primary entry — visually heaviest */}
      <motion.button
        variants={item}
        onClick={primary.onClick}
        className="w-full relative overflow-hidden rounded-2xl border border-sky-300/30 dark:border-sky-500/20 bg-gradient-to-bl from-sky-50 via-card to-sky-50/30 dark:from-sky-950/20 dark:via-card dark:to-sky-950/10 px-4 py-4 text-start active:scale-[0.99] transition-transform"
      >
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
            <primary.icon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{primary.title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{primary.desc}</p>
          </div>
          <Arrow className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
        </div>
      </motion.button>

      {/* Section divider */}
      <motion.div variants={item} className="flex items-center gap-2 px-1 pt-1">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wide">
          {isAr ? 'المزيد' : 'Mehr'}
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </motion.div>

      {/* Secondary entries */}
      {secondary.map(c => (
        <motion.button
          key={c.key}
          variants={item}
          onClick={() => navigate('/reading')}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-primary/30 active:scale-[0.98] transition-all duration-150 text-start"
        >
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
            <c.icon className="w-[18px] h-[18px] text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground">{c.title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{c.desc}</p>
          </div>
          <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.button>
      ))}
    </motion.div>
  );
}
