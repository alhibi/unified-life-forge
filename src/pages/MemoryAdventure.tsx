import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Star, Lock, Crown, ChevronRight, Sparkles, Flame } from 'lucide-react';
import { STAGES, loadAdventure, isStageUnlocked, AdventureStage } from '@/data/memoryAdventure';
import { playSfx, vibrate } from '@/utils/gameFeedback';

// =============================================================================
// Stage select hub: a vertical island chain. Each stage is a pin with its
// star rating; unlocked stages glow, locked ones are dimmed. Tapping a stage
// opens a brief that explains the twist before the player commits.
// =============================================================================

const TWIST_LABELS: Record<string, { ar: string; de: string; emoji: string }> = {
  plain:         { ar: 'كلاسيكي',         de: 'Klassisch',     emoji: '🎴' },
  shrinkingPeek: { ar: 'لمحة سريعة',       de: 'Kurze Vorschau', emoji: '👁️' },
  shuffleEvery5: { ar: 'خلط كل 5 حركات',   de: 'Mischen alle 5', emoji: '🌪️' },
  fogOfMemory:   { ar: 'ضباب الذاكرة',     de: 'Gedächtnisnebel', emoji: '🌫️' },
  doubleVision:  { ar: 'رؤية مزدوجة',      de: 'Doppelte Sicht', emoji: '👯' },
  mirrorMatch:   { ar: 'مطابقة المرآة',    de: 'Spiegelpaar',    emoji: '🪞' },
  silentMode:    { ar: 'صمت تام',          de: 'Stille',          emoji: '🤫' },
  chainBonus:    { ar: 'كومبو إجباري',     de: 'Combo-Pflicht',  emoji: '⚡' },
  darkness:      { ar: 'ظلام',              de: 'Dunkelheit',     emoji: '🕯️' },
  speedrun:      { ar: 'سباق زمن',          de: 'Wettlauf',        emoji: '⏱️' },
};

