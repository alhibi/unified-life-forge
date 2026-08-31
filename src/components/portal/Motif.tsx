/**
 * Motif components for portal app tiles.
 * Each motif is a simple SVG line drawing representing the app's identity.
 */

import { memo } from 'react';

export type MotifKey =
  | 'dawn'
  | 'mushaf'
  | 'beads'
  | 'arch'
  | 'meter'
  | 'pulse'
  | 'orbit'
  | 'columns'
  | 'waveform'
  | 'glyph'
  | 'contour'
  | 'bubbles'
  | 'board'
  | 'ticker';

const SVG = 'absolute inset-0 w-full h-full';
const EASE = 'transition-all duration-normal ease-enter motion-reduce:transition-none';

export const Motif = memo(function Motif({ motif }: { motif: MotifKey }) {
  switch (motif) {
    case 'dawn':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} origin-bottom group-hover:scale-y-110`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <circle cx="100" cy="104" r="26" />
            <circle cx="100" cy="104" r="44" opacity="0.6" />
            <circle cx="100" cy="104" r="64" opacity="0.35" />
            <line x1="0" y1="104" x2="200" y2="104" />
          </g>
        </svg>
      );
    case 'mushaf':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:translate-y-[-3px]`}
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          >
            {[24, 40, 56, 72, 88, 104].map((y) => (
              <line key={y} x1="18" y1={y} x2="182" y2={y} />
            ))}
            <rect x="10" y="12" width="180" height="104" opacity="0.7" />
          </g>
        </svg>
      );
    case 'beads':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:rotate-[6deg] origin-center`} fill="currentColor">
            {Array.from({ length: 11 }, (_, i) => (
              <circle key={i} cx={20 + i * 16} cy={60 + Math.sin(i / 1.6) * 22} r="4" />
            ))}
          </g>
        </svg>
      );
    case 'arch':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} origin-bottom group-hover:scale-105`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M18 90 Q90 18 182 90" />
            <path d="M36 90 Q90 36 164 90" opacity="0.7" />
          </g>
        </svg>
      );
    case 'meter':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:rotate-[-3deg] origin-center`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 60 C60 10 140 110 180 60" />
            <circle cx="100" cy="60" r="32" opacity="0.3" />
          </g>
        </svg>
      );
    case 'pulse':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:scale-x-110 origin-center`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M${15 + i * 22} 90 Q${26 + i * 22} 30 ${37 + i * 22} 90`} />
            ))}
          </g>
        </svg>
      );
    case 'orbit':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:rotate-[15deg] origin-center`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="100" cy="60" r="44" />
            <circle cx="100" cy="60" r="24" opacity="0.5" />
            <circle cx="136" cy="26" r="6" fill="currentColor" />
          </g>
        </svg>
      );
    case 'columns':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:translate-y-[-4px] origin-bottom`} fill="currentColor">
            {Array.from({ length: 10 }, (_, i) => (
              <rect
                key={i}
                x={20 + i * 16}
                y={40 + (i % 2) * 20}
                width="10"
                height={60 - (i % 2) * 20}
                rx="2"
              />
            ))}
          </g>
        </svg>
      );
    case 'waveform':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:translate-y-[-2px]`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 60 Q50 10 90 60 T170 60" />
          </g>
        </svg>
      );
    case 'glyph':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:rotate-[12deg] origin-center`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <text x="100" y="72" textAnchor="middle" fontSize="72" fontFamily="serif">
              ع
            </text>
          </g>
        </svg>
      );
    case 'contour':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:scale-108 origin-center`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            {[60, 74, 88, 102].map((y) => (
              <path key={y} d={`M10 ${y} Q50 ${y - 20} 90 ${y} Q130 ${y + 20} 170 ${y}`} />
            ))}
          </g>
        </svg>
      );
    case 'bubbles':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:scale-115 origin-center`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {Array.from({ length: 7 }, (_, i) => (
              <circle
                key={i}
                cx={30 + i * 24}
                cy={60 + Math.sin(i) * 18}
                r={8 + (i % 3) * 6}
                opacity={0.4 + (i % 2) * 0.3}
              />
            ))}
          </g>
        </svg>
      );
    case 'board':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:rotate-[4deg] origin-center`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {Array.from({ length: 4 }, (_, y) =>
              Array.from({ length: 4 }, (_, x) => (
                <rect
                  key={`${x}-${y}`}
                  x={50 + x * 22}
                  y={20 + y * 22}
                  width="18"
                  height="18"
                  rx="2"
                />
              )),
            )}
          </g>
        </svg>
      );
    case 'ticker':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:translate-x-3`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M0 94 l34 -22 l26 16 l30 -38 l34 22 l30 -34 l46 -12" />
          </g>
        </svg>
      );
    default:
      return null;
  }
});
