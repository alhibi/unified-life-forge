import type { MindState } from '../hooks/useMindState';
import { MIND_TOKENS } from '../lib/mindTokens';

/**
 * Zero-WebGL fallback. Same two-tone glow logic driven by fullness/vitality,
 * rendered as layered SVG. Also honored when prefers-reduced-motion is set.
 *
 * The hemisphere colours come from the scene token set (MIND_TOKENS); the
 * two intermediate shades below are part of this fallback's own SVG art and
 * stay literal so the fallback reads like the 3-D scene it replaces.
 */
export default function MindFallback2D({ mind }: { mind: MindState }) {
  const { fullness, vitalityOrganic, vitalityMechanical } = mind;
  const coreR = 40 + 100 * fullness;
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: 'hsl(var(--theme-ink))' }}
    >
      <svg viewBox="-160 -160 320 320" className="w-full h-full max-w-[520px] max-h-[520px]">
        <defs>
          <radialGradient id="organic" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MIND_TOKENS.organicGlow} stopOpacity={0.15 + 0.85 * vitalityOrganic} />
            <stop offset="70%" stopColor="#8B5A4A" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#8B5A4A" stopOpacity={0.35} />
          </radialGradient>
          <radialGradient id="mech" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MIND_TOKENS.thread} stopOpacity={0.15 + 0.85 * vitalityMechanical} />
            <stop offset="70%" stopColor="#2A2A2A" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#2A2A2A" stopOpacity={0.5} />
          </radialGradient>
        </defs>
        <g>
          <path d="M 0 -140 A 140 140 0 0 1 0 140 Z" fill="url(#organic)" />
          <path d="M 0 -140 A 140 140 0 0 0 0 140 Z" fill="url(#mech)" />
          <line x1="0" y1="-140" x2="0" y2="140" stroke={MIND_TOKENS.seam} strokeWidth="1.2" opacity="0.7" />
          <circle cx="0" cy="0" r={coreR} fill={MIND_TOKENS.seam} opacity="0.06" />
          <circle cx="0" cy="0" r={coreR * 0.6} fill={MIND_TOKENS.seam} opacity="0.08" />
        </g>
      </svg>
    </div>
  );
}
