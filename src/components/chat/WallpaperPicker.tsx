import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { WALLPAPERS } from './constants';

interface WallpaperPickerProps {
  currentId: string;
  onClose: () => void;
  onPick: (id: string) => void;
}

const WallpaperPicker: React.FC<WallpaperPickerProps> = ({ currentId, onClose, onPick }) => {
  const BackIcon = ChevronRight;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-[70] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 z-[71] bg-background rounded-t-3xl flex flex-col max-h-[75%] "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-border/40 mt-2 mb-1" />
        <div className="px-4 h-14 flex items-center justify-between border-b border-border/15">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors">
              <BackIcon className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-[16px] font-semibold">{'خلفية المحادثة'}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2.5">
            {WALLPAPERS.map(wp => {
              const selected = wp.id === currentId;
              return (
                <button
                  key={wp.id}
                  onClick={() => onPick(wp.id)}
                  className={cn(
                    'relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all active:scale-95',
                    selected ? 'border-primary ' : 'border-border/15'
                  )}
                  style={{ background: wp.background }}
                >
                  {/* Fake message bubbles preview */}
                  <div className="absolute inset-0 p-2 flex flex-col justify-end gap-1.5">
                    <div className={cn('self-start rounded-2xl rounded-bl-sm px-2 py-1 text-[10px] max-w-[70%]', wp.isDark ? 'bg-white/15 text-white/90' : 'bg-white/90 text-foreground')}>
                      {'مرحبا'}
                    </div>
                    <div className="self-end rounded-2xl rounded-br-sm px-2 py-1 text-[10px] bg-primary/80 text-primary-foreground max-w-[70%]">
                      {'أهلاً بك'}
                    </div>
                  </div>
                  {selected && (
                    <div className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center ">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className={cn(
                    'absolute inset-x-0 bottom-0 py-1 text-[10px] font-medium text-center',
                    wp.isDark ? 'bg-black/40 text-white/90' : 'bg-white/80 text-foreground/80'
                  )}>
                    {wp.labelAr}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WallpaperPicker;
