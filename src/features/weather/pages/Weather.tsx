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

import './weather-theme.css';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import {
  Clock,
  CloudSun,
  Layers,
  MapPin,
  RefreshCw,
  Settings,
  Sliders,
  Sun,
  Wind,
} from '@/lib/icons';

import { AQIGauge } from '../components/AQIGauge';
import { Astronomics } from '../components/Astronomics';
import { AtmosphericInsightsPanel } from '../components/AtmosphericInsightsPanel';
import CitySearch from '../components/CitySearch';
import { ConfidenceFloorBanner } from '../components/ConfidenceFloorBanner';
import { EnsembleTrustPanel } from '../components/EnsembleTrustPanel';
import { ForecastTab } from '../components/ForecastTab';
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
  compassLabel,
} from '../lib/vocabulary';
import {
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
    <div className="weather-theme min-h-dvh px-[var(--ui-gutter)] pb-page pt-4" dir="rtl" aria-busy="true">
      <h1 className="sr-only">الطقس</h1>
      <div className="weather-shell mx-auto max-w-[var(--ui-workspace-max)] p-5 sm:p-8">
        <div className="weather-skeleton-line h-8 w-40 rounded-md" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.7fr_0.85fr]">
          <div className="weather-skeleton-line min-h-[34rem] rounded-md" />
          <div className="space-y-4">
            <div className="weather-skeleton-line h-64 rounded-md" />
            <div className="weather-skeleton-line h-52 rounded-md" />
          </div>
        </div>
        <p className="sr-only">{'نقرأ الغلاف الجوي ونجمع الأرصاد…'}</p>
      </div>
    </div>
  );
}

/** What the dashboard gives the user — shown beside the no-location state so
 *  the screen explains the product instead of ending in a void. */
const WEATHER_BENEFITS = [
  {
    icon: CloudSun,
    title: 'الحالة الآن',
    body: 'درجة الحرارة، الإحساس الفعلي، المدى اليومي وحالة السماء.',
  },
  {
    icon: Clock,
    title: 'الساعات القادمة',
    body: 'توقع حراري وهطول للساعات المقبلة، مع توقيت الشروق والغروب.',
  },
  {
    icon: Wind,
    title: 'جودة الهواء والرياح',
    body: 'مؤشر تلوث الهواء، سرعة الرياح واتجاهها، وثقة الإجماع في الأرقام.',
  },
] as const;

