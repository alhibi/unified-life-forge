import React, { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog } from 'lucide-react';

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

const getWeatherIcon = (code: number) => {
  if (code === 0 || code === 1) return Sun;
  if (code === 2) return Cloudy;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Sun;
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );
          const data = await res.json();
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code,
          });
        } catch { /* silent */ }
      },
      () => { /* no permission, stay hidden */ },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  if (!weather) return null;

  const Icon = getWeatherIcon(weather.weatherCode);

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="w-4 h-4 stroke-[1.6] text-sky-500 dark:text-sky-400" />
      <span className="text-[15px] font-semibold text-foreground">{weather.temperature}°</span>
    </div>
  );
}
