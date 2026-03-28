import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { frequentDuas, duaCategories, type DuaCategory, type FrequentDua } from '@/data/duas';
import { ChevronLeft, ChevronRight, Copy, Check, X, Moon, Sun, Plane, Home, HelpCircle, Car, DoorOpen, Building, Users, Globe, Droplets, Zap, Shield, Star, Leaf, Flag, Heart, CloudRain } from 'lucide-react';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  Moon, Sun, Plane, Home, HelpCircle, Car, DoorOpen, Building,
  Users, Globe, Droplets, Zap, Shield, Star, Leaf, Flag, Heart, CloudRain,
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] } },
};

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
        duas={[{ id: 1, text: dua.text, source: dua.source }]}
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
    toast.success(lang === 'ar' ? 'تم النسخ' : 'Kopiert');
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onClick={e => e.stopPropagation()}
            className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl"
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
                  <p className="text-foreground text-base leading-loose font-medium text-right" dir="rtl" style={{ fontFamily: "'Amiri', 'Noto Sans Arabic', serif" }}>
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
                        <Check className="w-4 h-4 text-green-500" />
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
      )}
    </AnimatePresence>
  );
}

export default function DuasPage() {
  const { language, t } = useApp();
  const [openCat, setOpenCat] = useState<DuaCategory | null>(null);
  const isRtl = language === 'ar';
  const Arrow = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6 max-w-lg mx-auto"
      >
        <motion.div variants={item}>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            {language === 'ar' ? 'الأدعية المأثورة' : 'Bittgebete'}
          </h1>
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
            {duaCategories.map((cat, i) => {
              const Icon = iconMap[cat.icon] || Star;
              return (
                <motion.button
                  key={cat.id}
                  variants={item}
                  onClick={() => setOpenCat(cat)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-primary/30 active:scale-[0.98] transition-all duration-150"
                  style={{ borderInlineStartWidth: '3px', borderInlineStartColor: cat.color }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cat.color }} />
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
    </div>
  );
}
