import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Heart, RefreshCw, Settings, Zap } from '@/lib/icons';

import {
  checkHealthAvailability,
  checkHealthPermissions,
  HEALTH_CONNECT_INSTALL_URL,
  openHealthConnectSettings,
  requestHealthPermissions,
  syncHealthData,
} from './healthConnect';

type Phase = 'checking' | 'unavailable' | 'needs-permission' | 'ready' | 'syncing';

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

  const evaluate = useCallback(async () => {
    setPhase('checking');
    const avail = await checkHealthAvailability();
    if (avail.platform) setPlatform(avail.platform);
    if (!avail.available) {
      setPhase('unavailable');
      setMessage(avail.reason);
      return;
    }
    try {
      const status = await checkHealthPermissions();
      const need = ['steps', 'distance', 'calories', 'heartRate', 'sleep', 'workouts'].some(
        (k) => !status.readAuthorized.includes(k as any),
      );
      setPhase(need ? 'needs-permission' : 'ready');
    } catch {
      setPhase('needs-permission');
    }
  }, []);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  const handleGrant = async () => {
    try {
      const status = await requestHealthPermissions();
      const grantedAll = ['steps', 'distance', 'calories', 'heartRate', 'sleep', 'workouts'].every(
        (k) => status.readAuthorized.includes(k as any),
      );
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
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر طلب الأذونات');
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
    } catch (e: any) {
      toast.error(e?.message || 'فشلت المزامنة');
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
            <h3 className="text-meta font-bold text-foreground truncate">
              {platform === 'ios' ? 'Apple Health' : 'Health Connect'}
            </h3>
            <p className="text-micro text-muted-foreground/80">
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
        <p className="text-mini text-muted-foreground">…جارٍ التحقق</p>
      )}

      {phase === 'unavailable' && (
        <div className="space-y-2">
          <p className="text-mini text-muted-foreground leading-relaxed">
            هذا الجهاز لا يدعم Health Connect. ثبّته من متجر Play للاستفادة من مزامنة بيانات الصحة.
          </p>
          <a
            href={HEALTH_CONNECT_INSTALL_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-mini font-semibold bg-[hsl(var(--fitness-primary))] text-white"
          >
            <Zap className="w-3.5 h-3.5" />
            تثبيت من Play
          </a>
        </div>
      )}

      {phase === 'needs-permission' && (
        <div className="space-y-2">
          <p className="text-mini text-muted-foreground leading-relaxed">
            نحتاج إذن قراءة لبياناتك الصحية لعرض ملخصات يومية وتمارين تلقائياً. لن نُعدّل بياناتك.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleGrant}
              className="px-3 py-1.5 rounded-full text-mini font-semibold bg-[hsl(var(--fitness-primary))] text-white active-tactile"
            >
              منح الأذونات
            </button>
            <button
              onClick={() => openHealthConnectSettings().catch(() => {})}
              className="px-3 py-1.5 rounded-full text-mini font-semibold border border-border/40 text-muted-foreground active-tactile"
            >
              الإعدادات
            </button>
          </div>
        </div>
      )}

      {(phase === 'ready' || phase === 'syncing') && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-micro text-muted-foreground min-w-0">
            {lastSync ? (
              <span className="truncate block">آخر مزامنة: {lastSync}</span>
            ) : (
              <span>لم تتم مزامنة بعد</span>
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={phase === 'syncing'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-mini font-semibold bg-[hsl(var(--fitness-primary))] text-white disabled:opacity-50 active-tactile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${phase === 'syncing' ? 'animate-spin' : ''}`} />
            {phase === 'syncing' ? '…مزامنة' : 'مزامنة الآن'}
          </button>
        </div>
      )}

      {message && phase === 'unavailable' && (
        <p className="text-micro text-muted-foreground/60 pt-1 border-t border-border/20 font-mono truncate">
          {message}
        </p>
      )}
    </motion.section>
  );
}

export default HealthConnectCard;