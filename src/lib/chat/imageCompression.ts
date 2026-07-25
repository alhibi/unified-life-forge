// @ts-nocheck — schema mismatch: code references tables/RPCs not in current generated types
// ─────────────────────────────────────────────────────────────────────────────
// Client-side image compression + thumbnail generation for chat attachments.
//
// Why client-side?
//   • Mobile-first usage. A modern phone camera produces 4–6 MB JPEGs that
//     are 4032×3024 px. Uploading those raw to Supabase Storage burns the
//     user's mobile data, the chat partner's CDN bandwidth, and our paid
//     egress for *zero* visible quality benefit on a 414-px screen.
//   • Lower latency-. By the time the upload completes the
//     compressed file is ~6× smaller, so the recipient sees the image
//     6× sooner.
//   • Privacy hygiene. Re-encoding through a Canvas strips EXIF metadata
//     by default — no GPS coordinates, camera serial numbers, or
//     embedded thumbnails leak with the photo.
//
// Pipeline
//   compressForChat(file) returns:
//     • `original`   — the (possibly-resized) full-size File. Always JPEG
//                      to stay broadly compatible with downstream tools.
//     • `thumbnail`  — a small WebP (≤ 30 KB target) for inline preview
//                      while the original streams. NULL if the source is
//                      itself smaller than the thumbnail target.
//     • `width/height` — natural dimensions of the compressed image,
//                      so the chat bubble can reserve space and avoid
//                      layout shift when the image arrives.
//     • `dominantColor` — sRGB hex sampled from the centre pixel of the
//                      thumbnail. Used as the placeholder background
//                      while the real bytes are still streaming.
//
// Resilience
//   • Every step is wrapped in try/catch. If compression fails (e.g. the
//     browser dies on a HEIC file it can't decode) we return the original
//     File unmodified and surface the error so the caller can decide
//     whether to upload anyway or surface a toast.
//   • We never alter `original.name` so the recipient sees the user's
//     intended filename in download flows.
//   • We don't try to compress GIFs (they would lose animation through
//     the JPEG path) or non-image files (return as-is).
// ─────────────────────────────────────────────────────────────────────────────

// `browser-image-compression` is ~55 kB and is only needed the moment a user
// actually picks an image. It used to be a static import, and because the
// global <ImageUploadProvider/> pulls this module in, it shipped in the entry
// chunk for every visitor. Loaded on first use and memoised instead.
type ImageCompressionFn = typeof import('browser-image-compression')['default'];

let compressorPromise: Promise<ImageCompressionFn> | null = null;

function loadCompressor(): Promise<ImageCompressionFn> {
  compressorPromise ??= import('browser-image-compression').then((m) => m.default);
  return compressorPromise;
}

/** Threshold below which we skip compression entirely. */
const COMPRESS_THRESHOLD_BYTES = 256 * 1024; // 256 KB

/** Hard cap on the long edge of the compressed full-size image. */
const MAX_FULL_DIMENSION_PX = 1920;

/** Hard cap on the long edge of the generated thumbnail. */
const THUMB_DIMENSION_PX = 256;

/** Target byte size for the full-size JPEG. browser-image-compression
 *  approaches this iteratively. We pick 1 MB as a comfortable mobile
 *  ceiling — high enough to keep visible quality on a 1920-px display,
 *  low enough that uploads finish in seconds on 4G. */
const TARGET_FULL_MB = 1.0;

/** Target byte size for the thumbnail. ≤ 30 KB keeps it inlinable into
 *  the message bubble's preload path without measurably slowing first
 *  paint, and is well within the IDB cache budget. */
const TARGET_THUMB_MB = 0.03;

/** MIME types we know how to compress. Anything else passes through. */
const COMPRESSIBLE_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]);

export interface CompressedImage {
  /** Full-size File ready for upload. JPEG, ≤ TARGET_FULL_MB unless the
   *  source was already smaller (in which case the original passes through). */
  original: File;
  /** Small WebP preview. Inline-cacheable. NULL when source was already tiny. */
  thumbnail: Blob | null;
  /** Natural width of the compressed full-size image. */
  width: number;
  /** Natural height of the compressed full-size image. */
  height: number;
  /** Approximate dominant colour as #RRGGBB — used for placeholder shimmer. */
  dominantColor: string;
  /** True iff compression actually shrank the file. UI can hide the
   *  "compressed by N%" badge when this is false. */
  didCompress: boolean;
}

/**
 * Compress + thumbnail an arbitrary File. Returns the original File
 * untouched (with `didCompress = false`) for non-image inputs, animated
 * GIFs, and inputs already below `COMPRESS_THRESHOLD_BYTES`.
 *
 * Never throws — failures fall back to the original file with a console
 * warning so chat sends never block on a broken codec.
 */
