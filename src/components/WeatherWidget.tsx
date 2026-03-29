import React, { useEffect, useState, useCallback } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog, MoonStar, Droplets } from 'lucide-react';

interface HourForecast {
  hour: number;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  precipitation: number;
}

interface CachedWeather {
  forecast: HourForecast[];
  currentTemp: number;
  timestamp: number;
  lat: number;
  lon: number;
}

const CACHE_KEY = 'weather_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 min
const REFRESH_INTERVAL = 15 * 60 * 1000;

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

const loadCache = (): CachedWeather | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached;
  } catch { /* ignore */ }
  return null;
};

const saveCache = (data: CachedWeather) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
};

export default function WeatherWidget() {
  const [forecast, setForecast] = useState<HourForecast[]>([]);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);

  // Load cache immediately on mount
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setForecast(cached.forecast);
      setCurrentTemp(cached.currentTemp);
    }
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day,precipitation_probability&timezone=auto&forecast_days=2`
      );
      const data = await res.json();
      if (data?.current && data?.hourly) {
        const temp = Math.round(data.current.temperature_2m);
        // Use the API's current time to determine the correct local hour
        const apiCurrentTime = data.current.time; // e.g. "2026-03-29T20:00"
        const currentHour = parseInt(apiCurrentTime.split('T')[1].split(':')[0], 10);
        const currentDateStr = apiCurrentTime.split('T')[0];
        
        const hours: HourForecast[] = [];
        const allTimes: string[] = data.hourly.time;
        
        // Find the index matching current hour
        const startIdx = allTimes.findIndex((t: string) => {
          const [date, time] = t.split('T');
          const h = parseInt(time.split(':')[0], 10);
          return date === currentDateStr && h === currentHour;
        });
        
        if (startIdx >= 0) {
          for (let i = startIdx; i < allTimes.length && hours.length < 12; i++) {
            const h = parseInt(allTimes[i].split('T')[1].split(':')[0], 10);
            hours.push({
              hour: h,
              temperature: Math.round(data.hourly.temperature_2m[i]),
              weatherCode: data.hourly.weather_code[i],
              isDay: data.hourly.is_day[i] === 1,
              precipitation: data.hourly.precipitation_probability[i] ?? 0,
            });
          }
        }
        
        if (hours.length > 0) {
          setCurrentTemp(temp);
          setForecast(hours);
          saveCache({ forecast: hours, currentTemp: temp, timestamp: Date.now(), lat, lon });
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    // Try cached location first for instant fetch
    const cached = loadCache();
    if (cached) {
      fetchWeather(cached.lat, cached.lon);
    }

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeather(latitude, longitude);
        interval = setInterval(() => fetchWeather(latitude, longitude), REFRESH_INTERVAL);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (!forecast.length || currentTemp === null) return null;

  const nowHour = forecast.length > 0 ? forecast[0].hour : -1;

  const formatHour = (h: number) => {
    if (h === nowHour) return 'الآن';
    const period = h < 12 ? 'ص' : 'م';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}${period}`;
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-[11px] font-medium text-muted-foreground">حالة الطقس</span>
        <span className="text-[13px] font-bold text-foreground mr-auto">{currentTemp}°</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        {forecast.map((f) => {
          const Icon = getWeatherIcon(f.weatherCode, f.isDay);
          const isNow = f.hour === new Date().getHours();
          return (
            <div
              key={f.hour}
              className={`flex flex-col items-center gap-1 min-w-[32px] rounded-xl py-1.5 ${isNow ? 'bg-secondary' : ''}`}
            >
              <span className={`text-[10px] ${isNow ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                {formatHour(f.hour)}
              </span>
              <Icon className="w-3.5 h-3.5 stroke-[1.6] text-muted-foreground" />
              {f.precipitation > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/70">
                  <Droplets className="w-2.5 h-2.5" />
                  {f.precipitation}%
                </span>
              )}
              <span className={`text-[11px] font-semibold ${isNow ? 'text-foreground' : 'text-muted-foreground'}`}>
                {f.temperature}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
