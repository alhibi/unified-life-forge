/**
 * GameMasteryCard — an immersive game plate, not a list row.
 *
 * Design: a huge watermark motif bleeding off the top-left corner, the game's
 * identity gradient washing the surface, mastery as a segmented hex-strip
 * (each segment = one tier), and modes as a tappable chip-cloud — visible at
 * a glance instead of hidden behind a disclosure. Records and coverage come
 * from MasteryState; unplayed games say "لم تُلاعب بعد" honestly.
 */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppCard } from '@/components/ui/app-shell';
import { ChevronLeft, Star } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';

import type { GameDef } from '../data/modes';
import type { MasteryState } from '../progression/types';
import { MASTERY_THRESHOLDS, type MasteryProgress } from '../progression/xp';
import type { GameIdentity } from './gameIdentity';

interface Props {
  game: GameDef;
  mastery: MasteryProgress;
  stats: MasteryState;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  identity: GameIdentity;
}

const MAX_TIER = MASTERY_THRESHOLDS.length - 1;

/** Film grain (same recipe as ProfileCard). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/* ── Watermark motifs — oversized, low-contrast, cropped by the card ── */
function Watermark({ id, accent }: { id: GameDef['id']; accent: string }) {
  const common = 'pointer-events-none absolute select-none';
  if (id === 'chess') {
    return (
      <svg viewBox="0 0 100 100" className={cn(common, '-top-6 -start-8 h-44 w-44 opacity-[0.10]')} aria-hidden>
        <g fill={accent}>
          {/* Knight silhouette */}
          <path d="M25 88c0-4 1-7.5 3-11s5-6.5 9-9.5c-2.2-.4-4.3-.1-6.4.8-1.7.7-3.3 1.9-5 3.6l-4.8-4c2.6-5.1 6-9.3 10.4-12.7 4.4-3.4 9-6 13.8-8-1.2-2.4-1.6-4.8-.8-7l-6.4 3.6-4-5.6L52 24c3.7-2.5 7.6-3.3 11.6-2 4.4 1.3 7.9 4 10.4 8.2 2.5 4.1 3.5 8.5 3.2 13.2-.4 5.2-2.4 10-6 14.4-3.6 4.4-8 7.6-13.6 9.6-2.8 1.1-4.8 2.7-6.4 5.2-1.2 2-1.8 4.2-1.8 6.6" />
        </g>
      </svg>
    );
  }
  if (id === 'sudoku') {
    return (
      <svg viewBox="0 0 90 90" className={cn(common, '-top-8 -start-6 h-48 w-48 opacity-[0.12]')} aria-hidden>
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const filled = [true, false, true, false, true, true, true, false, true][r * 3 + c];
            return (
              <rect
                key={`${r}${c}`}
                x={c * 30 + 2}
                y={r * 30 + 2}
                width={26}
                height={26}
                rx={4}
                fill={filled ? accent : 'none'}
                stroke={accent}
                strokeWidth={filled ? 0 : 2}
                opacity={filled ? 0.55 : 0.35}
              />
            );
          }),
        )}
      </svg>
    );
  }
  // Memory: fanned cards
  return (
    <svg viewBox="0 0 100 100" className={cn(common, '-top-6 -start-8 h-44 w-44 opacity-[0.12]')} aria-hidden>
      <rect x="8" y="22" width="42" height="58" rx="7" fill="none" stroke={accent} strokeWidth="3" transform="rotate(-12 29 51)" />
      <rect x="30" y="16" width="42" height="58" rx="7" fill={accent} transform="rotate(8 51 45)" />
      <circle cx="53" cy="42" r="9" fill="#fff" opacity=".75" />
    </svg>
  );
}

