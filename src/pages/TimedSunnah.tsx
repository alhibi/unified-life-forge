import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronDown, Moon, Sun, CloudSun, Cloud, Calendar } from 'lucide-react';
import { sunnahDetailData } from '@/data/sunnahDetailData';

export default function TimedSunnah() {
  const navigate = useNavigate();
  const { t, dir } = useApp();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const [openId, setOpenId] = useState<string | null>(null);

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

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

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
        {categories.map((cat, idx) => {
          const data = sunnahDetailData[cat.id];
          const isOpen = openId === cat.id;
          const count = data?.items?.length || 0;

          return (
            <div key={cat.id} className="rounded-2xl bg-card/80 border border-border/40 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggle(cat.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/20"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.accent}18` }}
                >
                  <cat.icon className="w-5 h-5" style={{ color: cat.accent }} />
                </div>
                <div className="flex-1 text-start">
                  <span className="text-sm font-bold text-foreground">{t(cat.labelKey)}</span>
                  <span className="text-xs text-muted-foreground mr-2 ml-2">
                    {count} {t('timed.sunnah')}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded Content */}
              <AnimatePresence initial={false}>
                {isOpen && data && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/30 px-4 py-2">
                      {data.type === 'detailed' ? (
                        // Detailed items - navigate to card view
                        <div className="flex flex-col gap-1.5 py-1">
                          {(data.items as { title: string; description: string; source: string }[]).map((item, i) => (
                            <button
                              key={i}
                              onClick={() => navigate(`/section/timed-sunnah/${cat.id}`, { state: { startIndex: i } })}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/20 transition-colors text-start"
                            >
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                                style={{ backgroundColor: `${cat.accent}20`, color: cat.accent }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-sm text-foreground leading-relaxed line-clamp-2">{item.title}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        // Simple items
                        <div className="flex flex-col gap-1.5 py-1">
                          {(data.items as { title: string }[]).map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                            >
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                                style={{ backgroundColor: `${cat.accent}20`, color: cat.accent }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-sm text-foreground leading-relaxed">{item.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
