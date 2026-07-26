import { Star } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface RatingPickerProps {
  value: number | null;
  onChange: (rating: number | null) => void;
}

const STARS = [1, 2, 3, 4, 5];

/**
 * Personal rating. Tapping the current value clears it, because "I have not
 * judged this yet" and "I gave it one star" are different facts and the atlas
 * shows them differently.
 */
export default function RatingPicker({ value, onChange }: RatingPickerProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="التقييم">
      {STARS.map((star) => {
        const isFilled = value !== null && star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? null : star)}
            aria-label={`${star} من ٥`}
            aria-pressed={isFilled}
            className={cn(
              'grid h-11 w-11 place-items-center rounded-button transition-colors',
              isFilled ? 'text-[hsl(var(--live))]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Star className="h-5 w-5" fill={isFilled ? 'currentColor' : undefined} />
          </button>
        );
      })}
      {value !== null && (
        <span className="ms-1 font-mono text-mini tabular-nums text-muted-foreground">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
