import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatImageProps {
  src: string;
  alt?: string;
  className?: string;
  isAr?: boolean;
  onLoadedSrc?: () => void;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  /** Async resolver to re-fetch a fresh signed URL on error (e.g. expired). */
  refreshUrl?: () => Promise<string | null>;
}

/**
 * Robust image renderer for chat bubbles, previews and lightboxes.
 *
 *  • Shows a soft skeleton while the resolver is still computing the URL.
 *  • Shows a clear error state with a Retry button if the network/decoding fails.
 *  • Optionally re-signs the URL via `refreshUrl` (e.g. when Supabase signed
 *    URLs expire after an hour).
 *  • Avoids the dreaded "broken image" flash from React rendering `<img src="">`.
 */
const ChatImage: React.FC<ChatImageProps> = ({
  src, alt, className, isAr, onLoadedSrc, onClick, refreshUrl,
}) => {
  const [resolved, setResolved] = useState<string>(src || '');
  const [status, setStatus] = useState<'pending' | 'loading' | 'ready' | 'error'>(
    src ? 'loading' : 'pending'
  );
  const retriesRef = useRef(0);

  // Update local state when parent passes a new src (e.g. signed URL resolved).
  useEffect(() => {
    if (src && src !== resolved) {
      setResolved(src);
      setStatus('loading');
      retriesRef.current = 0;
    } else if (!src) {
      setStatus('pending');
    }
  }, [src, resolved]);

  const handleRetry = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    retriesRef.current += 1;
    setStatus('loading');
    if (refreshUrl) {
      const fresh = await refreshUrl();
      if (fresh && fresh !== resolved) {
        setResolved(fresh);
        return;
      }
    }
    // Force a reload by appending a cache buster
    setResolved((prev) => (prev ? prev.split('?')[0] + `?_=${Date.now()}` : prev));
  };

  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      {status === 'pending' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/15">
          <Loader2 className="w-5 h-5 text-muted-foreground/60 animate-spin" />
        </div>
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 skeleton" aria-hidden="true" />
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/40 text-muted-foreground">
          <ImageOff className="w-6 h-6" />
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-background/80 hover:bg-background active:scale-95 transition"
          >
            <RotateCw className="w-3 h-3" />
            {isAr ? 'إعادة المحاولة' : 'Erneut versuchen'}
          </button>
        </div>
      )}
      {resolved && (
        <img
          src={resolved}
          alt={alt || ''}
          loading="lazy"
          decoding="async"
          draggable={false}
          onClick={onClick}
          onLoad={() => {
            setStatus('ready');
            onLoadedSrc?.();
          }}
          onError={() => {
            if (retriesRef.current === 0 && refreshUrl) {
              // Try a refresh transparently the first time
              handleRetry();
            } else {
              setStatus('error');
            }
          }}
          className={cn(
            'block w-full h-full object-cover transition-opacity duration-150',
            status === 'ready' ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

export default ChatImage;
