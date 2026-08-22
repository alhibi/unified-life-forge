/**
 * StreakGuardianRunner — the midnight guardian.
 *
 * Mounted once in App. Watches the unified streak and fires a sonner toast
 * exactly once per day when the chain is alive but today is still empty:
 *  • 20:00–23:59 → critical window ("your streak is about to break!")
 *  • 05:00–20:00 → gentle nudge (warning)
 * Silent when: today already active, no live chain, or guardian already
 * fired today (persisted flag resets at local midnight).
 */
import { useEffect } from 'react';
import { toast } from 'sonner';

import {
  assessStreakRisk,
} from './streakEngine';
import { streakStore } from './streakStore';

const GUARDIAN_FIRED_KEY = 'amv_streak_guardian_fired_on';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function StreakGuardianRunner() {
  useEffect(() => {
    // Check shortly after mount and then every 5 minutes.
    let stopped = false;

    const check = () => {
      if (stopped) return;
      const snap = streakStore.getSnapshot();
      if (!snap) return;

      const risk = snap.unified.risk;
      const hour = new Date().getHours();

      // Only speak when it matters.
      const shouldSpeak =
        (risk.level === 'critical' && hour >= 20) ||
        (risk.level === 'warning' && hour >= 18);

      if (!shouldSpeak) return;

      // At most once per calendar day. localStorage first, in-memory fallback.
      const today = todayISO();
      const memory = StreakGuardianRunner as unknown as { _lastFired?: string };
      let firedOn: string | null;
      try {
        firedOn = localStorage.getItem(GUARDIAN_FIRED_KEY);
      } catch {
        firedOn = memory._lastFired ?? null;
      }
      if (firedOn === today) return;

      try {
        localStorage.setItem(GUARDIAN_FIRED_KEY, today);
      } catch {
        /* ignore */
      }
      memory._lastFired = today;

      if (risk.level === 'critical') {
        toast.warning('🔥 سلسلتك على المحك!', {
          description: `${snap.unified.currentStreakDays} ${snap.unified.currentStreakDays === 1 ? 'يوم' : 'أيام'} متتالية ستُفقد قبل منتصف الليل — نشاط واحد واحد فقط يُبقيها حيّة.`,
          duration: 12000,
        });
      } else {
        toast('⏳ لم تُسجّل نشاط اليوم بعد', {
          description: `سلسلتك (${snap.unified.currentStreakDays} ${snap.unified.currentStreakDays === 1 ? 'يوم' : 'أيام'}) تنتظر علامتك اليومية.`,
          duration: 8000,
        });
      }
    };

    // First check after a quiet delay so app boot isn't noisy.
    const initial = window.setTimeout(check, 4000);
    const interval = window.setInterval(check, 5 * 60 * 1000);

    return () => {
      stopped = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}

// Re-export for consumers that want the raw assessor (tests etc).
export { assessStreakRisk };
