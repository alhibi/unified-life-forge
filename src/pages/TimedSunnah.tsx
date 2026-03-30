import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronDown, Moon, Sun, CloudSun, Cloud, Calendar, Copy, Bookmark, BookOpen, Share2 } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, dir } = useApp();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>(getSavedItems);
  const [sharedContent, setSharedContent] = useState<{ title: string; description: string; source: string } | null>(null);

  useEffect(() => { saveItems(saved); }, [saved]);

  useEffect(() => {
    const shareParam = searchParams.get('share');
    if (shareParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(shareParam)))));
        setSharedContent(decoded);
        setSearchParams({}, { replace: true });
      } catch (e) {
        console.error('Invalid share link');
      }
    }
  }, []);

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

  const shareText = async (title: string, description: string, source: string) => {
    const text = `${title}\n\n${description}\n\n${source}`;
    const shareData = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ title, description, source })))));
    const shareUrl = `${window.location.origin}/timed-sunnah?share=${shareData}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (err) {
        navigator.clipboard.writeText(shareUrl);
        toast.success(dir === 'rtl' ? 'تم نسخ الرابط' : 'Link copied');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(dir === 'rtl' ? 'تم نسخ الرابط' : 'Link copied');
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
          <div className="w-10" />
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

      {/* Shared Content Modal */}
      <AnimatePresence>
        {sharedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSharedContent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-6 space-y-4"
              dir="rtl"
            >
              <div className="h-1 w-16 mx-auto rounded-full bg-[#4CAF50]" />
              <h3 className="text-xl font-bold text-foreground text-center">{sharedContent.title}</h3>
              <p className="text-foreground/80 text-center leading-relaxed">{sharedContent.description}</p>
              <div className="flex items-center justify-end gap-2 bg-[#4CAF50]/10 rounded-xl px-4 py-2.5">
                <span className="text-sm text-[#4CAF50] font-medium">{sharedContent.source}</span>
                <BookOpen className="w-4 h-4 text-[#4CAF50]" />
              </div>
              <button
                onClick={() => setSharedContent(null)}
                className="w-full py-2.5 rounded-xl bg-primary/20 text-primary font-medium"
              >
                إغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
