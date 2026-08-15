import { AnimatePresence,motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { Compass, Crosshair, Info, MapPin,Maximize2, X } from '@/lib/icons';
import { bearingToCompass,qiblaBearing } from '@/utils/prayerAstronomy';

/**
 * Live Qibla compass.
 *
 * Accuracy:
 *  - Bearing is great-circle to Makkah (qiblaBearing()).
 *  - On iOS we use `webkitCompassHeading` (true-north corrected by the OS).
 *  - On other browsers we use `deviceorientationabsolute` when present, and
 *    fall back to `deviceorientation` alpha. Both are interpreted as
 *    magnetic / device-frame north; we additionally compensate for the
 *    current screen orientation so the dial stays correct in landscape.
 *
 * Stability:
 *  - Heading samples are smoothed with a circular EMA (handles 0°/360°
 *    wrap-around so the needle never spins the wrong way through north).
 *  - We only push state updates via rAF, so the React tree re-renders at
 *    most ~60 fps even if the sensor fires faster.
 *  - Hysteresis is applied to the "aligned" state (enter at <2°, leave at
 *    >4°) to stop the success badge from flickering when the user is on
 *    the threshold.
 */

const MAKKAH = { lat: 21.4225, lng: 39.8262 } as const;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Smallest signed delta between two angles, in degrees, in (-180, 180].
function angleDelta(a: number, b: number) {
  let d = ((a - b + 540) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Quality of the heading currently being reported.
 *
 *  - `absolute`  — the reading is referenced to the Earth (iOS true heading, or
 *                  an `deviceorientationabsolute` / `event.absolute === true`
 *                  feed). This is the only rung the needle may be trusted on.
 *  - `relative`  — the browser only exposes a *relative* gyroscope frame whose
 *                  zero point is wherever the device happened to be when the
 *                  page loaded. It drifts, and pointing a Qibla needle with it
 *                  would be inventing a direction, so we surface it as
 *                  untrusted instead of silently drawing it.
 *  - `none`      — no usable reading yet.
 */
type HeadingQuality = 'absolute' | 'relative' | 'none';

function useStableDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [quality, setQuality] = useState<HeadingQuality>('none');
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [accuracy, setAccuracy] = useState<number | null>(null); // ° (lower = better)
  /** True while the device is held too steeply for the magnetometer to level. */
  const [tilted, setTilted] = useState(false);
  // Smoothing state — kept outside of React so we don't trigger re-renders
  // for every sensor sample.
  const smoothedRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  /** Set once an Earth-referenced feed is seen; relative samples are then ignored. */
  const hasAbsoluteRef = useRef(false);
  const attachRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasAPI = 'DeviceOrientationEvent' in window;
    setSupported(hasAPI);
    if (!hasAPI) return;

    const Ctor = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceOrientationEvent;
    const needsPerm = typeof Ctor?.requestPermission === 'function';

    const getScreenAngle = (): number => {
      const so = window.screen?.orientation;
      if (so && typeof so.angle === 'number') return so.angle;
      const legacy = (window as unknown as { orientation?: number }).orientation;
      if (typeof legacy === 'number') return legacy;
      return 0;
    };

    const pushSample = (raw: number, absolute: boolean, acc?: number) => {
      if (absolute) hasAbsoluteRef.current = true;
      // Once a trustworthy Earth-referenced feed exists, never mix relative
      // samples into it — that is what made the needle wander.
      else if (hasAbsoluteRef.current) return;

      setQuality(absolute ? 'absolute' : 'relative');

      // Screen-orientation correction keeps the dial correct in landscape and
      // upside-down portrait.
      const corrected = (raw + getScreenAngle() + 360) % 360;
      const prev = smoothedRef.current;
      if (prev == null) {
        smoothedRef.current = corrected;
      } else {
        // Adaptive circular EMA: follow a real turn immediately (large delta →
        // high gain) but hold rock-still when the user is only trembling.
        const d = angleDelta(corrected, prev);
        const mag = Math.abs(d);
        const alpha = mag > 40 ? 0.6 : mag > 12 ? 0.3 : 0.12;
        smoothedRef.current = (prev + alpha * d + 360) % 360;
      }
      pendingRef.current = smoothedRef.current;
      if (typeof acc === 'number') setAccuracy(acc);
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingRef.current != null) setHeading(pendingRef.current);
        });
      }
    };

    const handler = (e: DeviceOrientationEvent) => {
      // Held near-vertical (portrait "selfie" tilt) the magnetometer's level
      // projection collapses; tell the user to lay the phone flat instead of
      // showing them a confident wrong bearing.
      if (typeof e.beta === 'number' && typeof e.gamma === 'number') {
        setTilted(Math.abs(e.beta) > 60 || Math.abs(e.gamma) > 60);
      }

      // iOS: webkitCompassHeading is a true-north heading, already corrected
      // for magnetic declination by the OS.
      const wk = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof wk === 'number' && !Number.isNaN(wk)) {
        const acc = (e as DeviceOrientationEvent & { webkitCompassAccuracy?: number }).webkitCompassAccuracy;
        pushSample(wk, true, typeof acc === 'number' && acc >= 0 ? acc : undefined);
        return;
      }
      // Standard: alpha is rotation around z, counter-clockwise from north.
      if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        const absolute = e.absolute === true || e.type === 'deviceorientationabsolute';
        pushSample((360 - e.alpha + 360) % 360, absolute);
      }
    };

    const attach = () => {
      window.addEventListener('deviceorientationabsolute', handler, true);
      window.addEventListener('deviceorientation', handler, true);
    };
    attachRef.current = attach;

    if (!needsPerm) {
      attach();
      setPermission('granted');
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
      attachRef.current = null;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const request = async () => {
    const Ctor = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceOrientationEvent;
    if (Ctor && typeof Ctor.requestPermission === 'function') {
      try {
        const res = await Ctor.requestPermission();
        setPermission(res === 'granted' ? 'granted' : 'denied');
        // Re-use the effect's own handler (with its smoothing, tilt guard and
        // absolute-source gating) instead of attaching a second, dumber one.
        if (res === 'granted') attachRef.current?.();
      } catch {
        setPermission('denied');
      }
    }
  };

  return { heading, quality, supported, permission, request, accuracy, tilted };
}

