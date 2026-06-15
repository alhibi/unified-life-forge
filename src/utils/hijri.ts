export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export function gregorianToHijri(year: number, month: number, day: number): HijriDate {
  // Julian Day Number
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Hijri from Julian Day
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const remaining = l - 10631 * n + 354;
  const j = Math.floor((10985 - remaining) / 5316) * Math.floor((50 * remaining) / 17719) + Math.floor(remaining / 5670) * Math.floor((43 * remaining) / 15238);
  const rl = remaining - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * rl) / 709);
  const hDay = rl - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return { year: hYear, month: hMonth, day: hDay };
}

export function getDaysInGregorianMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}
