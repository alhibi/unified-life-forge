import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import GameShell from '@/features/games/components/GameShell';
import { BotPersonality,BOTS } from '@/features/games/data/chessBots';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';
import { Check, ChevronRight, Crown, Lock, Sparkles,Swords, Trophy } from '@/lib/icons';

// =============================================================================
// Career-mode storage
// =============================================================================
// We persist the player's progress as the highest rank index they've defeated
// (-1 means nothing defeated yet, so only rank 0 is unlocked).
// We also store per-bot best result so the player can see their proudest win.
// =============================================================================
interface CareerStats {
  /** highest rank fully defeated (so unlocked = beaten + 1) */
  highestDefeated: number;
  /** map of botId -> { wins, losses, draws } */
  records: Record<string, { wins: number; losses: number; draws: number }>;
  /** ELO of the player, derived from results vs known-Elo bots */
  rating: number;
}
const DEFAULT_CAREER: CareerStats = {
  highestDefeated: -1,
  records: {},
  rating: 800,
};
const KEY = 'chess-career';

function loadCareer(): CareerStats {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      ...DEFAULT_CAREER, ...s,
      records: s.records || {},
    };
  } catch { return { ...DEFAULT_CAREER }; }
}
import { isSupabaseConfigured } from '@/integrations/supabase/client';

import { getGameProgress,saveGameProgress } from '../api';

export function saveCareer(s: CareerStats) {
  localStorage.setItem(KEY, JSON.stringify(s));
  if (isSupabaseConfigured) {
    saveGameProgress('chess-career', s).catch(console.error);
  }
}

