import { useMemo, useState } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  CloudRainWind,
  Droplet,
  Droplets,
  Wind,
  Flag,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Tooltip,
} from 'recharts';

/**
 * WeatherForecast — a fully self-contained, hard-coded 7-day forecast UI.
 *
 * Three stacked sections:
 *   1. a horizontally-scrollable 8-day strip (today + 7 ahead) with
 *      thermometer capsules, high/low temps, weather glyphs and rain %;
 *   2. a "Next 7 days" 2-column grid of colour-coded insight cards;
 *   3. a tabbed set of detailed metric charts (recharts) — one banner +
 *      one chart per metric.
 *
 * No external data source — everything is hard-coded below to match the
 * reference design. Dark theme only.
 */

// ── Data model ─────────────────────────────────────────────────────────────

interface DayForecast {
  date: string; // "2025-05-30"
  dayLabel: string; // "Sat"
  dateLabel: string; // "5/30"
  tempHigh: number; // Celsius
  tempLow: number; // Celsius
  rainPercent: number; // 0–100
  weatherIcon: 'sunny' | 'cloudy' | 'rainy' | 'partly-cloudy' | 'heavy-rain';
  uvIndex: number;
  gustsKmh: number;
  windKmh: number;
  humidity: number; // percent
  pressureHpa: number;
  cloudinessPercent: number;
  precipitationMm: number;
}

const FORECAST: DayForecast[] = [
  { date: '2025-05-29', dayLabel: 'Fri', dateLabel: '5/29', tempHigh: 29, tempLow: 11, rainPercent: 100, weatherIcon: 'rainy',         uvIndex: 6.8, gustsKmh: 43, windKmh: 21, humidity: 45, pressureHpa: 1024, cloudinessPercent: 11,  precipitationMm: 1 },
  { date: '2025-05-30', dayLabel: 'Sat', dateLabel: '5/30', tempHigh: 28, tempLow: 14, rainPercent: 100, weatherIcon: 'rainy',         uvIndex: 6.9, gustsKmh: 31, windKmh: 18, humidity: 55, pressureHpa: 1019, cloudinessPercent: 65,  precipitationMm: 17 },
  { date: '2025-05-31', dayLabel: 'Sun', dateLabel: '5/31', tempHigh: 23, tempLow: 14, rainPercent: 100, weatherIcon: 'cloudy',        uvIndex: 5.5, gustsKmh: 45, windKmh: 24, humidity: 72, pressureHpa: 1013, cloudinessPercent: 100, precipitationMm: 9 },
  { date: '2025-06-01', dayLabel: 'Mon', dateLabel: '6/1',  tempHigh: 21, tempLow: 11, rainPercent: 0,   weatherIcon: 'partly-cloudy', uvIndex: 5.2, gustsKmh: 34, windKmh: 16, humidity: 57, pressureHpa: 1017, cloudinessPercent: 44,  precipitationMm: 0 },
  { date: '2025-06-02', dayLabel: 'Tue', dateLabel: '6/2',  tempHigh: 21, tempLow: 13, rainPercent: 100, weatherIcon: 'rainy',         uvIndex: 3.2, gustsKmh: 18, windKmh: 11, humidity: 77, pressureHpa: 1010, cloudinessPercent: 97,  precipitationMm: 4 },
  { date: '2025-06-03', dayLabel: 'Wed', dateLabel: '6/3',  tempHigh: 19, tempLow: 12, rainPercent: 80,  weatherIcon: 'rainy',         uvIndex: 2.0, gustsKmh: 36, windKmh: 23, humidity: 77, pressureHpa: 1012, cloudinessPercent: 91,  precipitationMm: 2 },
  { date: '2025-06-04', dayLabel: 'Thu', dateLabel: '6/4',  tempHigh: 21, tempLow: 11, rainPercent: 40,  weatherIcon: 'cloudy',        uvIndex: 3.0, gustsKmh: 42, windKmh: 25, humidity: 47, pressureHpa: 1014, cloudinessPercent: 99,  precipitationMm: 2 },
  { date: '2025-06-05', dayLabel: 'Fri', dateLabel: '6/5',  tempHigh: 28, tempLow: 9,  rainPercent: 0,   weatherIcon: 'cloudy',        uvIndex: 3.0, gustsKmh: 35, windKmh: 16, humidity: 54, pressureHpa: 1013, cloudinessPercent: 11,  precipitationMm: 1 },
];

