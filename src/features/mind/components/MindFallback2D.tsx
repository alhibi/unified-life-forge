import type { MindState } from '../hooks/useMindState';

/**
 * Zero-WebGL fallback. Same two-tone glow logic driven by fullness/vitality,
 * rendered as layered SVG. Also honored when prefers-reduced-motion is set.
 */
export default function MindFallback2D({ mind }: { mind: MindState }) {
  const { fullness, vitalityOrganic, vitalityMechanical } = mind;
  const coreR = 40 + 100 * fullness;
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
      <svg viewBox="-160 -160 320 320" className="w-full h-full max-w-[520px] max-h-[520px]">
        <defs>
          <radialGradient id="organic" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFC9A0" stopOpacity={0.15 + 0.85 * vitalityOrganic} />
            <stop offset="70%"  stopColor="#8B5A4A" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#8B5A4A" stopOpacity={0.35} />
          </radialGradient>
          <radialGradient id="mech" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#C9A84C" stopOpacity={0.15 + 0.85 * vitalityMechanical} />
            <stop offset="70%"  stopColor="#2A2A2A" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#2A2A2A" stopOpacity={0.5} />
          </radialGradient>
        </defs>
        <g>
          <path d="M 0 -140 A 140 140 0 0 1 0 140 Z" fill="url(#organic)" />
          <path d="M 0 -140 A 140 140 0 0 0 0 140 Z" fill="url(#mech)" />
          <line x1="0" y1="-140" x2="0" y2="140" stroke="#F2E7C9" strokeWidth="1.2" opacity="0.7" />
          <circle cx="0" cy="0" r={coreR} fill="#F2E7C9" opacity="0.06" />
          <circle cx="0" cy="0" r={coreR * 0.6} fill="#F2E7C9" opacity="0.08" />
        </g>
      </svg>
    </div>
  );
}