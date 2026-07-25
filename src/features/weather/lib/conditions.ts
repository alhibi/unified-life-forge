/**
 * WMO weather-code vocabulary — the single source of truth for turning a
 * numeric condition code into a glyph and an Arabic label.
 *
 * This mapping was previously copy-pasted (with small divergences) into
 * WeatherWidget, the weather hub and the portal. Divergent copies meant code
 * 80 read "زخات مطر" on one screen and "أمطار" on another for the same hour.
 *
 * Reference: WMO code table 4677 as exposed by Open-Meteo's `weather_code`.
 */
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Cloudy,
  type IconComponent,
  MoonStar,
  Sun,
} from '@/lib/icons';

export type WeatherSeverity = 'calm' | 'mild' | 'notable' | 'severe';

export interface WeatherCondition {
  label: string;
  icon: IconComponent;
  severity: WeatherSeverity;
}

export function iconForWeatherCode(code: number, isDay = true): IconComponent {
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

export function labelForWeatherCode(code: number): string {
  if (code === 0) return 'صافٍ';
  if (code === 1) return 'صافٍ غالباً';
  if (code === 2) return 'غائم جزئياً';
  if (code === 3) return 'غائم';
  if (code === 45) return 'ضباب';
  if (code === 48) return 'ضباب متجمد';
  if (code >= 51 && code <= 55) return 'رذاذ';
  if (code === 56 || code === 57) return 'رذاذ متجمد';
  if (code >= 61 && code <= 65) return 'أمطار';
  if (code === 66 || code === 67) return 'مطر متجمد';
  if (code >= 71 && code <= 75) return 'ثلوج';
  if (code === 77) return 'حبيبات ثلجية';
  if (code >= 80 && code <= 82) return 'زخات مطر';
  if (code === 85 || code === 86) return 'زخات ثلج';
  if (code === 95) return 'عواصف رعدية';
  if (code === 96 || code === 99) return 'رعد مع برد';
  return '—';
}

export function severityForWeatherCode(code: number): WeatherSeverity {
  if (code >= 95) return 'severe';
  if (code >= 80 || (code >= 61 && code <= 77)) return 'notable';
  if (code >= 45) return 'mild';
  return 'calm';
}

export function describeWeatherCode(code: number, isDay = true): WeatherCondition {
  return {
    label: labelForWeatherCode(code),
    icon: iconForWeatherCode(code, isDay),
    severity: severityForWeatherCode(code),
  };
}
