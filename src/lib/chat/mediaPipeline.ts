// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────
// Media pipeline orchestrator.
//
// What it solves
// ──────────────
// The chat composer can stage up to 10 images at once. Without coordination,
// each image kicks off its own Web Worker for compression + a second worker
// for the thumbnail variant. On a mid-range mobile phone that means up to
// 20 simultaneous workers, each holding a multi-megabyte ImageBitmap. We
// have crash reports that match this profile (chat tab crashes seconds
// after picking 6+ photos from the gallery, no traceback).
//
// This module funnels every compression call through a single FIFO with
// configurable concurrency. Two parallel workers max — enough to hide the
// latency of the next file while compressing the current one, but bounded
// so the JS heap and IndexedDB image cache stay healthy.
//
// It also:
//   • Detects HEIC inputs and routes them through `convertHeicToJpeg`
//     before they reach `browser-image-compression`. That eliminates the
//     "send a photo from my iPhone in Chrome → app freezes" class of bug.
//   • Dataurl-encodes the thumbnail so it can survive a JSON cache hop
//     (sessionStorage / IndexedDB) without a Blob lifetime worry.
//   • Returns a single `PreparedAsset` shape the upload context can keep
//     verbatim, so dimensions / dominant color / LQIP propagate end to
//     end and bubbles can render with a stable layout from the moment
//     the user hits Send.
// ─────────────────────────────────────────────────────────────────────────────

import { compressForChat, type CompressedImage } from './imageCompression';
import { looksLikeHeic, convertHeicToJpeg } from './heic';

/** Max parallel compression jobs. 2 is a good balance for mobile.
 *  – On a single-core phone, two queued jobs hide network latency without
 *    starving the UI thread of paint cycles.
 *  – On desktop, going higher is wasteful: the worker doesn't get faster,
 *    we just spend memory holding multiple decoded bitmaps in flight. */
const MAX_CONCURRENCY = 2;

/** Dimension threshold above which we ALWAYS resize, even if the file is
 *  small. A 6 MP screenshot at 200 KB still wastes 6 MP of texture memory
 *  on the recipient's device for no visible quality. */
const FORCE_RESIZE_DIMENSION_PX = 2400;

/** Final asset ready to be uploaded by the chat layer. Every field except
 *  `file` is best-effort: callers must tolerate missing metadata. */
export interface PreparedAsset {
  /** Bytes to upload. Always a real File so storage providers see a name. */
  file: File;
  /** Original byte size, before any compression / conversion. */
  originalBytes: number;
  /** Original file's MIME type (the one the user picked, before conversion). */
  originalType: string;
  /** Natural width of `file` in pixels, 0 when unknown. */
  width: number;
  /** Natural height of `file` in pixels, 0 when unknown. */
  height: number;
  /**
   * Inline data URL for the low-quality preview thumbnail. Embedded so the
   * recipient bubble can paint the LQIP without a network round-trip.
   * NULL when the source was already small enough to be its own thumbnail.
   */
  thumbnailDataUrl: string | null;
  /** Sampled dominant color as `#rrggbb` for placeholder backgrounds. */
  dominantColor: string;
  /** Whether HEIC → JPEG conversion happened. UI can surface a "converted" hint. */
  didConvertHeic: boolean;
  /** Whether full-size compression actually shrank the file. */
  didCompress: boolean;
}

/** Convert a Blob/File to a base64 data URL. Used to inline thumbnails. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('thumb-encode-failed'));
    reader.readAsDataURL(blob);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIFO queue with bounded concurrency.
// Pure JS implementation — no external dep, no event emitter, no leaks.
// ─────────────────────────────────────────────────────────────────────────────
class ConcurrencyQueue {
  private active = 0;
  private waiting: Array<() => void> = [];
  constructor(private readonly limit: number) {}

  /** Acquires a slot. Returns a release function the caller MUST invoke,
   *  even on error, or the queue will deadlock. Use try/finally. */
  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const grant = () => {
        this.active++;
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          this.active--;
          const next = this.waiting.shift();
          if (next) next();
        };
        resolve(release);
      };
      if (this.active < this.limit) grant();
      else this.waiting.push(grant);
    });
  }
}

const queue = new ConcurrencyQueue(MAX_CONCURRENCY);

/**
 * Prepare a single user-picked image for upload. Always resolves —
 * pipeline failures fall back to the original file with `didCompress=false`.
 *
 * The two failure paths we *do* surface as rejections:
 *   • HEIC input the runtime can't decode. We can't silently fall back to
 *     uploading the .heic blob because the recipient's browser will
 *     refuse to render it; better to tell the user up front so they can
 *     re-export from Photos.
 */
