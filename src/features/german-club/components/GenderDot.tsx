import React from 'react';
import { GENDER_COLORS, GermanGender } from '../types';

interface GenderDotProps {
  gender: GermanGender;
  size?: number;
  className?: string;
}

export const GenderDot: React.FC<GenderDotProps> = ({ gender, size = 10, className = '' }) => {
  const color = GENDER_COLORS[gender];
  if (!color || gender === 'n_a') return null;

  return (
    <span
      className={`inline-block rounded-full shrink-0 align-middle transition-transform hover:scale-125 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}66`,
      }}
      title={`الجنس: ${gender}`}
      aria-label={`الجنس: ${gender}`}
    />
  );
};
