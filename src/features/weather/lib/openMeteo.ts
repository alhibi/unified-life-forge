// Open-Meteo provider.
//
// No API key required. Returns 8 days of daily, 24 hours of hourly, and
// a separate air-quality endpoint for European AQI + PM. This is the
// default provider and what the legacy `WeatherWidget` also uses.

import type {
  AirQuality, CurrentWeather, DailyEntry, HourlyEntry, ProviderDescriptor,
  WeatherData,
} from './types';

async function fetchForecastImpl(
  lat: number, lon: number,
): Promise<Omit<WeatherData, 'airQuality' | 'city'>> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index` +
    `&hourly=temperature_2m,relative_humidity_2m,cloud_cover,weather_code,is_day,precipitation_probability,precipitation` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant` +
    `&timezone=auto&forecast_days=8`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();

  const c = json.current;
  const current: CurrentWeather = {
    temperature:         Math.round(c.temperature_2m),
    apparentTemperature: Math.round(c.apparent_temperature),
    humidity:            Math.round(c.relative_humidity_2m),
    precipitation:       c.precipitation ?? 0,
    weatherCode:         c.weather_code,
    isDay:               c.is_day === 1,
    cloudCover:          Math.round(c.cloud_cover),
    pressure:            Math.round(c.pressure_msl),
    windSpeed:           Math.round(c.wind_speed_10m),
    windDirection:       Math.round(c.wind_direction_10m),
    windGusts:           Math.round(c.wind_gusts_10m ?? c.wind_speed_10m),
    uvIndex:             Math.round((c.uv_index ?? 0) * 10) / 10,
    timestamp:           Date.now(),
  };

  // Hourly — pick the next 24 entries starting at the API's reported
  // "now". The hourly time array starts at the day's 00:00, so we have
  // to align by string equality with `current.time`.
  const apiNowIso: string = c.time;
  const hourlyTimes: string[] = json.hourly.time;
  const startIdx = hourlyTimes.findIndex(t => t === apiNowIso);
  const hourly: HourlyEntry[] = [];
  if (startIdx >= 0) {
    for (let i = startIdx; i < hourlyTimes.length && hourly.length < 24; i++) {
      const tIso = hourlyTimes[i];
      const hour = parseInt(tIso.split('T')[1].split(':')[0], 10);
      hourly.push({
        time: new Date(tIso).getTime(),
        hour,
        temperature: Math.round(json.hourly.temperature_2m[i]),
        weatherCode: json.hourly.weather_code[i],
        isDay: json.hourly.is_day[i] === 1,
        precipitationProbability: json.hourly.precipitation_probability?.[i] ?? 0,
        precipitation: json.hourly.precipitation?.[i] ?? 0,
      });
    }
  }

  const d = json.daily;

  // Per-day humidity (max) and cloud cover (mean) aren't in Open-Meteo's
  // daily aggregation set, so we derive them by grouping the FULL hourly
  // arrays by calendar date. This is independent of the 24-entry hourly
  // slice we keep above — it walks every forecast hour the API returned.
  const allHourTimes: string[] = json.hourly.time ?? [];
  const hHum: number[]   = json.hourly.relative_humidity_2m ?? [];
  const hCloud: number[] = json.hourly.cloud_cover ?? [];
  const humMaxByDay = new Map<string, number>();
  const cloudAggByDay = new Map<string, { sum: number; n: number }>();
  for (let i = 0; i < allHourTimes.length; i++) {
    const day = allHourTimes[i].split('T')[0];
    if (typeof hHum[i] === 'number') {
      humMaxByDay.set(day, Math.max(humMaxByDay.get(day) ?? 0, hHum[i]));
    }
    if (typeof hCloud[i] === 'number') {
      const e = cloudAggByDay.get(day) ?? { sum: 0, n: 0 };
      e.sum += hCloud[i];
      e.n += 1;
      cloudAggByDay.set(day, e);
    }
  }

  const daily: DailyEntry[] = (d.time as string[]).slice(0, 8).map((dIso, i) => {
    const dayKey = dIso.split('T')[0];
    const cloudAgg = cloudAggByDay.get(dayKey);
    return {
      date:                          new Date(dIso).getTime(),
      weatherCode:                   d.weather_code[i],
      tempMax:                       Math.round(d.temperature_2m_max[i]),
      tempMin:                       Math.round(d.temperature_2m_min[i]),
      sunrise:                       d.sunrise[i],
      sunset:                        d.sunset[i],
      uvIndexMax:                    Math.round((d.uv_index_max?.[i] ?? 0) * 10) / 10,
      precipitationSum:              d.precipitation_sum?.[i] ?? 0,
      precipitationProbabilityMax:   d.precipitation_probability_max?.[i] ?? 0,
      windSpeedMax:                  Math.round(d.wind_speed_10m_max?.[i] ?? 0),
      windGustsMax:                  Math.round(d.wind_gusts_10m_max?.[i] ?? 0) || undefined,
      windDirectionDominant:         Math.round(d.wind_direction_10m_dominant?.[i] ?? 0),
      humidityMax:                   humMaxByDay.has(dayKey) ? Math.round(humMaxByDay.get(dayKey)!) : undefined,
      cloudCoverMean:                cloudAgg ? Math.round(cloudAgg.sum / cloudAgg.n) : undefined,
    };
  });

  const allMin = Math.min(...daily.map(x => x.tempMin));
  const allMax = Math.max(...daily.map(x => x.tempMax));

  return {
    current,
    hourly,
    daily,
    weekRange: { min: allMin, max: allMax },
    fetchedAt: Date.now(),
    meta: {
      provider: 'open-meteo',
      apiNowIso,
      dailyDays: daily.length,
    },
  };
}

