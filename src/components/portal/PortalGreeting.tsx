/**
 * PortalGreeting — the launcher's opening line.
 *
 * Replaces the "editorial manuscript" card, which painted its own dark palette
 * in raw hex (so it ignored the theme entirely), stacked crop marks, a rotating
 * wax seal and a full couplet before the user reached a single app. What
 * survives is what the screen is actually for: who you are, what day it is,
 * and one quiet line of adab underneath — all on semantic tokens.
 */
import { formatHijriDate } from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('ar', { weekday: 'long' });
const DATE_FORMAT = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' });

const VERSES = {
  morning: 'وَخَيْرُ جَلِيسٍ فِي الزَّمَانِ كِتَابُ',
  afternoon: 'الْجِدُّ يَفْتَحُ كُلَّ بَابٍ مُغْلَقِ',
  evening: 'عَلَى قَدْرِ أَهْلِ الْعَزْمِ تَأْتِي الْعَزَائِمُ',
  night: 'فَابْسُطْ يَدَيْكَ إِلَى الرَّحْمَنِ تَبْتَهِلُ',
} as const;

type Slot = keyof typeof VERSES;

function slotFor(hour: number): Slot {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 15) return 'afternoon';
  if (hour >= 15 && hour < 19) return 'evening';
  return 'night';
}

function greetingFor(hour: number): string {
  if (hour < 5) return 'ليلة مباركة';
  if (hour < 12) return 'صباح الخير';
  if (hour < 15) return 'نهارك سعيد';
  if (hour < 19) return 'مساء الخير';
  return 'طاب مساؤك';
}

export default function PortalGreeting({ username }: { username: string | null }) {
  const { hijri } = useLiveHijriDate();
  const now = new Date();
  const hour = now.getHours();
  const slot = slotFor(hour);

  return (
    <header className="space-y-1.5">
      <p className="text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {WEEKDAY_FORMAT.format(now)} · {DATE_FORMAT.format(now)} · {formatHijriDate(hijri)}
      </p>
      <h2 className="font-amiri text-display font-bold leading-tight text-foreground">
        {greetingFor(hour)}
        {username && <span className="text-title font-medium text-muted-foreground">، {username}</span>}
      </h2>
      <p className="font-amiri text-body leading-relaxed text-muted-foreground">{VERSES[slot]}</p>
    </header>
  );
}
