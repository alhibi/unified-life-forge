import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import {
  Map, X, Maximize2, Search, Sparkles, Sun, MapPin,
  Clock, Compass, Info,
} from '@/lib/icons';
import {
  getCityPrayerInfo,
  qiblaBearing,
  bearingToCompass,
  formatLocalMinutes,
  type CalculationMethodId,
  type PrayerAdjustments,
  type PrayerSlot,
  METHOD_LABELS,
  PRAYER_SLOT_ORDER,
} from '@/utils/prayerAstronomy';
import { WORLD_LAND_PATH } from './UmmahPulse.worldPath';

/**
 * Ummah Pulse — a live engraved map view of Islamic prayer across the world.
 *
 * Accuracy model (this version):
 *  - Every city carries its *official calculation method* (MWL, Umm al-Qura,
 *    Diyanet, UOIF, Karachi, ISNA, etc.) and an IANA timezone.
 *  - Prayer times are computed locally from sun position (Meeus) + the
 *    method's angle parameters, matched against the city's real local clock.
 *  - The "current slot" for a city is therefore aligned with that city's
 *    official timetable — not just a sun-altitude approximation.
 *  - The terminator/sun glyph on the map still uses solar geometry
 *    (that IS the truth underlying every method), but all city badges
 *    are driven by the actual prayer times.
 */

// ─────────────────────────────────────────────────────────────────────────────
// City registry — each carries IANA tz, official method, flag, region, Muslim pop
// ─────────────────────────────────────────────────────────────────────────────
type Region = 'arab' | 'africa' | 'asia' | 'europe' | 'americas' | 'oceania';

interface City {
  name: string;
  nameAr: string;
  country: string;
  countryAr: string;
  flag: string;
  lat: number;
  lng: number;
  tz: string;
  method: CalculationMethodId;
  region: Region;
  /** approx Muslim population (millions) in the metro / surrounding region */
  pop: number;
  /** Asr school officially followed by the country (Shafi'i = 1, Hanafi = 2). */
  asrShadow?: 1 | 2;
  /** Extra per-city minute adjustments on top of method defaults. */
  adj?: PrayerAdjustments;
}

