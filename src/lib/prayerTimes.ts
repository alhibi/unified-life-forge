import { PrayerTimes, Coordinates, CalculationMethod, HighLatitudeRule } from 'adhan';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerTime {
  name: PrayerName;
  time: Date;
  labelAr: string;
  labelDe: string;
}

const prayerLabels = {
  fajr: { ar: 'الفجر', de: 'Fajr' },
  sunrise: { ar: 'الشروق', de: 'Sonnenaufgang' },
  dhuhr: { ar: 'الظهر', de: 'Dhuhr' },
  asr: { ar: 'العصر', de: 'Asr' },
  maghrib: { ar: 'المغرب', de: 'Maghrib' },
  isha: { ar: 'العشاء', de: 'Isha' },
};

export function calculatePrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
  madhab: 'shafii' | 'hanafi' = 'shafii',
  highLatitudeMethod: 'middle' | 'seventh' | 'angle' = 'angle',
  dstEnabled: boolean = true
): PrayerTime[] {
  const coordinates = new Coordinates(lat, lng);

  let params = madhab === 'hanafi' 
    ? CalculationMethod.Hanafi() 
    : CalculationMethod.MuslimWorldLeague();

  // High Latitude Adjustment
  switch (highLatitudeMethod) {
    case 'middle':
      params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;
      break;
    case 'seventh':
      params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;
      break;
    case 'angle':
    default:
      params.highLatitudeRule = HighLatitudeRule.AngleBased;
  }

  const prayerTimes = new PrayerTimes(coordinates, date, params);

  const prayers: PrayerTime[] = [
    { name: 'fajr', time: prayerTimes.fajr, ...prayerLabels.fajr },
    { name: 'sunrise', time: prayerTimes.sunrise, ...prayerLabels.sunrise },
    { name: 'dhuhr', time: prayerTimes.dhuhr, ...prayerLabels.dhuhr },
    { name: 'asr', time: prayerTimes.asr, ...prayerLabels.asr },
    { name: 'maghrib', time: prayerTimes.maghrib, ...prayerLabels.maghrib },
    { name: 'isha', time: prayerTimes.isha, ...prayerLabels.isha },
  ];

  return prayers;
}

export function getNextPrayer(prayers: PrayerTime[]) {
  const now = new Date();
  return prayers.find(p => p.time > now) || prayers[0];
}
