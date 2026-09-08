import { useWindowVirtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { DictionaryEntry } from '../../types';

import { DictionaryCard } from './DictionaryCard';

/**
 * Windowed dictionary grid.
 *
 * The dictionary holds 5,000+ entries. The previous "load more" pager kept
 * every card it had ever shown mounted, so a browsing session grew the DOM
 * without bound until the tab stalled (and, on low-memory phones, was killed).
 *
 * Here only the rows intersecting the viewport (plus a small overscan) exist in
 * the DOM, so memory is flat no matter how far the user scrolls. Rows are
 * measured, not estimated, because a card's height depends on how much
 * grammatical detail an entry carries.
 */

/** Row height estimate before measurement (px). */
const ESTIMATED_ROW = 188;
const OVERSCAN = 4;

interface Props {
  entries: DictionaryEntry[];
  onSelect: (entry: DictionaryEntry) => void;
}

function useColumns(): number {
  const [cols, setCols] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 2 : 1,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => setCols(mq.matches ? 2 : 1);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return cols;
}

export const DictionaryVirtualGrid: React.FC<Props> = ({ entries, onSelect }) => {
  const cols = useColumns();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);

  // The grid is laid out in normal page flow, so the virtualizer needs to know
  // where the list starts relative to the document.
  useEffect(() => {
    const measure = () => {
      const el = listRef.current;
      if (!el) return;
      setOffset(el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cols, entries.length]);

  const rows = useMemo(() => {
    const out: DictionaryEntry[][] = [];
    for (let i = 0; i < entries.length; i += cols) out.push(entries.slice(i, i + cols));
    return out;
  }, [entries, cols]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ESTIMATED_ROW,
    overscan: OVERSCAN,
    scrollMargin: offset,
    getItemKey: (index) => rows[index]?.[0]?.id ?? `row-${index}`,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {items.map((item) => {
        const row = rows[item.index];
        if (!row) return null;
        return (
          <div
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4"
            style={{
              position: 'absolute',
              top: 0,
              insetInlineStart: 0,
              width: '100%',
              transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {row.map((entry) => (
              <DictionaryCard key={entry.id} entry={entry} onSelect={onSelect} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default DictionaryVirtualGrid;