/** "Today" per the reference design (Sat 5/30). The slot immediately before
 *  it (Fri 5/29) gets a subtler highlight. */
const TODAY_DATE = '2025-05-30';

// ── Theme tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: '#0D0D0F',
  card: '#1A1A1F',
  cardToday: '#2A2A31', // highlighted "today" column / cards
  cardAdjacent: '#202027', // subtle highlight for the day before today
  border: 'rgba(255,255,255,0.08)',
  white: '#FFFFFF',
  muted: '#8A8A93',
  tempHot: '#FF7A45', // high temp ≥ 25°
  tempLow: '#4ADE80', // low temp (always green)
  rain: '#4DA3FF', // rain probability when > 0
  violet: '#5B4FDB', // active tab pill
  // metric colours
  uvHigh: '#F97316',
  uvMed: '#FACC15',
  uvLow: '#4ADE80',
  precipBar: '#6CB4EE',
  gustLine: '#FFFFFF',
  windLine: '#7C6FF0',
  humidityBar: '#2DD4BF',
  pressureLine: '#B7A8F5',
  cloudBar: '#7A7A85',
} as const;

// Hide scrollbars without a global utility (component is fully standalone).
const NO_SCROLLBAR = '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_FULL: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const WEATHER_ICON: Record<DayForecast['weatherIcon'], LucideIcon> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  'partly-cloudy': CloudSun,
  'heavy-rain': CloudRainWind,
};

const iconTint = (icon: DayForecast['weatherIcon']) =>
  icon === 'sunny' || icon === 'partly-cloudy' ? '#FBBF24' : C.muted;

/** Find the day with the max value for `key`; ties resolve to the earliest. */
function peak<K extends keyof DayForecast>(key: K) {
  return FORECAST.reduce((best, d) => ((d[key] as number) > (best[key] as number) ? d : best), FORECAST[0]);
}

// ── Section 1 — 8-day strip ────────────────────────────────────────────────

