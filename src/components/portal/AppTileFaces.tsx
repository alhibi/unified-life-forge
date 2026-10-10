/**
 * AppTileFaces — every launcher widget gets its own composition.
 *
 * The owner's references read as a wall of distinct objects: a sentence
 * forecast, a dot-matrix departure board, a charging bar, a player, a
 * profile with actions. A shared "icon + title + caption" template cannot
 * do that, so each app draws a face that says what lives inside it.
 *
 * Honesty rules:
 *   • Live values (time, date, next prayer, weather, unread) come from the
 *     same sources the rest of the app uses; when they are absent the face
 *     falls back to a non-numeric composition, never an invented number.
 *   • Decorative faces carry real content (a verse, a word pair, weekday
 *     names) or pure form — no fake metrics.
 *   • Colour comes only from the tile material roles, so every theme,
 *     mode and strength keeps working. All motion is CSS and honours
 *     `prefers-reduced-motion`.
 *
 * Note: the shared Button sizes every nested svg to 20px through a utility,
 * so faces state their own svg size with the important modifier.
 */
import { memo, useEffect, useState } from 'react';

import { useWeatherLocation } from '@/features/weather/context/WeatherLocationContext';
import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
import { iconForWeatherCode, labelForWeatherCode } from '@/features/weather/lib/conditions';
import { Crown, MapPin, Pause, Play, Sparkles } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { useNextPrayer } from './useNextPrayer';

export interface AppTileFaceProps {
  appKey: string;
  wide: boolean;
  /** Live unread count for the chat widget. */
  badge?: number;
}

/* ── shared helpers ──────────────────────────────────────────────────── */

/** Wall clock that re-renders once a minute and sleeps in hidden tabs. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(schedule, 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()));
    };
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === 'visible') schedule();
    };
    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return now;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 3×5 dot-matrix glyphs for the departure-board clock. */
const MATRIX: Record<string, readonly string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
};

