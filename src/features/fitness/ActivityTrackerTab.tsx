import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Info,
  MapPin,
  Play,
  Trash2,
} from '@/lib/icons';

import { deleteFitnessActivity, insertFitnessActivity } from './api';
import { FullActivityMap } from './FullActivityMap';
import { HealthConnectCard } from './HealthConnectCard';
import { LiveSessionPanel } from './LiveSessionPanel';
import { RouteThumbnail } from './RouteThumbnail';
import { dayKey } from './stats';
import { StatsPanel } from './StatsPanel';
import type { FitnessActivity, RoutePoint } from './types';
import { estimateCalories,useActivityTracking } from './useActivityTracking';

export default function ActivityTrackerTab() {
  // Real-time track state & activity helpers
  const {
    activities,
    dailyMetrics,
    loading,
    permissionState,
    isTracking,
    trackingSource,
    activityType,
    route,
    distanceMeters,
    calories,
    durationSeconds,
    isPaused,
    autoPaused,
    currentPaceSecPerKm,
    avgPaceSecPerKm,
    gpsAccuracy,
    splits,
    elevationGain,
    togglePause,
    autoDetectEnabled,
    motionState,
    accelMagnitude,
    secondsSustained,
    isSimulated,
    toggleAutoDetect,
    startTracking,
    stopTracking,
    requestLocationPermission,
    setIsSimulated,
    simulateMotion,
    triggerSimulatedTick,
    refresh,
  } = useActivityTracking();

  // Active view states
  const [selectedActivity, setSelectedActivity] = useState<FitnessActivity | null>(null);
  const [showPermissionRationale, setShowPermissionRationale] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showManualLog, setShowManualLog] = useState(false);

  // Manual Log Form State
  const [manualType, setManualType] = useState<'walking' | 'running'>('walking');
  const [manualDistance, setManualDistance] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualHeartRate, setManualHeartRate] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Dark theme reactive state
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return (
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark'
      );
    };
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => obs.disconnect();
  }, []);

  // Compute CSS colors for chart styling based on active theme
  const colors = useMemo(() => {
    // Olive primary accent: HSL '100 25% 42%' (light) / '100 25% 65%' (dark)
    const primaryColor = isDark ? 'hsl(100, 25%, 65%)' : 'hsl(100, 25%, 42%)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    const textFill = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    return { primaryColor, gridColor, textFill };
  }, [isDark]);

  // Summary Metrics (Today's performance) — device metrics win over GPS estimates.
  const todaySummary = useMemo(() => {
    const todayStr = dayKey(new Date());
    const deviceToday = dailyMetrics.find((m) => m.date === todayStr);

    // Default high-precision baseline values for general physical life
    let steps = 0;
    let distanceKm = 0;
    let calories = 0;
    let heartRate = 0;

    if (deviceToday) {
      steps = Math.round(deviceToday.steps || 0);
      distanceKm = Math.round(((deviceToday.distance_meters || 0) / 1000) * 10) / 10;
      calories = Math.round(deviceToday.calories || 0);
      heartRate = Math.round(deviceToday.avg_heart_rate || 0);
    }

    // Filter sessions recorded today
    const todayActivities = activities.filter(
      (a) => dayKey(a.start_time) === todayStr
    );

    if (todayActivities.length > 0 && !deviceToday) {
      const sessionDist = todayActivities.reduce((sum, a) => sum + (a.distance_meters || 0), 0);
      const sessionCals = todayActivities.reduce((sum, a) => sum + (a.calories || 0), 0);

      steps += Math.round(sessionDist / 0.75);
      distanceKm = Math.round((distanceKm + sessionDist / 1000) * 10) / 10;
      calories = Math.round(calories + sessionCals);

      // Compute weighted average heart rate if registered, ignore missing values
      let validHrCount = 0;
      const hrSum = todayActivities.reduce((sum, a) => {
        if (a.avg_heart_rate) {
          validHrCount++;
          return sum + a.avg_heart_rate;
        }
        return sum;
      }, 0);
      if (validHrCount > 0) {
        heartRate = Math.round(hrSum / validHrCount);
      }
    }

    return { steps, distanceKm, calories, heartRate };
  }, [activities, dailyMetrics]);

  // Request location permission flow
  const handlePermissionRequest = async () => {
    setShowPermissionRationale(false);
    const granted = await requestLocationPermission();
    if (granted) {
      toast.success('تم تفعيل إذن الموقع الجغرافي بنجاح');
    } else {
      toast.error('لم يتم منح إذن الوصول للموقع الجغرافي');
    }
  };

  const handleStartManual = async (type: 'walking' | 'running') => {
    if (permissionState !== 'granted') {
      setShowPermissionRationale(true);
      return;
    }
    await startTracking('manual', type);
    toast.success('بدء تتبع النشاط فوري');
  };

  const handleStopManual = async () => {
    await stopTracking();
    toast.success('تم حفظ النشاط بنجاح في السحابة');
  };

  // Submit hand-logged Manual Activity
  const handleAddManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const distanceVal = parseFloat(manualDistance);
    const durationVal = parseInt(manualDuration);
    const heartRateVal = parseInt(manualHeartRate) || null;

    if (!distanceVal || distanceVal <= 0) {
      toast.error('الرجاء إدخال مسافة صحيحة');
      return;
    }
    if (!durationVal || durationVal <= 0) {
      toast.error('الرجاء إدخال مدة صحيحة');
      return;
    }

    // Estimate calories based on age-weight metabolic formulas
    const estimatedCals = estimateCalories(manualType, durationVal * 60, 75);

    try {
      // Build dummy minimal coordinate route to keep system aligned
      const dummyRoute: RoutePoint[] = [
        { lat: 24.7136, lng: 46.6753, timestamp: Date.now() },
        { lat: 24.7142, lng: 46.6761, timestamp: Date.now() + durationVal * 60000 },
      ];

      await insertFitnessActivity({
        activity_type: manualType,
        source: 'manual',
        start_time: new Date(manualDate).toISOString(),
        end_time: new Date(new Date(manualDate).getTime() + durationVal * 60000).toISOString(),
        duration_seconds: durationVal * 60,
        distance_meters: distanceVal * 1000,
        calories: estimatedCals,
        avg_heart_rate: heartRateVal,
        route: dummyRoute,
      });

      toast.success('تم تسجيل النشاط اليدوي بنجاح');
      setShowManualLog(false);
      // Reset form fields
      setManualDistance('');
      setManualDuration('');
      setManualHeartRate('');
      refresh();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ النشاط');
      console.error(err);
    }
  };


  return (
    <div
      className="space-y-6"
      style={{
        '--fitness-primary': isDark ? '100 25% 65%' : '100 25% 42%',
      } as React.CSSProperties}
    >
      <AnimatePresence mode="wait">
        {selectedActivity ? (
          /* ================= SCREEN 2: ACTIVITY DETAIL SCREEN ================= */
          <motion.div
            key="detail-screen"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-4 pt-1"
          >
            {/* Header / Nav Target with 44x44px Touch Mechanics */}
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <button
                onClick={() => setSelectedActivity(null)}
                className="w-11 h-11 -ms-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active-tactile relative before:absolute before:-inset-2 before:content-['']"
                aria-label="الرجوع للقائمة"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="text-center flex-1">
                <h2 className="text-[0.9375rem] font-bold text-foreground">
                  {selectedActivity.activity_type === 'running' ? 'جري خارجي' : 'مشي خارجي'}
                </h2>
                <span className="text-[0.625rem] text-muted-foreground Montserrat">
                  {new Date(selectedActivity.start_time).toLocaleDateString('ar-SA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[0.5625rem] font-semibold border ${
                  selectedActivity.source === 'auto'
                    ? 'bg-[hsl(var(--fitness-primary)/0.1)] text-[hsl(var(--fitness-primary))] border-[hsl(var(--fitness-primary)/0.2)]'
                    : 'bg-muted/40 text-muted-foreground border-border/40'
                }`}
              >
                {selectedActivity.source === 'auto' ? 'كشف تلقائي' : 'تسجيل يدوي'}
              </span>
            </div>

            {/* Map Canvas */}
            <div className="overflow-hidden rounded-section border border-border/40">
              <FullActivityMap activity={selectedActivity} height={280} />
            </div>

            {/* Metrics Instrument Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div className="border-r border-border/30 px-3 py-1">
                <span className="text-[0.5625rem] text-muted-foreground/80 block">المسافة</span>
                <span className="text-xl font-bold text-foreground Montserrat tabular-nums leading-none">
                  {Math.round(((selectedActivity.distance_meters || 0) / 1000) * 100) / 100}
                  <span className="text-[0.625rem] font-normal text-muted-foreground ms-1">كم</span>
                </span>
              </div>
              <div className="border-r border-border/30 px-3 py-1">
                <span className="text-[0.5625rem] text-muted-foreground/80 block">المدة الزمنية</span>
                <span className="text-xl font-bold text-foreground Montserrat tabular-nums leading-none">
                  {Math.round((selectedActivity.duration_seconds || 0) / 60)}
                  <span className="text-[0.625rem] font-normal text-muted-foreground ms-1">دقيقة</span>
                </span>
              </div>
              <div className="border-r border-border/30 px-3 py-1">
                <span className="text-[0.5625rem] text-muted-foreground/80 block">معدل السرعة</span>
                <span className="text-xl font-bold text-foreground Montserrat tabular-nums leading-none">
                  {selectedActivity.duration_seconds && selectedActivity.distance_meters
                    ? ((selectedActivity.distance_meters / selectedActivity.duration_seconds) * 3.6).toFixed(1)
                    : '0.0'}
                  <span className="text-[0.625rem] font-normal text-muted-foreground ms-1">كم/س</span>
                </span>
              </div>
              <div className="border-r border-border/30 px-3 py-1">
                <span className="text-[0.5625rem] text-muted-foreground/80 block">السعرات</span>
                <span className="text-xl font-bold text-foreground Montserrat tabular-nums leading-none">
                  {Math.round(selectedActivity.calories || 0)}
                  <span className="text-[0.625rem] font-normal text-muted-foreground ms-1">سعرة</span>
                </span>
              </div>
              <div className="border-r border-border/30 px-3 py-1 col-span-2 md:col-span-1">
                <span className="text-[0.5625rem] text-muted-foreground/80 block">نبضات القلب</span>
                <span className="text-xl font-bold text-foreground Montserrat tabular-nums leading-none">
                  {selectedActivity.avg_heart_rate || '--'}
                  <span className="text-[0.625rem] font-normal text-muted-foreground ms-1">ن/د</span>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 flex gap-3">
              <button
                onClick={async () => {
                  try {
                    await deleteFitnessActivity(selectedActivity.id);
                    toast.success('تم حذف النشاط بنجاح');
                    setSelectedActivity(null);
                    refresh();
                  } catch {
                    toast.error('حدث خطأ أثناء حذف النشاط');
                  }
                }}
                className="flex-1 h-10 rounded-input border border-destructive/30 hover:border-destructive/60 bg-destructive/5 text-destructive text-[0.6875rem] font-bold inline-flex items-center justify-center gap-1.5 active-tactile transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف هذا السجل
              </button>
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex-[2] h-10 rounded-input border border-border/40 hover:bg-muted/10 text-foreground text-[0.6875rem] font-bold inline-flex items-center justify-center active-tactile transition-all"
              >
                العودة إلى السجل العام
              </button>
            </div>
          </motion.div>
        ) : (
          /* ================= SCREEN 1: FITNESS HOME SCREEN ================= */
          <motion.div
            key="home-screen"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-6"
          >
            {/* Health Connect / HealthKit sync */}
            <HealthConnectCard onSynced={refresh} />

            {/* Header Summary: Restrained Typographic Stat Blocks (No heavy icon-cards) */}
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-4 gap-2 border-b border-border/30 pb-4">
                <div className="flex flex-col text-start">
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground Montserrat tabular-nums tracking-tight leading-none">
                    {todaySummary.steps.toLocaleString('en-US')}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground/80 tracking-wide mt-1.5 font-medium">
                    خطوة اليوم
                  </span>
                </div>
                <div className="flex flex-col text-start border-r border-border/20 ps-3">
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground Montserrat tabular-nums tracking-tight leading-none">
                    {todaySummary.distanceKm.toFixed(1)}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground/80 tracking-wide mt-1.5 font-medium">
                    المسافة (كم)
                  </span>
                </div>
                <div className="flex flex-col text-start border-r border-border/20 ps-3">
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground Montserrat tabular-nums tracking-tight leading-none">
                    {todaySummary.calories}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground/80 tracking-wide mt-1.5 font-medium">
                    السعرات (سعرة)
                  </span>
                </div>
                <div className="flex flex-col text-start border-r border-border/20 ps-3">
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground Montserrat tabular-nums tracking-tight leading-none">
                    {todaySummary.heartRate}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground/80 tracking-wide mt-1.5 font-medium">
                    متوسط النبض (ن/د)
                  </span>
                </div>
              </div>
            </div>

            {/* Analytics: range summary, trends, streaks and records */}
            <StatsPanel
              activities={activities}
              metrics={dailyMetrics}
              accent={colors.primaryColor}
            />

            {/* GPS Tracker Live Panel or Action Triggers */}
            <AnimatePresence mode="wait">
              {isTracking ? (
                <LiveSessionPanel
                  activityType={activityType}
                  trackingSource={trackingSource}
                  route={route}
                  distanceMeters={distanceMeters}
                  durationSeconds={durationSeconds}
                  calories={calories}
                  currentPaceSecPerKm={currentPaceSecPerKm}
                  avgPaceSecPerKm={avgPaceSecPerKm}
                  gpsAccuracy={gpsAccuracy}
                  elevationGain={elevationGain}
                  splits={splits}
                  isPaused={isPaused}
                  autoPaused={autoPaused}
                  onTogglePause={togglePause}
                  onStop={handleStopManual}
                />
              ) : (
                /* Primary Actions Grid */
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1.5">
                    <button
                      onClick={() => handleStartManual('walking')}
                      className="h-12 rounded-button bg-[hsl(var(--fitness-primary))] hover:opacity-90 text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active-tactile transition-all"
                    >
                      <Play className="w-4 h-4" />
                      بدء نشاط تتبع GPS
                    </button>
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <button
                      onClick={() => setShowManualLog(true)}
                      className="h-12 rounded-button border border-border/40 hover:bg-muted/10 text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active-tactile transition-all"
                    >
                      <Calendar className="w-4 h-4 text-[hsl(var(--fitness-primary))]" />
                      تسجيل يدوي للماضي
                    </button>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Background Auto-Detection Settings Card */}
            <div className="rounded-section border border-border/30 bg-card/25 p-4 space-y-4 text-start">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[0.75rem] font-bold text-foreground">التتبع التلقائي في الخلفية</h3>
                  <p className="text-[0.625rem] text-muted-foreground leading-relaxed mt-0.5">
                    يتعرف تلقائياً على حركتك عبر مستشعرات تسارع الجهاز ويبدأ تسجيل الـ GPS.
                  </p>
                </div>
                <button
                  onClick={() => toggleAutoDetect(!autoDetectEnabled)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors relative before:absolute before:-inset-2 before:content-[''] ${
                    autoDetectEnabled ? 'bg-[hsl(var(--fitness-primary))]' : 'bg-muted'
                  }`}
                  aria-label="تفعيل التتبع التلقائي"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      autoDetectEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {autoDetectEnabled && (
                <div className="pt-3 border-t border-border/20 grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[0.5625rem] text-muted-foreground">حالة الحركة النشطة</p>
                    <span className="text-[0.6875rem] font-bold text-[hsl(var(--fitness-primary))] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--fitness-primary))] animate-ping" />
                      {motionState === 'running' ? 'جري' : motionState === 'walking' ? 'مشي' : 'سكون'}
                      <span className="text-[0.5625rem] font-normal text-muted-foreground">({accelMagnitude} m/s²)</span>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[0.5625rem] text-muted-foreground">عداد الحركة المستمرة</p>
                    <div className="text-[0.6875rem] font-bold text-foreground Montserrat tabular-nums">
                      {isTracking ? 'قيد التسجيل' : `${secondsSustained} / 60 ثانية`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Debug Console */}
            <div className="rounded-section border border-dashed border-[hsl(var(--fitness-primary)/0.3)] bg-[hsl(var(--fitness-primary)/0.03)] p-4 space-y-3 text-start">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[hsl(var(--fitness-primary))]" />
                  <h3 className="text-[0.6875rem] font-bold text-foreground">محاكاة مستشعرات الحركة والـ GPS</h3>
                </div>
                <button
                  onClick={() => setShowSimulator(!showSimulator)}
                  className="text-[0.5625rem] font-bold text-[hsl(var(--fitness-primary))] px-2 py-0.5 rounded border border-[hsl(var(--fitness-primary)/0.2)] hover:bg-[hsl(var(--fitness-primary)/0.05)]"
                >
                  {showSimulator ? 'إخفاء اللوحة' : 'فتح اللوحة'}
                </button>
              </div>

              {showSimulator && (
                <div className="space-y-3 pt-2 border-t border-border/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.625rem] text-muted-foreground">تفعيل وضع المحاكاة الرقمية</span>
                    <button
                      onClick={() => {
                        setIsSimulated(!isSimulated);
                        if (!isSimulated) {
                          toggleAutoDetect(true);
                        }
                      }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        isSimulated ? 'bg-[hsl(var(--fitness-primary))]' : 'bg-muted'
                      }`}
                      aria-label="تفعيل وضع المحاكاة"
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          isSimulated ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {isSimulated && (
                    <div className="space-y-3 bg-background/40 rounded-lg p-2.5 border border-border/20">
                      <div className="space-y-1">
                        <p className="text-[0.5625rem] text-muted-foreground">نوع الحركة:</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['resting', 'walking', 'running'] as const).map((state) => (
                            <button
                              key={state}
                              onClick={() => simulateMotion(state)}
                              className={`py-1 rounded text-[0.5625rem] font-bold transition-all ${
                                motionState === state
                                  ? 'bg-[hsl(var(--fitness-primary))] text-primary-foreground'
                                  : 'bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              {state === 'running' ? 'جري' : state === 'walking' ? 'مشي' : 'سكون'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[0.5625rem] text-muted-foreground">إضافة زمن مسرّع:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => triggerSimulatedTick(15)}
                            className="py-1 rounded bg-[hsl(var(--fitness-primary)/0.1)] text-[hsl(var(--fitness-primary))] text-[0.5625rem] font-bold"
                          >
                            +15 ثانية
                          </button>
                          <button
                            onClick={() => triggerSimulatedTick(45)}
                            className="py-1 rounded bg-[hsl(var(--fitness-primary)/0.15)] text-[hsl(var(--fitness-primary))] text-[0.5625rem] font-bold"
                          >
                            +45 ثانية
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Activities List with scaled SVG vector route preview */}
            <div className="space-y-3 text-start">
              <h3 className="text-[0.75rem] font-bold text-foreground">سجل الأنشطة والمشاوير</h3>

              {loading ? (
                <div className="space-y-2">
                  <div className="h-14 rounded-xl bg-muted/20 animate-pulse" />
                  <div className="h-14 rounded-xl bg-muted/15 animate-pulse" />
                </div>
              ) : activities.length === 0 ? (
                /* ================= SCREEN 3: EMPTY STATE ================= */
                <div className="rounded-section border border-dashed border-border/40 py-10 px-4 text-center space-y-2">
                  <p className="text-[0.75rem] font-medium text-muted-foreground">
                    لا توجد أنشطة مسجلة بعد في السحابة.
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                    ابدأ التتبع الفوري أو قم بتسجيل مشوارك السابق يدوياً من الأعلى لبناء تحليلاتك الرياضية الأولى.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((act) => {
                    const durationMins = Math.round((act.duration_seconds || 0) / 60);
                    const distanceKm = Math.round(((act.distance_meters || 0) / 1000) * 10) / 10;
                    const startTimeDate = new Date(act.start_time);

                    return (
                      <div
                        key={act.id}
                        onClick={() => setSelectedActivity(act)}
                        className="group flex items-center justify-between rounded-xl border border-border/30 bg-card/30 p-2.5 hover:border-[hsl(var(--fitness-primary)/0.4)] hover:bg-[hsl(var(--fitness-primary)/0.03)] cursor-pointer transition-all duration-150 active-tactile"
                      >
                        {/* Right: SVG Route Thumbnail & Text Details */}
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded overflow-hidden border border-border/20 bg-background/50 flex-shrink-0 flex items-center justify-center">
                            {act.route && act.route.length > 0 ? (
                              <RouteThumbnail route={act.route} height={40} className="w-full h-full text-[hsl(var(--fitness-primary))]" />
                            ) : (
                              <span className="text-[0.5rem] text-muted-foreground/60">بلا مسار</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.75rem] font-bold text-foreground">
                              {act.activity_type === 'running' ? 'جري خارجي' : 'مشي خارجي'}
                            </span>
                            <span className="text-[0.5625rem] text-muted-foreground/80 Montserrat">
                              {startTimeDate.toLocaleDateString('ar-SA', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Left: Compact Stats & Chevron */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[0.75rem] font-bold text-foreground Montserrat tabular-nums leading-none">
                              {distanceKm} <span className="text-[0.5625rem] font-normal text-muted-foreground">كم</span>
                            </p>
                            <p className="text-[0.5625rem] text-muted-foreground Montserrat tabular-nums mt-0.5">
                              {durationMins} د • {Math.round(act.calories || 0)} سعرة
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors transform rotate-180" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Activity Input Drawer */}
      <ResponsiveDrawer
        open={showManualLog}
        onOpenChange={setShowManualLog}
        title="تسجيل نشاط رياضي سابق يدوياً"
        description="قم بإدخال بيانات الجري أو المشي لحساب السعرات وإضافتها إلى سجل العافية."
      >
        <form onSubmit={handleAddManualLog} className="space-y-4 pt-1 text-start">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setManualType('walking')}
              className={`py-2 rounded-input text-xs font-bold border transition-all ${
                manualType === 'walking'
                  ? 'bg-[hsl(var(--fitness-primary)/0.1)] text-[hsl(var(--fitness-primary))] border-[hsl(var(--fitness-primary)/0.3)]'
                  : 'bg-transparent text-muted-foreground border-border/40'
              }`}
            >
              مشي خارجي
            </button>
            <button
              type="button"
              onClick={() => setManualType('running')}
              className={`py-2 rounded-input text-xs font-bold border transition-all ${
                manualType === 'running'
                  ? 'bg-[hsl(var(--fitness-primary)/0.1)] text-[hsl(var(--fitness-primary))] border-[hsl(var(--fitness-primary)/0.3)]'
                  : 'bg-transparent text-muted-foreground border-border/40'
              }`}
            >
              جري خارجي
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[0.6875rem] font-bold text-muted-foreground block">تاريخ النشاط</label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-input border border-border/40 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--fitness-primary))] text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[0.6875rem] font-bold text-muted-foreground block">المسافة (كيلومتر)</label>
              <input
                type="number"
                step="0.01"
                placeholder="مثال: 3.4"
                value={manualDistance}
                onChange={(e) => setManualDistance(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-input border border-border/40 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--fitness-primary))] text-foreground Montserrat"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[0.6875rem] font-bold text-muted-foreground block">المدة (دقائق)</label>
              <input
                type="number"
                placeholder="مثال: 25"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-input border border-border/40 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--fitness-primary))] text-foreground Montserrat"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[0.6875rem] font-bold text-muted-foreground block">متوسط نبضات القلب (اختياري)</label>
            <input
              type="number"
              placeholder="مثال: 130"
              value={manualHeartRate}
              onChange={(e) => setManualHeartRate(e.target.value)}
              className="w-full h-10 px-3 rounded-input border border-border/40 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--fitness-primary))] text-foreground Montserrat"
            />
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setShowManualLog(false)}
              className="flex-1 py-2.5 rounded-button border border-border/40 text-muted-foreground text-xs font-semibold hover:bg-muted/10 active-tactile"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-[2] py-2.5 rounded-button bg-[hsl(var(--fitness-primary))] hover:opacity-90 text-primary-foreground text-xs font-bold active-tactile transition-transform"
            >
              حفظ وتسجيل النشاط
            </button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* Permission Rationale Modal */}
      <AnimatePresence>
        {showPermissionRationale && (
          <div
            className="fixed inset-0 z-drawer flex items-end sm:items-center justify-center bg-black/60 px-4"
            onClick={() => setShowPermissionRationale(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border/40 p-5 space-y-4 text-start"
            >
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--fitness-primary)/0.1)] flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-[hsl(var(--fitness-primary))]" />
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-[0.9375rem] font-bold text-foreground">
                  تفعيل إذن الموقع الجغرافي "دائماً"
                </h3>
                <p className="text-[0.72rem] text-muted-foreground leading-relaxed">
                  لتتبع ركضك ومشيّك بدقة في الخلفية وتلقائياً دون انقطاع، يحتاج تطبيق SmartHub إلى إذن الوصول للموقع "دائماً". لن نقوم بمشاركة موقعك أبداً، وكل بياناتك تُشفر وتُحفظ محلياً وسحابياً بحسابك الخاص فقط.
                </p>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPermissionRationale(false)}
                  className="flex-1 py-2.5 rounded-button bg-muted text-muted-foreground text-xs font-semibold active-tactile"
                >
                  ليس الآن
                </button>
                <button
                  type="button"
                  onClick={handlePermissionRequest}
                  className="flex-[2] py-2.5 rounded-button bg-[hsl(var(--fitness-primary))] text-primary-foreground text-xs font-bold active-tactile transition-transform"
                >
                  أوافق، التفعيل الآن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
