import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../button';

describe('button activation', () => {
  it('keeps long-press affordances closed until a release click', () => {
    const open = vi.fn();
    render(<Button activation="click" onClick={open}>فتح</Button>);
    const button = screen.getByRole('button', { name: 'فتح' });
    fireEvent.pointerDown(button, { button: 0 });
    expect(open).toHaveBeenCalledTimes(0);
    fireEvent.click(button);
    expect(open).toHaveBeenCalledTimes(1);
  });
});