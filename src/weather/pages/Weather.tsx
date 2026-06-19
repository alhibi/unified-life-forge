// Weather Hub — the Atmospheric Intelligence dashboard.
//
// Aesthetic: near-black surfaces, restrained gold (#C9A84C), Cormorant
// Garamond display + Montserrat body, "every metric earns its place".
//
// Layered design:
//   • Hero — apparent temp, comfort label, ensemble confidence.
//   • Now strip — humidity / wind / pressure / UV / dew / wet bulb.
//   • Atmospheric — VPD, pressure tendency, cloud cover stack.
//   • Air & Health — AQI gauge, pollen, outdoor health.
//   • Solar & Astronomy — UV, golden hour, moon phase, day length.
//   • Hourly chart (next 24h).
//   • Daily 7-day strip.
//   • Source ensemble panel — per-source health + outlier list.
//   • Footer — last updated, refresh.

import { useEffect, useMemo, useState } from 'react';
import BackButton from '@/components/BackButton';
import { Helmet } from 'react-helmet-async';
import { useWeather } from '../hooks/useWeather';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import { snapshotAllSources, type SourceHealth } from '../engine/SourceHealthMonitor';
import {
  Activity, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow,
  Cloudy, Droplets, Eye, Gauge, MoonStar, RefreshCw, Sun, Wind,
} from '@/lib/icons';

// ── Design tokens (local — restrained gold on near-black) ─────────────────
const T = {
  bg: '#0A0A0A',
  surface: '#141414',
  surfaceAlt: '#0e0e0e',
  border: '#1f1f1f',
  gold: '#C9A84C',
  goldMuted: '#8B6914',
  text: '#F5F0E8',
  textMuted: '#8A8A8A',
  danger: '#C0392B',
  warning: '#E67E22',
  good: '#27AE60',
} as const;

function iconForCode(code: number, isDay: boolean) {
  if (code <= 1)                  return isDay ? Sun : MoonStar;
  if (code === 2)                 return Cloudy;
  if (code === 3)                 return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57)   return CloudDrizzle;
  if (code >= 61 && code <= 67)   return CloudRain;
  if (code >= 71 && code <= 77)   return CloudSnow;
  if (code >= 80 && code <= 82)   return CloudRain;
  if (code >= 85 && code <= 86)   return CloudSnow;
  if (code >= 95)                 return CloudLightning;
  return isDay ? Sun : MoonStar;
}

// ── Generic primitives ─────────────────────────────────────────────────────

