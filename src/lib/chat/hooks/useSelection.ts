// useSelection — multi-select state for batch actions on messages
// (forward several at once, copy several, bulk-delete-for-me).
//
// Cleared whenever the active chat changes so a stale selection never
// leaks across rooms.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseSelectionResult<T> {
  /** Set of selected ids (stable reference between toggles for === checks). */
  selectedIds: ReadonlySet<string>;
  selectionMode: boolean;
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clear: () => void;
  /** Filter helper: returns the items whose id is currently selected. */
  pick: (items: T[], idOf: (item: T) => string) => T[];
}

/**
 * `resetKey` is a stable identifier (like the active chat id). Whenever it
 * changes, the selection clears. Pass a constant to opt out of auto-reset.
 */
export function useSelection<T>(resetKey: string | null | undefined): UseSelectionResult<T> {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const lastKeyRef = useRef(resetKey);

  useEffect(() => {
    if (lastKeyRef.current !== resetKey) {
      lastKeyRef.current = resetKey;
      setSelected(new Set());
    }
  }, [resetKey]);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const select = useCallback((id: string) => {
    setSelected(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const deselect = useCallback((id: string) => {
    setSelected(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((ids: string[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const pick = useCallback((items: T[], idOf: (item: T) => string): T[] => {
    return items.filter(it => selected.has(idOf(it)));
  }, [selected]);

  return useMemo(() => ({
    selectedIds:   selected,
    selectionMode: selected.size > 0,
    count:         selected.size,
    isSelected, toggle, select, deselect, selectMany, clear, pick,
  }), [selected, isSelected, toggle, select, deselect, selectMany, clear, pick]);
}
