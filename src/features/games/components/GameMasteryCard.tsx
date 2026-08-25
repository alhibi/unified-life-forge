/**
 * GameMasteryCard — one game, its identity, its real numbers.
 *
 * Redesign: the hub used to render all games identically (grey plate + primary
 * button), so nothing distinguished sudoku from chess at a glance. Now each game
 * carries the accent its own page already uses (via gameIdentity), a signature
 * motif rendered in SVG, and a "لماذا ستحبها" hook. Every stat is read from the
 * MasteryState that the award pipeline maintains — records, mode coverage, win
 * rate; no invented numbers.
 */
import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppCard } from '@/components/ui/app-shell';
import { ChevronDown, ChevronLeft, Star } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';

import type { GameIdentity } from './gameIdentity';
import type { GameDef } from '../data/modes';
import type { MasteryState } from '../progression/types';
import { MASTERY_THRESHOLDS, type MasteryProgress } from '../progression/xp';

interface Props {
  game: GameDef;
  mastery: MasteryProgress;
  stats: MasteryState;
  identity: GameIdentity;
}

const MAX_TIER = MASTERY_THRESHOLDS.length - 1;

/* ── signature motifs ──────────────────────────────────────────────────── */

function Motif({ id, accent }: { id: GameDef['id']; accent: string }) {
  if (id === 'chess') {
    // Knight silhouette, drawn as one path.
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        <path
          d="M6.5 20.5c0-1 .2-1.9.7-2.8.4-.8 1-1.5 1.9-2.3-.5-.1-1 0-1.5.2-.4.2-.8.5-1.2.9L5 15c.6-1.2 1.4-2.2 2.5-3.1C8.6 11 9.7 10.3 11 9.8c-.3-.6-.4-1.2-.2-1.8l-1.6.9-1-1.4L12 4.5c.9-.6 1.9-.8 2.9-.5 1.1.3 2 1 2.6 2 .6 1 .9 2.1.8 3.3-.1 1.3-.6 2.5-1.5 3.6-.9 1.1-2 1.9-3.4 2.4-.7.3-1.2.7-1.6 1.3-.3.5-.5 1-.5 1.6"
          fill="none"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === 'sudoku') {
    // A partially-solved grid: some cells inked, some not.
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const filled = (r * 3 + c) % 3 !== 1;
            return (
              <rect
                key={`${r}${c}`}
                x={4 + c * 5.6}
                y={4 + r * 5.6}
                width={4}
                height={4}
                rx={0.8}
                fill={filled ? accent : 'none'}
                stroke={accent}
                strokeWidth={filled ? 0 : 0.9}
                opacity={filled ? 0.85 : 0.55}
              />
            );
          }),
        )}
      </svg>
    );
  }
  // Memory: two cards, one face-up one face-down.
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <rect x="3.5" y="6" width="9" height="13" rx="2" fill="none" stroke={accent} strokeWidth="1.5" />
      <rect x="12.5" y="5" width="9" height="13" rx="2" fill={accent} opacity="0.85" />
      <circle cx="17" cy="11.5" r="2.4" fill="#fff" opacity="0.9" />
    </svg>
  );
}