export default function QiblaCompass() {
  const { language } = useApp();
  const { location } = useDeviceLocation();
  const [expanded, setExpanded] = useState(false);
  const {
    heading: rawHeading, quality, supported, permission, request, accuracy, tilted,
  } = useStableDeviceHeading();
  const alignedRef = useRef(false);

  // Only an Earth-referenced reading may rotate the needle. With a relative
  // gyro feed we keep the dial north-up and say so, rather than pointing the
  // user at a direction the sensor cannot actually know.
  const heading = quality === 'absolute' ? rawHeading : null;

  const lat = location?.lat ?? MAKKAH.lat;
  const lng = location?.lng ?? MAKKAH.lng;

  const bearing = useMemo(() => qiblaBearing(lat, lng), [lat, lng]);
  const distanceKm = useMemo(() => haversineKm(lat, lng, MAKKAH.lat, MAKKAH.lng), [lat, lng]);
  const compassLabel = bearingToCompass(bearing);

  const needleAngle = heading == null ? bearing : (bearing - heading + 360) % 360;
  const delta = Math.min(needleAngle, 360 - needleAngle);

  // Hysteresis on the aligned state to stop flicker around the threshold.
  if (heading != null) {
    if (!alignedRef.current && delta < 2) alignedRef.current = true;
    else if (alignedRef.current && delta > 4) alignedRef.current = false;
  } else {
    alignedRef.current = false;
  }
  const isAligned = alignedRef.current;

  // Lock body scroll while expanded.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const t = {
    title: 'بوصلة القبلة',
    subtitle: 'اتجاه مكة المكرمة الآن',
    distance: 'المسافة',
    bearing: 'الاتجاه',
    heading: 'اتجاه الجهاز',
    km: 'كم',
    aligned: 'محاذٍ للقبلة',
    rotate: 'أدر جهازك حتى يستوي السهم للأعلى',
    permission: 'تفعيل بوصلة الجهاز',
    permissionHint: 'يحتاج المتصفح إذنًا لقراءة اتجاه الجهاز.',
    noHeading: 'الشمال للأعلى',
    info: 'يُحسب اتجاه القبلة على دائرة عظمى من موقعك إلى مكة المكرمة. للحصول على دقّة أفضل، ابتعد عن المعادن والشاشات وحرّك الجهاز على شكل ٨ لمعايرة البوصلة.',
    locationFallback: 'فعّل الموقع لحساب القبلة من مكانك بدقة.',
    calibrate: 'دقّة البوصلة منخفضة — حرّك الجهاز على شكل ٨ للمعايرة',
    relative: 'مستشعر هذا الجهاز لا يعرف الشمال الحقيقي — استعن باتجاه الدرجات أعلاه.',
    tilted: 'أفقِ الجهاز (ضعه مستويًا) لقراءة أدقّ للبوصلة',
  };

  const fmtKm = (n: number) =>
    new Intl.NumberFormat('ar-EG-u-nu-latn', {
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full text-start rounded-3xl surface-depth-pressable p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
        aria-label={t.title}
      >
        <CompassDial size={72} needleAngle={needleAngle} aligned={isAligned} compact />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Compass className="w-3.5 h-3.5 text-[hsl(var(--live))]" />
            <span className="text-micro uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              {t.title}
            </span>
          </div>
          <div className="text-title font-bold text-foreground leading-tight tabular-nums">
            {Math.round(bearing)}°{' '}
            <span className="text-meta font-medium text-muted-foreground">{compassLabel}</span>
          </div>
          <div className="text-micro text-muted-foreground mt-0.5">
            {fmtKm(distanceKm)} {t.km} · {location ? t.subtitle : t.locationFallback}
          </div>
        </div>
        <Maximize2 className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {createPortal(
        <AnimatePresence>
          {expanded && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpanded(false)}
                className="fixed inset-0 z-drawer bg-black/70"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-x-0 bottom-0 z-drawer max-h-[92vh] rounded-t-3xl bg-background border-t border-border/40 flex flex-col"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[hsl(var(--live))]" />
                    <h2 className="text-body font-bold text-foreground">{t.title}</h2>
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    aria-label={'إغلاق'}
                    className="w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center gap-6">
                  <CompassDial
                    size={280}
                    needleAngle={needleAngle}
                    aligned={isAligned}
                    language={language}
                  />

                  <AnimatePresence mode="wait">
                    {isAligned ? (
                      <motion.div
                        key="aligned"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-4 py-1.5 rounded-full bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] text-meta font-semibold flex items-center gap-2"
                      >
                        <Crosshair className="w-4 h-4" />
                        {t.aligned}
                      </motion.div>
                    ) : heading != null ? (
                      <motion.p
                        key="rotate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-mini text-muted-foreground text-center max-w-[24ch]"
                      >
                        {t.rotate}
                      </motion.p>
                    ) : (
                      <motion.p
                        key="north"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-mini text-muted-foreground text-center"
                      >
                        {t.noHeading}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="w-full grid grid-cols-3 gap-3">
                    <Stat
                      icon={<Compass className="w-3.5 h-3.5" />}
                      label={t.bearing}
                      value={`${Math.round(bearing)}°`}
                      hint={compassLabel}
                    />
                    <Stat
                      icon={<MapPin className="w-3.5 h-3.5" />}
                      label={t.distance}
                      value={fmtKm(distanceKm)}
                      hint={t.km}
                    />
                    <Stat
                      icon={<Compass className="w-3.5 h-3.5" />}
                      label={t.heading}
                      value={heading == null ? '—' : `${Math.round(heading)}°`}
                      hint={heading == null ? t.noHeading : bearingToCompass(heading)}
                    />
                  </div>

                  {supported && permission !== 'granted' && (
                    <button
                      onClick={request}
                      className="px-4 py-2 rounded-full bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] text-meta font-semibold border border-[hsl(var(--live))]/30"
                    >
                      {t.permission}
                    </button>
                  )}

                  {accuracy != null && accuracy > 25 && (
                    <p className="text-micro text-amber-500 text-center max-w-[30ch]">
                      {t.calibrate}
                    </p>
                  )}

                  {tilted && quality === 'absolute' && (
                    <p className="text-micro text-amber-500 text-center max-w-[30ch]">
                      {t.tilted}
                    </p>
                  )}

                  {quality === 'relative' && (
                    <p className="text-micro text-muted-foreground text-center max-w-[32ch]">
                      {t.relative}
                    </p>
                  )}

                  <div className="w-full rounded-2xl bg-card/60 border border-border/40 p-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-mini text-muted-foreground leading-relaxed">
                      {t.info}
                      {!location && <> {t.locationFallback}</>}
                      {supported && permission !== 'granted' && <> {t.permissionHint}</>}
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/40 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-micro uppercase tracking-wider font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lead font-bold text-foreground tabular-nums leading-none">{value}</div>
      {hint && <div className="text-micro text-muted-foreground">{hint}</div>}
    </div>
  );
}

function CompassDial({
  size,
  needleAngle,
  aligned,
  compact,
  language: _language,
}: {
  size: number;
  needleAngle: number;
  aligned: boolean;
  compact?: boolean;
  language?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - (compact ? 4 : 18);
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  const labels = compact
    ? []
    : ([
        ['ش', 0],
        ['ق', 90],
        ['ج', 180],
        ['غ', 270],
      ] as const);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {aligned && (
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - (compact ? 2 : 6)}
          fill="none"
          stroke="hsl(var(--border) / 0.5)"
          strokeWidth={0.5}
        />

        {ticks.map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const isMajor = deg % 90 === 0;
          const len = isMajor ? (compact ? 6 : 12) : compact ? 3 : 6;
          const x1 = cx + Math.cos(rad) * (r - len);
          const y1 = cy + Math.sin(rad) * (r - len);
          const x2 = cx + Math.cos(rad) * r;
          const y2 = cy + Math.sin(rad) * r;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? 'hsl(var(--live) / 0.8)' : 'hsl(var(--muted-foreground) / 0.4)'}
              strokeWidth={isMajor ? 1.5 : 0.75}
              strokeLinecap="round"
            />
          );
        })}

        {labels.map(([label, deg]) => {
          const rad = ((Number(deg) - 90) * Math.PI) / 180;
          const lx = cx + Math.cos(rad) * (r - 22);
          const ly = cy + Math.sin(rad) * (r - 22);
          return (
            <text
              key={String(label)}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight={700}
              fill={Number(deg) === 0 ? 'hsl(var(--live))' : 'hsl(var(--muted-foreground))'}
            >
              {String(label)}
            </text>
          );
        })}

        <motion.g
          animate={{ rotate: needleAngle }}
          transition={{ type: 'spring', stiffness: 140, damping: 22, mass: 0.6 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          <rect
            x={cx - 1.5}
            y={cy - (r - (compact ? 8 : 22))}
            width={3}
            height={r - (compact ? 8 : 22)}
            rx={1.5}
            fill="hsl(var(--live))"
          />
          <g transform={`translate(${cx}, ${cy - (r - (compact ? 10 : 26))})`}>
            <rect
              x={compact ? -4 : -9}
              y={compact ? -4 : -9}
              width={compact ? 8 : 18}
              height={compact ? 8 : 18}
              rx={1}
              fill="hsl(var(--foreground))"
              stroke="hsl(var(--live))"
              strokeWidth={1}
            />
            {!compact && <rect x={-9} y={-2} width={18} height={2} fill="hsl(var(--live))" />}
          </g>
        </motion.g>

        <circle
          cx={cx}
          cy={cy}
          r={compact ? 3 : 6}
          fill="hsl(var(--background))"
          stroke="hsl(var(--live))"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
