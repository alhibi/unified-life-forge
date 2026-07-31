import React, { createContext, useCallback, useContext, useRef,useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { compressionSaving, type PreparedAsset,prepareImageForChat } from '@/lib/chat/mediaPipeline';
import { logger } from '@/lib/logger';

const log = logger.scope('image-upload');

export interface PendingUpload {
  tempId: string;
  conversationId: string;
  senderId: string;
  localPreviewUrl: string;
  fileName: string;
  /**
   * 0–100 byte-progress for the network leg. While `status === 'compressing'`
   * this is meaningless (we don't have a stable progress signal from the
   * compression library); the UI should render an indeterminate spinner
   * during that phase.
   */
  progress: number;
  /**
   * Lifecycle:
   *   compressing → uploading → done
   *                          ↘ error (re-tryable from any branch)
   * `compressing` covers HEIC conversion + queued-in-pipeline + actual
   * encoding — anything before bytes hit the network. The UI should
   * render an indeterminate spinner during this phase.
   */
  status: 'compressing' | 'uploading' | 'done' | 'error';
  storagePath?: string;
  /**
   * Diagnostic — the byte size we actually uploaded after client-side
   * compression. Lets the UI render "saved 78%" badges. NULL when we
   * skipped compression (file already small / non-image).
   */
  compressedBytes?: number;
  /** Original file size in bytes, before compression. */
  originalBytes?: number;
  // ── New metadata fields (populated by mediaPipeline) ───────────────────
  /** Natural width (px) of the prepared image. 0 when unknown. */
  width?: number;
  /** Natural height (px) of the prepared image. 0 when unknown. */
  height?: number;
  /** Inline base64 thumbnail that survives a JSON cache hop. Used as
   *  the LQIP placeholder while the full-size streams in on the recipient. */
  thumbnailDataUrl?: string | null;
  /** Sampled dominant colour `#rrggbb` — fallback placeholder background. */
  dominantColor?: string;
  /** Optional human-readable error message for the UI. */
  errorMessage?: string;
}

/**
 * Optional payload included with the onUploadComplete callback so the
 * sender can attach width/height/dominantColor/thumbnail metadata to the
 * outgoing message. The chat layer wraps these into the message content
 * (e.g. as JSON sidecar) so recipients can pre-allocate bubble space and
 * paint LQIP placeholders before the full image arrives.
 */
export interface UploadMetadata {
  width?: number;
  height?: number;
  thumbnailDataUrl?: string | null;
  dominantColor?: string;
  originalBytes?: number;
  compressedBytes?: number;
}

interface ImageUploadContextType {
  uploads: PendingUpload[];
  startUpload: (file: File, conversationId: string, senderId: string) => string;
  retryUpload: (tempId: string) => void;
  getUpload: (tempId: string) => PendingUpload | undefined;
  clearUpload: (tempId: string) => void;
  onUploadComplete?: (
    tempId: string,
    storagePath: string,
    fileName: string,
    conversationId: string,
    metadata: UploadMetadata,
  ) => void;
  setOnUploadComplete: (
    cb:
      | ((
          tempId: string,
          storagePath: string,
          fileName: string,
          conversationId: string,
          metadata: UploadMetadata,
        ) => void)
      | undefined,
  ) => void;
}

const ImageUploadContext = createContext<ImageUploadContextType | null>(null);

export function useImageUpload() {
  const ctx = useContext(ImageUploadContext);
  if (!ctx) throw new Error('useImageUpload must be inside ImageUploadProvider');
  return ctx;
}

// Translate a typed `mediaPipeline` error into a user-friendly message.
// We keep the localization light here — the chat layer's chatNotify wraps
// everything in toasts; this just provides a default human string for the
// pending-upload tile.
function describePrepError(err: unknown): string {
  const tag = (err as Error & { tag?: string })?.tag || (err as Error)?.message || '';
  if (tag === 'heic-unsupported') return 'HEIC not supported on this browser';
  if (tag === 'heic-failed')      return 'HEIC conversion failed';
  return 'Could not prepare image';
}

export function ImageUploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const fileCache = useRef<Map<string, File>>(new Map());
  // Keep prepared assets keyed by tempId so retry doesn't re-run the
  // (expensive) compression path. Cleared in `clearUpload`.
  const assetCache = useRef<Map<string, PreparedAsset>>(new Map());
  const onCompleteRef = useRef<
    | ((
        tempId: string,
        storagePath: string,
        fileName: string,
        conversationId: string,
        metadata: UploadMetadata,
      ) => void)
    | undefined
  >();

  const setOnUploadComplete = useCallback((cb: ImageUploadContextType['onUploadComplete']) => {
    onCompleteRef.current = cb;
  }, []);

  const doUpload = useCallback(async (
    tempId: string, file: File, conversationId: string, senderId: string, presetAsset?: PreparedAsset,
  ) => {
    const originalBytes = file.size;

    // ── Prepare step (HEIC conversion + compression + thumbnail) ────────
    let asset: PreparedAsset;
    try {
      asset = presetAsset ?? await prepareImageForChat(file);
    } catch (err) {
      const message = describePrepError(err);
      setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'error', errorMessage: message } : u));
      return;
    }
    assetCache.current.set(tempId, asset);

    setUploads(prev => prev.map(u => u.tempId === tempId ? {
      ...u,
      status: 'uploading' as const,
      progress: 0,
      originalBytes,
      compressedBytes: asset.file.size,
      width:           asset.width || u.width,
      height:          asset.height || u.height,
      thumbnailDataUrl: asset.thumbnailDataUrl ?? u.thumbnailDataUrl,
      dominantColor:   asset.dominantColor ?? u.dominantColor,
    } : u));

    // ── Network upload ──────────────────────────────────────────────────
    // Use the prepared asset's declared MIME for the storage object so
    // signed URLs resolve to the right Content-Type for HEIC→JPEG and
    // worker compressions alike.
    const intendedExt = file.name.split('.').pop() || 'jpg';
    const ext = asset.file.type === 'image/jpeg' && intendedExt.toLowerCase() !== 'jpg' && intendedExt.toLowerCase() !== 'jpeg'
      ? 'jpg'
      : intendedExt;
    const path = `${senderId}/${conversationId}/${Date.now()}.${ext}`;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const xhr = new XMLHttpRequest();

    const uploadPromise = new Promise<string>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, progress: pct } : u));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(path);
        else reject(new Error(`Upload failed: ${xhr.status}`));
      });
      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
      // Time out after 2 minutes — a stuck upload past that point is
      // almost certainly a dead radio. UI exposes a retry button.
      xhr.timeout = 120_000;
      xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/storage/v1/object/chat-files/${path}`;

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', anonKey);
      xhr.setRequestHeader('x-upsert', 'false');
      if (asset.file.type) xhr.setRequestHeader('Content-Type', asset.file.type);
      xhr.send(asset.file);
    });

    try {
      const storagePath = await uploadPromise;
      const ratio = compressionSaving({ originalBytes, file: asset.file });
      if (ratio > 0) {
        log.info(`compressed ${ratio}% (${originalBytes} → ${asset.file.size} bytes)`);
      }
      setUploads(prev => prev.map(u => u.tempId === tempId
        ? { ...u, status: 'done', progress: 100, storagePath, errorMessage: undefined }
        : u
      ));
      onCompleteRef.current?.(tempId, storagePath, file.name, conversationId, {
        width:           asset.width || undefined,
        height:          asset.height || undefined,
        thumbnailDataUrl: asset.thumbnailDataUrl,
        dominantColor:   asset.dominantColor,
        originalBytes,
        compressedBytes: asset.file.size,
      });
    } catch (err) {
      const message = (err as Error)?.message || 'Upload failed';
      setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'error', errorMessage: message } : u));
    }
  }, []);

  const startUpload = useCallback((file: File, conversationId: string, senderId: string): string => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const localPreviewUrl = URL.createObjectURL(file);

    fileCache.current.set(tempId, file);

    const pending: PendingUpload = {
      tempId,
      conversationId,
      senderId,
      localPreviewUrl,
      fileName: file.name,
      progress: 0,
      status: 'compressing',
      originalBytes: file.size,
    };

    setUploads(prev => [...prev, pending]);
    doUpload(tempId, file, conversationId, senderId);
    return tempId;
  }, [doUpload]);

  const retryUpload = useCallback((tempId: string) => {
    const upload = uploads.find(u => u.tempId === tempId);
    const file = fileCache.current.get(tempId);
    if (!upload || !file) return;
    // Skip the compression step if we already have a prepared asset; the
    // failure was almost certainly on the network leg.
    const presetAsset = assetCache.current.get(tempId);
    setUploads(prev => prev.map(u => u.tempId === tempId
      ? { ...u, status: presetAsset ? 'uploading' : 'compressing', progress: 0, errorMessage: undefined }
      : u));
    doUpload(tempId, file, upload.conversationId, upload.senderId, presetAsset);
  }, [uploads, doUpload]);

  const getUpload = useCallback((tempId: string) => uploads.find(u => u.tempId === tempId), [uploads]);

  const clearUpload = useCallback((tempId: string) => {
    const upload = uploads.find(u => u.tempId === tempId);
    if (upload) URL.revokeObjectURL(upload.localPreviewUrl);
    fileCache.current.delete(tempId);
    assetCache.current.delete(tempId);
    setUploads(prev => prev.filter(u => u.tempId !== tempId));
  }, [uploads]);

  return (
    <ImageUploadContext.Provider value={{ uploads, startUpload, retryUpload, getUpload, clearUpload, setOnUploadComplete }}>
      {children}
    </ImageUploadContext.Provider>
  );
}