const CITIES: City[] = [
  { name: 'Makkah',        nameAr: 'مكة المكرمة',  country: 'Saudi Arabia',  countryAr: 'السعودية',   flag: '🇸🇦', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh',       method: 'UmmAlQura', region: 'arab',     pop: 90 },
  { name: 'Madinah',       nameAr: 'المدينة',      country: 'Saudi Arabia',  countryAr: 'السعودية',   flag: '🇸🇦', lat: 24.4672, lng: 39.6142, tz: 'Asia/Riyadh',       method: 'UmmAlQura', region: 'arab',     pop: 15 },
  { name: 'Riyadh',        nameAr: 'الرياض',       country: 'Saudi Arabia',  countryAr: 'السعودية',   flag: '🇸🇦', lat: 24.7136, lng: 46.6753, tz: 'Asia/Riyadh',       method: 'UmmAlQura', region: 'arab',     pop: 60 },
  { name: 'Cairo',         nameAr: 'القاهرة',      country: 'Egypt',         countryAr: 'مصر',        flag: '🇪🇬', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo',      method: 'Egyptian',  region: 'arab',     pop: 100 },
  { name: 'Baghdad',       nameAr: 'بغداد',        country: 'Iraq',          countryAr: 'العراق',     flag: '🇮🇶', lat: 33.3152, lng: 44.3661, tz: 'Asia/Baghdad',      method: 'Karachi',   region: 'arab',     pop: 65, asrShadow: 2 },
  { name: 'Damascus',      nameAr: 'دمشق',         country: 'Syria',         countryAr: 'سوريا',      flag: '🇸🇾', lat: 33.5138, lng: 36.2765, tz: 'Asia/Damascus',     method: 'Egyptian',  region: 'arab',     pop: 30 },
  { name: 'Amman',         nameAr: 'عمّان',        country: 'Jordan',        countryAr: 'الأردن',     flag: '🇯🇴', lat: 31.9539, lng: 35.9106, tz: 'Asia/Amman',        method: 'Jordan',    region: 'arab',     pop: 25 },
  { name: 'Sanaa',         nameAr: 'صنعاء',        country: 'Yemen',         countryAr: 'اليمن',      flag: '🇾🇪', lat: 15.3694, lng: 44.1910, tz: 'Asia/Aden',         method: 'MWL',       region: 'arab',     pop: 30 },
  { name: 'Dubai',         nameAr: 'دبي',          country: 'UAE',           countryAr: 'الإمارات',   flag: '🇦🇪', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai',        method: 'Dubai',     region: 'arab',     pop: 9 },
  { name: 'Doha',          nameAr: 'الدوحة',       country: 'Qatar',         countryAr: 'قطر',        flag: '🇶🇦', lat: 25.2854, lng: 51.5310, tz: 'Asia/Qatar',        method: 'Qatar',     region: 'arab',     pop: 3 },
  { name: 'Kuwait City',   nameAr: 'الكويت',       country: 'Kuwait',        countryAr: 'الكويت',     flag: '🇰🇼', lat: 29.3759, lng: 47.9774, tz: 'Asia/Kuwait',       method: 'Kuwait',    region: 'arab',     pop: 4 },
  { name: 'Manama',        nameAr: 'المنامة',      country: 'Bahrain',       countryAr: 'البحرين',    flag: '🇧🇭', lat: 26.2285, lng: 50.5860, tz: 'Asia/Bahrain',      method: 'Kuwait',    region: 'arab',     pop: 1.4 },
  { name: 'Muscat',        nameAr: 'مسقط',         country: 'Oman',          countryAr: 'عُمان',      flag: '🇴🇲', lat: 23.5880, lng: 58.3829, tz: 'Asia/Muscat',       method: 'Kuwait',    region: 'arab',     pop: 4 },
  { name: 'Beirut',        nameAr: 'بيروت',        country: 'Lebanon',       countryAr: 'لبنان',      flag: '🇱🇧', lat: 33.8938, lng: 35.5018, tz: 'Asia/Beirut',       method: 'Egyptian',  region: 'arab',     pop: 3 },
  { name: 'Jerusalem',     nameAr: 'القدس',        country: 'Palestine',     countryAr: 'فلسطين',     flag: '🇵🇸', lat: 31.7683, lng: 35.2137, tz: 'Asia/Hebron',       method: 'Egyptian',  region: 'arab',     pop: 5 },
  { name: 'Gaza',          nameAr: 'غزة',          country: 'Palestine',     countryAr: 'فلسطين',     flag: '🇵🇸', lat: 31.5018, lng: 34.4668, tz: 'Asia/Gaza',         method: 'Egyptian',  region: 'arab',     pop: 2 },
  { name: 'Khartoum',      nameAr: 'الخرطوم',      country: 'Sudan',         countryAr: 'السودان',    flag: '🇸🇩', lat: 15.5007, lng: 32.5599, tz: 'Africa/Khartoum',   method: 'Egyptian',  region: 'africa',   pop: 45 },
  { name: 'Tripoli',       nameAr: 'طرابلس',       country: 'Libya',         countryAr: 'ليبيا',      flag: '🇱🇾', lat: 32.8872, lng: 13.1913, tz: 'Africa/Tripoli',    method: 'MWL',       region: 'africa',   pop: 6 },
  { name: 'Tunis',         nameAr: 'تونس',         country: 'Tunisia',       countryAr: 'تونس',       flag: '🇹🇳', lat: 36.8065, lng: 10.1815, tz: 'Africa/Tunis',      method: 'Tunisia',   region: 'africa',   pop: 11 },
  { name: 'Algiers',       nameAr: 'الجزائر',      country: 'Algeria',       countryAr: 'الجزائر',    flag: '🇩🇿', lat: 36.7538, lng: 3.0588,  tz: 'Africa/Algiers',    method: 'Algerian',  region: 'africa',   pop: 42 },
  { name: 'Casablanca',    nameAr: 'الدار البيضاء',country: 'Morocco',       countryAr: 'المغرب',     flag: '🇲🇦', lat: 33.5731, lng: -7.5898, tz: 'Africa/Casablanca', method: 'Morocco',   region: 'africa',   pop: 34 },
  { name: 'Nouakchott',    nameAr: 'نواكشوط',      country: 'Mauritania',    countryAr: 'موريتانيا',  flag: '🇲🇷', lat: 18.0735, lng: -15.9582,tz: 'Africa/Nouakchott', method: 'MWL',       region: 'africa',   pop: 4 },
  { name: 'Dakar',         nameAr: 'داكار',        country: 'Senegal',       countryAr: 'السنغال',    flag: '🇸🇳', lat: 14.7167, lng: -17.4677,tz: 'Africa/Dakar',      method: 'MWL',       region: 'africa',   pop: 14 },
  { name: 'Lagos',         nameAr: 'لاغوس',        country: 'Nigeria',       countryAr: 'نيجيريا',    flag: '🇳🇬', lat: 6.5244,  lng: 3.3792,  tz: 'Africa/Lagos',      method: 'MWL',       region: 'africa',   pop: 55 },
  { name: 'Mogadishu',     nameAr: 'مقديشو',       country: 'Somalia',       countryAr: 'الصومال',    flag: '🇸🇴', lat: 2.0469,  lng: 45.3182, tz: 'Africa/Mogadishu',  method: 'MWL',       region: 'africa',   pop: 15 },
  { name: 'Istanbul',      nameAr: 'إسطنبول',      country: 'Türkiye',       countryAr: 'تركيا',      flag: '🇹🇷', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul',   method: 'Turkey',    region: 'europe',   pop: 85, asrShadow: 2 },
  { name: 'Ankara',        nameAr: 'أنقرة',        country: 'Türkiye',       countryAr: 'تركيا',      flag: '🇹🇷', lat: 39.9334, lng: 32.8597, tz: 'Europe/Istanbul',   method: 'Turkey',    region: 'europe',   pop: 6,  asrShadow: 2 },
  { name: 'Tehran',        nameAr: 'طهران',        country: 'Iran',          countryAr: 'إيران',      flag: '🇮🇷', lat: 35.6892, lng: 51.3890, tz: 'Asia/Tehran',       method: 'Tehran',    region: 'asia',     pop: 70 },
  { name: 'Kabul',         nameAr: 'كابول',        country: 'Afghanistan',   countryAr: 'أفغانستان',  flag: '🇦🇫', lat: 34.5553, lng: 69.2075, tz: 'Asia/Kabul',        method: 'Karachi',   region: 'asia',     pop: 45, asrShadow: 2 },
  { name: 'Tashkent',      nameAr: 'طشقند',        country: 'Uzbekistan',    countryAr: 'أوزبكستان',  flag: '🇺🇿', lat: 41.2995, lng: 69.2401, tz: 'Asia/Tashkent',     method: 'Karachi',   region: 'asia',     pop: 35, asrShadow: 2 },
  { name: 'Baku',          nameAr: 'باكو',         country: 'Azerbaijan',    countryAr: 'أذربيجان',   flag: '🇦🇿', lat: 40.4093, lng: 49.8671, tz: 'Asia/Baku',         method: 'Tehran',    region: 'asia',     pop: 10 },
  { name: 'Karachi',       nameAr: 'كراتشي',       country: 'Pakistan',      countryAr: 'باكستان',    flag: '🇵🇰', lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi',      method: 'Karachi',   region: 'asia',     pop: 200, asrShadow: 2 },
  { name: 'Lahore',        nameAr: 'لاهور',        country: 'Pakistan',      countryAr: 'باكستان',    flag: '🇵🇰', lat: 31.5497, lng: 74.3436, tz: 'Asia/Karachi',      method: 'Karachi',   region: 'asia',     pop: 130, asrShadow: 2 },
  { name: 'Islamabad',     nameAr: 'إسلام آباد',   country: 'Pakistan',      countryAr: 'باكستان',    flag: '🇵🇰', lat: 33.6844, lng: 73.0479, tz: 'Asia/Karachi',      method: 'Karachi',   region: 'asia',     pop: 12, asrShadow: 2 },
  { name: 'Dhaka',         nameAr: 'دكا',          country: 'Bangladesh',    countryAr: 'بنغلاديش',   flag: '🇧🇩', lat: 23.8103, lng: 90.4125, tz: 'Asia/Dhaka',        method: 'Karachi',   region: 'asia',     pop: 165, asrShadow: 2 },
  { name: 'Delhi',         nameAr: 'دلهي',         country: 'India',         countryAr: 'الهند',      flag: '🇮🇳', lat: 28.6139, lng: 77.2090, tz: 'Asia/Kolkata',      method: 'Karachi',   region: 'asia',     pop: 45, asrShadow: 2 },
  { name: 'Mumbai',        nameAr: 'مومباي',       country: 'India',         countryAr: 'الهند',      flag: '🇮🇳', lat: 19.0760, lng: 72.8777, tz: 'Asia/Kolkata',      method: 'Karachi',   region: 'asia',     pop: 70, asrShadow: 2 },
  { name: 'Hyderabad',     nameAr: 'حيدر آباد',    country: 'India',         countryAr: 'الهند',      flag: '🇮🇳', lat: 17.3850, lng: 78.4867, tz: 'Asia/Kolkata',      method: 'Karachi',   region: 'asia',     pop: 30, asrShadow: 2 },
  { name: 'Jakarta',       nameAr: 'جاكرتا',       country: 'Indonesia',     countryAr: 'إندونيسيا',  flag: '🇮🇩', lat: -6.2088, lng: 106.8456,tz: 'Asia/Jakarta',      method: 'Kemenag',   region: 'asia',     pop: 230 },
  { name: 'Surabaya',      nameAr: 'سورابايا',     country: 'Indonesia',     countryAr: 'إندونيسيا',  flag: '🇮🇩', lat: -7.2575, lng: 112.7521,tz: 'Asia/Jakarta',      method: 'Kemenag',   region: 'asia',     pop: 40 },
  { name: 'Kuala Lumpur',  nameAr: 'كوالالمبور',   country: 'Malaysia',      countryAr: 'ماليزيا',    flag: '🇲🇾', lat: 3.1390,  lng: 101.6869,tz: 'Asia/Kuala_Lumpur', method: 'JAKIM',     region: 'asia',     pop: 60 },
  { name: 'Singapore',     nameAr: 'سنغافورة',     country: 'Singapore',     countryAr: 'سنغافورة',   flag: '🇸🇬', lat: 1.3521,  lng: 103.8198,tz: 'Asia/Singapore',    method: 'Singapore', region: 'asia',     pop: 0.9 },
  { name: 'Brunei',        nameAr: 'بروناي',       country: 'Brunei',        countryAr: 'بروناي',     flag: '🇧🇳', lat: 4.9031,  lng: 114.9398,tz: 'Asia/Brunei',       method: 'JAKIM',     region: 'asia',     pop: 0.4 },
  { name: 'Moscow',        nameAr: 'موسكو',        country: 'Russia',        countryAr: 'روسيا',      flag: '🇷🇺', lat: 55.7558, lng: 37.6173, tz: 'Europe/Moscow',     method: 'Russia',    region: 'europe',   pop: 20, asrShadow: 2 },
  { name: 'Sarajevo',      nameAr: 'سراييفو',      country: 'Bosnia',        countryAr: 'البوسنة',    flag: '🇧🇦', lat: 43.8563, lng: 18.4131, tz: 'Europe/Sarajevo',   method: 'MWL',       region: 'europe',   pop: 2,  asrShadow: 2 },
  { name: 'Tirana',        nameAr: 'تيرانا',       country: 'Albania',       countryAr: 'ألبانيا',    flag: '🇦🇱', lat: 41.3275, lng: 19.8187, tz: 'Europe/Tirane',     method: 'MWL',       region: 'europe',   pop: 2 },
  { name: 'London',        nameAr: 'لندن',         country: 'United Kingdom',countryAr: 'بريطانيا',   flag: '🇬🇧', lat: 51.5074, lng: -0.1278, tz: 'Europe/London',     method: 'MWL',       region: 'europe',   pop: 12 },
  { name: 'Paris',         nameAr: 'باريس',        country: 'France',        countryAr: 'فرنسا',      flag: '🇫🇷', lat: 48.8566, lng: 2.3522,  tz: 'Europe/Paris',      method: 'UOIF',      region: 'europe',   pop: 10 },
  { name: 'Berlin',        nameAr: 'برلين',        country: 'Germany',       countryAr: 'ألمانيا',    flag: '🇩🇪', lat: 52.5200, lng: 13.4050, tz: 'Europe/Berlin',     method: 'MWL',       region: 'europe',   pop: 8 },
  { name: 'Rome',          nameAr: 'روما',         country: 'Italy',         countryAr: 'إيطاليا',    flag: '🇮🇹', lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome',       method: 'MWL',       region: 'europe',   pop: 3 },
  { name: 'Madrid',        nameAr: 'مدريد',        country: 'Spain',         countryAr: 'إسبانيا',    flag: '🇪🇸', lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid',     method: 'MWL',       region: 'europe',   pop: 2 },
  { name: 'New York',      nameAr: 'نيويورك',      country: 'United States', countryAr: 'أمريكا',     flag: '🇺🇸', lat: 40.7128, lng: -74.0060,tz: 'America/New_York',  method: 'ISNA',      region: 'americas', pop: 12 },
  { name: 'Chicago',       nameAr: 'شيكاغو',       country: 'United States', countryAr: 'أمريكا',     flag: '🇺🇸', lat: 41.8781, lng: -87.6298,tz: 'America/Chicago',   method: 'ISNA',      region: 'americas', pop: 4 },
  { name: 'Los Angeles',   nameAr: 'لوس أنجلوس',   country: 'United States', countryAr: 'أمريكا',     flag: '🇺🇸', lat: 34.0522, lng: -118.2437,tz:'America/Los_Angeles',method: 'ISNA',      region: 'americas', pop: 3 },
  { name: 'Toronto',       nameAr: 'تورنتو',       country: 'Canada',        countryAr: 'كندا',       flag: '🇨🇦', lat: 43.6532, lng: -79.3832,tz: 'America/Toronto',   method: 'ISNA',      region: 'americas', pop: 5 },
  { name: 'Sydney',        nameAr: 'سيدني',        country: 'Australia',     countryAr: 'أستراليا',   flag: '🇦🇺', lat: -33.8688,lng: 151.2093,tz: 'Australia/Sydney',  method: 'MWL',       region: 'oceania',  pop: 3 },
];

const REGION_LABELS: Record<Region, { ar: string; de: string }> = {
  arab:     { ar: 'العالم العربي',   de: 'Arab. Welt' },
  africa:   { ar: 'أفريقيا',          de: 'Afrika' },
  asia:     { ar: 'آسيا',             de: 'Asien' },
  europe:   { ar: 'أوروبا',           de: 'Europa' },
  americas: { ar: 'الأمريكتان',       de: 'Amerika' },
  oceania:  { ar: 'أوقيانوسيا',       de: 'Ozeanien' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Map projection
// ─────────────────────────────────────────────────────────────────────────────
const W = 360;
const H = 180;
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * W,
  y: ((90 - lat) / 180) * H,
});

// ─────────────────────────────────────────────────────────────────────────────
// Terminator (night shading) — solar geometry
// ─────────────────────────────────────────────────────────────────────────────
const RAD = Math.PI / 180;

function getSubsolar(date: Date): { lng: number; decl: number } {
  const D = date.getTime() / 86400000 - 10957.5; // days from J2000
  const g = ((357.529 + 0.98560028 * D) % 360 + 360) % 360;
  const q = ((280.459 + 0.98564736 * D) % 360 + 360) % 360;
  const L = (q + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const decl = Math.asin(Math.sin(e * RAD) * Math.sin(L * RAD)) / RAD;
  const RAh = Math.atan2(Math.cos(e * RAD) * Math.sin(L * RAD), Math.cos(L * RAD)) / RAD / 15;
  let eot = q / 15 - ((RAh + 24) % 24);
  if (eot > 12)  eot -= 24;
  if (eot < -12) eot += 24;
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const subLng = -((utcMin + eot * 60 - 720) / 4);
  return { lng: ((subLng + 540) % 360) - 180, decl };
}

function buildNightPaths(date: Date): string[] {
  const { lng: subLng, decl } = getSubsolar(date);
  const declRad = decl * RAD;
  const pts: { lng: number; lat: number }[] = [];

  for (let lat = -90; lat <= 90; lat += 2) {
    const latR = lat * RAD;
    const cosH = -Math.tan(latR) * Math.tan(declRad);
    if (cosH >= 1)  { pts.push({ lng: subLng + 180, lat }); continue; }
    if (cosH <= -1) continue;
    const H_ang = Math.acos(cosH) / RAD;
    pts.push({ lng: subLng + H_ang, lat });
  }
  for (let lat = 90; lat >= -90; lat -= 2) {
    const latR = lat * RAD;
    const cosH = -Math.tan(latR) * Math.tan(declRad);
    if (cosH >= 1)  { pts.push({ lng: subLng - 180, lat }); continue; }
    if (cosH <= -1) continue;
    const H_ang = Math.acos(cosH) / RAD;
    pts.push({ lng: subLng + 360 - H_ang, lat });
  }

  const shift = (dx: number) =>
    pts.map((p, i) => {
      const x = ((p.lng + 180) / 360) * W + dx;
      const y = ((90 - p.lat) / 180) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ') + ' Z';

  return [shift(-W), shift(0), shift(W)];
}

// ─────────────────────────────────────────────────────────────────────────────
// UI meta
// ─────────────────────────────────────────────────────────────────────────────
const SLOT_META: Record<PrayerSlot, { ar: string; de: string; color: string }> = {
  fajr:    { ar: 'الفجر',   de: 'Fadschr',     color: 'hsl(43, 96%, 66%)'  },
  shuruq:  { ar: 'الشروق',  de: 'Sonnenaufg.', color: 'hsl(32, 95%, 64%)'  },
  duha:    { ar: 'الضحى',   de: 'Duha',        color: 'hsl(48, 92%, 60%)'  },
  dhuhr:   { ar: 'الظهر',   de: 'Dhuhr',       color: 'hsl(196, 78%, 62%)' },
  asr:     { ar: 'العصر',   de: 'Asr',         color: 'hsl(18, 78%, 60%)'  },
  maghrib: { ar: 'المغرب',  de: 'Maghrib',     color: 'hsl(348, 76%, 62%)' },
  isha:    { ar: 'العشاء',  de: 'Ischa',       color: 'hsl(252, 62%, 66%)' },
  night:   { ar: 'الليل',   de: 'Nacht',       color: 'hsl(220, 25%, 55%)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Detailed world land path (equirectangular, W=360, H=180) — see worldPath.ts
// Deterministic background "stars" so they don't jitter on every render.
// ─────────────────────────────────────────────────────────────────────────────
const CONTINENTS = WORLD_LAND_PATH;

function makeStars(seed: number, count: number): { x: number; y: number; r: number; o: number }[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const stars: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * W,
      y: rand() * H,
      r: 0.18 + rand() * 0.55,
      o: 0.4 + rand() * 0.55,
    });
  }
  return stars;
}
const STARS = makeStars(0xa5b8c7, 260);

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
function UmmahPulse() {
  const { language, prayerMadhab } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [filter, setFilter] = useState<PrayerSlot | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [search, setSearch] = useState('');
  const userShadowFactor: 1 | 2 = prayerMadhab === 'hanafi' ? 2 : 1;

  // Clock tick — every 15s in expanded view, every 60s compact
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), expanded ? 15_000 : 60_000);
    return () => clearInterval(id);
  }, [expanded]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [expanded]);

  // Esc closes (selection first, then modal)
  useEffect(() => {
    if (!expanded && !selectedCity) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedCity) setSelectedCity(null);
      else if (expanded) setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, selectedCity]);

  const { lng: subLng, decl: subLat } = useMemo(() => getSubsolar(now), [now]);
  const nightPaths = useMemo(() => buildNightPaths(now), [now]);
  const sunPoint = project(subLat, subLng);

  // Compute per-city prayer info (recomputed every tick).
  //  - Each city uses its country's *official* Asr school (Hanafi vs majority)
  //    so the world view reflects each country's real published timetable.
  //  - Per-city minute adjustments (`adj`) stack on top of method defaults.
  const cityDetails = useMemo(
    () =>
      CITIES.map((c) => {
        const cityShadow: 1 | 2 = c.asrShadow ?? userShadowFactor;
        const info = getCityPrayerInfo(c.lat, c.lng, c.tz, c.method, now, cityShadow, c.adj);
        return { ...c, info, shadowUsed: cityShadow };
      }),
    [now, userShadowFactor]
  );

  const fajrCities = useMemo(
    () => cityDetails.filter((c) => c.info.slot === 'fajr'),
    [cityDetails]
  );
  const maghribCities = useMemo(
    () => cityDetails.filter((c) => c.info.slot === 'maghrib'),
    [cityDetails]
  );

  // Aggregate Muslim pop per slot
  const slotPop = useMemo(() => {
    const agg: Record<PrayerSlot, number> = {
      fajr: 0, shuruq: 0, duha: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, night: 0,
    };
    cityDetails.forEach((c) => { agg[c.info.slot] += c.pop; });
    return agg;
  }, [cityDetails]);

  const fajrPop = slotPop.fajr;

  // Fajr band center (~15° east of terminator, sunrise side)
  const fajrCenterLng = ((subLng + 105 + 540) % 360) - 180;
  const fajrCenter = project(0, fajrCenterLng);

  // Sorted + filtered list for modal
  const sortedCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cityDetails
      .filter((c) => filter === 'all' || c.info.slot === filter)
      .filter((c) => regionFilter === 'all' || c.region === regionFilter)
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.nameAr.includes(search) ||
          c.country.toLowerCase().includes(q) ||
          c.countryAr.includes(search)
        );
      })
      .sort((a, b) => {
        const oi = PRAYER_SLOT_ORDER.indexOf(a.info.slot) - PRAYER_SLOT_ORDER.indexOf(b.info.slot);
        return oi !== 0 ? oi : b.pop - a.pop;
      });
  }, [cityDetails, filter, regionFilter, search]);

  const selectedCityDetails = selectedCity
    ? cityDetails.find((c) => c.name === selectedCity) ?? null
    : null;

  const t = (ar: string, de: string) => (language === 'ar' ? ar : de);

  // __EDITORIAL_INSERT_HERE__


  // ── Detail panel (expanded-modal) ─────────────────────────────────────────
  const renderCityDetailPanel = (c: NonNullable<typeof selectedCityDetails>) => {
    const meta = SLOT_META[c.info.slot];
    const qibla = qiblaBearing(c.lat, c.lng);
    const prayerRows: Array<{ key: PrayerSlot; min: number }> = [
      { key: 'fajr',    min: c.info.fajr    },
      { key: 'shuruq',  min: c.info.sunrise },
      { key: 'dhuhr',   min: c.info.dhuhr   },
      { key: 'asr',     min: c.info.asr     },
      { key: 'maghrib', min: c.info.maghrib },
      { key: 'isha',    min: c.info.isha    },
    ];
    const rem = c.info.next.minutesUntil;
    const hh = Math.floor(rem / 60);
    const mm = rem % 60;
    return (
      <motion.div
        key={c.name}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="rounded-2xl bg-card border border-border/40 overflow-hidden"
      >
        <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-border/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-3xl leading-none shrink-0">{c.flag}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-[15px] font-bold text-foreground truncate leading-tight">
                  {language === 'ar' ? c.nameAr : c.name}
                </h3>
                {c.name === 'Makkah' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] font-bold">
                    ★ {t('قبلة', 'Qibla')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                {language === 'ar' ? c.countryAr : c.country}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[18px] font-bold tabular-nums text-foreground leading-none">
              {c.info.localClock}
            </div>
            <div
              className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full inline-block"
              style={{
                background: meta.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)'),
                color: meta.color,
              }}
            >
              {language === 'ar' ? meta.ar : meta.de}
            </div>
          </div>
        </div>

        {/* Next prayer countdown */}
        <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-between gap-2 border-b border-border/30">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {t('القادمة', 'Nächstes')}:
              <span className="font-semibold text-foreground ml-1">
                {language === 'ar' ? SLOT_META[c.info.next.name].ar : SLOT_META[c.info.next.name].de}
              </span>
            </span>
          </div>
          <div className="text-[12px] font-bold tabular-nums text-primary">
            {hh > 0 && `${hh}${t('س', 'h')} `}{mm}{t('د', 'm')}
          </div>
        </div>

        {/* Prayer times grid */}
        <div className="grid grid-cols-6 gap-1 p-2">
          {prayerRows.map(({ key, min }) => {
            const isCurrent = c.info.slot === key;
            const m = SLOT_META[key];
            return (
              <div
                key={key}
                className={`rounded-lg px-1.5 py-2 text-center transition-all ${
                  isCurrent
                    ? ''
                    : 'bg-muted/30'
                }`}
                style={isCurrent ? {
                  background: m.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)'),
                  
                } : undefined}
              >
                <p className="text-[9px] font-semibold leading-tight"
                   style={{ color: isCurrent ? m.color : 'hsl(var(--muted-foreground))' }}>
                  {language === 'ar' ? m.ar : m.de}
                </p>
                <p className="text-[10.5px] font-bold tabular-nums text-foreground mt-0.5" dir="ltr">
                  {formatLocalMinutes(min)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Meta row: method + madhhab + qibla */}
        <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between gap-3 text-[10.5px]">
          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
            <Info className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {language === 'ar' ? METHOD_LABELS[c.method].ar : METHOD_LABELS[c.method].de}
            </span>
            <span
              className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
              title={t('مذهب العصر الرسمي للبلد', 'Offizielles Asr-Madhab des Landes')}
            >
              {c.shadowUsed === 2 ? t('عصر حنفي', 'Asr Hanafi') : t('عصر جمهور', 'Asr Mehrheit')}
 </span>
 </div>
 <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
 <Compass className="w-3 h-3" />
 <span className="tabular-nums">
 {qibla.toFixed(0)}° · {bearingToCompass(qibla)}
 </span>
 </div>
 </div>
 </motion.div>
 );
 };

 // ── Main render ───────────────────────────────────────────────────────────
 return (
 <div
 dir="ltr"
 className="relative rounded-3xl overflow-hidden border border-border/40"
 >
 {/* Header */}
 <div
 className="flex items-center justify-between px-4 pt-4 pb-2"
 dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
          <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-[hsl(var(--live))]/10 border border-[hsl(var(--live))]/25 flex items-center justify-center shadow-[inset_0_0_0_1px_hsl(var(--live)/0.08)] overflow-hidden">
            <span className="absolute inset-x-1 top-1 border-t border-[hsl(var(--live))]/35" />
            <span className="absolute inset-y-1 right-1 border-r border-[hsl(var(--live))]/25" />
            <Map className="w-4.5 h-4.5 text-[hsl(var(--live))]" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-foreground leading-tight">
              {t('نبض الأمة', 'Puls der Ummah')}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {t('أين يُصلَّى الفجر الآن', 'Wo Fadschr jetzt gebetet wird')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-bold text-primary tabular-nums leading-tight flex items-center gap-1 justify-end">
            <Sparkles className="w-3 h-3" />
            ~{fajrPop}M
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight">
            {t('مسلم في الفجر', 'in Fadschr')}
          </div>
        </div>
      </div>

      {/* Map (click to expand) */}
      <div className="relative px-3 pb-3">
        <button
          onClick={() => setExpanded(true)}
          className="block w-full text-left active:scale-[0.985] transition-transform focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-2xl"
          aria-label={t('فتح الخريطة بحجم كامل', 'Karte im Vollbild öffnen')}
        >
          <div className="relative rounded-2xl overflow-hidden bg-[hsl(var(--muted))]/30 group">
            <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-background/75 backdrop-blur-md border border-border/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5 text-foreground" />
            </div>

            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/75 backdrop-blur-md border border-border/40">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-[hsl(var(--live))] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-[hsl(var(--live))]" />
              </span>
              <span className="text-[9px] font-bold tracking-wide text-foreground">LIVE</span>
            </div>

            {renderAstrolabe()}

            {fajrCities.length > 0 && (
              <div
                className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 justify-center"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                {fajrCities.slice(0, 6).map((c) => (
                  <motion.span
                    key={c.name}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary backdrop-blur-sm border border-primary/30 inline-flex items-center gap-1"
                  >
                    <span>{c.flag}</span>
                    {language === 'ar' ? c.nameAr : c.name}
                  </motion.span>
                ))}
                {fajrCities.length > 6 && (
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 backdrop-blur-sm border border-primary/20">
                    +{fajrCities.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>

        {/* Quick stats row — 5 prayer summaries */}
        <div
          className="grid grid-cols-5 gap-1.5 mt-2.5"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {([
            ['fajr',    fajrCities.length],
            ['dhuhr',   cityDetails.filter(c => c.info.slot === 'dhuhr').length],
            ['asr',     cityDetails.filter(c => c.info.slot === 'asr').length],
            ['maghrib', maghribCities.length],
            ['isha',    cityDetails.filter(c => c.info.slot === 'isha').length],
          ] as [PrayerSlot, number][]).map(([slot, count]) => (
            <button
              key={slot}
              onClick={() => { setFilter(slot); setExpanded(true); }}
              className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-card border border-border/30 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLOT_META[slot].color }} />
                <span className="text-[10px] font-semibold text-foreground">
                  {language === 'ar' ? SLOT_META[slot].ar : SLOT_META[slot].de}
                </span>
              </div>
              <span className="text-[11px] font-bold tabular-nums text-foreground mt-0.5">
                {count}
              </span>
            </button>
          ))}
        </div>

        <p
          className="text-[10.5px] text-muted-foreground text-center mt-2.5 leading-relaxed px-2"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {t(
            'اضغط على الخريطة لعرض كل المدن ومواقيتها الرسمية',
            'Tippe die Karte für offizielle Gebetszeiten aller Städte'
          )}
        </p>
      </div>

      {/* Fullscreen modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 border-b border-border/30">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-9 h-9 rounded-xl bg-[hsl(var(--live))]/10 border border-[hsl(var(--live))]/25 flex items-center justify-center shadow-[inset_0_0_0_1px_hsl(var(--live)/0.08)] overflow-hidden">
                    <span className="absolute inset-x-1 top-1 border-t border-[hsl(var(--live))]/35" />
                    <span className="absolute inset-y-1 right-1 border-r border-[hsl(var(--live))]/25" />
                    <Map className="w-5 h-5 text-[hsl(var(--live))]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-foreground leading-tight">
                      {t('نبض الأمة', 'Puls der Ummah')}
                    </h2>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {t(
                        `~${fajrPop} مليون مسلم في الفجر الآن`,
                        `~${fajrPop} Mio. Muslime beten jetzt Fadschr`
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setExpanded(false); setSelectedCity(null); }}
                  className="w-10 h-10 rounded-2xl bg-card border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label={t('إغلاق', 'Schließen')}
                >
                  <X className="w-4.5 h-4.5 text-foreground" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.5rem)]">
                {/* Engraved heritage world map */}
                <div className="px-4 pt-4">
                  <div
                    className="relative rounded-2xl overflow-hidden border border-[hsl(var(--live))]/25 shadow-[inset_0_0_0_1px_hsl(var(--live)/0.08),0_8px_24px_-12px_hsl(0_0%_0%/0.5)]"
                    onClick={() => setSelectedCity(null)}
                  >
                    {renderAstrolabe({ large: true })}

                    {/* Sub-solar coordinates badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-md border border-border/40 pointer-events-none">
                      <Sun className="w-3 h-3 text-[hsl(var(--live))]" />
                      <span className="text-[10px] font-semibold text-foreground tabular-nums">
                        {subLat.toFixed(1)}°, {((subLng + 540) % 360 - 180).toFixed(1)}°
                      </span>
                    </div>

                    {/* Heritage corner ornaments — copper hairlines */}
                    <span className="pointer-events-none absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-[hsl(var(--live))]/55" />
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-[hsl(var(--live))]/55" />
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-[hsl(var(--live))]/55" />
                    <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-[hsl(var(--live))]/55" />

                    {/* Hint badge */}
                    <div
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-background/70 backdrop-blur-md border border-border/40 pointer-events-none"
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {t(
                          'انقر على مدينة لعرض تفاصيلها',
                          'Stadt antippen für Details'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selected city detail */}
                <AnimatePresence mode="wait">
                  {selectedCityDetails && (
                    <div className="px-4 pt-3">
                      {renderCityDetailPanel(selectedCityDetails)}
                    </div>
                  )}
                </AnimatePresence>

                {/* Slot filter */}
                <div className="px-4 pt-3">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {(['all', ...PRAYER_SLOT_ORDER] as const).map((s) => {
                      const active = filter === s;
                      const label = s === 'all'
                        ? t('الكل', 'Alle')
                        : language === 'ar' ? SLOT_META[s].ar : SLOT_META[s].de;
                      const count = s === 'all' ? CITIES.length : cityDetails.filter(c => c.info.slot === s).length;
                      return (
                        <button
                          key={s}
                          onClick={() => setFilter(s)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary '
                              : 'bg-card border-border/40 text-foreground hover:bg-muted/40'
                          }`}
                        >
                          {s !== 'all' && (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLOT_META[s].color }} />
                          )}
                          <span>{label}</span>
                          <span className={`tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Region filter */}
                <div className="px-4 pt-2">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {(['all', 'arab', 'africa', 'asia', 'europe', 'americas', 'oceania'] as const).map((r) => {
                      const active = regionFilter === r;
                      const label = r === 'all'
                        ? t('كل المناطق', 'Alle Regionen')
                        : language === 'ar' ? REGION_LABELS[r].ar : REGION_LABELS[r].de;
                      return (
                        <button
                          key={r}
                          onClick={() => setRegionFilter(r)}
                          className={`shrink-0 px-2.5 py-1 rounded-full border text-[10.5px] font-medium transition-all ${
                            active
                              ? 'bg-foreground/90 text-background border-foreground'
                              : 'bg-card border-border/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search */}
                <div className="px-4 pt-3">
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 ${language === 'ar' ? 'right-3' : 'left-3'} text-muted-foreground pointer-events-none`} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('ابحث عن مدينة أو دولة…', 'Stadt oder Land suchen…')}
                      className={`w-full py-2 text-[12px] rounded-xl bg-card border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>

                {/* City list */}
                <div className="px-4 pt-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {t('المدن', 'Städte')}
                    </span>
                    <span className="normal-case tracking-normal">
                      {sortedCities.length} {t('نتيجة', 'Treffer')}
                    </span>
                  </p>

                  {sortedCities.length === 0 ? (
                    <div className="text-center text-[12px] text-muted-foreground py-6">
                      {t('لا توجد نتائج', 'Keine Treffer')}
                    </div>
                  ) : (
                    sortedCities.map((c) => {
                      const meta = SLOT_META[c.info.slot];
                      const isSelected = c.name === selectedCity;
                      const rem = c.info.next.minutesUntil;
                      const hh = Math.floor(rem / 60);
                      const mm = rem % 60;
                      return (
                        <motion.button
                          key={c.name}
                          layout
                          onClick={() => setSelectedCity(isSelected ? null : c.name)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all text-start ${
                            isSelected
                              ? 'bg-primary/5 border-primary/40 '
                              : 'bg-card border-border/30 active:scale-[0.99]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-xl leading-none shrink-0">{c.flag}</span>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                background: meta.color,
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                                {language === 'ar' ? c.nameAr : c.name}
                                {c.name === 'Makkah' && (
                                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] font-bold align-middle">
                                    ★
                                  </span>
                                )}
                              </p>
                              <p className="text-[10.5px] text-muted-foreground tabular-nums leading-tight mt-0.5 flex items-center gap-1.5" dir="ltr">
                                <span>{c.info.localClock}</span>
                                <span className="opacity-60">·</span>
                                <span className="opacity-80">
                                  → {hh > 0 ? `${hh}h ` : ''}{mm}m
                                </span>
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                            style={{
                              background: meta.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)'),
                              color: meta.color,
                            }}
                          >
                            {language === 'ar' ? meta.ar : meta.de}
                          </span>
                        </motion.button>
                      );
                    })
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground text-center mt-5 px-6 leading-relaxed">
                  {t(
                    'حسابات فلكية بدقّة الدقيقة (Meeus) مع الطرق الرسمية لكل بلد (أم القرى، ديانت، الأوقاف، كراتشي، كيمنترج، جاكيم، …) • مذهب العصر يتبع كل دولة رسميًا • يُحدَّث كل 15 ثانية',
                    'Minutengenaue Astronomie (Meeus) mit den offiziellen Methoden jedes Landes (Umm al-Qura, Diyanet, Habous, Karatschi, Kemenag, JAKIM, …) · Asr-Madhab folgt offizieller Praxis jedes Landes · Aktualisierung alle 15 s'
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default UmmahPulse;
