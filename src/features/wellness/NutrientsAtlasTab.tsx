import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, BookOpen, AlertCircle } from 'lucide-react';
import { nutrientsAtlas, atlasDisclaimer, type AtlasCategory } from '@/data/nutrientsAtlas';

export default function NutrientsAtlasTab() {
  const [query, setQuery] = useState('');
  const [openCat, setOpenCat] = useState<string | null>(nutrientsAtlas[0]?.id ?? null);
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({});

  const filtered = useMemo<AtlasCategory[]>(() => {
    const q = query.trim();
    if (!q) return nutrientsAtlas;
    return nutrientsAtlas
      .map((cat) => ({
        ...cat,
        sections: cat.sections
          .map((sec) => ({
            ...sec,
            items: sec.items.filter(
              (it) => it.name.includes(q) || it.desc.includes(q),
            ),
          }))
          .filter((s) => s.items.length > 0),
      }))
      .filter((c) => c.sections.length > 0);
  }, [query]);

  return (
    <div className="space-y-3">
      {/* Intro */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-foreground leading-tight">
            الأطلس البيوكيميائي للمغذيات
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            مرجع علمي شامل للفيتامينات، المعادن، الأحماض، والإنزيمات الحيوية ووظائفها الاستقلابية الدقيقة.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن عنصر..."
          className="w-full ps-9 pe-3 py-3 rounded-2xl bg-card border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 transition-colors"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-card border border-border/40 p-6 text-center">
            <p className="text-[13px] text-muted-foreground">لا توجد نتائج للبحث</p>
          </div>
        )}
        {filtered.map((cat) => {
          const isOpen = openCat === cat.id || !!query;
          return (
            <div key={cat.id} className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <button
                onClick={() => setOpenCat(isOpen && !query ? null : cat.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 active:scale-[0.99] transition-transform"
              >
                <div className="text-start">
                  <h3 className="text-[14px] font-bold text-foreground leading-tight">{cat.title}</h3>
                  {cat.subtitle && (
                    <p className="text-[10px] text-muted-foreground mt-0.5" dir="ltr">{cat.subtitle}</p>
                  )}
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-5 h-5 text-muted-foreground/60" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2">
                      {cat.sections.map((sec) => {
                        const key = `${cat.id}:${sec.id}`;
                        const secOpen = !!openSec[key] || !!query;
                        return (
                          <div key={sec.id} className="rounded-xl bg-background/40 border border-border/30">
                            <button
                              onClick={() => setOpenSec((s) => ({ ...s, [key]: !s[key] }))}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2.5"
                            >
                              <span className="text-[12.5px] font-semibold text-foreground/90 text-start">
                                {sec.title}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                                  {sec.items.length}
                                </span>
                                <motion.div animate={{ rotate: secOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                  <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
                                </motion.div>
                              </span>
                            </button>
                            <AnimatePresence initial={false}>
                              {secOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 space-y-2.5">
                                    {sec.items.map((it, i) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2.5 pt-2.5 border-t border-border/20 first:border-t-0 first:pt-1"
                                      >
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <h4 className="text-[12.5px] font-bold text-foreground leading-snug">
                                            {it.name}
                                          </h4>
                                          <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">
                                            {it.desc}
                                          </p>
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-3.5 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{atlasDisclaimer}</p>
      </div>
    </div>
  );
}