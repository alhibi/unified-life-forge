/**
 * Mihrab practice store — the daily-observance layer behind the hub.
 *
 * Before this existed, Mihrab was four screens of links: every tab was a list
 * of cards that navigated somewhere else, and the one "tracking" feature in the
 * UI was a card labelled «أوسمة نبوية … قريباً» that did nothing but flash the
 * word "soon" when tapped. There was nothing to come back to tomorrow.
 *
 * This module holds the three things a devotional companion actually needs to
 * remember, all local-first:
 *
 *   1. `dhikr`  — tasbih counts per dhikr id, per day, with a target.
 *   2. `wird`   — the daily Qur'an portion: whether today's reading is done.
 *   3. `sunnah` — which sunnahs the user committed to, and today's ticks.
 *
 * Design notes
 * ------------
 * • Storage is keyed by LOCAL calendar day (`YYYY-MM-DD` in device time), not
 *   by UTC. A UTC key rolls over at 03:00 in Riyadh and would wipe the evening's
 *   dhikr mid-session.
 * • History is capped at HISTORY_DAYS and pruned on every write, so the record
 *   is bounded without a separate sweep and the streak strip always has data.
 * • Streaks are computed, never stored. A stored counter drifts the moment a
 *   write is lost or the clock moves; recomputing from the day log cannot.
 * • The store is a module singleton exposed through `useSyncExternalStore`, so
 *   the header ring, the counter and the checklists all read one value and
 *   update in the same commit.
 * • Every mutation is pure at the data level (`applyX(state, …) → state`) and
 *   unit-tested; the React layer only wraps it.
 */

export const HISTORY_DAYS = 120;

const STORAGE_KEY = 'mihrab:practice:v1';

/* ── date helpers ───────────────────────────────────────────────────── */

/** Local-time day key. Never use toISOString() here — that is UTC. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return dayKey(date);
}

/* ── shape ──────────────────────────────────────────────────────────── */

export interface DhikrTarget {
  /** Dhikr id from the catalogue. */
  id: string;
  /** Repetitions the user aims for in one sitting. */
  target: number;
}

export interface DayRecord {
  /** dhikr id → repetitions counted that day. */
  dhikr: Record<string, number>;
  /** sunnah id → ticked. Absent means not ticked. */
  sunnah: Record<string, boolean>;
  /** Qur'an portion completed that day. */
  wirdDone: boolean;
}

export interface PracticeState {
  /** dayKey → record. Pruned to HISTORY_DAYS. */
  days: Record<string, DayRecord>;
  /** Dhikr the user pinned to the counter, in display order. */
  dhikrTargets: DhikrTarget[];
  /** Sunnahs the user committed to track, in display order. */
  committedSunnah: string[];
  /** Daily Qur'an portion the user set for themselves. */
  wird: { pages: number } | null;
}

const EMPTY_DAY: DayRecord = { dhikr: {}, sunnah: {}, wirdDone: false };

export const DEFAULT_STATE: PracticeState = {
  days: {},
  dhikrTargets: [
    { id: 'subhan-allah', target: 33 },
    { id: 'alhamdulillah', target: 33 },
    { id: 'allahu-akbar', target: 34 },
  ],
  committedSunnah: [],
  wird: null,
};

/* ── pure reducers (tested directly) ───────────────────────────────── */

function pruneDays(days: Record<string, DayRecord>, today = dayKey()): Record<string, DayRecord> {
  const cutoff = addDays(today, -HISTORY_DAYS);
  const out: Record<string, DayRecord> = {};
  for (const [key, record] of Object.entries(days)) {
    // Lexicographic comparison is valid for zero-padded YYYY-MM-DD.
    if (key >= cutoff) out[key] = record;
  }
  return out;
}

function dayOf(state: PracticeState, key: string): DayRecord {
  return state.days[key] ?? EMPTY_DAY;
}

export function applyDhikrCount(
  state: PracticeState,
  dhikrId: string,
  delta: number,
  today = dayKey(),
): PracticeState {
  const record = dayOf(state, today);
  const next = Math.max(0, (record.dhikr[dhikrId] ?? 0) + delta);
  return {
    ...state,
    days: pruneDays(
      { ...state.days, [today]: { ...record, dhikr: { ...record.dhikr, [dhikrId]: next } } },
      today,
    ),
  };
}

export function applyDhikrReset(state: PracticeState, dhikrId: string, today = dayKey()): PracticeState {
  const record = dayOf(state, today);
  const dhikr = { ...record.dhikr };
  delete dhikr[dhikrId];
  return { ...state, days: { ...state.days, [today]: { ...record, dhikr } } };
}

