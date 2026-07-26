import { MONTH_LABELS, MONTH_SHORT } from '../../data/categories';

interface MonthPickerProps {
  value: number[];
  onChange: (months: number[]) => void;
}

/**
 * "When is this place at its best" as twelve toggles.
 *
 * Free text ("spring, but avoid Ramadan") cannot be filtered or charted. Twelve
 * month flags can: they drive the season strip on the place page and the
 * "where should I go next month" view. The prose note stays as a separate field
 * for the nuance a calendar cannot hold.
 */
export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const selected = new Set(value);

  const toggle = (month: number) => {
    const next = new Set(selected);
    if (next.has(month)) next.delete(month);
    else next.add(month);
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
      {MONTH_SHORT.map((short, index) => {
        const month = index + 1;
        const isSelected = selected.has(month);
        return (
          <button
            key={month}
            type="button"
            className="travel-month-cell"
            data-selected={isSelected}
            aria-pressed={isSelected}
            aria-label={MONTH_LABELS[index]}
            onClick={() => toggle(month)}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
