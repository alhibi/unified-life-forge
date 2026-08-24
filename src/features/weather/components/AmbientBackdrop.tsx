import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

/**
 * AmbientBackdrop — Atmospheric background that reflects current conditions
 * Purely decorative, no interactive elements
 */
export interface AmbientBackdropProps {
  code: number;
  isDay: boolean;
  children?: ReactNode;
}

export function AmbientBackdrop({ code: _code, isDay, children }: AmbientBackdropProps) {
  const surface = isDay ? 'hsl(var(--muted) / 0.42)' : 'hsl(var(--card) / 0.72)';

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: surface }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="absolute inset-x-0 top-0 h-24 bg-primary/5"
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {children}
    </div>
  );
}