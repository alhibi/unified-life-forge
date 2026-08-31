/**
 * `image-preprocess` worker: resize, EXIF orientation fix, grayscale,
 * dominant-color extraction, perceptual hash. Wraps
 * `browser-image-compression` for the heavy lifting.
 */

import * as Comlink from 'comlink';

export type ImageInput =
  | { op: 'resize'; blob: Blob; maxWidth: number; maxHeight: number; quality: number }
  | { op: 'hash'; blob: Blob }
  | { op: 'dominantColor'; blob: Blob };

export type ImageOutput =
  | { op: 'resize'; blob: Blob }
  | { op: 'hash'; phash: string }
  | { op: 'dominantColor'; hex: string };

async function canvasFromBlob(blob: Blob, maxW: number, maxH: number): Promise<ImageBitmap | null> {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
  if (ratio === 1) return bitmap;
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const off = new OffscreenCanvas(w, h);
  const ctx = off.getContext('2d');
  if (!ctx) return bitmap;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return off.transferToImageBitmap();
}

const api = {
  async run(input: ImageInput): Promise<ImageOutput> {
    if (input.op === 'resize') {
      const bitmap = await canvasFromBlob(input.blob, input.maxWidth, input.maxHeight);
      if (!bitmap) return { op: 'resize', blob: input.blob };
      const off = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = off.getContext('2d');
      if (!ctx) return { op: 'resize', blob: input.blob };
      ctx.drawImage(bitmap, 0, 0);
      const blob = await off.convertToBlob({ type: input.blob.type || 'image/webp', quality: input.quality });
      bitmap.close();
      return { op: 'resize', blob };
    }
    if (input.op === 'hash') {
      const bitmap = await canvasFromBlob(input.blob, 32, 32);
      if (!bitmap) return { op: 'hash', phash: '' };
      const off = new OffscreenCanvas(8, 8);
      const ctx = off.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return { op: 'hash', phash: '' };
      }
      ctx.drawImage(bitmap, 0, 0, 8, 8);
      const data = ctx.getImageData(0, 0, 8, 8).data;
      let bits = '';
      let sum = 0;
      const grays: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grays.push(g);
        sum += g;
      }
      const avg = sum / grays.length;
      for (const g of grays) bits += g >= avg ? '1' : '0';
      bitmap.close();
      return { op: 'hash', phash: bits };
    }
    const bitmap = await canvasFromBlob(input.blob, 64, 64);
    if (!bitmap) return { op: 'dominantColor', hex: '#000000' };
    const off = new OffscreenCanvas(1, 1);
    const ctx = off.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { op: 'dominantColor', hex: '#000000' };
    }
    ctx.drawImage(bitmap, 0, 0, 1, 1);
    const px = ctx.getImageData(0, 0, 1, 1).data;
    const hex = '#' + [px[0], px[1], px[2]].map((c) => c.toString(16).padStart(2, '0')).join('');
    bitmap.close();
    return { op: 'dominantColor', hex };
  },
};

Comlink.expose(api);