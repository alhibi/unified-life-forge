/**
 * conserve.ts — one policy for "the device is asking us to do less".
 *
 * Three separate signals used to be read in three different places, each with
 * its own opinion:
 *   • the user's own توفير البطارية / توفير البيانات switches
 *     (SystemEngineContext writes them to <html data-battery-saver|data-data-saver>),
 *   • the OS-level Save-Data header and `effectiveType` on 2g/3g,
 *   • actual battery level while unplugged.
 *
 * This module collapses them into ONE answer and one number, so a poller never
 * has to guess. The contract is intentionally narrow:
 *
 *   isConserving()          → should non-essential work be reduced at all?
 *   conserveLevel()         → 'off' | 'soft' | 'hard'
 *   pollInterval(base)      → the interval a poller should ACTUALLY use
 *   subscribeConserve(fn)   → re-run when the answer changes
 *
 * `pollInterval` is the important one: every background refresh in the app
 * routes through it, so tuning the policy is a one-line change instead of a
 * codebase sweep. It also returns `null` for hard conservation on work that
 * declares itself optional, which means "do not poll at all — refresh when the
 * user looks at it".
 *
 * Nothing here throws on an old WebView: every API is feature-detected.
 */

export type ConserveLevel = 'off' | 'soft' | 'hard';

interface NavigatorConnection {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: EventTarget['addEventListener'];
  removeEventListener?: EventTarget['removeEventListener'];
}

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

function connection(): NavigatorConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NavigatorConnection }).connection;
}

/* Battery is async-only, so we cache the last reading and refresh it on the
   plugin's own events rather than polling the battery to save battery. */
let batteryLevel = 1;
let batteryCharging = true;
let batteryWatched = false;

function watchBattery(): void {
  if (batteryWatched || typeof navigator === 'undefined') return;
  batteryWatched = true;
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryLike> })
    .getBattery;
  if (!getBattery) return;
  void getBattery
    .call(navigator)
    .then((bm) => {
      const read = () => {
        batteryLevel = bm.level;
        batteryCharging = bm.charging;
        notify();
      };
      bm.addEventListener('levelchange', read);
      bm.addEventListener('chargingchange', read);
      read();
    })
    .catch(() => undefined);
}

/** True when the user (or the OS) explicitly asked to save data. */
export function isDataSaving(): boolean {
  const attr =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-data-saver') === 'true';
  return attr || connection()?.saveData === true;
}

/** True when the connection itself is too slow for chatty background work. */
export function isSlowConnection(): boolean {
  const type = connection()?.effectiveType;
  return type === 'slow-2g' || type === '2g' || type === '3g';
}

export function conserveLevel(): ConserveLevel {
  watchBattery();

  const saverOn =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-battery-saver') === 'true';
  const criticalBattery = !batteryCharging && batteryLevel <= 0.1;
  const lowBattery = !batteryCharging && batteryLevel <= 0.2;

  // HARD: the device is genuinely in trouble, or the user asked for the
  // strongest saving while also being on a bad pipe.
  if (criticalBattery || (saverOn && (isSlowConnection() || isDataSaving()))) return 'hard';
  if (saverOn || lowBattery || isDataSaving() || isSlowConnection()) return 'soft';
  return 'off';
}

export function isConserving(): boolean {
  return conserveLevel() !== 'off';
}

/**
 * The interval a background refresh should actually use.
 *
 * @param baseMs   the interval the feature wants on a healthy device
 * @param optional pass true for work the user does not miss if it stops
 *                 (decorative tickers, price refreshes on a screen they can
 *                 pull to refresh). Optional work is suspended entirely at the
 *                 hard level.
 */
export function pollInterval(baseMs: number, optional = false): number | null {
  switch (conserveLevel()) {
    case 'hard':
      return optional ? null : baseMs * 6;
    case 'soft':
      return baseMs * 3;
    default:
      return baseMs;
  }
}

/* ── Change notification ─────────────────────────────────────────────
   Pollers subscribe once and re-arm themselves; there is a single set of
   platform listeners no matter how many subscribers exist. */

type Listener = () => void;
const listeners = new Set<Listener>();
let attached = false;
let lastLevel: ConserveLevel | null = null;

function notify(): void {
  const level = conserveLevel();
  if (level === lastLevel) return;
  lastLevel = level;
  for (const fn of listeners) fn();
}

function attach(): void {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  lastLevel = conserveLevel();

  const conn = connection();
  conn?.addEventListener?.('change', notify);

  // The saver switches are expressed as attributes on <html>, so an observer
  // is both the cheapest and the most reliable way to hear about them —
  // no context plumbing, works from plain modules.
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-battery-saver', 'data-data-saver'],
  });

  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  watchBattery();
}

export function subscribeConserve(fn: Listener): () => void {
  attach();
  listeners.add(fn);
  return () => listeners.delete(fn);
}