async function fetchAirQualityImpl(lat: number, lon: number): Promise<AirQuality> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,european_aqi_pm2_5,european_aqi_pm10,european_aqi_no2,european_aqi_o3,european_aqi_so2,pm2_5,pm10,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo air-quality HTTP ${res.status}`);
  const json = await res.json();
  const c = json.current ?? {};
  return {
    europeanAqi: c.european_aqi ?? null,
    pm2_5:       c.pm2_5 ?? null,
    pm10:        c.pm10 ?? null,
    subIndices: {
      pm2_5: c.european_aqi_pm2_5 ?? null,
      pm10:  c.european_aqi_pm10  ?? null,
      no2:   c.european_aqi_no2   ?? null,
      o3:    c.european_aqi_o3    ?? null,
      so2:   c.european_aqi_so2   ?? null,
    },
    pollen: {
      alder:   c.alder_pollen   ?? null,
      birch:   c.birch_pollen   ?? null,
      grass:   c.grass_pollen   ?? null,
      mugwort: c.mugwort_pollen ?? null,
      olive:   c.olive_pollen   ?? null,
      ragweed: c.ragweed_pollen ?? null,
    },
  };
}

export const openMeteoProvider: ProviderDescriptor = {
  id: 'open-meteo',
  name: { ar: 'Open-Meteo', de: 'Open-Meteo' },
  requiresApiKey: false,
  attribution: { label: 'Open-Meteo', url: 'https://open-meteo.com/' },
  notes: {
    ar: 'مصدر مفتوح ومجاني، لا يحتاج إلى مفتاح، يقدّم 7 أيام وفهرس الأشعة فوق البنفسجية.',
    de: 'Kostenlose Open-Source-Quelle, kein Schlüssel nötig, 7-Tage-Vorhersage inkl. UV-Index.',
  },
  fetchWeather: ({ lat, lon }) => fetchForecastImpl(lat, lon),
  fetchAirQuality: ({ lat, lon }) => fetchAirQualityImpl(lat, lon),
};
