// ============================================================================
// Weather — the page that orchestrates the entire feature.
//
// This file used to lay out 23 components in four flat `space-y-7` lists,
// each tab indistinguishable from the others. The new layout introduces a
// proper information hierarchy:
//
//   HEADER (sticky)
//     ├── location + coords
//     └── refresh
//
//   HERO (variant=hero) — primary tier: current temperature + condition.
//
//   CORE TAB
//     ├── ConfidenceFloorBanner (when degraded/unreliable)
//     ├── Hero's tertiary metrics grid (now inside hero)
//     ├── AtmosphericInsightsPanel
//     ├── HourlyRibbon
//     ├── MinutelyRainTimeline
//     ├── Bento 4-tile grid (UV, humidity, cloud, visibility)
//     ├── AQI Gauge
//     ├── LiveSunArc
//     └── EnsembleTrustPanel
//
//   FORECAST TAB
//     ├── MicroMap
//     ├── ForecastTab (hourly / daily sub-tabs)
//     └── SoilAndMicroclimate
//
//   RADAR TAB
//     ├── WindCompass
//     ├── RadarMap
//     └── PhysicalMeasurements
//
//   LAB TAB
//     ├── WeatherPlanner
//     ├── MeteorologyConsole
//     ├── Astronomics
//     ├── VerificationPanel (new in this revision)
//     └── SourceHealthPanel
//
// The new tab system is TabNavigation with a sliding pill. Each tab pane
// uses motion-presets.tab + a staggered container so children fade in one
// after another when the tab mounts.
//
// Why a brand new file rather than editing Weather.tsx in place:
//   • The old file mixed layout, copy, and orchestration. Splitting concerns
//     is easier than untangling 435 lines of mixed responsibilities.
//   • The new structure exposes the layout clearly — every section is a
//     named function, easy to reorder, easy to A/B test.
// ============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import BackButton from '@/components/BackButton';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import {
  Cloud,
  Droplets,
  Eye,
  Layers,
  RefreshCw,
  Settings,
  Sliders,
  Sun,
} from '@/lib/icons';

import { AQIGauge } from '../components/AQIGauge';
import { Astronomics } from '../components/Astronomics';
import { AtmosphericInsightsPanel } from '../components/AtmosphericInsightsPanel';
import CitySearch from '../components/CitySearch';
import { ConfidenceFloorBanner } from '../components/ConfidenceFloorBanner';
import { EnsembleTrustPanel } from '../components/EnsembleTrustPanel';
import { ForecastTab } from '../components/ForecastTab';
import { GaugeTileRefined } from '../components/GaugeTileRefined';
import { HourlyRibbon } from '../components/HourlyRibbon';
import { LiveSunArc } from '../components/LiveSunArc';
import MeteorologyConsole from '../components/MeteorologyConsole';
import MicroMap from '../components/MicroMap';
import { MinutelyRainTimeline } from '../components/MinutelyRainTimeline';
import { PhysicalMeasurements } from '../components/PhysicalMeasurements';
import RadarMap from '../components/RadarMap';
import { SectionHeader } from '../components/SectionHeader';
import { SoilAndMicroclimate } from '../components/SoilAndMicroclimate';
import { SourceHealthPanel } from '../components/SourceHealthPanel';
import { type TabDef,TabNavigation } from '../components/TabNavigation';
import { VerificationPanel } from '../components/VerificationPanel';
import { WeatherHeroRefined } from '../components/WeatherHeroRefined';
import WeatherPlanner from '../components/WeatherPlanner';
import { WindCompass } from '../components/WindCompass';
import { useWeatherLocation } from '../context/WeatherLocationContext';
import { useWeather } from '../hooks/useWeather';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import { describeWeatherCode } from '../lib/conditions';
import {
  aqiAdvice,
  beaufortLabel,
  cloudTypeLabel,
  compassLabel,
  uvCategoryLabel,
} from '../lib/vocabulary';
import {
  duration,
  easing,
  motionPresets,
  tabContentVariants,
} from '../lib/weather-motion';

