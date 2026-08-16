import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Volume2, Sparkles, ChevronDown, CheckCircle, Flame } from '@/lib/icons';
import { GERMAN_GENZ_SHELVES, GenZShelf, GenZShelfItem } from '../data/genzGermanData';

export const DeutschGenZShelves: React.FC = () => {
  const [activeShelfId, setActiveShelfId] = useState<string>('street-slang');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const activeShelf = GERMAN_GENZ_SHELVES.find((s) => s.id === activeShelfId) || GERMAN_GENZ_SHELVES[0];

  const handleSpeakGerman = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    setPlayingAudioId(id);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingAudioId(null), 1200);
    }

    toast.success(`نطق: ${text}`, { duration: 1500 });
  };

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div className="text-end space-y-1">
        <div className="flex items-center gap-2 justify-end">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-tajawal text-micro font-bold uppercase tracking-wider flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-400" />
            رفوف الشارع والحياة اليومية
          </span>
        </div>
        <h3 className="font-amiri text-display font-bold text-foreground">
          الرفوف الألمانية الحية لجيل زد والشباب
        </h3>
        <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
          كلمات ومصطلحات وعبارات معاصرة مقسمة حسب الظروف والمواقف. كل عبارة ألمانية مكتوبة بخط سميك وترجمتها بخط صغير أنيق وواضح.
        </p>
      </div>

      {/* Category Tabs Carousel */}
      <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GERMAN_GENZ_SHELVES.map((shelf) => {
          const isActive = shelf.id === activeShelfId;

          return (
            <button
              key={shelf.id}
              onClick={() => {
                setActiveShelfId(shelf.id);
                setExpandedItemId(null);
              }}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border font-tajawal text-mini font-bold transition-all duration-300 ${
                isActive
                  ? 'bg-card text-foreground border-amber-500/50 shadow-md ring-1 ring-amber-500/20 scale-[1.02]'
                  : 'bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <span className="text-base">{shelf.icon_emoji}</span>
              <span>{shelf.title_ar}</span>
            </button>
          );
        })}
      </div>

      {/* Active Shelf Container */}
      <motion.div
        key={activeShelf.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg border text-micro font-plex-mono font-bold uppercase bg-secondary/50 ${activeShelf.theme_gradient}`}>
            {activeShelf.title_de}
          </span>
          <div className="flex items-center gap-2 text-end">
            <span className="font-tajawal text-meta font-bold text-foreground">{activeShelf.title_ar}</span>
            <span className="text-xl">{activeShelf.icon_emoji}</span>
          </div>
        </div>

        <p className="font-tajawal text-mini text-muted-foreground text-end leading-relaxed">
          {activeShelf.subtitle_ar}
        </p>

        {/* Shelf Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {activeShelf.items.map((item, idx) => {
            const isExpanded = expandedItemId === item.id;
            const isPlaying = playingAudioId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
                  isExpanded
                    ? 'border-amber-500/60 bg-amber-500/[0.03] shadow-md'
                    : 'border-border/40 bg-background/80 hover:border-border/80 hover:bg-card'
                }`}
              >
                {/* Header Badge & Audio */}
                <div className="flex items-center justify-between pb-2 border-b border-border/25">
                  <button
                    onClick={(e) => handleSpeakGerman(e, item.german_text, item.id)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      isPlaying
                        ? 'bg-amber-500 text-slate-950 scale-110 shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:bg-amber-500/20 hover:text-amber-400'
                    }`}
                    title="نطق ألماني أصلي"
                  >
                    <Volume2 className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                  </button>

                  <span className="font-tajawal text-micro font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {item.badge_label}
                  </span>
                </div>

                {/* German Text (Strict Rule: BOLD / EXTRABOLD) */}
                <div className="space-y-1 pt-3 text-end" dir="ltr">
                  <h4 className="font-plex-mono text-body font-extrabold tracking-wide text-foreground group-hover:text-amber-400 transition-colors">
                    {item.german_text}
                  </h4>
                  {item.phonetic_ipa && (
                    <span className="block font-plex-mono text-micro text-muted-foreground/70 italic">
                      IPA: {item.phonetic_ipa}
                    </span>
                  )}
                </div>

                {/* Arabic Translation (Strict Rule: SMALL, ELEGANT, CRISP) */}
                <div className="pt-2 text-end" dir="rtl">
                  <p className="font-tajawal text-mini text-muted-foreground font-medium leading-relaxed">
                    {item.arabic_translation}
                  </p>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-border/30 space-y-2 text-end"
                      dir="rtl"
                    >
                      {item.literal_meaning_ar && (
                        <div className="p-2.5 rounded-lg bg-secondary/30 text-mini font-tajawal text-muted-foreground">
                          <span className="font-bold text-foreground">المعنى الحرفي: </span>
                          <span>{item.literal_meaning_ar}</span>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1">
                        <span className="block font-tajawal text-micro font-bold text-amber-400">
                          💡 سياق الثقافة والاستخدام
                        </span>
                        <p className="font-tajawal text-mini text-foreground/90 leading-relaxed">
                          {item.cultural_note_ar}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-center pt-2">
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