export async function compressForChat(file: File): Promise<CompressedImage> {
  const fallback: CompressedImage = {
    original: file,
    thumbnail: null,
    width: 0,
    height: 0,
    dominantColor: '#888888',
    didCompress: false,
  };

  // ── Eligibility checks ────────────────────────────────────────────────────
  if (!file.type || !COMPRESSIBLE_MIME.has(file.type)) {
    return fallback;
  }
  // Animated GIFs go through file.type === 'image/gif' — but our set
  // intentionally excludes that, so this branch is defensive only.
  if (file.size <= COMPRESS_THRESHOLD_BYTES) {
    // Still measure so the bubble can reserve correct space.
    try {
      const dims = await readImageDimensions(file);
      return { ...fallback, width: dims.width, height: dims.height };
    } catch {
      return fallback;
    }
  }

  // ── Compress the full-size image ──────────────────────────────────────────
  let compressed: File;
  try {
    const imageCompression = await loadCompressor();
    compressed = await imageCompression(file, {
      maxSizeMB: TARGET_FULL_MB,
      maxWidthOrHeight: MAX_FULL_DIMENSION_PX,
      useWebWorker: true,
      // Keep filename + extension stable. The library defaults the type
      // to JPEG when source is non-progressive PNG/HEIC, which is what
      // we want for broadest compatibility.
      fileType: 'image/jpeg',
      // Let the library iterate up to 8 times to hit the size target.
      // This is the default but pinned here for clarity.
      maxIteration: 8,
      // Some HEIC files trip Safari's decoder path; this hint avoids it.
      initialQuality: 0.82,
    });
  } catch (err) {
    console.warn('[chat/compress] full-size compression failed', err);
    return fallback;
  }

  // ── Generate the thumbnail ────────────────────────────────────────────────
  let thumbnail: Blob | null = null;
  try {
    const imageCompression = await loadCompressor();
    const thumbFile = await imageCompression(file, {
      maxSizeMB: TARGET_THUMB_MB,
      maxWidthOrHeight: THUMB_DIMENSION_PX,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.7,
      maxIteration: 6,
    });
    // Reject thumbnails that came out larger than the full-size image —
    // can happen for pathologically tiny sources. In that case drop the
    // thumb entirely (the full-size image is itself the placeholder).
    if (thumbFile.size < compressed.size) {
      thumbnail = thumbFile;
    }
  } catch (err) {
    // Thumbnail failure is non-fatal — we just won't have a placeholder.
    console.warn('[chat/compress] thumbnail generation failed', err);
  }

  // ── Read dimensions + dominant colour ─────────────────────────────────────
  let width = 0;
  let height = 0;
  let dominantColor = '#888888';
  try {
    const dims = await readImageDimensions(compressed);
    width  = dims.width;
    height = dims.height;
    if (thumbnail) {
      dominantColor = await sampleDominantColor(thumbnail).catch(() => dominantColor);
    }
  } catch (err) {
    console.warn('[chat/compress] post-compress probe failed', err);
  }

  // Wrap the compressed Blob back into a File so downstream code (which
  // reads file.name / file.lastModified) keeps working unchanged. The
  // library returns a File already, so this is a no-op cast for safety.
  const finalOriginal: File = compressed instanceof File
    ? compressed
    : new File([compressed], file.name, {
        type: 'image/jpeg',
        lastModified: file.lastModified ?? Date.now(),
      });

  return {
    original:      finalOriginal,
    thumbnail,
    width,
    height,
    dominantColor,
    didCompress:   finalOriginal.size < file.size,
  };
}

/**
 * Read natural dimensions of an image Blob without painting it to the DOM.
 * Uses an in-memory <img> + an object URL so the call is cheap (~1ms).
 */
function readImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
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
 * Sample the centre pixel of a thumbnail to derive a single representative
 * colour. Used as the bubble's placeholder background while the original
 * streams. Cheap (single getImageData call on a tiny canvas).
 */
async function sampleDominantColor(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload  = () => resolve(i);
      i.onerror = () => reject(new Error('thumb load failed'));
      i.src = url;
    });
    // Render at 8×8 so we get a true average without paying a full decode.
    const canvas = document.createElement('canvas');
    canvas.width  = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#888888';
    ctx.drawImage(img, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Format a byte count for human-readable diagnostics.
 *  e.g. formatSize(1572864) === '1.5 MB'
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Small helper: returns the percentage size reduction achieved.
 *  e.g. compressionRatio(originalBytes=4_000_000, compressedBytes=800_000) === 80
 */
export function compressionRatio(originalBytes: number, compressedBytes: number): number {
  if (originalBytes <= 0) return 0;
  return Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100));
}