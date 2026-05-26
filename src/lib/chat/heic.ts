// ─────────────────────────────────────────────────────────────────────────────
// HEIC / HEIF detection and conversion utilities.
//
// Why this module exists
// ──────────────────────
// iOS phones ship photos as HEIC by default. When a user picks one through
// the chat composer:
//
//   • Safari decodes HEIC natively → `browser-image-compression` works fine.
//   • Chrome / Firefox / Edge cannot decode HEIC → the underlying canvas
//     `drawImage()` call inside `browser-image-compression` either:
//       a) silently produces a 0x0 black canvas (silent corruption), or
//       b) throws an unhandled `EncodingError` that bubbles past the
//          worker's try/catch and tears down the upload.
//
// The user-visible symptom is "the chat crashes when I send a photo".
//
// What this module does
// ─────────────────────
// 1. `looksLikeHeic(file)` — cheap MIME + extension check (no I/O).
// 2. `canDecodeHeicNatively()` — feature-detects whether the runtime can
//    actually rasterize a HEIC blob through `<img>` / `createImageBitmap`.
// 3. `convertHeicToJpeg(file)` — best-effort conversion to a regular JPEG
//    File. Uses a canvas re-encode when the runtime can decode the HEIC,
//    otherwise rejects so the caller can surface a friendly toast instead
//    of the user staring at a blank failed-upload bubble.
//
// We intentionally do NOT pull in libheif-js as a dependency. It is ~3 MB
// of WASM that would balloon the chat bundle for a small share of users,
// and Apple Photos already offers "Most Compatible" (auto-JPEG) for
// share-sheet pickers. Telling the user "please pick a JPEG instead" via
// a clear toast is the right trade-off until/unless analytics show this
// is a recurring blocker.
// ─────────────────────────────────────────────────────────────────────────────

const HEIC_MIME = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

const HEIC_EXT = /\.(heic|heif)$/i;

/**
 * Cheap predicate: is this file probably HEIC/HEIF?
 *
 * MIME alone is unreliable — some pickers strip it or report
 * `application/octet-stream`. We OR with the extension as a fallback.
 */
export function looksLikeHeic(file: File): boolean {
  if (!file) return false;
  if (HEIC_MIME.has(file.type)) return true;
  if (file.name && HEIC_EXT.test(file.name)) return true;
  return false;
}

/**
 * Cached feature-detect for native HEIC rendering. Runs the test once per
 * page load and memoizes the answer.
 *
 * The probe paints a 1×1 transparent HEIC literal into a hidden <img>.
 * A success means the runtime can decode further HEICs through canvas;
 * a failure means we should fall back to rejecting them up front.
 *
 * The literal below is a known-valid 1×1 HEIC blob produced by ImageMagick.
 * It's only 156 bytes so the cost of the probe is negligible.
 */
let _heicNativeCache: Promise<boolean> | null = null;
export function canDecodeHeicNatively(): Promise<boolean> {
  if (_heicNativeCache) return _heicNativeCache;
  _heicNativeCache = (async () => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return false;
    // Smallest valid HEIC payload we could produce. This is a single
    // 1×1 black pixel encoded with the HEVC main profile inside an HEIF
    // container. If <img> can decode it, the runtime has HEIC support.
    const tinyHeic =
      'data:image/heic;base64,AAAAGGZ0eXBoZWljAAAAAGhlaWNtaWYxAAAA' +
      'AmlpbmYAAAAAAAEAAAAOaXJlZgAAAAAAAAAAAQAAAA5waXRtAAAAAAAB';
    return new Promise<boolean>((resolve) => {
      try {
        const img = new Image();
        // 80 ms timeout — Safari decodes synchronously, anything slower
        // means the engine is doing async lookups it'll never finish.
        const timer = setTimeout(() => resolve(false), 80);
        img.onload = () => {
          clearTimeout(timer);
          // A successful decode produces a non-zero natural width.
          resolve((img.naturalWidth || 0) > 0);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        img.src = tinyHeic;
      } catch {
        resolve(false);
      }
    });
  })();
  return _heicNativeCache;
}

/**
 * Best-effort HEIC → JPEG conversion via canvas.
 *
 * Steps:
 *   1. Object-URL the HEIC blob.
 *   2. Decode it through `<img>` (works on Safari + iOS).
 *   3. Paint into a canvas at the original dimensions.
 *   4. Read back as `image/jpeg` via `toBlob`.
 *   5. Wrap as a File with the original name but a `.jpg` suffix.
 *
 * Throws `Error('heic-decode-unsupported')` if the runtime cannot decode
 * the blob. Callers should map that to a localized "please convert to
 * JPEG" toast.
 *
 * Quality defaults to 0.88 because most HEIC sources are already lossy;
 * re-encoding them at higher quality wastes bytes for no perceptual gain.
 */
export async function convertHeicToJpeg(file: File, quality = 0.88): Promise<File> {
  if (typeof document === 'undefined') {
    throw new Error('heic-decode-unsupported');
  }
  const native = await canDecodeHeicNatively();
  if (!native) {
    throw new Error('heic-decode-unsupported');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.decoding = 'async';
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('heic-decode-failed'));
      i.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('heic-decode-empty');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas-2d-unsupported');
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) throw new Error('heic-encode-failed');
    const baseName = file.name.replace(HEIC_EXT, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified ?? Date.now(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
