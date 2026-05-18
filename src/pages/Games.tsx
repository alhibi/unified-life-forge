import React, { useMemo } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Swords, Gamepad2, Trophy, Brain, Dices, Crosshair, Puzzle, Flame, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameCardData {
  key: string;
  icon: typeof Grid3X3;
  title: string;
  badge?: string;
  badgeColor?: string;
  modes: string[];
  path: string;
  primaryStat: { label: string; value: string | number; accent: string };
  secondaryStat?: { label: string; value: string | number };
  gradient: string;
}

export default function GamesPage() {
  const { t, language } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const getStats = <T,>(key: string): T => {
    try { return JSON.parse(localStorage.getItem(key) || '{}') as T; } catch { return {} as T; }
  };

  const memStats = getStats<{ gamesWon?: number; level?: number; bestStreak?: number; bestEndlessLevel?: number; unlocked?: string[] }>('memory-stats');
  const diceStats = getStats<{ gamesWon?: number; bestScore?: number; pigGamesWon?: number; yatzeesRolled?: number }>('dice-stats');
  const focusStats = getStats<{ gamesPlayed?: number; bestAvg?: { reaction?: number }; bestNback?: { level?: number }; bestAimScore?: number }>('focus-stats');
  const chessStats = getStats<{ gamesPlayed?: number; whiteWins?: number; blackWins?: number }>('chess-stats');
  const puzzleStats = getStats<{ rating?: number; solved?: number; currentStreak?: number }>('chess-puzzle-stats');
  const sudStats = getStats<{ gamesWon?: number; bestStreak?: number; flawless?: number }>('sudoku-stats');

  const games: GameCardData[] = useMemo(() => [
    {
      key: 'focus',
      icon: Crosshair,
      title: t('games.focus'),
      badge: focusStats.bestAvg?.reaction ? `${focusStats.bestAvg.reaction}ms` : undefined,
      badgeColor: '#06b6d4',
      modes: isAr
        ? ['ردة فعل', 'ستروب', 'تسلسل', 'N-back', 'هدف']
        : ['Reaktion', 'Stroop', 'Sequenz', 'N-back', 'Ziel'],
      path: '/games/focus',
      primaryStat: { label: isAr ? 'مباريات' : 'Spiele', value: focusStats.gamesPlayed || 0, accent: '#06b6d4' },
      secondaryStat: focusStats.bestNback?.level ? { label: 'N-back', value: `${focusStats.bestNback.level}` } : undefined,
      gradient: 'from-cyan-500/20 to-cyan-500/5',
    },
    {
      key: 'dice',
      icon: Dices,
      title: t('games.dice'),
      badge: diceStats.bestScore ? `${diceStats.bestScore}` : undefined,
      badgeColor: '#f59e0b',
      modes: isAr ? ['يَتزي', 'الخنزير', 'رمية كبرى'] : ['Kniffel', 'Pig', 'Highroll'],
      path: '/games/dice',
      primaryStat: { label: isAr ? 'انتصارات' : 'Siege', value: diceStats.gamesWon || 0, accent: '#f59e0b' },
      secondaryStat: diceStats.yatzeesRolled ? { label: isAr ? 'يَتزي' : 'Kniffel', value: diceStats.yatzeesRolled } : undefined,
      gradient: 'from-amber-500/20 to-amber-500/5',
    },
    {
      key: 'memory',
      icon: Brain,
      title: t('games.memory'),
      badge: memStats.level ? `Lv.${memStats.level}` : undefined,
      badgeColor: '#ec4899',
      modes: isAr
        ? ['كلاسيكي', 'بلا نهاية', 'سباق وقت', 'يومي', 'ضد ذكاء']
        : ['Klassisch', 'Endlos', 'Zeitrennen', 'Daily', 'Vs KI'],
      path: '/games/memory',
      primaryStat: { label: isAr ? 'فوز' : 'Siege', value: memStats.gamesWon || 0, accent: '#ec4899' },
      secondaryStat: memStats.bestEndlessLevel ? { label: isAr ? 'مستوى ∞' : 'Endlos', value: memStats.bestEndlessLevel } : undefined,
      gradient: 'from-pink-500/20 to-pink-500/5',
    },
    {
      key: 'chess',
      icon: Swords,
      title: t('games.chess'),
      modes: isAr ? ['ضد لاعب', 'ضد ذكاء', 'ساعة'] : ['Spieler', 'KI', 'Uhr'],
      path: '/games/chess',
      primaryStat: { label: isAr ? 'مباريات' : 'Partien', value: chessStats.gamesPlayed || 0, accent: '#8b5cf6' },
      secondaryStat: { label: isAr ? 'فوز' : 'Siege', value: (chessStats.whiteWins || 0) + (chessStats.blackWins || 0) },
      gradient: 'from-violet-500/20 to-violet-500/5',
    },
    {
      key: 'chess-puzzles',
      icon: Puzzle,
      title: isAr ? 'ألغاز الشطرنج' : 'Schach-Puzzles',
      badge: puzzleStats.rating ? `${puzzleStats.rating}` : undefined,
      badgeColor: '#a855f7',
      modes: isAr ? ['مات', 'شوكة', 'تثبيت', 'تضحية', 'هجوم مكشوف'] : ['Matt', 'Gabel', 'Fesselung', 'Opfer', 'Abzug'],
      path: '/games/chess/puzzles',
      primaryStat: { label: isAr ? 'محلولة' : 'Gelöst', value: puzzleStats.solved || 0, accent: '#a855f7' },
      secondaryStat: puzzleStats.currentStreak ? { label: isAr ? 'سلسلة' : 'Serie', value: puzzleStats.currentStreak } : undefined,
      gradient: 'from-purple-500/20 to-purple-500/5',
    },
    {
      key: 'sudoku',
      icon: Grid3X3,
      title: t('games.sudoku'),
      modes: isAr ? ['كلاسيكي', 'X-سودوكو', 'يومي'] : ['Klassisch', 'X-Sudoku', 'Daily'],
      path: '/games/sudoku',
      primaryStat: { label: isAr ? 'فوز' : 'Siege', value: sudStats.gamesWon || 0, accent: '#3b82f6' },
      secondaryStat: sudStats.flawless ? { label: isAr ? 'إتقان' : 'Perfekt', value: sudStats.flawless } : undefined,
      gradient: 'from-blue-500/20 to-blue-500/5',
    },
  ], [t, isAr, memStats, diceStats, focusStats, chessStats, puzzleStats, sudStats]);

  // Roll up overall progress for the header strip
  const totalWins =
    (memStats.gamesWon || 0) + (diceStats.gamesWon || 0) +
    ((chessStats.whiteWins || 0) + (chessStats.blackWins || 0)) +
    (puzzleStats.solved || 0) + (sudStats.gamesWon || 0);
  const totalAchievements = memStats.unlocked?.length || 0;
  const memoryLevel = memStats.level || 1;

  return (
    <div className="min-h-screen bg-background pb-28 pt-14">
      <SEO title="الألعاب — SmartHub" description="مجموعة ألعاب ذهنية: سودوكو، شطرنج، ألغاز، ذاكرة، تركيز ونرد. أنماط متعددة وذكاء اصطناعي متقدم." path="/games" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 mb-3 px-5"
      >
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-[26px] font-bold tracking-tight text-foreground leading-tight">{t('games.title')}</h1>
          <p className="text-[11px] text-muted-foreground">
            {isAr ? '6 ألعاب · 20+ نمط' : '6 Spiele · 20+ Modi'}
          </p>
        </div>
      </motion.div>

      {/* Overall progress strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="px-4 mb-4"
      >
        <div className="rounded-2xl border border-border/40 bg-card p-3 grid grid-cols-3 gap-2">
          <ProgressTile icon={Trophy} value={totalWins} label={isAr ? 'انتصار' : 'Siege'} color="#fbbf24" />
          <ProgressTile icon={Flame} value={`Lv.${memoryLevel}`} label={isAr ? 'الذاكرة' : 'Memory'} color="#ec4899" />
          <ProgressTile icon={Target} value={puzzleStats.rating || 800} label={isAr ? 'تقييم ألغاز' : 'Puzzle Elo'} color="#a855f7" />
        </div>
      </motion.div>

      {/* Game grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {games.map((game, i) => {
          const Icon = game.icon;
          return (
            <motion.button
              key={game.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(game.path)}
              className={`group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-4 active:scale-[0.97] transition-transform text-start min-h-[140px] flex flex-col gap-2.5`}
            >
              {/* Soft gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-50 pointer-events-none`} />

              <div className="relative z-10 flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-card flex items-center justify-center shadow-sm" style={{ boxShadow: `0 0 0 1px ${game.primaryStat.accent}30` }}>
                  <Icon className="w-5 h-5 stroke-[1.8]" style={{ color: game.primaryStat.accent }} />
                </div>
                {game.badge && (
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums"
                    style={{ background: `${game.badgeColor}20`, color: game.badgeColor }}>
                    {game.badge}
                  </div>
                )}
              </div>

              <div className="relative z-10 flex-1">
                <h2 className="font-bold text-[15px] text-foreground leading-tight mb-1.5">{game.title}</h2>
                <div className="flex flex-wrap gap-1">
                  {game.modes.slice(0, 4).map(mode => (
                    <span key={mode} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-foreground/4 text-muted-foreground">
                      {mode}
                    </span>
                  ))}
                  {game.modes.length > 4 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded text-muted-foreground/60">
                      +{game.modes.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between border-t border-border/30 pt-2 -mx-1 px-1">
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="font-bold tabular-nums" style={{ color: game.primaryStat.accent }}>
                    {game.primaryStat.value}
                  </span>
                  <span className="text-muted-foreground">{game.primaryStat.label}</span>
                </div>
                {game.secondaryStat && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-foreground font-bold tabular-nums">{game.secondaryStat.value}</span>
                    <span className="text-muted-foreground">{game.secondaryStat.label}</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Achievements teaser */}
      {totalAchievements > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="px-4 mt-5"
        >
          <button onClick={() => navigate('/games/memory')}
            className="w-full rounded-2xl border border-pink-500/20 bg-pink-500/5 p-3 flex items-center justify-between active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-pink-300" />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-bold text-foreground">{isAr ? 'إنجازات الذاكرة' : 'Memory-Erfolge'}</p>
                <p className="text-[10px] text-muted-foreground">{totalAchievements} {isAr ? 'مفتوح من 10' : 'von 10 freigeschaltet'}</p>
              </div>
            </div>
            <div className="text-pink-300 text-lg">→</div>
          </button>
        </motion.div>
      )}
    </div>
  );
}

function ProgressTile({ icon: Icon, value, label, color }: { icon: typeof Trophy; value: string | number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center text-center py-1">
      <Icon className="w-4 h-4 mb-1" style={{ color }} />
      <p className="text-base font-black tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}
