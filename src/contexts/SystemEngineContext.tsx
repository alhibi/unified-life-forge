import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { useApp } from '@/contexts/AppContext';

// ────────────────────────────────────────────────────────────────────────
// TS Interfaces for Network & Battery APIs
// ────────────────────────────────────────────────────────────────────────
interface NetworkConnection extends EventTarget {
  downlink?: number;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  rtt?: number;
  saveData?: boolean;
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

/** Extended navigator to support experimental APIs safely. */
interface ExtendedNavigator extends Navigator {
  connection?: NetworkConnection;
  getBattery?: () => Promise<BatteryManager>;
}

export interface SystemEngineContextType {
  // 1. Hardware & Context Engine
  dataSaver: boolean;
  batterySaver: boolean;
  connectionType: string;
  batteryLevel: number;
  isCharging: boolean;
  toggleDataSaverManual: () => void;
  toggleBatterySaverManual: () => void;

  // 2. Split-Pane Layout Engine
  splitActive: boolean;
  setSplitActive: (active: boolean) => void;
  splitUrl: string;
  setSplitUrl: (url: string) => void;
  splitSize: number;
  setSplitSize: (size: number) => void;
  splitLayout: 'horizontal' | 'vertical';
  setSplitLayout: (layout: 'horizontal' | 'vertical') => void;
}

const SystemEngineContext = createContext<SystemEngineContextType | undefined>(undefined);

/** Motion profile forced while battery saver is active. */
const SAVER_MOTION_SPEED = 0.25;
const SAVER_FPS_CAP = 60 as const;

const readFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

const writeKey = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — preference is session-only */
  }
};

const removeKey = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
};

