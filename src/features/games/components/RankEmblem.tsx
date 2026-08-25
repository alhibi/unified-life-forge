/**
 * RankEmblem — the player's rank as a physical object.
 *
 * The old hub showed the rank as a text label next to a level ring, so "خبير II"
 * carried no more weight than "موسم أغسطس". A rank is supposed to be a badge of
 * standing — this renders it as one: an SVG shield whose fill encodes the tier
 * (bronze → legend), with the division numeral inside and the exact level
 * requirement of the next division printed beneath. Every input comes from
 * `rankForLevel` over real XP; nothing here is decorative guesswork.
 */

import { memo } from 'react';

import { cn } from '@/lib/utils';

import type { Rank } from '../progression/xp';

/** Per-tier palette: plate gradient stops + edge highlight. */
const TIERS: Record<string, { from: string; to: string; edge: string; label: string }> = {
  novice: { from: '#8d99ae', to: '#5c677d', edge: 'rgba(255,255,255,.35)', label: 'حجر' },
  apprentice: { from: '#a8763e', to: '#7c5220', edge: 'rgba(255,214,153,.45)', label: 'برونز' },
  skilled: { from: '#c9ccd1', to: '#8f959e', edge: 'rgba(255,255,255,.6)', label: 'فضة' },
  expert: { from: '#e8b64c', to: '#b98a1e', edge: 'rgba(255,240,190,.65)', label: 'ذهب' },
  master: { from: '#63b3ed', to: '#2c7fb8', edge: 'rgba(200,235,255,.6)', label: 'بلاتين' },
  elite: { from: '#4fd1c5', to: '#23988d', edge: 'rgba(190,255,248,.55)', label: 'زمرد' },
  legend: { from: '#b794f4', to: '#805ad5', edge: 'rgba(230,215,255,.55)', label: 'أسطورة' },
};

interface Props {
  rank: Rank;
  size?: number;
  /** Show "التالية: مستوى N" under the emblem. */
  showNext?: boolean;
  className?: string;
}

function RankEmblemImpl({ rank, size = 84, showNext = true, className }: Props) {
  const palette = TIERS[rank.tier.id] ?? TIERS.novice;
  const gradId = `rank-grad-${rank.tier.id}`;
  const levelAtNext = showNext && rank.nextAtLevel !== null;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`الرتبة ${rank.label}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to} />
          </linearGradient>
        </defs>
        {/* Shield body */}
        <path
          d="M50 6 L88 20 V52 C88 74 71 88 50 95 C29 88 12 74 12 52 V20 Z"
          fill={`url(#${gradId})`}
          stroke={palette.edge}
          strokeWidth="1.5"
        />
        {/* Division notches — one per division in the tier */}
        {Array.from({ length: rank.tier.divisions }, (_, i) => (
          <rect
            key={i}
            x={26 + i * (48 / Math.max(1, rank.tier.divisions))}
            y={14}
            width={48 / Math.max(1, rank.tier.divisions) - 3}
            height={5}
            rx={1.5}
            fill={i < rank.division ? 'rgba(255,255,255,.92)' : 'rgba(0,0,0,.28)'}
          />
        ))}
        {/* Division numeral */}
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize={rank.tier.divisions > 1 ? 30 : 34}
          fontWeight="800"
          fill="#fff"
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.25)', strokeWidth: 1 }}
          aria-hidden
        >
          {rank.tier.divisions > 1 ? ['I', 'II', 'III', 'IV', 'V'][rank.division - 1] : ''}
        </text>
      </svg>

      <p className="text-meta font-bold leading-none" style={{ color: palette.from }}>
        {rank.label}
      </p>

      {levelAtNext && (
        <p className="text-micro tabular-nums text-muted-foreground" dir="rtl">
          القسم القادم عند المستوى{' '}
          <span dir="ltr">{rank.nextAtLevel}</span>
        </p>
      )}
    </div>
  );
}

export const RankEmblem = memo(RankEmblemImpl);
export default RankEmblem;
