import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { frequentDuas, duaCategories, type DuaCategory, type FrequentDua } from '@/features/duas/data/duas';
import { nawawiHadiths, type NawawiHadith } from '@/data/nawawiHadiths';
import {
  ChevronLeft, ChevronRight, Copy, Check, X, Moon, Sun, Plane, Home,
  HelpCircle, Car, DoorOpen, Building, Users, Globe, Droplets, Zap,
  Shield, Star, Leaf, Flag, Heart, CloudRain, BookOpen,
} from '@/lib/icons';
import { notify } from '@/lib/notify';

/**
 * Mihrab → Dhikr tab.
 *
 * The body of the legacy `/duas` page, repackaged as a tab inside the
 * Mihrab hub. The original Duas page had its own min-h-screen wrapper,
 * SEO tag, page title and pt-14 padding — none of those belong inside
 * a tab body, so they're stripped here and provided by `Mihrab.tsx`.
 *
 * Modal portals (category detail, Nawawi list, Nawawi detail) are
 * rendered through `document.body` so they still escape the tab
 * stacking context just as they did on the standalone page.
 */

const iconMap: Record<string, React.ElementType> = {
  Moon, Sun, Plane, Home, HelpCircle, Car, DoorOpen, Building,
  Users, Globe, Droplets, Zap, Shield, Star, Leaf, Flag, Heart, CloudRain,
};

import { pageStagger as stagger, pageItem as item } from '@/lib/motion';

function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

function FrequentDuaCard({ dua, lang }: { dua: FrequentDua; lang: string }) {
  const [open, setOpen] = useState(false);
  const Icon = iconMap[dua.icon] || Star;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/50 active:scale-95 transition-all duration-150"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-[10px] text-foreground font-medium text-center leading-tight line-clamp-2 w-16">
          {lang === 'ar' ? dua.titleAr : dua.titleDe}
        </span>
      </button>
      <DuaModal
        open={open}
        onClose={() => setOpen(false)}
        title={lang === 'ar' ? dua.titleAr : dua.titleDe}
        duas={[
          { id: 1, text: dua.text, source: dua.source },
          ...(dua.extras || []).map((e, i) => ({ id: i + 2, text: e.text, source: e.source })),
        ]}
        lang={lang}
      />
    </>
  );
}

function DuaModal({ open, onClose, title, duas, lang }: {
  open: boolean;
  onClose: () => void;
  title: string;
  duas: { id: number; text: string; source?: string }[];
  lang: string;
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyDua = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify.copied(lang === 'ar' ? 'ar' : 'de');
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <ModalPortal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60 transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {duas.map((dua, i) => (
                  <motion.div
                    key={dua.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="bg-muted/40 rounded-2xl p-4 space-y-2"
                  >
                    <p
                      className="text-foreground text-base leading-loose font-medium text-right"
                      dir="rtl"
                      style={{ fontFamily: "'Amiri', 'Noto Sans Arabic', serif" }}
                    >
                      {dua.text}
                    </p>
                    <div className="flex items-center justify-between">
                      {dua.source && (
                        <span className="text-[11px] text-primary/70 font-medium">{dua.source}</span>
                      )}
                      <button
                        onClick={() => copyDua(dua.text, dua.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors ms-auto"
                      >
                        {copiedId === dua.id ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
}

function NawawiModal({ open, onClose, hadith, lang }: {
  open: boolean;
  onClose: () => void;
  hadith: NawawiHadith;
  lang: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(hadith.text);
    setCopied(true);
    notify.copied(lang === 'ar' ? 'ar' : 'de');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <ModalPortal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                    {hadith.id}
                  </span>
                  <h2 className="text-base font-bold text-foreground">{hadith.title}</h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60 transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
                  <p
                    className="text-foreground text-base leading-[2] font-medium text-right"
                    dir="rtl"
                    style={{ fontFamily: "'Amiri', 'Noto Sans Arabic', serif" }}
                  >
                    {hadith.text}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-primary/70 font-medium">{hadith.source}</span>
                    <button
                      onClick={copyText}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
}

export default function DhikrTab() {
  const { language } = useApp();
  const [openCat, setOpenCat] = useState<DuaCategory | null>(null);
  const [openNawawi, setOpenNawawi] = useState<NawawiHadith | null>(null);
  const [showNawawiList, setShowNawawiList] = useState(false);
  useBodyScrollLock(!!openCat || !!openNawawi || showNawawiList);
  const isRtl = language === 'ar';
  const Arrow = isRtl ? ChevronLeft : ChevronRight;

  return (
    <>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Al-Nawawi's Forty Hadiths — featured */}
        <motion.div variants={item}>
          <button
            onClick={() => setShowNawawiList(true)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-primary/30 hover:border-primary/50 active:scale-[0.98] transition-all duration-150"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-start">
              <p className="text-sm font-bold text-foreground">
                {language === 'ar' ? 'الأربعون النووية' : 'An-Nawawis vierzig Hadithe'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                42 {language === 'ar' ? 'حديثاً نبوياً' : 'prophetische Hadithe'}
              </p>
            </div>
            <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </motion.div>

        {/* Frequent Duas */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {language === 'ar' ? 'أدعية متكررة' : 'Häufige Bittgebete'}
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {frequentDuas.map(dua => (
              <FrequentDuaCard key={dua.id} dua={dua} lang={language} />
            ))}
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {language === 'ar' ? 'أقسام الأدعية' : 'Kategorien'}
            </h2>
          </div>
          <div className="space-y-2.5">
            {duaCategories.map(cat => {
              const Icon = iconMap[cat.icon] || Star;
              return (
                <motion.button
                  key={cat.id}
                  variants={item}
                  onClick={() => setOpenCat(cat)}
                  className="surface-depth surface-depth-pressable w-full flex items-center gap-3 p-3.5 rounded-2xl border-s-[3px] border-s-primary/50 hover:border-primary/30"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 text-start">
                    <p className="text-sm font-bold text-foreground">
                      {language === 'ar' ? cat.titleAr : cat.titleDe}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {cat.duas.length} {language === 'ar' ? 'دعاء' : 'Bittgebete'}
                    </p>
                  </div>
                  <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* Category Detail Modal */}
      {openCat && (
        <DuaModal
          open={!!openCat}
          onClose={() => setOpenCat(null)}
          title={language === 'ar' ? openCat.titleAr : openCat.titleDe}
          duas={openCat.duas}
          lang={language}
        />
      )}

      {/* Nawawi List Modal */}
      <AnimatePresence>
        {showNawawiList && (
          <ModalPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowNawawiList(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                onClick={e => e.stopPropagation()}
                className="bg-card w-full max-w-md rounded-2xl max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                  <h2 className="text-lg font-bold text-foreground">
                    {language === 'ar' ? 'الأربعون النووية' : 'An-Nawawis vierzig Hadithe'}
                  </h2>
                  <button onClick={() => setShowNawawiList(false)} className="p-1.5 rounded-full hover:bg-muted/60 transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                  {nawawiHadiths.map((h, i) => (
                    <motion.button
                      key={h.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.25 }}
                      onClick={() => { setShowNawawiList(false); setOpenNawawi(h); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 active:scale-[0.98] transition-all duration-150 text-start"
                    >
                      <span className="w-8 h-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {h.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{h.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate" dir="rtl">
                          {h.text.slice(0, 60)}...
                        </p>
                      </div>
                      <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Nawawi Hadith Detail Modal */}
      {openNawawi && (
        <NawawiModal
          open={!!openNawawi}
          onClose={() => setOpenNawawi(null)}
          hadith={openNawawi}
          lang={language}
        />
      )}
    </>
  );
}
