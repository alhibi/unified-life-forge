/**
 * HydrationLog — Live fluid tracking integrated with Supabase hydration logs.
 * Renders a highly polished wavy liquid animation indicating hydration levels.
 */
import { motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Calendar, Droplet, Plus, Trash2 } from '@/lib/icons';

import {
  deleteHydration,
  type HydrationEvent,
  listHydration,
  logHydration,
  todayIso,
} from '../../wellnessDb';
import type { Lang } from '../types';

interface Props {
  lang: Lang;
}

const T = {
  title: { ar: 'مؤشر الترطيب والماء', de: 'Hydration & Wasser' },
  target: { ar: 'الهدف اليومي: 3 لترات (3000 مل)', de: 'Tagesziel: 3 Liter (3000 ml)' },
  addWater: { ar: 'إضافة ماء', de: 'Wasser hinzufügen' },
  quickLog: { ar: 'تسجيل كوب', de: 'Schnell-Log' },
  ml: { ar: 'مل', de: 'ml' },
  logHistory: { ar: 'سجل ترطيب اليوم', de: 'Hydrations-Verlauf' },
  nothing: { ar: 'لم تسجل أي سوائل اليوم بعد', de: 'Noch keine Hydration erfasst' },
};

const AMOUNTS = [250, 500, 750];

export default function HydrationLog({ lang }: Props) {
  const isAr = lang === 'ar';
  const [logs, setLogs] = useState<HydrationEvent[]>([]);

  const fetchLogs = async () => {
    try {
      const all = await listHydration();
      const today = todayIso();
      setLogs(all.filter((l) => l.date === today));
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalMl = useMemo(() => {
    return logs.reduce((sum, l) => sum + l.amountMl, 0);
  }, [logs]);

  const targetMl = 3000;
  const pct = Math.min(1, totalMl / targetMl);

  const handleAdd = async (amount: number) => {
    try {
      const e = await logHydration(amount);
      setLogs((prev) => [e, ...prev]);
      toast.success(`${amount} ${T.ml[lang]} ${isAr ? 'تم تسجيلها!' : 'erfasst!'}`);
    } catch {
      toast.error(isAr ? 'فشل التسجيل' : 'Fehler beim Loggen');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteHydration(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Wave container */}
      <div className="rounded-2xl p-4 bg-card border border-border/40 relative overflow-hidden flex flex-col md:flex-row items-center gap-4">
        {/* Wavy liquid shape */}
        <div className="w-32 h-32 rounded-full border-4 border-blue-500/20 bg-blue-500/5 relative overflow-hidden shrink-0 flex items-center justify-center">
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-blue-500/30"
            initial={{ height: 0 }}
            animate={{ height: `${pct * 100}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 80 }}
          />
          <div className="relative text-center z-10">
            <span className="text-xl font-bold text-foreground tabular-nums block">{totalMl}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {T.ml[lang]}
            </span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-start space-y-1">
          <h4 className="text-sm font-bold text-foreground flex items-center justify-center md:justify-start gap-1.5">
            <Droplet className="w-4 h-4 text-blue-500" />
            {T.title[lang]}
          </h4>
          <p className="text-[11px] text-muted-foreground">{T.target[lang]}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-2">
            {AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => handleAdd(amt)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10 text-[10px] font-bold active:scale-95 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>
                  {amt} {T.ml[lang]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log list */}
      <div className="rounded-2xl border border-border/30 bg-card p-3.5 space-y-2">
        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {T.logHistory[lang]}
        </h5>
        {logs.length === 0 ? (
          <p className="text-center py-4 text-xs text-muted-foreground">{T.nothing[lang]}</p>
        ) : (
          <div className="divide-y divide-border/20 max-h-40 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold text-foreground tabular-nums">
                    {log.amountMl} {T.ml[lang]}
                  </span>
                  <span className="text-muted-foreground/60">
                    (
                    {new Date(log.ts).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    )
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(log.id)}
                  className="p-1 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded active:scale-90 transition-transform"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