type TabId = 'core' | 'forecast' | 'radar' | 'lab';

const TABS: readonly TabDef[] = [
  { id: 'core',     label: 'الأساسيات',     description: 'الحالة، الساعات، الجودة', icon: <Sun /> },
  { id: 'forecast', label: 'التوقعات',       description: 'ساعي، يومي، مناخ',       icon: <Sliders /> },
  { id: 'radar',    label: 'الرياح والرادار', description: 'الرياح، الرادار، فيزياء', icon: <Layers /> },
  { id: 'lab',      label: 'المختبر',        description: 'تخطيط، فلك، مصادر',       icon: <Settings /> },
] as const;

const iconForCode = (code: number, isDay: boolean) => describeWeatherCode(code, isDay).icon;

function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
      <div className="text-center space-y-3">
        <div className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse mx-auto" />
        <p className="font-semibold text-title text-primary">
          {'نقرأ الغلاف الجوي ونجمع الأرصاد…'}
        </p>
      </div>
    </div>
  );
}

function EmptyScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
      <p className="text-meta text-muted-foreground">{'تعذر تحميل بيانات الطقس.'}</p>
    </div>
  );
}

function StickyHeader({
  name,
  elevation,
  lat,
  lng,
  onRefresh,
  isRefreshing,
}: {
  name: string;
  elevation: number;
  lat: number;
  lng: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="z-float border-b border-border/40 backdrop-blur-md bg-background/80 app-sticky-header">
      <div className="px-4 py-3 flex items-center gap-3">
        <BackButton />
        <div className="flex-1 min-w-0 text-center">
          <h1 className="font-bold text-title leading-none text-foreground truncate">
            {name}
          </h1>
          <p
            className="mt-1.5 text-micro tracking-[0.18em] uppercase text-primary/85 font-bold tabular-nums"
            dir="ltr"
          >
            {Math.round(elevation)} m · {lat.toFixed(2)}, {lng.toFixed(2)}
          </p>
        </div>
        <button
          onClick={onRefresh}
          aria-label={'تحديث الطقس'}
          className="w-11 h-11 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm flex items-center justify-center active:scale-[0.97] transition-transform hover:bg-card hover:border-border/80"
        >
          <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function BentoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {children}
    </div>
  );
}

function TabPane({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={motionPresets.staggerContainer}
      className="space-y-7"
    >
      {children}
    </motion.div>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={motionPresets.staggerItem} className="space-y-3">
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {children}
    </motion.section>
  );
}