function DotMatrix({ text, label }: { text: string; label: string }) {
  const cell = 6;
  let x = 0;
  const dots: { cx: number; cy: number; on: boolean }[] = [];
  for (const char of text) {
    const glyph = MATRIX[char];
    if (!glyph) continue;
    glyph.forEach((row, r) => {
      row.split('').forEach((bit, c) => {
        dots.push({ cx: x + c * cell + cell / 2, cy: r * cell + cell / 2, on: bit === '1' });
      });
    });
    x += glyph[0].length * cell + cell;
  }
  const width = Math.max(cell, x - cell);
  return (
    <svg
      viewBox={`0 0 ${width} ${5 * cell}`}
      className="h-auto! w-full! max-w-full"
      role="img"
      aria-label={label}
    >
      {dots.map((dot) => (
        <circle
          key={`${dot.cx}-${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r={cell * 0.38}
          fill="currentColor"
          opacity={dot.on ? 1 : 0.12}
        />
      ))}
    </svg>
  );
}

/** Pill row of Arabic weekday initials with today raised (real date). */
const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/* ── faces ───────────────────────────────────────────────────────────── */

function QuranFace() {
  return (
    <span className="flex w-full flex-col justify-end gap-2">
      <span className="font-amiri text-[length:var(--fs-display)] leading-relaxed text-tile-foreground" lang="ar">
        اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ
      </span>
      <span className="flex items-center gap-2">
        <span className="rounded-full bg-tile-foreground px-3 py-1 text-micro font-bold text-tile-surface">
          العلق
        </span>
        <span className="text-micro font-semibold text-muted-foreground">الآية 1</span>
      </span>
    </span>
  );
}

function DhikrFace() {
  const beads = 33;
  return (
    <span className="relative flex w-full items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-28! w-28!" aria-hidden>
        {Array.from({ length: beads }, (_, i) => {
          const angle = (i / beads) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle
              key={i}
              cx={60 + Math.cos(angle) * 50}
              cy={60 + Math.sin(angle) * 50}
              r={i === 0 ? 6 : 3.6}
              fill="currentColor"
              opacity={i === 0 ? 1 : 0.3 + (i / beads) * 0.5}
            />
          );
        })}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-amiri text-body font-bold leading-tight text-tile-foreground">سبحان الله</span>
        <span className="text-micro font-semibold tabular-nums text-muted-foreground" dir="ltr">×33</span>
      </span>
    </span>
  );
}

function SunnahFace() {
  const today = useMinuteClock().getDay();
  return (
    <span className="flex w-full flex-col justify-end gap-3">
      <span className="text-mini font-semibold text-muted-foreground">سنن {WEEKDAYS[today]}</span>
      <span className="grid w-full grid-cols-7 gap-1" aria-hidden>
        {WEEKDAYS.map((day, index) => (
          <span
            key={day}
            className={cn(
              'flex aspect-[3/4] items-end justify-center rounded-full pb-1 text-[0.6rem] font-bold',
              index === today
                ? 'bg-tile-foreground text-tile-surface'
                : 'bg-tile-foreground/12 text-tile-foreground',
            )}
          >
            {day.slice(0, 1)}
          </span>
        ))}
      </span>
    </span>
  );
}

function MihrabFace() {
  const { next } = useNextPrayer();
  if (!next) {
    return (
      <span className="flex w-full items-end">
        <span className="font-amiri text-[length:var(--fs-display)] text-tile-foreground">حَيَّ عَلَى الصَّلَاة</span>
      </span>
    );
  }
  const percent = Math.round(Math.min(1, Math.max(0, next.progress)) * 100);
  return (
    <span className="flex w-full flex-col justify-end gap-3">
      <span className="flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-mini font-semibold text-muted-foreground">الصلاة القادمة</span>
          <span className="block text-[length:calc(var(--fs-display)*1.35)] font-extrabold leading-none text-tile-foreground">
            {next.label}
          </span>
        </span>
        <span className="text-title font-bold tabular-nums text-tile-foreground" dir="ltr">
          {next.clock}
        </span>
      </span>
      <span
        className="relative block h-4 w-full overflow-hidden rounded-full bg-tile-foreground/15"
        role="progressbar"
        aria-label="المضي نحو الصلاة القادمة"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span
          className="absolute inset-y-0.5 start-0.5 rounded-full bg-tile-foreground transition-[inline-size] duration-slow"
          style={{ inlineSize: `calc(${Math.max(percent, 6)}% - 0.25rem)` }}
        />
      </span>
      <span className="text-micro font-semibold text-muted-foreground">{next.relative}</span>
    </span>
  );
}

function WeatherFace() {
  const { selectedCoords } = useWeatherLocation();
  const { data } = useWeatherData('ar', selectedCoords);
  if (!data) {
    return (
      <span className="flex w-full items-end">
        <span className="text-title font-bold leading-snug text-muted-foreground">
          اختر مدينتك <span className="text-tile-foreground">لتعرف سماءها.</span>
        </span>
      </span>
    );
  }
  const temp = Math.round(data.current.temperature);
  const Icon = iconForWeatherCode(data.current.weatherCode, data.current.isDay);
  const city = data.city ?? selectedCoords?.name ?? null;
  return (
    <span className="flex w-full items-end justify-between gap-3">
      <span className="text-[length:calc(var(--fs-title)*1.15)] font-bold leading-snug text-muted-foreground">
        الآن <bdi dir="ltr" className="text-tile-foreground">{temp}°</bdi>
        {city && (
          <>
            {' '}في <span className="text-tile-foreground">{city}</span>
          </>
        )}
        .<br />
        <span className="text-tile-foreground">{labelForWeatherCode(data.current.weatherCode)}.</span>
      </span>
      <Icon className="size-14! shrink-0 text-tile-foreground" aria-hidden />
    </span>
  );
}

function WellnessFace() {
  const rings = [44, 32, 20];
  const sweep = [0.78, 0.6, 0.86];
  return (
    <span className="flex w-full items-center justify-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28! w-28! -rotate-90" aria-hidden>
        {rings.map((r, i) => {
          const c = 2 * Math.PI * r;
          return (
            <g key={r}>
              <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="9" />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeOpacity={1 - i * 0.25}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${c * sweep[i]} ${c}`}
              />
            </g>
          );
        })}
      </svg>
      <span className="flex flex-col gap-1 text-mini font-bold text-tile-foreground">
        <span>تحرّك</span>
        <span className="opacity-75">تمرّن</span>
        <span className="opacity-50">استرح</span>
      </span>
    </span>
  );
}