export function applySunnahToggle(state: PracticeState, sunnahId: string, today = dayKey()): PracticeState {
  const record = dayOf(state, today);
  const ticked = !record.sunnah[sunnahId];
  const sunnah = { ...record.sunnah };
  if (ticked) sunnah[sunnahId] = true;
  else delete sunnah[sunnahId];
  return { ...state, days: pruneDays({ ...state.days, [today]: { ...record, sunnah } }, today) };
}

export function applyWirdToggle(state: PracticeState, today = dayKey()): PracticeState {
  const record = dayOf(state, today);
  return {
    ...state,
    days: pruneDays({ ...state.days, [today]: { ...record, wirdDone: !record.wirdDone } }, today),
  };
}

export function applyCommitSunnah(state: PracticeState, sunnahId: string): PracticeState {
  const committed = state.committedSunnah.includes(sunnahId)
    ? state.committedSunnah.filter((id) => id !== sunnahId)
    : [...state.committedSunnah, sunnahId];
  return { ...state, committedSunnah: committed };
}

export function applyDhikrTarget(state: PracticeState, dhikrId: string, target: number): PracticeState {
  const clamped = Math.max(1, Math.min(10_000, Math.round(target)));
  const existing = state.dhikrTargets.find((t) => t.id === dhikrId);
  const dhikrTargets = existing
    ? state.dhikrTargets.map((t) => (t.id === dhikrId ? { ...t, target: clamped } : t))
    : [...state.dhikrTargets, { id: dhikrId, target: clamped }];
  return { ...state, dhikrTargets };
}

export function applyToggleDhikrPinned(state: PracticeState, dhikrId: string, defaultTarget: number): PracticeState {
  const exists = state.dhikrTargets.some((t) => t.id === dhikrId);
  return exists
    ? { ...state, dhikrTargets: state.dhikrTargets.filter((t) => t.id !== dhikrId) }
    : { ...state, dhikrTargets: [...state.dhikrTargets, { id: dhikrId, target: defaultTarget }] };
}

export function applySetWird(state: PracticeState, pages: number | null): PracticeState {
  if (pages === null) return { ...state, wird: null };
  return { ...state, wird: { pages: Math.max(1, Math.min(120, Math.round(pages))) } };
}

/* ── derived selectors ─────────────────────────────────────────────── */

export interface DayProgress {
  /** 0..1 share of the day's pinned dhikr targets that were met. */
  dhikrRatio: number;
  /** 0..1 share of committed sunnahs ticked. */
  sunnahRatio: number;
  /** Wird done today (false when no wird is configured). */
  wirdDone: boolean;
  /** Whether a wird is configured at all. */
  wirdSet: boolean;
  /** Weighted overall completion, 0..1, over the goals that exist. */
  overall: number;
  /** True when every configured goal is met. */
  complete: boolean;
}

export function selectDayProgress(state: PracticeState, key = dayKey()): DayProgress {
  const record = dayOf(state, key);

  const targets = state.dhikrTargets;
  const dhikrRatio =
    targets.length === 0
      ? 0
      : targets.reduce((acc, t) => acc + Math.min(1, (record.dhikr[t.id] ?? 0) / t.target), 0) / targets.length;

  const sunnahRatio =
    state.committedSunnah.length === 0
      ? 0
      : state.committedSunnah.filter((id) => record.sunnah[id]).length / state.committedSunnah.length;

  const wirdSet = state.wird !== null;
  const wirdDone = wirdSet && record.wirdDone;

  // Only goals the user actually set count toward "overall" — otherwise an
  // untouched Sunnah list would permanently cap the ring at two thirds.
  const parts: number[] = [];
  if (targets.length > 0) parts.push(dhikrRatio);
  if (state.committedSunnah.length > 0) parts.push(sunnahRatio);
  if (wirdSet) parts.push(wirdDone ? 1 : 0);

  const overall = parts.length === 0 ? 0 : parts.reduce((a, b) => a + b, 0) / parts.length;

  return {
    dhikrRatio,
    sunnahRatio,
    wirdDone,
    wirdSet,
    overall,
    complete: parts.length > 0 && overall >= 0.999,
  };
}

/**
 * A day "counts" toward the streak when at least one goal was met — a strict
 * all-or-nothing rule punishes a busy day and makes the streak useless as
 * encouragement, which is the only thing a streak is for.
 */
