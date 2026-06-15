import React, { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Moon, Sun, CloudSun, Cloud, Calendar, Copy, Bookmark, BookOpen } from '@/lib/icons';
import { sunnahDetailData } from '@/data/sunnahDetailData';
import BackButton from '@/components/BackButton';
import { useClipboard } from '@/features/clipboard/hooks/useClipboard';
import { notify } from '@/lib/notify';

export default function TimedSunnah() {
  const navigate = useNavigate();
  const { t, dir } = useApp();
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const { items: saved, addItem: addClipboardItem, isItemSaved } = useClipboard('sunnah');

  const categories = [
    { id: 'fajr', labelKey: 'timed.fajr', icon: CloudSun },
    { id: 'before-fajr', labelKey: 'timed.beforeFajr', icon: Moon },
    { id: 'dhuhr', labelKey: 'timed.dhuhr', icon: Sun },
    { id: 'duha', labelKey: 'timed.duha', icon: Sun },
    { id: 'maghrib', labelKey: 'timed.maghrib', icon: Cloud },
    { id: 'asr', labelKey: 'timed.asr', icon: CloudSun },
    { id: 'isha', labelKey: 'timed.isha', icon: Moon },
    { id: 'friday', labelKey: 'timed.friday', icon: Calendar },
  ];

  const toggleCat = (id: string) => {
    setOpenCatId(prev => prev === id ? null : id);
    setOpenItemKey(null);
  };

  const toggleItem = (key: string) => setOpenItemKey(prev => prev === key ? null : key);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    notify.copied();
  };


  const saveItem = (title: string, description: string, source: string, catLabel: string) => {
    const id = `${title}-${catLabel}`;
    if (isItemSaved(id)) {
      notify.alreadySaved();
      return;
    }
    addClipboardItem({ id, title, description, source, from: catLabel, savedAt: new Date().toISOString() });
    notify.savedToClipboard();
  };

  const isSaved = (title: string, catLabel: string) => isItemSaved(`${title}-${catLabel}`);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title="السنن المؤقتة — SmartHub" description="السنن المرتبطة بأوقات الصلاة اليومية مصنفة في تسع فئات." path="/section/timed-sunnah" />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <BackButton />
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                  <cat.icon className="w-5 h-5 text-primary" />
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
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-primary/15 text-primary">
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
                                        <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary" />
                                        <span className="text-xs font-medium text-primary">
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


    </div>
  );
}
