// ─────────────────────────────────────────────────────────────────────────────
// Voice recording lifecycle specs.
//
// The regression these lock down: the mic button is unmounted the moment
// recording starts (the composer swaps to the recording bar), and starting a
// recording is asynchronous. Releasing the button before the recorder existed
// used to leave the microphone running with no way to stop or send.
// ─────────────────────────────────────────────────────────────────────────────
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

type UploadResult = { error: { message: string } | null };
const uploadMock = vi.fn(async (): Promise<UploadResult> => ({ error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ upload: uploadMock }) } },
}));

vi.mock('@/contexts/VoicePlayerContext', () => ({
  useVoicePlayer: () => ({ state: { isPlaying: false }, stop: vi.fn() }),
}));

vi.mock('@/lib/chat/micAnalyser', () => ({
  ANALYSER_BAR_COUNT: 24,
  startMicAnalyser: () => ({ stop: vi.fn() }),
}));

vi.mock('../sounds', () => ({ haptic: vi.fn(), playChatSound: vi.fn() }));

const chatErrorMock = vi.fn();
vi.mock('../chatNotify', () => ({
  chatError: (...args: unknown[]) => chatErrorMock(...args),
  reportMicError: (...args: unknown[]) => chatErrorMock(...args),
  validateFile: () => true,
  MAX_VOICE_SECONDS: 600,
}));

import { useVoiceRecording } from '../useVoiceRecording';

// ── Minimal MediaRecorder / getUserMedia doubles ────────────────────────────
interface Recorder {
  state: string;
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
  start: (slice?: number) => void;
  stop: () => void;
}

let lastRecorder: Recorder | null = null;
let stoppedTracks = 0;
let resolveStream: (() => void) | null = null;

class FakeMediaRecorder implements Recorder {
  state = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { lastRecorder = this; }
  start() {
    this.state = 'recording';
    // Emit a realistic chunk so the produced blob is not an empty stub.
    this.ondataavailable?.({ data: new Blob([new Uint8Array(4096)]) });
  }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
  static isTypeSupported() { return true; }
}

function installMediaMocks(opts: { deferStream?: boolean } = {}) {
  (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeMediaRecorder;
  const stream = { getTracks: () => [{ stop: () => { stoppedTracks++; } }] };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: () =>
        opts.deferStream
          ? new Promise((res) => { resolveStream = () => res(stream); })
          : Promise.resolve(stream),
    },
  });
}

function setup() {
  const sendMessage = vi.fn(async (_type: string, _url?: string, _name?: string) => {});
  const hook = renderHook(() =>
    useVoiceRecording({ activeConvId: 'conv-1', userId: 'user-1', sendMessage }),
  );
  return { hook, sendMessage };
}

describe('useVoiceRecording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastRecorder = null;
    stoppedTracks = 0;
    resolveStream = null;
    uploadMock.mockImplementation(async () => ({ error: null }));
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
    globalThis.URL.revokeObjectURL = vi.fn();
    installMediaMocks();
  });

  afterEach(() => { vi.useRealTimers(); });

  it('records, stops and uploads a voice message', async () => {
    const { hook, sendMessage } = setup();
    await act(async () => { await hook.result.current.startRecording(); });
    expect(hook.result.current.isRecording).toBe(true);

    await act(async () => { hook.result.current.stopAndSend(); });
    await waitFor(() => expect(sendMessage).toHaveBeenCalled());

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toBe('voice');
    expect(hook.result.current.isRecording).toBe(false);
    expect(stoppedTracks).toBeGreaterThan(0);
  });

  it('cancelling never uploads and always releases the microphone', async () => {
    const { hook, sendMessage } = setup();
    await act(async () => { await hook.result.current.startRecording(); });
    await act(async () => { hook.result.current.stopAndCancel(); });

    expect(uploadMock).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(hook.result.current.isRecording).toBe(false);
    expect(stoppedTracks).toBeGreaterThan(0);
  });

  it('a release that happens before the recorder exists still stops it', async () => {
    vi.useFakeTimers();
    installMediaMocks({ deferStream: true });
    const { hook, sendMessage } = setup();

    // Start (permission still pending) then release immediately.
    let startPromise!: Promise<void>;
    act(() => { startPromise = hook.result.current.startRecording(); });
    act(() => { hook.result.current.stopAndSend(); });

    await act(async () => {
      resolveStream?.();
      await startPromise;
    });
    // Recorder came up; the deferred release is applied shortly after.
    expect(lastRecorder?.state).toBe('recording');
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(lastRecorder?.state).toBe('inactive');
    expect(hook.result.current.isRecording).toBe(false);
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalled());
    vi.useRealTimers();
  });

  it('keeps the recording as a preview when the upload fails', async () => {
    uploadMock.mockImplementation(async () => ({ error: { message: 'boom' } }));
    const { hook, sendMessage } = setup();
    await act(async () => { await hook.result.current.startRecording(); });
    await act(async () => { hook.result.current.stopAndSend(); });

    await waitFor(() => expect(hook.result.current.previewBlob).not.toBeNull());
    expect(sendMessage).not.toHaveBeenCalled();

    // Retrying from the preview succeeds and clears it.
    uploadMock.mockImplementation(async () => ({ error: null }));
    await act(async () => { await hook.result.current.sendPreview(); });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(hook.result.current.previewBlob).toBeNull();
  });

  it('a double start does not open two recorders', async () => {
    installMediaMocks({ deferStream: true });
    const { hook } = setup();
    let a!: Promise<void>; let b!: Promise<void>;
    act(() => { a = hook.result.current.startRecording(); b = hook.result.current.startRecording(); });
    await act(async () => { resolveStream?.(); await Promise.all([a, b]); });
    expect(hook.result.current.isRecording).toBe(true);
    await act(async () => { hook.result.current.stopAndCancel(); });
    expect(hook.result.current.isRecording).toBe(false);
  });
});
