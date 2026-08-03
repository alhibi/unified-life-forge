import React from 'react';

import { GrammaticalGender } from '../types';

interface GermanGenderBadgeProps {
  gender: GrammaticalGender | null;
}

export const GermanGenderBadge: React.FC<GermanGenderBadgeProps> = ({ gender }) => {
  if (!gender) return null;

  const config = {
    der: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'مذكر (M)' },
    die: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', label: 'مؤنث (F)' },
    das: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'محايد (N)' },
  };

  const { bg, label } = config[gender];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bg}`}>
      <span className="font-plex-mono text-mini font-bold tracking-widest">{gender}</span>
      <span className="w-1 h-1 rounded-full bg-current opacity-30" />
      <span className="font-tajawal text-mini font-bold uppercase">{label}</span>
    </div>
  );
};
export default GermanGenderBadge;