export async function prepareImageForChat(input: File): Promise<PreparedAsset> {
  const originalBytes = input.size;
  const originalType = input.type;

  // ── HEIC pre-conversion ──────────────────────────────────────────────────
  // Has to run BEFORE compression. browser-image-compression spawns a
  // worker and calls drawImage(), which silently corrupts on Chrome HEIC
  // input. We intercept and convert via a canvas re-encode (Safari) or
  // raise a typed error so the UI can show a friendly toast (others).
  let working: File = input;
  let didConvertHeic = false;
  if (looksLikeHeic(input)) {
    try {
      working = await convertHeicToJpeg(input);
      didConvertHeic = true;
    } catch (err) {
      // Re-throw with a stable error tag so the caller can localize it
      // without parsing message strings.
      const tag = (err as Error)?.message === 'heic-decode-unsupported'
        ? 'heic-unsupported'
        : 'heic-failed';
      const e = new Error(tag);
      (e as Error & { tag: string }).tag = tag;
      throw e;
    }
  }

  // ── Quick-skip for already-small images ──────────────────────────────────
  // Don't bother spinning a worker for a 50 KB sticker. Still measure
  // dimensions so the bubble can reserve aspect ratio.
  // Force-resize if the image exceeds FORCE_RESIZE_DIMENSION_PX even if it
  // is small in bytes (downscaling huge but well-compressed images saves
  // GPU memory on the recipient).
  let needsCompression = working.size > 256 * 1024;
  let probedDims = { width: 0, height: 0 };
  if (!needsCompression) {
    try {
      probedDims = await readImageDims(working);
    } catch { /* fall through */ }
    if (probedDims.width > FORCE_RESIZE_DIMENSION_PX || probedDims.height > FORCE_RESIZE_DIMENSION_PX) {
      needsCompression = true;
    }
  }
  if (!needsCompression) {
    return {
      file: working,
      originalBytes,
      originalType,
      width: probedDims.width,
      height: probedDims.height,
      thumbnailDataUrl: null,
      dominantColor: '#888888',
      didConvertHeic,
      didCompress: false,
    };
  }

  // ── Throttled compression ────────────────────────────────────────────────
  const release = await queue.acquire();
  let compressed: CompressedImage;
  try {
    compressed = await compressForChat(working);
  } finally {
    release();
  }

  // ── Encode thumbnail to data URL (best-effort) ───────────────────────────
  let thumbDataUrl: string | null = null;
  if (compressed.thumbnail) {
    try {
      thumbDataUrl = await blobToDataUrl(compressed.thumbnail);
    } catch {
      thumbDataUrl = null;
    }
  }

  return {
    file: compressed.original,
    originalBytes,
    originalType,
    width: compressed.width,
    height: compressed.height,
    thumbnailDataUrl: thumbDataUrl,
    dominantColor: compressed.dominantColor,
    didConvertHeic,
    didCompress: compressed.didCompress,
  };
}

/**
 * Convenience: prepare many images in parallel (capped by the global
 * concurrency limit). Failures are isolated per-input — a HEIC reject in
 * slot 3 doesn't lose slots 1, 2, 4, 5. Returns one settled result per
 * input in the same order.
 */
export async function prepareImagesForChat(
  files: File[],
): Promise<Array<{ ok: true; asset: PreparedAsset } | { ok: false; error: Error; file: File }>> {
  return Promise.all(
    files.map(async (f) => {
      try {
        const asset = await prepareImageForChat(f);
        return { ok: true as const, asset };
      } catch (err) {
        return { ok: false as const, error: err as Error, file: f };
      }
    }),
  );
}

/**
 * Read natural dimensions of an image Blob without painting it. Cheap
 * (~1ms). Used for the quick-skip path so we still know the aspect ratio
 * to reserve in the recipient bubble.
 */
function readImageDims(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      resolve({ width: w, height: h });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Event ? new Error('image load failed') : (e as Error));
    };
    img.src = url;
  });
}

/**
 * Format an asset's compression saving as a percentage. UI helper.
 *  e.g. compressionSaving({originalBytes: 4_000_000, file: { size: 800_000 }})
 *       === 80
 */
export function compressionSaving(asset: Pick<PreparedAsset, 'originalBytes' | 'file'>): number {
  if (asset.originalBytes <= 0) return 0;
  return Math.max(0, Math.round(((asset.originalBytes - asset.file.size) / asset.originalBytes) * 100));
}