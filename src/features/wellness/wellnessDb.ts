/**
 * Wellness local database (IndexedDB).
 *
 * Fully offline. No network calls. No third-party dependencies.
 * Stores:
 *  - supplements: the user's active supplement / vitamin plan
 *  - intake_logs: timestamps of actual doses taken
 *  - diet_logs: foods the user ate on a given day
 *  - skin_hair_logs: daily self-ratings of skin / hair / lifestyle signals
 */

export type UUID = string;

export interface Supplement {
  id: UUID;
  name: string;               // user-facing label (any language)
  dose: string;               // free text e.g. "1000 IU", "500 mg"
  times: string[];            // "HH:MM" 24h strings, one entry per daily dose
  withFood: 'with' | 'without' | 'any';
  nutrientKeys: string[];     // keys from the static nutrient catalog
  notes?: string;
  color?: string;             // optional accent token for the card
  active: boolean;
  createdAt: number;
}

export interface IntakeLog {
  id: UUID;
  supplementId: UUID;
  takenAt: number;            // epoch ms
  scheduledTime?: string;     // "HH:MM" that this dose was meant for
}

export interface DietLog {
  id: UUID;
  date: string;               // "YYYY-MM-DD"
  foodKey: string;            // catalog key OR "custom:<name>"
  portion: number;            // multiplier, default 1
  loggedAt: number;
}

export interface SkinHairLog {
  id: UUID;
  date: string;               // "YYYY-MM-DD" — one record per day (upsert)
  skinHydration: number;      // 1..5
  skinOiliness: number;       // 1..5
  skinBreakouts: number;      // 1..5 (1 = none, 5 = severe)
  hairFall: number;           // 1..5 (1 = none, 5 = severe)
  hairLuster: number;         // 1..5
  sleepHours: number;         // 0..14
  waterGlasses: number;       // 0..20
  stress: number;             // 1..5
  // Body extensions (all optional for backward compatibility)
  eyeFatigue?: number;        // 1..5 (1 = fresh, 5 = exhausted)
  eyeDryness?: number;        // 1..5
  jointPain?: number;         // 1..5
  jointStiffness?: number;    // 1..5
  muscleSoreness?: number;    // 1..5
  muscleEnergy?: number;      // 1..5
  notes?: string;
  loggedAt: number;
}

const DB_NAME = 'wellness-db';
const DB_VERSION = 2;

