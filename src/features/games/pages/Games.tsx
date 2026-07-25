import React, { useMemo } from 'react';
import SEO from '@/components/SEO';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Swords, Gamepad2, Trophy, Brain, Dices, Crosshair, Puzzle, Flame, Target, Zap, Crown, Map, Award, Sparkles } from '@/lib/icons';
import { motion } from 'framer-motion';

// Unique colors for each game to provide visual variety and distinct identities.
const COLORS = {
  focus: 'hsl(var(--primary))',       // Green
  dice: 'hsl(var(--primary))',        // Pink/Red
  memory: 'hsl(var(--primary))',      // Purple
  chess: 'hsl(var(--primary))',       // Blue
  puzzles: 'hsl(var(--primary))',      // Yellow/Gold
  sudoku: 'hsl(var(--primary))',      // Light Blue
  career: 'hsl(var(--primary))',       // Orange
  adventure: 'hsl(var(--primary))',   // Purple (matches memory)
  tournament: 'hsl(var(--primary))',  // Pink/Red (matches dice)
  decathlon: 'hsl(var(--primary))',   // Green (matches focus)
  overall: 'hsl(var(--primary))'       // Warm Copper for overall stats
};


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
}

export default function GamesPage() {
  const { t, } = useApp();
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
      badgeColor: COLORS.focus,
      modes: ['ردة فعل', 'ستروب', 'تسلسل', 'N-back', 'هدف'],
      path: '/games/focus',
      primaryStat: { label: 'مباريات', value: focusStats.gamesPlayed || 0, accent: COLORS.focus },
      secondaryStat: focusStats.bestNback?.level ? { label: 'N-back', value: `${focusStats.bestNback.level}` } : undefined,
    },
    {
      key: 'dice',
      icon: Dices,
      title: t('games.dice'),
      badge: diceStats.bestScore ? `${diceStats.bestScore}` : undefined,
      badgeColor: COLORS.dice,
      modes: ['يَتزي', 'الخنزير', 'رمية كبرى'],
      path: '/games/dice',
      primaryStat: { label: 'انتصارات', value: diceStats.gamesWon || 0, accent: COLORS.dice },
      secondaryStat: diceStats.yatzeesRolled ? { label: 'يَتزي', value: diceStats.yatzeesRolled } : undefined,
    },
    {
      key: 'memory',
      icon: Brain,
      title: t('games.memory'),
      badge: memStats.level ? `Lv.${memStats.level}` : undefined,
      badgeColor: COLORS.memory,
      modes: ['كلاسيكي', 'بلا نهاية', 'سباق وقت', 'يومي', 'ضد ذكاء'],
      path: '/games/memory',
      primaryStat: { label: 'فوز', value: memStats.gamesWon || 0, accent: COLORS.memory },
      secondaryStat: memStats.bestEndlessLevel ? { label: 'مستوى ∞', value: memStats.bestEndlessLevel } : undefined,
    },
    {
      key: 'chess',
      icon: Swords,
      title: t('games.chess'),
      modes: ['ضد لاعب', 'ضد ذكاء', 'ساعة'],
      path: '/games/chess',
      primaryStat: { label: 'مباريات', value: chessStats.gamesPlayed || 0, accent: COLORS.chess },
      secondaryStat: { label: 'فوز', value: (chessStats.whiteWins || 0) + (chessStats.blackWins || 0) },
    },
    {
      key: 'chess-puzzles',
      icon: Puzzle,
      title: 'ألغاز الشطرنج',
      badge: puzzleStats.rating ? `${puzzleStats.rating}` : undefined,
      badgeColor: COLORS.puzzles,
      modes: ['مات', 'شوكة', 'تثبيت', 'تضحية', 'هجوم مكشوف'],
      path: '/games/chess/puzzles',
      primaryStat: { label: 'محلولة', value: puzzleStats.solved || 0, accent: COLORS.puzzles },
      secondaryStat: puzzleStats.currentStreak ? { label: 'سلسلة', value: puzzleStats.currentStreak } : undefined,
    },
    {
      key: 'sudoku',
      icon: Grid3X3,
      title: t('games.sudoku'),
      modes: ['كلاسيكي', 'X-سودوكو', 'يومي'],
      path: '/games/sudoku',
      primaryStat: { label: 'فوز', value: sudStats.gamesWon || 0, accent: COLORS.sudoku },
      secondaryStat: sudStats.flawless ? { label: 'إتقان', value: sudStats.flawless } : undefined,
    },
  ], [t, memStats, diceStats, focusStats, chessStats, puzzleStats, sudStats]);

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
      title: 'مسيرة الشطرنج',
      subtitle: `Elo ${careerStats.rating || 800} · ${careerRank}/8 بطل`,
      icon: Crown, color: COLORS.career,
      path: '/games/chess/career',
    },
    {
      key: 'memory-adventure',
      title: 'مغامرة الذاكرة',
      subtitle: `${adventureStats.highestCleared || 0}/15 محطة · ${adventureStars}★`,
      icon: Map, color: COLORS.adventure,
      path: '/games/memory/adventure',
    },
    {
      key: 'dice-tournament',
      title: 'بطولة النرد',
      subtitle: tournamentStats.status === 'won'
        ? ('فزت بالكأس 🏆')
        : tournamentStats.status === 'in-progress'
          ? ('بطولة قيد اللعب')
          : ('4 لاعبين · بطولة إقصاء'),
      icon: Trophy, color: COLORS.tournament,
      path: '/games/dice/tournament',
    },
    {
      key: 'focus-decathlon',
      title: 'العشاري الذهني',
      subtitle: decathlonStats.best?.index
        ? (`أفضل: ${decathlonStats.best.index}`)
        : ('5 محطات · مؤشر معرفي'),
      icon: Award, color: COLORS.decathlon,
      path: '/games/focus/decathlon',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-page pt-14">
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
          subtitle={'6 ألعاب · 4 عوالم · 25+ نمط'}
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
        <div className="rounded-2xl border border-border/40 bg-card p-3 grid grid-cols-3 gap-2 shadow-sm">
          <ProgressTile icon={Trophy} value={totalWins} label={'انتصار'} color={COLORS.overall} />
          <ProgressTile icon={Flame} value={`Lv.${memoryLevel}`} label={'الذاكرة'} color={COLORS.memory} />
          <ProgressTile icon={Target} value={puzzleStats.rating || 800} label={'تقييم ألغاز'} color={COLORS.puzzles} />
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
      </motion.div>

      {/* Combined Unified Grid (Games + Worlds) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {worlds.map((world, i) => {
          const Icon = world.icon;
          return (
            <motion.button
              key={world.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(world.path)}
              className="group relative overflow-hidden rounded-3xl bg-card border border-border/50 p-5 active:scale-[0.98] transition-all hover:shadow-lg text-start flex flex-col gap-3"
              style={{ borderColor: 'hsl(var(--primary) / 0.2)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl pointer-events-none rounded-full transform translate-x-10 -translate-y-10" style={{ backgroundColor: 'hsl(var(--primary) / 0.06)' }} />

              <div className="relative z-raised flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: 'hsl(var(--primary) / 0.08)' }}>
                  <Icon className="w-6 h-6 stroke-[2]" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <Sparkles className="w-5 h-5 opacity-40 animate-pulse" style={{ color: 'hsl(var(--primary))' }} />
              </div>

              <div className="relative z-raised mt-1">
                <h3 className="font-black text-[17px] text-foreground leading-tight mb-1">{world.title}</h3>
                <p className="text-[12px] text-muted-foreground/90 font-medium">{world.subtitle}</p>
              </div>
            </motion.button>
          );
        })}

        {games.map((game, i) => {
              const Icon = game.icon;
              return (
                <motion.button
                  key={game.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => navigate(game.path)}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-4 active:scale-[0.98] transition-all hover:shadow-md text-start min-h-[140px] flex flex-col gap-2.5"
                >
                  <div
                    className="absolute inset-0 bg-primary/[0.06] pointer-events-none transition-opacity group-hover:bg-primary/[0.1]"
                  />

                  <div className="relative z-raised flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10">
                      <Icon className="w-5 h-5 stroke-[2] text-primary" />
                    </div>
                    {game.badge && (
                      <div className="px-2.5 py-1 rounded-full text-[10px] font-bold tabular-nums shadow-sm"
                        style={{ backgroundColor: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                        {game.badge}
                      </div>
                    )}
                  </div>

                  <div className="relative z-raised flex-1">
                    <h2 className="font-bold text-[16px] text-foreground leading-tight mb-2">{game.title}</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {game.modes.slice(0, 4).map(mode => (
                        <span key={mode} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-foreground/5 text-muted-foreground/90 border border-border/30">
                          {mode}
                        </span>
                      ))}
                      {game.modes.length > 4 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-muted-foreground/60 bg-foreground/3">
                          +{game.modes.length - 4}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative z-raised flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 -mx-1 px-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-black tabular-nums" style={{ color: game.primaryStat.accent }}>
                        {game.primaryStat.value}
                      </span>
                      <span className="text-muted-foreground font-medium">{game.primaryStat.label}</span>
                    </div>
                    {game.secondaryStat && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-foreground font-black tabular-nums">{game.secondaryStat.value}</span>
                        <span className="text-muted-foreground font-medium">{game.secondaryStat.label}</span>
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
            className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="text-start">
                <p className="text-[12px] font-bold text-foreground">{'إنجازات الذاكرة'}</p>
                <p className="text-[10px] text-muted-foreground">{totalAchievements} {'مفتوح من 10'}</p>
              </div>
            </div>
            <div className="text-primary text-lg">→</div>
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
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}