function GameMasteryCardImpl({ game, mastery, stats, identity }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // Real derived facts.
  const modesPlayed = stats.modesPlayed.length;
  const totalModes = game.modes.length;
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : null;
  const bestModeRecord = Object.entries(stats.records).length > 0
    ? Math.max(...Object.values(stats.records))
    : null;

  return (
    <AppCard as="section" aria-label={game.label} className="relative overflow-hidden">
      {/* Identity glow behind the header */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -end-10 h-36 w-36 rounded-full opacity-60"
        style={{ background: `radial-gradient(circle, ${identity.tint} 0%, transparent 70%)` }}
      />

      <div className="relative flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border p-2.5"
          style={{ background: identity.tint, borderColor: identity.line }}
        >
          <Motif id={game.id} accent={identity.accent} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-title font-semibold text-foreground">{game.label}</h2>
            <span
              className="shrink-0 rounded-sm px-1.5 py-0.5 text-micro font-bold"
              style={{ background: identity.tint, color: identity.accent }}
            >
              {mastery.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-mini text-muted-foreground">{game.tagline}</p>

          {/* Real per-game facts only */}
          <p className="mt-1 text-mini tabular-nums text-muted-foreground" dir="rtl">
            {stats.played > 0 ? (
              <>
                <span dir="ltr">{stats.wins}</span> فوز من{' '}
                <span dir="ltr">{stats.played}</span>
                {winRate !== null && <> · {winRate}٪</>}
              </>
            ) : (
              'لم تُلاعب بعد'
            )}
          </p>
        </div>

        {/* Mastery stars encode the tier visually */}
        <div
          className="flex shrink-0 flex-col items-end gap-1"
          aria-label={`رتبة الإتقان ${mastery.tier} من ${MAX_TIER}`}
        >
          <div className="flex items-center gap-0.5">
            {Array.from({ length: MAX_TIER }, (_, i) => (
              <Star
                key={i}
                className={cn('h-3 w-3', i < mastery.tier ? '' : 'text-muted-foreground/35')}
                style={i < mastery.tier ? { color: identity.accent } : undefined}
                fill={i < mastery.tier ? 'currentColor' : undefined}
                aria-hidden
              />
            ))}
          </div>
          <span className="text-micro tabular-nums text-muted-foreground" dir="rtl">
            <span dir="ltr">{modesPlayed}/{totalModes}</span> أنماط
          </span>
        </div>
      </div>

      {/* Mastery progress toward the next tier */}
      <div className="relative mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" dir="ltr">
          <div
            className="h-full w-full origin-left rounded-full transition-transform duration-slow ease-out-expo"
            style={{ transform: `scaleX(${mastery.ratio})`, background: identity.accent }}
            role="progressbar"
            aria-valuenow={Math.round(mastery.ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`التقدّم نحو رتبة الإتقان القادمة في ${game.label}`}
          />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 text-mini text-muted-foreground">
          <span dir="rtl">
            {bestModeRecord !== null && (
              <>
                أفضل رقم لك: <span className="tabular-nums text-foreground" dir="ltr">{bestModeRecord}</span>
              </>
            )}
          </span>
          <span className="tabular-nums" dir="rtl">
            {mastery.remaining === null ? (
              'أعلى رتبة'
            ) : (
              <>
                <span dir="ltr">{mastery.remaining}</span> نقطة للرتبة القادمة
              </>
            )}
          </span>
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(game.path)}
          onMouseEnter={() => prefetchRoute(game.path)}
          className="flex h-11 flex-1 items-center justify-between rounded-button px-4 text-meta font-semibold transition-transform duration-normal ease-out-expo hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ background: identity.accent, color: '#fff' }}
        >
          <span>العب</span>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex h-11 items-center gap-1.5 rounded-button border px-3 text-meta font-semibold text-foreground transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ borderColor: identity.line }}
        >
          <span className="tabular-nums" dir="ltr">
            {game.modes.length}
          </span>
          أنماط
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-normal ease-out-expo', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      {/* Mode list. Rendered/unrendered rather than height-animated: animating
          height forces layout, which the design system forbids. */}
      {expanded && (
        <ul className="relative mt-3 space-y-2 border-t border-border pt-3">
          {game.modes.map((mode) => {
            const record = stats.records[mode.id];
            const played = stats.modesPlayed.includes(mode.id);
            return (
              <li key={mode.id}>
                <button
                  type="button"
                  onClick={() => navigate(mode.path)}
                  onMouseEnter={() => prefetchRoute(mode.path)}
                  className="flex w-full items-center gap-3 rounded-md border p-3 text-start transition-[transform,background-color] duration-normal ease-out-expo hover:-translate-y-0.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ borderColor: played ? identity.line : undefined }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-meta font-semibold text-foreground">{mode.label}</span>
                      {mode.flagship && (
                        <span
                          className="shrink-0 rounded-sm px-1.5 text-micro font-bold"
                          style={{ background: identity.tint, color: identity.accent }}
                        >
                          موسّع
                        </span>
                      )}
                      {!played && (
                        <span className="shrink-0 rounded-sm border border-border px-1.5 text-micro text-muted-foreground">
                          جديد
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-mini text-muted-foreground">{mode.detail}</span>
                    {(record !== undefined || mode.recordLabel) && (
                      <span className="mt-1 block text-micro tabular-nums text-muted-foreground" dir="rtl">
                        {record !== undefined && mode.recordLabel ? (
                          <>
                            {mode.recordLabel}: <span dir="ltr">{record}</span>
                          </>
                        ) : record !== undefined && !mode.recordLabel ? (
                          <>
                            رقمك: <span dir="ltr">{record}</span>
                          </>
                        ) : (
                          'لم تُجرَّب بعد'
                        )}
                      </span>
                    )}
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppCard>
  );
}

export const GameMasteryCard = memo(GameMasteryCardImpl);
export default GameMasteryCard;