function FitnessFace() {
  return (
    <span className="flex w-full flex-col justify-end gap-2">
      <svg viewBox="0 0 200 70" preserveAspectRatio="none" className="h-20! w-full!" aria-hidden>
        <path
          d="M0 50 C30 50 34 18 58 22 C82 26 80 58 104 56 C128 54 130 10 156 12 C178 14 182 40 200 36 L200 70 L0 70 Z"
          fill="currentColor"
          opacity="0.14"
        />
        <path
          d="M0 50 C30 50 34 18 58 22 C82 26 80 58 104 56 C128 54 130 10 156 12 C178 14 182 40 200 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="156" cy="12" r="6" fill="currentColor" />
      </svg>
      <span className="flex gap-1.5" aria-hidden>
        {['يوم', 'أسبوع', 'شهر'].map((range, index) => (
          <span
            key={range}
            className={cn(
              'rounded-full px-2.5 py-1 text-micro font-bold',
              index === 0 ? 'bg-tile-foreground text-tile-surface' : 'bg-tile-foreground/12 text-tile-foreground',
            )}
          >
            {range}
          </span>
        ))}
      </span>
    </span>
  );
}

function JournalFace() {
  const now = useMinuteClock();
  const month = new Intl.DateTimeFormat('ar', { month: 'long' }).format(now);
  const weekday = new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(now);
  return (
    <span className="flex w-full items-end justify-between gap-4">
      <span className="flex items-end gap-3">
        <span className="text-[length:calc(var(--fs-display)*2.4)] font-extrabold leading-[0.85] tabular-nums text-tile-foreground" dir="ltr">
          {now.getDate()}
        </span>
        <span className="pb-1">
          <span className="block text-title font-bold leading-none text-tile-foreground">{month}</span>
          <span className="mt-1 block text-mini font-semibold text-muted-foreground">{weekday}</span>
        </span>
      </span>
      <span className="flex w-2/5 flex-col gap-2 pb-2" aria-hidden>
        {[100, 86, 64].map((width) => (
          <span key={width} className="block h-1.5 rounded-full bg-tile-foreground/20" style={{ inlineSize: `${width}%` }} />
        ))}
      </span>
    </span>
  );
}

function GermanFace() {
  return (
    <span className="flex w-full items-end justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-[length:calc(var(--fs-display)*1.6)] font-extrabold leading-none text-tile-foreground" dir="ltr" lang="de">
          Hallo!
        </span>
        <span className="mt-1 block text-title font-bold text-muted-foreground">مرحبًا</span>
      </span>
      <span className="flex shrink-0 flex-col gap-1.5" dir="ltr" lang="de" aria-hidden>
        {['der', 'die', 'das'].map((article, index) => (
          <span
            key={article}
            className={cn(
              'rounded-full px-3 py-0.5 text-center text-micro font-bold',
              index === 1 ? 'bg-tile-foreground text-tile-surface' : 'bg-tile-foreground/12 text-tile-foreground',
            )}
          >
            {article}
          </span>
        ))}
      </span>
    </span>
  );
}

function KnowledgeFace() {
  const spines = [70, 92, 58, 84, 100, 66, 78];
  return (
    <span className="flex w-full items-end gap-1.5" aria-hidden>
      {spines.map((height, index) => (
        <span
          key={index}
          className="flex-1 rounded-t-[var(--r-sm)] bg-tile-foreground"
          style={{ blockSize: `${height * 0.9}px`, opacity: 0.2 + (index % 3) * 0.25 }}
        />
      ))}
      <span className="flex size-10 shrink-0 items-center justify-center self-end rounded-full bg-tile-foreground text-tile-surface">
        <Crown className="size-5!" />
      </span>
    </span>
  );
}

function PkmFace() {
  const nodes = [
    { x: 30, y: 30, r: 9 },
    { x: 92, y: 18, r: 6 },
    { x: 70, y: 62, r: 13 },
    { x: 140, y: 44, r: 7 },
    { x: 118, y: 88, r: 5 },
    { x: 26, y: 86, r: 6 },
  ];
  const links = [
    [0, 2],
    [1, 2],
    [2, 3],
    [2, 4],
    [0, 5],
    [1, 3],
  ];
  return (
    <svg viewBox="0 0 160 104" className="h-auto! w-full!" aria-hidden>
      {links.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
      ))}
      {nodes.map((node, index) => (
        <circle key={index} cx={node.x} cy={node.y} r={node.r} fill="currentColor" opacity={index === 2 ? 1 : 0.7} />
      ))}
    </svg>
  );
}

