/**
 * PortalGreeting — the launcher's masthead: who you are, what day it is and
 * where the day currently stands.
 *
 * The design refoundation removed the "editorial manuscript" card that painted
 * raw hex, crop marks and a wax seal before the first app. What is left is the
 * screen's real opening line: the Gregorian and Hijri date, a greeting, one
 * quiet line of adab — plus, on anything wider than a phone, the live next
 * prayer with its countdown and the elapsed share of the window between the
 * two prayers. That last item is what makes the masthead a *status* line and
 * not decoration: it is the same cached timings the prayer card below uses, so
 * the two can never disagree.
 *
 * The next-prayer chip is hidden on phones: the prayer card sits directly
 * underneath, so repeating the same figure there would only push the card
 * below the first viewport.
 */
import { formatHijriDate } from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import { Clock } from '@/lib/icons';

import { useNextPrayer } from './useNextPrayer';

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

/**
 * Live "where the day stands" pill. Reads the shared cached timings through
 * useNextPrayer, so it is silent until they resolve (never a fake countdown)
 * and it renders nothing when location is unavailable. On the date row it is
 * the masthead's one live figure — the prayer card below carries the detail.
 */
function NextPrayerStatus() {
  const { next } = useNextPrayer();
  if (!next) return null;

  const elapsed = Math.round(next.progress * 100);

  return (
    <div
      className="hidden items-center gap-2.5 rounded-full border border-border/60 bg-secondary/50 py-1.5 pe-3.5 ps-1.5 lg:flex"
      aria-label="حالة الصلاة القادمة"
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
        aria-hidden
      >
        <Clock className="h-3.5 w-3.5" />
      </span>
      <p className="whitespace-nowrap text-mini text-muted-foreground">
        الصلاة القادمة{' '}
        <span className="font-semibold text-foreground">{next.label}</span>{' '}
        <span aria-hidden>·</span>{' '}
        <span dir="ltr" className="font-semibold tabular-nums text-foreground">
          {next.clock}
        </span>{' '}
        <span aria-hidden>·</span>{' '}
        <span className="tabular-nums">{next.relative}</span>
      </p>
      <div
        className="ms-1 w-14 shrink-0"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={elapsed}
        aria-label="ما مضى من الوقت بين الصلاتين"
      >
        <div className="h-1 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full bg-primary" style={{ width: `${elapsed}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function PortalGreeting({ username }: { username: string | null }) {
  const { hijri } = useLiveHijriDate();
  const now = new Date();
  const hour = now.getHours();
  const slot = slotFor(hour);

  return (
    <header className="py-1">
      {/* Date line + the one live figure of the masthead. Both belong to the
          same row so the status reads as part of the date, not a floating card. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-meta font-medium text-muted-foreground">
          {WEEKDAY_FORMAT.format(now)} · {DATE_FORMAT.format(now)} · {formatHijriDate(hijri)}
        </p>
        <NextPrayerStatus />
      </div>
      <h2 className="type-display mt-2 text-balance leading-relaxed text-foreground">
        {greetingFor(hour)}
        {username && <span className="text-title font-medium text-primary">، {username}</span>}
      </h2>
      <p className="mt-2 max-w-[46ch] font-body text-meta leading-relaxed text-muted-foreground">
        {VERSES[slot]}
      </p>
    </header>
  );
}
