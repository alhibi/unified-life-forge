import React from 'react';
import { GrammaticalGender } from '../types';

interface GermanGenderBadgeProps {
  gender: GrammaticalGender | null;
  className?: string;
  showLabel?: boolean;
}

export const GermanGenderBadge: React.FC<GermanGenderBadgeProps> = ({
  gender,
  className = '',
  showLabel = true,
}) => {
  if (!gender) return null;

  let themeClasses = '';
  let labelAr = '';

  switch (gender) {
    case 'der':
      themeClasses = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      labelAr = 'مذكر';
      break;
    case 'die':
      themeClasses = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      labelAr = 'مؤنث';
      break;
    case 'das':
      themeClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      labelAr = 'محايد';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium border subpixel-antialiased tracking-wide select-none ${themeClasses} ${className}`}
      dir="ltr"
    >
      <span className="font-extrabold uppercase">{gender}</span>
      {showLabel && (
        <>
          <span className="opacity-40">|</span>
          <span className="font-sans text-[10px] text-muted-foreground">{labelAr}</span>
        </>
      )}
    </span>
  );
};
