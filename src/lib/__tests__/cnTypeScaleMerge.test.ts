import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

/**
 * Regression guard for a silent, app-wide contrast failure.
 *
 * `index.css` defines its own type scale with `@utility`:
 *   text-micro / text-mini / text-meta / text-body / text-lead / text-title /
 *   text-display / text-hero  →  font-size + line-height only.
 *
 * stock `tailwind-merge` does not know those names, so it buckets every
 * unrecognised `text-*` as a COLOUR. With last-one-wins inside the `text-`
 * group, this call:
 *
 *   cn('bg-primary text-primary-foreground', 'text-meta font-semibold')
 *
 * lost `text-primary-foreground` — the size class displaced the colour. The
 * element then inherited the ambient foreground, and on `bg-primary` (a pale
 * accent) that measured 1.49:1 instead of the 12.61:1 the token pair was
 * generated for. 191 className strings across 84 files were affected,
 * including primary and destructive buttons.
 */
describe('cn keeps the colour when a custom type-scale utility follows it', () => {
  it('colour survives a trailing type utility', () => {
    expect(cn('bg-primary text-primary-foreground text-meta font-semibold')).toContain(
      'text-primary-foreground',
    );
  });

  it('colour and size both survive regardless of order', () => {
    const forward = cn('text-meta bg-primary text-primary-foreground');
    expect(forward).toContain('text-meta');
    expect(forward).toContain('text-primary-foreground');
  });

  it('handles the destructive button pair', () => {
    const r = cn('bg-destructive text-destructive-foreground text-meta font-medium');
    expect(r).toContain('text-destructive-foreground');
    expect(r).toContain('text-meta');
  });

  it('a lone type utility is untouched', () => {
    expect(cn('text-micro font-semibold')).toBe('text-micro font-semibold');
  });
});

describe('cn still de-duplicates genuinely conflicting utilities', () => {
  it('last colour wins', () => {
    expect(cn('text-foreground text-destructive')).toBe('text-destructive');
  });

  it('last size wins', () => {
    expect(cn('text-body text-title')).toBe('text-title');
  });

  it('last size still beats a previous size even with a colour between them', () => {
    expect(cn('text-body text-primary text-title')).toBe('text-primary text-title');
  });
});
