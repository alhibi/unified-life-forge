import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, BookOpen } from '@/lib/icons';
import { nutrientsAtlas } from './nutrientsAtlas';
import { useApp } from '@/contexts/AppContext';

export default function AtlasTab() {
  const { } = useApp();
  const [query, setQuery] = useState('');
  const [openCat, setOpenCat] = useState<string | null>(nutrientsAtlas[0].key);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nutrientsAtlas;
    return nutrientsAtlas
      .map((cat) => ({
        ...cat,
        groups: cat.groups
          .map((g) => ({
            ...g,
            items: g.items.filter(
              (i) => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q),
            ),
          }))
          .filter((g) => g.items.length > 0),
      }))
      .filter((c) => c.groups.length > 0);
  }, [query]);

  return (
    <div className="space-y-3" dir={'rtl'}>
      <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[12px] text-muted-foreground leading-snug">
          {'الأطلس البيوكيميائي الشامل للمغذيات الحيوية — مرجع علمي مختصر.'}
        </p>
      </div>

      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${'end-3'} w-4 h-4 text-muted-foreground`} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={'ابحث عن عنصر...'}
          className={`w-full h-11 rounded-2xl bg-card border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 transition-colors ${'pe-10 ps-3'}`}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((cat) => {
          const open = openCat === cat.key || !!query;
          const total = cat.groups.reduce((n, g) => n + g.items.length, 0);
          return (
            <div key={cat.key} className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <button
                onClick={() => setOpenCat(open && !query ? null : cat.key)}
                className="w-full px-4 py-3 flex items-center justify-between gap-2 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[14px] font-bold text-foreground">{cat.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{total}</span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      {cat.groups.map((g) => (
                        <div key={g.title} className="space-y-1.5">
                          <h4 className="text-[11px] font-semibold text-muted-foreground px-1">{g.title}</h4>
                          <div className="space-y-1.5">
                            {g.items.map((it) => {
                              const id = `${cat.key}:${it.name}`;
                              const itOpen = openItem === id;
                              return (
                                <button
                                  key={id}
                                  onClick={() => setOpenItem(itOpen ? null : id)}
                                  className="w-full text-start rounded-xl bg-accent/30 hover:bg-accent/50 border border-border/30 p-3 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-semibold text-foreground leading-tight">
                                      {it.name}
                                    </span>
                                    <motion.span animate={{ rotate: itOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    </motion.span>
                                  </div>
                                  <AnimatePresence initial={false}>
                                    {itOpen && (
                                      <motion.p
                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                        animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden text-[12px] text-muted-foreground leading-relaxed"
                                      >
                                        {it.desc}
                                      </motion.p>
                                    )}
                                  </AnimatePresence>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-card border border-border/40 p-6 text-center text-[13px] text-muted-foreground">
            {'لا توجد نتائج'}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/70 leading-relaxed text-center px-2 pt-2">
        {'تنبيه: المعلومات مرجع بيوكيميائي فقط، استشر مختصاً قبل أي بروتوكول علاجي.'}
      </p>
    </div>
  );
}
