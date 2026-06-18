import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Gauge, Zap, RotateCcw, Info, Activity } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import BackButton from '@/components/BackButton';
import { pageStagger as stagger, pageItem as item, motionWeight } from '@/lib/motion';
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
          ...motionWeight.large,
          duration: motionWeight.large.duration as number,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        }}
      />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono tabular-nums text-muted-foreground/70">
        {(motionWeight.large.duration as number * 1000).toFixed(0)}ms · loop
      </div>
    </div>
  );
}

function FpsMonitor({ active }: { active: boolean }) {
  const [hz, setHz] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let frames = 0;
    let start = performance.now();
    let stopped = false;
    const tick = (ts: number) => {
      if (stopped) return;
      frames++;
      const dt = ts - start;
      if (dt >= 500) {
        setHz(Math.round((frames * 1000) / dt));
        frames = 0;
        start = ts;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
      <span className={`w-1.5 h-1.5 rounded-full ${hz && hz > 50 ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
      <span className="text-muted-foreground">{hz ?? '…'} Hz</span>
    </div>
  );
}

export default function MotionSettings() {
  const { language, motionSpeed, setMotionSpeed, fpsCap, setFpsCap } = useApp();
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
  };

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
          <LivePreview speedKey={motionSpeed} fpsKey={fpsCap} />
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

        {/* Status footer */}
        <motion.div variants={item} className="flex items-center justify-center gap-2 pt-2 pb-4 text-[11px] text-muted-foreground/60">
          <Activity className="w-3 h-3" />
          <span className="font-mono">
            {isAr ? 'نشط' : 'Aktiv'}: {motionSpeed.toFixed(2)}× ·{' '}
            {fpsCap === 'auto' ? (isAr ? 'تلقائي' : 'auto') : `${fpsCap} Hz`}
          </span>
        </motion.div>

      </motion.div>
    </div>
  );
}