export default function Weather() {
  const locale = 'ar';
  const [activeMainTab, setActiveMainTab] = useState<TabId>('core');

  const { location: deviceLoc } = useDeviceLocation();
  const { selectedCoords, setSelectedCoords } = useWeatherLocation();
  const activeLocation = selectedCoords || deviceLoc;

  const { snapshot, status, tier, isRefreshing, refresh, dataAgeMinutes } =
    useWeather('ar', selectedCoords);
  const { forecast } = useWeatherForecast('ar', selectedCoords);

  const hourly = forecast.hourly.slice(0, 24);

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

  if (status === 'loading' && !snapshot) return <LoadingScreen />;
  if (!snapshot) return <EmptyScreen />;

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

      <StickyHeader
        name={selectedCoords?.name || 'لوحة الأرصاد الجوية والفيزياء'}
        elevation={snapshot.meta.location.elevation_m}
        lat={snapshot.meta.location.lat}
        lng={snapshot.meta.location.lng}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      <main className="px-4 pt-6">
        <div className="space-y-6">
          <CitySearch
            onSelectCity={handleCitySelect}
            userLocation={activeLocation ? { lat: activeLocation.lat, lng: activeLocation.lng } : null}
          />

          {snapshot && <ConfidenceFloorBanner snapshot={snapshot} />}

          <WeatherHeroRefined snapshot={snapshot} hourly={hourly} />

          <TabNavigation<TabId>
            tabs={TABS}
            activeTab={activeMainTab}
            onChange={setActiveMainTab}
          />

          <AnimatePresence mode="wait">
            {activeMainTab === 'core' && (
              <motion.div
                key="core"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TabPane>
                  <Section
                    eyebrow={'رؤية فيزيائية'}
                    title={'استنتاجات الغلاف الجوي'}
                  >
                    <AtmosphericInsightsPanel snapshot={snapshot} />
                  </Section>

                  <Section
                    eyebrow={'ساعات قادمة'}
                    title={'خط الزمن القريب'}
                  >
                    <HourlyRibbon entries={hourly} iconFor={iconForCode} locale={locale} />
                  </Section>

                  {(forecast.minutely?.length ?? 0) > 0 && (
                    <Section eyebrow={'الدقائق الستين'} title={'نبض المطر اللحظي'}>
                      <MinutelyRainTimeline entries={forecast.minutely} locale={locale} />
                    </Section>
                  )}

                  <Section eyebrow={'بطلاقات متساوية'} title={'المقاييس الأساسية'}>
                    <BentoGrid>
                      <GaugeTileRefined
                        label={'مؤشر UV'}
                        value={snapshot.solar.uv_index.toFixed(1)}
                        pctValue={snapshot.solar.uv_index / 11}
                        hint={uvCategoryLabel(snapshot.solar.uv_category)}
                        icon={<Sun />}
                      />
                      <GaugeTileRefined
                        label={'الرطوبة النسبية'}
                        value={Math.round(snapshot.moisture.relative_humidity_percent)}
                        unit="٪"
                        pctValue={snapshot.moisture.relative_humidity_percent / 100}
                        hint={`رطوبة نوعية ${Math.round(snapshot.moisture.specific_humidity_gkg)} g/kg`}
                        icon={<Droplets />}
                      />
                      <GaugeTileRefined
                        label={'تغطية الغيوم'}
                        value={Math.round(snapshot.sky.cloud_cover_total_percent)}
                        unit="٪"
                        pctValue={snapshot.sky.cloud_cover_total_percent / 100}
                        hint={cloudTypeLabel(snapshot.sky.cloud_type)}
                        icon={<Cloud />}
                      />
                      <GaugeTileRefined
                        label={'مدى الرؤية'}
                        value={Math.round(snapshot.sky.visibility_km)}
                        unit="كم"
                        pctValue={Math.min(1, snapshot.sky.visibility_km / 20)}
                        hint={
                          snapshot.sky.visibility_km < 5
                            ? 'رؤية منخفضة'
                            : snapshot.sky.visibility_km < 10
                              ? 'رؤية متوسطة'
                              : 'رؤية ممتازة'
                        }
                        icon={<Eye />}
                      />
                    </BentoGrid>
                  </Section>

                  <Section eyebrow={'جودة الهواء'} title={'تركيز الملوثات'}>
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
                  </Section>

                  <Section eyebrow={'مسار الشمس'} title={'القوس الضوئي اليومي'}>
                    <LiveSunArc
                      sunrise={snapshot.astronomical.sunrise}
                      sunset={snapshot.astronomical.sunset}
                      elevationDeg={snapshot.solar.solar_elevation_deg}
                      azimuthDeg={snapshot.solar.solar_azimuth_deg}
                      dayLengthH={snapshot.astronomical.day_length_hours}
                      locale={locale}
                    />
                  </Section>

                  <Section eyebrow={'مصدر الأرقام'} title={'ثقة الإجماع'}>
                    <EnsembleTrustPanel snapshot={snapshot} />
                  </Section>
                </TabPane>
              </motion.div>
            )}

            {activeMainTab === 'forecast' && (
              <motion.div
                key="forecast"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TabPane>
                  <Section eyebrow={'الخريطة'} title={'موقعك الدقيق'}>
                    <MicroMap
                      lat={activeLocation?.lat ?? snapshot.meta.location.lat}
                      lng={activeLocation?.lng ?? snapshot.meta.location.lng}
                      elevationM={Math.round(snapshot.meta.location.elevation_m)}
                    />
                  </Section>

                  <Section eyebrow={'ساعي ويومي'} title={'منحنى التوقع'}>
                    <ForecastTab
                      hourly={hourly}
                      daily={forecast.daily}
                      iconFor={iconForCode}
                      locale={locale}
                    />
                  </Section>

                  <Section eyebrow={'تحت السطح'} title={'التربة والمناخ المحلي'}>
                    <SoilAndMicroclimate snapshot={snapshot} />
                  </Section>
                </TabPane>
              </motion.div>
            )}

            {activeMainTab === 'radar' && (
              <motion.div
                key="radar"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TabPane>
                  <Section eyebrow={'اتجاه وسرعة'} title={'بوصلة الرياح'}>
                    <WindCompass
                      speed={snapshot.wind.speed_kph}
                      gusts={snapshot.wind.gusts_kph}
                      dirDeg={snapshot.wind.direction_deg}
                      cardinal={compassLabel(snapshot.wind.direction_cardinal_16pt, true)}
                      beaufort={beaufortLabel(snapshot.wind.beaufort_scale)}
                    />
                  </Section>

                  <Section eyebrow={'رادار'} title={'محاكي الجسيمات الحية'}>
                    <RadarMap
                      pastTimestamps={snapshot.radar.past_timestamps}
                      futureTimestamps={snapshot.radar.future_timestamps}
                      tileTemplate={snapshot.radar.tile_url_template}
                      windSpeedKph={snapshot.wind.speed_kph}
                      windDirectionDeg={snapshot.wind.direction_deg}
                      precipIntensity={snapshot.precipitation.intensity_mm_hr}
                      weatherCode={hourly[0]?.weather_code ?? 0}
                    />
                  </Section>

                  <Section eyebrow={'فيزياء'} title={'القياسات الفيزيائية'}>
                    <PhysicalMeasurements snapshot={snapshot} />
                  </Section>
                </TabPane>
              </motion.div>
            )}

            {activeMainTab === 'lab' && (
              <motion.div
                key="lab"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TabPane>
                  <Section eyebrow={'نصائح'} title={'المخطط الطبي للأنشطة'}>
                    <WeatherPlanner
                      aqiUs={snapshot.airQuality.aqi_us}
                      uvIndex={snapshot.solar.uv_index}
                      humidityPercent={snapshot.moisture.relative_humidity_percent}
                      temperatureC={snapshot.temperature.actual_c}
                      pollenRisk={snapshot.biological.pollen_risk}
                      solarElevationDeg={snapshot.solar.solar_elevation_deg}
                    />
                  </Section>

                  <Section eyebrow={'محاكاة'} title={'مختبر المعادلات المترولوجية'}>
                    <MeteorologyConsole />
                  </Section>

                  <Section eyebrow={'سماء'} title={'الفلك والأقمار'}>
                    <Astronomics snapshot={snapshot} locale={locale} moonGlyph={moonGlyph} />
                  </Section>

                  <Section eyebrow={'تدقيق'} title={'لوحة التحقق الفعلي'}>
                    <VerificationPanel
                      lat={snapshot.meta.location.lat}
                      lng={snapshot.meta.location.lng}
                    />
                  </Section>

                  <Section eyebrow={'بنية'} title={'إدارة المصادر والأوزان'}>
                    <SourceHealthPanel />
                  </Section>
                </TabPane>
              </motion.div>
            )}
          </AnimatePresence>

          <footer
            className="mt-10 pt-4 border-t border-border/25 text-center text-micro tracking-[0.22em] uppercase text-primary/65 font-bold tabular-nums"
            dir="ltr"
          >
            {tier ?? 'fresh'} · {dataAgeMinutes} دقيقة · {snapshot.meta.fetch_duration_ms}ms
          </footer>
        </div>
      </main>
    </div>
  );
}