function Panel({ title, children, sub }: { title?: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: T.border, background: T.surface }}>
      {title && (
        <header className="mb-3 flex items-end justify-between">
          <h2 className="font-cormorant text-lg leading-none" style={{ color: T.text }}>{title}</h2>
          {sub && <span className="text-[10px] font-montserrat tracking-widest uppercase" style={{ color: T.goldMuted }}>{sub}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

function Metric({ label, value, unit, hint }: { label: string; value: string | number; unit?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-montserrat tracking-[0.18em] uppercase" style={{ color: T.textMuted }}>{label}</span>
      <span className="font-cormorant text-2xl leading-none" style={{ color: T.text }}>
        {value}{unit && <span className="text-sm font-montserrat ml-1" style={{ color: T.goldMuted }}>{unit}</span>}
      </span>
      {hint && <span className="text-[10px] font-montserrat" style={{ color: T.textMuted }}>{hint}</span>}
    </div>
  );
}

// ── AQI Gauge — 0..500 ribbon with marker ─────────────────────────────────

function AQIGauge({ aqi, category }: { aqi: number; category: string }) {
  const pct = Math.max(0, Math.min(100, (aqi / 300) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-cormorant text-4xl" style={{ color: T.text }}>{aqi}</span>
        <span className="text-[10px] font-montserrat tracking-[0.2em] uppercase" style={{ color: T.gold }}>{category.replace(/_/g, ' ')}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full overflow-hidden relative" style={{ background: T.border }}>
        <div className="absolute inset-y-0 left-0 right-0"
          style={{ background: 'linear-gradient(90deg, #27AE60 0%, #E5C100 33%, #E67E22 50%, #C0392B 75%, #6A1B9A 100%)' }} />
        <div className="absolute top-[-3px] w-0.5 h-2.5 bg-white" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Sparkline for hourly temp ──────────────────────────────────────────────

function HourlyChart({ entries }: { entries: { timestamp_unix: number; temperature_c: number; precip_probability_percent: number }[] }) {
  const slice = entries.slice(0, 24);
  if (slice.length === 0) return null;
  const temps = slice.map(e => e.temperature_c);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = Math.max(1, max - min);
  const w = 320, h = 80, step = w / (slice.length - 1);
  const path = slice.map((e, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((e.temperature_c - min) / range) * h}`).join(' ');

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg viewBox={`0 0 ${w} ${h + 32}`} width="100%" height="120" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={T.gold} strokeWidth={1.25} />
        {slice.map((e, i) => (
          <g key={e.timestamp_unix}>
            <circle cx={i * step} cy={h - ((e.temperature_c - min) / range) * h} r={1.5} fill={T.gold} />
            {i % 3 === 0 && (
              <text x={i * step} y={h + 14} fill={T.textMuted} fontSize="8" textAnchor="middle" fontFamily="Montserrat">
                {new Date(e.timestamp_unix).getHours()}h
              </text>
            )}
            {i % 3 === 0 && (
              <text x={i * step} y={h + 26} fill={T.goldMuted} fontSize="7" textAnchor="middle" fontFamily="Montserrat">
                {Math.round(e.temperature_c)}°
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Daily strip ────────────────────────────────────────────────────────────

function DailyStrip({ days }: { days: { date_unix: number; high_c: number; low_c: number; weather_code: number; day_quality_score: number; precip_probability_percent: number }[] }) {
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.slice(0, 7).map((d, i) => {
        const Icon = iconForCode(d.weather_code, true);
        return (
          <div key={d.date_unix} className="flex flex-col items-center gap-1 py-2 rounded-lg" style={{ background: T.surfaceAlt }}>
            <span className="text-[10px] font-montserrat" style={{ color: T.textMuted }}>
              {i === 0 ? 'Today' : dayNames[new Date(d.date_unix).getDay()]}
            </span>
            <Icon className="w-4 h-4" style={{ color: T.gold }} strokeWidth={1.25} />
            <div className="font-cormorant text-sm leading-none" style={{ color: T.text }}>{Math.round(d.high_c)}°</div>
            <div className="text-[10px] font-montserrat" style={{ color: T.textMuted }}>{Math.round(d.low_c)}°</div>
            <div className="text-[9px] font-montserrat" style={{ color: T.goldMuted }}>{d.day_quality_score}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Source health table ────────────────────────────────────────────────────

function SourceHealthPanel() {
  const [rows, setRows] = useState<SourceHealth[]>([]);
  useEffect(() => {
    const tick = () => setRows(snapshotAllSources());
    tick();
    const id = window.setInterval(tick, 5_000);
    const onRefresh = () => tick();
    window.addEventListener('weather:refreshed', onRefresh);
    return () => { window.clearInterval(id); window.removeEventListener('weather:refreshed', onRefresh); };
  }, []);
  return (
    <Panel title="Source Ensemble" sub={`${rows.filter(r => r.state === 'closed').length}/${rows.length} healthy`}>
      <div className="space-y-1.5">
        {rows.map(r => {
          const stateColor = r.state === 'closed' ? T.good : r.state === 'half_open' ? T.warning : T.danger;
          return (
            <div key={r.id} className="flex items-center justify-between text-xs font-montserrat">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stateColor }} />
                <span className="truncate" style={{ color: T.text }}>{r.label}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] tracking-wide" style={{ color: T.textMuted }}>
                <span>w {r.effectiveWeight.toFixed(2)}</span>
                <span>{r.avgResponseMs}ms</span>
                <span style={{ color: r.errorRate24h > 10 ? T.warning : T.textMuted }}>
                  {r.errorRate24h.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function Weather() {
  const { snapshot, status, tier, isRefreshing, refresh } = useWeather('ar');
  const { forecast } = useWeatherForecast('ar');

  const elevation = useMemo(() => snapshot?.meta.location.elevation_m ?? 0, [snapshot]);
  const moonGlyph = useMemo(() => {
    const p = snapshot?.astronomical.moon_phase_name ?? 'new_moon';
    return ({ new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓', waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖', last_quarter: '🌗', waning_crescent: '🌘' } as const)[p];
  }, [snapshot]);

  if (status === 'loading' && !snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center" style={{ background: T.bg }}>
        <span className="font-cormorant text-2xl" style={{ color: T.gold }}>Reading the sky…</span>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center" style={{ background: T.bg }}>
        <span className="font-montserrat text-sm" style={{ color: T.textMuted }}>Atmospheric data unavailable.</span>
      </div>
    );
  }

  const ApparentIcon = iconForCode(forecast.hourly[0]?.weather_code ?? 0, forecast.hourly[0]?.is_day ?? true);
  const confidence = snapshot.meta.ensemble_confidence_percent;
  const conf_color = confidence > 85 ? T.good : confidence > 60 ? T.warning : T.danger;

  return (
    <div className="min-h-screen pb-24" style={{ background: T.bg, color: T.text, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <Helmet>
        <title>Atmospheric Intelligence — Weather</title>
        <meta name="description" content="A precise, source-agnostic weather observation engine." />
      </Helmet>

      <div className="sticky top-0 z-20 backdrop-blur-md" style={{ background: 'rgba(10,10,10,0.85)', borderBottom: `1px solid ${T.border}` }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <BackButton />
          <div className="flex-1">
            <h1 className="font-cormorant text-xl leading-none" style={{ color: T.text }}>Atmospheric Intelligence</h1>
            <p className="text-[10px] tracking-[0.2em] uppercase mt-0.5" style={{ color: T.goldMuted }}>
              {snapshot.meta.location.lat.toFixed(2)}, {snapshot.meta.location.lng.toFixed(2)} · {Math.round(elevation)} m
            </p>
          </div>
          <button onClick={refresh} aria-label="Refresh" className="p-2 rounded-full" style={{ color: T.gold }}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* HERO */}
        <section className="rounded-2xl border overflow-hidden" style={{ borderColor: T.border, background: 'linear-gradient(160deg, #141414, #0a0a0a)' }}>
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: T.goldMuted }}>
                  {snapshot.temperature.thermal_comfort_level.replace(/_/g, ' ')}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="font-cormorant text-7xl leading-none" style={{ color: T.text }}>
                    {Math.round(snapshot.temperature.actual_c)}°
                  </span>
                  <span className="font-cormorant text-2xl" style={{ color: T.goldMuted }}>
                    /{Math.round(snapshot.temperature.apparent_c)}°
                  </span>
                </div>
                <p className="mt-1 text-xs font-montserrat" style={{ color: T.textMuted }}>
                  H {Math.round(snapshot.temperature.daily_high_c)}°  ·  L {Math.round(snapshot.temperature.daily_low_c)}°
                  {snapshot.temperature.anomaly_vs_30yr_avg_c !== 0 && (
                    <span className="ml-2" style={{ color: snapshot.temperature.anomaly_vs_30yr_avg_c > 0 ? T.warning : T.good }}>
                      {snapshot.temperature.anomaly_vs_30yr_avg_c > 0 ? '+' : ''}
                      {snapshot.temperature.anomaly_vs_30yr_avg_c}° vs 30yr
                    </span>
                  )}
                </p>
              </div>
              <ApparentIcon className="w-14 h-14" style={{ color: T.gold }} strokeWidth={1} />
            </div>

            <div className="mt-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: conf_color }} />
              <span className="text-[10px] tracking-[0.18em] uppercase font-montserrat" style={{ color: T.textMuted }}>
                Ensemble confidence {confidence}%
                {snapshot.meta.models_outlier.length > 0 && ` · ${snapshot.meta.models_outlier.length} outlier`}
              </span>
            </div>
          </div>
        </section>

        {/* NOW STRIP */}
        <Panel title="Right now" sub={`${snapshot.meta.sources_responded}/${snapshot.meta.sources_queried} sources`}>
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            <Metric label="Humidity"    value={snapshot.moisture.relative_humidity_percent} unit="%" />
            <Metric label="Dew Point"   value={Math.round(snapshot.temperature.dew_point_c)} unit="°" />
            <Metric label="Wet Bulb"    value={Math.round(snapshot.temperature.wet_bulb_c)} unit="°" />
            <Metric label="Wind"        value={Math.round(snapshot.wind.speed_kph)} unit="kph" hint={snapshot.wind.direction_cardinal_16pt} />
            <Metric label="Gusts"       value={Math.round(snapshot.wind.gusts_kph)} unit="kph" hint={snapshot.wind.beaufort_description} />
            <Metric label="Pressure"    value={Math.round(snapshot.pressure.msl_hpa)} unit="hPa" hint={snapshot.pressure.tendency_label.split(' — ')[0]} />
            <Metric label="UV"          value={snapshot.solar.uv_index.toFixed(1)} hint={snapshot.solar.uv_category} />
            <Metric label="Cloud"       value={snapshot.sky.cloud_cover_total_percent} unit="%" hint={snapshot.sky.cloud_type} />
            <Metric label="Visibility"  value={Math.round(snapshot.sky.visibility_km)} unit="km" />
          </div>
        </Panel>

        {/* ATMOSPHERIC INTELLIGENCE */}
        <Panel title="Atmospheric science" sub="derived">
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <Metric label="VPD"          value={snapshot.moisture.vapor_pressure_deficit_kpa.toFixed(2)} unit="kPa" hint="vapor pressure deficit" />
            <Metric label="Abs. Humidity" value={snapshot.moisture.absolute_humidity_gm3.toFixed(1)} unit="g/m³" />
            <Metric label="Discomfort"   value={snapshot.temperature.discomfort_index.toFixed(1)} hint="Thom DI" />
            <Metric label="Cloud Base"   value={snapshot.sky.cloud_base_m ?? '—'} unit={snapshot.sky.cloud_base_m ? 'm' : ''} />
            {snapshot.instability.cape_jkg !== null && (
              <Metric label="CAPE" value={Math.round(snapshot.instability.cape_jkg)} unit="J/kg" hint="convective potential" />
            )}
            {snapshot.instability.lifted_index !== null && (
              <Metric label="Lifted Index" value={snapshot.instability.lifted_index.toFixed(1)} hint="stability" />
            )}
          </div>
        </Panel>

        {/* AIR & HEALTH */}
        <Panel title="Air & health" sub={snapshot.airQuality.source_station_name ? `station: ${snapshot.airQuality.source_station_name}` : 'modeled'}>
          <AQIGauge aqi={snapshot.airQuality.aqi_us} category={snapshot.airQuality.aqi_category} />
          <div className="mt-4 grid grid-cols-3 gap-y-3 gap-x-2">
            <Metric label="PM2.5"  value={snapshot.airQuality.pm25_ugm3.toFixed(1)} unit="µg" />
            <Metric label="PM10"   value={snapshot.airQuality.pm10_ugm3.toFixed(1)} unit="µg" />
            <Metric label="O₃"     value={snapshot.airQuality.o3_ugm3.toFixed(1)} unit="µg" />
            <Metric label="NO₂"    value={snapshot.airQuality.no2_ugm3.toFixed(1)} unit="µg" />
            <Metric label="SO₂"    value={snapshot.airQuality.so2_ugm3.toFixed(1)} unit="µg" />
            <Metric label="CO"     value={snapshot.airQuality.co_mgm3.toFixed(2)} unit="mg" />
          </div>
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs font-montserrat" style={{ borderColor: T.border }}>
            <span style={{ color: T.textMuted }}>{snapshot.airQuality.health_advisory}</span>
            <span style={{ color: T.gold }}>health {snapshot.biological.outdoor_health_score}/100</span>
          </div>
        </Panel>

        {/* SOLAR & ASTRONOMY */}
        <Panel title="Solar & astronomy">
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            <Metric label="Sunrise" value={new Date(snapshot.astronomical.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
            <Metric label="Solar Noon" value={new Date(snapshot.astronomical.solar_noon).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
            <Metric label="Sunset" value={new Date(snapshot.astronomical.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
            <Metric label="Day Length" value={snapshot.astronomical.day_length_hours.toFixed(1)} unit="h" />
            <Metric label="Sun Alt" value={snapshot.solar.solar_elevation_deg.toFixed(0)} unit="°" hint={`azimuth ${snapshot.solar.solar_azimuth_deg.toFixed(0)}°`} />
            <Metric label="GHI" value={Math.round(snapshot.solar.ghi_wm2)} unit="W/m²" />
            <Metric label="UV Max" value={snapshot.solar.uv_max_today.toFixed(1)} />
            {snapshot.solar.burn_time_skin_type_2_min && (
              <Metric label="Burn II" value={snapshot.solar.burn_time_skin_type_2_min} unit="min" />
            )}
            <Metric label="Moon" value={`${moonGlyph} ${snapshot.astronomical.moon_illumination_percent.toFixed(0)}%`} hint={snapshot.astronomical.moon_phase_name.replace(/_/g, ' ')} />
          </div>
          <div className="mt-4 pt-3 border-t text-[10px] font-montserrat tracking-widest uppercase" style={{ borderColor: T.border, color: T.goldMuted }}>
            Golden hour · {new Date(snapshot.astronomical.golden_hour_evening_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–{new Date(snapshot.astronomical.golden_hour_evening_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </Panel>

        {/* HOURLY */}
        {forecast.hourly.length > 0 && (
          <Panel title="Next 24 hours" sub="ensemble">
            <HourlyChart entries={forecast.hourly} />
          </Panel>
        )}

        {/* DAILY */}
        {forecast.daily.length > 0 && (
          <Panel title="Seven days" sub="quality score">
            <DailyStrip days={forecast.daily} />
          </Panel>
        )}

        {/* MARINE — only if available */}
        {snapshot.marine.available && (
          <Panel title="Marine conditions">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Wave H"    value={(snapshot.marine.wave_height_m ?? 0).toFixed(1)} unit="m" />
              <Metric label="Wave Period" value={(snapshot.marine.wave_period_s ?? 0).toFixed(1)} unit="s" />
              <Metric label="Sea Temp"  value={(snapshot.marine.sea_surface_temp_c ?? 0).toFixed(1)} unit="°" />
              <Metric label="Sea State" value={snapshot.marine.beaufort_sea_state ?? '—'} hint={snapshot.marine.beaufort_sea_description ?? ''} />
            </div>
          </Panel>
        )}

        {/* SOURCE HEALTH */}
        <SourceHealthPanel />

        {/* FOOTER */}
        <footer className="pt-2 pb-6 text-center text-[10px] font-montserrat tracking-[0.2em] uppercase" style={{ color: T.goldMuted }}>
          updated {new Date(snapshot.meta.last_updated_unix).toLocaleTimeString()} · {tier ?? 'fresh'} · {snapshot.meta.fetch_duration_ms}ms
        </footer>
      </div>
    </div>
  );
}
