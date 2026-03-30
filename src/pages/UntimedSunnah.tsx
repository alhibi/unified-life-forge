import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronDown, Volume2, Droplet, User, Star, Users, UtensilsCrossed, Shirt, Copy, Bookmark, BookOpen } from 'lucide-react';
import { untimedSunnahData } from '@/data/untimedSunnahData';
import { toast } from 'sonner';

interface SavedItem {
  id: string;
  title: string;
  description: string;
  source: string;
  from: string;
  savedAt: string;
}

const STORAGE_KEY = 'untimed-sunnah-clipboard';

function getSavedItems(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveItems(items: SavedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

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
  const [saved, setSaved] = useState<SavedItem[]>(getSavedItems);

  useEffect(() => { saveItems(saved); }, [saved]);

  const toggleCat = (id: string) => {
    setOpenCatId(prev => prev === id ? null : id);
    setOpenItemKey(null);
  };

  const toggleItem = (key: string) => setOpenItemKey(prev => prev === key ? null : key);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(dir === 'rtl' ? 'تم النسخ' : 'Copied');
  };

  const saveItem = (title: string, description: string, source: string, catLabel: string) => {
    const exists = saved.some(s => s.title === title && s.from === catLabel);
    if (exists) {
      toast.info(dir === 'rtl' ? 'محفوظ مسبقاً' : 'Already saved');
      return;
    }
    const id = `${title}-${Date.now()}`;
    setSaved(prev => [...prev, { id, title, description, source, from: catLabel, savedAt: new Date().toLocaleDateString(dir === 'rtl' ? 'ar' : 'de') }]);
    toast.success(dir === 'rtl' ? 'تم الحفظ في الحافظة' : 'Saved to clipboard');
  };

  const isSaved = (title: string, catLabel: string) => saved.some(s => s.title === title && s.from === catLabel);

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

      {/* Accordion List */}
      <div className="flex flex-col gap-2 p-4">
        {categories.map(([id, cat]) => {
          const Icon = iconMap[cat.icon] || Star;
          const isCatOpen = openCatId === id;

          return (
            <div key={id} className="rounded-2xl bg-card/80 border border-border/40 overflow-hidden">
              <button
                onClick={() => toggleCat(id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/20"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.accent}18` }}
                >
                  <Icon className="w-5 h-5" style={{ color: cat.accent }} />
                </div>
                <div className="flex-1 text-start">
                  <span className="text-sm font-bold text-foreground">{cat.label}</span>
                  <span className="text-xs text-muted-foreground mx-2">
                    {cat.count} سنة
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isCatOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/30 px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {cat.items.map((item, i) => {
                          const itemKey = `${id}-${i}`;
                          const isItemOpen = openItemKey === itemKey;
                          const hasDetail = !!item.description;

                          return (
                            <div key={i} className="rounded-xl overflow-hidden">
                              <button
                                onClick={() => hasDetail ? toggleItem(itemKey) : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-start ${hasDetail ? 'hover:bg-accent/20 cursor-pointer' : ''}`}
                              >
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                                  style={{ backgroundColor: `${cat.accent}20`, color: cat.accent }}
                                >
                                  {i + 1}
                                </span>
                                <span className="flex-1 text-sm text-foreground leading-relaxed line-clamp-2">
                                  {item.title}
                                </span>
                                {hasDetail && (
                                  <ChevronDown
                                    className={`w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ${isItemOpen ? 'rotate-180' : ''}`}
                                  />
                                )}
                              </button>

                              <AnimatePresence initial={false}>
                                {isItemOpen && hasDetail && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3 mr-9 ml-9">
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

                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                          onClick={() => copyText(`${item.title}\n${item.description}\n${item.source || ''}`)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                        >
                                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">نسخ</span>
                                        </button>
                                        <button
                                          onClick={() => saveItem(item.title, item.description || '', item.source || '', cat.label)}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isSaved(item.title, cat.label) ? 'bg-primary/20' : 'bg-accent/30 hover:bg-accent/50'}`}
                                        >
                                          <Bookmark className={`w-3.5 h-3.5 ${isSaved(item.title, cat.label) ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                                          <span className={`text-xs ${isSaved(item.title, cat.label) ? 'text-primary' : 'text-muted-foreground'}`}>
                                            حفظ
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
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
}
