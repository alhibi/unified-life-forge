// Queue (Up Next) management sheet.
//
// Slid up from the bottom of the full player sheet. Shows the
// current queue with reorder (up/down), remove and a "Clear all" action.
// Companion to `PlayerSheet` — both sit on the canonical card surface;
// the old shared "ambient backdrop" treatment was removed in the unified
// design-system pass (decorative blur/gradients are not allowed in chrome).
//
// Layout:
//   • Header: "قائمة التشغيل" title + queue count + "مسح الكل" + close
//   • List: AppList of AppRows (reorder, index, artwork, title, duration, remove)
//   • Empty state: <StateView> with a "تصفح البودكاست" action

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { AppList, AppRow, IconButton } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { usePodcastPlayer } from '@/features/podcasts/contexts/PodcastPlayerContext';
import { upgradeArtwork } from '@/features/podcasts/lib/itunes';
import { ChevronDown, ChevronUp, ListMusic, Trash2, X } from '@/lib/icons';

interface QueueSheetProps {
  open: boolean;
  onClose: () => void;
}

function formatDurationShort(durationSec: number): string {
  if (!durationSec || durationSec < 0) return '';
  const m = Math.floor(durationSec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}min`;
}

export default function QueueSheet({ open, onClose }: QueueSheetProps) {
  const player = usePodcastPlayer();

  const items = player.queueItems;

  const handleRemove = (episodeId: string) => {
    player.removeFromQueue(episodeId);
  };

  const handleClear = () => {
    player.clearQueue();
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-queue flex items-end justify-center"
        style={{ background: 'hsl(var(--scrim) / 0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="app-card app-card-bare w-full max-w-md max-h-[70vh] rounded-t-3xl rounded-b-none flex flex-col"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-foreground" />
              <h2 className="text-body font-bold text-foreground">
                {'قائمة التشغيل'}
              </h2>
              {items.length > 0 && (
                <span className="text-micro text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {'مسح الكل'}
                  </span>
                </Button>
              )}
              <IconButton onClick={onClose} aria-label={'إغلاق'}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {items.length === 0 ? (
              <StateView
                kind="empty"
                title={'قائمة التشغيل فارغة'}
                body={'أضف حلقات إلى قائمة التشغيل لتستمع إليها بالترتيب.'}
                action={{ label: 'تصفح البودكاست', onClick: onClose }}
                className="my-6"
              />
            ) : (
              <div className="pb-2">
                {/* Now playing indicator */}
                {player.current && (
                  <p className="px-1 pb-2 pt-1 text-micro uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                    {'يُشغّل الآن'}
                  </p>
                )}
                <AppList>
                  {items.map((item, index) => {
                    const artwork = item.episode.imageUrl || item.podcastImageUrl;
                    const canMoveUp = index > 0;
                    const canMoveDown = index < items.length - 1;
                    return (
                      <AppRow
                        key={item.episode.id}
                        as="div"
                        leading={
                          <span className="flex items-center gap-2">
                            {/* Move up / down — touch-friendly replacement
                                for HTML5 drag (which doesn't fire on mobile). */}
                            <span className="flex flex-col items-center justify-center -my-1">
                              <button
                                type="button"
                                onClick={() => canMoveUp && player.reorderQueue(index, index - 1)}
                                disabled={!canMoveUp}
                                aria-label={'تحريك للأعلى'}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => canMoveDown && player.reorderQueue(index, index + 1)}
                                disabled={!canMoveDown}
                                aria-label={'تحريك للأسفل'}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </span>

                            {/* Index */}
                            <span className="text-micro text-muted-foreground tabular-nums w-5 text-center shrink-0">
                              {index + 1}
                            </span>

                            {/* Artwork */}
                            <span className="w-11 h-11 rounded-xl overflow-hidden bg-muted/40 shrink-0">
                              {artwork && (
                                <img
                                  src={upgradeArtwork(artwork, 100)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </span>
                          </span>
                        }
                        title={item.episode.title}
                        subtitle={item.podcastTitle}
                        value={
                          item.episode.duration > 0
                            ? formatDurationShort(item.episode.duration)
                            : undefined
                        }
                      >
                        {/* Remove button */}
                        <button
                          onClick={() => handleRemove(item.episode.id)}
                          aria-label={'إزالة'}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </AppRow>
                    );
                  })}
                </AppList>

                {/* Bottom padding */}
                <div className="h-4" />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
