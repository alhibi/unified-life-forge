import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Gauge, Zap, RotateCcw, Info, Activity, Waves, Sparkles } from '@/lib/icons';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import BackButton from '@/components/BackButton';
import { pageStagger as stagger, pageItem as item, motionWeight, MOTION } from '@/lib/motion';
import { measureDisplayHz } from '@/lib/motionRuntime';
import SEO from '@/components/SEO';
import type { FpsCap } from '@/contexts/AppContext';

/**
 * /settings/motion
 *
 * Real (not cosmetic) control over the app's motion system.
 *
 *  • Speed slider mutates the central MOTION/motionWeight/DURATION
 *    baselines through `applyMotionSpeed` — every new framer-motion
 *    transition immediately picks up the new duration.
 *
 *  • FPS cap wraps `window.requestAnimationFrame` globally — every
 *    rAF-driven animation (springs, qibla compass, live ribbon,
 *    typing dots, page transitions) is throttled in lockstep.
 *
 * A live preview row at the top animates continuously so the change
 * is felt the instant the slider/segment moves, not just on the next
 * navigation.
 */

const SPEED_PRESETS: { value: number; labelAr: string; labelDe: string }[] = [
  { value: 0.5, labelAr: 'هادئ',     labelDe: 'Ruhig'   },
  { value: 0.75, labelAr: 'لطيف',    labelDe: 'Sanft'   },
  { value: 1,    labelAr: 'افتراضي', labelDe: 'Standard' },
  { value: 1.25, labelAr: 'سريع',    labelDe: 'Schnell' },
  { value: 1.5,  labelAr: 'فوري',    labelDe: 'Sofort'  },
];

const FPS_OPTIONS: { value: FpsCap; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 60,    label: '60 Hz' },
  { value: 90,    label: '90 Hz' },
  { value: 120,   label: '120 Hz' },
];

