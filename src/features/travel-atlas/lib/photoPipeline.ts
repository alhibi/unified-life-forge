/**
 * Photo preparation before upload.
 *
 * A phone camera hands us a 5 MB, 4032 px JPEG. The atlas never renders a photo
 * wider than a full-bleed gallery, so uploading the raw file spends the user's
 * data plan and the project's storage quota on pixels nobody sees. Re-encoding
 * through a canvas also drops EXIF, which matters more here than elsewhere in
 * the app: holiday photos carry GPS coordinates of the photographer's hotel.
 *
 * Never throws — a codec the browser cannot decode falls back to the original
 * file so saving a place is not blocked by a compression failure.
 */

type ImageCompressionFn = (typeof import('browser-image-compression'))['default'];

let compressorPromise: Promise<ImageCompressionFn> | null = null;

function loadCompressor(): Promise<ImageCompressionFn> {
  // ~55 kB, and only needed once someone actually attaches a photo.
  compressorPromise ??= import('browser-image-compression').then((module) => module.default);
  return compressorPromise;
}

/** Long-edge ceiling — covers a 3× retina full-bleed gallery image. */
const MAX_DIMENSION_PX = 2048;
/** Comfortable ceiling that still looks clean on a large screen. */
const TARGET_MB = 1.1;
/** Below this, re-encoding costs quality and saves nothing worth having. */
const SKIP_BELOW_BYTES = 320 * 1024;

const COMPRESSIBLE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const MAX_PHOTOS_PER_PLACE = 12;
/** Matches the bucket's `file_size_limit`. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export async function preparePlacePhoto(file: File): Promise<File> {
  if (!file.type || !COMPRESSIBLE_MIME.has(file.type)) return file;
  if (file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const compress = await loadCompressor();
    const result = await compress(file, {
      maxSizeMB: TARGET_MB,
      maxWidthOrHeight: MAX_DIMENSION_PX,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.84,
      maxIteration: 8,
    });
    if (result.size >= file.size) return file;
    return result instanceof File
      ? result
      : new File([result], file.name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (error) {
    console.warn('[TravelAtlas] photo compression failed, uploading original', error);
    return file;
  }
}

/** Rejects the files a later upload would fail on, with a reason to show. */
export function screenPhotoFiles(files: File[]): { accepted: File[]; rejected: string[] } {
  const accepted: File[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      rejected.push(`${file.name}: ليس صورة`);
      continue;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      rejected.push(`${file.name}: أكبر من ١٠ ميغابايت`);
      continue;
    }
    accepted.push(file);
  }
  return { accepted, rejected };
}