function GameMasteryCardImpl({ game, mastery, stats, icon: Icon, identity }: Props) {
  const navigate = useNavigate();

  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : null;
  const playedModes = stats.modesPlayed.length;
  const totalModes = game.modes.length;
  const bestRecord = Object.values(stats.records).length
    ? Math.max(...Object.values(stats.records))
    : null;

  return (
    <AppCard as="section" aria-label={game.label} className="relative overflow-hidden">
      {/* Identity wash + grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            `linear-gradient(150deg, ${identity.tint} 0%, transparent 46%),` +
            `radial-gradient(120% 90% at 100% 110%, ${identity.tint} 0%, transparent 60%)`,
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      <Watermark id={game.id} accent={identity.accent} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm"
            style={{ background: identity.tint, borderColor: identity.line }}
          >
            <Icon className="h-5 w-5" style={{ color: identity.accent }} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-title font-black text-foreground">{game.label}</h2>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-micro font-bold"
                style={{ background: identity.tint, color: identity.accent }}
              >
                {mastery.label}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-mini text-muted-foreground">{game.tagline}</p>
          </div>

          {/* Hex-style segmented mastery strip */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-1" dir="ltr" aria-label={`رتبة الإتقان ${mastery.tier} من ${MAX_TIER}`}>
              {MASTERY_THRESHOLDS.slice(1).map((_, i) => {
                const tierNum = i + 1;
                const filled = tierNum <= mastery.tier;
                return (
                  <span
                    key={tierNum}
                    className={cn(
                      'h-3 w-1.5 rounded-[2px] transition-colors',
                      tierNum % 2 === 0 && 'h-3.5',
                    )}
                    style={{ background: filled ? identity.accent : 'transparent', border: `1px solid ${filled ? identity.accent : 'var(--border)'}` }}
                    aria-hidden
                  />
                );
              })}
              <Star
                className={cn('ms-0.5 h-3.5 w-3.5', mastery.tier >= MAX_TIER ? '' : 'text-muted-foreground/40')}
                fill={mastery.tier >= MAX_TIER ? 'currentColor' : undefined}
                aria-hidden
              />
            </div>
            <span className="text-micro tabular-nums text-muted-foreground" dir="rtl">
              {playedModes}/{totalModes} أنماط
            </span>
          </div>
        </div>

        {/* Facts row */}
        <div className="mt-3 flex items-center gap-3 text-mini">
          {stats.played === 0 ? (
            <span className="font-semibold text-muted-foreground">لم تُلاعب بعد</span>
          ) : (
            <>
              <span className="tabular-nums text-muted-foreground" dir="rtl">
                <span className="font-bold text-foreground" dir="ltr">{stats.wins}</span> فوز ·{' '}
                <span className="text-foreground">{winRate}٪</span>
              </span>
              {bestRecord !== null && (
                <span className="tabular-nums text-muted-foreground" dir="rtl">
                  أفضل رقم <span className="font-bold text-foreground" dir="ltr">{bestRecord}</span>
                </span>
              )}
            </>
          )}
          {mastery.remaining !== null && stats.played > 0 && (
            <span className="ms-auto hidden items-center gap-1 tabular-nums text-muted-foreground xs:flex sm:flex" dir="rtl">
              <span dir="ltr">{mastery.remaining}</span> للرتبة القادمة
            </span>
          )}
        </div>

        {/* Mode chips — always visible, scrollable on one line */}
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hide" role="list" aria-label={`أنماط ${game.label}`}>
          {game.modes.map((mode) => {
            const played = stats.modesPlayed.includes(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                role="listitem"
                title={`${mode.detail}${mode.recordLabel && stats.records[mode.id] !== undefined ? ` — ${mode.recordLabel}: ${stats.records[mode.id]}` : ''}`}
                onClick={() => navigate(mode.path)}
                onMouseEnter={() => prefetchRoute(mode.path)}
                className={cn(
                  'group flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-micro font-bold transition-all duration-normal ease-out-expo',
                  'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95',
                )}
                style={{
                  background: played ? identity.tint : 'transparent',
                  borderColor: played ? identity.line : 'var(--border)',
                  color: played ? identity.accent : 'var(--muted-foreground)',
                }}
              >
                {!played && <span aria-hidden className="opacity-70">✦</span>}
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate(game.path)}
          onMouseEnter={() => prefetchRoute(game.path)}
          className="group mt-3 flex h-12 w-full items-center justify-between overflow-hidden rounded-button px-4 text-meta font-black transition-transform duration-normal ease-out-expo hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
          style={{
            background: `linear-gradient(120deg, ${identity.accent}, ${identity.accent})`,
            color: '#fff',
            boxShadow: `0 6px 18px -8px ${identity.line}`,
          }}
        >
          <span>ادخل الملعب</span>
          <span className="flex items-center gap-1">
            <span className="hidden text-micro font-bold opacity-80 group-hover:inline sm:inline" dir="rtl">
              {totalModes} أنماط
            </span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </span>
        </button>
      </div>
    </AppCard>
  );
}

export const GameMasteryCard = memo(GameMasteryCardImpl);
export default GameMasteryCard;
