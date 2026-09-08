/**
 * One entry point for keyboard tap feedback (haptic + sound).
 *
 * Previously every call site fired `haptics('selection')` directly, so the
 * user's `hapticIntensity` preference was stored but never honoured, and a held
 * backspace fired a vibration per repeat — which on Android turns into a
 * continuous buzz and measurable battery drain. Both channels now run through
 * this module, mapped to preferences and rate-limited.
 */

import { haptics, type HapticKind } from '@/lib/native';

import type { HapticIntensity, SoundTone } from './preference';
import { playKeyClickSound, type KeySoundType } from './sound';

/** Feedback weight per interaction kind, before the user's intensity scaling. */
export type FeedbackKind = 'letter' | 'modifier' | 'accent' | 'space' | 'repeat';

const INTENSITY_MAP: Record<Exclude<HapticIntensity, 'off'>, Record<FeedbackKind, HapticKind>> = {
  light: {
    letter: 'selection',
    modifier: 'selection',
    accent: 'light',
    space: 'selection',
    repeat: 'selection',
  },
  medium: {
    letter: 'light',
    modifier: 'light',
    accent: 'medium',
    space: 'light',
    repeat: 'selection',
  },
  heavy: {
    letter: 'medium',
    modifier: 'medium',
    accent: 'heavy',
    space: 'medium',
    repeat: 'light',
  },
};

const SOUND_TYPE: Record<FeedbackKind, KeySoundType> = {
  letter: 'letter',
  modifier: 'modifier',
  accent: 'accent',
  space: 'space',
  repeat: 'modifier',
};

/** Minimum gap between haptics, so fast repeats never merge into a buzz. */
const HAPTIC_MIN_INTERVAL_MS = 32;
const REPEAT_MIN_INTERVAL_MS = 90;

let lastHapticAt = 0;

export interface TapFeedbackOptions {
  enabled: boolean;
  intensity: HapticIntensity;
  soundEnabled: boolean;
  soundVolume: number;
  soundTone: SoundTone;
}

/** Fire the feedback for one key interaction. Safe to call on every keystroke. */
export function tapFeedback(kind: FeedbackKind, options: TapFeedbackOptions) {
  const { enabled, intensity, soundEnabled, soundVolume, soundTone } = options;

  if (enabled && intensity !== 'off') {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const gap = kind === 'repeat' ? REPEAT_MIN_INTERVAL_MS : HAPTIC_MIN_INTERVAL_MS;
    if (now - lastHapticAt >= gap) {
      lastHapticAt = now;
      haptics(INTENSITY_MAP[intensity][kind]);
    }
  }

  if (soundEnabled && soundVolume > 0) {
    playKeyClickSound(SOUND_TYPE[kind], soundVolume, soundTone);
  }
}

/** Test seam: forget the throttle window. */
export function resetFeedbackThrottle() {
  lastHapticAt = 0;
}