function ReadingFace() {
  return (
    <span className="flex w-full flex-col justify-end gap-2" aria-hidden>
      <span className="font-amiri text-title font-bold leading-none text-tile-foreground">الموجز</span>
      <span className="h-0.5 w-full bg-tile-foreground" />
      <span className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((col) => (
          <span key={col} className="flex flex-col gap-1.5">
            {[100, 90, 100, 60].map((w, row) => (
              <span
                key={row}
                className="block h-1.5 rounded-full bg-tile-foreground"
                style={{ inlineSize: `${w}%`, opacity: row === 0 && col === 0 ? 0.9 : 0.28 }}
              />
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}

function MarginaliaFace() {
  return (
    <svg viewBox="0 0 160 100" className="h-auto! w-full!" aria-hidden>
      <rect x="4" y="8" width="64" height="40" rx="12" fill="currentColor" opacity="0.18" />
      <rect x="92" y="54" width="64" height="40" rx="12" fill="currentColor" opacity="0.18" />
      {[18, 28, 38].map((y) => (
        <rect key={y} x="14" y={y - 2} width={y === 38 ? 26 : 44} height="4" rx="2" fill="currentColor" opacity="0.6" />
      ))}
      {[64, 74, 84].map((y) => (
        <rect key={y} x="102" y={y - 2} width={y === 84 ? 26 : 44} height="4" rx="2" fill="currentColor" opacity="0.6" />
      ))}
      <path d="M68 30 C110 30 52 74 92 74" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 5" />
      <circle cx="68" cy="30" r="5" fill="currentColor" />
      <circle cx="92" cy="74" r="5" fill="currentColor" />
    </svg>
  );
}

function PodcastsFace() {
  const bars = Array.from({ length: 28 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.9) * 62) + (i % 3) * 6);
  return (
    <span className="flex w-full items-center gap-3">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-tile-foreground text-tile-surface shadow-e1">
        <Play className="size-6! translate-x-0.5" weight="fill" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex h-12 items-center gap-[3px]" aria-hidden>
          {bars.map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-full bg-tile-foreground"
              style={{ blockSize: `${height}%`, opacity: index < 11 ? 1 : 0.3 }}
            />
          ))}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground" aria-hidden>
          <Pause className="size-3.5!" />
          <span className="h-1 flex-1 rounded-full bg-tile-foreground/20">
            <span className="block h-full w-2/5 rounded-full bg-tile-foreground" />
          </span>
        </span>
      </span>
    </span>
  );
}

function DiwanFace() {
  return (
    <span className="flex w-full flex-col items-center justify-end gap-1.5 text-center font-amiri text-tile-foreground" lang="ar">
      <span className="text-body font-bold leading-snug">قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ</span>
      <span className="flex items-center gap-2" aria-hidden>
        <span className="h-px w-8 bg-tile-foreground/40" />
        <span className="size-1.5 rounded-full bg-tile-foreground" />
        <span className="h-px w-8 bg-tile-foreground/40" />
      </span>
      <span className="text-mini font-semibold text-muted-foreground">امرؤ القيس</span>
    </span>
  );
}

function AtlasFace() {
  const cols = 14;
  const rows = 7;
  // A coarse dotted continent silhouette: the mask is drawn by distance to
  // three blob centres, so it reads as land without pretending to be a map.
  const blobs = [
    { x: 3, y: 2.5, r: 2.6 },
    { x: 7.5, y: 3, r: 2.4 },
    { x: 11, y: 4.2, r: 2.2 },
  ];
  return (
    <span className="relative flex w-full items-end">
      <svg viewBox={`0 0 ${cols * 10} ${rows * 10}`} className="h-auto! w-full!" aria-hidden>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const land = blobs.some((b) => Math.hypot(c - b.x, (r - b.y) * 1.4) < b.r);
            return <circle key={`${r}-${c}`} cx={c * 10 + 5} cy={r * 10 + 5} r="3" fill="currentColor" opacity={land ? 0.85 : 0.12} />;
          }),
        )}
      </svg>
      <span className="absolute start-[38%] top-0 flex size-9 items-center justify-center rounded-full bg-tile-foreground text-tile-surface shadow-e1">
        <MapPin className="size-4!" weight="fill" />
      </span>
    </span>
  );
}

function ChatFace({ badge }: { badge?: number }) {
  const unread = typeof badge === 'number' ? badge : 0;
  return (
    <span className="flex w-full flex-col justify-end gap-2">
      <span className="me-auto max-w-[85%] rounded-[var(--r-md)] rounded-es-sm bg-tile-foreground/12 px-3 py-2 text-mini font-semibold text-tile-foreground">
        السلام عليكم
      </span>
      <span className="ms-auto flex items-center gap-2 rounded-[var(--r-md)] rounded-ee-sm bg-tile-foreground px-3 py-2 text-mini font-bold text-tile-surface">
        {unread > 0 ? (
          <>
            <span className="tabular-nums" dir="ltr">{unread > 99 ? '99+' : unread}</span> رسالة جديدة
          </>
        ) : (
          'وعليكم السلام'
        )}
      </span>
    </span>
  );
}