function EmptyScreen({
  onSelectCity,
  onUseMyLocation,
}: {
  onSelectCity: (lat: number, lng: number, name: string) => void;
  onUseMyLocation: () => Promise<unknown>;
}) {
  const [requesting, setRequesting] = useState(false);

  const handleUseLocation = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      await onUseMyLocation();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="weather-theme min-h-dvh px-[var(--ui-gutter)] pb-page pt-4" dir="rtl">
      <div className="mx-auto w-full max-w-[var(--ui-workspace-max)]">
        <PageHeader title="الطقس" subtitle="لوحة الأرصاد الجوية" />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="weather-shell p-6 sm:p-8">
            <p className="text-mini font-semibold weather-copper-text">{'اختر موقعاً للبدء'}</p>
            <h2 className="type-display mt-2 text-foreground">
              {'أين تريد قراءة الطقس؟'}
            </h2>
            <p className="mt-3 max-w-prose text-body leading-relaxed text-muted-foreground">
              {'اسمح بالوصول إلى موقعك أو ابحث عن مدينتك، وسنعرض الحالة الآن، توقع الساعات القادمة، جودة الهواء والرياح — كلها في لوحة واحدة.'}
            </p>

            <div className="mt-6">
              <Button
                onClick={() => void handleUseLocation()}
                isLoading={requesting}
                loadingText={'نقرأ موقعك…'}
                className="w-full gap-2 font-bold sm:w-auto"
              >
                <MapPin className="h-4 w-4" aria-hidden />
                {'استخدم موقعي الحالي'}
              </Button>
              <p className="mt-2 text-mini leading-relaxed text-muted-foreground">
                {'لن نطلب موقعك إلا الآن. يمكنك دائماً البحث عن مدينة بدلاً من ذلك.'}
              </p>
            </div>

            <div className="my-6 flex items-center gap-3 text-micro text-muted-foreground-subtle">
              <span className="h-px flex-1 bg-border/70" aria-hidden />
              <span>{'أو ابحث عن مدينة'}</span>
              <span className="h-px flex-1 bg-border/70" aria-hidden />
            </div>

            <CitySearch onSelectCity={onSelectCity} userLocation={null} />
          </section>

          <AppCard className="p-5">
            <h2 className="text-title font-semibold text-foreground">{'ماذا تجد هنا؟'}</h2>
            <p className="mt-1 text-mini leading-relaxed text-muted-foreground">
              {'قياسات محلية دقيقة، لا أرقام عامة:'}
            </p>
            <ul className="mt-4 space-y-4">
              {WEATHER_BENEFITS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-meta font-semibold text-foreground">{title}</span>
                    <span className="mt-0.5 block text-mini leading-relaxed text-muted-foreground">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </AppCard>
        </div>
      </div>
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
    <div className="z-float app-sticky-header">
      <div className="mx-auto flex max-w-[var(--ui-workspace-max)] items-center gap-3 px-[var(--ui-gutter)] py-3">
        <BackButton />
        <div className="flex-1 min-w-0 text-center">
          {/* The h1 carries the route's identity; the place is context under
              it, so a long city name can never clip the page title. */}
          <h1 className="font-bold text-title leading-tight text-foreground">{'الطقس'}</h1>
          <p className="mt-1 truncate text-micro font-semibold text-muted-foreground">
            {name}
            <span className="mx-1 text-muted-foreground-subtle" aria-hidden>·</span>
            <span dir="ltr" className="tabular-nums">
              {Math.round(elevation)} m · {lat.toFixed(2)}, {lng.toFixed(2)}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          aria-label={'تحديث الطقس'}
        >
          <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
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

  const {
    location: deviceLoc,
    isFallback: deviceLocIsFallback,
    requestLocation,
  } = useDeviceLocation();
  const { selectedCoords, setSelectedCoords } = useWeatherLocation();
  const activeLocation = selectedCoords || deviceLoc;

  // Honest label: when geolocation is denied the app falls back to Mecca; the
  // header must say so instead of claiming "your current location".
  const locationLabel =
    selectedCoords?.name ||
    (deviceLocIsFallback ? 'مكة المكرمة · الموقع الافتراضي' : 'موقعك الحالي');

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
  if (!snapshot)
    return (
      <EmptyScreen onSelectCity={handleCitySelect} onUseMyLocation={requestLocation} />
    );

  return (
    <div dir={'rtl'} className="weather-theme min-h-dvh pb-page">
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
        name={locationLabel}
        elevation={snapshot.meta.location.elevation_m}
        lat={snapshot.meta.location.lat}
        lng={snapshot.meta.location.lng}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      <main className="px-[var(--ui-gutter)] pt-4 sm:pt-6">
        <div className="app-stack mx-auto max-w-[var(--ui-workspace-max)]">
          <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <CitySearch
              onSelectCity={handleCitySelect}
              userLocation={activeLocation ? { lat: activeLocation.lat, lng: activeLocation.lng } : null}
            />
            <p className="hidden text-mini text-muted-foreground-subtle sm:block" dir="ltr">
              {Math.round(snapshot.meta.location.elevation_m)} m · {snapshot.meta.location.lat.toFixed(2)}, {snapshot.meta.location.lng.toFixed(2)}
            </p>
          </div>

          {snapshot && <ConfidenceFloorBanner snapshot={snapshot} />}

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
                  <section className="weather-shell">
                    <WeatherHeroRefined
                      snapshot={snapshot}
                      hourly={hourly}
                      locationName={locationLabel}
                    />
                  </section>
                  <Section
                    eyebrow={'رؤية فيزيائية'}
                    title={'استنتاجات الغلاف الجوي'}
                  >
                    <AtmosphericInsightsPanel snapshot={snapshot} />
                  </Section>

                  {(forecast.minutely?.length ?? 0) > 0 && (
                    <Section eyebrow={'الدقائق الستين'} title={'نبض المطر اللحظي'}>
                      <MinutelyRainTimeline entries={forecast.minutely} locale={locale} />
                    </Section>
                  )}

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
                  <Section eyebrow={'ساعي ويومي'} title={'التوقعات المرئية'} subtitle={'حرارة · هطول · رياح'}>
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
                  <Section eyebrow={'الموقع'} title={'النطاق الجغرافي'}>
                    <MicroMap
                      lat={activeLocation?.lat ?? snapshot.meta.location.lat}
                      lng={activeLocation?.lng ?? snapshot.meta.location.lng}
                      elevationM={Math.round(snapshot.meta.location.elevation_m)}
                    />
                  </Section>
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