import { hashHue, sourceInitial } from './utils';

/**
 * Source identity badge — a colored circle with the source's first
 * letter, where the hue is deterministically derived from the source
 * name. Same name → same color across sessions and devices, no extra
 * config required from the user.
 */
export function SourcePill({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const hue = hashHue(name);
  const ch = sourceInitial(name);
  const sz = size === 'sm' ? 'w-5 h-5 text-micro'
    : size === 'lg' ? 'w-8 h-8 text-mini'
    : 'w-6 h-6 text-micro';
  return (
    <span
      className={`${sz} rounded-full inline-flex items-center justify-center font-bold shrink-0 select-none`}
      style={{
        background: `hsl(${hue} 60% 92% / 0.55)`,
        color: `hsl(${hue} 70% 30%)`,
        border: `1px solid hsl(${hue} 60% 80% / 0.5)`,
      }}
      aria-hidden="true"
    >
      {ch}
    </span>
  );
}
