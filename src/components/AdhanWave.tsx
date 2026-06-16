import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Waves, ChevronRight } from '@/lib/icons';
import type { PrayerSlot } from '@/utils/prayerAstronomy';

/**
 * AdhanWave — the live "wave of adhan" rolling around the planet.
 *
 * This is the centerpiece of UmmahPulse. It answers, in real-time:
 *   • Where is the very next adhan happening on Earth?
 *   • How many seconds until it sounds?
 *   • What just happened in the last few minutes?
 *
 * The hero is a giant tabular countdown that ticks every second; below
 * it a horizontal world-strip shows the day/night terminator with
 * Fajr (gold) and Maghrib (rose) wave-fronts visibly moving westward,
 * plus pulsing pins on cities entering their adhan. Beneath that, a
 * dual stream lists the last 3 adhans (fading out) and next 4 (with
 * mm:ss countdowns), and a 5-tile stats row aggregates city counts
 * per current prayer slot.
 *
 * The component is pure presentation — all prayer math is computed
 * upstream and passed in via `cities[]`. That keeps it cheap to tick.
 */

export interface WaveCity {
  name: string;
  nameAr: string;
  flag: string;
  country: string;
  countryAr: string;
  lat: number;
  lng: number;
  pop: number;
  /** Current prayer slot. */
  slot: PrayerSlot;
  /** Minutes until next adhan (Fajr/Dhuhr/Asr/Maghrib/Isha). */
  next: { name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; minutesUntil: number };
  /** Local clock HH:MM for the city. */
  localClock: string;
}

export interface AdhanWaveProps {
  cities: WaveCity[];
  /** Sub-solar longitude (-180..180), drives the day/night strip. */
  subSolarLng: number;
  /** Sub-solar declination (deg) — for north/south terminator shaping. */
  subSolarLat: number;
  language: 'ar' | 'de';
  onOpenMap?: () => void;
}

const SLOT_LABEL: Record<'fajr'|'dhuhr'|'asr'|'maghrib'|'isha', { ar: string; de: string }> = {
  fajr:    { ar: 'الفجر',   de: 'Fadschr' },
  dhuhr:   { ar: 'الظهر',   de: 'Dhuhr'   },
  asr:     { ar: 'العصر',   de: 'Asr'     },
  maghrib: { ar: 'المغرب',  de: 'Maghrib' },
  isha:    { ar: 'العشاء',  de: 'Ischa'   },
};

const SLOT_COLOR: Record<PrayerSlot | 'duha', string> = {
  fajr:    'hsl(43, 96%, 66%)',
  shuruq:  'hsl(32, 95%, 64%)',
  duha:    'hsl(48, 92%, 60%)',
  dhuhr:   'hsl(196, 78%, 62%)',
  asr:     'hsl(18, 78%, 60%)',
  maghrib: 'hsl(348, 76%, 62%)',
  isha:    'hsl(252, 62%, 66%)',
  night:   'hsl(220, 25%, 55%)',
};

// Strip dimensions (world band, equirectangular)
const SW = 360;
const SH = 70;
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * SW,
  y: ((90 - lat) / 180) * SH * 2.4 - SH * 0.7, // squash poles, center on equator
});

