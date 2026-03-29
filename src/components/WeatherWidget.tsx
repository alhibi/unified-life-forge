import React, { useEffect, useState, useCallback } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog, MoonStar } from 'lucide-react';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
}

const getWeatherIcon = (code: number, isDay: boolean) => {
  if (code === 0 || code === 1) return isDay ? Sun : MoonStar;
  if (code === 2) return Cloudy;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return isDay ? Sun : MoonStar;
};

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
      );
      const data = await res.json();
      if (data?.current) {
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
        });
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeather(latitude, longitude);
        interval = setInterval(() => fetchWeather(latitude, longitude), REFRESH_INTERVAL);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (!weather) return null;

  const Icon = getWeatherIcon(weather.weatherCode, weather.isDay);
  const iconColor = weather.isDay
    ? 'text-amber-500 dark:text-amber-400'
    : 'text-indigo-400 dark:text-indigo-300';

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-4 h-4 stroke-[1.6] ${iconColor}`} />
      <span className="text-[15px] font-semibold text-foreground">{weather.temperature}°</span>
    </div>
  );
}
