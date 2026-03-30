import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronDown, Volume2, Droplet, User, Star, Users, UtensilsCrossed, Shirt, Copy, Bookmark, BookOpen } from 'lucide-react';
import { untimedSunnahData } from '@/data/untimedSunnahData';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  volume: Volume2,
  droplet: Droplet,
  user: User,
  star: Star,
  users: Users,
  utensils: UtensilsCrossed,
  shirt: Shirt,
};

export default function UntimedSunnah() {
  const navigate = useNavigate();
  const { dir } = useApp();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);

  const toggleCat = (id: string) => {
    setOpenCatId(prev => prev === id ? null : id);
    setOpenItemKey(null);
  };

  const toggleItem = (key: string) => setOpenItemKey(prev => prev === key ? null : key);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(dir === 'rtl' ? 'تم النسخ' : 'Copied');
  };

  const categories = Object.entries(untimedSunnahData);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center"
          >
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">السنن غير الموقوتة</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Grid of categories */}
      <AnimatePresence mode="wait">
        {!openCatId ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3 p-4"
          >
            {categories.map(([id, cat], index) => {
              const Icon = iconMap[cat.icon] || Star;
              return (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleCat(id)}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/80 border border-border/40 hover:bg-accent/20 transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.accent}18` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: cat.accent }} />
                  </div>
                  <span className="text-sm font-bold text-foreground text-center leading-tight">
                    {cat.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cat.count} سنة
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: dir === 'rtl' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
            className="p-4"
          >
            {(() => {
              const cat = untimedSunnahData[openCatId];
              const Icon = iconMap[cat.icon] || Star;
              return (
                <div className="space-y-3">
                  {/* Category header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setOpenCatId(null)}
                      className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center"
                    >
                      <BackIcon className="w-5 h-5 text-foreground" />
                    </button>
                    <div className="text-center flex-1">
                      <h2 className="text-lg font-bold text-foreground">{cat.label}</h2>
                      <span className="text-xs text-muted-foreground">{cat.count} سنة</span>
                    </div>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${cat.accent}18` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: cat.accent }} />
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="flex flex-col gap-2">
                    {cat.items.map((item, i) => {
                      const itemKey = `${openCatId}-${i}`;
                      const isItemOpen = openItemKey === itemKey;

                      return (
                        <div key={i} className="rounded-2xl bg-card/80 border border-border/40 overflow-hidden">
                          <button
                            onClick={() => toggleItem(itemKey)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/20"
                          >
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ backgroundColor: `${cat.accent}20`, color: cat.accent }}
                            >
                              {i + 1}
                            </span>
                            <span className="flex-1 text-sm font-semibold text-foreground text-start leading-relaxed">
                              {item.title}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ${isItemOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          <AnimatePresence initial={false}>
                            {isItemOpen && item.description && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/30 px-4 pb-4 pt-3">
                                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                    {item.description}
                                  </p>
                                  {item.source && (
                                    <div className="flex items-center gap-1.5 mb-3">
                                      <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: cat.accent }} />
                                      <span className="text-xs font-medium" style={{ color: cat.accent }}>
                                        {item.source}
                                      </span>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => copyText(`${item.title}\n${item.description}\n${item.source || ''}`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">نسخ</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