const STORES = {
  supplements: 'supplements',
  intakeLogs: 'intake_logs',
  dietLogs: 'diet_logs',
  skinHair: 'skin_hair_logs',
  vitals: 'vital_logs',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.supplements)) {
        db.createObjectStore(STORES.supplements, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.intakeLogs)) {
        const s = db.createObjectStore(STORES.intakeLogs, { keyPath: 'id' });
        s.createIndex('by_supplement', 'supplementId', { unique: false });
        s.createIndex('by_time', 'takenAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.dietLogs)) {
        const s = db.createObjectStore(STORES.dietLogs, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.skinHair)) {
        const s = db.createObjectStore(STORES.skinHair, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: true });
      }
      if (!db.objectStoreNames.contains(STORES.vitals)) {
        const s = db.createObjectStore(STORES.vitals, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function uuid(): UUID {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode) {
  return db.transaction(store, mode).objectStore(store);
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return req<T[]>(tx(db, store, 'readonly').getAll());
}

async function put<T>(store: string, value: T): Promise<T> {
  const db = await openDb();
  await req(tx(db, store, 'readwrite').put(value));
  return value;
}

async function del(store: string, id: UUID): Promise<void> {
  const db = await openDb();
  await req(tx(db, store, 'readwrite').delete(id));
}

// ---------- Supplements ----------

export async function listSupplements(): Promise<Supplement[]> {
  const all = await getAll<Supplement>(STORES.supplements);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveSupplement(
  input: Omit<Supplement, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number },
): Promise<Supplement> {
  const s: Supplement = {
    id: input.id ?? uuid(),
    name: input.name,
    dose: input.dose,
    times: input.times,
    withFood: input.withFood,
    nutrientKeys: input.nutrientKeys,
    notes: input.notes,
    color: input.color,
    active: input.active,
    createdAt: input.createdAt ?? Date.now(),
  };
  return put(STORES.supplements, s);
}

export async function deleteSupplement(id: UUID): Promise<void> {
  await del(STORES.supplements, id);
}

// ---------- Intake Logs ----------

export async function listIntakeLogs(): Promise<IntakeLog[]> {
  const all = await getAll<IntakeLog>(STORES.intakeLogs);
  return all.sort((a, b) => b.takenAt - a.takenAt);
}

export async function logIntake(
  supplementId: UUID,
  scheduledTime?: string,
): Promise<IntakeLog> {
  const entry: IntakeLog = {
    id: uuid(),
    supplementId,
    takenAt: Date.now(),
    scheduledTime,
  };
  return put(STORES.intakeLogs, entry);
}

export async function deleteIntakeLog(id: UUID): Promise<void> {
  await del(STORES.intakeLogs, id);
}

// ---------- Diet Logs ----------

export async function listDietLogs(): Promise<DietLog[]> {
  const all = await getAll<DietLog>(STORES.dietLogs);
  return all.sort((a, b) => b.loggedAt - a.loggedAt);
}

export async function listDietLogsForDate(date: string): Promise<DietLog[]> {
  const all = await listDietLogs();
  return all.filter((d) => d.date === date);
}

export async function logDiet(
  date: string,
  foodKey: string,
  portion = 1,
): Promise<DietLog> {
  const entry: DietLog = {
    id: uuid(),
    date,
    foodKey,
    portion,
    loggedAt: Date.now(),
  };
  return put(STORES.dietLogs, entry);
}

export async function deleteDietLog(id: UUID): Promise<void> {
  await del(STORES.dietLogs, id);
}

// ---------- Skin / Hair logs ----------

export async function listSkinHairLogs(): Promise<SkinHairLog[]> {
  const all = await getAll<SkinHairLog>(STORES.skinHair);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSkinHairForDate(date: string): Promise<SkinHairLog | null> {
  const all = await listSkinHairLogs();
  return all.find((l) => l.date === date) ?? null;
}

export async function upsertSkinHair(
  entry: Omit<SkinHairLog, 'id' | 'loggedAt'> & { id?: UUID },
): Promise<SkinHairLog> {
  // Enforce one record per date
  const existing = await getSkinHairForDate(entry.date);
  const out: SkinHairLog = {
    id: entry.id ?? existing?.id ?? uuid(),
    date: entry.date,
    skinHydration: entry.skinHydration,
    skinOiliness: entry.skinOiliness,
    skinBreakouts: entry.skinBreakouts,
    hairFall: entry.hairFall,
    hairLuster: entry.hairLuster,
    sleepHours: entry.sleepHours,
    waterGlasses: entry.waterGlasses,
    stress: entry.stress,
    eyeFatigue: entry.eyeFatigue,
    eyeDryness: entry.eyeDryness,
    jointPain: entry.jointPain,
    jointStiffness: entry.jointStiffness,
    muscleSoreness: entry.muscleSoreness,
    muscleEnergy: entry.muscleEnergy,
    notes: entry.notes,
    loggedAt: Date.now(),
  };
  return put(STORES.skinHair, out);
}

export async function deleteSkinHair(id: UUID): Promise<void> {
  await del(STORES.skinHair, id);
}

// ---------- Export / Wipe (privacy control) ----------

export async function exportAll(): Promise<{
  supplements: Supplement[];
  intakeLogs: IntakeLog[];
  dietLogs: DietLog[];
  skinHairLogs: SkinHairLog[];
  exportedAt: number;
}> {
  const [supplements, intakeLogs, dietLogs, skinHairLogs] = await Promise.all([
    listSupplements(),
    listIntakeLogs(),
    listDietLogs(),
    listSkinHairLogs(),
  ]);
  return { supplements, intakeLogs, dietLogs, skinHairLogs, exportedAt: Date.now() };
}

export async function wipeAll(): Promise<void> {
  const db = await openDb();
  await Promise.all(
    Object.values(STORES).map(
      (s) =>
        new Promise<void>((resolve, reject) => {
          const r = db.transaction(s, 'readwrite').objectStore(s).clear();
          r.onsuccess = () => resolve();
          r.onerror = () => reject(r.error);
        }),
    ),
  );
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
