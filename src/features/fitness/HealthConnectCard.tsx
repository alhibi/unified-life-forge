import type { HealthDataType } from '@capgo/capacitor-health';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Heart, RefreshCw, Settings, Zap } from '@/lib/icons';

import {
  checkHealthAvailability,
  checkHealthPermissions,
  errorMessage,
  HEALTH_CONNECT_INSTALL_URL,
  openHealthConnectSettings,
  requestHealthPermissions,
  syncHealthData,
} from './healthConnect';

type Phase = 'checking' | 'unavailable' | 'needs-permission' | 'ready' | 'syncing';

/**
 * The metrics this card asks for, typed as the plugin's own union.
 *
 * Written inline as bare strings before, which forced `includes(k as any)` at both
 * call sites and meant a typo — or a metric the plugin renamed — would silently
 * read as "permission missing" forever rather than failing to compile.
 */
const REQUIRED_HEALTH_TYPES: readonly HealthDataType[] = [
  'steps',
  'distance',
  'calories',
  'heartRate',
  'sleep',
  'workouts',
];

interface Props {
  onSynced?: () => void;
}

/**
 * Compact Health Connect (Android) / HealthKit (iOS) sync card.
 * Handles availability, permission, and manual sync in a single tile.
 */
export function HealthConnectCard({ onSynced }: Props) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [platform, setPlatform] = useState<string>('android');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  const evaluate = useCallback(async (signal?: { cancelled: boolean }) => {
    const live = () => !signal?.cancelled;

    const avail = await checkHealthAvailability();
    if (!live()) return;
    if (avail.platform) setPlatform(avail.platform);
    if (!avail.available) {
      setPhase('unavailable');
      setMessage(avail.reason);
      return;
    }
    try {
      const status = await checkHealthPermissions();
      if (!live()) return;
      const need = REQUIRED_HEALTH_TYPES.some((k) => !status.readAuthorized.includes(k));
      setPhase(need ? 'needs-permission' : 'ready');
    } catch {
      if (live()) setPhase('needs-permission');
    }
  }, []);

  useEffect(() => {
    // `phase` already initialises to 'checking', so the effect does not need to
    // set it — which is what made this a synchronous setState in an effect body
    // and a cascading render on every mount.
    //
    // The guard object matters independently of the lint rule: both awaits below
    // can resolve after the card unmounts (the permission prompt is slow), and
    // the previous version called setState unconditionally when they did.
    const signal = { cancelled: false };
    void evaluate(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [evaluate]);

  const handleGrant = async () => {
    try {
      const status = await requestHealthPermissions();
      const grantedAll = REQUIRED_HEALTH_TYPES.every((k) => status.readAuthorized.includes(k));
      if (grantedAll) {
        setPhase('ready');
        toast.success('تم منح الأذونات');
      } else if (status.readAuthorized.length > 0) {
        setPhase('ready');
        toast.warning('تم منح بعض الأذونات فقط — يمكنك ضبط الباقي من الإعدادات');
      } else {
        setPhase('needs-permission');
        toast.error('تم رفض الأذونات');
      }
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'تعذّر طلب الأذونات'));
    }
  };

  const handleSync = async () => {
    setPhase('syncing');
    try {
      const res = await syncHealthData(30);
      setLastSync(new Date().toLocaleString('ar-SA'));
      toast.success(
        `تمت المزامنة · ${res.upserted} يوم · ${res.imported} تمرين${
          res.skippedOverlap ? ` (تم تخطي ${res.skippedOverlap} متكرر)` : ''
        }`,
      );
      onSynced?.();
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'فشلت المزامنة'));
    } finally {
      setPhase('ready');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/40 rounded-2xl p-4 bg-card/40 backdrop-blur-sm space-y-3"
      aria-label="مزامنة بيانات الصحة"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--fitness-primary)/0.1)] flex items-center justify-center shrink-0">
            <Heart className="w-4.5 h-4.5 text-[hsl(var(--fitness-primary))]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[0.875rem] font-bold text-foreground truncate">
              {platform === 'ios' ? 'Apple Health' : 'Health Connect'}
            </h3>
            <p className="text-[0.6875rem] text-muted-foreground/80">
              خطوات · مسافة · سعرات · نبض · نوم · تمارين
            </p>
          </div>
        </div>
        {phase === 'ready' && (
          <button
            onClick={() => openHealthConnectSettings().catch(() => {})}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active-tactile"
            aria-label="فتح إعدادات Health Connect"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {phase === 'checking' && (
        <p className="text-[0.75rem] text-muted-foreground">…جارٍ التحقق</p>
      )}

      {phase === 'unavailable' && (
        <div className="space-y-2">
          <p className="text-[0.75rem] text-muted-foreground leading-relaxed">
            هذا الجهاز لا يدعم Health Connect. ثبّته من متجر Play للاستفادة من مزامنة بيانات الصحة.
          </p>
          <a
            href={HEALTH_CONNECT_INSTALL_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-semibold bg-[hsl(var(--fitness-primary))] text-white"
          >
            <Zap className="w-3.5 h-3.5" />
            تثبيت من Play
          </a>
        </div>
      )}

      {phase === 'needs-permission' && (
        <div className="space-y-2">
          <p className="text-[0.75rem] text-muted-foreground leading-relaxed">
            نحتاج إذن قراءة لبياناتك الصحية لعرض ملخصات يومية وتمارين تلقائياً. لن نُعدّل بياناتك.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleGrant}
              className="px-3 py-1.5 rounded-full text-[0.75rem] font-semibold bg-[hsl(var(--fitness-primary))] text-white active-tactile"
            >
              منح الأذونات
            </button>
            <button
              onClick={() => openHealthConnectSettings().catch(() => {})}
              className="px-3 py-1.5 rounded-full text-[0.75rem] font-semibold border border-border/40 text-muted-foreground active-tactile"
            >
              الإعدادات
            </button>
          </div>
        </div>
      )}

      {(phase === 'ready' || phase === 'syncing') && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-[0.6875rem] text-muted-foreground min-w-0">
            {lastSync ? (
              <span className="truncate block">آخر مزامنة: {lastSync}</span>
            ) : (
              <span>لم تتم مزامنة بعد</span>
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={phase === 'syncing'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-semibold bg-[hsl(var(--fitness-primary))] text-white disabled:opacity-50 active-tactile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${phase === 'syncing' ? 'animate-spin' : ''}`} />
            {phase === 'syncing' ? '…مزامنة' : 'مزامنة الآن'}
          </button>
        </div>
      )}

      {message && phase === 'unavailable' && (
        <p className="text-[0.625rem] text-muted-foreground/60 pt-1 border-t border-border/20 font-mono truncate">
          {message}
        </p>
      )}
    </motion.section>
  );
}

export default HealthConnectCard;