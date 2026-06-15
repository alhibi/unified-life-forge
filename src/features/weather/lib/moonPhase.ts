// Moon phase calculator — no external API needed.
// Uses a simplified synodic month (29.530588853 days) since a known new moon.

const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0); // 2000-01-06 18:14 UTC
const SYNODIC_MS = 29.530588853 * 86_400_000;

export interface MoonPhaseInfo {
  /** 0..1 fraction through the synodic month (0 = new moon). */
  phase: number;
  /** 0..1 illuminated fraction. */
  illumination: number;
  /** Localized phase name. */
  name: { ar: string; de: string };
  /** True when waxing (illumination increasing). */
  waxing: boolean;
}

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const diff = date.getTime() - KNOWN_NEW_MOON_MS;
  const phase = ((diff % SYNODIC_MS) + SYNODIC_MS) % SYNODIC_MS / SYNODIC_MS;
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  const waxing = phase < 0.5;

  let name: { ar: string; de: string };
  if (phase < 0.03 || phase > 0.97) name = { ar: 'محاق',          de: 'Neumond' };
  else if (phase < 0.22)            name = { ar: 'هلال متزايد',    de: 'Zunehmende Sichel' };
  else if (phase < 0.28)            name = { ar: 'تربيع أول',      de: 'Erstes Viertel' };
  else if (phase < 0.47)            name = { ar: 'أحدب متزايد',    de: 'Zunehmender Mond' };
  else if (phase < 0.53)            name = { ar: 'بدر',           de: 'Vollmond' };
  else if (phase < 0.72)            name = { ar: 'أحدب متناقص',    de: 'Abnehmender Mond' };
  else if (phase < 0.78)            name = { ar: 'تربيع أخير',     de: 'Letztes Viertel' };
  else                              name = { ar: 'هلال متناقص',    de: 'Abnehmende Sichel' };

  return { phase, illumination, name, waxing };
}