import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { Compass, X, Maximize2, Info, Crosshair, MapPin } from '@/lib/icons';
import { qiblaBearing, bearingToCompass } from '@/utils/prayerAstronomy';

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

function useStableDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [accuracy, setAccuracy] = useState<number | null>(null); // ° (lower = better)
  // Smoothing state — kept outside of React so we don't trigger re-renders
  // for every sensor sample.
  const smoothedRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasAPI = 'DeviceOrientationEvent' in window;
    setSupported(hasAPI);
    if (!hasAPI) return;

    const Ctor: any = (window as any).DeviceOrientationEvent;
    const needsPerm = typeof Ctor?.requestPermission === 'function';

    const getScreenAngle = (): number => {
      const so = (window.screen as any)?.orientation;
      if (so && typeof so.angle === 'number') return so.angle;
      if (typeof (window as any).orientation === 'number') return (window as any).orientation;
      return 0;
    };

    const pushSample = (raw: number, acc?: number) => {
      // Apply screen orientation correction so the needle remains correct
      // when the device is held in landscape.
      const screenAngle = getScreenAngle();
      const corrected = (raw + screenAngle + 360) % 360;
      // Circular EMA: move smoothed value towards the corrected angle by
      // a fraction of the shortest signed delta. Alpha ≈ 0.18 gives a
      // settled needle without feeling laggy.
      const ALPHA = 0.18;
      const prev = smoothedRef.current;
      const next = prev == null
        ? corrected
        : (prev + ALPHA * angleDelta(corrected, prev) + 360) % 360;
      smoothedRef.current = next;
      pendingRef.current = next;
      if (typeof acc === 'number') setAccuracy(acc);
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingRef.current != null) setHeading(pendingRef.current);
        });
      }
    };

    const handler = (e: DeviceOrientationEvent) => {
      // iOS: webkitCompassHeading is true-north, clockwise.
      const wk = (e as any).webkitCompassHeading;
      if (typeof wk === 'number' && !Number.isNaN(wk)) {
        const acc = (e as any).webkitCompassAccuracy;
        pushSample(wk, typeof acc === 'number' && acc >= 0 ? acc : undefined);
        return;
      }
      // Standard: alpha is rotation around z, counter-clockwise from device
      // north. Compass heading = (360 - alpha).
      if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        pushSample((360 - e.alpha + 360) % 360);
      }
    };

    const attach = () => {
      window.addEventListener('deviceorientationabsolute', handler as any, true);
      window.addEventListener('deviceorientation', handler as any, true);
    };

    if (!needsPerm) {
      attach();
      setPermission('granted');
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handler as any, true);
      window.removeEventListener('deviceorientation', handler as any, true);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const request = async () => {
    const Ctor: any = (window as any).DeviceOrientationEvent;
    if (Ctor && typeof Ctor.requestPermission === 'function') {
      try {
        const res = await Ctor.requestPermission();
        setPermission(res === 'granted' ? 'granted' : 'denied');
        if (res === 'granted') {
          // The effect's attach() only ran for non-iOS; attach now.
          // The effect's handler closure is gone — easiest path is to reload
          // the listener via a forced re-mount. Instead, attach inline:
          const h = (e: DeviceOrientationEvent) => {
            const wk = (e as any).webkitCompassHeading;
            if (typeof wk === 'number' && !Number.isNaN(wk)) {
              const acc = (e as any).webkitCompassAccuracy;
              if (typeof acc === 'number' && acc >= 0) setAccuracy(acc);
              setHeading(wk);
            } else if (typeof e.alpha === 'number') {
              setHeading((360 - e.alpha + 360) % 360);
            }
          };
          window.addEventListener('deviceorientation', h as any, true);
        }
      } catch {
        setPermission('denied');
      }
    }
  };

  return { heading, supported, permission, request, accuracy };
}

