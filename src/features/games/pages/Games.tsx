import React, { useMemo } from 'react';
import SEO from '@/components/SEO';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Swords, Gamepad2, Trophy, Brain, Dices, Crosshair, Puzzle, Flame, Target, Zap, Crown, Map, Award, Sparkles } from '@/lib/icons';
import { motion } from 'framer-motion';

// Single-color unified surface — every game, world and progress tile now
// reads with the same warm copper accent so the page renders as one
// coherent surface instead of a rainbow grid.
const LIVE = 'hsl(32 58% 62%)';
const LIVE_GRADIENT = 'from-[hsl(32_58%_62%/0.18)] to-[hsl(32_58%_62%/0.04)]';

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
  // Newer "world" modes — each has its own persistent state we surface as
  // mini progress badges on the Worlds row at the top of the page.
  const careerStats = getStats<{ rating?: number; highestDefeated?: number }>('chess-career');
  const adventureStats = getStats<{ highestCleared?: number; stars?: Record<number, number> }>('memory-adventure');
  const decathlonStats = getStats<{ best?: { index?: number } }>('focus-decathlon');
  const tournamentStats = getStats<{ status?: string }>('dice-tournament');

  const games: GameCardData[] = useMemo(() => [
    {
      key: 'focus',
      icon: Crosshair,
      title: t('games.focus'),
      badge: focusStats.bestAvg?.reaction ? `${focusStats.bestAvg.reaction}ms` : undefined,
      badgeColor: LIVE,
      modes: isAr
        ? ['ردة فعل', 'ستروب', 'تسلسل', 'N-back', 'هدف']
        : ['Reaktion', 'Stroop', 'Sequenz', 'N-back', 'Ziel'],
      path: '/games/focus',
      primaryStat: { label: isAr ? 'مباريات' : 'Spiele', value: focusStats.gamesPlayed || 0, accent: LIVE },
      secondaryStat: focusStats.bestNback?.level ? { label: 'N-back', value: `${focusStats.bestNback.level}` } : undefined,
      gradient: LIVE_GRADIENT,
    },
    {
      key: 'dice',
      icon: Dices,
      title: t('games.dice'),
      badge: diceStats.bestScore ? `${diceStats.bestScore}` : undefined,
      badgeColor: LIVE,
      modes: isAr ? ['يَتزي', 'الخنزير', 'رمية كبرى'] : ['Kniffel', 'Pig', 'Highroll'],
      path: '/games/dice',
      primaryStat: { label: isAr ? 'انتصارات' : 'Siege', value: diceStats.gamesWon || 0, accent: LIVE },
      secondaryStat: diceStats.yatzeesRolled ? { label: isAr ? 'يَتزي' : 'Kniffel', value: diceStats.yatzeesRolled } : undefined,
      gradient: LIVE_GRADIENT,
    },
    {
      key: 'memory',
      icon: Brain,
      title: t('games.memory'),
      badge: memStats.level ? `Lv.${memStats.level}` : undefined,
      badgeColor: LIVE,
      modes: isAr
        ? ['كلاسيكي', 'بلا نهاية', 'سباق وقت', 'يومي', 'ضد ذكاء']
        : ['Klassisch', 'Endlos', 'Zeitrennen', 'Daily', 'Vs KI'],
      path: '/games/memory',
      primaryStat: { label: isAr ? 'فوز' : 'Siege', value: memStats.gamesWon || 0, accent: LIVE },
      secondaryStat: memStats.bestEndlessLevel ? { label: isAr ? 'مستوى ∞' : 'Endlos', value: memStats.bestEndlessLevel } : undefined,
      gradient: LIVE_GRADIENT,
    },
    {
      key: 'chess',
      icon: Swords,
      title: t('games.chess'),
      modes: isAr ? ['ضد لاعب', 'ضد ذكاء', 'ساعة'] : ['Spieler', 'KI', 'Uhr'],
      path: '/games/chess',
      primaryStat: { label: isAr ? 'مباريات' : 'Partien', value: chessStats.gamesPlayed || 0, accent: LIVE },
      secondaryStat: { label: isAr ? 'فوز' : 'Siege', value: (chessStats.whiteWins || 0) + (chessStats.blackWins || 0) },
      gradient: LIVE_GRADIENT,
    },
    {
      key: 'chess-puzzles',
      icon: Puzzle,
      title: isAr ? 'ألغاز الشطرنج' : 'Schach-Puzzles',
      badge: puzzleStats.rating ? `${puzzleStats.rating}` : undefined,
      badgeColor: LIVE,
      modes: isAr ? ['مات', 'شوكة', 'تثبيت', 'تضحية', 'هجوم مكشوف'] : ['Matt', 'Gabel', 'Fesselung', 'Opfer', 'Abzug'],
      path: '/games/chess/puzzles',
      primaryStat: { label: isAr ? 'محلولة' : 'Gelöst', value: puzzleStats.solved || 0, accent: LIVE },
      secondaryStat: puzzleStats.currentStreak ? { label: isAr ? 'سلسلة' : 'Serie', value: puzzleStats.currentStreak } : undefined,
      gradient: LIVE_GRADIENT,
    },
    {
      key: 'sudoku',
      icon: Grid3X3,
      title: t('games.sudoku'),
      modes: isAr ? ['كلاسيكي', 'X-سودوكو', 'يومي'] : ['Klassisch', 'X-Sudoku', 'Daily'],
      path: '/games/sudoku',
      primaryStat: { label: isAr ? 'فوز' : 'Siege', value: sudStats.gamesWon || 0, accent: LIVE },
      secondaryStat: sudStats.flawless ? { label: isAr ? 'إتقان' : 'Perfekt', value: sudStats.flawless } : undefined,
      gradient: LIVE_GRADIENT,
    },
  ], [t, isAr, memStats, diceStats, focusStats, chessStats, puzzleStats, sudStats]);

  // Roll up overall progress for the header strip
  const totalWins =
    (memStats.gamesWon || 0) + (diceStats.gamesWon || 0) +
    ((chessStats.whiteWins || 0) + (chessStats.blackWins || 0)) +
    (puzzleStats.solved || 0) + (sudStats.gamesWon || 0);
  const totalAchievements = memStats.unlocked?.length || 0;
  const memoryLevel = memStats.level || 1;

  // World-mode quick stats. Each "world" is a richer game-mode that lives on
  // its own page and has its own persistence — so we summarize progress in
  // a single line each.
  const adventureStars = Object.values(adventureStats.stars || {}).reduce((s, n) => s + (n || 0), 0);
  const careerRank = (careerStats.highestDefeated ?? -1) + 1; // bots beaten = next-rank index
  const worlds = [
    {
      key: 'chess-career',
      title: isAr ? 'مسيرة الشطرنج' : 'Schachkarriere',
      subtitle: isAr ? `Elo ${careerStats.rating || 800} · ${careerRank}/8 بطل` : `Elo ${careerStats.rating || 800} · ${careerRank}/8 besiegt`,
      icon: Crown, color: LIVE,
      path: '/games/chess/career',
    },
    {
      key: 'memory-adventure',
      title: isAr ? 'مغامرة الذاكرة' : 'Memory-Abenteuer',
      subtitle: isAr ? `${adventureStats.highestCleared || 0}/15 محطة · ${adventureStars}★` : `${adventureStats.highestCleared || 0}/15 Etappen · ${adventureStars}★`,
      icon: Map, color: LIVE,
      path: '/games/memory/adventure',
    },
    {
      key: 'dice-tournament',
      title: isAr ? 'بطولة النرد' : 'Würfel-Turnier',
      subtitle: tournamentStats.status === 'won'
        ? (isAr ? 'فزت بالكأس 🏆' : 'Pokal gewonnen 🏆')
        : tournamentStats.status === 'in-progress'
          ? (isAr ? 'بطولة قيد اللعب' : 'Turnier läuft')
          : (isAr ? '4 لاعبين · بطولة إقصاء' : '4 Spieler · K.-O.-Runde'),
      icon: Trophy, color: LIVE,
      path: '/games/dice/tournament',
    },
    {
      key: 'focus-decathlon',
      title: isAr ? 'العشاري الذهني' : 'Mental-Decathlon',
      subtitle: decathlonStats.best?.index
        ? (isAr ? `أفضل: ${decathlonStats.best.index}` : `Best: ${decathlonStats.best.index}`)
        : (isAr ? '5 محطات · مؤشر معرفي' : '5 Disziplinen · Cognitive Index'),
      icon: Award, color: LIVE,
      path: '/games/focus/decathlon',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 pt-14">
      <SEO title="الألعاب — SmartHub" description="مجموعة ألعاب ذهنية: سودوكو، شطرنج، ألغاز، ذاكرة، تركيز ونرد. أنماط متعددة وذكاء اصطناعي متقدم." path="/games" />

      {/* Header — unified PageHeader (top-level tab, no back) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-3"
      >
        <PageHeader
          hideBack
          icon={
            <span className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </span>
          }
          title={t('games.title')}
          subtitle={isAr ? '6 ألعاب · 4 عوالم · 25+ نمط' : '6 Spiele · 4 Welten · 25+ Modi'}
          className="px-5"
        />
      </motion.div>

      {/* Overall progress strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="px-4 mb-4"
      >
        <div className="rounded-2xl border border-border/40 bg-card p-3 grid grid-cols-3 gap-2">
          <ProgressTile icon={Trophy} value={totalWins} label={isAr ? 'انتصار' : 'Siege'} color={LIVE} />
          <ProgressTile icon={Flame} value={`Lv.${memoryLevel}`} label={isAr ? 'الذاكرة' : 'Memory'} color={LIVE} />
          <ProgressTile icon={Target} value={puzzleStats.rating || 800} label={isAr ? 'تقييم ألغاز' : 'Puzzle Elo'} color={LIVE} />
        </div>
      </motion.div>

      {/* Worlds — flagship rich modes that live as their own pages. Each world
          spans the full row so it gets enough visual weight to compete with
          the standard game grid. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
        className="px-4 mb-5"
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[11px] font-bold text-foreground/80">
            {isAr ? '🌟 العوالم' : '🌟 Welten'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isAr ? 'أنماط بقصة وعمق' : 'Story-Modi'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {worlds.map((world, i) => {
            const Icon = world.icon;
            return (
              <motion.button
                key={world.key}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
                onClick={() => navigate(world.path)}
                className="relative overflow-hidden rounded-2xl border p-3 text-start active:scale-[0.97] transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${world.color}18, ${world.color}05)`,
                  borderColor: `${world.color}30`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 stroke-[2]" style={{ color: world.color }} />
                  <Sparkles className="w-2.5 h-2.5 ml-auto" style={{ color: world.color, opacity: 0.5 }} />
                </div>
                <p className="text-[12px] font-black text-foreground leading-tight">{world.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{world.subtitle}</p>
              </motion.button>
            );
          })}
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