export default function MemoryAdventurePage() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const [save] = useState(loadAdventure);
  const [selected, setSelected] = useState<AdventureStage | null>(null);

  const totalStars = useMemo(
    () => Object.values(save.stars).reduce((s, n) => s + (n || 0), 0),
    [save],
  );
  const maxStars = STAGES.length * 3;

  const startStage = (stage: AdventureStage) => {
    playSfx('click'); vibrate(15);
    navigate(`/games/memory?adventure=${stage.id}`);
  };

  return (
    <GameShell
      title={isAr ? 'مغامرة الذاكرة' : 'Memory-Abenteuer'}
      icon={Map}
      accentColor="#ec4899"
      rules={isAr ? [
        '15 محطة بقصص وقواعد متغيرة',
        'كل محطة تتطلب تكتيك مختلف',
        'احصل على 3 نجوم بإكمالها سريعاً وبأقل أخطاء',
        '3 محطات بوس بقواعد مختلطة',
        'افتح المحطة التالية بإكمال السابقة',
      ] : [
        '15 Etappen mit Geschichten + Regeln',
        'Jede braucht andere Taktik',
        '3 Sterne: schnell + wenige Fehler',
        '3 Bossstufen mit Mix-Regeln',
        'Schalte nächste durch Sieg frei',
      ]}
      stats={[
        { label: isAr ? 'محطة' : 'Etappe', value: `${save.highestCleared}/${STAGES.length}` },
        { label: isAr ? 'نجوم' : 'Sterne', value: `${totalStars}/${maxStars}` },
        { label: isAr ? 'بوس مهزوم' : 'Bosse', value: STAGES.filter(s => s.isBoss && save.stars[s.id]).length },
      ]}
      options={[]}
    >
      {/* Progress arc */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-pink-500/25 bg-pink-500/5 p-4 mb-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-pink-200/80">
              {isAr ? 'التقدم في المغامرة' : 'Abenteuer-Fortschritt'}
            </p>
            <p className="text-2xl font-black text-pink-200 tabular-nums">{totalStars} ★</p>
          </div>
          <Crown className={`w-9 h-9 ${totalStars >= maxStars ? 'text-amber-400' : 'text-pink-400/40'} stroke-[1.5]`} />
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-amber-400"
            animate={{ width: `${(totalStars / maxStars) * 100}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
      </motion.div>

      {/* Island chain — each stage is a row with a connector line drawn behind */}
      <div className="relative pl-3">
        {/* Vertical guide line */}
        <div className="absolute left-[18px] top-3 bottom-3 w-px bg-gradient-to-b from-pink-500/40 via-pink-500/20 to-pink-500/5" />

        {STAGES.map((stage, idx) => {
          const unlocked = isStageUnlocked(stage.id, save);
          const stars = save.stars[stage.id] || 0;
          const isCurrent = stage.id === save.highestCleared + 1;
          const twist = TWIST_LABELS[stage.twist];

          return (
            <motion.button
              key={stage.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => unlocked && setSelected(stage)}
              disabled={!unlocked}
              className={`relative w-full flex items-center gap-3 py-2 pl-1 pr-2 rounded-2xl mb-1.5 transition-all ${
                isCurrent
                  ? 'bg-pink-500/15 ring-1 ring-pink-400/40'
                  : stars > 0
                    ? 'bg-emerald-500/5'
                    : unlocked
                      ? 'bg-card/40 hover:bg-pink-500/5'
                      : 'opacity-50 cursor-not-allowed'
              } ${unlocked ? 'active:scale-[0.99]' : ''}`}
            >
              {/* Pin */}
              <div className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 ${
                stage.isBoss
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-300/40'
                  : isCurrent
                    ? 'bg-pink-500 ring-2 ring-pink-300/40 shadow-lg shadow-pink-500/40'
                    : stars > 0
                      ? 'bg-emerald-500/30 ring-1 ring-emerald-400/40'
                      : unlocked
                        ? 'bg-pink-500/15 ring-1 ring-pink-400/30'
                        : 'bg-zinc-800'
              }`}>
                {!unlocked
                  ? <Lock className="w-4 h-4 text-zinc-500" />
                  : <span className={`text-xs font-black ${stage.isBoss ? 'text-amber-950' : isCurrent ? 'text-white' : 'text-foreground'}`}>{stage.id}</span>
                }
              </div>

              {/* Body */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className={`text-sm font-bold truncate ${unlocked ? 'text-foreground' : 'text-foreground/40'}`}>
                    {isAr ? stage.ar : stage.de}
                  </h3>
                  {stage.isBoss && <Flame className="w-3 h-3 text-amber-400 shrink-0" />}
                </div>
                {unlocked && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px]">{twist.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isAr ? twist.ar : twist.de} · {stage.pairs} {isAr ? 'زوج' : 'Paare'}
                    </span>
                  </div>
                )}
              </div>

              {/* Stars + chevron */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(n => (
                    <Star key={n} className={`w-3 h-3 ${
                      n <= stars ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                    }`} />
                  ))}
                </div>
                <ChevronRight className={`w-4 h-4 ${unlocked ? 'text-foreground/50' : 'text-zinc-700'}`} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Stage briefing modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl border p-5 ${
                selected.isBoss
                  ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-card'
                  : 'border-pink-500/30 bg-card'
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                  selected.isBoss ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-pink-500/20'
                }`}>
                  {selected.isBoss ? '👑' : selected.id}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-pink-300/80 font-bold">
                    {isAr ? `المحطة ${selected.id}` : `Etappe ${selected.id}`}
                    {selected.isBoss && (isAr ? ' · بوس' : ' · Boss')}
                  </p>
                  <h3 className="text-base font-black text-foreground">
                    {isAr ? selected.ar : selected.de}
                  </h3>
                </div>
              </div>

              {/* Story */}
              <p className="text-sm text-foreground/85 leading-relaxed mb-4 italic">
                "{isAr ? selected.storyAr : selected.storyDe}"
              </p>

              {/* Mechanics card */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Pill emoji={TWIST_LABELS[selected.twist].emoji} label={isAr ? TWIST_LABELS[selected.twist].ar : TWIST_LABELS[selected.twist].de} />
                <Pill emoji="🎴" label={`${selected.pairs} ${isAr ? 'زوج' : 'Paare'}`} />
                <Pill emoji="⏱️" label={`${selected.threeStarTime}s`} />
                <Pill emoji="❌" label={`≤${selected.starMistakeBudget} ${isAr ? 'خطأ' : 'Fehler'}`} />
              </div>

              {/* Best record if any */}
              {save.stars[selected.id] && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 mb-3 flex items-center justify-between text-xs">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(n => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= (save.stars[selected.id] || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                    ))}
                  </div>
                  {save.bestTimes[selected.id] && (
                    <span className="font-mono text-emerald-300 font-bold">
                      {save.bestTimes[selected.id]}s
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-foreground font-bold text-sm"
                >
                  {isAr ? 'إلغاء' : 'Abbrechen'}
                </button>
                <button
                  onClick={() => startStage(selected)}
                  className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 ${
                    selected.isBoss
                      ? 'text-amber-950'
                      : 'text-pink-950'
                  }`}
                  style={{
                    background: selected.isBoss
                      ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                      : 'linear-gradient(135deg, #f472b6, #ec4899)',
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  {isAr ? 'ابدأ' : 'Spielen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}

function Pill({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5">
      <span className="text-sm">{emoji}</span>
      <span className="text-[11px] font-medium text-foreground/80 truncate">{label}</span>
    </div>
  );
}