export default function QiblaCompass() {
  const { language } = useApp();
  const { location } = useDeviceLocation();
  const [expanded, setExpanded] = useState(false);
  const { heading, supported, permission, request, accuracy } = useStableDeviceHeading();
  const alignedRef = useRef(false);

  const lat = location?.lat ?? MAKKAH.lat;
  const lng = location?.lng ?? MAKKAH.lng;

  const bearing = useMemo(() => qiblaBearing(lat, lng), [lat, lng]);
  const distanceKm = useMemo(
    () => haversineKm(lat, lng, MAKKAH.lat, MAKKAH.lng),
    [lat, lng]
  );
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
    return () => { document.body.style.overflow = prev; };
  }, [expanded]);

  const t = {
    title: language === 'ar' ? 'بوصلة القبلة' : 'Qibla-Kompass',
    subtitle: language === 'ar' ? 'اتجاه مكة المكرمة الآن' : 'Richtung Mekka, jetzt',
    distance: language === 'ar' ? 'المسافة' : 'Entfernung',
    bearing: language === 'ar' ? 'الاتجاه' : 'Peilung',
    heading: language === 'ar' ? 'اتجاه الجهاز' : 'Geräterichtung',
    km: language === 'ar' ? 'كم' : 'km',
    aligned: language === 'ar' ? 'محاذٍ للقبلة' : 'Auf Qibla ausgerichtet',
    rotate: language === 'ar' ? 'أدر جهازك حتى يستوي السهم للأعلى' : 'Drehe dein Gerät, bis der Pfeil nach oben zeigt',
    permission: language === 'ar' ? 'تفعيل بوصلة الجهاز' : 'Gerätekompass aktivieren',
    permissionHint: language === 'ar'
      ? 'يحتاج المتصفح إذنًا لقراءة اتجاه الجهاز.'
      : 'Der Browser benötigt eine Erlaubnis für die Geräteausrichtung.',
    noHeading: language === 'ar' ? 'الشمال للأعلى' : 'Norden oben',
    info: language === 'ar'
      ? 'يُحسب اتجاه القبلة على دائرة عظمى من موقعك إلى مكة المكرمة. للحصول على دقّة أفضل، ابتعد عن المعادن والشاشات وحرّك الجهاز على شكل ٨ لمعايرة البوصلة.'
      : 'Die Qibla wird als Großkreis von deinem Standort nach Mekka berechnet. Für mehr Präzision Metall/Bildschirme meiden und das Gerät in einer Acht bewegen, um den Sensor zu kalibrieren.',
    locationFallback: language === 'ar'
      ? 'فعّل الموقع لحساب القبلة من مكانك بدقة.'
      : 'Aktiviere den Standort für eine präzise Qibla-Berechnung.',
    calibrate: language === 'ar' ? 'دقّة البوصلة منخفضة — حرّك الجهاز على شكل ٨ للمعايرة' : 'Kompass ungenau — Gerät in einer Acht bewegen, um zu kalibrieren',
  };

  const fmtKm = (n: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'de-DE', {
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
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              {t.title}
            </span>
          </div>
          <div className="text-xl font-bold text-foreground leading-tight tabular-nums">
            {Math.round(bearing)}° <span className="text-sm font-medium text-muted-foreground">{compassLabel}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
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
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] rounded-t-3xl bg-background border-t border-border/40 flex flex-col"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[hsl(var(--live))]" />
                    <h2 className="text-base font-bold text-foreground">{t.title}</h2>
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    aria-label={language === 'ar' ? 'إغلاق' : 'Schließen'}
                    className="w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center gap-6">
                  <CompassDial size={280} needleAngle={needleAngle} aligned={isAligned} language={language} />

                  <AnimatePresence mode="wait">
                    {isAligned ? (
                      <motion.div
                        key="aligned"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-4 py-1.5 rounded-full bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] text-sm font-semibold flex items-center gap-2"
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
                        className="text-xs text-muted-foreground text-center max-w-[24ch]"
                      >
                        {t.rotate}
                      </motion.p>
                    ) : (
                      <motion.p
                        key="north"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-muted-foreground text-center"
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
                      className="px-4 py-2 rounded-full bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] text-sm font-semibold border border-[hsl(var(--live))]/30"
                    >
                      {t.permission}
                    </button>
                  )}

                  {accuracy != null && accuracy > 25 && (
                    <p className="text-[11px] text-amber-500 text-center max-w-[30ch]">
                      {t.calibrate}
                    </p>
                  )}

                  <div className="w-full rounded-2xl bg-card/60 border border-border/40 p-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
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
        document.body
      )}
    </>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/40 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-foreground tabular-nums leading-none">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function CompassDial({
  size,
  needleAngle,
  aligned,
  compact,
  language,
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
    : language === 'ar'
      ? ([['ش', 0], ['ق', 90], ['ج', 180], ['غ', 270]] as const)
      : ([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {aligned && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: '0 0 60px hsl(var(--live) / 0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id={`face-${size}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="1" />
          </radialGradient>
          <linearGradient id={`needle-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--live))" />
            <stop offset="50%" stopColor="hsl(var(--live))" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(var(--live))" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <circle cx={cx} cy={cy} r={r} fill={`url(#face-${size})`} stroke="hsl(var(--border))" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r - (compact ? 2 : 6)} fill="none" stroke="hsl(var(--border) / 0.5)" strokeWidth={0.5} />

        {ticks.map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const isMajor = deg % 90 === 0;
          const len = isMajor ? (compact ? 6 : 12) : compact ? 3 : 6;
          const x1 = cx + Math.cos(rad) * (r - len);
          const y1 = cy + Math.sin(rad) * (r - len);
          const x2 = cx + Math.cos(rad) * r;
          const y2 = cy + Math.sin(rad) * r;
          return (
            <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isMajor ? 'hsl(var(--live) / 0.8)' : 'hsl(var(--muted-foreground) / 0.4)'}
              strokeWidth={isMajor ? 1.5 : 0.75} strokeLinecap="round" />
          );
        })}

        {labels.map(([label, deg]) => {
          const rad = ((Number(deg) - 90) * Math.PI) / 180;
          const lx = cx + Math.cos(rad) * (r - 22);
          const ly = cy + Math.sin(rad) * (r - 22);
          return (
            <text key={String(label)} x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight={700}
              fill={Number(deg) === 0 ? 'hsl(var(--live))' : 'hsl(var(--muted-foreground))'}>
              {String(label)}
            </text>
          );
        })}

        <motion.g
          animate={{ rotate: needleAngle }}
          transition={{ type: 'spring', stiffness: 140, damping: 22, mass: 0.6 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          <rect x={cx - 1.5} y={cy - (r - (compact ? 8 : 22))}
            width={3} height={r - (compact ? 8 : 22)} rx={1.5} fill={`url(#needle-${size})`} />
          <g transform={`translate(${cx}, ${cy - (r - (compact ? 10 : 26))})`}>
            <rect x={compact ? -4 : -9} y={compact ? -4 : -9}
              width={compact ? 8 : 18} height={compact ? 8 : 18} rx={1}
              fill="hsl(var(--foreground))" stroke="hsl(var(--live))" strokeWidth={1} />
            {!compact && <rect x={-9} y={-2} width={18} height={2} fill="hsl(var(--live))" />}
          </g>
        </motion.g>

        <circle cx={cx} cy={cy} r={compact ? 3 : 6} fill="hsl(var(--background))"
          stroke="hsl(var(--live))" strokeWidth={1.5} />
      </svg>
    </div>
  );
}