// Public hook used by Chess.tsx when a career game ends. We expose this from
// here so the persistence shape stays in one place.
export function recordCareerResult(botId: string, result: 'win' | 'loss' | 'draw') {
  const s = loadCareer();
  const idx = BOTS.findIndex(b => b.id === botId);
  if (idx < 0) return;
  const bot = BOTS[idx];
  const rec = s.records[botId] || { wins: 0, losses: 0, draws: 0 };
  if (result === 'win') rec.wins++;
  else if (result === 'loss') rec.losses++;
  else rec.draws++;
  s.records[botId] = rec;

  // Unlock the next rank only on first win against this bot.
  if (result === 'win' && idx > s.highestDefeated) s.highestDefeated = idx;

  // Glicko-lite rating update against bot's Elo.
  const k = 24;
  const expected = 1 / (1 + Math.pow(10, (bot.elo - s.rating) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  s.rating = Math.round(s.rating + k * (score - expected));
  saveCareer(s);
}

// =============================================================================
// Component
// =============================================================================
export default function ChessCareerPage() {
  const navigate = useNavigate();
  const [career, setCareer] = useState<CareerStats>(loadCareer);

  useEffect(() => {
    const syncCareer = async () => {
      try {
        const cloudCareer = await getGameProgress('chess-career');
        if (cloudCareer) {
          localStorage.setItem('chess-career', JSON.stringify(cloudCareer));
          setCareer(prev => ({ ...prev, ...cloudCareer }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncCareer();
  }, []);

  const [selected, setSelected] = useState<BotPersonality | null>(null);

  const titleFor = (rating: number) => {
    if (rating < 700) return { ar: 'مبتدئ', };
    if (rating < 1000) return { ar: 'هاوٍ', };
    if (rating < 1300) return { ar: 'كلاسيكي', };
    if (rating < 1600) return { ar: 'متقدم', };
    if (rating < 1900) return { ar: 'خبير', };
    if (rating < 2200) return { ar: 'أستاذ', };
    return { ar: 'أستاذ كبير', };
  };
  const playerTitle = titleFor(career.rating);

  const totalWins = useMemo(
    () => Object.values(career.records).reduce((s, r) => s + (r?.wins || 0), 0),
    [career],
  );
  const trophiesWon = career.highestDefeated + 1;
  const allBeaten = trophiesWon >= BOTS.length;

  const startMatch = (bot: BotPersonality) => {
    playSfx('click'); vibrate(15);
    // Encode bot id in the URL so Chess.tsx loads its weights and openings.
    // Player is forced to white for simplicity in career; bots' Elo gradient
    // is calibrated assuming player has the move.
    navigate(`/games/chess?bot=${bot.id}&color=w`);
  };

  return (
    <GameShell
      title={'مسيرة الشطرنج'}
      icon={Crown}
      accentColor="hsl(25, 95%, 53%)"
      rules={[
        'تسلق سلم الأبطال الثمانية',
        'كل بطل له شخصيته وأسلوبه الفريد',
        'الفوز يفتح البطل التالي',
        'تقييمك يتحرك حسب نتائجك ضد كل بطل',
        'هزيمة البطلة الأخيرة عائشة = أستاذية!',
      ]}
      stats={[
        { label: 'تقييمك', value: career.rating },
        { label: 'لقبك', value: playerTitle.ar },
        { label: 'انتصارات', value: totalWins },
        { label: 'كؤوس', value: `${trophiesWon}/${BOTS.length}` },
      ]}
      options={[]}
    >
      {/* Player rating banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-purple-500/25 p-4 mb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-micro uppercase tracking-wider text-purple-200/80">
              {'تقييمك الحالي'}
            </p>
            <p className="text-hero font-black text-purple-200 tabular-nums">{career.rating}</p>
            <p className="text-mini text-purple-300/80 font-bold">
              {playerTitle.ar}
            </p>
          </div>
          <Trophy className="w-12 h-12 text-amber-400/70 stroke-[1.4]" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-micro text-zinc-400 mb-1">
            <span>{trophiesWon}/{BOTS.length} {'بطل سُحق'}</span>
            {allBeaten && <span className="text-amber-300 font-bold">{'🏆 بطل العالم!'}</span>}
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full "
              animate={{ width: `${(trophiesWon / BOTS.length) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Champion ladder */}
      <div className="space-y-2">
        {BOTS.map((bot, idx) => {
          // Bot is unlocked iff the previous bot has been defeated.
          // First bot (idx=0) is always available as a starting opponent.
          const unlocked = idx <= career.highestDefeated + 1;
          const beaten = idx <= career.highestDefeated;
          const rec = career.records[bot.id];
          const isCurrent = idx === career.highestDefeated + 1 && !allBeaten;

          return (
            <motion.button
              key={bot.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => unlocked && setSelected(bot)}
              disabled={!unlocked}
              className={`w-full text-start rounded-2xl border p-3 transition-all ${
 isCurrent
 ? 'border-purple-400 bg-purple-500/15 ring-1 ring-purple-400/30'
 : beaten
 ? 'border-emerald-500/25 bg-emerald-500/5'
 : unlocked
 ? 'border-border/40 bg-card hover:bg-purple-500/5'
 : 'border-border/30 bg-card/40 opacity-50 cursor-not-allowed'
 } ${unlocked ? 'active:scale-[0.98]' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank pill */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-display shrink-0 ${
                  beaten ? 'bg-emerald-500/15' : isCurrent ? 'bg-purple-500/20 ring-2 ring-purple-400/40' : 'bg-white/5'
                }`}>
                  {unlocked ? bot.emoji : <Lock className="w-4 h-4 text-zinc-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-micro font-mono px-1.5 py-0.5 rounded ${
                      beaten ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-zinc-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <h3 className="font-bold text-foreground text-meta truncate">
                      {bot.ar}
                    </h3>
                    {beaten && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className={`text-micro mt-0.5 line-clamp-1 ${
                    unlocked ? 'text-muted-foreground' : 'text-muted-foreground/40'
                  }`}>
                    {unlocked ? (bot.taglineAr) : ('???')}
                  </p>
                </div>

                <div className="text-end shrink-0">
                  <p className="text-mini font-bold text-purple-300 tabular-nums">{bot.elo}</p>
                  {rec && (
                    <p className="text-micro text-muted-foreground tabular-nums">
                      {rec.wins}-{rec.losses}-{rec.draws}
                    </p>
                  )}
                </div>

                <ChevronRight className={`w-4 h-4 ${
                  unlocked ? 'text-foreground/60' : 'text-zinc-700'
                }`} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Bot challenge sheet */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-drawer bg-black/70 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-card p-5"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center text-hero">
                  {selected.emoji}
                </div>
                <div className="flex-1">
                  <h2 className="text-title font-black text-foreground">
                    {selected.ar}
                  </h2>
                  <p className="text-mini text-purple-300 font-bold tabular-nums">
                    Elo {selected.elo} · {selected.style}
                  </p>
                </div>
              </div>

              <p className="text-meta text-muted-foreground italic mb-4">
                "{selected.taglineAr}"
              </p>

              {/* Style badges derived from weights */}
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                <StatRow label={'هجوم على الملك'} v={selected.weights.kingAttack} max={2.5} />
                <StatRow label={'دفع البيادق'} v={selected.weights.pawnPush} max={1.6} />
                <StatRow label={'الحركة'} v={selected.weights.mobility} max={1.5} />
                <StatRow label={'احتساب المادة'} v={selected.weights.material} max={1.4} />
                <StatRow label={'تجنب التبادلات'} v={selected.weights.tradeAversion + 0.5} max={1.2} />
                <StatRow label={'دقة'} v={1 - selected.weights.blunderRate} max={1.0} />
              </div>

              {/* Player record vs this bot */}
              {career.records[selected.id] && (
                <div className="rounded-xl bg-white/4 px-3 py-2 mb-4 text-micro flex justify-between">
                  <span className="text-muted-foreground">{'سجلك ضده'}</span>
                  <span className="font-mono font-bold text-foreground">
                    {career.records[selected.id].wins}{' فوز'} ·
                    {career.records[selected.id].losses}{' خسارة'}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-foreground font-bold text-meta"
                >
                  {'إلغاء'}
                </button>
                <button
                  onClick={() => startMatch(selected)}
                  className="flex-1 py-3 rounded-xl font-black text-purple-950 text-meta flex items-center justify-center gap-1.5"
                  style={{ }}
                >
                  <Swords className="w-4 h-4" />
                  {'تحدّيه'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {allBeaten && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="mt-5 rounded-2xl p-4 border border-amber-500/40 text-center"
        >
          <Sparkles className="w-7 h-7 text-amber-300 mx-auto mb-1" />
          <p className="text-amber-300 font-black text-body">
            {'لقد هزمت كل الأبطال!'}
          </p>
          <p className="text-mini text-amber-200/70">
            {'جرب البطلة عائشة على رتبة أعلى لتثبت تفوقك'}
          </p>
        </motion.div>
      )}
    </GameShell>
  );
}

function StatRow({ label, v, max }: { label: string; v: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div>
      <p className="text-micro text-zinc-500 mb-0.5">{label}</p>
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full bg-purple-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
