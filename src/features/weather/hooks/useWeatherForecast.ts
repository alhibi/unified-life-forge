// useWeatherForecast — returns the full forecast layers bundle.

import { useEffect, useState } from 'react';

import { useDeviceLocation } from '@/hooks/useDeviceLocation';

import { weatherEngine } from '../engine/WeatherEngine';
import type { ForecastLayers } from '../types/ForecastLayer';
import { EMPTY_FORECAST } from '../types/ForecastLayer';

export function useWeatherForecast(
  language: 'ar' | 'en' = 'ar',
  customCoords?: { lat: number; lng: number; name?: string } | null
): {
  forecast: ForecastLayers;
  loading: boolean;
} {
  const { location: deviceLoc } = useDeviceLocation();
  const location = customCoords || deviceLoc;
  const [forecast, setForecast] = useState<ForecastLayers>(EMPTY_FORECAST);
  const [loading, setLoading] = useState(true); // Start loading true until we have data

  useEffect(() => {
    const off = weatherEngine.subscribe(r => {
      // Filter out unrelated updates when we're viewing specific custom coordinates
      if (customCoords && r.snapshot) {
        const dLat = Math.abs(r.snapshot.meta.location.lat - customCoords.lat);
        const dLng = Math.abs(r.snapshot.meta.location.lng - customCoords.lng);
        if (dLat > 0.05 || dLng > 0.05) return;
      }
      setForecast(r.forecast);
      setLoading(false); // Got data from subscription
    });
    return off;
  }, [customCoords?.lat, customCoords?.lng]);

  useEffect(() => {
    if (!location) {
      setLoading(false);
      return;
    }
    setLoading(true);
    weatherEngine.request({ lat: location.lat, lng: location.lng, language })
      .then(r => {
        setForecast(r.forecast);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [location?.lat, location?.lng, language]);

  return { forecast, loading };
}
