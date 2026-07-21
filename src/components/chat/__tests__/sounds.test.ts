import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

// We define our mock classes for AudioContext and parameters
class MockAudioParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = vi.fn();
}

class MockOscillatorNode {
  type = 'sine';
  frequency = new MockAudioParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  currentTime = 10;
  state: 'suspended' | 'running' = 'suspended';
  destination = { mockDestination: true };
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  resume = vi.fn().mockImplementation(async () => {
    this.state = 'running';
  });
}

describe('Chat Sounds Feature - Full Suite', () => {
  let originalAudioContext: any;
  let originalWebkitAudioContext: any;
  let originalVibrate: any;
  let mockContextInstance: MockAudioContext | null = null;

  beforeEach(() => {
    // Reset module states to prevent test cross-talk
    vi.resetModules();

    // Preserve original window values
    if (typeof window !== 'undefined') {
      originalAudioContext = (window as any).AudioContext;
      originalWebkitAudioContext = (window as any).webkitAudioContext;

      // Setup default mock AudioContext
      mockContextInstance = new MockAudioContext();
      (window as any).AudioContext = vi.fn().mockImplementation(() => mockContextInstance);
      (window as any).webkitAudioContext = undefined;
    }

    if (typeof navigator !== 'undefined') {
      originalVibrate = navigator.vibrate;
      (navigator as any).vibrate = vi.fn();
    }
  });

  afterEach(() => {
    // Restore original window values
    if (typeof window !== 'undefined') {
      (window as any).AudioContext = originalAudioContext;
      (window as any).webkitAudioContext = originalWebkitAudioContext;
    }
    if (typeof navigator !== 'undefined' && originalVibrate !== undefined) {
      (navigator as any).vibrate = originalVibrate;
    }
    vi.restoreAllMocks();
  });

  it('correctly handles getters and setters for the muted state', async () => {
    const { getChatSoundsMuted, setChatSoundsMuted } = await import('../sounds');

    // Initial state should be false (unmuted)
    expect(getChatSoundsMuted()).toBe(false);

    // Mute sounds
    setChatSoundsMuted(true);
    expect(getChatSoundsMuted()).toBe(true);

    // Unmute sounds
    setChatSoundsMuted(false);
    expect(getChatSoundsMuted()).toBe(false);
  });

  it('resumes a suspended AudioContext when calling primeAudio', async () => {
    const { primeAudio } = await import('../sounds');

    // Set initial mock state to suspended
    mockContextInstance!.state = 'suspended';

    primeAudio();

    // Verify resume was called
    expect(mockContextInstance!.resume).toHaveBeenCalled();
  });

  it('does not call resume on primeAudio if AudioContext is already running', async () => {
    const { primeAudio } = await import('../sounds');

    // Set mock state to running
    mockContextInstance!.state = 'running';

    primeAudio();

    // Verify resume was not called
    expect(mockContextInstance!.resume).not.toHaveBeenCalled();
  });

  it('does not play any sounds if setChatSoundsMuted is true', async () => {
    const { playChatSound, setChatSoundsMuted } = await import('../sounds');

    setChatSoundsMuted(true);
    playChatSound('send');

    // Verify that AudioContext creation or osc/gain node creation wasn't triggered
    expect(mockContextInstance!.createOscillator).not.toHaveBeenCalled();
    expect(mockContextInstance!.createGain).not.toHaveBeenCalled();
  });

  it('plays the "send" sound correctly when unmuted', async () => {
    const { playChatSound, setChatSoundsMuted } = await import('../sounds');

    setChatSoundsMuted(false);
    playChatSound('send');

    // "send" plays two tones (calls blip twice)
    expect(mockContextInstance!.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockContextInstance!.createGain).toHaveBeenCalledTimes(2);

    // Grab the first oscillator/gain pair
    const osc1 = vi.mocked(mockContextInstance!.createOscillator).mock.results[0].value as MockOscillatorNode;
    const osc2 = vi.mocked(mockContextInstance!.createOscillator).mock.results[1].value as MockOscillatorNode;

    expect(osc1.type).toBe('sine');
    expect(osc1.frequency.setValueAtTime).toHaveBeenCalledWith(880, mockContextInstance!.currentTime);

    expect(osc2.type).toBe('sine');
    expect(osc2.frequency.setValueAtTime).toHaveBeenCalledWith(1320, mockContextInstance!.currentTime + 0.04);
  });

  it('plays the "receive" sound correctly when unmuted', async () => {
    const { playChatSound, setChatSoundsMuted } = await import('../sounds');

    setChatSoundsMuted(false);
    playChatSound('receive');

    // "receive" plays two tones (calls blip twice)
    expect(mockContextInstance!.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockContextInstance!.createGain).toHaveBeenCalledTimes(2);

    const osc1 = vi.mocked(mockContextInstance!.createOscillator).mock.results[0].value as MockOscillatorNode;
    const osc2 = vi.mocked(mockContextInstance!.createOscillator).mock.results[1].value as MockOscillatorNode;

    expect(osc1.type).toBe('sine');
    expect(osc1.frequency.setValueAtTime).toHaveBeenCalledWith(1200, mockContextInstance!.currentTime);

    expect(osc2.type).toBe('sine');
    expect(osc2.frequency.setValueAtTime).toHaveBeenCalledWith(760, mockContextInstance!.currentTime + 0.04);
  });

  it('plays the "error" sound correctly when unmuted', async () => {
    const { playChatSound, setChatSoundsMuted } = await import('../sounds');

    setChatSoundsMuted(false);
    playChatSound('error');

    // "error" plays two tones (calls blip twice)
    expect(mockContextInstance!.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockContextInstance!.createGain).toHaveBeenCalledTimes(2);

    const osc1 = vi.mocked(mockContextInstance!.createOscillator).mock.results[0].value as MockOscillatorNode;
    const osc2 = vi.mocked(mockContextInstance!.createOscillator).mock.results[1].value as MockOscillatorNode;

    expect(osc1.type).toBe('triangle');
    expect(osc1.frequency.setValueAtTime).toHaveBeenCalledWith(220, mockContextInstance!.currentTime);

    expect(osc2.type).toBe('triangle');
    expect(osc2.frequency.setValueAtTime).toHaveBeenCalledWith(180, mockContextInstance!.currentTime + 0.05);
  });

  it('plays the "tap" sound correctly when unmuted', async () => {
    const { playChatSound, setChatSoundsMuted } = await import('../sounds');

    setChatSoundsMuted(false);
    playChatSound('tap');

    // "tap" plays one tone (calls blip once)
    expect(mockContextInstance!.createOscillator).toHaveBeenCalledTimes(1);
    expect(mockContextInstance!.createGain).toHaveBeenCalledTimes(1);

    const osc = vi.mocked(mockContextInstance!.createOscillator).mock.results[0].value as MockOscillatorNode;

    expect(osc.type).toBe('square');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(1400, mockContextInstance!.currentTime);
  });

  it('triggers light haptic correctly by default and for explicit light', async () => {
    const { haptic } = await import('../sounds');

    haptic();
    expect(navigator.vibrate).toHaveBeenLastCalledWith(6);

    haptic('light');
    expect(navigator.vibrate).toHaveBeenLastCalledWith(6);
  });

  it('triggers medium and heavy haptic correctly', async () => {
    const { haptic } = await import('../sounds');

    haptic('medium');
    expect(navigator.vibrate).toHaveBeenLastCalledWith(15);

    haptic('heavy');
    expect(navigator.vibrate).toHaveBeenLastCalledWith(30);
  });

  it('safely handles missing navigator or missing vibrate API', async () => {
    const { haptic } = await import('../sounds');

    // Temporarily delete navigator.vibrate
    (navigator as any).vibrate = undefined;

    expect(() => haptic()).not.toThrow();
  });

  it('safely handles navigator.vibrate when it throws an error', async () => {
    const { haptic } = await import('../sounds');

    // Make vibrate throw
    (navigator as any).vibrate = vi.fn().mockImplementation(() => {
      throw new Error('Not allowed');
    });

    expect(() => haptic('medium')).not.toThrow();
  });
});
