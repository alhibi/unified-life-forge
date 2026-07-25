// Queue (Up Next) management sheet.
//
// Slid up from the bottom of the full player sheet. Shows the
// current queue with drag-, swipe-, and a
// "Clear all" action. Designed as a companion to `PlayerSheet`
// — the two share the same ambient backdrop and theme tokens.
//
// Layout:
//   • Header: "Up Next" title + queue count + "Clear all" button
//   • List: stack of episode rows, each with artwork, title,
//     podcast name, and a remove (✕) button
//   • Empty state: illustration + "Queue is empty" message
//   • Add- CTA when queue is empty: "Browse podcasts"

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { usePodcastPlayer } from '@/features/podcasts/contexts/PodcastPlayerContext';
import { upgradeArtwork } from '@/features/podcasts/lib/itunes';
import { ChevronDown, ChevronUp, ListMusic, Music, Trash2, X } from '@/lib/icons';

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
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card w-full max-w-md max-h-[70vh] rounded-t-3xl flex flex-col"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-foreground" />
              <h2 className="text-base font-bold text-foreground">
                {'قائمة التشغيل'}
              </h2>
              {items.length > 0 && (
                <span className="text-[0.6875rem] text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 px-2.5 h-8 rounded-full text-[0.75rem] font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {'مسح الكل'}
                  </span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/60"
                aria-label={'إغلاق'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                  <Music className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {'قائمة التشغيل فارغة'}
                </p>
                <p className="text-[0.75rem] text-muted-foreground mb-1 max-w-xs">
                  {'أضف حلقات إلى قائمة التشغيل لتستمع إليها بالترتيب.'}
                </p>
                <button
                  onClick={onClose}
                  className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  {'تصفح البودكاست'}
                </button>
              </div>
            ) : (
              <div className="py-2">
                {/* Now playing indicator */}
                {player.current && (
                  <div className="px-4 py-3 mb-1">
                    <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                      {'يُشغّل الآن'}
                    </p>
                  </div>
                )}
                {items.map((item, index) => {
                  const artwork = item.episode.imageUrl || item.podcastImageUrl;
                  const canMoveUp = index > 0;
                  const canMoveDown = index < items.length - 1;
                  return (
                    <div
                      key={item.episode.id}
                      className="flex items-center gap-3 px-4 py-2.5 transition-all"
                    >
                      {/* Move up / down — touch-friendly replacement
                          for HTML5 drag (which doesn't fire on mobile). */}
                      <div className="flex flex-col items-center justify-center shrink-0 -my-1">
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
                      </div>

                      {/* Index */}
                      <span className="text-[0.6875rem] text-muted-foreground tabular-nums w-5 text-center shrink-0">
                        {index + 1}
                      </span>

                      {/* Artwork */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted/40 shrink-0">
                        {artwork && (
                          <img
                            src={upgradeArtwork(artwork, 100)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Title + podcast name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8125rem] font-semibold text-foreground leading-tight truncate">
                          {item.episode.title}
                        </p>
                        <p className="text-[0.6875rem] text-muted-foreground leading-tight truncate">
                          {item.podcastTitle}
                        </p>
                      </div>

                      {/* Duration */}
                      {item.episode.duration > 0 && (
                        <span className="text-[0.6875rem] text-muted-foreground tabular-nums shrink-0">
                          {formatDurationShort(item.episode.duration)}
                        </span>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemove(item.episode.id)}
                        aria-label={'إزالة'}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

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
