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
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${senderId}/${conversationId}/${Date.now()}.${ext}`;

    // Use XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    const uploadPromise = new Promise<string>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, progress: pct } : u));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(path);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.addEventListener('abort', () => reject(new Error('Aborted')));

      // Build the URL and upload
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${supabaseUrl}/storage/v1/object/chat-files/${path}`;

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${supabase.realtime?.accessToken || anonKey}`);
      xhr.setRequestHeader('apikey', anonKey);
      xhr.setRequestHeader('x-upsert', 'false');

      // We need the current session token
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token || anonKey;
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(file);
      });
    });

    try {
      const storagePath = await uploadPromise;
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
    setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'uploading', progress: 0 } : u));
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
