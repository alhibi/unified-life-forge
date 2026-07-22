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

import { pageStagger as stagger, pageItem as item } from '@/lib/motion';

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
        className="w-full relative overflow-hidden rounded-xl bg-card border border-border px-4 py-4 text-start active:scale-[0.99] transition-transform"
      >
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <primary.icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{primary.title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{primary.desc}</p>
          </div>
          <Arrow className="w-4 h-4 text-primary shrink-0" />
        </div>
      </motion.button>

      {/* Section divider */}
      <motion.div variants={item} className="flex items-center gap-2 px-1 pt-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wide">
          {isAr ? 'المزيد' : 'Mehr'}
        </span>
        <div className="h-px flex-1 bg-border" />
      </motion.div>

      {/* Secondary entries */}
      {secondary.map(c => (
        <motion.button
          key={c.key}
          variants={item}
          onClick={() => navigate('/reading')}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 active:scale-[0.98] transition-all duration-150 text-start"
        >
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
            <c.icon className="w-[18px] h-[18px] text-foreground" />
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
