// Guards for the send-path validation shared by text, image, file and voice
// messages: oversized attachments and over-long text must be caught in the
// composer instead of failing halfway through an upload.
import { describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock('../sounds', () => ({ haptic: vi.fn(), playChatSound: vi.fn() }));

import {
  clampText,
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_TEXT_LENGTH,
  MAX_VOICE_BYTES,
  validateFile,
} from '../chatNotify';

function fileOfSize(bytes: number, type: string, name = 'f'): File {
  const f = new File([''], name, { type });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

describe('chat send validation', () => {
  it('accepts attachments within their per-category limit', () => {
    expect(validateFile(fileOfSize(MAX_IMAGE_BYTES - 1, 'image/jpeg'), 'image')).toBe(true);
    expect(validateFile(fileOfSize(MAX_FILE_BYTES - 1, 'application/pdf'), 'file')).toBe(true);
    expect(validateFile(fileOfSize(MAX_VOICE_BYTES - 1, 'audio/webm'), 'voice')).toBe(true);
  });

  it('rejects oversized attachments per category', () => {
    expect(validateFile(fileOfSize(MAX_IMAGE_BYTES + 1, 'image/jpeg'), 'image')).toBe(false);
    expect(validateFile(fileOfSize(MAX_FILE_BYTES + 1, 'application/zip'), 'file')).toBe(false);
    expect(validateFile(fileOfSize(MAX_VOICE_BYTES + 1, 'audio/webm'), 'voice')).toBe(false);
  });

  it('rejects empty files, including silent recordings', () => {
    expect(validateFile(fileOfSize(0, 'image/png'), 'image')).toBe(false);
    expect(validateFile(fileOfSize(0, 'audio/webm'), 'voice')).toBe(false);
  });

  it('clamps text messages to the maximum length', () => {
    expect(clampText('مرحبا')).toEqual({ text: 'مرحبا', clipped: false });
    const long = 'ا'.repeat(MAX_TEXT_LENGTH + 50);
    const res = clampText(long);
    expect(res.clipped).toBe(true);
    expect(res.text).toHaveLength(MAX_TEXT_LENGTH);
  });
});