const RAD = Math.PI / 180;
function buildTerminator(subLng: number, decl: number): string {
  // Sun-altitude = 0 isoline projected onto equirect strip.
  const declR = decl * RAD;
  const pts: { x: number; y: number }[] = [];
  for (let lat = -88; lat <= 88; lat += 2) {
    const latR = lat * RAD;
    const cosH = -Math.tan(latR) * Math.tan(declR);
    if (cosH > 1 || cosH < -1) continue;
    const H = Math.acos(cosH) / RAD;
    const lng = ((subLng + H + 540) % 360) - 180;
    const p = project(lat, lng);
    pts.push(p);
  }
  if (!pts.length) return '';
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function formatMS(seconds: number, lang: 'ar' | 'de'): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function AdhanWave({
  cities,
  subSolarLng,
  subSolarLat,
  language,
  onOpenMap,
}: AdhanWaveProps) {
  const t = (ar: string, de: string) => (language === 'ar' ? ar : de);

  // Per-second tick → drives the live countdowns. Cheap: only the
  // hero numbers re-render, the SVG strip only updates when minute
  // boundaries cross thanks to memoisation below.
  const [tickSec, setTickSec] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTickSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Reset the seconds-counter whenever upstream cities update — the
  // parent re-computes prayer info on a coarser tick (every ~60s),
  // and our seconds bleed must restart from that fresh baseline so
  // hero / countdown numbers stay monotonic.
  useEffect(() => {
    setTickSec(0);
  }, [cities]);

  // Synthesise an "absolute seconds-since-mount" baseline so we can
  // bleed seconds out of integer-minute upstream values.
  const elapsedSec = tickSec; // ticks once per second from mount

  // Decorate cities with live remaining-seconds, then sort upcoming
  // by soonest. Live = minutes-from-upstream * 60 minus our elapsed
  // local seconds (clamped at 0).
  const decorated = useMemo(() => {
    return cities.map((c) => {
      const minutesUntil = c.next.minutesUntil;
      const totalSec = Math.max(0, minutesUntil * 60 - elapsedSec);
      return { ...c, totalSec };
    });
  }, [cities, elapsedSec]);

  const upcoming = useMemo(
    () =>
      [...decorated]
        .filter((c) => c.totalSec > 0)
        .sort((a, b) => a.totalSec - b.totalSec)
        .slice(0, 6),
    [decorated],
  );

  // "Just-aired" — cities whose adhan was within the last 8 minutes,
  // sorted most-recent first. We derive this from upstream slot start
  // boundaries: any city whose `next` minutesUntil is close to a full
  // 24h (just rolled over) was firing very recently.
  const justAired = useMemo(() => {
    const out: Array<{
      key: string;
      city: WaveCity;
      slot: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
      minutesAgo: number;
    }> = [];
    for (const c of cities) {
      // Each upstream city tells us "minutes until next". The slot it
      // is *currently in* is its most recently fired adhan. Estimate
      // when that fired by mapping slot → typical duration so far.
      const slot = c.slot;
      const lastFired: typeof out[number]['slot'] | null =
        slot === 'fajr' ? 'fajr' :
        slot === 'shuruq' || slot === 'duha' ? null : // no adhan
        slot === 'dhuhr' ? 'dhuhr' :
        slot === 'asr' ? 'asr' :
        slot === 'maghrib' ? 'maghrib' :
        slot === 'isha' ? 'isha' :
        null;
      if (!lastFired) continue;
      // Rough "minutes since fire" — we don't have it precisely,
      // so flag only cities whose next prayer is *far* (>30min away)
      // meaning they're solidly mid-slot, then approximate with 0–8.
      // We just bucket the top fresh ones by population proxy.
      if (c.next.minutesUntil < 25) continue;
      out.push({
        key: `${c.name}-${lastFired}`,
        city: c,
        slot: lastFired,
        minutesAgo: 0,
      });
    }
    return out
      .sort((a, b) => b.city.pop - a.city.pop)
      .slice(0, 4);
  }, [cities]);

  // The HERO — the very next adhan anywhere on Earth.
  const hero = upcoming[0];

  // Per-slot live aggregates for the stats row.
  const slotCounts = useMemo(() => {
    const counts: Record<PrayerSlot, number> = {
      fajr: 0, shuruq: 0, duha: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, night: 0,
    };
    cities.forEach((c) => { counts[c.slot]++; });
    return counts;
  }, [cities]);

  // Sub-solar fronts on the world strip — these are the "wave fronts".
  // Fajr front sits ~18° east of the terminator (dawn side, sun below
  // horizon by Fajr angle); Maghrib sits ~0° west (dusk side).
  const fajrFrontLng = ((subSolarLng + 105 + 540) % 360) - 180;
  const maghribFrontLng = ((subSolarLng - 90 + 540) % 360) - 180;
  const fajrX = ((fajrFrontLng + 180) / 360) * SW;
  const maghribX = ((maghribFrontLng + 180) / 360) * SW;
  const terminatorPath = useMemo(
    () => buildTerminator(subSolarLng, subSolarLat),
    [subSolarLng, subSolarLat],
  );

  // Cities currently firing (Fajr / Maghrib / Isha) — pins on strip
  const stripPins = useMemo(
    () =>
      cities
        .filter((c) => c.slot === 'fajr' || c.slot === 'maghrib' || c.slot === 'isha')
        .slice(0, 24)
        .map((c) => {
          const { x, y } = project(c.lat, c.lng);
          return { ...c, x, y };
        }),
    [cities],
  );

  const heroLabel = hero
    ? language === 'ar'
      ? `${SLOT_LABEL[hero.next.name].ar} في ${hero.nameAr}`
      : `${SLOT_LABEL[hero.next.name].de} in ${hero.name}`
    : '';

  return (
    <div dir="ltr" className="relative w-full">
      <div
        className="rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-b from-[hsl(220,38%,10%)] via-[hsl(224,44%,7%)] to-[hsl(228,52%,5%)]"
      >
        {/* ── Top bar — LIVE chip + open-map affordance ────────── */}
        <div
          className="flex items-center justify-between px-3 pt-2.5 pb-1.5"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[hsl(var(--live))] opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-[hsl(var(--live))]" />
            </span>
            <span className="text-[9.5px] font-bold tracking-[0.14em] text-foreground/90">
              {t('بثّ مباشر', 'LIVE')}
            </span>
            <span className="text-[9.5px] text-muted-foreground/70 ml-1">
              · {t('موجة الأذان', 'Wave of Adhan')}
            </span>
          </div>
          {onOpenMap && (
            <button
              onClick={onOpenMap}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/80 hover:text-foreground active:scale-95 transition-all"
              aria-label={t('عرض الخريطة الكاملة', 'Vollkarte')}
            >
              {t('الكل', 'Alle')}
              <ChevronRight className={`w-3 h-3 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* ── HERO — giant countdown to next adhan on Earth ──── */}
        {hero && (
          <button
            onClick={onOpenMap}
            className="w-full px-4 pt-1 pb-3 text-left active:scale-[0.995] transition-transform"
            aria-label={heroLabel}
          >
            <div
              className="flex items-baseline justify-between gap-3"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {t('الأذان القادم في الأرض', 'Next adhan on Earth')}
                </p>
                <p
                  className="text-[15px] font-bold mt-0.5 truncate"
                  style={{ color: SLOT_COLOR[hero.next.name] }}
                >
                  {heroLabel}
                </p>
                <p className="text-[10.5px] text-muted-foreground/80 mt-0.5 flex items-center gap-1.5">
                  <span className="text-base leading-none">{hero.flag}</span>
                  <span className="truncate">
                    {language === 'ar' ? hero.countryAr : hero.country}
                  </span>
                  <span className="opacity-50">·</span>
                  <span className="tabular-nums" dir="ltr">{hero.localClock}</span>
                </p>
              </div>
              <div className="text-right shrink-0" dir="ltr">
                <motion.div
                  key={Math.floor(hero.totalSec / 60)}
                  initial={{ scale: 0.94, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[28px] leading-none font-extrabold tabular-nums text-foreground"
                  style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                >
                  {formatMS(hero.totalSec, language)}
                </motion.div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 mt-1">
                  {hero.totalSec < 60 ? t('ثوانٍ', 'sec') : hero.totalSec < 3600 ? t('دقيقة:ث', 'mm:ss') : t('س:د:ث', 'hh:mm:ss')}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* ── WAVE STRIP — world band with terminator + fronts ── */}
        <div className="px-2 pb-1.5">
          <svg
            viewBox={`0 0 ${SW} ${SH}`}
            className="w-full h-auto block select-none rounded-lg"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <linearGradient id="awBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(225, 50%, 6%)" />
                <stop offset="100%" stopColor="hsl(228, 60%, 3%)" />
              </linearGradient>
              <linearGradient id="awFajrFront" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={SLOT_COLOR.fajr} stopOpacity="0" />
                <stop offset="50%" stopColor={SLOT_COLOR.fajr} stopOpacity="0.9" />
                <stop offset="100%" stopColor={SLOT_COLOR.fajr} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="awMagFront" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={SLOT_COLOR.maghrib} stopOpacity="0" />
                <stop offset="50%" stopColor={SLOT_COLOR.maghrib} stopOpacity="0.9" />
                <stop offset="100%" stopColor={SLOT_COLOR.maghrib} stopOpacity="0" />
              </linearGradient>
              <radialGradient id="awNight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(225, 60%, 8%)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="hsl(225, 60%, 5%)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width={SW} height={SH} fill="url(#awBg)" />

            {/* Latitude reference lines — equator + tropics */}
            <g stroke="hsl(220, 30%, 30%)" strokeWidth="0.25" strokeOpacity="0.4">
              <line x1="0" y1={SH / 2} x2={SW} y2={SH / 2} strokeOpacity="0.55" />
              {[-23.5, 23.5].map((lat) => {
                const y = project(lat, 0).y;
                return <line key={lat} x1="0" y1={y} x2={SW} y2={y} strokeDasharray="2 3" />;
              })}
            </g>

            {/* Night veil — terminator path closed to the dark side */}
            {terminatorPath && (
              <>
                <path
                  d={`${terminatorPath} L${((subSolarLng + 360) % 360 < 180 ? SW : 0)},${SH} L${((subSolarLng + 360) % 360 < 180 ? SW : 0)},0 Z`}
                  fill="hsl(225, 70%, 4%)"
                  fillOpacity="0.55"
                />
                <path
                  d={terminatorPath}
                  fill="none"
                  stroke="hsl(220, 30%, 50%)"
                  strokeOpacity="0.5"
                  strokeWidth="0.4"
                />
              </>
            )}

            {/* Sub-solar glow */}
            <ellipse
              cx={((subSolarLng + 180) / 360) * SW}
              cy={SH / 2}
              rx={70}
              ry={SH * 0.8}
              fill="url(#awNight)"
              opacity="0.55"
            />

            {/* Fajr front — vertical sweeping line */}
            <g>
              <line
                x1={fajrX}
                y1={0}
                x2={fajrX}
                y2={SH}
                stroke="url(#awFajrFront)"
                strokeWidth="6"
              />
              <line
                x1={fajrX}
                y1={0}
                x2={fajrX}
                y2={SH}
                stroke={SLOT_COLOR.fajr}
                strokeOpacity="0.95"
                strokeWidth="0.7"
              />
              <text
                x={fajrX + 2}
                y={9}
                fontSize="6"
                fontWeight="800"
                fill={SLOT_COLOR.fajr}
                opacity="0.9"
              >
                FAJR
              </text>
            </g>

            {/* Maghrib front */}
            <g>
              <line
                x1={maghribX}
                y1={0}
                x2={maghribX}
                y2={SH}
                stroke="url(#awMagFront)"
                strokeWidth="6"
              />
              <line
                x1={maghribX}
                y1={0}
                x2={maghribX}
                y2={SH}
                stroke={SLOT_COLOR.maghrib}
                strokeOpacity="0.95"
                strokeWidth="0.7"
              />
              <text
                x={maghribX + 2}
                y={9}
                fontSize="6"
                fontWeight="800"
                fill={SLOT_COLOR.maghrib}
                opacity="0.9"
              >
                MAGHRIB
              </text>
            </g>

            {/* City pins — pulse if currently firing */}
            {stripPins.map((c) => (
              <g key={c.name}>
                <motion.circle
                  cx={c.x}
                  cy={c.y}
                  r={1.6}
                  fill="none"
                  stroke={SLOT_COLOR[c.slot]}
                  strokeWidth="0.4"
                  animate={{
                    r: [1.6, 5, 1.6],
                    opacity: [0.9, 0, 0.9],
                  }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
                <circle cx={c.x} cy={c.y} r="1.4" fill={SLOT_COLOR[c.slot]} />
              </g>
            ))}

            {/* Hero city — golden ring + flag-letter label */}
            {hero && (() => {
              const p = project(hero.lat, hero.lng);
              return (
                <g>
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill="none"
                    stroke={SLOT_COLOR[hero.next.name]}
                    strokeWidth="0.6"
                    animate={{ r: [3, 7, 3], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <circle cx={p.x} cy={p.y} r="2" fill={SLOT_COLOR[hero.next.name]} />
                  <circle cx={p.x} cy={p.y} r="0.7" fill="hsl(0,0%,100%)" />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* ── STREAM — upcoming countdowns + just-aired ────────── */}
        <div className="px-3 pb-3 grid grid-cols-1 gap-1.5">
          <AnimatePresence initial={false}>
            {upcoming.slice(1, 5).map((c) => (
              <motion.div
                key={`up-${c.name}-${c.next.name}`}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[hsl(220,30%,10%)]/60 border border-border/20"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: SLOT_COLOR[c.next.name] }}
                  />
                  <span className="text-base leading-none shrink-0">{c.flag}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
                      {language === 'ar'
                        ? `${SLOT_LABEL[c.next.name].ar} · ${c.nameAr}`
                        : `${SLOT_LABEL[c.next.name].de} · ${c.name}`}
                    </p>
                    <p className="text-[9.5px] text-muted-foreground/70 leading-tight mt-0.5 tabular-nums" dir="ltr">
                      {c.localClock}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[12px] font-bold tabular-nums shrink-0"
                  dir="ltr"
                  style={{ color: SLOT_COLOR[c.next.name] }}
                >
                  {formatMS(c.totalSec, language)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Just-aired — most-populous cities mid-slot */}
          {justAired.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5" />
                {t('يصلّون الآن', 'Praying now')}
              </span>
              {justAired.map(({ key, city, slot }) => (
                <motion.span
                  key={key}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: `${SLOT_COLOR[slot]}22`,
                    color: SLOT_COLOR[slot],
                    border: `0.5px solid ${SLOT_COLOR[slot]}55`,
                  }}
                >
                  <span>{city.flag}</span>
                  <span>{language === 'ar' ? city.nameAr : city.name}</span>
                </motion.span>
              ))}
            </div>
          )}
        </div>

        {/* ── STATS — 5 slot tiles ──────────────────────────────── */}
        <div className="grid grid-cols-5 gap-px bg-border/20 border-t border-border/20">
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((slot) => (
            <div
              key={slot}
              className="flex flex-col items-center justify-center py-2 px-1 bg-[hsl(225,40%,7%)]"
            >
              <div className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: SLOT_COLOR[slot] }}
                />
                <span className="text-[9.5px] font-semibold text-foreground/90">
                  {language === 'ar' ? SLOT_LABEL[slot].ar : SLOT_LABEL[slot].de}
                </span>
              </div>
              <span className="text-[13px] font-extrabold tabular-nums text-foreground mt-0.5">
                {slotCounts[slot]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdhanWave;
