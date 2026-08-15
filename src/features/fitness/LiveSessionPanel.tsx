/**
 * LiveSessionPanel — the in-session cockpit.
 *
 * Shows the live route, a pace/effort ring, GPS quality, elevation gain,
 * per-kilometre splits, and pause / resume / stop controls. All values are
 * computed by the tracking engine; this component only renders them.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';

import ProgressRing from '@/components/ProgressRing';
import { Mountain, Pause, Play, Square, Zap } from '@/lib/icons';

import { FullActivityMap } from './FullActivityMap';
import { formatDuration, formatPace } from './metrics';
import type { RoutePoint, TrackSplit } from './types';

interface Props {
  activityType: 'walking' | 'running';
  trackingSource: 'auto' | 'manual' | null;
  route: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
  calories: number;
  currentPaceSecPerKm: number;
  avgPaceSecPerKm: number;
  gpsAccuracy: number | null;
  elevationGain: number;
  splits: TrackSplit[];
  isPaused: boolean;
  autoPaused: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}

/** Target pace band used only to fill the ring (fast walk → easy run). */
const PACE_FLOOR = 240; // 4:00 /km
const PACE_CEIL = 900; // 15:00 /km

function LiveSessionPanelImpl({
  activityType,
  trackingSource,
  route,
  distanceMeters,
  durationSeconds,
  calories,
  currentPaceSecPerKm,
  avgPaceSecPerKm,
  gpsAccuracy,
  elevationGain,
  splits,
  isPaused,
  autoPaused,
  onTogglePause,
  onStop,
}: Props) {
  const paced = currentPaceSecPerKm || avgPaceSecPerKm;
  const ringProgress = paced
    ? 1 - Math.min(1, Math.max(0, (paced - PACE_FLOOR) / (PACE_CEIL - PACE_FLOOR)))
    : 0;

  const gpsLabel =
    gpsAccuracy == null
      ? 'بانتظار الإشارة'
      : gpsAccuracy <= 8
        ? 'إشارة ممتازة'
        : gpsAccuracy <= 18
          ? 'إشارة جيدة'
          : 'إشارة ضعيفة';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="rounded-section border-2 border-[hsl(var(--fitness-primary)/0.4)] bg-card/40 p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-bold bg-[hsl(var(--fitness-primary)/0.15)] text-[hsl(var(--fitness-primary))]">
          <Zap
            className={`w-3.5 h-3.5 ${isPaused ? '' : 'animate-pulse'} text-[hsl(var(--fitness-primary))]`}
          />
          {isPaused
            ? autoPaused
              ? 'إيقاف تلقائي — بانتظار الحركة'
              : 'الجلسة متوقفة مؤقتاً'
            : activityType === 'running'
              ? 'تتبع الجري نشط'
              : 'تتبع المشي نشط'}
          {trackingSource === 'auto' && ' (تلقائي)'}
        </span>
        <span className="text-micro font-semibold text-muted-foreground tabular-nums">
          {formatDuration(durationSeconds)}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/30 h-32 bg-background/50">
        <FullActivityMap route={route} height={128} />
      </div>

      {/* Pace ring + primary numbers */}
      <div className="flex items-center gap-4">
        <ProgressRing
          progress={ringProgress}
          size={76}
          thickness={4}
          label={`الإيقاع الحالي ${formatPace(paced)} لكل كيلومتر`}
        >
          <span className="flex flex-col items-center leading-none">
            <span className="text-mini font-extrabold tabular-nums text-foreground">
              {formatPace(paced)}
            </span>
            <span className="text-micro text-muted-foreground mt-0.5">د/كم</span>
          </span>
        </ProgressRing>

        <div className="grid grid-cols-3 gap-2 flex-1 text-center">
          <div>
            <p className="text-micro text-muted-foreground">المسافة</p>
            <p className="text-meta font-bold tabular-nums text-foreground">
              {(distanceMeters / 1000).toFixed(2)}
              <span className="text-micro text-muted-foreground ms-1">كم</span>
            </p>
          </div>
          <div>
            <p className="text-micro text-muted-foreground">متوسط الإيقاع</p>
            <p className="text-meta font-bold tabular-nums text-foreground">
              {formatPace(avgPaceSecPerKm)}
            </p>
          </div>
          <div>
            <p className="text-micro text-muted-foreground">السعرات</p>
            <p className="text-meta font-bold tabular-nums text-foreground">
              {Math.round(calories)}
              <span className="text-micro text-muted-foreground ms-1">ك</span>
            </p>
          </div>
        </div>
      </div>

      {/* Signal + elevation strip */}
      <div className="flex items-center justify-between text-micro text-muted-foreground border-y border-border/20 py-2">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              gpsAccuracy == null
                ? 'bg-muted-foreground/50'
                : gpsAccuracy <= 8
                  ? 'bg-emerald-500'
                  : gpsAccuracy <= 18
                    ? 'bg-amber-500'
                    : 'bg-destructive'
            }`}
          />
          {gpsLabel}
          {gpsAccuracy != null && (
            <span className="tabular-nums">± {Math.round(gpsAccuracy)} م</span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Mountain className="w-3 h-3" />
          صعود {elevationGain} م
        </span>
      </div>

      {/* Splits */}
      <AnimatePresence initial={false}>
        {splits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-micro text-muted-foreground mb-1.5">سبليتات كل كيلومتر</p>
            <div className="space-y-1 max-h-32 overflow-y-auto pe-1">
              {splits.map((split) => {
                const best = Math.min(
                  ...splits.filter((s) => !s.partial && s.paceSecPerKm > 0).map((s) => s.paceSecPerKm)
                );
                const ratio =
                  split.paceSecPerKm > 0 && Number.isFinite(best)
                    ? Math.min(1, best / split.paceSecPerKm)
                    : 0;
                return (
                  <div key={split.index} className="flex items-center gap-2">
                    <span className="w-4 text-micro tabular-nums text-muted-foreground">
                      {split.index}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--fitness-primary))] transition-[width] duration-500"
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                    <span className="text-micro tabular-nums text-foreground font-bold">
                      {formatPace(split.paceSecPerKm)}
                      {split.partial && (
                        <span className="text-muted-foreground font-normal ms-1">
                          ({(split.distanceMeters / 1000).toFixed(2)} كم)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <button
          onClick={onTogglePause}
          className="flex-1 h-10 rounded-button border border-border/40 hover:bg-muted/10 text-foreground text-micro font-bold inline-flex items-center justify-center gap-1.5 active-tactile transition-all"
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {isPaused ? 'استئناف' : 'إيقاف مؤقت'}
        </button>
        <button
          onClick={onStop}
          className="flex-[1.4] h-10 rounded-button bg-destructive text-destructive-foreground text-micro font-bold inline-flex items-center justify-center gap-1.5 active-tactile transition-all"
        >
          <Square className="w-3.5 h-3.5" />
          إنهاء وحفظ
        </button>
      </div>
    </motion.div>
  );
}

export const LiveSessionPanel = memo(LiveSessionPanelImpl);
export default LiveSessionPanel;
