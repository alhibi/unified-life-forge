// Provider registry + user-preferences helpers.
//
// The hub stores two pieces of user choice in localStorage:
//
//   weather_provider     → 'open-meteo' | 'openweathermap' (default open-meteo)
//   weather_owm_apikey   → user-supplied OpenWeatherMap API key (string)
//
// We expose plain helpers (no React) so that:
//   • the Weather page can read/write them directly without a provider
//     context, and
//   • the useWeatherData hook can subscribe to changes via a tiny
//     event-target so a setting change re-fires the fetch.

import { openMeteoProvider } from './openMeteo';
import { openWeatherMapProvider } from './openWeatherMap';
import type { ProviderDescriptor, ProviderId } from './types';

const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  'open-meteo':     openMeteoProvider,
  'openweathermap': openWeatherMapProvider,
};

export const PROVIDER_ORDER: ProviderId[] = ['open-meteo', 'openweathermap'];

export function listProviders(): ProviderDescriptor[] {
  return PROVIDER_ORDER.map(id => PROVIDERS[id]);
}

export function getProvider(id: ProviderId): ProviderDescriptor {
  return PROVIDERS[id] ?? openMeteoProvider;
}

// ── localStorage prefs ───────────────────────────────────────────────────

const PROVIDER_KEY = 'weather_provider';
const OWM_API_KEY  = 'weather_owm_apikey';

export function readProviderPref(): ProviderId {
  try {
    const raw = localStorage.getItem(PROVIDER_KEY);
    if (raw === 'open-meteo' || raw === 'openweathermap') return raw;
  } catch { /* noop */ }
  return 'open-meteo';
}

export function writeProviderPref(id: ProviderId) {
  try { localStorage.setItem(PROVIDER_KEY, id); } catch { /* noop */ }
  emitWeatherPrefsChange();
}

export function readOwmApiKey(): string {
  try {
    return localStorage.getItem(OWM_API_KEY) ?? '';
  } catch { return ''; }
}

export function writeOwmApiKey(key: string) {
  try {
    if (key) localStorage.setItem(OWM_API_KEY, key);
    else localStorage.removeItem(OWM_API_KEY);
  } catch { /* noop */ }
  emitWeatherPrefsChange();
}

// ── Change subscription ──────────────────────────────────────────────────
//
// A lightweight EventTarget so the hook re-runs when the settings
// change, without forcing the Weather page to lift state up. The same
// "storage" event handles cross-tab updates.

const PREFS_EVENT = 'weather-prefs-changed';
const bus = typeof window !== 'undefined' ? new EventTarget() : null;

function emitWeatherPrefsChange() {
  bus?.dispatchEvent(new Event(PREFS_EVENT));
}

export function subscribeWeatherPrefs(cb: () => void): () => void {
  if (!bus) return () => undefined;
  bus.addEventListener(PREFS_EVENT, cb);
  // Cross-tab parity: the Storage event fires on other tabs when this
  // one writes via setItem.
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROVIDER_KEY || e.key === OWM_API_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    bus.removeEventListener(PREFS_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export type { ProviderDescriptor, ProviderId };
