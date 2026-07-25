import { useNavigate } from 'react-router-dom';

import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
// One WMO code vocabulary for the whole app — see features/weather/lib/conditions.
import { iconForWeatherCode, labelForWeatherCode } from '@/features/weather/lib/conditions';
import { ChevronLeft, Droplets, Wind as WindIcon } from '@/lib/icons';

export default function WeatherWidget() {
  const navigate = useNavigate();
  const { data } = useWeatherData('ar');

  if (!data) {
    return (
      <div
        className="w-full rounded-2xl border border-border/60 bg-card p-4 animate-pulse"
        style={{ minHeight: 132 }}
        aria-label={'جارٍ تحميل الطقس'}
      />
    );
  }

  const { current } = data;
  const Icon = iconForWeatherCode(current.weatherCode, current.isDay);
  const temp = Math.round(current.temperature);
  const apparent = Math.round(current.apparentTemperature);
  const hi = Math.round(data.daily[0]?.tempMax ?? temp);
  const lo = Math.round(data.daily[0]?.tempMin ?? temp);
  const cond = labelForWeatherCode(current.weatherCode);

  return (
    <button
      onClick={() => navigate('/weather')}
      dir={'rtl'}
      className="w-full text-start rounded-2xl border border-border/60 bg-card overflow-hidden surface-depth-pressable active:scale-[0.98]"
      aria-label={'فتح تفاصيل الطقس'}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground truncate">
              {'الطقس الآن'}
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
            <div>{'الإحساس'} <span className="text-foreground/85 font-medium">{apparent}°</span></div>
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