function LivePreview({ speedKey, fpsKey }: { speedKey: number; fpsKey: FpsCap }) {
  // Remount on each change so the user feels the new timing immediately.
  return (
    <div className="relative h-24 rounded-2xl bg-card border border-border/40 overflow-hidden">
      <motion.div
        key={`${speedKey}-${fpsKey}`}
        className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 rounded-full bg-primary shadow-lg"
        animate={{ x: [0, 230, 0] }}
        transition={{
          ...MOTION.spring,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono tabular-nums text-muted-foreground/70">
        spring · k={(MOTION.spring as any).stiffness?.toFixed?.(0)} · c={(MOTION.spring as any).damping?.toFixed?.(1)}
      </div>
    </div>
  );
}

/**
 * Live performance HUD — measures the SAME wrapped rAF the rest of the
 * app uses, so the numbers reflect the user's actual experience.
 *
 *   • fps        — frames delivered in the last second
 *   • frame ms   — exponential moving average of inter-frame delta
 *   • p95 ms     — 95th-percentile frame time over a rolling 120-frame window
 *   • drops      — frames missed vs the budget (cap ?? native) in last second
 *   • jank       — lifetime count of frames > 1.5 × budget
 *   • longtask   — PerformanceObserver long-task count (>50ms blocking)
 *   • heap       — performance.memory.usedJSHeapSize (Chromium)
 */
interface PerfStats {
  fps: number;
  frameAvg: number;
  framep95: number;
  drops: number;
  jank: number;
  longTasks: number;
  heapMB: number | null;
  budget: number;
}

function usePerfStats(budgetHz: number): PerfStats {
  const [stats, setStats] = useState<PerfStats>({
    fps: 0, frameAvg: 0, framep95: 0, drops: 0, jank: 0, longTasks: 0, heapMB: null, budget: 1000 / budgetHz,
  });
  const budgetRef = useRef(1000 / budgetHz);
  useEffect(() => { budgetRef.current = 1000 / budgetHz; }, [budgetHz]);

  useEffect(() => {
    let raf = 0;
    let stopped = false;
    let last = performance.now();
    let avg = 0;                                // EMA frame time
    let frames = 0;
    let windowStart = last;
    let jankLifetime = 0;
    let longTasks = 0;
    const samples: number[] = [];               // rolling for p95

    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => { longTasks += list.getEntries().length; });
      po.observe({ entryTypes: ['longtask'] });
    } catch { /* unsupported (Safari) */ }

    const tick = (ts: number) => {
      if (stopped) return;
      const dt = ts - last;
      last = ts;
      frames++;
      avg = avg === 0 ? dt : avg * 0.9 + dt * 0.1;
      samples.push(dt);
      if (samples.length > 120) samples.shift();
      const budget = budgetRef.current;
      if (dt > budget * 1.5) jankLifetime++;

      if (ts - windowStart >= 1000) {
        const fps = Math.round((frames * 1000) / (ts - windowStart));
        const expected = Math.round((ts - windowStart) / budget);
        const drops = Math.max(0, expected - frames);
        const sorted = [...samples].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;
        // perf.memory is Chromium-only and non-standard.
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        setStats({
          fps,
          frameAvg: avg,
          framep95: p95,
          drops,
          jank: jankLifetime,
          longTasks,
          heapMB: mem ? mem.usedJSHeapSize / 1024 / 1024 : null,
          budget,
        });
        windowStart = ts;
        frames = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      po?.disconnect();
    };
  }, []);

  return stats;
}

function PerfHUD({ isAr, budgetHz }: { isAr: boolean; budgetHz: number }) {
  const s = usePerfStats(budgetHz);
  const fpsColor =
    s.fps >= budgetHz - 5 ? 'text-emerald-500'
    : s.fps >= budgetHz - 15 ? 'text-amber-500'
    : 'text-rose-500';

  const Cell = ({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) => (
    <div className="rounded-xl bg-muted/30 border border-border/30 px-3 py-2.5">
      <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">{label}</p>
      <p className="text-[18px] font-bold tabular-nums leading-tight mt-0.5 text-foreground">
        {value}<span className="text-[11px] font-normal text-muted-foreground ms-0.5">{unit}</span>
      </p>
      {hint && <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          {isAr ? 'مقاييس الأداء الحيّة' : 'Live Performance'}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${fpsColor} animate-pulse`} />
          <span className={fpsColor}>{s.fps} / {budgetHz} Hz</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="FPS"        value={String(s.fps)}                   unit="hz"  hint={`target ${budgetHz}`} />
        <Cell label={isAr ? 'إطار' : 'frame'}  value={s.frameAvg.toFixed(1)} unit="ms" hint={`p95 ${s.framep95.toFixed(1)}`} />
        <Cell label={isAr ? 'سقوط' : 'drops'}   value={String(s.drops)}     unit="/s"  hint={`budget ${s.budget.toFixed(1)}ms`} />
        <Cell label={isAr ? 'تأخّر' : 'jank'}   value={String(s.jank)}      unit=""    hint={isAr ? 'مدى الجلسة' : 'session'} />
        <Cell label="long-task"  value={String(s.longTasks)}              unit=""    hint=">50ms" />
        <Cell label="heap"
              value={s.heapMB == null ? '—' : s.heapMB.toFixed(1)}
              unit={s.heapMB == null ? '' : 'MB'}
              hint={s.heapMB == null ? (isAr ? 'غير مدعوم' : 'unsupported') : 'JS'} />
      </div>
    </div>
  );
}

export default function MotionSettings() {
  const {
    language,
    motionSpeed, setMotionSpeed,
    fpsCap, setFpsCap,
    motionAmplitude, setMotionAmplitude,
    springBounce, setSpringBounce,
  } = useApp();
  const isAr = language === 'ar';
  const [nativeHz, setNativeHz] = useState<number | null>(null);

  // Detect the display's true refresh rate once on mount so we can warn
  // the user if they pick a cap above what their hardware can show.
  useEffect(() => {
    measureDisplayHz(300).then(setNativeHz);
  }, []);

  // Live-bind the slider to motionSpeed; we debounce nothing — the cost
  // is one CSS-var write + one in-place mutation per drag tick.
  const onSliderChange = (v: number[]) => {
    const next = v[0] / 100; // slider 50–150 → 0.5–1.5
    setMotionSpeed(Number(next.toFixed(2)));
  };

  const reset = () => {
    setMotionSpeed(1);
    setFpsCap('auto');
    setMotionAmplitude(1);
    setSpringBounce(0);
  };

  // Budget for the HUD — the user-chosen cap, or detected native rate.
  const budgetHz = fpsCap === 'auto' ? (nativeHz ?? 60) : fpsCap;

  return (
    <div className="min-h-screen bg-background pb-24 px-5 pt-10">
      <SEO
        title={isAr ? 'الحركة والأداء — SmartHub' : 'Bewegung & Leistung — SmartHub'}
        description={isAr ? 'تحكم بسرعة الحركة وحد الإطارات في الثانية.' : 'Animations­geschwindigkeit und Bildrate steuern.'}
        path="/settings/motion"
      />
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">

        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-[17px] font-bold tracking-tight text-foreground">
            {isAr ? 'الحركة والأداء' : 'Bewegung & Leistung'}
          </h1>
          <button
            onClick={reset}
            aria-label={isAr ? 'استعادة الافتراضي' : 'Zurücksetzen'}
            className="w-10 h-10 rounded-full flex items-center justify-center active:bg-muted/40 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Live preview */}
        <motion.div variants={item} className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
            {isAr ? 'معاينة حية' : 'Live-Vorschau'}
          </p>
          <LivePreview speedKey={motionSpeed + springBounce + motionAmplitude} fpsKey={fpsCap} />
        </motion.div>

        {/* Live performance HUD */}
        <motion.div variants={item}>
          <PerfHUD isAr={isAr} budgetHz={budgetHz} />
        </motion.div>

        {/* SPEED */}
        <motion.div variants={item} className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
            {isAr ? 'سرعة الحركة' : 'Bewegungs­geschwindigkeit'}
          </p>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Gauge className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {isAr ? 'مضاعف السرعة' : 'Geschwindig­keits­faktor'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr ? 'يطبَّق فوراً على كل انتقالات الإطار' : 'Wirkt sofort auf jeden Übergang'}
                  </p>
                </div>
              </div>
              <span className="text-[15px] font-bold tabular-nums text-primary">
                {motionSpeed.toFixed(2)}×
              </span>
            </div>

            <Slider
              value={[Math.round(motionSpeed * 100)]}
              min={50}
              max={150}
              step={5}
              onValueChange={onSliderChange}
              aria-label={isAr ? 'سرعة الحركة' : 'Geschwindigkeit'}
            />

            <div className="flex flex-wrap gap-1.5">
              {SPEED_PRESETS.map(p => {
                const active = Math.abs(motionSpeed - p.value) < 0.02;
                return (
                  <button
                    key={p.value}
                    onClick={() => setMotionSpeed(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {isAr ? p.labelAr : p.labelDe} · {p.value}×
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* FPS CAP */}
        <motion.div variants={item} className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
            {isAr ? 'حد الإطارات في الثانية' : 'Bildrate'}
          </p>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="w-[18px] h-[18px] text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-foreground">
                    {isAr ? 'الحد الأقصى' : 'Maximale Rate'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr
                      ? `شاشتك تعمل عند ~${nativeHz ?? '…'} هرتز`
                      : `Display läuft mit ~${nativeHz ?? '…'} Hz`}
                  </p>
                </div>
              </div>
              <FpsMonitor active={true} />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {FPS_OPTIONS.map(opt => {
                const active = fpsCap === opt.value;
                const exceedsNative =
                  typeof opt.value === 'number' && nativeHz != null && opt.value > nativeHz + 5;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setFpsCap(opt.value)}
                    className={`relative py-2 rounded-lg text-[12px] font-semibold tabular-nums transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {opt.label}
                    {exceedsNative && !active && (
                      <span className="absolute -top-1 -end-1 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground/80 leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                {isAr
                  ? 'الحد يُطبَّق على كل حركة في التطبيق عبر requestAnimationFrame. لا يمكن تجاوز معدل تحديث شاشتك الأصلي.'
                  : 'Die Begrenzung gilt für alle Animationen via requestAnimationFrame. Die native Bildwiederholrate kann nicht überschritten werden.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* AMPLITUDE */}
        <motion.div variants={item} className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
            {isAr ? 'شدّة الحركة' : 'Bewegungs­amplitude'}
          </p>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {isAr ? 'مسافة الانزلاق والعمق' : 'Slide-Distanz & Tiefe'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr ? 'يطال انتقالات الصفحات والـ parallax' : 'Wirkt auf Seiten­übergänge und Parallax'}
                  </p>
                </div>
              </div>
              <span className="text-[15px] font-bold tabular-nums text-primary">
                {Math.round(motionAmplitude * 100)}%
              </span>
            </div>
            <Slider
              value={[Math.round(motionAmplitude * 100)]}
              min={0}
              max={150}
              step={5}
              onValueChange={(v) => setMotionAmplitude(v[0] / 100)}
              aria-label={isAr ? 'شدّة الحركة' : 'Amplitude'}
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                { v: 0,    arA: 'بدون',     deA: 'Aus' },
                { v: 0.5,  arA: 'خفيف',     deA: 'Leicht' },
                { v: 1,    arA: 'افتراضي',  deA: 'Standard' },
                { v: 1.5,  arA: 'سينمائي',  deA: 'Kinetisch' },
              ].map(p => {
                const active = Math.abs(motionAmplitude - p.v) < 0.02;
                return (
                  <button
                    key={p.v}
                    onClick={() => setMotionAmplitude(p.v)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {isAr ? p.arA : p.deA}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* BOUNCE */}
        <motion.div variants={item} className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
            {isAr ? 'ارتداد النوابض' : 'Feder-Bounce'}
          </p>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Waves className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {isAr ? 'نسبة التخميد' : 'Dämpfungs­verhältnis'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr ? 'يطال كل الأزرار والقوائم والضغطات' : 'Wirkt auf Tasten, Sheets, Press-Feedback'}
                  </p>
                </div>
              </div>
              <span className="text-[15px] font-bold tabular-nums text-primary">
                {Math.round(springBounce * 100)}%
              </span>
            </div>
            <Slider
              value={[Math.round(springBounce * 100)]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setSpringBounce(v[0] / 100)}
              aria-label={isAr ? 'ارتداد' : 'Bounce'}
            />
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground/80 leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                {isAr
                  ? 'يُحوّل تخميد النوابض حسابياً: 0% = استقرار جاف بلا تجاوز، 100% = ارتداد واضح (ζ ≈ 0.25).'
                  : 'Berechnet die Dämpfung neu: 0% = trocken, 100% = deutliches Überschwingen (ζ ≈ 0.25).'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status footer */}
        <motion.div variants={item} className="flex items-center justify-center gap-2 pt-2 pb-4 text-[11px] text-muted-foreground/60">
          <Activity className="w-3 h-3" />
          <span className="font-mono">
            {isAr ? 'نشط' : 'Aktiv'}: {motionSpeed.toFixed(2)}× ·{' '}
            {fpsCap === 'auto' ? (isAr ? 'تلقائي' : 'auto') : `${fpsCap} Hz`} ·{' '}
            amp {Math.round(motionAmplitude * 100)}% ·{' '}
            bounce {Math.round(springBounce * 100)}%
          </span>
        </motion.div>

      </motion.div>
    </div>
  );
}
