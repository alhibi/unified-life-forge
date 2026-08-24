import './weather-theme.css';

import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import BackButton from '@/components/BackButton';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import {
  ChevronDown,
  Cloud,
  Droplets,
  Eye,
  Layers,
  RefreshCw,
  Settings,
  Sliders,
  Sun,
  Sunrise,
  Sunset,
} from '@/lib/icons';

import { AtmosphericInsightsPanel } from '../components/AtmosphericInsightsPanel';
import CitySearch from '../components/CitySearch';
import { MinutelyRainTimeline } from '../components/MinutelyRainTimeline';
import { EnsembleTrustPanel } from '../components/EnsembleTrustPanel';
import MeteorologyConsole from '../components/MeteorologyConsole';
import MicroMap from '../components/MicroMap';
import RadarMap from '../components/RadarMap';
import WeatherPlanner from '../components/WeatherPlanner';
import WeatherWidget from '../components/WeatherWidget';
import { snapshotAllSources, type SourceHealth } from '../engine/SourceHealthMonitor';
import { useWeather } from '../hooks/useWeather';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import { describeWeatherCode, labelForWeatherCode } from '../lib/conditions';
import {
  aqiAdvice,
  aqiCategoryLabel,
  beaufortLabel,
  cloudTypeLabel,
  comfortLabel,
  compassLabel,
  uvCategoryLabel,
} from '../lib/vocabulary';
import { timeLabel } from '../lib/utils';

// Import new extracted components
import { AmbientBackdrop } from '../components/AmbientBackdrop';
import { AQIGauge } from '../components/AQIGauge';
import { Astronomics } from '../components/Astronomics';
import { DailyRangeStrip } from '../components/DailyRangeStrip';
import { ForecastTab } from '../components/ForecastTab';
import { HourlyRibbon } from '../components/HourlyRibbon';
import { LiveSunArc } from '../components/LiveSunArc';
import { PhysicalMeasurements } from '../components/PhysicalMeasurements';
import { SoilAndMicroclimate } from '../components/SoilAndMicroclimate';
import { SourceHealthPanel } from '../components/SourceHealthPanel';
import { WeatherHero } from '../components/WeatherHero';
import { WindCompass } from '../components/WindCompass';
// Import standardized panels from WeatherPanels
import { WeatherPanel, Metric as PanelMetric, GaugeTile } from '../components/WeatherPanels';

// Weather-code vocabulary lives in ../lib/conditions — the page used to carry
// its own copy of both the glyph map and the Arabic labels, which drifted from
// the widget's copy (code 80 read "زخات مطر" here and "أمطار" there).
const iconForCode = (code: number, isDay: boolean) => describeWeatherCode(code, isDay).icon;