export function isDayActive(state: PracticeState, key: string): boolean {
  const record = state.days[key];
  if (!record) return false;
  if (record.wirdDone) return true;
  if (Object.keys(record.sunnah).length > 0) return true;
  const targets = state.dhikrTargets;
  return targets.some((t) => (record.dhikr[t.id] ?? 0) >= t.target);
}

export interface StreakInfo {
  /** Consecutive active days ending today (or yesterday if today is untouched). */
  current: number;
  /** Longest run inside the retained history. */
  best: number;
  /** Active days in the retained history. */
  total: number;
}

export function selectStreak(state: PracticeState, today = dayKey()): StreakInfo {
  // Today not being done yet must not break a streak mid-afternoon, so the
  // count is allowed to start at yesterday.
  let cursor = isDayActive(state, today) ? today : addDays(today, -1);
  let current = 0;
  while (isDayActive(state, cursor) && current <= HISTORY_DAYS) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let total = 0;
  for (let i = HISTORY_DAYS; i >= 0; i -= 1) {
    const key = addDays(today, -i);
    if (isDayActive(state, key)) {
      run += 1;
      total += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return { current, best, total };
}

/** Last `days` day keys, oldest first, with their activity — for the heat strip. */
export function selectRecentDays(
  state: PracticeState,
  days = 28,
  today = dayKey(),
): { key: string; active: boolean; progress: number }[] {
  const out: { key: string; active: boolean; progress: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = addDays(today, -i);
    out.push({
      key,
      active: isDayActive(state, key),
      progress: selectDayProgress(state, key).overall,
    });
  }
  return out;
}

export function selectDhikrCount(state: PracticeState, dhikrId: string, key = dayKey()): number {
  return dayOf(state, key).dhikr[dhikrId] ?? 0;
}

export function selectSunnahTicked(state: PracticeState, sunnahId: string, key = dayKey()): boolean {
  return dayOf(state, key).sunnah[sunnahId] === true;
}

/* ── persistence ────────────────────────────────────────────────────── */

type Listener = () => void;
const listeners = new Set<Listener>();
let state: PracticeState | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Defensive parse: a corrupted blob must degrade to defaults, never throw. */
export function parseState(raw: string | null): PracticeState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_STATE;

    const days: Record<string, DayRecord> = {};
    if (isRecord(parsed.days)) {
      for (const [key, value] of Object.entries(parsed.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isRecord(value)) continue;
        const dhikr: Record<string, number> = {};
        if (isRecord(value.dhikr)) {
          for (const [id, n] of Object.entries(value.dhikr)) {
            if (typeof n === 'number' && Number.isFinite(n) && n >= 0) dhikr[id] = Math.round(n);
          }
        }
        const sunnah: Record<string, boolean> = {};
        if (isRecord(value.sunnah)) {
          for (const [id, v] of Object.entries(value.sunnah)) if (v === true) sunnah[id] = true;
        }
        days[key] = { dhikr, sunnah, wirdDone: value.wirdDone === true };
      }
    }

    const dhikrTargets = Array.isArray(parsed.dhikrTargets)
      ? parsed.dhikrTargets
          .filter((t): t is DhikrTarget => isRecord(t) && typeof t.id === 'string' && typeof t.target === 'number')
          .map((t) => ({ id: t.id, target: Math.max(1, Math.round(t.target)) }))
      : DEFAULT_STATE.dhikrTargets;

    const committedSunnah = Array.isArray(parsed.committedSunnah)
      ? parsed.committedSunnah.filter((id): id is string => typeof id === 'string')
      : [];

    // Clamp with the same bounds `applySetWird` enforces, so a hand-edited or
    // corrupted blob cannot smuggle in a value the setter would have rejected.
    const wird =
      isRecord(parsed.wird) && typeof parsed.wird.pages === 'number' && Number.isFinite(parsed.wird.pages)
        ? { pages: Math.max(1, Math.min(120, Math.round(parsed.wird.pages))) }
        : null;

    return { days: pruneDays(days), dhikrTargets, committedSunnah, wird };
  } catch {
    return DEFAULT_STATE;
  }
}

function load(): PracticeState {
  if (state) return state;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  state = parseState(raw);
  return state;
}

function commit(next: PracticeState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota or privacy mode — the session still works, it just won't persist */
  }
  for (const listener of listeners) listener();
}

export function getPracticeState(): PracticeState {
  return load();
}

export function subscribePractice(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Apply a pure reducer to the live store. */
export function updatePractice(reducer: (state: PracticeState) => PracticeState): void {
  commit(reducer(load()));
}

/** Test seam. */
export function resetPracticeStore(): void {
  state = DEFAULT_STATE;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}
