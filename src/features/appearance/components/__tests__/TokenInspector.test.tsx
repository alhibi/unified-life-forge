import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TokenInspector } from '../AppearancePrimitives';

/**
 * Contract for the moved token inspector (gallery §9). It is still the surface
 * that proves a settings choice reached the real computed tokens, but it now
 * lives on a development-only route, so its rendering is pinned here instead of
 * through a production-build e2e.
 */
describe('TokenInspector', () => {
  it('renders each entry as a label + token name + literal value pair', () => {
    render(
      <TokenInspector
        entries={[
          { token: '--ui-pad-card', label: 'حشوة البطاقة', value: '18px' },
          { token: '--ui-stack-gap', label: 'فجوة المكدّس', value: '24px' },
        ]}
      />,
    );

    for (const entry of [
      { token: '--ui-pad-card', value: '18px' },
      { token: '--ui-stack-gap', value: '24px' },
    ]) {
      const term = screen.getByText(entry.token).closest('dt');
      expect(term).not.toBeNull();
      expect(term?.nextElementSibling?.tagName).toBe('DD');
      expect(term?.nextElementSibling?.textContent).toBe(entry.value);
    }
  });
});
