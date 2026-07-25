import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import GameShell from '@/features/games/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, ChevronRight, Play, RotateCcw } from '@/lib/icons';
import {
  DICE_BOTS, DicePersonality,
  TournamentState, TournamentMatch,
  loadTournament, buildTournament, clearTournament, saveTournament, simulateMatch,
} from '@/features/games/data/diceTournament';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';

// =============================================================================
// Bracket page: shows the 4-player tree, the tournament's status, and a CTA
// to play the player's next match. Clicking the CTA navigates to the Pig
// game with ?tournament=<matchId>&bot=<botId>.
// =============================================================================

function botById(id: string): DicePersonality | null {
  return DICE_BOTS.find(b => b.id === id) ?? null;
}

function nameOf(slot: string): string {
  if (slot === 'player') return 'أنت';
  const b = botById(slot);
  return b ? (b.ar) : '?';
}
function emojiOf(slot: string): string {
  if (slot === 'player') return '🧑';
  return botById(slot)?.emoji ?? '?';
}

export default function DiceTournamentPage() {
  const { } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<TournamentState | null>(loadTournament);

  const start = () => {
    const fresh = buildTournament();
    saveTournament(fresh);
    setState(fresh);
    playSfx('match'); vibrate(20);
  };

  const reset = () => {
    clearTournament();
    setState(null);
  };

  const playNext = () => {
    if (!state || !state.nextPlayerMatch) return;
    const match = state.matches.find(m => m.id === state.nextPlayerMatch)!;
    const opponent = state.nextPlayerMatch === 'semi-A' ? match.right : match.right;
    if (!opponent) return;
    navigate(`/games/dice?tournament=${state.nextPlayerMatch}&bot=${opponent}`);
  };

  // Pre-simulate semi-B as soon as the tournament is built so the player
  // sees their potential final opponent right away (it's locked-in by seed).
  React.useEffect(() => {
    if (!state) return;
    const semiB = state.matches.find(m => m.id === 'semi-B')!;
    if (!semiB.winner && typeof semiB.left === 'string' && typeof semiB.right === 'string') {
      const sim = simulateMatch(semiB.left, semiB.right);
      const next: TournamentState = {
        ...state,
        matches: state.matches.map(m => m.id === 'semi-B'
          ? { ...m, winner: sim.winner, finalScore: { left: sim.left, right: sim.right } }
          : m),
      };
      saveTournament(next);
      setState(next);
    }
  }, [state]);

  if (!state) {
    return (
      <GameShell
        title={'بطولة النرد'}
        icon={Trophy}
        accentColor="hsl(346, 87%, 60%)"
        rules={[
          'بطولة "الخنزير" بـ 4 لاعبين',
          'نصف نهائي ضد بطل، ثم النهائي',
          '3 شخصيات بأساليب لعب مختلفة',
          'الخسارة تخرجك من البطولة',
          'الفوز في النهائي = كأس البطولة',
        ]}
        stats={[]}
        options={[]}
      >
        {/* Bot showcase */}
        <div className="space-y-2 mb-5">
          <p className="text-xs text-muted-foreground px-1 mb-1">
            {'المشاركون'}
          </p>
          {DICE_BOTS.map(bot => (
            <div key={bot.id} className="flex items-center gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-2xl">
                {bot.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{bot.ar}</p>
                <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                  "{bot.taglineAr}"
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-amber-300 uppercase tracking-wider">{'حد التوقف'}</p>
 <p className="text-base font-black text-amber-300">{bot.baseHold}</p>
 </div>
 </div>
 ))}
 </div>

 <button
 onClick={start}
 className="w-full py-4 rounded-2xl font-black text-amber-950"
 style={{ }}
        >
          <Sparkles className="w-5 h-5 inline mr-1.5" />
          {'ابدأ البطولة'}
        </button>
      </GameShell>
    );
  }

  const semiA = state.matches.find(m => m.id === 'semi-A')!;
  const semiB = state.matches.find(m => m.id === 'semi-B')!;
  const final = state.matches.find(m => m.id === 'final')!;

  return (
    <GameShell
      title={'بطولة النرد'}
      icon={Trophy}
      accentColor="hsl(346, 87%, 60%)"
      rules={[
        'بطولة "الخنزير" بـ 4 لاعبين',
        '3 خصوم، كل واحد بأسلوب فريد',
        'احذر حسن المتسرع — يخاطر كثيراً',
        'ليلى الحذرة تحتفظ بالنقاط بسرعة',
        'كريم الذكي صعب الهزيمة',
      ]}
      stats={[
        { label: 'الحالة', value: state.status === 'won' ? '🏆' : state.status === 'lost' ? '😞' : '⚔️' },
        { label: 'الكأس', value: state.status === 'won' ? ('مفتاح') : ('مغلق') },
      ]}
      options={[]}
    >
      {/* Bracket visualization */}
      <div className="space-y-3 mb-5">
        <BracketRound title={'نصف النهائي'} matches={[semiA, semiB]} active={state.nextPlayerMatch === 'semi-A'} />

        {/* Connector */}
        <div className="flex justify-center">
          <ChevronRight className="w-5 h-5 text-zinc-400 rotate-90" />
        </div>

        <BracketRound title={'النهائي'} matches={[final]} active={state.nextPlayerMatch === 'final'} />
      </div>

      {/* CTA */}
      {state.status === 'in-progress' && state.nextPlayerMatch && (
 <button
 onClick={playNext}
 className="w-full py-4 rounded-2xl font-black text-amber-950 flex items-center justify-center gap-2"
 style={{ }}
        >
          <Play className="w-5 h-5" />
          {state.nextPlayerMatch === 'semi-A'
            ? ('العب نصف النهائي')
            : ('العب النهائي')}
        </button>
      )}

      {/* End-state messages */}
      <AnimatePresence>
        {state.status === 'won' && (
 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
 className="rounded-2xl p-5 border border-amber-500/40 text-center">
 <Trophy className="w-12 h-12 text-amber-300 mx-auto mb-2" />
 <p className="text-2xl font-black text-amber-200 mb-1">
 {'🏆 بطل البطولة!'}
            </p>
            <p className="text-xs text-amber-200/70">
              {'سحقت جميع المنافسين'}
            </p>
            <button onClick={reset} className="mt-4 px-6 py-2 rounded-xl bg-amber-500 text-amber-950 font-bold text-sm">
              <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
              {'بطولة جديدة'}
            </button>
          </motion.div>
        )}
        {state.status === 'lost' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-5 border border-rose-500/30 bg-rose-500/8 text-center">
            <p className="text-3xl mb-2">😞</p>
            <p className="text-base font-black text-rose-300 mb-1">
              {'خرجت من البطولة'}
            </p>
            <p className="text-xs text-rose-200/70 mb-3">
              {final.winner && final.winner !== 'player'
                ? `${'البطل:'} ${nameOf(final.winner)}`
                : ''}
            </p>
            <button onClick={reset} className="px-6 py-2 rounded-xl bg-rose-500 text-white font-bold text-sm">
              <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
              {'حاول مرة أخرى'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}

function BracketRound({ title, matches, active }: {
  title: string; matches: TournamentMatch[]; active: boolean;
}) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1.5 ${
        active ? 'text-amber-300' : 'text-muted-foreground'
      }`}>
        {title}
      </p>
      <div className="space-y-1.5">
        {matches.map(m => (
          <MatchCard key={m.id} match={m} active={active && m.winner === null} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, active }: { match: TournamentMatch; active: boolean }) {
  const left = match.left;
  const right = match.right;
  const winner = match.winner;
  const score = match.finalScore;

  const Slot = ({ slot, side }: { slot: string | null; side: 'left' | 'right' }) => {
    if (!slot) return (
      <div className="flex items-center gap-2 px-2 py-1.5 opacity-40">
        <span className="text-base">?</span>
        <span className="text-xs text-muted-foreground italic">{'غير محدد'}</span>
      </div>
    );
    const isWinner = winner === slot;
    const isLoser = winner !== null && winner !== slot;
    const isPlayer = slot === 'player';
    const sc = side === 'left' ? score?.left : score?.right;
    return (
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
        isWinner ? 'bg-emerald-500/12' : isLoser ? 'opacity-50' : isPlayer ? 'bg-amber-500/12' : ''
      }`}>
        <span className="text-base">{emojiOf(slot)}</span>
        <span className={`text-xs flex-1 ${isWinner ? 'font-black text-emerald-300' : 'font-bold text-foreground'}`}>
          {nameOf(slot)}
        </span>
        {sc !== undefined && (
          <span className={`text-xs font-mono tabular-nums ${isWinner ? 'text-emerald-300' : 'text-muted-foreground'}`}>
            {sc}
          </span>
        )}
        {isWinner && <Trophy className="w-3 h-3 text-emerald-400" />}
      </div>
    );
  };

  return (
    <div className={`rounded-xl border ${
      active ? 'border-amber-500/50 ring-1 ring-amber-400/20' :
      winner ? 'border-emerald-500/20 bg-emerald-500/3' : 'border-border/30 bg-card/40'
    }`}>
      <Slot slot={left as string} side="left" />
      <div className="border-t border-border/20" />
      <Slot slot={right as string | null} side="right" />
    </div>
  );
}