function DayStrip() {
  const globalMax = useMemo(() => Math.max(...FORECAST.map((d) => d.tempHigh)), []);
  const globalMin = useMemo(() => Math.min(...FORECAST.map((d) => d.tempLow)), []);
  const span = Math.max(1, globalMax - globalMin);
  const TRACK = 120; // px

  const todayIdx = FORECAST.findIndex((d) => d.date === TODAY_DATE);

  return (
    <div className={`-mx-4 overflow-x-auto px-4 ${NO_SCROLLBAR}`}>
      <div className="flex gap-2">
        {FORECAST.map((d, i) => {
          const Icon = WEATHER_ICON[d.weatherIcon];
          const isToday = d.date === TODAY_DATE;
          const isAdjacent = i === todayIdx - 1;

          const topPx = ((globalMax - d.tempHigh) / span) * TRACK;
          const botPx = ((d.tempLow - globalMin) / span) * TRACK;
          const capsuleH = Math.max(6, TRACK - topPx - botPx);

          return (
            <div
              key={d.date}
              className="flex w-[70px] shrink-0 flex-col items-center rounded-2xl px-1 py-3"
              style={{
                backgroundColor: isToday
                  ? C.cardToday
                  : isAdjacent
                    ? C.cardAdjacent
                    : 'transparent',
                boxShadow: isToday ? `inset 0 0 0 1px ${C.border}` : undefined,
              }}
            >
              {/* Day + date */}
              <span className="text-[13px] font-semibold leading-tight text-white">{d.dayLabel}</span>
              <span className="mb-2 text-[11px]" style={{ color: C.muted }}>
                {d.dateLabel}
              </span>

              {/* High temp */}
              <span
                className="mb-1.5 text-[15px] font-bold tabular-nums"
                style={{ color: d.tempHigh >= 25 ? C.tempHot : C.white }}
              >
                {d.tempHigh}°
              </span>

              {/* Thermometer capsule */}
              <div className="relative w-[10px]" style={{ height: TRACK }}>
                <div
                  className="absolute left-0 right-0 rounded-full"
                  style={{ top: topPx, height: capsuleH, backgroundColor: '#43434C' }}
                />
              </div>

              {/* Low temp */}
              <span className="mt-1.5 text-[15px] font-bold tabular-nums" style={{ color: C.tempLow }}>
                {d.tempLow}°
              </span>

              {/* Weather icon */}
              <Icon className="mt-3 h-6 w-6" strokeWidth={1.7} style={{ color: iconTint(d.weatherIcon) }} />

              {/* Rain probability */}
              <span
                className="mt-1.5 text-[12px] font-medium tabular-nums"
                style={{ color: d.rainPercent > 0 ? C.rain : C.muted }}
              >
                {d.rainPercent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 2 — "Next 7 days" summary cards ─────────────────────────────────

interface SummaryCard {
  key: string;
  label: string;
  Icon: LucideIcon;
  bg: string;
  fg: string;
  iconColor: string;
}

function buildSummaryCards(): SummaryCard[] {
  const uv = peak('uvIndex');
  const gust = peak('gustsKmh');
  const wind = peak('windKmh');
  const humidity = peak('humidity');
  const cloud = peak('cloudinessPercent');
  const totalRain = Math.round(FORECAST.reduce((s, d) => s + d.precipitationMm, 0));

  return [
    {
      key: 'uv',
      label: `High UV index (${uv.uvIndex}) ${DAY_FULL[uv.dayLabel]}`,
      Icon: Sun,
      bg: '#E8632A',
      fg: C.white,
      iconColor: C.white,
    },
    {
      key: 'rain',
      label: `${totalRain} mm rain expected`,
      Icon: Droplet,
      bg: 'rgba(135,206,235,0.7)',
      fg: '#0B1320',
      iconColor: '#0B1320',
    },
    {
      key: 'gusts',
      label: `Gusts up to ${gust.gustsKmh} km/h ${DAY_FULL[gust.dayLabel]}`,
      Icon: Flag,
      bg: C.card,
      fg: C.white,
      iconColor: C.white,
    },
    {
      key: 'wind',
      label: `Wind up to ${wind.windKmh} km/h ${DAY_FULL[wind.dayLabel]}`,
      Icon: Wind,
      bg: C.card,
      fg: C.white,
      iconColor: C.white,
    },
    {
      key: 'humidity',
      label: `High humidity ${DAY_FULL[humidity.dayLabel]} (${humidity.humidity}%)`,
      Icon: Droplets,
      bg: C.card,
      fg: C.white,
      iconColor: C.white,
    },
    {
      key: 'pressure',
      label: 'Air pressure in normal range',
      Icon: Gauge,
      bg: C.card,
      fg: C.white,
      iconColor: C.white,
    },
    {
      key: 'cloud',
      label: `Heavily cloudy ${DAY_FULL[cloud.dayLabel]} (${cloud.cloudinessPercent}%)`,
      Icon: Cloud,
      bg: '#D4D4DA',
      fg: '#0B1320',
      iconColor: '#0B1320',
    },
  ];
}

function SummaryGrid() {
  const cards = useMemo(buildSummaryCards, []);
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[20px] font-bold text-white">Next 7 days</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div
            key={c.key}
            className="flex items-start justify-between gap-2 rounded-[20px] p-4"
            style={{
              backgroundColor: c.bg,
              border: c.bg === C.card ? `1px solid ${C.border}` : '1px solid transparent',
            }}
          >
            <span className="flex-1 text-[13.5px] font-medium leading-snug" style={{ color: c.fg }}>
              {c.label}
            </span>
            <c.Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.9} style={{ color: c.iconColor }} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section 3 — Tabbed metric charts ────────────────────────────────────────

type TabId =
  | 'cloudiness'
  | 'humidity'
  | 'pressure'
  | 'gusts'
  | 'wind'
  | 'uv'
  | 'precipitation';

interface Banner {
  text: string;
  bg: string;
  fg: string;
}

interface TabDef {
  id: TabId;
  label: string;
  emoji: string;
}

const TABS: TabDef[] = [
  { id: 'cloudiness', label: 'Cloudiness', emoji: '☁️' },
  { id: 'humidity', label: 'Humidity', emoji: '💧' },
  { id: 'pressure', label: 'Pressure (hPa)', emoji: '🎯' },
  { id: 'gusts', label: 'Gusts (km/h)', emoji: '🚩' },
  { id: 'wind', label: 'Wind (km/h)', emoji: '〰️' },
  { id: 'uv', label: 'UV index', emoji: '☀️' },
  { id: 'precipitation', label: 'Precipitation', emoji: '💧' },
];

// X-axis labels shared by every chart.
const CHART_DATA = FORECAST.map((d) => ({
  day: d.dayLabel,
  cloudiness: d.cloudinessPercent,
  humidity: d.humidity,
  pressure: d.pressureHpa,
  gusts: d.gustsKmh,
  wind: d.windKmh,
  uv: d.uvIndex,
  precipitation: d.precipitationMm,
}));

const uvBarColor = (v: number) => (v >= 6 ? C.uvHigh : v >= 3 ? C.uvMed : C.uvLow);

const UV_TICKS = [1, 4, 6.5, 9, 11.5];
const UV_TICK_LABEL: Record<number, string> = {
  1: 'Low',
  4: 'Medium',
  6.5: 'High',
  9: 'Very high',
  11.5: 'Extreme',
};

const PRESSURE_TICKS = [1010, 1017, 1024];
const PRESSURE_TICK_LABEL: Record<number, string> = {
  1010: 'Low',
  1017: 'Medium',
  1024: 'High',
};

const axisTick = { fill: C.muted, fontSize: 11 };
const GRID_STROKE = 'rgba(255,255,255,0.08)';

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-[12px]"
      style={{ backgroundColor: '#000', border: `1px solid ${C.border}`, color: C.white }}
    >
      <span style={{ color: C.muted }}>{label}: </span>
      <span className="font-semibold tabular-nums">
        {payload[0].value}
        {unit}
      </span>
    </div>
  );
}

function buildBanner(id: TabId): Banner {
  const uv = peak('uvIndex');
  const gust = peak('gustsKmh');
  const wind = peak('windKmh');
  const humidity = peak('humidity');
  const cloud = peak('cloudinessPercent');
  const totalRain = Math.round(FORECAST.reduce((s, d) => s + d.precipitationMm, 0));

  switch (id) {
    case 'precipitation':
      return { text: `${totalRain} mm rain expected`, bg: '#2B7FD4', fg: C.white };
    case 'uv':
      return { text: `UV index up to ${uv.uvIndex} (high) on ${DAY_FULL[uv.dayLabel]}`, bg: '#E8632A', fg: C.white };
    case 'gusts':
      return { text: `Gusts up to ${gust.gustsKmh} km/h on ${DAY_FULL[gust.dayLabel]}`, bg: C.card, fg: C.white };
    case 'wind':
      return { text: `Wind up to ${wind.windKmh} km/h on ${DAY_FULL[wind.dayLabel]}`, bg: C.card, fg: C.white };
    case 'humidity':
      return { text: `High humidity on ${DAY_FULL[humidity.dayLabel]} up to ${humidity.humidity}%`, bg: C.card, fg: C.white };
    case 'pressure':
      return { text: 'Air pressure in normal range', bg: C.card, fg: C.white };
    case 'cloudiness':
      return {
        text: `Heavily cloudy on ${DAY_FULL[cloud.dayLabel]} with up to ${cloud.cloudinessPercent}% coverage`,
        bg: '#D4D4DA',
        fg: '#0B1320',
      };
  }
}

function MetricChart({ id }: { id: TabId }) {
  const gridProps = {
    vertical: false,
    horizontal: true,
    strokeDasharray: '4 4',
    stroke: GRID_STROKE,
  } as const;

  switch (id) {
    case 'precipitation':
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 24]}
              ticks={[0, 6, 12, 18, 24]}
              tickFormatter={(v) => `${v}mm`}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip unit="mm" />} />
            <Bar dataKey="precipitation" fill={C.precipBar} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'uv':
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 12]}
              ticks={UV_TICKS}
              tickFormatter={(v) => UV_TICK_LABEL[v] ?? ''}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={66}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip unit="" />} />
            <Bar dataKey="uv" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {CHART_DATA.map((d) => (
                <Cell key={d.day + d.uv} fill={uvBarColor(d.uv)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'humidity':
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip unit="%" />} />
            <Bar dataKey="humidity" fill={C.humidityBar} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'cloudiness':
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip unit="%" />} />
            <Bar dataKey="cloudiness" fill={C.cloudBar} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'gusts':
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={CHART_DATA} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 60]}
              ticks={[0, 15, 30, 45, 60]}
              tickFormatter={(v) => `${v}`}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip unit=" km/h" />} />
            <Line
              type="monotone"
              dataKey="gusts"
              stroke={C.gustLine}
              strokeWidth={2}
              dot={{ r: 3, fill: C.gustLine, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'wind':
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={CHART_DATA} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 50]}
              ticks={[0, 10, 20, 30, 40, 50]}
              tickFormatter={(v) => `${v}`}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip unit=" km/h" />} />
            <Line
              type="monotone"
              dataKey="wind"
              stroke={C.windLine}
              strokeWidth={2}
              dot={{ r: 3, fill: C.windLine, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'pressure':
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={CHART_DATA} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              domain={[1010, 1024]}
              ticks={PRESSURE_TICKS}
              tickFormatter={(v) => PRESSURE_TICK_LABEL[v] ?? ''}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={58}
            />
            <Tooltip content={<ChartTooltip unit=" hPa" />} />
            <Line
              type="monotone"
              dataKey="pressure"
              stroke={C.pressureLine}
              strokeWidth={2}
              dot={{ r: 3, fill: C.pressureLine, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      );
  }
}

function MetricTabs() {
  const [active, setActive] = useState<TabId>('precipitation');
  const banner = useMemo(() => buildBanner(active), [active]);

  return (
    <section className="mt-9">
      {/* Tab bar */}
      <div className={`-mx-4 overflow-x-auto px-4 ${NO_SCROLLBAR}`}>
        <div className="flex gap-2">
          {TABS.map((t) => {
            const on = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors"
                style={{
                  backgroundColor: on ? C.violet : 'transparent',
                  color: on ? C.white : C.muted,
                  border: on ? '1px solid transparent' : `1px solid ${C.border}`,
                }}
                aria-pressed={on}
              >
                <span aria-hidden>{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Insight banner */}
      <div
        className="mt-4 rounded-[16px] px-4 py-3.5 text-[15px] font-semibold"
        style={{ backgroundColor: banner.bg, color: banner.fg, border: banner.bg === C.card ? `1px solid ${C.border}` : undefined }}
      >
        {banner.text}
      </div>

      {/* Chart */}
      <div className="mt-3 rounded-[16px] p-3 pr-2" style={{ backgroundColor: C.card }}>
        <MetricChart id={active} />
      </div>
    </section>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function WeatherForecast() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: C.bg }}>
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <h1 className="mb-5 text-[24px] font-bold text-white">7-Day Forecast</h1>
        <DayStrip />
        <SummaryGrid />
        <MetricTabs />
      </div>
    </div>
  );
}
