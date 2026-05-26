// Shared shapes for the /weather hub.
//
// Two providers feed this: Open-Meteo (the default, no key required) and
// OpenWeatherMap (BYOK — user-supplied free-tier key). Both adapters
// normalise their responses to the same `WeatherData` shape so the hub
// page is provider-agnostic. Provider-specific gaps (e.g. OWM free tier
// has no UV index) are signalled via `WeatherData.meta.unsupportedFields`
// so the UI can hide affected tiles instead of rendering misleading zeros.

export type ProviderId = 'open-meteo' | 'openweathermap';

/** Fields a provider may legitimately omit. The UI hides the tile when
 *  the field appears here rather than render a zero. */
export type UnsupportedField =
  | 'uvIndex'           // OWM free has no UV
  | 'apparentTemperature'
  | 'humidityHourly'
  | 'precipitationProbability'
  | 'pressure'
  | 'cloudCover'
  | 'windGusts';

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;        // WMO code (both providers normalise to WMO)
  isDay: boolean;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  uvIndex: number;
  /** Unix ms when this snapshot was assembled locally. */
  timestamp: number;
}

export interface HourlyEntry {
  time: number;               // Unix ms
  hour: number;               // 0..23 in API local tz
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  precipitationProbability: number;
  precipitation: number;
}

export interface DailyEntry {
  date: number;               // Unix ms (local-midnight per API tz)
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  /** ISO local strings (no zone). May be empty when the provider only
   *  exposes today's sun timings. The hub only renders sunrise/sunset
   *  for daily[0] today, so empty strings on later days are fine. */
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windDirectionDominant: number;
}

export interface AirQuality {
  /** 0–100+ on the European scale used by Open-Meteo. The OWM adapter
   *  maps its 1–5 US-EPA AQI onto this 0..100 range so the meter colours
   *  and band labels stay consistent. */
  europeanAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
}

export interface WeatherDataMeta {
  provider: ProviderId;
  /** Fields the active provider doesn't supply for this request. */
  unsupportedFields?: UnsupportedField[];
  /** How many days of daily forecast were actually returned. Open-Meteo
   *  returns 7; OWM free returns 5 (the hub still labels the section
   *  "next 7 days" — we just render what we got). */
  dailyDays: number;
  /** The provider's locally-formatted "now" timestamp ISO. Used only by
   *  Open-Meteo's hourly slicing — exposed for parity. */
  apiNowIso?: string;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyEntry[];
  daily: DailyEntry[];
  airQuality: AirQuality | null;
  city: string | null;
  weekRange: { min: number; max: number };
  fetchedAt: number;
  meta: WeatherDataMeta;
}

// ── Provider interface ───────────────────────────────────────────────────

export interface ProviderRequest {
  lat: number;
  lon: number;
  language: 'ar' | 'de';
  /** API key. Required for OWM; ignored by Open-Meteo. */
  apiKey?: string;
}

export interface ProviderDescriptor {
  id: ProviderId;
  /** Display name in each app language. */
  name: { ar: string; de: string };
  /** Whether the provider needs a user-supplied API key. */
  requiresApiKey: boolean;
  /** Marketing/help URL for users to sign up for a key. */
  signupUrl?: string;
  /** Attribution URL shown at the bottom of the page. */
  attribution: { label: string; url: string };
  /** Notes shown when the user enables this provider — kept short. */
  notes?: { ar: string; de: string };
  /**
   * Fetch a fully normalised `WeatherData` for the given location.
   *
   * Implementations must:
   *   • Resolve with a complete payload (no partial returns).
   *   • Reject with a meaningful Error when the request fails. The
   *     error message is shown verbatim in the error card, so it
   *     should be brief and actionable.
   *   • Set `meta.provider` to its own id and populate
   *     `meta.unsupportedFields` honestly.
   */
  fetchWeather(req: ProviderRequest): Promise<Omit<WeatherData, 'airQuality' | 'city'>>;
  /**
   * Fetch air quality. Optional — returning null is treated as
   * "unavailable for this provider/location" and the AQ card hides.
   */
  fetchAirQuality?(req: ProviderRequest): Promise<AirQuality | null>;
}
