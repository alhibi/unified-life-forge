// useWeather — primary React entry point. Returns the live snapshot,
// status, error, and refresh function. Subscribes to the engine's
// in-memory event bus so any caller of `weatherEngine.request` updates
// all subscribers.

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDeviceLocation } from '@/hooks/useDeviceLocation';

import { type EngineResult,weatherEngine } from '../engine/WeatherEngine';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseWeatherResult {
  snapshot: WeatherSnapshot | null;
  status: WeatherStatus;
  error: string | null;
  tier: EngineResult['tier'] | null;
  isRefreshing: boolean;
  refresh: () => void;
  lastResponses: EngineResult['responses'];
}

export function useWeather(
  language: 'ar' | 'en' = 'ar',
  customCoords?: { lat: number; lng: number } | null
): UseWeatherResult {
  const { location: deviceLoc } = useDeviceLocation();
  const location = customCoords || deviceLoc;
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<EngineResult['tier'] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastResponses, setLastResponses] = useState<EngineResult['responses']>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const reqId = useRef(0);

  const refresh = useCallback(() => setRefreshNonce(n => n + 1), []);

  // Listen for engine emissions originating from other callers (LivingRibbon,
  // SmartGreeting, etc.) so all views stay in sync.
  useEffect(() => {
    const off = weatherEngine.subscribe((r) => {
      // If we are looking at custom coords, we should make sure the emitted snapshot is indeed close to our target coords
      if (customCoords && r.snapshot) {
        const dLat = Math.abs(r.snapshot.meta.location.lat - customCoords.lat);
        const dLng = Math.abs(r.snapshot.meta.location.lng - customCoords.lng);
        if (dLat > 0.05 || dLng > 0.05) return; // ignore other coordinates updates
      }
      setSnapshot(r.snapshot);
      setTier(r.tier);
      setLastResponses(r.responses);
      if (r.tier === 'fresh') setIsRefreshing(false);
    });
    return off;
  }, [customCoords?.lat, customCoords?.lng]);

  useEffect(() => {
    if (!location) return;
    const myId = ++reqId.current;
    setStatus(prev => snapshot ? prev : 'loading');
    setError(null);
    setIsRefreshing(true);
    weatherEngine.request({
      lat: location.lat,
      lng: location.lng,
      language,
      forceRefresh: refreshNonce > 0,
    }).then(r => {
      if (reqId.current !== myId) return;
      setSnapshot(r.snapshot);
      setTier(r.tier);
      setLastResponses(r.responses);
      setStatus('success');
      setIsRefreshing(false);
    }).catch(e => {
      if (reqId.current !== myId) return;
      setError((e as Error).message);
      setStatus(_prev => snapshot ? 'success' : 'error');
      setIsRefreshing(false);
    });
  }, [location?.lat, location?.lng, language, refreshNonce]);

  // Periodic refresh every 15 min.
  useEffect(() => {
    if (!location) return;
    const id = setInterval(() => setRefreshNonce(n => n + 1), 15 * 60_000);
    return () => clearInterval(id);
  }, [location?.lat, location?.lng]);

  return { snapshot, status, error, tier, isRefreshing, refresh, lastResponses };
}
