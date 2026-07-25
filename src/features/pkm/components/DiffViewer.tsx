import { useMemo } from 'react';

import { cn } from '@/lib/utils';

import { wordDiff } from '../lib/diff';

/**
 * Renders a word-level diff between the original note body and an
 * optimizer output. Additions/removals are inline highlighted so users
 * can see exactly what changes before hitting Accept.
 */
export default function DiffViewer({
  original,
  optimized,
}: {
  original: string;
  optimized: string;
}) {
  const segments = useMemo(() => wordDiff(original, optimized), [original, optimized]);
  return (
    <div
      className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono"
      dir="auto"
    >
      {segments.map((s, i) => (
        <span
          key={i}
          className={cn(
            s.type === 'added' && 'bg-emerald-500/15 text-emerald-500 rounded px-0.5',
            s.type === 'removed' && 'bg-destructive/15 text-destructive line-through rounded px-0.5',
          )}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
}