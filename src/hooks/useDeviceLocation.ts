// Single source of truth for the device's last-known coordinates.
//
// Before this hook existed, the same `navigator.geolocation.getCurrentPosition`
// + `localStorage.lastLocation` dance was duplicated in Index, PrayerTimes,
// LocationSaver, plus reads from CurrentTimeSunnah, WeatherWidget, and
// useAutoPrayerTheme. Each had subtly different fallback timeouts, slightly
// different storage event handling, and Index's auto-prompt fired before any
// UI was on screen — most modern browsers reject silent prompts like that.
//
// This hook lifts everything to a *module-level singleton*: one in-flight
// `getCurrentPosition` call (with concurrent-call coalescing), one set of
// listeners, deterministic state machine, and a single canonical
// `lastLocation` localStorage key. Cross-tab and same-tab updates are
// reconciled through both the native `storage` event and a custom
// `locationUpdated` event so existing code paths keep working unchanged.
//
// Auto-prompting is *opt-in* per consumer — the hook never asks for the
// permission on its own. Callers that want the historic "ask on first
// homepage visit" behavior call `requestLocation()` explicitly inside a
// `useEffect`, which means the prompt only fires after the page has
// painted (no more "Allow location?" before the user knows what app this
// even is).

import { useEffect, useState } from 'react';

export interface DeviceCoords {
  lat: number;
  lng: number;
}

/**
 * Lifecycle of a request, in order:
 *
 * - `idle`        — nothing has been read yet, no cached value.
 * - `cached`      — loaded from `localStorage.lastLocation` on first mount.
 *                   Treated as ground truth until the user re-asks.
 * - `requesting`  — `getCurrentPosition` is in flight.
 * - `granted`     — OS returned coordinates. They have been persisted.
 * - `denied`      — user denied, OS errored, or the 8 s timeout fired.
 *                   `location` either keeps the previous cached value or
 *                   falls back to `MECCA_FALLBACK`.
 * - `unavailable` — `navigator.geolocation` is undefined entirely.
 */
export type DeviceLocationStatus =
  | 'idle'
  | 'cached'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable';

const STORAGE_KEY = 'lastLocation';
const UPDATE_EVENT = 'locationUpdated';
const REQUEST_TIMEOUT_MS = 8000;
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 5 * 60_000,
  timeout: 7000,
};

/**
 * Default fallback coordinates: Mecca (Masjid al-Haram).
 * This is an Islamic-companion app — when geolocation fails, defaulting to
 * Mecca minimizes "wrong prayer time" surprises for the largest expected
 * audience and is far less wrong than e.g. Greenwich would be.
 */
export const MECCA_FALLBACK: DeviceCoords = { lat: 21.4225, lng: 39.8262 };

// ── Module-level singleton state ─────────────────────────────────────────
type Listener = (loc: DeviceCoords | null, status: DeviceLocationStatus) => void;

let currentLocation: DeviceCoords | null = null;
let currentStatus: DeviceLocationStatus = 'idle';
let bootstrapped = false;
const listeners = new Set<Listener>();

let inflightRequest: Promise<DeviceCoords | null> | null = null;
let inflightTimeout: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l(currentLocation, currentStatus);
}

function setState(loc: DeviceCoords | null, status: DeviceLocationStatus) {
  currentLocation = loc;
  currentStatus = status;
  emit();
}

function readCached(): DeviceCoords | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch { /* corrupted storage — treat as missing */ }
  return null;
}

function persist(loc: DeviceCoords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch { /* quota or privacy mode — non-fatal */ }
}

function onSameTabUpdate() {
  // Another widget (e.g. LocationSaver) wrote `lastLocation` directly and
  // dispatched the legacy `locationUpdated` event. Re-read so consumers
  // converge on the same value.
  const cached = readCached();
  if (cached) {
    // Don't overwrite a `requesting`/`granted` status with `cached` — the
    // request still has the strongest claim.
    const status: DeviceLocationStatus =
      currentStatus === 'requesting' || currentStatus === 'granted'
        ? currentStatus
        : 'cached';
    setState(cached, status);
  }
}

function onCrossTabStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) onSameTabUpdate();
}

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  const cached = readCached();
  if (cached) setState(cached, 'cached');
  if (typeof window !== 'undefined') {
    window.addEventListener(UPDATE_EVENT, onSameTabUpdate);
    window.addEventListener('storage', onCrossTabStorage);
  }
}

/**
 * Force a fresh `getCurrentPosition` call. Resolves with the coordinates
 * (or `null` if the request was rejected). Concurrent calls share a
 * single in-flight Promise — repeatedly tapping "use my location" never
 * spawns parallel permission prompts.
 *
 * Side effects:
 *  • On success: persists to `localStorage.lastLocation` and dispatches
 *    a `locationUpdated` event so legacy listeners stay in sync.
 *  • On denial / timeout / unavailable: location falls back to the
 *    previously cached value, or `MECCA_FALLBACK` if there was none.
 */
export function requestDeviceLocation(): Promise<DeviceCoords | null> {
  bootstrap();
  if (inflightRequest) return inflightRequest;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    setState(currentLocation ?? MECCA_FALLBACK, 'unavailable');
    return Promise.resolve(currentLocation);
  }

  setState(currentLocation, 'requesting');

  inflightRequest = new Promise<DeviceCoords | null>((resolve) => {
    let settled = false;

    const finish = (loc: DeviceCoords | null, status: DeviceLocationStatus) => {
      if (settled) return;
      settled = true;
      if (inflightTimeout) {
        clearTimeout(inflightTimeout);
        inflightTimeout = null;
      }
      setState(loc, status);
      resolve(loc);
    };

    // Some browsers stall silently rather than firing the error callback
    // (notably mobile Safari with a corrupted permission DB). Hard timeout
    // ensures consumers never wait forever.
    inflightTimeout = setTimeout(() => {
      finish(currentLocation ?? MECCA_FALLBACK, 'denied');
    }, REQUEST_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: DeviceCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        persist(loc);
        finish(loc, 'granted');
        try {
          window.dispatchEvent(new Event(UPDATE_EVENT));
        } catch { /* ignore */ }
      },
      () => {
        finish(currentLocation ?? MECCA_FALLBACK, 'denied');
      },
      POSITION_OPTIONS,
    );
  }).finally(() => {
    inflightRequest = null;
  });

  return inflightRequest;
}

/**
 * Synchronously read the singleton's current value. Useful in
 * non-React code paths (e.g. event handlers in legacy components).
 */
export function getCurrentDeviceLocation(): {
  location: DeviceCoords | null;
  status: DeviceLocationStatus;
} {
  bootstrap();
  return { location: currentLocation, status: currentStatus };
}

// ── React hook ───────────────────────────────────────────────────────────
export interface UseDeviceLocationResult {
  /** Last-known coordinates, or `null` until something has been resolved. */
  location: DeviceCoords | null;
  /** Where we are in the request lifecycle — see `DeviceLocationStatus`. */
  status: DeviceLocationStatus;
  /** Trigger a fresh OS-level permission prompt + position read. */
  requestLocation: () => Promise<DeviceCoords | null>;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  // Bootstrap synchronously inside the initializer so the very first render
  // already reflects any cached value — no flash-of-Mecca on cold loads.
  const [snapshot, setSnapshot] = useState<{
    loc: DeviceCoords | null;
    status: DeviceLocationStatus;
  }>(() => {
    bootstrap();
    return { loc: currentLocation, status: currentStatus };
  });

  useEffect(() => {
    const listener: Listener = (loc, status) => setSnapshot({ loc, status });
    listeners.add(listener);
    // Catch any updates that happened between render and effect commit.
    setSnapshot({ loc: currentLocation, status: currentStatus });
    return () => { listeners.delete(listener); };
  }, []);

  return {
    location: snapshot.loc,
    status: snapshot.status,
    requestLocation: requestDeviceLocation,
  };
}
