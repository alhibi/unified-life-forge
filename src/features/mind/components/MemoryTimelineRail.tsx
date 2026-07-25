import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import type { MindEvent,MindNote } from '../hooks/useMindState';

type Row =
  | { kind: 'year'; year: number }
  | { kind: 'note'; note: MindNote }
  | { kind: 'event'; event: MindEvent };

export default function MemoryTimelineRail({
  notes,
  events,
  activeIds,
  onHover,
  onLeave,
  onSelect,
}: {
  notes: MindNote[];
  events: MindEvent[];
  activeIds: string[];
  onHover: (ids: string[]) => void;
  onLeave: () => void;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rows: Row[] = useMemo(() => {
    // Merge notes + events, sort newest first, insert year headers as we go.
    type Entry = { at: number; row: Row };
    const merged: Entry[] = [
      ...notes.map<Entry>((n) => ({ at: n.createdAt, row: { kind: 'note', note: n } })),
      ...events.map<Entry>((e) => ({ at: e.createdAt, row: { kind: 'event', event: e } })),
    ].sort((a, b) => b.at - a.at);
    const out: Row[] = [];
    let lastYear: number | null = null;
    for (const m of merged) {
      const y = new Date(m.at).getFullYear();
      if (y !== lastYear) {
        out.push({ kind: 'year', year: y });
        lastYear = y;
      }
      out.push(m.row);
    }
    return out;
  }, [notes, events]);

  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (rows[i].kind === 'year' ? 24 : rows[i].kind === 'event' ? 26 : 44),
    overscan: 8,
  });

  return (
    <div
      className={cn(
        'shrink-0 h-full transition-[width] duration-300 ease-out',
        expanded ? 'w-[260px]' : 'w-[88px]',
      )}
    >
      <div className="h-full rounded-2xl border border-white/10 bg-black/80 flex flex-col overflow-hidden">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] tracking-[0.2em] uppercase text-[color:#F2E7C9]/60 px-3 py-2 text-start hover:text-[color:#F2E7C9]/90 transition-colors"
        >
          {expanded ? 'طيّ' : 'الذاكرة'}
        </button>
        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin"
          onMouseLeave={onLeave}
        >
          <div style={{ height: virt.getTotalSize(), width: '100%', position: 'relative' }}>
            {virt.getVirtualItems().map((v) => {
              const row = rows[v.index];
              return (
                <div
                  key={v.key}
                  data-index={v.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    insetInlineStart: 0,
                    width: '100%',
                    transform: `translateY(${v.start}px)`,
                    height: v.size,
                  }}
                >
                  {row.kind === 'year' ? (
                    <div className="text-[10px] tracking-[0.25em] uppercase text-[color:#C9A84C]/50 px-3 pt-2">
                      {row.year}
                    </div>
                  ) : row.kind === 'note' ? (
                    <button
                      onMouseEnter={() => onHover([row.note.id])}
                      onFocus={() => onHover([row.note.id])}
                      onClick={() => {
                        onSelect(row.note.id);
                        onHover([row.note.id]);
                      }}
                      className={cn(
                        'w-full border-s-2 text-start px-3 py-1.5 flex items-center gap-2 group transition-colors',
                        activeIds.includes(row.note.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-white/[0.04]',
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0 transition-transform',
                          activeIds.includes(row.note.id) && 'scale-125 ring-2 ring-primary/30',
                        )}
                        style={{
                          background: row.note.hemisphere === 'organic' ? '#FFC9A0' : '#C9A84C',
                        }}
                      />
                      <span className="flex-1 min-w-0">
                        <span
                          className={cn(
                            'block text-[11px] leading-tight truncate',
                            'text-[color:#F2E7C9]/85 group-hover:text-[color:#F2E7C9]',
                          )}
                          style={{ fontFamily: '"Cormorant Garamond", serif' }}
                        >
                          {row.note.title || 'بدون عنوان'}
                        </span>
                        {expanded && (
                          <span
                            className="block text-[10px] text-[color:#F2E7C9]/40 mt-0.5"
                            style={{ fontFamily: '"IBM Plex Mono", monospace' }}
                          >
                            {new Date(row.note.createdAt).toLocaleDateString('ar')}
                          </span>
                        )}
                      </span>
                    </button>
                  ) : (
                    <button
                      onMouseEnter={() => onHover(row.event.relatedNoteIds)}
                      onFocus={() => onHover(row.event.relatedNoteIds)}
                      onClick={() => onHover(row.event.relatedNoteIds)}
                      title={row.event.summary}
                      className="w-full flex items-center gap-2 px-3 py-1 group"
                    >
                      <span className="w-1 h-1 rounded-full shrink-0 bg-[color:#F2E7C9]" />
                      {expanded && (
                        <span className="flex-1 text-[10px] text-[color:#F2E7C9]/50 truncate italic">
                          {row.event.summary}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
