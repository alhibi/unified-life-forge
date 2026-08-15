import { motion } from 'framer-motion';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import {
Bell, BookmarkCheck, BookOpen,
  ChevronLeft, ChevronRight,
  Newspaper, Search, Settings2, } from '@/lib/icons';
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
import { pageItem as item,pageStagger as stagger } from '@/lib/motion';

export default function ArticlesTab() {
  const { dir } = useApp();
  const navigate = useNavigate();
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const primary = {
    title: 'آخر المقالات',
    desc: 'تابع أحدث القصص من المصادر التي تختارها.',
    icon: Newspaper,
    onClick: () => navigate('/reading'),
  };

  const secondary = [
    {
      key: 'bookmarks',
      title: 'المحفوظات',
      desc: 'مقالات حفظتها للقراءة لاحقاً.',
      icon: BookmarkCheck,
    },
    {
      key: 'search',
      title: 'البحث في الأرشيف',
      desc: 'ابحث عبر كل المقالات المحفوظة.',
      icon: Search,
    },
    {
      key: 'reader',
      title: 'وضع القراءة',
      desc: 'الصق رابطاً لقراءته بدون إعلانات.',
      icon: BookOpen,
    },
    {
      key: 'alerts',
      title: 'تنبيهات الكلمات',
      desc: 'تنبيهات عند ذكر كلمات تختارها.',
      icon: Bell,
    },
    {
      key: 'manage',
      title: 'إدارة المصادر',
      desc: 'أضِف وعطّل واحذف خلاصات RSS.',
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
            <p className="text-meta font-bold text-foreground">{primary.title}</p>
            <p className="text-micro text-muted-foreground leading-snug mt-0.5">{primary.desc}</p>
          </div>
          <Arrow className="w-4 h-4 text-primary shrink-0" />
        </div>
      </motion.button>

      {/* Section divider */}
      <motion.div variants={item} className="flex items-center gap-2 px-1 pt-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-micro font-semibold text-muted-foreground/70 tracking-wide">
          {'المزيد'}
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
            <p className="text-mini font-bold text-foreground">{c.title}</p>
            <p className="text-micro text-muted-foreground leading-snug">{c.desc}</p>
          </div>
          <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.button>
      ))}
    </motion.div>
  );
}
