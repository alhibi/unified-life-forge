import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn (className combinator)', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('flattens nested arrays', () => {
    expect(cn(['a', ['b', ['c']]])).toBe('a b c');
  });

  it('honours conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('lets later Tailwind classes override earlier ones in the same group', () => {
    // tailwind-merge resolves class collisions: the latter padding wins.
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('preserves unrelated Tailwind utilities', () => {
    // Different utility groups must NOT collapse into each other.
    const result = cn('px-2', 'py-1', 'text-sm', 'font-medium');
    expect(result.split(' ').sort()).toEqual(['font-medium', 'px-2', 'py-1', 'text-sm']);
  });

  it('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });
});
