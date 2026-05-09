import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Calendar as CalIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FOOD_LIST, FOODS, type Lang } from './wellnessData';
import type { DietLog, UUID } from './wellnessDb';
import { todayIso } from './wellnessDb';

interface Props {
  dietLogs: DietLog[];
  onAdd: (date: string, foodKey: string, portion?: number) => Promise<void>;
  onRemove: (id: UUID) => Promise<void>;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DietTab({ dietLogs, onAdd, onRemove }: Props) {
  const { language } = useApp();
  const lang = language as Lang;
  const isAr = lang === 'ar';
  const [date, setDate] = useState(todayIso());
  const [query, setQuery] = useState('');

  const logsForDay = useMemo(
    () => dietLogs.filter((d) => d.date === date),
    [dietLogs, date],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOOD_LIST;
    return FOOD_LIST.filter((f) =>
      f.label.ar.toLowerCase().includes(q) ||
      f.label.de.toLowerCase().includes(q) ||
      f.key.includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="bg-card border border-border/40 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {isAr ? 'التاريخ' : 'Datum'}
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{date}</p>
            </div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-muted/60 border border-border/40 rounded-lg px-2 py-1 text-sm text-foreground outline-none"
            dir="ltr"
          />
        </div>
      </motion.div>

      {/* Logged foods */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2">
          {isAr ? 'وجبات اليوم' : 'Mahlzeiten'}
        </p>
        {logsForDay.length === 0 ? (
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isAr ? 'لم تسجل أي طعام بعد' : 'Noch keine Mahlzeiten erfasst'}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/30">
            {logsForDay.map((log) => {
              const food = FOODS[log.foodKey];
              const label = food?.label[lang] ?? (log.foodKey.startsWith('custom:')
                ? log.foodKey.slice(7)
                : log.foodKey);
              const icon = food?.icon ?? '🍽️';
              return (
                <div key={log.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      {food && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {food.nutrients.slice(0, 3).map((n) => (
                            <span key={n} className="text-[10px] text-muted-foreground">• {n}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(log.id)}
                    className="p-2 rounded-lg bg-destructive/10 text-destructive active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Food picker */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2">
          {isAr ? 'أضف طعاماً' : 'Essen hinzufügen'}
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isAr ? 'ابحث عن طعام...' : 'Essen suchen...'}
          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 mb-2"
        />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {filtered.map((f) => (
            <button
              key={f.key}
              onClick={() => onAdd(date, f.key)}
              className="bg-card border border-border/40 rounded-xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform hover:border-primary/40"
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                {f.label[lang]}
              </span>
            </button>
          ))}
          {query.trim() && (
            <button
              onClick={() => {
                onAdd(date, `custom:${query.trim()}`);
                setQuery('');
              }}
              className="bg-primary/10 border border-primary/40 rounded-xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform col-span-3 sm:col-span-4"
            >
              <span className="text-[12px] font-semibold text-primary">
                + {isAr ? `أضف "${query.trim()}" كمخصص` : `"${query.trim()}" als eigenes Essen`}
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
