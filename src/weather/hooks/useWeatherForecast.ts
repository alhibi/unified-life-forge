// useWeatherForecast — returns the full forecast layers bundle.

import { useEffect, useState } from 'react';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { weatherEngine } from '../engine/WeatherEngine';
import type { ForecastLayers } from '../types/ForecastLayer';
import { EMPTY_FORECAST } from '../types/ForecastLayer';

export function useWeatherForecast(language: 'ar' | 'de' | 'en' = 'ar'): {
  forecast: ForecastLayers;
  loading: boolean;
} {
  const { location } = useDeviceLocation();
  const [forecast, setForecast] = useState<ForecastLayers>(EMPTY_FORECAST);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const off = weatherEngine.subscribe(r => setForecast(r.forecast));
    return off;
  }, []);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    weatherEngine.request({ lat: location.lat, lng: location.lng, language })
      .then(r => setForecast(r.forecast))
      .finally(() => setLoading(false));
  }, [location?.lat, location?.lng, language]);

  return { forecast, loading };
}
