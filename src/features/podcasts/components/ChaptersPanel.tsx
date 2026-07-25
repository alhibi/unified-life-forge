/**
 * ChaptersPanel — the episode's table of contents.
 *
 * Two pieces, both isolated from the rest of the player on purpose:
 *
 *  • `CurrentChapterLine` subscribes to the 4 Hz progress tick and renders one
 *    line. Putting it in its own component means the whole player hero does not
 *    re-render four times a second just to keep a chapter label fresh.
 *  • `ChaptersPanel` is the jump list, opened on demand. Rendered/unrendered
 *    rather than height-animated — animating height relayouts the sheet on every
 *    frame, which the design system forbids.
 *
 * The active row auto-scrolls into view when the panel opens, because a
 * two-hour episode has enough chapters that the current one is usually off
 * screen, and hunting for it defeats the purpose.
 */
import { memo, useEffect, useMemo, useRef } from 'react';

import { usePodcastPlayerProgress } from '@/features/podcasts/contexts/PodcastPlayerContext';
import {
  type Chapter,
  chapterEnd,
  chapterIndexAt,
  formatChapterTime,
} from '@/features/podcasts/lib/chapters';
import { List, Play } from '@/lib/icons';
import { cn } from '@/lib/utils';

/** One line under the episode title: "٣ من ١٢ · الضيف". */
export const CurrentChapterLine = memo(function CurrentChapterLine({
  chapters,
}: {
  chapters: readonly Chapter[];
}) {
  const { position } = usePodcastPlayerProgress();
  const index = chapterIndexAt(chapters, position);
  if (chapters.length === 0 || index < 0) return null;
  return (
    <p className="mt-1 text-mini text-foreground/70">
      <span className="tabular-nums" dir="ltr">
        {index + 1}/{chapters.length}
      </span>
      <span className="mx-1.5 opacity-50">·</span>
      {chapters[index].title}
    </p>
  );
});

interface Props {
  chapters: readonly Chapter[];
  /** Episode duration in seconds; used to bound the last chapter. */
  durationSeconds: number;
  onSeek: (seconds: number) => void;
  open: boolean;
  onToggle: () => void;
}

function ChaptersPanelImpl({ chapters, durationSeconds, onSeek, open, onToggle }: Props) {
  const { position } = usePodcastPlayerProgress();
  const activeIndex = chapterIndexAt(chapters, position);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const rows = useMemo(
    () =>
      chapters.map((chapter, index) => ({
        chapter,
        index,
        end: chapterEnd(chapters, index, durationSeconds),
      })),
    [chapters, durationSeconds],
  );

  if (chapters.length === 0) return null;

  return (
    <div className="px-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mx-auto flex h-11 items-center gap-1.5 rounded-button border border-border px-3 text-meta font-semibold text-foreground transition-colors duration-fast hover:bg-muted"
      >
        <List className="h-4 w-4" aria-hidden />
        الفصول
        <span className="tabular-nums opacity-60" dir="ltr">
          {chapters.length}
        </span>
      </button>

      {open && (
        <ul ref={listRef} className="mt-3 max-h-64 space-y-1 overflow-y-auto" aria-label="فصول الحلقة">
          {rows.map(({ chapter, index, end }) => {
            const active = index === activeIndex;
            return (
              <li key={`${chapter.start}-${chapter.title}`} ref={active ? activeRef : undefined}>
                <button
                  type="button"
                  onClick={() => onSeek(chapter.start)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-md border p-2.5 text-start',
                    'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'border-primary/60 bg-accent/40' : 'border-transparent hover:bg-muted/60',
                  )}
                >
                  <span
                    className={cn(
                      'w-14 shrink-0 text-mini tabular-nums',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                    dir="ltr"
                  >
                    {formatChapterTime(chapter.start)}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-meta',
                      active ? 'font-semibold text-foreground' : 'text-foreground/85',
                    )}
                  >
                    {chapter.title}
                  </span>
                  <span className="shrink-0 text-micro tabular-nums text-muted-foreground" dir="ltr">
                    {formatChapterTime(Math.max(0, end - chapter.start))}
                  </span>
                  {active && <Play className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const ChaptersPanel = memo(ChaptersPanelImpl);
export default ChaptersPanel;
