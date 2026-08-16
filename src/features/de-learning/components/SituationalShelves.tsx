import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Volume2, Sparkles, Check, ChevronDown, BookOpen, Crown, Layers } from '@/lib/icons';
import { GERMAN_SITUATIONAL_SHELVES, SituationalShelf, ShelfItem } from '../data/situationalShelves';

interface SituationalShelvesProps {
  onSelectPracticeItem?: (item: ShelfItem) => void;
  isVipUnlocked?: boolean;
  onOpenVipModal?: () => void;
}

export const SituationalShelves: React.FC<SituationalShelvesProps> = ({
  onSelectPracticeItem,
  isVipUnlocked = true,
  onOpenVipModal,
}) => {
  const [activeShelfId, setActiveShelfId] = useState<string>('berlin-street');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const activeShelf = GERMAN_SITUATIONAL_SHELVES.find((s) => s.id === activeShelfId) || GERMAN_SITUATIONAL_SHELVES[0];

  const handlePlayAudio = (e: React.MouseEvent, item: ShelfItem) => {
    e.stopPropagation();
    setPlayingAudioId(item.id);

    // Speak German via Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.german_text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingAudioId(null), 1200);
    }

    toast.success(`نطق: ${item.german_text}`, {
      duration: 1500,
    });
  };

  return (
    <div className="space-y-6">
      {/* Shelf Header */}
      <div className="flex flex-col gap-2 text-end">
        <div className="flex items-center gap-2 justify-end">
          <span className="px-2.5 py-0.5 rounded-full bg-[hsl(var(--live))]/10 border border-[hsl(var(--live))]/30 text-[hsl(var(--live))] font-tajawal text-micro font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            رفوف التراكيب الحية والظروف
          </span>
        </div>
        <h3 className="font-amiri text-display font-bold text-foreground">
          رفوف ألمانية حرة حسب المواقف والأجواء
        </h3>
        <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
          مواقف وعبارات مصممة بدقة لجيل الشباب والشارع والثقافة المعاصرة. كل عبارة ألمانية بخط سميك بارز مع ترجمة عربية أنيقة ودقيقة.
        </p>
      </div>

      {/* Shelf Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GERMAN_SITUATIONAL_SHELVES.map((shelf) => {
          const isActive = shelf.id === activeShelfId;

          return (
            <button
              key={shelf.id}
              onClick={() => setActiveShelfId(shelf.id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-tajawal text-mini font-bold transition-all duration-300 ${
                isActive
                  ? 'bg-card text-foreground border-[hsl(var(--live))]/50 shadow-md ring-1 ring-[hsl(var(--live))]/20 scale-[1.02]'
                  : 'bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <span className="text-base">{shelf.icon_emoji}</span>
              <span className="font-tajawal">{shelf.title_ar}</span>
              <span className="font-plex-mono text-micro opacity-60">({shelf.items.length})</span>
            </button>
          );
        })}
      </div>

      {/* Active Shelf Information Card */}
      <motion.div
        key={activeShelf.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg border text-micro font-plex-mono font-bold uppercase ${activeShelf.badge_color}`}>
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

        {/* Horizontal Shelf Items Grid */}
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
                    ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/[0.03] shadow-md'
                    : 'border-border/40 bg-background/80 hover:border-border/80 hover:bg-card'
                }`}
              >
                {/* Top Metadata */}
                <div className="flex items-center justify-between pb-2 border-b border-border/25">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handlePlayAudio(e, item)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-[hsl(var(--live))] text-white scale-110 shadow-sm'
                          : 'bg-secondary text-muted-foreground hover:bg-[hsl(var(--live))]/10 hover:text-[hsl(var(--live))]'
                      }`}
                      title="استمع للنطق الأصلي"
                    >
                      <Volume2 className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                    </button>
                    <span className="px-1.5 py-0.5 rounded bg-secondary/80 font-plex-mono text-micro text-muted-foreground font-semibold">
                      {item.cefr_level}
                    </span>
                  </div>

                  <span className="font-tajawal text-micro font-medium text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded border border-border/30">
                    {item.context_tag_ar}
                  </span>
                </div>

                {/* German Phrase (Strict Requirement: BOLD / EXTRABOLD) */}
                <div className="space-y-1.5 pt-3 text-end" dir="ltr">
                  <h4 className="font-plex-mono text-body font-extrabold tracking-wide text-foreground group-hover:text-[hsl(var(--live))] transition-colors">
                    {item.german_text}
                  </h4>
                  {item.phonetic_ipa && (
                    <span className="block font-plex-mono text-micro text-muted-foreground/70 italic">
                      IPA: {item.phonetic_ipa}
                    </span>
                  )}
                </div>

                {/* Arabic Translation (Strict Requirement: SMALL, ELEGANT, CRISP) */}
                <div className="pt-2 text-end" dir="rtl">
                  <p className="font-tajawal text-mini text-muted-foreground font-medium leading-relaxed">
                    {item.arabic_translation}
                  </p>
                </div>

                {/* Expanded Detailed View */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 pt-3 border-t border-border/30 space-y-2 text-end"
                      dir="rtl"
                    >
                      {item.literal_meaning_ar && (
                        <div className="p-2.5 rounded-lg bg-secondary/30 text-mini font-tajawal text-muted-foreground">
                          <span className="font-bold text-foreground">المعنى الحرفي: </span>
                          <span>{item.literal_meaning_ar}</span>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-[hsl(var(--live))]/5 border border-[hsl(var(--live))]/15 space-y-1">
                        <span className="block font-tajawal text-micro font-bold text-[hsl(var(--live))]">
                          💡 سياق الثقافة والاستخدام
                        </span>
                        <p className="font-tajawal text-mini text-foreground/90 leading-relaxed">
                          {item.cultural_note_ar}
                        </p>
                      </div>

                      {onSelectPracticeItem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPracticeItem(item);
                          }}
                          className="w-full mt-2 py-2 rounded-lg bg-[hsl(var(--live))] text-white font-tajawal text-mini font-bold hover:bg-[hsl(var(--live))]/90 transition-all"
                        >
                          تمارين وحفظ متباعد لهذه العبارة
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expand Indicator Icon */}
                <div className="flex justify-center pt-2">
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[hsl(var(--live))]' : ''}`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
