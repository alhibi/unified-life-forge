import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Calendar as CalIcon, Search } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FOOD_LIST, FOODS, type Lang } from './wellnessData';
import type { DietLog, UUID } from './wellnessDb';
import { todayIso } from './wellnessDb';
import { CATEGORY_META, categoryOf, type FoodCategory } from './foodCategories';
import { FoodIcon } from './foodIcons';
import AppDatePicker from './AppDatePicker';

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
  const [activeCat, setActiveCat] = useState<FoodCategory | 'all'>('all');

  const logsForDay = useMemo(
    () => dietLogs.filter((d) => d.date === date),
    [dietLogs, date],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOOD_LIST.filter((f) => {
      if (q) {
        const match =
          f.label.ar.toLowerCase().includes(q) ||
          f.label.de.toLowerCase().includes(q) ||
          f.key.includes(q);
        if (!match) return false;
      }
      if (activeCat !== 'all' && categoryOf(f.key) !== activeCat) return false;
      return true;
    });
  }, [query, activeCat]);

  // Group by category, ordered by CATEGORY_META.order
  const grouped = useMemo(() => {
    const map = new Map<FoodCategory, typeof FOOD_LIST>();
    for (const f of filtered) {
      const c = categoryOf(f.key);
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(f);
    }
    return Array.from(map.entries()).sort(
      (a, b) => CATEGORY_META[a[0]].order - CATEGORY_META[b[0]].order,
    );
  }, [filtered]);

  const categoryList = useMemo(
    () =>
      (Object.keys(CATEGORY_META) as FoodCategory[]).sort(
        (a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order,
      ),
    [],
  );

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
          <AppDatePicker value={date} onChange={setDate} />
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
              const isCustom = log.foodKey.startsWith('custom:');
              const label = food?.label[lang] ?? (isCustom ? log.foodKey.slice(7) : log.foodKey);
              const cat = food ? categoryOf(log.foodKey) : 'vegetable';
              const meta = CATEGORY_META[cat];
              return (
                <div key={log.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FoodIcon foodKey={log.foodKey} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {meta.label[lang]}
                      </p>
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
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          {isAr ? 'أضف طعاماً' : 'Essen hinzufügen'}
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن طعام...' : 'Essen suchen...'}
            className="w-full bg-card border border-border/40 rounded-xl ps-9 pe-3 py-2.5 text-base text-foreground outline-none focus:border-primary/50"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setActiveCat('all')}
            className={`shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
              activeCat === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border/40'
            }`}
          >
            {isAr ? 'الكل' : 'Alle'}
          </button>
          {categoryList.map((c) => {
            const meta = CATEGORY_META[c];
            const Icon = meta.icon;
            const active = activeCat === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                  active
                    ? `${meta.bg} ${meta.color} border-current`
                    : 'bg-card text-muted-foreground border-border/40'
                }`}
              >
                <Icon className={`w-3 h-3 ${active ? '' : meta.color}`} strokeWidth={2.2} />
                {meta.label[lang]}
              </button>
            );
          })}
        </div>

        {/* Grouped grid */}
        {grouped.length === 0 ? (
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isAr ? 'لا نتائج' : 'Keine Treffer'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {grouped.map(([cat, foods]) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} strokeWidth={2.2} />
                    </div>
                    <h4 className="text-[12px] font-bold text-foreground">{meta.label[lang]}</h4>
                    <span className="text-[10px] text-muted-foreground">({foods.length})</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {foods.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => onAdd(date, f.key)}
                        className="bg-card border border-border/40 rounded-xl p-2.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform hover:border-primary/40"
                      >
                        <FoodIcon foodKey={f.key} size={36} />
                        <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                          {f.label[lang]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {query.trim() && (
          <button
            onClick={() => {
              onAdd(date, `custom:${query.trim()}`);
              setQuery('');
            }}
            className="w-full bg-primary/10 border border-primary/40 rounded-xl p-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-[12px] font-semibold text-primary">
              + {isAr ? `أضف "${query.trim()}" كمخصص` : `"${query.trim()}" als eigenes Essen`}
            </span>
          </button>
        )}
      </motion.div>
    </div>
  );
}
