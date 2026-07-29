import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Flame,
  MapPin,
  TrendingUp,
  Trash2,
  Play,
  Square,
  Clock,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight,
  ArrowRight,
  CheckCircle,
} from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';
import { useActivityTracking, calculateHaversineDistance } from './useActivityTracking';
import { deleteFitnessActivity } from './api';
import type { FitnessActivity, RoutePoint } from './types';
import { toast } from 'sonner';
import { RouteThumbnail } from './RouteThumbnail';
import { FullActivityMap } from './FullActivityMap';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';

// Minimal custom inline RouteCanvas component
interface RouteCanvasProps {
  route: RoutePoint[];
  width?: number;
  height?: number;
}

export function RouteCanvas({ route, width = 300, height = 160 }: RouteCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let id: any;
    const tick = () => {
      setPulse((prev) => (prev + 1) % 60);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Zen dark subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 16;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (route.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = '10px Tajawal, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('لا مسار مسجّل بعد', width / 2, height / 2);
      return;
    }

    // Find bounding box
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    route.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan, 0.0001);

    const padding = 16;
    const scaleX = (width - padding * 2) / maxSpan;
    const scaleY = (height - padding * 2) / maxSpan;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - lngSpan * scale) / 2;
    const offsetY = (height - latSpan * scale) / 2;

    const toCanvas = (p: RoutePoint) => {
      const x = offsetX + (p.lng - minLng) * scale;
      const y = height - (offsetY + (p.lat - minLat) * scale);
      return { x, y };
    };

    // Draw route path
    ctx.beginPath();
    ctx.strokeStyle = '#B8492E'; // Live copper accent
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(184, 73, 46, 0.3)';
    ctx.shadowBlur = 4;

    route.forEach((p, idx) => {
      const pt = toCanvas(p);
      if (idx === 0) {
        ctx.moveTo(pt.x, pt.y);
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    });
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Green start dot
    const startPt = toCanvas(route[0]);
    ctx.beginPath();
    ctx.fillStyle = '#10b981';
    ctx.arc(startPt.x, startPt.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Blue/live pulse end dot
    if (route.length > 1) {
      const endPt = toCanvas(route[route.length - 1]);
      ctx.beginPath();
      ctx.fillStyle = '#B8492E';
      ctx.arc(endPt.x, endPt.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing outer ring
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(184, 73, 46, 0.4)';
      ctx.lineWidth = 1;
      ctx.arc(endPt.x, endPt.y, 5 + (pulse / 60) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [route, width, height, pulse]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl border border-border/40 bg-card/60 w-full block"
    />
  );
}

export default function ActivityTrackerTab() {
  const { language } = useApp();
  const [selectedActivity, setSelectedActivity] = useState<FitnessActivity | null>(null);

  const {
    activities,
    loading,
    permissionState,
    isTracking,
    trackingSource,
    activityType,
    route,
    distanceMeters,
    calories,
    durationSeconds,
    autoDetectEnabled,
    motionState,
    accelMagnitude,
    secondsSustained,
    secondsInactive,
    isSimulated,
    simulatedSpeedMultiplier,
    toggleAutoDetect,
    startTracking,
    stopTracking,
    requestLocationPermission,
    setIsSimulated,
    setSimulatedSpeedMultiplier,
    simulateMotion,
    triggerSimulatedTick,
    refresh,
  } = useActivityTracking();

  const [showPermissionRationale, setShowPermissionRationale] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Summary statistics
  const totalStats = useMemo(() => {
    const totalD = activities.reduce((sum, a) => sum + (a.distance_meters || 0), 0);
    const totalC = activities.reduce((sum, a) => sum + (a.calories || 0), 0);
    return {
      count: activities.length,
      distanceKm: Math.round((totalD / 1000) * 10) / 10,
      calories: Math.round(totalC),
    };
  }, [activities]);

  // Request permission flow
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
    toast.success('بدء تتبع النشاط يدوياً');
  };

  const handleStopManual = async () => {
    await stopTracking();
    toast.success('تم حفظ النشاط بنجاح في السحابة');
  };

  // Format tracking seconds to HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0'),
    ].filter(Boolean).join(':');
  };

  return (
    <div className="space-y-4">
      {/* Immersive stats hero */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-card/60 border border-border/30 p-3 text-center">
          <div className="flex items-center justify-center text-blue-500 mb-1">
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-[1.0625rem] font-bold Montserrat tabular-nums text-foreground">
            {totalStats.count}
          </div>
          <div className="text-[0.625rem] text-muted-foreground uppercase tracking-tight mt-0.5">
            {'الأنشطة'}
          </div>
        </div>
        <div className="rounded-xl bg-card/60 border border-border/30 p-3 text-center">
          <div className="flex items-center justify-center text-emerald-500 mb-1">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-[1.0625rem] font-bold Montserrat tabular-nums text-foreground">
            {totalStats.distanceKm} <span className="text-[0.6875rem] font-medium text-muted-foreground">كم</span>
          </div>
          <div className="text-[0.625rem] text-muted-foreground uppercase tracking-tight mt-0.5">
            {'المسافة الإجمالية'}
          </div>
        </div>
        <div className="rounded-xl bg-card/60 border border-border/30 p-3 text-center">
          <div className="flex items-center justify-center text-orange-500 mb-1">
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-[1.0625rem] font-bold Montserrat tabular-nums text-foreground">
            {totalStats.calories} <span className="text-[0.6875rem] font-medium text-muted-foreground">سعرة</span>
          </div>
          <div className="text-[0.625rem] text-muted-foreground uppercase tracking-tight mt-0.5">
            {'السعرات الحرارية'}
          </div>
        </div>
      </div>

      {/* Real-time Tracking Panel */}
      <AnimatePresence mode="wait">
        {isTracking ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-2xl border-2 border-[#B8492E]/40 bg-card p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-bold bg-[#B8492E]/15 text-[#B8492E]">
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                {activityType === 'running' ? 'تتبع الجري نشط' : 'تتبع المشي نشط'}
                {trackingSource === 'auto' && ' (تلقائي)'}
              </span>
              <span className="text-[0.6875rem] font-semibold text-muted-foreground Montserrat tabular-nums">
                {formatTime(durationSeconds)}
              </span>
            </div>

            {/* Live canvas route */}
            <RouteCanvas route={route} />

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div>
                <p className="text-[0.625rem] text-muted-foreground">{'المسافة'}</p>
                <p className="text-[1.0625rem] font-bold Montserrat tabular-nums text-foreground">
                  {Math.round(distanceMeters)} <span className="text-[0.6875rem] text-muted-foreground">م</span>
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] text-muted-foreground">{'السرعة'}</p>
                <p className="text-[1.0625rem] font-bold Montserrat tabular-nums text-foreground">
                  {durationSeconds > 0
                    ? Math.round((distanceMeters / durationSeconds) * 3.6 * 10) / 10
                    : 0}{' '}
                  <span className="text-[0.6875rem] text-muted-foreground">كم/س</span>
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] text-muted-foreground">{'السعرات المقدرة'}</p>
                <p className="text-[1.0625rem] font-bold Montserrat tabular-nums text-foreground">
                  {calories} <span className="text-[0.6875rem] text-muted-foreground">ك</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleStopManual}
              className="w-full h-11 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Square className="w-3.5 h-3.5" />
              {'إيقاف وحفظ النشاط'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
          >
            <h3 className="text-xs font-bold text-foreground">{'تتبع نشاط خارجي'}</h3>
            <p className="text-[0.6875rem] text-muted-foreground leading-relaxed">
              {'اختر نوع النشاط لبدء التتبع الفوري لنظام تحديد المواقع (GPS).'}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleStartManual('walking')}
                className="h-11 rounded-xl bg-primary/10 text-primary text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                {'ابدأ مشي'}
              </button>
              <button
                onClick={() => handleStartManual('running')}
                className="h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                {'ابدأ جري'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Detection Settings Card */}
      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-foreground">{'التتبع التلقائي في الخلفية'}</h3>
            <p className="text-[0.625rem] text-muted-foreground">{'يتعرف تلقائياً على حركتك ويبدأ التسجيل.'}</p>
          </div>
          <button
            onClick={() => toggleAutoDetect(!autoDetectEnabled)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors relative before:absolute before:-inset-2 before:content-[''] ${
              autoDetectEnabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoDetectEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {autoDetectEnabled && (
          <div className="pt-2 border-t border-border/30 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[0.625rem] text-muted-foreground">{'حالة الحركة النشطة'}</p>
              <span className="text-[0.6875rem] font-bold text-primary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                {motionState === 'running' ? 'جري' : motionState === 'walking' ? 'مشي' : 'سكون'}
                <span className="text-[0.625rem] font-normal text-muted-foreground">({accelMagnitude} m/s²)</span>
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[0.625rem] text-muted-foreground">{'عداد الحركة المستمرة'}</p>
              <div className="text-[0.6875rem] font-semibold text-foreground Montserrat tabular-nums">
                {isTracking ? 'قيد التسجيل' : `${secondsSustained} / 60 ثانية`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Developer/Simulator panel */}
      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-primary">{'لوحة محاكاة المستشعرات'}</h3>
          </div>
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="text-[0.6875rem] font-semibold text-primary px-2.5 py-1 rounded-md bg-primary/10"
          >
            {showSimulator ? 'إخفاء' : 'عرض'}
          </button>
        </div>

        {showSimulator && (
          <div className="space-y-3 pt-2 border-t border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] text-muted-foreground">{'تفعيل وضع المحاكاة'}</span>
              <button
                onClick={() => {
                  setIsSimulated(!isSimulated);
                  if (!isSimulated) {
                    toggleAutoDetect(true);
                  }
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  isSimulated ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isSimulated ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isSimulated && (
              <div className="space-y-2.5 bg-background/50 rounded-xl p-3 border border-primary/15">
                <div className="space-y-1.5">
                  <p className="text-[0.625rem] text-muted-foreground">{'نوع الحركة للمحاكاة:'}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['resting', 'walking', 'running'] as const).map((state) => (
                      <button
                        key={state}
                        onClick={() => simulateMotion(state)}
                        className={`py-1 rounded-md text-[0.625rem] font-semibold transition-all ${
                          motionState === state
                            ? 'bg-[#B8492E] text-white'
                            : 'bg-card text-muted-foreground'
                        }`}
                      >
                        {state === 'running' ? 'جري (نشط)' : state === 'walking' ? 'مشي (نشط)' : 'سكون'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[0.625rem] text-muted-foreground">{'تسريع الزمن للتجربة السريعة:'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerSimulatedTick(15)}
                      className="py-1 rounded-md bg-primary/10 text-primary text-[0.625rem] font-medium"
                    >
                      {'+15 ثانية حركة'}
                    </button>
                    <button
                      onClick={() => triggerSimulatedTick(40)}
                      className="py-1 rounded-md bg-primary/15 text-primary text-[0.625rem] font-semibold"
                    >
                      {'+40 ثانية حركة'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity History List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-foreground">{'سجل الأنشطة الأخيرة'}</h3>

        {loading ? (
          <div className="space-y-2">
            <div className="h-20 rounded-xl bg-muted/20 animate-pulse" />
            <div className="h-20 rounded-xl bg-muted/15 animate-pulse" />
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-[0.6875rem] text-muted-foreground">
            {'لا توجد أنشطة مسجلة بعد. ابدأ المشي أو الجري لتراها هنا.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {activities.map((act) => {
              const dateStr = new Date(act.start_time).toLocaleDateString('ar-SA', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const distanceKm = Math.round(((act.distance_meters || 0) / 1000) * 10) / 10;
              const durationMins = Math.round((act.duration_seconds || 0) / 60);

              return (
                <div key={act.id} className="rounded-xl border border-border/40 bg-card p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[0.6875rem] font-bold text-foreground block">
                        {act.activity_type === 'running' ? 'جري خارجي' : 'مشي خارجي'}
                      </span>
                      <span className="text-[0.5625rem] text-muted-foreground Montserrat" dir="ltr">
                        {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[0.5625rem] font-semibold ${
                          act.source === 'auto' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {act.source === 'auto' ? 'تلقائي' : 'يدوي'}
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await deleteFitnessActivity(act.id);
                            toast.success('تم حذف النشاط');
                            refresh();
                          } catch {
                            toast.error('فشل حذف النشاط');
                          }
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors relative before:absolute before:-inset-2 before:content-['']"
                        aria-label="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-b border-border/30 py-2">
                    <div>
                      <p className="text-[0.5625rem] text-muted-foreground">{'المسافة'}</p>
                      <p className="text-[0.8125rem] font-bold text-foreground Montserrat tabular-nums">
                        {distanceKm} <span className="text-[0.625rem] font-normal text-muted-foreground">كم</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.5625rem] text-muted-foreground">{'المدة'}</p>
                      <p className="text-[0.8125rem] font-bold text-foreground Montserrat tabular-nums">
                        {durationMins} <span className="text-[0.625rem] font-normal text-muted-foreground">دقيقة</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.5625rem] text-muted-foreground">{'السعرات'}</p>
                      <p className="text-[0.8125rem] font-bold text-foreground Montserrat tabular-nums">
                        {Math.round(act.calories || 0)}{' '}
                        <span className="text-[0.625rem] font-normal text-muted-foreground">سعرة</span>
                      </p>
                    </div>
                  </div>

                  {act.route && act.route.length > 0 && (
                    <div
                      onClick={() => setSelectedActivity(act)}
                      className="overflow-hidden rounded-lg cursor-pointer bg-muted/5 border border-border/20 p-2 hover:bg-[#B8492E]/5 hover:border-[#B8492E]/30 transition-colors"
                      title="عرض الخريطة التفاعلية"
                    >
                      <RouteThumbnail route={act.route} height={80} />
                      <div className="mt-1 flex items-center justify-center gap-1 text-[0.5625rem] text-[#B8492E] font-medium">
                        <MapPin className="w-3 h-3" />
                        <span>انقر لعرض الخريطة التفاعلية</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Activity Map Modal/Drawer */}
      <ResponsiveDrawer
        open={!!selectedActivity}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
        title={
          selectedActivity
            ? selectedActivity.activity_type === 'running'
              ? 'تفاصيل الجري الخارجي'
              : 'تفاصيل المشي الخارجي'
            : ''
        }
        description={
          selectedActivity
            ? new Date(selectedActivity.start_time).toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''
        }
      >
        {selectedActivity && (
          <div className="space-y-4">
            <FullActivityMap activity={selectedActivity} height={300} />

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs border-t border-b border-border/30 py-3 mt-2">
              <div>
                <p className="text-[0.625rem] text-muted-foreground mb-0.5">{'المسافة'}</p>
                <p className="text-[1rem] font-bold text-foreground Montserrat tabular-nums">
                  {Math.round(((selectedActivity.distance_meters || 0) / 1000) * 100) / 100}{' '}
                  <span className="text-[0.6875rem] font-medium text-muted-foreground">كم</span>
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] text-muted-foreground mb-0.5">{'المدة'}</p>
                <p className="text-[1rem] font-bold text-foreground Montserrat tabular-nums">
                  {Math.round((selectedActivity.duration_seconds || 0) / 60)}{' '}
                  <span className="text-[0.6875rem] font-medium text-muted-foreground">دقيقة</span>
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] text-muted-foreground mb-0.5">{'السعرات المحروقة'}</p>
                <p className="text-[1rem] font-bold text-foreground Montserrat tabular-nums">
                  {Math.round(selectedActivity.calories || 0)}{' '}
                  <span className="text-[0.6875rem] font-medium text-muted-foreground">سعرة</span>
                </p>
              </div>
            </div>

            <div className="bg-muted/10 border border-border/20 rounded-xl p-3 text-[0.6875rem] space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>{'طريقة التسجيل:'}</span>
                <span className="font-bold text-foreground">
                  {selectedActivity.source === 'auto' ? 'تتبع تلقائي بالخلفية' : 'تتبع يدوي'}
                </span>
              </div>
              {selectedActivity.duration_seconds && selectedActivity.distance_meters && (
                <div className="flex justify-between">
                  <span>{'معدل السرعة:'}</span>
                  <span className="font-bold text-foreground Montserrat tabular-nums">
                    {(
                      (selectedActivity.distance_meters / selectedActivity.duration_seconds) *
                      3.6
                    ).toFixed(1)}{' '}
                    كم/س
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
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
              className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border/40 p-5 space-y-4"
            >
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-[0.9375rem] font-bold text-foreground">
                  {'تفعيل إذن الموقع الجغرافي "دائماً"'}
                </h3>
                <p className="text-[0.75rem] text-muted-foreground leading-relaxed">
                  {'لتتبع ركضك ومشيّك بدقة في الخلفية وتلقائياً دون انقطاع، يحتاج تطبيق SmartHub إلى إذن الوصول للموقع "دائماً". لن نقوم بمشاركة موقعك أبداً، وكل بياناتك تُشفر وتُحفظ محلياً وسحابياً بحسابك الخاص فقط.'}
                </p>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setShowPermissionRationale(false)}
                  className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold"
                >
                  {'ليس الآن'}
                </button>
                <button
                  onClick={handlePermissionRequest}
                  className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-[0.98] transition-transform"
                >
                  {'أوافق، التفعيل الآن'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
