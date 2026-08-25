/**
 * RankEmblem — a minted medal, not an icon.
 *
 * Layered SVG: metal gradient body → inner bevel ring → brushed sheen band →
 * division notches → engraved numeral. A single specular sweep crosses the
 * face once every few seconds (skipped under reduced-motion). Tier metals:
 * حجر → برونز → فضة → ذهب → بلاتين → زمرد → أسطورة.
 */

import { memo } from 'react';

import { cn } from '@/lib/utils';

import type { Rank } from '../progression/xp';

interface Metal {
  /** Body gradient stops. */
  stops: [string, string, string];
  /** Bezel (outer rim) gradient. */
  bezel: [string, string];
  /** Sheen band color. */
  sheen: string;
}

const TIERS: Record<string, Metal & { label: string }> = {
  novice: {
    stops: ['#9aa5b1', '#64707d', '#414a54'],
    bezel: ['#c3cbd4', '#7a8590'],
    sheen: 'rgba(255,255,255,.30)',
    label: 'حجر',
  },
  apprentice: {
    stops: ['#c08b52', '#8f6230', '#5e3f1c'],
    bezel: ['#e2b183', '#96662f'],
    sheen: 'rgba(255,220,180,.38)',
    label: 'برونز',
  },
  skilled: {
    stops: '#d9dde2 #aab1ba #7d8590'.split(' ') as unknown as [string, string, string],
    bezel: ['#f2f4f7', '#98a0ab'],
    sheen: 'rgba(255,255,255,.55)',
    label: 'فضة',
  },
  expert: {
    stops: ['#f3cf6d', '#d3a529', '#96731a'],
    bezel: ['#ffe9a8', '#c39420'],
    sheen: 'rgba(255,244,200,.55)',
    label: 'ذهب',
  },
  master: {
    stops: ['#7fc4ec', '#3e8fc4', '#25628c'],
    bezel: ['#bfe4fa', '#3a7fae'],
    sheen: 'rgba(210,240,255,.5)',
    label: 'بلاتين',
  },
  elite: {
    stops: ['#63d8cb', '#2ba192', '#17766a'],
    bezel: ['#a5f2e8', '#279486'],
    sheen: 'rgba(200,255,246,.45)',
    label: 'زمرد',
  },
  legend: {
    stops: ['#c9a6f5', '#9163dd', '#5f3aa8'],
    bezel: ['#e4d2ff', '#8250d6'],
    sheen: 'rgba(235,220,255,.5)',
    label: 'أسطورة',
  },
};

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

interface Props {
  rank: Rank;
  size?: number;
  className?: string;
}

function RankEmblemImpl({ rank, size = 88, className }: Props) {
  const tierId = rank.tier.id in TIERS ? rank.tier.id : 'novice';
  const m = TIERS[tierId];
  const uid = `rank-${tierId}-${rank.division}`;
  const divisions = Math.max(1, rank.tier.divisions);
  const notchW = 44 / divisions - 2.5;

  return (
    <div className={cn('relative inline-flex shrink-0', className)} role="img" aria-label={`الرتبة ${rank.label}`}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor={m.stops[0]} />
            <stop offset="55%" stopColor={m.stops[1]} />
            <stop offset="100%" stopColor={m.stops[2]} />
          </linearGradient>
          <linearGradient id={`${uid}-bezel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={m.bezel[0]} />
            <stop offset="100%" stopColor={m.bezel[1]} />
          </linearGradient>
          {/* Clip for the sheen band so it never escapes the shield */}
          <clipPath id={`${uid}-clip`}>
            <path d="M50 5 L90 19 V52 C90 75 72 89.5 50 96 C28 89.5 10 75 10 52 V19 Z" />
          </clipPath>
        </defs>

        {/* Drop shadow plate */}
        <ellipse cx="50" cy="94" rx="26" ry="4.5" fill="rgba(0,0,0,.28)" />

        {/* Bezel */}
        <path
          d="M50 5 L90 19 V52 C90 75 72 89.5 50 96 C28 89.5 10 75 10 52 V19 Z"
          fill={`url(#${uid}-bezel)`}
        />
        {/* Body */}
        <path
          d="M50 9 L86 21.8 V52 C86 72.5 69.5 86 50 92 C30.5 86 14 72.5 14 52 V21.8 Z"
          fill={`url(#${uid}-body)`}
        />

        {/* Brushed sheen band across the upper face */}
        <g clipPath={`url(#${uid}-clip)`}>
          <path d="M-6 34 L106 12 L106 22 L-6 46 Z" fill={m.sheen} opacity="0.5" />
          <path d="M-6 44 L106 24 L106 27 L-6 49 Z" fill="#fff" opacity="0.12" />

          {/* Inner hairline */}
          <path
            d="M50 13 L82 24.4 V52 C82 70 67.5 82 50 87.5 C32.5 82 18 70 18 52 V24.4 Z"
            fill="none"
            stroke="rgba(255,255,255,.22)"
            strokeWidth="1"
          />
        </g>

        {/* Division notches */}
        {Array.from({ length: divisions }, (_, i) => (
          <rect
            key={i}
            x={28 + i * (44 / divisions)}
            y={15.5}
            width={notchW}
            height={5}
            rx={1.5}
            fill={i < rank.division ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.32)'}
            stroke="rgba(0,0,0,.18)"
            strokeWidth={i < rank.division ? 0 : 0.5}
          />
        ))}

        {/* Engraved numeral */}
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fontSize={divisions > 1 ? 30 : 36}
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
          fill="rgba(255,255,255,.96)"
          stroke="rgba(0,0,0,.28)"
          strokeWidth="0.8"
          style={{ paintOrder: 'stroke' }}
          aria-hidden
        >
          {divisions > 1 ? NUMERALS[rank.division - 1] : ''}
        </text>

        {/* Tiny tier word under the numeral for instant readability */}
        <text
          x="50"
          y="80"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="1"
          fill="rgba(255,255,255,.78)"
          aria-hidden
        >
          {m.label}
        </text>
      </svg>
    </div>
  );
}

export const RankEmblem = memo(RankEmblemImpl);
export default RankEmblem;
