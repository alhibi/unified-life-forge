import { useNavigate } from 'react-router-dom';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  Cloudy,
  CloudFog,
  MoonStar,
  Wind as WindIcon,
  Droplets,
  ChevronLeft,
} from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';
import { useWeatherData } from '@/weather/hooks/useWeatherData';

function iconFor(code: number, isDay: boolean) {
  if (code <= 1) return isDay ? Sun : MoonStar;
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
}

function conditionLabel(code: number, ar: boolean): string {
  if (code <= 1) return ar ? 'صافٍ' : 'Klar';
  if (code === 2) return ar ? 'غائم جزئياً' : 'Teilweise bewölkt';
  if (code === 3) return ar ? 'غائم' : 'Bewölkt';
  if (code === 45 || code === 48) return ar ? 'ضباب' : 'Nebel';
  if (code >= 51 && code <= 57) return ar ? 'رذاذ' : 'Nieselregen';
  if (code >= 61 && code <= 67) return ar ? 'أمطار' : 'Regen';
  if (code >= 71 && code <= 77) return ar ? 'ثلوج' : 'Schnee';
  if (code >= 80 && code <= 82) return ar ? 'زخات مطر' : 'Regenschauer';
  if (code >= 85 && code <= 86) return ar ? 'زخات ثلج' : 'Schneeschauer';
  if (code >= 95) return ar ? 'عواصف رعدية' : 'Gewitter';
  return '—';
}

export default function WeatherWidget() {
  const navigate = useNavigate();
  const { language } = useApp();
  const ar = language === 'ar';
  const { data } = useWeatherData('ar');

  if (!data) {
    return (
      <div
        className="w-full rounded-2xl border border-border/60 bg-card p-4 animate-pulse"
        style={{ minHeight: 132 }}
        aria-label={ar ? 'جارٍ تحميل الطقس' : 'Wetter wird geladen'}
      />
    );
  }

  const { current } = data;
  const Icon = iconFor(current.weatherCode, current.isDay);
  const temp = Math.round(current.temperature);
  const apparent = Math.round(current.apparentTemperature);
  const hi = Math.round(data.daily[0]?.tempMax ?? temp);
  const lo = Math.round(data.daily[0]?.tempMin ?? temp);
  const cond = conditionLabel(current.weatherCode, ar);

  return (
    <button
      onClick={() => navigate('/weather')}
      dir={ar ? 'rtl' : 'ltr'}
      className="w-full text-start rounded-2xl border border-border/60 bg-card overflow-hidden surface-depth-pressable active:scale-[0.98]"
      aria-label={ar ? 'فتح تفاصيل الطقس' : 'Wetterdetails öffnen'}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground truncate">
              {ar ? 'الطقس الآن' : 'Wetter jetzt'}
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground truncate">{cond}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" strokeWidth={1.55} />
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3" dir="ltr">
          <span className="text-[50px] font-extralight leading-none tracking-tighter text-foreground tabular-nums">
            {temp}°
          </span>
          <div className="pb-1 text-[11px] text-muted-foreground tabular-nums text-end">
            <div>{ar ? 'الإحساس' : 'Gefühlt'} <span className="text-foreground/85 font-medium">{apparent}°</span></div>
            <div>H {hi}° · L {lo}°</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <Droplets className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{Math.round(current.humidity)}%</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0" dir="ltr">
            <WindIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{Math.round(current.windSpeed)} km/h</span>
          </div>
        </div>
      </div>
    </button>
  );
}