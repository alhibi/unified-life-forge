import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Loader2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatImageProps {
  /** Signed (or local blob) URL for the full-size image. May be empty
   *  while the resolver is computing — the component renders a spinner. */
  src: string;
  alt?: string;
  className?: string;
  isAr?: boolean;
  onLoadedSrc?: () => void;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  /** Async resolver to re-fetch a fresh signed URL on error (e.g. expired). */
  refreshUrl?: () => Promise<string | null>;
  // ── Telegram-grade placeholder support ─────────────────────────────────
  /** Natural width of the source in pixels. When provided alongside
   *  `height`, the component reserves the corresponding aspect ratio so
   *  the surrounding layout never shifts when the image arrives. */
  width?: number;
  /** Natural height of the source in pixels. */
  height?: number;
  /** Inline base64 thumbnail (data URL). When provided, painted blurred
   *  underneath the full-size image until it loads — Telegram's signature
   *  "image fades up over a soft shape" effect. */
  thumbnailDataUrl?: string | null;
  /** Sampled dominant colour (`#rrggbb`). Falls back to neutral grey. */
  dominantColor?: string | null;
  /** Maximum height for the bubble. The aspect ratio is preserved within
   *  this height. Defaults to 320 px. */
  maxHeight?: number;
}

const NEUTRAL = '#888888';

/**
 * Robust image renderer for chat bubbles, previews and lightboxes.
 *
 * Telegram-grade behaviour
 * ────────────────────────
 * 1. **Aspect-ratio reservation.** When `width` and `height` are
 *    provided (via the inline metadata envelope), the bubble allocates
 *    its final dimensions immediately. New messages no longer pop the
 *    surrounding messages around when their image finishes loading.
 *
 * 2. **LQIP (low-quality image placeholder).** When `thumbnailDataUrl`
 *    is provided, it's painted underneath the real image with a soft
 *    blur. The user sees a recognizable shape instantly; the real
 *    bytes blend up smoothly when they arrive.
 *
 * 3. **Dominant-colour fallback.** When LQIP is missing (small images
 *    that don't get a thumbnail), `dominantColor` paints a tinted
 *    background that matches the image's overall hue — a more pleasant
 *    placeholder than a generic muted grey.
 *
 * 4. **Auto-retry on signed-URL expiry.** First load failure tries to
 *    re-sign the URL transparently; only after a second failure do we
 *    surface the error UI with a manual retry button.
 *
 * 5. **No flash-of-broken-image.** We never render `<img src="">`. The
 *    component sits on the placeholder until a non-empty URL is in
 *    flight.
 */
const ChatImage: React.FC<ChatImageProps> = ({
  src, alt, className, isAr, onLoadedSrc, onClick, refreshUrl,
  width, height, thumbnailDataUrl, dominantColor, maxHeight = 320,
}) => {
  const [resolved, setResolved] = useState<string>(src || '');
  const [status, setStatus] = useState<'pending' | 'loading' | 'ready' | 'error'>(
    src ? 'loading' : 'pending'
  );
  const retriesRef = useRef(0);

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
    setResolved((prev) => (prev ? prev.split('?')[0] + `?_=${Date.now()}` : prev));
  };

  // ── Sizing ────────────────────────────────────────────────────────────
  // Aspect ratio is the core anti-layout-shift trick. We compute it once
  // from the metadata and let the browser maintain it until the real
  // image arrives. Falls back to 4/3 (a sensible camera default) when
  // dimensions are missing — the same shape ChatDrawer already used,
  // so legacy messages without metadata look identical to before.
  const aspect = useMemo<string>(() => {
    if (width && height && width > 0 && height > 0) return `${width} / ${height}`;
    return '4 / 3';
  }, [width, height]);

  const placeholderColor = dominantColor && /^#[0-9a-fA-F]{6}$/.test(dominantColor)
    ? dominantColor
    : NEUTRAL;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      // Reserve aspect ratio + bounded height so the bubble settles
      // on its final dimensions on the very first paint.
      style={{
        aspectRatio: aspect,
        maxHeight,
        background: thumbnailDataUrl ? undefined : `${placeholderColor}cc`,
      }}
    >
      {/* ── Layer 1: LQIP thumbnail (blurred) ────────────────────────── */}
      {/*
        Painted underneath everything so it's visible the instant the
        bubble mounts. `filter: blur(...)` + slight `scale(1.05)` hides
        the JPEG block boundaries that show through at the edges.
      */}
      {thumbnailDataUrl && (
        <img
          src={thumbnailDataUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            'transition-opacity duration-300',
            status === 'ready' ? 'opacity-0' : 'opacity-100',
          )}
          style={{ filter: 'blur(14px)', transform: 'scale(1.05)' }}
        />
      )}

      {/* ── Layer 2: state overlays ──────────────────────────────────── */}
      {status === 'pending' && !thumbnailDataUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/15">
          <Loader2 className="w-5 h-5 text-muted-foreground/60 animate-spin" />
        </div>
      )}
      {status === 'loading' && !thumbnailDataUrl && (
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

      {/* ── Layer 3: real image ──────────────────────────────────────── */}
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
              handleRetry();
            } else {
              setStatus('error');
            }
          }}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
            status === 'ready' ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

export default ChatImage;
