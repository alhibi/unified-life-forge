import React, { useEffect, useState, useCallback } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog, MoonStar } from 'lucide-react';

interface HourForecast {
  hour: number;
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

const REFRESH_INTERVAL = 15 * 60 * 1000;

export default function WeatherWidget() {
  const [forecast, setForecast] = useState<HourForecast[]>([]);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&timezone=auto&forecast_days=1`
      );
      const data = await res.json();
      if (data?.current && data?.hourly) {
        setCurrentTemp(Math.round(data.current.temperature_2m));
        const currentHour = new Date().getHours();
        const hours: HourForecast[] = [];
        for (let i = currentHour; i < 24 && hours.length < 12; i++) {
          hours.push({
            hour: i,
            temperature: Math.round(data.hourly.temperature_2m[i]),
            weatherCode: data.hourly.weather_code[i],
            isDay: data.hourly.is_day[i] === 1,
          });
        }
        setForecast(hours);
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

  if (!forecast.length || currentTemp === null) return null;

  const formatHour = (h: number) => {
    if (h === new Date().getHours()) return 'الآن';
    const period = h < 12 ? 'ص' : 'م';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}${period}`;
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-3">
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
