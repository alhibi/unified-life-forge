import { sourceInitial, sourceTone } from './utils';

/**
 * Source identity badge — a colored circle with the source's first
 * letter, where a theme-owned material is derived from the source
 * name. Same name → same material across sessions and devices, no extra
 * config required from the user.
 */
export function SourcePill({
  name,
  size = 'md',
}: {
  name: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  const tone = sourceTone(name);
  const ch = sourceInitial(name ?? '');
  const sz = size === 'sm' ? 'w-5 h-5 text-micro'
    : size === 'lg' ? 'w-8 h-8 text-mini'
    : 'w-6 h-6 text-micro';
  return (
    <span
      data-tile-tone={tone}
      className={`${sz} rounded-full inline-flex items-center justify-center font-bold shrink-0 select-none bg-tile-container text-tile-container-foreground`}
      aria-hidden="true"
    >
      {ch}
    </span>
  );
}