export function SystemEngineProvider({ children }: { children: ReactNode }) {
  const { motionSpeed, setMotionSpeed, fpsCap, setFpsCap } = useApp();

  // ────────────────────────────────────────────────────────────────────
  // 1. Hardware & Environmental Context Engine
  // ────────────────────────────────────────────────────────────────────
  const [dataSaver, setDataSaver] = useState<boolean>(() => readFlag('sys-data-saver'));
  const [batterySaver, setBatterySaver] = useState<boolean>(() => readFlag('sys-battery-saver'));
  const [connectionType, setConnectionType] = useState<string>('4g');
  const [batteryLevel, setBatteryLevel] = useState<number>(1);
  const [isCharging, setIsCharging] = useState<boolean>(true);

  // Live mirrors of the user's motion preferences. The battery-saver
  // effect must read them WITHOUT taking them as dependencies, otherwise
  // toggling the saver re-runs on every preference change and fights the
  // user. Refs keep the values fresh with a stable effect identity.
  const motionSpeedRef = useRef(motionSpeed);
  const fpsCapRef = useRef(fpsCap);

  // Update refs after render to avoid "cannot update ref during render" warning
  useLayoutEffect(() => {
    motionSpeedRef.current = motionSpeed;
    fpsCapRef.current = fpsCap;
  }, [motionSpeed, fpsCap]);

  // Pre-saver snapshot, persisted so a reload while the saver is active
  // does not lock the user into the reduced profile forever.
  const prevMotionSpeed = useRef<number | null>(null);
  const prevFpsCap = useRef<string | null>(null);

  // Monitor network connection.
  useEffect(() => {
    const connection = (navigator as ExtendedNavigator).connection;
    if (!connection) return;

    const updateNetwork = () => {
      setConnectionType(connection.effectiveType || '4g');
      // The OS-level "save data" flag turns the app's data saver ON, but
      // must never turn a manually-enabled data saver back OFF.
      if (connection.saveData) setDataSaver(true);
    };
    connection.addEventListener('change', updateNetwork);
    updateNetwork();
    return () => connection.removeEventListener('change', updateNetwork);
  }, []);

  // Monitor battery life.
  useEffect(() => {
    const extNav = navigator as ExtendedNavigator;
    if (!extNav.getBattery) return;

    let batManager: BatteryManager | null = null;
    let cancelled = false;

    const updateBattery = () => {
      if (!batManager) return;
      setBatteryLevel(batManager.level);
      setIsCharging(batManager.charging);

      // Below 20% and unplugged → auto-enable the saver, once.
      if (batManager.level < 0.2 && !batManager.charging) {
        setBatterySaver((prev) => {
          if (prev) return prev;
          writeKey('sys-battery-saver', 'true');
          toast.warning('تم تفعيل موفّر البطارية تلقائياً لانخفاض طاقة الجهاز.', {
            id: 'battery-saver-alert',
          });
          return true;
        });
      }
    };

    extNav.getBattery().then((bm) => {
      if (cancelled) return;
      batManager = bm;
      bm.addEventListener('levelchange', updateBattery);
      bm.addEventListener('chargingchange', updateBattery);
      updateBattery();
    });

    return () => {
      cancelled = true;
      if (batManager) {
        batManager.removeEventListener('levelchange', updateBattery);
        batManager.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  // Apply / revert the reduced motion profile when the saver flips.
  //
  // Guarded by `hasAppliedRef` so the very first run (mount, saver OFF)
  // does NOT call setMotionSpeed/setFpsCap — that used to silently reset
  // the user's saved "0.25x" / "60 Hz" choices on every cold boot.
  const hasAppliedRef = useRef(false);
  useEffect(() => {
    const root = document.documentElement;

    if (batterySaver) {
      // Snapshot the real preferences the first time we clamp them.
      if (prevMotionSpeed.current === null) {
        const stored = (() => {
          try {
            return localStorage.getItem('sys-battery-saver-prev-motion');
          } catch {
            return null;
          }
        })();
        const parsed = stored === null ? NaN : parseFloat(stored);
        prevMotionSpeed.current = Number.isFinite(parsed) ? parsed : motionSpeedRef.current;
        writeKey('sys-battery-saver-prev-motion', String(prevMotionSpeed.current));
      }
      if (prevFpsCap.current === null) {
        const stored = (() => {
          try {
            return localStorage.getItem('sys-battery-saver-prev-fps');
          } catch {
            return null;
          }
        })();
        prevFpsCap.current = stored ?? String(fpsCapRef.current);
        writeKey('sys-battery-saver-prev-fps', prevFpsCap.current);
      }

      root.setAttribute('data-battery-saver', 'true');
      setMotionSpeed(SAVER_MOTION_SPEED);
      setFpsCap(SAVER_FPS_CAP);
      hasAppliedRef.current = true;
      return;
    }

    root.removeAttribute('data-battery-saver');

    // Nothing to revert on a cold boot with the saver already off.
    if (!hasAppliedRef.current) {
      hasAppliedRef.current = true;
      return;
    }

    const speed = prevMotionSpeed.current;
    if (speed !== null && Number.isFinite(speed)) setMotionSpeed(speed);

    const cap = prevFpsCap.current;
    if (cap !== null) {
      setFpsCap(
        cap === '60' || cap === '90' || cap === '120' ? (Number(cap) as 60 | 90 | 120) : 'auto',
      );
    }

    prevMotionSpeed.current = null;
    prevFpsCap.current = null;
    removeKey('sys-battery-saver-prev-motion');
    removeKey('sys-battery-saver-prev-fps');
  }, [batterySaver, setMotionSpeed, setFpsCap]);

  useEffect(() => {
    const root = document.documentElement;
    if (dataSaver) root.setAttribute('data-data-saver', 'true');
    else root.removeAttribute('data-data-saver');
  }, [dataSaver]);

  const toggleDataSaverManual = useCallback(() => {
    setDataSaver((prev) => {
      const next = !prev;
      writeKey('sys-data-saver', String(next));
      toast.success(next ? 'تم تفعيل وضع توفير البيانات.' : 'تم إيقاف وضع توفير البيانات.');
      return next;
    });
  }, []);

  const toggleBatterySaverManual = useCallback(() => {
    setBatterySaver((prev) => {
      const next = !prev;
      writeKey('sys-battery-saver', String(next));
      toast.success(next ? 'تم تفعيل موفّر البطارية.' : 'تم إيقاف موفّر البطارية.');
      return next;
    });
  }, []);

  // ────────────────────────────────────────────────────────────────────
  // 2. Dynamic Workspace & Split-Pane Layout Engine
  //
  // Deliberately NOT persisted: the split pane mounts a second copy of
  // the whole app in an iframe, so restoring it on every cold boot
  // doubled memory and network cost before the user asked for it.
  // ────────────────────────────────────────────────────────────────────
  const [splitActive, setSplitActiveState] = useState(false);
  const [splitUrl, setSplitUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem('sys-split-url') || '/pkm';
    } catch {
      return '/pkm';
    }
  });
  const [splitSize, setSplitSizeState] = useState<number>(() => {
    try {
      const n = parseInt(localStorage.getItem('sys-split-size') || '50', 10);
      return Number.isFinite(n) ? Math.min(80, Math.max(20, n)) : 50;
    } catch {
      return 50;
    }
  });
  const [splitLayout, setSplitLayoutState] = useState<'horizontal' | 'vertical'>(() => {
    try {
      return localStorage.getItem('sys-split-layout') === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });

  const setSplitActive = useCallback((active: boolean) => {
    setSplitActiveState(active);
    toast.success(active ? 'تم تفعيل مساحة العمل المنقسمة.' : 'تم إيقاف مساحة العمل المنقسمة.');
  }, []);

  const setSplitUrl = useCallback((url: string) => {
    setSplitUrlState(url);
    writeKey('sys-split-url', url);
  }, []);

  const setSplitSize = useCallback((size: number) => {
    setSplitSizeState(size);
    writeKey('sys-split-size', String(size));
  }, []);

  const setSplitLayout = useCallback((layout: 'horizontal' | 'vertical') => {
    setSplitLayoutState(layout);
    writeKey('sys-split-layout', layout);
  }, []);

  const value = useMemo<SystemEngineContextType>(
    () => ({
      dataSaver,
      batterySaver,
      connectionType,
      batteryLevel,
      isCharging,
      toggleDataSaverManual,
      toggleBatterySaverManual,
      splitActive,
      setSplitActive,
      splitUrl,
      setSplitUrl,
      splitSize,
      setSplitSize,
      splitLayout,
      setSplitLayout,
    }),
    [
      dataSaver,
      batterySaver,
      connectionType,
      batteryLevel,
      isCharging,
      toggleDataSaverManual,
      toggleBatterySaverManual,
      splitActive,
      setSplitActive,
      splitUrl,
      setSplitUrl,
      splitSize,
      setSplitSize,
      splitLayout,
      setSplitLayout,
    ],
  );

  return <SystemEngineContext.Provider value={value}>{children}</SystemEngineContext.Provider>;
}

export function useSystemEngine() {
  const ctx = useContext(SystemEngineContext);
  if (!ctx) throw new Error('useSystemEngine must be used within SystemEngineProvider');
  return ctx;
}
