import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import {
  Globe2, X, Maximize2, Search, Sparkles, Sun, MapPin,
  Clock, Compass, Info,
} from 'lucide-react';
import {
  getCityPrayerInfo,
  qiblaBearing,
  bearingToCompass,
  formatLocalMinutes,
  type CalculationMethodId,
  type PrayerSlot,
  METHOD_LABELS,
  PRAYER_SLOT_ORDER,
} from '@/utils/prayerAstronomy';

/**
 * Ummah Pulse — a live planetary view of Islamic prayer across the world.
 *
 * Accuracy model (this version):
 *  - Every city carries its *official calculation method* (MWL, Umm al-Qura,
 *    Diyanet, UOIF, Karachi, ISNA, etc.) and an IANA timezone.
 *  - Prayer times are computed locally from sun position (Meeus) + the
 *    method's angle parameters, matched against the city's real local clock.
 *  - The "current slot" for a city is therefore aligned with that city's
 *    official timetable — not just a sun-altitude approximation.
 *  - The terminator/sun glyph on the globe still uses solar geometry
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
}

const CITIES: City[] = [
  { name: 'Makkah',        nameAr: 'مكة المكرمة',  country: 'Saudi Arabia',  countryAr: 'السعودية',   flag: '🇸🇦', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh',       method: 'UmmAlQura', region: 'arab',     pop: 90 },
  { name: 'Madinah',       nameAr: 'المدينة',      country: 'Saudi Arabia',  countryAr: 'السعودية',   flag: '🇸🇦', lat: 24.4672, lng: 39.6142, tz: 'Asia/Riyadh',       method: 'UmmAlQura', region: 'arab',     pop: 15 },
  { name: 'Riyadh',        nameAr: 'الرياض',       country: 'Saudi Arabia',  countryAr: 'السعودية',   flag: '🇸🇦', lat: 24.7136, lng: 46.6753, tz: 'Asia/Riyadh',       method: 'UmmAlQura', region: 'arab',     pop: 60 },
  { name: 'Cairo',         nameAr: 'القاهرة',      country: 'Egypt',         countryAr: 'مصر',        flag: '🇪🇬', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo',      method: 'Egyptian',  region: 'arab',     pop: 100 },
  { name: 'Baghdad',       nameAr: 'بغداد',        country: 'Iraq',          countryAr: 'العراق',     flag: '🇮🇶', lat: 33.3152, lng: 44.3661, tz: 'Asia/Baghdad',      method: 'MWL',       region: 'arab',     pop: 65 },
  { name: 'Damascus',      nameAr: 'دمشق',         country: 'Syria',         countryAr: 'سوريا',      flag: '🇸🇾', lat: 33.5138, lng: 36.2765, tz: 'Asia/Damascus',     method: 'MWL',       region: 'arab',     pop: 30 },
  { name: 'Amman',         nameAr: 'عمّان',        country: 'Jordan',        countryAr: 'الأردن',     flag: '🇯🇴', lat: 31.9539, lng: 35.9106, tz: 'Asia/Amman',        method: 'MWL',       region: 'arab',     pop: 25 },
  { name: 'Sanaa',         nameAr: 'صنعاء',        country: 'Yemen',         countryAr: 'اليمن',      flag: '🇾🇪', lat: 15.3694, lng: 44.1910, tz: 'Asia/Aden',         method: 'MWL',       region: 'arab',     pop: 30 },
  { name: 'Dubai',         nameAr: 'دبي',          country: 'UAE',           countryAr: 'الإمارات',   flag: '🇦🇪', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai',        method: 'Dubai',     region: 'arab',     pop: 9 },
  { name: 'Doha',          nameAr: 'الدوحة',       country: 'Qatar',         countryAr: 'قطر',        flag: '🇶🇦', lat: 25.2854, lng: 51.5310, tz: 'Asia/Qatar',        method: 'Qatar',     region: 'arab',     pop: 3 },
  { name: 'Kuwait City',   nameAr: 'الكويت',       country: 'Kuwait',        countryAr: 'الكويت',     flag: '🇰🇼', lat: 29.3759, lng: 47.9774, tz: 'Asia/Kuwait',       method: 'Kuwait',    region: 'arab',     pop: 4 },
  { name: 'Manama',        nameAr: 'المنامة',      country: 'Bahrain',       countryAr: 'البحرين',    flag: '🇧🇭', lat: 26.2285, lng: 50.5860, tz: 'Asia/Bahrain',      method: 'Kuwait',    region: 'arab',     pop: 1.4 },
  { name: 'Muscat',        nameAr: 'مسقط',         country: 'Oman',          countryAr: 'عُمان',      flag: '🇴🇲', lat: 23.5880, lng: 58.3829, tz: 'Asia/Muscat',       method: 'Kuwait',    region: 'arab',     pop: 4 },
  { name: 'Beirut',        nameAr: 'بيروت',        country: 'Lebanon',       countryAr: 'لبنان',      flag: '🇱🇧', lat: 33.8938, lng: 35.5018, tz: 'Asia/Beirut',       method: 'MWL',       region: 'arab',     pop: 3 },
  { name: 'Jerusalem',     nameAr: 'القدس',        country: 'Palestine',     countryAr: 'فلسطين',     flag: '🇵🇸', lat: 31.7683, lng: 35.2137, tz: 'Asia/Hebron',       method: 'MWL',       region: 'arab',     pop: 5 },
  { name: 'Gaza',          nameAr: 'غزة',          country: 'Palestine',     countryAr: 'فلسطين',     flag: '🇵🇸', lat: 31.5018, lng: 34.4668, tz: 'Asia/Gaza',         method: 'MWL',       region: 'arab',     pop: 2 },
  { name: 'Khartoum',      nameAr: 'الخرطوم',      country: 'Sudan',         countryAr: 'السودان',    flag: '🇸🇩', lat: 15.5007, lng: 32.5599, tz: 'Africa/Khartoum',   method: 'MWL',       region: 'africa',   pop: 45 },
  { name: 'Tripoli',       nameAr: 'طرابلس',       country: 'Libya',         countryAr: 'ليبيا',      flag: '🇱🇾', lat: 32.8872, lng: 13.1913, tz: 'Africa/Tripoli',    method: 'MWL',       region: 'africa',   pop: 6 },
  { name: 'Tunis',         nameAr: 'تونس',         country: 'Tunisia',       countryAr: 'تونس',       flag: '🇹🇳', lat: 36.8065, lng: 10.1815, tz: 'Africa/Tunis',      method: 'Algerian',  region: 'africa',   pop: 11 },
  { name: 'Algiers',       nameAr: 'الجزائر',      country: 'Algeria',       countryAr: 'الجزائر',    flag: '🇩🇿', lat: 36.7538, lng: 3.0588,  tz: 'Africa/Algiers',    method: 'Algerian',  region: 'africa',   pop: 42 },
  { name: 'Casablanca',    nameAr: 'الدار البيضاء',country: 'Morocco',       countryAr: 'المغرب',     flag: '🇲🇦', lat: 33.5731, lng: -7.5898, tz: 'Africa/Casablanca', method: 'Morocco',   region: 'africa',   pop: 34 },
  { name: 'Nouakchott',    nameAr: 'نواكشوط',      country: 'Mauritania',    countryAr: 'موريتانيا',  flag: '🇲🇷', lat: 18.0735, lng: -15.9582,tz: 'Africa/Nouakchott', method: 'MWL',       region: 'africa',   pop: 4 },
  { name: 'Dakar',         nameAr: 'داكار',        country: 'Senegal',       countryAr: 'السنغال',    flag: '🇸🇳', lat: 14.7167, lng: -17.4677,tz: 'Africa/Dakar',      method: 'MWL',       region: 'africa',   pop: 14 },
  { name: 'Lagos',         nameAr: 'لاغوس',        country: 'Nigeria',       countryAr: 'نيجيريا',    flag: '🇳🇬', lat: 6.5244,  lng: 3.3792,  tz: 'Africa/Lagos',      method: 'MWL',       region: 'africa',   pop: 55 },
  { name: 'Mogadishu',     nameAr: 'مقديشو',       country: 'Somalia',       countryAr: 'الصومال',    flag: '🇸🇴', lat: 2.0469,  lng: 45.3182, tz: 'Africa/Mogadishu',  method: 'MWL',       region: 'africa',   pop: 15 },
  { name: 'Istanbul',      nameAr: 'إسطنبول',      country: 'Türkiye',       countryAr: 'تركيا',      flag: '🇹🇷', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul',   method: 'Turkey',    region: 'europe',   pop: 85 },
  { name: 'Ankara',        nameAr: 'أنقرة',        country: 'Türkiye',       countryAr: 'تركيا',      flag: '🇹🇷', lat: 39.9334, lng: 32.8597, tz: 'Europe/Istanbul',   method: 'Turkey',    region: 'europe',   pop: 6 },
  { name: 'Tehran',        nameAr: 'طهران',        country: 'Iran',          countryAr: 'إيران',      flag: '🇮🇷', lat: 35.6892, lng: 51.3890, tz: 'Asia/Tehran',       method: 'Tehran',    region: 'asia',     pop: 70 },
  { name: 'Kabul',         nameAr: 'كابول',        country: 'Afghanistan',   countryAr: 'أفغانستان',  flag: '🇦🇫', lat: 34.5553, lng: 69.2075, tz: 'Asia/Kabul',        method: 'Karachi',   region: 'asia',     pop: 45 },
  { name: 'Tashkent',      nameAr: 'طشقند',        country: 'Uzbekistan',    countryAr: 'أوزبكستان',  flag: '🇺🇿', lat: 41.2995, lng: 69.2401, tz: 'Asia/Tashkent',     method: 'Karachi',   region: 'asia',     pop: 35 },
  { name: 'Baku',          nameAr: 'باكو',         country: 'Azerbaijan',    countryAr: 'أذربيجان',   flag: '🇦🇿', lat: 40.4093, lng: 49.8671, tz: 'Asia/Baku',         method: 'Tehran',    region: 'asia',     pop: 10 },
  { name: 'Karachi',       nameAr: 'كراتشي',       country: 'Pakistan',      countryAr: 'باكستان',    flag: '🇵🇰', lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi',      method: 'Karachi',   region: 'asia',     pop: 200 },
  { name: 'Lahore',        nameAr: 'لاهور',        country: 'Pakistan',      countryAr: 'باكستان',    flag: '🇵🇰', lat: 31.5497, lng: 74.3436, tz: 'Asia/Karachi',      method: 'Karachi',   region: 'asia',     pop: 130 },
  { name: 'Islamabad',     nameAr: 'إسلام آباد',   country: 'Pakistan',      countryAr: 'باكستان',    flag: '🇵🇰', lat: 33.6844, lng: 73.0479, tz: 'Asia/Karachi',      method: 'Karachi',   region: 'asia',     pop: 12 },
  { name: 'Dhaka',         nameAr: 'دكا',          country: 'Bangladesh',    countryAr: 'بنغلاديش',   flag: '🇧🇩', lat: 23.8103, lng: 90.4125, tz: 'Asia/Dhaka',        method: 'Karachi',   region: 'asia',     pop: 165 },
  { name: 'Delhi',         nameAr: 'دلهي',         country: 'India',         countryAr: 'الهند',      flag: '🇮🇳', lat: 28.6139, lng: 77.2090, tz: 'Asia/Kolkata',      method: 'Karachi',   region: 'asia',     pop: 45 },
  { name: 'Mumbai',        nameAr: 'مومباي',       country: 'India',         countryAr: 'الهند',      flag: '🇮🇳', lat: 19.0760, lng: 72.8777, tz: 'Asia/Kolkata',      method: 'Karachi',   region: 'asia',     pop: 70 },
  { name: 'Hyderabad',     nameAr: 'حيدر آباد',    country: 'India',         countryAr: 'الهند',      flag: '🇮🇳', lat: 17.3850, lng: 78.4867, tz: 'Asia/Kolkata',      method: 'Karachi',   region: 'asia',     pop: 30 },
  { name: 'Jakarta',       nameAr: 'جاكرتا',       country: 'Indonesia',     countryAr: 'إندونيسيا',  flag: '🇮🇩', lat: -6.2088, lng: 106.8456,tz: 'Asia/Jakarta',      method: 'Singapore', region: 'asia',     pop: 230 },
  { name: 'Surabaya',      nameAr: 'سورابايا',     country: 'Indonesia',     countryAr: 'إندونيسيا',  flag: '🇮🇩', lat: -7.2575, lng: 112.7521,tz: 'Asia/Jakarta',      method: 'Singapore', region: 'asia',     pop: 40 },
  { name: 'Kuala Lumpur',  nameAr: 'كوالالمبور',   country: 'Malaysia',      countryAr: 'ماليزيا',    flag: '🇲🇾', lat: 3.1390,  lng: 101.6869,tz: 'Asia/Kuala_Lumpur', method: 'Singapore', region: 'asia',     pop: 60 },
  { name: 'Singapore',     nameAr: 'سنغافورة',     country: 'Singapore',     countryAr: 'سنغافورة',   flag: '🇸🇬', lat: 1.3521,  lng: 103.8198,tz: 'Asia/Singapore',    method: 'Singapore', region: 'asia',     pop: 0.9 },
  { name: 'Brunei',        nameAr: 'بروناي',       country: 'Brunei',        countryAr: 'بروناي',     flag: '🇧🇳', lat: 4.9031,  lng: 114.9398,tz: 'Asia/Brunei',       method: 'Singapore', region: 'asia',     pop: 0.4 },
  { name: 'Moscow',        nameAr: 'موسكو',        country: 'Russia',        countryAr: 'روسيا',      flag: '🇷🇺', lat: 55.7558, lng: 37.6173, tz: 'Europe/Moscow',     method: 'Russia',    region: 'europe',   pop: 20 },
  { name: 'Sarajevo',      nameAr: 'سراييفو',      country: 'Bosnia',        countryAr: 'البوسنة',    flag: '🇧🇦', lat: 43.8563, lng: 18.4131, tz: 'Europe/Sarajevo',   method: 'MWL',       region: 'europe',   pop: 2 },
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
  fajr:    { ar: 'الفجر',   de: 'Fadschr',     color: 'hsl(42, 100%, 62%)' },
  shuruq:  { ar: 'الشروق',  de: 'Sonnenaufg.', color: 'hsl(28, 95%, 60%)'  },
  duha:    { ar: 'الضحى',   de: 'Duha',        color: 'hsl(48, 90%, 55%)'  },
  dhuhr:   { ar: 'الظهر',   de: 'Dhuhr',       color: 'hsl(200, 78%, 58%)' },
  asr:     { ar: 'العصر',   de: 'Asr',         color: 'hsl(22, 75%, 55%)'  },
  maghrib: { ar: 'المغرب',  de: 'Maghrib',     color: 'hsl(340, 72%, 55%)' },
  isha:    { ar: 'العشاء',  de: 'Ischa',       color: 'hsl(250, 60%, 58%)' },
  night:   { ar: 'الليل',   de: 'Nacht',       color: 'hsl(220, 30%, 45%)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Simplified continents (equirectangular, W=360, H=180)
// ─────────────────────────────────────────────────────────────────────────────
const CONTINENTS = [
  'M163,69 L174,55 L191,57 L202,58 L212,59 L216,75 L231,79 L220,95 L215,115 L200,125 L198,124 L188,95 L180,85 L170,83 L163,76 Z',
  'M170,54 L183,47 L181,40 L178,39 L188,35 L200,31 L210,30 L220,24 L240,23 L280,15 L315,18 L350,22 L348,30 L330,38 L325,48 L320,53 L308,55 L302,60 L290,70 L282,78 L278,82 L260,83 L252,68 L248,65 L240,65 L238,67 L232,64 L227,60 L220,55 L215,54 L210,53 L204,54 L195,52 L188,51 L175,54 Z',
  'M174,36 L182,34 L181,42 L175,44 Z',
  'M188,25 L210,20 L215,28 L205,36 L195,34 Z',
  'M318,48 L325,45 L322,52 L316,55 Z',
  'M12,24 L39,20 L55,18 L80,18 L95,24 L105,29 L115,42 L100,46 L99,59 L93,60 L83,64 L73,67 L62,57 L56,50 L50,35 L30,30 Z',
  'M125,12 L155,8 L165,12 L160,22 L140,25 L128,22 Z',
  'M85,68 L95,70 L103,74 L100,78 L90,76 Z',
  'M102,78 L120,83 L130,90 L145,98 L142,113 L132,120 L123,125 L109,143 L105,137 L108,125 L100,102 Z',
  'M293,112 L302,107 L311,102 L321,102 L325,107 L334,115 L329,127 L321,128 L296,125 L294,116 Z',
  'M348,128 L354,126 L352,136 L346,134 Z',
  'M275,85 L286,84 L300,84 L311,90 L320,92 L320,98 L310,98 L295,99 L285,98 L275,92 Z',
  'M228,112 L233,110 L234,122 L229,124 Z',
  'M228,72 L246,72 L245,82 L230,80 Z',
  'M308,82 L314,80 L315,90 L310,92 Z',
  'M158,25 L166,23 L167,30 L158,31 Z',
].join(' ');

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
  const shadowFactor: 1 | 2 = prayerMadhab === 'hanafi' ? 2 : 1;

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

  // Compute per-city prayer info (recomputed every tick)
  const cityDetails = useMemo(
    () =>
      CITIES.map((c) => {
        const info = getCityPrayerInfo(c.lat, c.lng, c.tz, c.method, now, shadowFactor);
        return { ...c, info };
      }),
    [now, shadowFactor]
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

  // ── Map render ────────────────────────────────────────────────────────────
  const renderMapSvg = (opts: { large?: boolean } = {}) => {
    const large = !!opts.large;
    const idSuffix = large ? 'Lg' : 'Sm';
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block select-none"
        preserveAspectRatio="xMidYMid meet"
        aria-label={t(
          'خريطة العالم مع موجة الفجر الحية',
          'Weltkarte mit Live-Fadschr-Welle'
        )}
      >
        <defs>
          <radialGradient id={`fajrGlow${idSuffix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(42, 100%, 68%)" stopOpacity="0.95" />
            <stop offset="40%"  stopColor="hsl(30, 92%, 55%)"  stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(20, 80%, 45%)"  stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`maghribGlow${idSuffix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(340, 80%, 62%)" stopOpacity="0.75" />
            <stop offset="60%"  stopColor="hsl(320, 60%, 40%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(280, 50%, 30%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`ocean${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="hsl(var(--muted))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1"  />
          </linearGradient>
          <radialGradient id={`sunGrad${idSuffix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="hsl(48, 100%, 80%)" stopOpacity="1"   />
            <stop offset="55%" stopColor="hsl(42, 100%, 60%)" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="hsl(35, 95%, 50%)" stopOpacity="0"   />
          </radialGradient>
          <filter id={`softBlur${idSuffix}`}>
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        <rect width={W} height={H} fill={`url(#ocean${idSuffix})`} />

        <line x1={0} y1={90} x2={W} y2={90}
              stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth="0.35" />
        {[66.5, 23.5, -23.5, -66.5].map((lat) => {
          const y = ((90 - lat) / 180) * H;
          return (
            <line key={lat} x1={0} y1={y} x2={W} y2={y}
                  stroke="hsl(var(--border))" strokeOpacity="0.18"
                  strokeWidth="0.25" strokeDasharray="2 3" />
          );
        })}
        {[-120, -60, 0, 60, 120].map((lng) => {
          const x = ((lng + 180) / 360) * W;
          return (
            <line key={lng} x1={x} y1={0} x2={x} y2={H}
                  stroke="hsl(var(--border))" strokeOpacity="0.12"
                  strokeWidth="0.25" strokeDasharray="2 3" />
          );
        })}

        <path d={CONTINENTS} fill="hsl(var(--foreground))" fillOpacity="0.22" />
        <path d={CONTINENTS} fill="none"
              stroke="hsl(var(--foreground))" strokeOpacity="0.18" strokeWidth="0.4" />

        <g>
          {nightPaths.map((d, i) => (
            <path key={i} d={d} fill="hsl(220, 42%, 6%)" fillOpacity="0.55" />
          ))}
          {nightPaths.map((d, i) => (
            <path key={`b-${i}`} d={d} fill="none"
                  stroke="hsl(45, 90%, 60%)" strokeOpacity="0.35"
                  strokeWidth="0.6" strokeDasharray="1.5 1.5" />
          ))}
        </g>

        {/* Maghrib band */}
        {(() => {
          const mLng = ((subLng - 95 + 540) % 360) - 180;
          const p = project(0, mLng);
          return (
            <motion.ellipse
              cx={p.x} cy={H / 2} rx={22} ry={H / 2}
              fill={`url(#maghribGlow${idSuffix})`}
              filter={`url(#softBlur${idSuffix})`}
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
          );
        })()}

        {/* Fajr band */}
        <motion.g
          key={`fajr-${Math.round(fajrCenter.x / 3)}`}
          initial={{ opacity: 0.65 }}
          animate={{ opacity: [0.65, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx={fajrCenter.x} cy={H / 2} rx={30} ry={H / 2}
                   fill={`url(#fajrGlow${idSuffix})`} filter={`url(#softBlur${idSuffix})`} />
          {fajrCenter.x < 32 && (
            <ellipse cx={fajrCenter.x + W} cy={H / 2} rx={30} ry={H / 2}
                     fill={`url(#fajrGlow${idSuffix})`} filter={`url(#softBlur${idSuffix})`} />
          )}
          {fajrCenter.x > W - 32 && (
            <ellipse cx={fajrCenter.x - W} cy={H / 2} rx={30} ry={H / 2}
                     fill={`url(#fajrGlow${idSuffix})`} filter={`url(#softBlur${idSuffix})`} />
          )}
        </motion.g>

        {/* Subsolar point */}
        <g>
          <motion.circle
            cx={sunPoint.x} cy={sunPoint.y} r={8}
            fill={`url(#sunGrad${idSuffix})`}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${sunPoint.x}px ${sunPoint.y}px` }}
          />
          <circle cx={sunPoint.x} cy={sunPoint.y} r={1.8} fill="hsl(48, 100%, 92%)" />
        </g>

        {/* City dots */}
        {cityDetails.map((c) => {
          const { x, y } = project(c.lat, c.lng);
          const color = SLOT_META[c.info.slot].color;
          const isFajr = c.info.slot === 'fajr';
          const isSelected = c.name === selectedCity;
          const isMakkah = c.name === 'Makkah';
          return (
            <g key={`${c.name}-${c.lat}-${c.lng}`}
               style={{ cursor: 'pointer' }}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedCity(c.name === selectedCity ? null : c.name);
               }}>
              <circle cx={x} cy={y} r={5} fill="transparent" />
              {isFajr && (
                <motion.circle
                  cx={x} cy={y} r={2.4}
                  fill={color}
                  animate={{ r: [2.4, 4.5, 2.4], opacity: [1, 0.55, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <circle
                cx={x} cy={y}
                r={isMakkah ? 2.2 : isFajr ? 1.6 : 1.2}
                fill={isMakkah ? 'hsl(48, 100%, 70%)' : color}
                fillOpacity={isFajr || isMakkah ? 1 : 0.85}
                stroke={isSelected ? 'hsl(var(--foreground))' : isMakkah ? 'hsl(48,100%,95%)' : 'none'}
                strokeWidth={isSelected ? 0.6 : isMakkah ? 0.4 : 0}
              />
              {isMakkah && (
                <motion.circle
                  cx={x} cy={y} r={3.5}
                  fill="none"
                  stroke="hsl(48, 100%, 70%)"
                  strokeWidth="0.5"
                  animate={{ r: [3.5, 6, 3.5], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </g>
          );
        })}

        {/* Tooltip for selected city */}
        {large && selectedCityDetails && (() => {
          const p = project(selectedCityDetails.lat, selectedCityDetails.lng);
          const tipW = 80;
          const tipH = 28;
          const flip = p.x > W - tipW - 4;
          const tx = flip ? p.x - tipW - 4 : p.x + 4;
          const ty = Math.max(2, Math.min(H - tipH - 2, p.y - tipH / 2));
          const c = selectedCityDetails;
          const nextName = SLOT_META[c.info.next.name].ar;
          const nextDe = SLOT_META[c.info.next.name].de;
          const rem = c.info.next.minutesUntil;
          const hh = Math.floor(rem / 60);
          const mm = rem % 60;
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tipW} height={tipH} rx={3}
                    fill="hsl(var(--background))" fillOpacity="0.95"
                    stroke={SLOT_META[c.info.slot].color} strokeWidth="0.5" />
              <text x={tx + 3} y={ty + 7}
                    fontSize="5" fill="hsl(var(--foreground))" fontWeight="700">
                {language === 'ar' ? c.nameAr : c.name}
              </text>
              <text x={tx + 3} y={ty + 14} fontSize="4"
                    fill={SLOT_META[c.info.slot].color} fontWeight="700">
                {language === 'ar' ? SLOT_META[c.info.slot].ar : SLOT_META[c.info.slot].de}
              </text>
              <text x={tx + tipW - 3} y={ty + 14} fontSize="4"
                    fill="hsl(var(--muted-foreground))" textAnchor="end">
                {c.info.localClock}
              </text>
              <text x={tx + 3} y={ty + 22} fontSize="3.5"
                    fill="hsl(var(--muted-foreground))">
                {language === 'ar'
                  ? `→ ${nextName} بعد ${hh ? hh + 'س ' : ''}${mm}د`
                  : `→ ${nextDe} in ${hh ? hh + 'h ' : ''}${mm}m`}
              </text>
            </g>
          );
        })()}
      </svg>
    );
  };

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
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-bold">
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
                    ? 'shadow-sm'
                    : 'bg-muted/30'
                }`}
                style={isCurrent ? {
                  background: m.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)'),
                  boxShadow: `inset 0 0 0 1px ${m.color}`,
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

        {/* Meta row: method + qibla */}
        <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between gap-3 text-[10.5px]">
          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
            <Info className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {language === 'ar' ? METHOD_LABELS[c.method].ar : METHOD_LABELS[c.method].de}
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
      className="relative rounded-3xl overflow-hidden border border-border/40 bg-gradient-to-b from-card via-card to-background shadow-lg"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-2"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe2 className="w-4.5 h-4.5 text-primary" strokeWidth={2} />
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
                <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-red-500" />
              </span>
              <span className="text-[9px] font-bold tracking-wide text-foreground">LIVE</span>
            </div>

            {renderMapSvg()}

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
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe2 className="w-5 h-5 text-primary" />
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
                {/* Larger map */}
                <div className="px-4 pt-4">
                  <div
                    className="relative rounded-2xl overflow-hidden bg-[hsl(var(--muted))]/30 border border-border/30"
                    onClick={() => setSelectedCity(null)}
                  >
                    {renderMapSvg({ large: true })}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-md border border-border/40">
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-semibold text-foreground tabular-nums">
                        {subLat.toFixed(1)}°, {((subLng + 540) % 360 - 180).toFixed(1)}°
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
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
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
                              ? 'bg-primary/5 border-primary/40 shadow-sm'
                              : 'bg-card border-border/30 active:scale-[0.99]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-xl leading-none shrink-0">{c.flag}</span>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                background: meta.color,
                                boxShadow: c.info.slot === 'fajr' ? `0 0 8px ${meta.color}` : 'none',
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                                {language === 'ar' ? c.nameAr : c.name}
                                {c.name === 'Makkah' && (
                                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-bold align-middle">
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
                    'أوقات دقيقة مبنية على الطرق الرسمية لكل بلد (أم القرى، ديانت، كراتشي، إلخ) • يُحدَّث كل 15 ثانية • مذهب العصر: ' +
                      (prayerMadhab === 'hanafi' ? 'حنفي' : 'جمهور'),
                    'Präzise Zeiten nach offizieller Methode jedes Landes (Umm al-Qura, Diyanet, Karatschi, …) · Aktualisierung alle 15 s · Asr-Madhab: ' +
                      (prayerMadhab === 'hanafi' ? 'Hanafi' : 'Mehrheit')
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