function TimeLedgerFace() {
  const now = useMinuteClock();
  const text = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const day = new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <span className="flex w-full flex-col justify-end gap-2" dir="ltr">
      <DotMatrix text={text} label={`الساعة ${text}`} />
      <span className="text-end text-micro font-semibold text-muted-foreground" dir="rtl">
        {day}
      </span>
    </span>
  );
}

const CHESS_ROW = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];

function GamesFace() {
  return (
    <span className="flex w-full items-end justify-between gap-4">
      <span className="grid w-3/5 grid-cols-8 overflow-hidden rounded-[var(--r-md)]" dir="ltr" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => {
          const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          return (
            <span
              key={i}
              className={cn(
                'flex aspect-square items-center justify-center text-[0.95rem] leading-none',
                dark ? 'bg-tile-foreground text-tile-surface' : 'bg-tile-foreground/15 text-tile-foreground',
              )}
            >
              {i < 8 ? CHESS_ROW[i] : ''}
            </span>
          );
        })}
      </span>
      <span className="flex flex-col items-end gap-1.5">
        {['شطرنج', 'سودوكو', 'ذاكرة'].map((game, index) => (
          <span
            key={game}
            className={cn(
              'rounded-full px-3 py-1 text-micro font-bold',
              index === 0 ? 'bg-tile-foreground text-tile-surface' : 'bg-tile-foreground/12 text-tile-foreground',
            )}
          >
            {game}
          </span>
        ))}
      </span>
    </span>
  );
}

function CryptoFace() {
  // Pure form: candle silhouettes without axes or values.
  const candles = [
    [40, 70],
    [30, 60],
    [44, 78],
    [20, 52],
    [26, 48],
    [12, 40],
    [18, 36],
    [8, 30],
  ];
  return (
    <span className="flex w-full flex-col justify-end gap-3">
      <svg viewBox="0 0 160 84" className="h-16! w-full!" aria-hidden>
        {candles.map(([top, bottom], i) => (
          <g key={i}>
            <line x1={i * 20 + 10} y1={top - 8} x2={i * 20 + 10} y2={bottom + 8} stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
            <rect x={i * 20 + 5} y={top} width="10" height={bottom - top} rx="3" fill="currentColor" opacity={i === candles.length - 1 ? 1 : 0.55} />
          </g>
        ))}
      </svg>
      <span className="flex gap-1.5" dir="ltr" aria-hidden>
        {['BTC', 'ETH', 'SOL'].map((symbol, index) => (
          <span
            key={symbol}
            className={cn(
              'rounded-full px-2.5 py-1 text-micro font-bold tracking-wide',
              index === 0 ? 'bg-tile-foreground text-tile-surface' : 'bg-tile-foreground/12 text-tile-foreground',
            )}
          >
            {symbol}
          </span>
        ))}
      </span>
    </span>
  );
}

function FallbackFace() {
  return (
    <span className="flex w-full items-end justify-end">
      <Sparkles className="size-10! text-tile-foreground opacity-60" aria-hidden />
    </span>
  );
}

const FACES: Record<string, (props: { wide: boolean; badge?: number }) => JSX.Element> = {
  quran: QuranFace,
  dhikr: DhikrFace,
  sunnah: SunnahFace,
  mihrab: MihrabFace,
  weather: WeatherFace,
  wellness: WellnessFace,
  fitness: FitnessFace,
  journal: JournalFace,
  'german-club': GermanFace,
  knowledge: KnowledgeFace,
  pkm: PkmFace,
  reading: ReadingFace,
  marginalia: MarginaliaFace,
  podcasts: PodcastsFace,
  diwan: DiwanFace,
  atlas: AtlasFace,
  chat: ChatFace,
  'time-ledger': TimeLedgerFace,
  games: GamesFace,
  crypto: CryptoFace,
};

/** Keys that own a bespoke face — exported for the registry coverage test. */
export const FACE_KEYS = Object.keys(FACES);

export const AppTileFace = memo(function AppTileFace({ appKey, wide, badge }: AppTileFaceProps) {
  const Face = FACES[appKey] ?? FallbackFace;
  return <Face wide={wide} badge={badge} />;
});
