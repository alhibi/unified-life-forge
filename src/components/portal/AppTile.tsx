/**
 * AppTile — launcher tile in the modkeys idiom.
 *
 * Quoted from the `.bcard` component of `thebuggeddev/modkeys`:
 *   flat `--card` surface, 15px radius, 1.5px transparent border that
 *   turns `--ink` when selected (surface flips to `--panel`), a filled
 *   ink check dot in the corner, -2px hover lift, monochrome hairline
 *   glyph on a `--card2` chip, and a tiny wide-tracked caps caption.
 *
 * No per-tile colour: in modkeys colour lives in the product, never in
 * the chrome — so the seven apps are separated by type and weight only.
 */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MkCheck } from './MkIcons';

export interface AppTileDef {
  key: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  description: string;
  /** Wide-tracked latin caption under the title (modkeys micro-caps). */
  caption: string;
  /** Filter group used by the stage pills. */
  cat: string;
}

interface Props {
  tile: AppTileDef;
  index: number;
  selected: boolean;
  list?: boolean;
  onOpen: () => void;
  onSelect: () => void;
}

export function AppTile({ tile, index, selected, list, onOpen, onSelect }: Props) {
  const Icon = tile.icon;
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 + index * 0.035, duration: 0.3, ease: [0.6, 0.05, 0.2, 1] }}
      onClick={onOpen}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      className={`mk-tile${selected ? ' on' : ''}`}
      aria-label={tile.label}
      aria-current={selected ? 'true' : undefined}
    >
      <span className="mk-tile-ic">
        <Icon size={21} />
      </span>

      <span className="block">
        <span className="nm block">{tile.label}</span>
        <span className="tg block">{tile.description}</span>
        {!list && <span className="cap block">{tile.caption}</span>}
      </span>

      <span className="chk" aria-hidden>
        <MkCheck size={12} />
      </span>
    </motion.button>
  );
}

export default AppTile;
