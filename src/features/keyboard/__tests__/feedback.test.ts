import { beforeEach, describe, expect, it, vi } from 'vitest';

const haptics = vi.fn();
vi.mock('@/lib/native', () => ({ haptics: (...args: unknown[]) => haptics(...args) }));
const playKeyClickSound = vi.fn();
vi.mock('../lib/sound', () => ({
  playKeyClickSound: (...args: unknown[]) => playKeyClickSound(...args),
}));

import { resetFeedbackThrottle, tapFeedback } from '../lib/feedback';

const base = {
  enabled: true,
  intensity: 'light' as const,
  soundEnabled: false,
  soundVolume: 0.5,
  soundTone: 'default' as const,
};

describe('keyboard tap feedback', () => {
  beforeEach(() => {
    haptics.mockClear();
    playKeyClickSound.mockClear();
    resetFeedbackThrottle();
  });

  it('honours the haptic intensity preference instead of a fixed weight', () => {
    tapFeedback('letter', base);
    expect(haptics).toHaveBeenCalledWith('selection');

    resetFeedbackThrottle();
    tapFeedback('letter', { ...base, intensity: 'heavy' });
    expect(haptics).toHaveBeenLastCalledWith('medium');
  });

  it('stays silent when haptics are off or disabled', () => {
    tapFeedback('letter', { ...base, intensity: 'off' });
    tapFeedback('letter', { ...base, enabled: false });
    expect(haptics).not.toHaveBeenCalled();
  });

  it('rate-limits repeats so a held key never buzzes continuously', () => {
    tapFeedback('repeat', base);
    tapFeedback('repeat', base);
    tapFeedback('repeat', base);
    expect(haptics).toHaveBeenCalledTimes(1);
  });

  it('passes the chosen tone and volume through to the synthesizer', () => {
    tapFeedback('space', { ...base, soundEnabled: true, soundTone: 'mechanical', soundVolume: 0.8 });
    expect(playKeyClickSound).toHaveBeenCalledWith('space', 0.8, 'mechanical');
  });
});
