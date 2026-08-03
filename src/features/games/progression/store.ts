/**
 * Progression store — one local-first singleton, mirrored to Supabase.
 *
 * The games each used to own a localStorage blob AND their own cloud read/write
 * through `getGameProgress`/`saveGameProgress`, so a player's level lived in
 * three places with three different shapes and no conflict rule. Here there is
 * one document (`games:progression:v1`), one writer, and a single last-write-wins
 * merge on sign-in that prefers the higher lifetime XP — the only monotone field
 * we have, and therefore the only safe tie-breaker.
 */
import { getGameProgress, saveGameProgress } from '../api';
import { awardMatch, dayKey, emptyProgression, ensureChallenges, rollSeason } from './award';
import type { GameId, GameMode, MatchReport, MatchResult, ProgressionState } from './types';

const STORAGE_KEY = 'games:progression:v1';
const CLOUD_SLUG = 'progression';

type Listener = () => void;
const listeners = new Set<Listener>();
let state: ProgressionState | null = null;
let hydratedFromCloud = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const GAME_IDS: GameId[] = ['sudoku', 'chess', 'memory'];

/**
 * Defensive parse. A corrupted or hand-edited document degrades to defaults
 * field by field rather than throwing and wiping someone's history.
 */
export function parseProgression(raw: unknown): ProgressionState {
  const fallback = emptyProgression();
  if (typeof raw === 'string') {
    try {
      return parseProgression(JSON.parse(raw));
    } catch {
      return fallback;
    }
  }
  if (!isRecord(raw)) return fallback;

  const num = (value: unknown, min = 0): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min ? Math.floor(value) : 0;

  const mastery = { ...fallback.mastery };
  if (isRecord(raw.mastery)) {
    for (const game of GAME_IDS) {
      const entry = raw.mastery[game];
      if (!isRecord(entry)) continue;
      const records: Record<string, number> = {};
      if (isRecord(entry.records)) {
        for (const [mode, value] of Object.entries(entry.records)) {
          if (typeof value === 'number' && Number.isFinite(value)) records[mode] = value;
        }
      }
      mastery[game] = {
        xp: num(entry.xp),
        played: num(entry.played),
        wins: num(entry.wins),
        records: records as ProgressionState['mastery'][GameId]['records'],
        modesPlayed: Array.isArray(entry.modesPlayed)
          ? (entry.modesPlayed.filter((m): m is string => typeof m === 'string') as ProgressionState['mastery'][GameId]['modesPlayed'])
          : [],
      };
    }
  }

  const season = isRecord(raw.season) && typeof raw.season.id === 'string'
    ? {
        id: raw.season.id,
        xp: num(raw.season.xp),
        matches: num(raw.season.matches),
        wins: num(raw.season.wins),
      }
    : fallback.season;

  const achievements: Record<string, string> = {};
  if (isRecord(raw.achievements)) {
    for (const [id, day] of Object.entries(raw.achievements)) {
      if (typeof day === 'string') achievements[id] = day;
    }
  }

  const streak = isRecord(raw.streak)
    ? {
        current: num(raw.streak.current),
        best: num(raw.streak.best),
        lastPlayedDay: typeof raw.streak.lastPlayedDay === 'string' ? raw.streak.lastPlayedDay : null,
      }
    : fallback.streak;

  const challenges =
    isRecord(raw.challenges) && typeof raw.challenges.day === 'string' && Array.isArray(raw.challenges.items)
      ? {
          day: raw.challenges.day,
          items: raw.challenges.items
            .filter(isRecord)
            .filter((item) => typeof item.id === 'string')
            .map((item) => ({
              id: item.id as string,
              progress: num(item.progress),
              completed: item.completed === true,
              claimed: item.claimed === true,
              modes: Array.isArray(item.modes)
                ? (item.modes.filter((m): m is GameMode => typeof m === 'string') as GameMode[])
                : undefined,
            })),
        }
      : null;

  return {
    version: 1,
    xp: num(raw.xp),
    matches: num(raw.matches),
    wins: num(raw.wins),
    mastery,
    season,
    seasonHistory: Array.isArray(raw.seasonHistory)
      ? raw.seasonHistory
          .filter(isRecord)
          .filter((s) => typeof s.id === 'string')
          .slice(0, 6)
          .map((s) => ({
            id: s.id as string,
            xp: num(s.xp),
            matches: num(s.matches),
            wins: num(s.wins),
          }))
      : [],
    achievements,
    streak,
    challenges,
    firstWinDays: Array.isArray(raw.firstWinDays)
      ? raw.firstWinDays.filter((d): d is string => typeof d === 'string').slice(0, 7)
      : [],
  };
}

function load(): ProgressionState {
  if (state) return state;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  // Season rollover and today's challenge sheet are resolved on read so the very
  // first render already shows the right month and the right challenges.
  state = ensureChallenges(rollSeason(parseProgression(raw)), dayKey());
  return state;
}

function persist(next: ProgressionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / privacy mode — the session still works, it just won't persist */
  }
  // Cloud write is debounced inside `saveGameProgress` and is a no-op when the
  // user is signed out.
  void saveGameProgress(CLOUD_SLUG, next as unknown as Record<string, unknown>).catch(() => {
    /* offline or unauthenticated — local storage remains the source of truth */
  });
}

function commit(next: ProgressionState) {
  state = next;
  persist(next);
  for (const listener of listeners) listener();
}

export function getProgression(): ProgressionState {
  return load();
}

export function subscribeProgression(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Report a finished session. Returns the report so the caller can show the XP
 * breakdown, the level-up and any unlocked achievements.
 */
export function reportMatch(result: MatchResult): MatchReport {
  const { state: next, report } = awardMatch(load(), result);
  commit(next);
  return report;
}

/** Refresh season/challenge housekeeping (e.g. after midnight or a tab wake). */
export function refreshProgression(): void {
  const current = load();
  const next = ensureChallenges(rollSeason(current), dayKey());
  if (next !== current) commit(next);
}

/**
 * Pull the cloud document once per session and keep whichever copy has more
 * lifetime XP. XP only ever increases, so it is the one field that lets us
 * choose without asking the user to resolve a conflict.
 */
export async function hydrateFromCloud(): Promise<void> {
  if (hydratedFromCloud) return;
  hydratedFromCloud = true;
  try {
    const remote = await getGameProgress(CLOUD_SLUG);
    if (!remote) return;
    const parsed = parseProgression(remote);
    const local = load();
    if (parsed.xp > local.xp) {
      commit(ensureChallenges(rollSeason(parsed), dayKey()));
    }
  } catch {
    /* offline — nothing to reconcile */
  }
}

/** Test seam / "reset progress" action. */
export function resetProgression(): void {
  state = ensureChallenges(emptyProgression(), dayKey());
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}
