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
  title: { ar: 'سجل الصيام المتقطع', de: 'Intervallfasten-Tracker' },
  protocol: { ar: 'بروتوكول الصيام', de: 'Fasten-Protokoll' },
  start: { ar: 'ابدأ الصيام الآن', de: 'Fasten starten' },
  end: { ar: 'إنهاء الصيام وتسجيله', de: 'Fasten beenden' },
  activeTitle: { ar: 'أنت في حالة صيام حالياً', de: 'Fastenzeit läuft' },
  hoursFasted: { ar: 'ساعات الصيام', de: 'Gefastete Stunden' },
  cellularState: {
    ar: 'الحالة الخلوية والبيولوجية الحالية:',
    de: 'Zellulärer & biologischer Zustand:',
  },
  recentFasts: { ar: 'سجل الصيام الأخير', de: 'Letzte Fasten-Sitzungen' },
  duration: { ar: 'المدة', de: 'Dauer' },
  hours: { ar: 'ساعة', de: 'Std.' },
  emptyHistory: { ar: 'لا توجد جلسات صيام مسجلة', de: 'Noch keine Fasten-Sitzungen erfasst' },
};

const PROTOCOLS = [
  {
    name: '16:8',
    hours: 16,
    ar: '16 ساعة صيام / 8 ساعات تناول طعام',
    de: '16 Std. Fasten / 8 Std. Essen',
  },
  {
    name: '18:6',
    hours: 18,
    ar: '18 ساعة صيام / 6 ساعات تناول طعام',
    de: '18 Std. Fasten / 6 Std. Essen',
  },
  {
    name: '20:4',
    hours: 20,
    ar: '20 ساعة صيام / 4 ساعات تناول طعام',
    de: '20 Std. Fasten / 4 Std. Essen',
  },
];

export default function FastingLog({ lang }: Props) {
  const isAr = lang === 'ar';
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
      toast.success(isAr ? 'بدأ الصيام! تمنياتنا بصحة وعافية.' : 'Fasten gestartet! Viel Erfolg.');
    } catch {
      toast.error(isAr ? 'فشل بدء الجلسة' : 'Fehler beim Starten');
    }
  };

  const handleEnd = async () => {
    if (!activeSession) return;
    try {
      await endFasting(activeSession.id);
      setActiveSession(null);
      setTimeElapsed(0);
      fetchFastingData();
      toast.success(isAr ? 'تم تسجيل جلسة الصيام بنجاح!' : 'Fasten-Sitzung erfolgreich beendet!');
    } catch {
      toast.error(isAr ? 'فشل إنهاء الجلسة' : 'Fehler beim Beenden');
    }
  };

  const elapsedHours = timeElapsed / 3600;

  // Scientific cellular phase based on hours fasted
  const metabolicPhase = useMemo(() => {
    if (!activeSession) return null;
    const h = elapsedHours;
    if (h < 4) {
      return {
        title: { ar: 'مرحلة الهضم (Anabolic Phase)', de: 'Anabole Phase (Verdauung)' },
        desc: {
          ar: 'يقوم الجسم حالياً بهضم آخر وجبة وامتصاص المغذيات، ومستويات الأنسولين مرتفعة والسكريات تمد الخلايا بالطاقة.',
          de: 'Der Körper verdaut die letzte Mahlzeit. Der Insulinspiegel ist erhöht, Zellen nutzen Glukose zur Energiegewinnung.',
        },
        progress: h / 4,
      };
    } else if (h < 12) {
      return {
        title: { ar: 'نفاد الجليكوجين (Glycogen Depletion)', de: 'Glykogen-Abbau' },
        desc: {
          ar: 'انخفضت مستويات الأنسولين وبدأ الجسم في استخدام مخازن جليكوجين الكبد لإنتاج الطاقة المعتادة.',
          de: 'Insulin sinkt, der Körper greift auf die Glykogenspeicher der Leber zurück, um Glukose freizusetzen.',
        },
        progress: (h - 4) / 8,
      };
    } else if (h < 16) {
      return {
        title: { ar: 'بدء حرق الدهون (Ketosis Initiation)', de: 'Ketose-Start' },
        desc: {
          ar: 'بدأت خلايا الكبد في إنتاج الكيتونات من أكسدة الأحماض الدهنية كوقود ممتاز للدماغ والعضلات.',
          de: 'Die Leber beginnt mit der Bildung von Ketonkörpern aus Fettsäuren als Premium-Brennstoff für Gehirn und Muskeln.',
        },
        progress: (h - 12) / 4,
      };
    } else {
      return {
        title: {
          ar: 'الالتهام الذاتي والترميم (Autophagy & Growth)',
          de: 'Autophagie & Zellerneuerung',
        },
        desc: {
          ar: 'بدأت الخلايا في تفعيل الالتهام الذاتي (Autophagy) لإعادة تدوير المكونات التالفة والبروتينات الهرمة لشباب متجدد.',
          de: 'Zellen aktivieren die Autophagie, um beschädigte Proteine und Organellen zu recyceln — zelluläre Verjüngung.',
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
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Active fast block */}
      {activeSession ? (
        <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-500/10 to-primary/10 border border-indigo-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {T.activeTitle[lang]} ({activeSession.protocol})
            </span>
            <button
              onClick={handleEnd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive text-white hover:bg-destructive/90 text-[10px] font-bold active:scale-95 transition-all"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>{T.end[lang]}</span>
            </button>
          </div>

          <div className="text-center py-2">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
              {T.hoursFasted[lang]}
            </p>
            <h3 className="text-3xl font-extrabold text-foreground tabular-nums leading-none">
              {formatTicker(timeElapsed)}
            </h3>
          </div>

          {/* Metabolic feedback */}
          {metabolicPhase && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-2 border border-border/20 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  {metabolicPhase.title[lang]}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground/80">
                  {Math.round(metabolicPhase.progress * 100)}%
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[10px]">
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
              <Clock className="w-4 h-4 text-indigo-500" />
              {T.title[lang]}
            </h4>
            <p className="text-[11px] text-muted-foreground">{T.protocol[lang]}</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PROTOCOLS.map((proto) => {
              const active = selectedProtocol.name === proto.name;
              return (
                <button
                  key={proto.name}
                  onClick={() => setSelectedProtocol(proto)}
                  className={`px-3 py-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                    active
                      ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-muted/30 border-border/30 text-muted-foreground'
                  }`}
                >
                  <p className="text-xs">{proto.name}</p>
                  <p className="text-[8px] font-normal mt-0.5 opacity-80">
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
        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-indigo-500" />
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
                <div key={log.id} className="flex items-center justify-between py-2 text-[11px]">
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
