// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { isSensitiveField } from '../lib/edit';

describe('Soft Keyboard Sensitive Input Detection', () => {
  it('identifies password inputs as sensitive', () => {
    const input = document.createElement('input');
    input.type = 'password';
    expect(isSensitiveField(input)).toBe(true);
  });

  it('identifies data-sensitive="true" inputs as sensitive', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.sensitive = 'true';
    expect(isSensitiveField(input)).toBe(true);
  });

  it('identifies autocomplete="current-password" or "one-time-code" as sensitive', () => {
    const inputPass = document.createElement('input');
    inputPass.setAttribute('autocomplete', 'current-password');
    expect(isSensitiveField(inputPass)).toBe(true);

    const inputOtp = document.createElement('input');
    inputOtp.setAttribute('autocomplete', 'one-time-code');
    expect(isSensitiveField(inputOtp)).toBe(true);
  });

  it('identifies inputs wrapped in sensitive container', () => {
    const wrapper = document.createElement('div');
    wrapper.dataset.sensitive = 'true';
    const input = document.createElement('input');
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);

    expect(isSensitiveField(input)).toBe(true);

    document.body.removeChild(wrapper);
  });

  it('returns false for standard text fields', () => {
    const input = document.createElement('input');
    input.type = 'text';
    expect(isSensitiveField(input)).toBe(false);
  });
});
