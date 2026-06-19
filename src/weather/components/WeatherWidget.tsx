// Compact home-page widget. Atmospheric Intelligence aesthetic:
// near-black surface, restrained gold, Cormorant display, Montserrat body.

import { useNavigate } from 'react-router-dom';
import { useWeather } from '../hooks/useWeather';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog, MoonStar } from '@/lib/icons';
import { useWeatherForecast } from '../hooks/useWeatherForecast';

function iconFor(code: number, isDay: boolean) {
  if (code <= 1)             return isDay ? Sun : MoonStar;
  if (code === 2)            return Cloudy;
  if (code === 3)            return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57)   return CloudDrizzle;
  if (code >= 61 && code <= 67)   return CloudRain;
  if (code >= 71 && code <= 77)   return CloudSnow;
  if (code >= 80 && code <= 82)   return CloudRain;
  if (code >= 85 && code <= 86)   return CloudSnow;
  if (code >= 95)                 return CloudLightning;
  return isDay ? Sun : MoonStar;
}

export default function WeatherWidget() {
  const navigate = useNavigate();
  const { snapshot } = useWeather('ar');
  const { forecast } = useWeatherForecast('ar');

  if (!snapshot) {
    return (
      <button
        onClick={() => navigate('/weather')}
        className="w-full text-left rounded-2xl border border-[#1f1f1f] bg-[#0e0e0e] p-4 h-24 animate-pulse"
        aria-label="Loading weather"
      />
    );
  }

  const Icon = iconFor(forecast.hourly[0]?.weather_code ?? 0, forecast.hourly[0]?.is_day ?? true);
  const temp = Math.round(snapshot.temperature.actual_c);
  const apparent = Math.round(snapshot.temperature.apparent_c);
  const hi = Math.round(snapshot.temperature.daily_high_c);
  const lo = Math.round(snapshot.temperature.daily_low_c);

  return (
    <button
      onClick={() => navigate('/weather')}
      className="w-full text-left rounded-2xl border border-[#1f1f1f] bg-gradient-to-br from-[#141414] to-[#0a0a0a] p-4 transition active:scale-[0.985]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-cormorant text-4xl leading-none text-[#F5F0E8]">{temp}°</span>
            <span className="text-xs text-[#8A8A8A] font-montserrat tracking-wide uppercase">feels {apparent}°</span>
          </div>
          <div className="mt-1 text-[11px] font-montserrat tracking-[0.18em] uppercase text-[#8B6914]">
            H {hi}°  ·  L {lo}°
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Icon className="w-9 h-9 text-[#C9A84C]" strokeWidth={1.25} />
          <span className="text-[10px] font-montserrat text-[#8A8A8A]">
            conf {snapshot.meta.ensemble_confidence_percent}%
          </span>
        </div>
      </div>
    </button>
  );
}