export default function Weather() {
  // Arabic-only app (design-system §1). This was 'en-GB', which is why the
  // 7-day strip printed "Sun / Mon / Tue" and clock labels used English
  // formatting inside otherwise Arabic copy.
  const locale = 'ar';
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  
  // NEW: Four main tab groups for better organization
  const [activeMainTab, setActiveMainTab] = useState<'core' | 'forecast' | 'radar' | 'lab'>('core');

  // Use either the selected geocoded city, or fallback to the device singleton coords
  const { location: deviceLoc } = useDeviceLocation();
  const activeLocation = selectedCoords || deviceLoc;

  const { snapshot, status, tier, isRefreshing, refresh } = useWeather('ar', selectedCoords);
  const { forecast } = useWeatherForecast('ar', selectedCoords);

  const hourly = forecast.hourly.slice(0, 24);
  const currentHour = hourly[0];
  // Resolved description object (not a component factory) — avoids creating
  // a component during render and keeps the glyph lookup pure.
  const currentCondition = describeWeatherCode(
    currentHour?.weather_code ?? 0,
    currentHour?.is_day ?? true
  );
  const CurrentIcon = currentCondition.icon;

  const moonGlyph = useMemo(() => {
    const p = snapshot?.astronomical.moon_phase_name ?? 'new_moon';
    return (
      {
        new_moon: '🌑',
        waxing_crescent: '🌒',
        first_quarter: '🌓',
        waxing_gibbous: '🌔',
        full_moon: '🌕',
        waning_gibbous: '🌖',
        last_quarter: '🌗',
        waning_crescent: '🌘',
      } as const
    )[p];
  }, [snapshot]);

  const handleCitySelect = (lat: number, lng: number, name: string) => {
    setSelectedCoords({ lat, lng, name });
  };

  // NEW: Four logical tab groups
  const mainTabs = [
    { id: 'core', label: 'الأساسيات', icon: Sun, description: 'الحالة الحالية، الساعات، جودة الهواء' },
    { id: 'forecast', label: 'التوقعات', icon: Sliders, description: 'ساعي، يومي، رسوم بيانية' },
    { id: 'radar', label: 'الرياح والرادار', icon: Layers, description: 'الرياح، الرادار، القياسات الفيزيائية' },
    { id: 'lab', label: 'المختبر', icon: Settings, description: 'التخطيط، الفلك، مصادر البيانات' },
  ] as const;

  if (status === 'loading' && !snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center bg-background text-foreground">
        <span className="font-semibold text-title text-primary animate-pulse">
          {'نقرأ الغلاف الجوي ونجمع الأرصاد…'}
        </span>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center bg-background text-foreground">
        <span className="text-meta text-muted-foreground">{'تعذر تحميل بيانات الطقس.'}</span>
      </div>
    );
  }

  const conf = snapshot.meta.ensemble_confidence_percent;

  return (
    <div dir={'rtl'} className="weather-theme min-h-screen pb-page">
      <Helmet>
        <title>{'لوحة الأرصاد والطقس المتكاملة — SmartHub'}</title>
        <meta
          name="description"
          content={
            'مستكشف طقس ثوري يدمج الرادارات، محاكيات الجسيمات، مختبر الفيزياء ومخطط الأنشطة الطبي الذكي.'
          }
        />
        <link rel="canonical" href="https://amv.life/weather" />
        <meta property="og:title" content={'لوحة الأرصاد والطقس المتكاملة — SmartHub'} />
        <meta
          property="og:description"
          content={
            'مستكشف طقس ثوري يدمج الرادارات، محاكيات الجسيمات، مختبر الفيزياء ومخطط الأنشطة الطبي الذكي.'
          }
        />
        <meta property="og:url" content="https://amv.life/weather" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'لوحة الأرصاد الجوية والفيزياء',
            description:
              'مستكشف طقس ثوري يدمج الرادارات، محاكيات الجسيمات، مختبر الفيزياء ومخطط الأنشطة الطبي الذكي.',
            url: 'https://amv.life/weather',
          })}
        </script>
      </Helmet>

      {/* Sticky Header */}
      <div className="z-float border-b border-border/50 app-sticky-header">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <BackButton />
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-bold text-title leading-none text-foreground truncate">
              {selectedCoords?.name || 'لوحة الأرصاد الجوية والفيزياء'}
            </h1>
            <p
              className="mt-2.5 text-micro tracking-[0.15em] uppercase text-primary/90 font-bold tabular-nums"
              dir="ltr"
            >
              {Math.round(snapshot.meta.location.elevation_m)} m ·{' '}
              {snapshot.meta.location.lat.toFixed(2)}, {snapshot.meta.location.lng.toFixed(2)}
            </p>
          </div>
          <button
            onClick={refresh}
            aria-label={'تحديث الطقس'}
            className="w-11 h-11 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm flex items-center justify-center active:scale-[0.98] transition-transform hover:bg-card hover:border-border/80"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="px-4 pt-6 space-y-7">
        {/* Data freshness banner — accuracy means knowing the age of the reading */}
        {(snapshot.meta.is_stale || snapshot.meta.data_age_minutes >= 20) && (
          <div className="freshness-banner flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-warning/10 border border-warning/30 text-mini">
            <span className="text-foreground font-semibold">
              {snapshot.meta.is_stale
                ? `⚠️ البيانات متقادمة (${snapshot.meta.data_age_minutes} دقيقة) — يُنصح بالتحديث`
                : `عمر القراءة ${snapshot.meta.data_age_minutes} دقيقة`}
            </span>
            <button
              onClick={refresh}
              className="shrink-0 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-micro font-bold active:scale-95 transition-transform"
            >
              تحديث الآن
            </button>
          </div>
        )}

        {/* City Search Module */}
        <CitySearch onSelectCity={handleCitySelect} />

        {/* NEW: Four-group segmented control with descriptions */}
        <div className="space-y-2">
          <div className="tab-bar flex bg-background/80 backdrop-blur-md border border-border/30 p-1.5 rounded-2xl gap-1.5 sticky top-16 z-header shadow-[0_1px_3px_hsl(var(--foreground)/0.04),0_8px_24px_hsl(var(--foreground)/0.03)]">
            {mainTabs.map((t) => {
              const TabIcon = t.icon;
              const active = activeMainTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveMainTab(t.id);
                  }}
                  className={`tab-btn flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl font-bold transition-all duration-200 active:scale-95 relative overflow-hidden ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.25),0_1px_2px_hsl(var(--primary)/0.15)]'
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                  title={t.description}
                >
                  <TabIcon className="tab-icon w-4 h-4 transition-transform duration-200" />
                  <span className="text-micro leading-tight text-center truncate max-w-full">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* TAB 1: CORE - الأساسيات */}
          {activeMainTab === 'core' && (
            <motion.div
              key="core"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-7"
            >
              {/* Weather Hero — uses new extracted component */}
              <WeatherHero snapshot={snapshot} hourly={hourly} />

              {/* Physics-based inference over the live snapshot */}
              <AtmosphericInsightsPanel snapshot={snapshot} />

              {/* Provenance for the blended numbers above. */}
              <EnsembleTrustPanel snapshot={snapshot} />

              {/* Dynamic Hourly Ribbon Slider */}
              <HourlyRibbon entries={hourly} iconFor={iconForCode} locale={locale} />

              {/* Minute-by-minute precip arrival (0-60 min layer) */}
              <MinutelyRainTimeline entries={forecast.minutely} locale={locale} />

              {/* Standard Bento Tiles — using new GaugeTile */}
              <div className="card-grid-2 gap-3">
                <GaugeTile
                  label={'مؤشر UV'}
                  value={snapshot.solar.uv_index.toFixed(1)}
                  pctValue={snapshot.solar.uv_index / 11}
                  hint={uvCategoryLabel(snapshot.solar.uv_category)}
                  icon={<Sun />}
                />
                <GaugeTile
                  label={'الرطوبة النسبية'}
                  value={Math.round(snapshot.moisture.relative_humidity_percent)}
                  unit="%"
                  pctValue={snapshot.moisture.relative_humidity_percent / 100}
                  hint={`رطوبة نوعية ${Math.round(snapshot.moisture.specific_humidity_gkg)}g/kg`}
                  icon={<Droplets />}
                />
                <GaugeTile
                  label={'تغطية الغيوم'}
                  value={Math.round(snapshot.sky.cloud_cover_total_percent)}
                  unit="%"
                  pctValue={snapshot.sky.cloud_cover_total_percent / 100}
                  hint={cloudTypeLabel(snapshot.sky.cloud_type)}
                  icon={<Cloud />}
                />
                <GaugeTile
                  label={'مدى الرؤية الأفقية'}
                  value={Math.round(snapshot.sky.visibility_km)}
                  unit="كم"
                  pctValue={Math.min(1, snapshot.sky.visibility_km / 20)}
                  icon={<Eye />}
                />
              </div>

              {/* Real Air Quality Indicator (AQI) with pollutant meters */}
              <AQIGauge
                caqi={snapshot.airQuality.aqi_eu_caqi}
                pm25={snapshot.airQuality.pm25_ugm3}
                pm10={snapshot.airQuality.pm10_ugm3}
                o3={snapshot.airQuality.o3_ugm3}
                no2={snapshot.airQuality.no2_ugm3}
                so2={snapshot.airQuality.so2_ugm3}
                co={snapshot.airQuality.co_mgm3}
                advisory={aqiAdvice(snapshot.airQuality.aqi_us)}
                healthScore={snapshot.biological.outdoor_health_score}
                source={snapshot.airQuality.source_station_name}
              />

              {/* Live Sun trajectory */}
              <LiveSunArc
                sunrise={snapshot.astronomical.sunrise}
                sunset={snapshot.astronomical.sunset}
                elevationDeg={snapshot.solar.solar_elevation_deg}
                azimuthDeg={snapshot.solar.solar_azimuth_deg}
                dayLengthH={snapshot.astronomical.day_length_hours}
                locale={locale}
              />
            </motion.div>
          )}

          {/* TAB 2: FORECAST - التوقعات */}
          {activeMainTab === 'forecast' && (
            <motion.div
              key="forecast"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-7"
            >
              {/* NEW Component: MicroMap Dark Live Map */}
              <MicroMap
                lat={activeLocation?.lat ?? snapshot.meta.location.lat}
                lng={activeLocation?.lng ?? snapshot.meta.location.lng}
                elevationM={Math.round(snapshot.meta.location.elevation_m)}
              />

              {/* NEW: ForecastTab with sub-tabs */}
              <ForecastTab
                hourly={hourly}
                daily={forecast.daily}
                iconFor={iconForCode}
                locale={locale}
              />

              {/* Soil and Microclimatology */}
              <SoilAndMicroclimate snapshot={snapshot} />
            </motion.div>
          )}

          {/* TAB 3: RADAR - الرياح والرادار */}
          {activeMainTab === 'radar' && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-7"
            >
              {/* Live Wind Compass & Dynamics */}
              <WindCompass
                speed={snapshot.wind.speed_kph}
                gusts={snapshot.wind.gusts_kph}
                dirDeg={snapshot.wind.direction_deg}
                cardinal={compassLabel(snapshot.wind.direction_cardinal_16pt, true)}
                beaufort={beaufortLabel(snapshot.wind.beaufort_scale)}
              />

              {/* NEW Component: Realtime Particle simulator & interactive radar */}
              <RadarMap
                pastTimestamps={snapshot.radar.past_timestamps}
                futureTimestamps={snapshot.radar.future_timestamps}
                tileTemplate={snapshot.radar.tile_url_template}
                windSpeedKph={snapshot.wind.speed_kph}
                windDirectionDeg={snapshot.wind.direction_deg}
                precipIntensity={snapshot.precipitation.intensity_mm_hr}
                weatherCode={currentHour?.weather_code ?? 0}
              />

              {/* Classic details panel - now using PhysicalMeasurements component */}
              <PhysicalMeasurements snapshot={snapshot} />
            </motion.div>
          )}

          {/* TAB 4: LAB - المختبر */}
          {activeMainTab === 'lab' && (
            <motion.div
              key="lab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-7"
            >
              {/* NEW Component: Smart Weather Planner & Medical Advisories */}
              <WeatherPlanner
                aqiUs={snapshot.airQuality.aqi_us}
                uvIndex={snapshot.solar.uv_index}
                humidityPercent={snapshot.moisture.relative_humidity_percent}
                temperatureC={snapshot.temperature.actual_c}
                pollenRisk={snapshot.biological.pollen_risk}
                solarElevationDeg={snapshot.solar.solar_elevation_deg}
              />

              {/* NEW Component: Physics Meteorology Calculator simulator */}
              <MeteorologyConsole />

              {/* Astronomics and Lunar stats - now using Astronomics component */}
              <Astronomics
                snapshot={snapshot}
                locale={locale}
                moonGlyph={moonGlyph}
              />

              {/* 12 sources management console - now using SourceHealthPanel component */}
              <SourceHealthPanel />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="divider-subtle" />
        <footer className="page-footer text-center text-micro tracking-[0.18em] uppercase text-primary/70 tabular-nums" dir="ltr">
          {tier ?? 'fresh'} · {timeLabel(snapshot.meta.last_updated_unix, locale)} ·{' '}
          {snapshot.meta.fetch_duration_ms}ms
        </footer>
      </main>
    </div>
  );
}