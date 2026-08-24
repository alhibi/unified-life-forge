/**
 * Weather utility functions — shared helpers for formatting and display
 */

/**
 * Formats a timestamp for time display in the specified locale
 * @param value - ISO string, unix timestamp, or Date
 * @param locale - BCP 47 locale string (e.g., 'ar', 'en')
 * @returns Formatted time string (HH:mm) or '—' if invalid
 */
export function timeLabel(
  value: string | number | undefined,
  locale: string = 'ar'
): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formats a timestamp for date display in the specified locale
 * @param value - ISO string, unix timestamp, or Date
 * @param locale - BCP 47 locale string (e.g., 'ar', 'en')
 * @returns Formatted date string or '—' if invalid
 */
export function dateLabel(
  value: string | number | undefined,
  locale: string = 'ar',
  options: Intl.DateTimeFormatOptions = { weekday: 'short' }
): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, options);
}

/**
 * Formats a temperature value with degree symbol
 * @param value - Temperature in Celsius
 * @returns Formatted string with ° symbol
 */
export function tempLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}°`;
}

/**
 * Formats a percentage value
 * @param value - Percentage (0-100)
 * @returns Formatted string with % symbol
 */
export function pctLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

/**
 * Formats a pressure value with hPa unit
 * @param value - Pressure in hPa
 * @returns Formatted string with hPa unit
 */
export function pressureLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)} hPa`;
}

/**
 * Formats a wind speed value with km/h unit
 * @param value - Wind speed in km/h
 * @returns Formatted string with km/h unit
 */
export function windLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)} كم/س`;
}

/**
 * Formats a distance value with km unit
 * @param value - Distance in km
 * @returns Formatted string with km unit
 */
export function distanceLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)} كم`;
}

/**
 * Formats a precipitation value with mm unit
 * @param value - Precipitation in mm
 * @returns Formatted string with mm unit
 */
export function precipLabel(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(decimals)} mm`;
}

/**
 * Formats an air quality index value
 * @param value - AQI value
 * @returns Formatted string
 */
export function aqiLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}`;
}

/**
 * Formats a UV index value
 * @param value - UV index
 * @returns Formatted string
 */
export function uvLabel(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(decimals);
}

/**
 * Formats a coordinate pair for display
 * @param lat - Latitude
 * @param lng - Longitude
 * @param precision - Decimal places (default 2)
 * @returns Formatted coordinate string
 */
export function coordLabel(lat: number, lng: number, precision = 2): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Formats an elevation value with m unit
 * @param value - Elevation in meters
 * @returns Formatted string with m unit
 */
export function elevationLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)} m`;
}

/**
 * Rounds a number to specified decimal places
 * @param value - Number to round
 * @param decimals - Decimal places (default 0)
 * @returns Rounded number
 */
export function round(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamps a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Maps a value from one range to another
 * @param value - Input value
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((clamp(value, inMin, inMax) - inMin) / (inMax - inMin)) * (outMax - outMin);
}