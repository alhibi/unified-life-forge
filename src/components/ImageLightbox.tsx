import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
  originRect?: DOMRect | null;
}

export default function ImageLightbox({ src, alt, open, onClose, originRect }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const dragY = useMotionValue(0);
  const bgOpacity = useTransform(dragY, [-300, 0, 300], [0, 1, 0]);
  const imgScale = useTransform(dragY, [-300, 0, 300], [0.7, 1, 0.7]);

  const lastTapRef = useRef(0);
  const pinchStartRef = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Double-tap to zoom
  const handleDoubleTap = useCallback(() => {
    if (isZoomed) {
      setScale(1);
      setIsZoomed(false);
    } else {
      setScale(2.5);
      setIsZoomed(true);
    }
  }, [isZoomed]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [handleDoubleTap]);

  // Pinch-to-zoom via touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartRef.current;
      const newScale = Math.max(1, Math.min(5, scale * ratio));
      setScale(newScale);
      setIsZoomed(newScale > 1.1);
      pinchStartRef.current = dist;
    }
  }, [scale]);

  // Shared element transition origin
  const getInitialPos = () => {
    if (!originRect) return { opacity: 0, scale: 0.5 };
    const cx = originRect.left + originRect.width / 2 - window.innerWidth / 2;
    const cy = originRect.top + originRect.height / 2 - window.innerHeight / 2;
    return {
      x: cx,
      y: cy,
      scale: originRect.width / Math.min(window.innerWidth, 600),
      opacity: 1,
    };
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = alt || 'image';
    a.target = '_blank';
    a.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Background */}
          <motion.div
            className="absolute inset-0 bg-black"
            style={{ opacity: bgOpacity }}
            onClick={onClose}
          />

          {/* Top bar */}
          <motion.div
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
            style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
          >
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleDownload}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
          </motion.div>

          {/* Image container with swipe-to-dismiss */}
          <motion.div
            ref={containerRef}
            className="relative z-[1] w-full h-full flex items-center justify-center will-change-transform"
            style={{ y: dragY, scale: imgScale }}
            drag={!isZoomed ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.7}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 100 || Math.abs(info.velocity.y) > 500) {
                onClose();
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <motion.img
              ref={imgRef}
              src={src}
              alt={alt || ''}
              className="max-w-full max-h-full object-contain select-none will-change-transform"
              style={{
                scale,
                touchAction: isZoomed ? 'none' : 'pan-y',
              }}
              initial={getInitialPos()}
              animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              exit={originRect ? getInitialPos() : { opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={handleClick}
              draggable={false}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
