import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressForChat, compressionRatio } from '@/lib/chat/imageCompression';

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
   * We add `compressing` so the UI can disambiguate "still preparing" from
   * "stuck on the network", which used to render identically as 0% progress.
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
}

interface ImageUploadContextType {
  uploads: PendingUpload[];
  startUpload: (file: File, conversationId: string, senderId: string) => string;
  retryUpload: (tempId: string) => void;
  getUpload: (tempId: string) => PendingUpload | undefined;
  clearUpload: (tempId: string) => void;
  onUploadComplete?: (tempId: string, storagePath: string, fileName: string, conversationId: string) => void;
  setOnUploadComplete: (cb: ((tempId: string, storagePath: string, fileName: string, conversationId: string) => void) | undefined) => void;
}

const ImageUploadContext = createContext<ImageUploadContextType | null>(null);

export function useImageUpload() {
  const ctx = useContext(ImageUploadContext);
  if (!ctx) throw new Error('useImageUpload must be inside ImageUploadProvider');
  return ctx;
}

export function ImageUploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const fileCache = useRef<Map<string, File>>(new Map());
  const onCompleteRef = useRef<((tempId: string, storagePath: string, fileName: string, conversationId: string) => void) | undefined>();

  const setOnUploadComplete = useCallback((cb: ((tempId: string, storagePath: string, fileName: string, conversationId: string) => void) | undefined) => {
    onCompleteRef.current = cb;
  }, []);

  const doUpload = useCallback(async (tempId: string, file: File, conversationId: string, senderId: string) => {
    const originalBytes = file.size;

    // ── Compression step ──────────────────────────────────────────────────
    // Runs in a Web Worker, so it doesn't block the UI thread. The result
    // is a (possibly) smaller File we'll pass to the XHR. Compression is
    // best-effort: any failure falls back to the original file.
    let uploadFile: File = file;
    try {
      const compressed = await compressForChat(file);
      uploadFile = compressed.original;
    } catch (err) {
      console.warn('[image-upload] compression failed, uploading original', err);
    }

    setUploads(prev => prev.map(u => u.tempId === tempId ? {
      ...u,
      status: 'uploading' as const,
      progress: 0,
      originalBytes,
      compressedBytes: uploadFile.size,
    } : u));

    // ── Network upload ────────────────────────────────────────────────────
    // Preserve the user's intended extension so downloads carry the right
    // suffix. Compression always emits JPEG; if we changed the type we
    // also override the extension to `.jpg` so the server's MIME sniffing
    // and the storage key agree.
    const intendedExt = file.name.split('.').pop() || 'jpg';
    const ext = uploadFile.type === 'image/jpeg' && intendedExt.toLowerCase() !== 'jpg' && intendedExt.toLowerCase() !== 'jpeg'
      ? 'jpg'
      : intendedExt;
    const path = `${senderId}/${conversationId}/${Date.now()}.${ext}`;

    // Get token first, then upload
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

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/storage/v1/object/chat-files/${path}`;

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', anonKey);
      xhr.setRequestHeader('x-upsert', 'false');
      // Keep Content-Type accurate so Supabase Storage stores it correctly
      // for future GETs (the CDN sniffs it back as the response header).
      if (uploadFile.type) xhr.setRequestHeader('Content-Type', uploadFile.type);
      xhr.send(uploadFile);
    });

    try {
      const storagePath = await uploadPromise;
      const ratio = compressionRatio(originalBytes, uploadFile.size);
      if (ratio > 0) {
        // Lightweight diagnostics — only log meaningful saves so the
        // console isn't flooded for tiny pass-through files.
        console.info(`[image-upload] compressed ${ratio}% (${originalBytes} → ${uploadFile.size} bytes)`);
      }
      setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'done', progress: 100, storagePath } : u));
      onCompleteRef.current?.(tempId, storagePath, file.name, conversationId);
    } catch {
      setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'error' } : u));
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
      // Compression runs first inside doUpload; flip to 'uploading' once
      // the bytes are on the wire. This gives the UI a hook to render an
      // indeterminate spinner instead of a stuck-at-0% progress bar
      // during the (potentially 1–2 s) Web Worker compression step.
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
    // Re-enter at the compression step so the retry path is identical
    // to the original send, including any compression that failed (or
    // wasn't needed) the first time.
    setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'compressing', progress: 0 } : u));
    doUpload(tempId, file, upload.conversationId, upload.senderId);
  }, [uploads, doUpload]);

  const getUpload = useCallback((tempId: string) => uploads.find(u => u.tempId === tempId), [uploads]);

  const clearUpload = useCallback((tempId: string) => {
    const upload = uploads.find(u => u.tempId === tempId);
    if (upload) URL.revokeObjectURL(upload.localPreviewUrl);
    fileCache.current.delete(tempId);
    setUploads(prev => prev.filter(u => u.tempId !== tempId));
  }, [uploads]);

  return (
    <ImageUploadContext.Provider value={{ uploads, startUpload, retryUpload, getUpload, clearUpload, setOnUploadComplete }}>
      {children}
    </ImageUploadContext.Provider>
  );
}
