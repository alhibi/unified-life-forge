import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronDown, Moon, Sun, CloudSun, Cloud, Calendar, Copy, Bookmark, BookOpen, Share2, ClipboardList, X, Trash2 } from 'lucide-react';
import { sunnahDetailData } from '@/data/sunnahDetailData';
import { toast } from 'sonner';

interface SavedItem {
  id: string;
  title: string;
  description: string;
  source: string;
  from: string; // category label
  savedAt: string;
}

const STORAGE_KEY = 'sunnah-clipboard';

function getSavedItems(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveItems(items: SavedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function TimedSunnah() {
  const navigate = useNavigate();
  const { t, dir } = useApp();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const [showClipboard, setShowClipboard] = useState(false);
  const [saved, setSaved] = useState<SavedItem[]>(getSavedItems);

  useEffect(() => { saveItems(saved); }, [saved]);

  const categories = [
    { id: 'fajr', labelKey: 'timed.fajr', icon: CloudSun, accent: '#D4A843' },
    { id: 'before-fajr', labelKey: 'timed.beforeFajr', icon: Moon, accent: '#D4A843' },
    { id: 'dhuhr', labelKey: 'timed.dhuhr', icon: Sun, accent: '#4CAF50' },
    { id: 'duha', labelKey: 'timed.duha', icon: Sun, accent: '#D4A843' },
    { id: 'maghrib', labelKey: 'timed.maghrib', icon: Cloud, accent: '#4CAF50' },
    { id: 'asr', labelKey: 'timed.asr', icon: CloudSun, accent: '#4CAF50' },
    { id: 'isha', labelKey: 'timed.isha', icon: Moon, accent: '#D4A843' },
    { id: 'friday', labelKey: 'timed.friday', icon: Calendar, accent: '#D4A843' },
  ];

  const toggleCat = (id: string) => {
    setOpenCatId(prev => prev === id ? null : id);
    setOpenItemKey(null);
  };

  const toggleItem = (key: string) => setOpenItemKey(prev => prev === key ? null : key);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(dir === 'rtl' ? 'تم النسخ' : 'Copied');
  };

  const shareText = (title: string, description: string, source: string) => {
    const text = `${title}\n\n${description}\n\n${source}`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      copyText(text);
    }
  };

  const saveItem = (title: string, description: string, source: string, catLabel: string) => {
    const id = `${title}-${Date.now()}`;
    const exists = saved.some(s => s.title === title && s.from === catLabel);
    if (exists) {
      toast.info(dir === 'rtl' ? 'محفوظ مسبقاً' : 'Already saved');
      return;
    }
    setSaved(prev => [...prev, { id, title, description, source, from: catLabel, savedAt: new Date().toLocaleDateString(dir === 'rtl' ? 'ar' : 'de') }]);
    toast.success(dir === 'rtl' ? 'تم الحفظ في الحافظة' : 'Saved to clipboard');
  };

  const removeItem = (id: string) => {
    setSaved(prev => prev.filter(s => s.id !== id));
    toast.success(dir === 'rtl' ? 'تم الحذف' : 'Removed');
  };

  const isSaved = (title: string, catLabel: string) => saved.some(s => s.title === title && s.from === catLabel);

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
          <h1 className="text-lg font-bold text-foreground">{t('timed.title')}</h1>
          <button
            onClick={() => setShowClipboard(true)}
            className="relative w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center"
          >
            <ClipboardList className="w-5 h-5 text-foreground" />
            {saved.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {saved.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="flex flex-col gap-2 p-4">
        {categories.map((cat) => {
          const data = sunnahDetailData[cat.id];
          const isCatOpen = openCatId === cat.id;
          const count = data?.items?.length || 0;
          const catLabel = t(cat.labelKey);

          return (
            <div key={cat.id} className="rounded-2xl bg-card/80 border border-border/40 overflow-hidden">
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/20"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.accent}18` }}
                >
                  <cat.icon className="w-5 h-5" style={{ color: cat.accent }} />
                </div>
                <div className="flex-1 text-start">
                  <span className="text-sm font-bold text-foreground">{catLabel}</span>
                  <span className="text-xs text-muted-foreground mx-2">
                    {count} {t('timed.sunnah')}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isCatOpen && data && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/30 px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {data.items.map((item, i) => {
                          const itemKey = `${cat.id}-${i}`;
                          const isItemOpen = openItemKey === itemKey;
                          const isDetailed = data.type === 'detailed' && 'description' in item;
                          const desc = 'description' in item ? (item as any).description : '';
                          const src = 'source' in item ? (item as any).source : '';

                          return (
                            <div key={i} className="rounded-xl overflow-hidden">
                              <button
                                onClick={() => isDetailed ? toggleItem(itemKey) : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-start ${isDetailed ? 'hover:bg-accent/20 cursor-pointer' : ''}`}
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
                                {isDetailed && (
                                  <ChevronDown
                                    className={`w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ${isItemOpen ? 'rotate-180' : ''}`}
                                  />
                                )}
                              </button>

                              <AnimatePresence initial={false}>
                                {isItemOpen && isDetailed && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3 mr-9 ml-9">
                                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                        {desc}
                                      </p>

                                      <div className="flex items-center gap-1.5 mb-3">
                                        <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: cat.accent }} />
                                        <span className="text-xs font-medium" style={{ color: cat.accent }}>
                                          {src}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                          onClick={() => copyText(`${item.title}\n${desc}\n${src}`)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                        >
                                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">{dir === 'rtl' ? 'نسخ' : 'Copy'}</span>
                                        </button>
                                        <button
                                          onClick={() => shareText(item.title, desc, src)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                        >
                                          <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">{dir === 'rtl' ? 'مشاركة' : 'Share'}</span>
                                        </button>
                                        <button
                                          onClick={() => saveItem(item.title, desc, src, catLabel)}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isSaved(item.title, catLabel) ? 'bg-primary/20' : 'bg-accent/30 hover:bg-accent/50'}`}
                                        >
                                          <Bookmark className={`w-3.5 h-3.5 ${isSaved(item.title, catLabel) ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                                          <span className={`text-xs ${isSaved(item.title, catLabel) ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {dir === 'rtl' ? 'حفظ' : 'Save'}
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

      {/* Clipboard Drawer */}
      <AnimatePresence>
        {showClipboard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowClipboard(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-3xl bg-background border-t border-border/40 flex flex-col"
            >
              {/* Drawer Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                <h2 className="text-base font-bold text-foreground">
                  {dir === 'rtl' ? 'الحافظة' : 'Clipboard'}
                </h2>
                <button onClick={() => setShowClipboard(false)} className="w-8 h-8 rounded-full bg-card/80 flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {saved.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {dir === 'rtl' ? 'لا توجد عناصر محفوظة' : 'No saved items'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {saved.map((s) => (
                      <div key={s.id} className="rounded-xl bg-card/80 border border-border/40 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground leading-relaxed mb-1">{s.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{s.description}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {s.source}
                              </span>
                              <span className="text-[11px] text-muted-foreground/60">
                                {dir === 'rtl' ? 'من:' : 'From:'} {s.from}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(s.id)}
                            className="shrink-0 w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
