/**
 * FastingLog — Intermittent fasting tracker integrated with Supabase fasting records.
 * Displays live ticker, metabolic phase, and scientific cellular feedback in real time.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Activity, Check, Clock, Flame, Play, Square } from '@/lib/icons';

import {
  endFasting,
  type FastingSession,
  getActiveFasting,
  listFasting,
  startFasting,
} from '../../wellnessDb';
import type { Lang } from '../types';

interface Props {
  lang: Lang;
}

const T = {
  title: { ar: 'سجل الصيام المتقطع', },
  protocol: { ar: 'بروتوكول الصيام', },
  start: { ar: 'ابدأ الصيام الآن', },
  end: { ar: 'إنهاء الصيام وتسجيله', },
  activeTitle: { ar: 'أنت في حالة صيام حالياً', },
  hoursFasted: { ar: 'ساعات الصيام', },
  cellularState: {
    ar: 'الحالة الخلوية والبيولوجية الحالية:',
  },
  recentFasts: { ar: 'سجل الصيام الأخير', },
  duration: { ar: 'المدة', },
  hours: { ar: 'ساعة', },
  emptyHistory: { ar: 'لا توجد جلسات صيام مسجلة', },
};

const PROTOCOLS = [
  {
    name: '16:8',
    hours: 16,
    ar: '16 ساعة صيام / 8 ساعات تناول طعام',
  },
  {
    name: '18:6',
    hours: 18,
    ar: '18 ساعة صيام / 6 ساعات تناول طعام',
  },
  {
    name: '20:4',
    hours: 20,
    ar: '20 ساعة صيام / 4 ساعات تناول طعام',
  },
];

export default function FastingLog({ lang }: Props) {
  const [activeSession, setActiveSession] = useState<FastingSession | null>(null);
  const [history, setHistory] = useState<FastingSession[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState(PROTOCOLS[0]);
  const [timeElapsed, setTimeElapsed] = useState(0); // in seconds

  const fetchFastingData = async () => {
    try {
      const active = await getActiveFasting();
      setActiveSession(active);
      const all = await listFasting();
      setHistory(all.filter((f) => f.endedAt).slice(0, 5));
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    fetchFastingData();
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStart = async () => {
    try {
      const s = await startFasting(selectedProtocol.hours, selectedProtocol.name);
      setActiveSession(s);
      toast.success('بدأ الصيام! تمنياتنا بصحة وعافية.');
    } catch {
      toast.error('فشل بدء الجلسة');
    }
  };

  const handleEnd = async () => {
    if (!activeSession) return;
    try {
      await endFasting(activeSession.id);
      setActiveSession(null);
      setTimeElapsed(0);
      fetchFastingData();
      toast.success('تم تسجيل جلسة الصيام بنجاح!');
    } catch {
      toast.error('فشل إنهاء الجلسة');
    }
  };

  const elapsedHours = timeElapsed / 3600;

  // Scientific cellular phase based on hours fasted
  const metabolicPhase = useMemo(() => {
    if (!activeSession) return null;
    const h = elapsedHours;
    if (h < 4) {
      return {
        title: { ar: 'مرحلة الهضم (Anabolic Phase)', },
        desc: {
          ar: 'يقوم الجسم حالياً بهضم آخر وجبة وامتصاص المغذيات، ومستويات الأنسولين مرتفعة والسكريات تمد الخلايا بالطاقة.',
        },
        progress: h / 4,
      };
    } else if (h < 12) {
      return {
        title: { ar: 'نفاد الجليكوجين (Glycogen Depletion)', },
        desc: {
          ar: 'انخفضت مستويات الأنسولين وبدأ الجسم في استخدام مخازن جليكوجين الكبد لإنتاج الطاقة المعتادة.',
        },
        progress: (h - 4) / 8,
      };
    } else if (h < 16) {
      return {
        title: { ar: 'بدء حرق الدهون (Ketosis Initiation)', },
        desc: {
          ar: 'بدأت خلايا الكبد في إنتاج الكيتونات من أكسدة الأحماض الدهنية كوقود ممتاز للدماغ والعضلات.',
        },
        progress: (h - 12) / 4,
      };
    } else {
      return {
        title: {
          ar: 'الالتهام الذاتي والترميم (Autophagy & Growth)',
        },
        desc: {
          ar: 'بدأت الخلايا في تفعيل الالتهام الذاتي (Autophagy) لإعادة تدوير المكونات التالفة والبروتينات الهرمة لشباب متجدد.',
        },
        progress: Math.min(1, (h - 16) / 8),
      };
    }
  }, [activeSession, elapsedHours]);

  const formatTicker = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4" dir={'rtl'}>
      {/* Active fast block */}
      {activeSession ? (
        <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {T.activeTitle[lang]} ({activeSession.protocol})
            </span>
            <button
              onClick={handleEnd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive text-white hover:bg-destructive/90 text-[0.625rem] font-bold active:scale-95 transition-all"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>{T.end[lang]}</span>
            </button>
          </div>

          <div className="text-center py-2">
            <p className="text-[0.625rem] text-muted-foreground uppercase font-bold tracking-wider mb-1">
              {T.hoursFasted[lang]}
            </p>
            <h3 className="text-3xl font-extrabold text-foreground tabular-nums leading-none">
              {formatTicker(timeElapsed)}
            </h3>
          </div>

          {/* Metabolic feedback */}
          {metabolicPhase && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-2 border border-border/20 text-[0.6875rem]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  {metabolicPhase.title[lang]}
                </span>
                <span className="text-[0.625rem] font-bold text-muted-foreground/80">
                  {Math.round(metabolicPhase.progress * 100)}%
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[0.625rem]">
                {metabolicPhase.desc[lang]}
              </p>
              <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${metabolicPhase.progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-4 bg-card border border-border/40 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              {T.title[lang]}
            </h4>
            <p className="text-[0.6875rem] text-muted-foreground">{T.protocol[lang]}</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PROTOCOLS.map((proto) => {
              const active = selectedProtocol.name === proto.name;
              return (
                <button
                  key={proto.name}
                  onClick={() => setSelectedProtocol(proto)}
                  className={`px-3 py-2 rounded-xl border text-[0.6875rem] font-bold text-center transition-all ${
                    active
                      ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-muted/30 border-border/30 text-muted-foreground'
                  }`}
                >
                  <p className="text-xs">{proto.name}</p>
                  <p className="text-[0.625rem] font-normal mt-0.5 opacity-80">
                    {proto.hours} {T.hours[lang]}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs active:scale-98 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{T.start[lang]}</span>
          </button>
        </div>
      )}

      {/* History */}
      <div className="rounded-2xl border border-border/30 bg-card p-3.5 space-y-2">
        <h5 className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-primary" />
          {T.recentFasts[lang]}
        </h5>
        {history.length === 0 ? (
          <p className="text-center py-4 text-xs text-muted-foreground">{T.emptyHistory[lang]}</p>
        ) : (
          <div className="divide-y divide-border/20 max-h-40 overflow-y-auto">
            {history.map((log) => {
              const durationHours = log.endedAt
                ? ((log.endedAt - log.startedAt) / 3600000).toFixed(1)
                : '—';
              return (
                <div key={log.id} className="flex items-center justify-between py-2 text-[0.6875rem]">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="font-bold text-foreground">{log.protocol || 'Custom'}</span>
                    <span className="text-muted-foreground/60">
                      (
                      {new Date(log.startedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                      )
                    </span>
                  </div>
                  <span className="font-bold text-foreground tabular-nums">
                    {durationHours} {T.hours[lang]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
