import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingUpload {
  tempId: string;
  conversationId: string;
  senderId: string;
  localPreviewUrl: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  storagePath?: string;
  /** Reason a `status: 'error'` upload failed — surfaces a useful toast. */
  errorReason?: 'too-large' | 'bad-type' | 'network';
}

interface ImageUploadContextType {
  uploads: PendingUpload[];
  startUpload: (file: File, conversationId: string, senderId: string) => string | null;
  retryUpload: (tempId: string) => void;
  getUpload: (tempId: string) => PendingUpload | undefined;
  clearUpload: (tempId: string) => void;
  onUploadComplete?: (tempId: string, storagePath: string, fileName: string, conversationId: string) => void;
  setOnUploadComplete: (cb: ((tempId: string, storagePath: string, fileName: string, conversationId: string) => void) | undefined) => void;
}

const ImageUploadContext = createContext<ImageUploadContextType | null>(null);

// Defensive caps. The bucket itself enforces a cap server-side; these are
// here to fail fast (and skip a wasted network round-trip) and to match
// what the chat composer accepts.
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/zip',
  'text/plain',
]);

function isAllowedMime(type: string): boolean {
  if (!type) return false;
  if (ALLOWED_MIME_EXACT.has(type)) return true;
  return ALLOWED_MIME_PREFIXES.some(prefix => type.startsWith(prefix));
}

// Pull a safe extension from the filename. We only keep [a-z0-9]{1,8} so a
// crafted name like `..%2F..%2Fhack.html` can't escape the storage prefix.
function safeExtension(name: string, mime: string): string {
  const lastDot = name.lastIndexOf('.');
  const raw = lastDot >= 0 ? name.slice(lastDot + 1).toLowerCase() : '';
  if (/^[a-z0-9]{1,8}$/.test(raw)) return raw;
  // Fall back to a guess from MIME so the path is always well-formed.
  if (mime.startsWith('image/'))  return mime.slice(6) || 'bin';
  if (mime.startsWith('video/'))  return mime.slice(6) || 'bin';
  if (mime.startsWith('audio/'))  return mime.slice(6) || 'bin';
  return 'bin';
}

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
    const ext = safeExtension(file.name, file.type);
    const path = `${senderId}/${conversationId}/${Date.now()}.${ext}`;

    // Get token first, then upload. We use raw XHR (instead of
    // supabase.storage.from().upload()) ONLY because we need byte-level
    // progress events for the chat upload progress bar. supabase-js v2
    // does not yet expose progress on its storage client.
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
      // Forward the browser-detected content-type so the bucket records it
      // accurately (otherwise everything ends up as application/octet-stream).
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    try {
      const storagePath = await uploadPromise;
      setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'done', progress: 100, storagePath } : u));
      onCompleteRef.current?.(tempId, storagePath, file.name, conversationId);
    } catch {
      setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'error', errorReason: 'network' } : u));
    }
  }, []);

  const startUpload = useCallback((file: File, conversationId: string, senderId: string): string | null => {
    // Validate before allocating an object URL or temp id — failed uploads
    // shouldn't pollute the uploads list with errored entries the user
    // didn't initiate.
    if (file.size > MAX_BYTES) return null;
    if (!isAllowedMime(file.type)) return null;

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
      status: 'uploading',
    };

    setUploads(prev => [...prev, pending]);
    doUpload(tempId, file, conversationId, senderId);
    return tempId;
  }, [doUpload]);

  const retryUpload = useCallback((tempId: string) => {
    const upload = uploads.find(u => u.tempId === tempId);
    const file = fileCache.current.get(tempId);
    if (!upload || !file) return;
    setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'uploading', progress: 0, errorReason: undefined } : u));
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
