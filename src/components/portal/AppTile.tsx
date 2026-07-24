import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';

export interface AppTileDef {
  key: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  /** HSL string, e.g. `hsl(var(--live))` or a hex/hsl literal. */
  accent: string;
}

export function AppTile({ tile, index }: { tile: AppTileDef; index: number }) {
  const navigate = useNavigate();
  const { dir } = useApp();
  const Icon = tile.icon;
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.045, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.96 }}
      onClick={() => navigate(tile.path)}
      className="group relative overflow-hidden rounded-3xl surface-depth surface-depth-pressable text-start p-5 min-h-[132px] flex flex-col justify-between border border-border/40 hover:border-border/70 transition-colors"
      style={{
        // Soft radial accent glow tinted per tile.
        backgroundImage: `radial-gradient(120% 100% at 100% 0%, ${tile.accent}14 0%, transparent 60%)`,
      }}
      aria-label={tile.label}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-border/40"
        style={{ backgroundColor: `${tile.accent}20`, color: tile.accent }}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-foreground text-[15px] leading-tight">{tile.label}</h3>
          <Chevron className="w-4 h-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors shrink-0" />
        </div>
        <p className="text-[11.5px] text-muted-foreground/85 leading-snug mt-1 line-clamp-2">
          {tile.description}
        </p>
      </div>
    </motion.button>
  );
}

export default AppTile;