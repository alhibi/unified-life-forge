import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, IconChip, PageShell } from '@/components/ui/app-shell';
import { untimedSunnahData } from '@/data/untimedSunnahData';
import { BookOpen, ChevronDown, Copy, Droplet, Shirt, Star, User, Users, UtensilsCrossed, Volume2 } from '@/lib/icons';
import { notify } from '@/lib/notify';

type IconComponent = typeof Star;

const iconMap: Record<string, IconComponent> = {
  volume: Volume2,
  droplet: Droplet,
  user: User,
  star: Star,
  users: Users,
  utensils: UtensilsCrossed,
  shirt: Shirt,
};

export default function UntimedSunnah() {
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);

  const toggleCat = (id: string) => {
    setOpenCatId(prev => prev === id ? null : id);
    setOpenItemKey(null);
  };

  const toggleItem = (key: string) => setOpenItemKey(prev => prev === key ? null : key);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    notify.copied();
  };

  const categories = Object.entries(untimedSunnahData);
  const totalSunnah = categories.reduce((sum, [, cat]) => sum + cat.items.length, 0);

  return (
    <PageShell
      header={
        <PageHeader
          variant="display"
          title="السنن غير الموقوتة"
          subtitle={
            String(categories.length) +
            ' فئات · ' +
            String(totalSunnah) +
            ' سنة عامة في اليوم'
          }
          backFallback="/sunnah"
        />
      }
    >
      <SEO title="السنن غير المؤقتة — SmartHub" description="سنن نبوية عامة غير مرتبطة بوقت محدد، قابلة للحفظ في الحافظة." path="/section/untimed-sunnah" />

      {/* Accordion List */}
      <div className="flex flex-col gap-2">
          {categories.map(([id, cat]) => {
            const Icon = iconMap[cat.icon] || Star;
            const isCatOpen = openCatId === id;

            return (
              <AppCard key={id} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => toggleCat(id)}
                  aria-expanded={isCatOpen}
                  className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/20 app-focus-ring"
                >
                  <IconChip aria-hidden>
                    <Icon className="h-5 w-5" />
                  </IconChip>
                  <div className="flex-1 text-start">
                    <span className="text-meta font-bold text-foreground">{cat.label}</span>
                    <span className="text-mini text-muted-foreground mx-2">
                      {cat.count} سنة
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-fast ${isCatOpen ? 'rotate-180' : ''}`}
                    aria-hidden
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
                                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-micro font-bold shrink-0 bg-primary/15 text-primary tabular-nums">
                                    {i + 1}
                                  </span>
                                  <span className="flex-1 text-meta text-foreground leading-relaxed line-clamp-2">
                                    {item.title}
                                  </span>
                                  {hasDetail && (
                                    <ChevronDown
                                      className={`w-4 h-4 text-muted-foreground-subtle shrink-0 transition-transform duration-fast ${isItemOpen ? 'rotate-180' : ''}`}
                                      aria-hidden
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
                                      <div className="px-4 pb-3 me-9 ms-9">
                                        <p className="text-meta text-muted-foreground leading-relaxed mb-3">
                                          {item.description}
                                        </p>

                                        {item.source && (
                                          <div className="flex items-center gap-1.5 mb-3">
                                            <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden />
                                            <span className="text-mini font-medium text-primary">
                                              {item.source}
                                            </span>
                                          </div>
                                        )}

                                        <div className="flex items-center gap-2 flex-wrap">
                                          <button
                                            type="button"
                                            onClick={() => copyText(`${item.title}\n${item.description}\n${item.source || ''}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                          >
                                            <Copy className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                                            <span className="text-mini text-muted-foreground">نسخ</span>
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
              </AppCard>
            );
          })}
      </div>
    </PageShell>
  );
}
