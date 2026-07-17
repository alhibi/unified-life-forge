/**
 * Wellness cloud database (Supabase).
 *
 * Backed by the `wellness_records` table with RLS — each signed-in user
 * reads and writes only their own rows. Every domain type is stored as
 * a JSONB `data` payload, keyed by (user_id, kind, record_id).
 *
 * If no user is signed in, list functions return empty arrays and
 * writes throw. Callers should gate the UI on auth.
 *
 * Kinds:
 *  - supplements:    user's active supplement / vitamin plan
 *  - intake_logs:    timestamps of actual doses taken
 *  - diet_logs:      foods the user ate on a given day
 *  - skin_hair_logs: daily self-ratings of skin / hair / lifestyle signals
 *  - vital_logs:     daily vitals (steps, sleep, HR, weight, BP…)
 *  - athlete_profile:   single record (id="me"); biometrics, sex, goal, units
 *  - workouts:          full strength / cardio sessions with sets[]
 *  - goals:             per-metric daily / weekly targets (water, sleep, …)
 *  - hydration_events:  per-event water intake (ml) — powers the daily ring
 *  - fasting_sessions:  intermittent-fasting sessions with target window
 */

import { supabase } from '@/integrations/supabase/client';

export type UUID = string;

export interface Supplement {
  id: UUID;
  name: string;
  dose: string;
  times: string[];
  withFood: 'with' | 'without' | 'any';
  nutrientKeys: string[];
  notes?: string;
  color?: string;
  active: boolean;
  createdAt: number;
}

export interface IntakeLog {
  id: UUID;
  supplementId: UUID;
  takenAt: number;
  scheduledTime?: string;
}

export interface DietLog {
  id: UUID;
  date: string;
  foodKey: string;
  portion: number;
  loggedAt: number;
}

export interface SkinHairLog {
  id: UUID;
  date: string;
  skinHydration: number;
  skinOiliness: number;
  skinBreakouts: number;
  hairFall: number;
  hairLuster: number;
  sleepHours: number;
  waterGlasses: number;
  stress: number;
  eyeFatigue?: number;
  eyeDryness?: number;
  jointPain?: number;
  jointStiffness?: number;
  muscleSoreness?: number;
  muscleEnergy?: number;
  notes?: string;
  loggedAt: number;
}

export interface VitalLog {
  id: UUID;
  date: string;
  steps?: number;
  sleepHours?: number;
  sleepQuality?: number;
  restingHR?: number;
  hrv?: number;                // heart-rate variability (ms) — premium
  weightKg?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  hydrationLiters?: number;
  energy?: number;
  mood?: number;
  notes?: string;
  loggedAt: number;
}

/* ───────────── Premium athletic models ───────────── */

export type Sex = 'male' | 'female';
export type ActivityLevel =
  | 'sedentary'   // desk job, no training
  | 'light'       // 1-2 sessions / week
  | 'moderate'    // 3-4 sessions / week
  | 'active'      // 5-6 sessions / week
  | 'athlete';    // 2x/day or competitive
export type FitnessGoal = 'cut' | 'recomp' | 'maintain' | 'lean_bulk' | 'bulk' | 'performance';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Units = 'metric' | 'imperial';

export interface AthleteProfile {
  id: 'me';                    // singleton
  name?: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg?: number;           // optional: latest VitalLog wins if absent
  waistCm?: number;            // for Navy BF formula
  hipCm?: number;              // women only — Navy BF
  neckCm?: number;             // for Navy BF formula
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  experience: Experience;
  units: Units;
  /** kg: rough custom 1RM ceilings the user wants to track. */
  targets?: { squat?: number; bench?: number; deadlift?: number; ohp?: number };
  updatedAt: number;
}

export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'mobility' | 'sport';

export interface SetEntry {
  reps?: number;
  weightKg?: number;
  rpe?: number;                // rate of perceived exertion 1-10
  durationSec?: number;        // for cardio / time-based
  distanceKm?: number;         // for cardio
}

export interface ExerciseEntry {
  exerciseKey: string;         // catalog key OR "custom:<name>"
  sets: SetEntry[];
  notes?: string;
}

export interface WorkoutSession {
  id: UUID;
  date: string;                // YYYY-MM-DD
  startedAt: number;           // epoch ms
  endedAt?: number;
  type: WorkoutType;
  title?: string;
  exercises: ExerciseEntry[];
  /** Subjective session RPE — used by the recovery / load engine. */
  sessionRpe?: number;         // 1-10
  perceivedSoreness?: number;  // 1-5 (recorded next morning)
  notes?: string;
}

export type GoalMetric =
  | 'steps' | 'sleep' | 'water' | 'protein'
  | 'workouts' | 'weight' | 'streak' | 'calories';

export interface Goal {
  id: UUID;
  metric: GoalMetric;
  target: number;
  /** daily target by default, weekly target for workouts. */
  period: 'daily' | 'weekly';
  active: boolean;
  createdAt: number;
}

export interface HydrationEvent {
  id: UUID;
  date: string;                // YYYY-MM-DD
  ts: number;                  // epoch ms
  amountMl: number;
  source?: 'water' | 'tea' | 'coffee' | 'electrolyte' | 'other';
}

export interface FastingSession {
  id: UUID;
  startedAt: number;           // epoch ms
  endedAt?: number;
  targetHours: number;         // e.g. 16
  protocol?: string;           // "16:8", "18:6", "OMAD", "Custom"
  notes?: string;
}

/* ─────────────────────── Storage layout ─────────────────────── */

const DB_NAME = 'wellness-db';
const DB_VERSION = 3;

const STORES = {
  supplements: 'supplements',
  intakeLogs: 'intake_logs',
  dietLogs: 'diet_logs',
  skinHair: 'skin_hair_logs',
  vitals: 'vital_logs',
  // ── premium ──
  profile: 'athlete_profile',
  workouts: 'workouts',
  goals: 'goals',
  hydration: 'hydration_events',
  fasting: 'fasting_sessions',
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
      // v1
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
      // v2
      if (!db.objectStoreNames.contains(STORES.vitals)) {
        const s = db.createObjectStore(STORES.vitals, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: true });
      }
      // v3 — premium athletic stores
      if (!db.objectStoreNames.contains(STORES.profile)) {
        db.createObjectStore(STORES.profile, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.workouts)) {
        const s = db.createObjectStore(STORES.workouts, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: false });
        s.createIndex('by_started', 'startedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.goals)) {
        const s = db.createObjectStore(STORES.goals, { keyPath: 'id' });
        s.createIndex('by_metric', 'metric', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.hydration)) {
        const s = db.createObjectStore(STORES.hydration, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.fasting)) {
        const s = db.createObjectStore(STORES.fasting, { keyPath: 'id' });
        s.createIndex('by_started', 'startedAt', { unique: false });
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

async function del(store: string, id: string): Promise<void> {
  const db = await openDb();
  await req(tx(db, store, 'readwrite').delete(id));
}

async function getOne<T>(store: string, id: string): Promise<T | undefined> {
  const db = await openDb();
  return req<T>(tx(db, store, 'readonly').get(id));
}

/* ─────────────────── Supplements ─────────────────── */

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

/* ─────────────────── Intake Logs ─────────────────── */

export async function listIntakeLogs(): Promise<IntakeLog[]> {
  const all = await getAll<IntakeLog>(STORES.intakeLogs);
  return all.sort((a, b) => b.takenAt - a.takenAt);
}

export async function logIntake(
  supplementId: UUID,
  scheduledTime?: string,
): Promise<IntakeLog> {
  const entry: IntakeLog = { id: uuid(), supplementId, takenAt: Date.now(), scheduledTime };
  return put(STORES.intakeLogs, entry);
}

export async function deleteIntakeLog(id: UUID): Promise<void> {
  await del(STORES.intakeLogs, id);
}

/* ─────────────────── Diet Logs ─────────────────── */

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
  const entry: DietLog = { id: uuid(), date, foodKey, portion, loggedAt: Date.now() };
  return put(STORES.dietLogs, entry);
}

/**
 * Update an existing diet log entry — currently used to tune `portion`
 * after logging (the original API only let you add/remove items, which
 * forced users to delete-and-re-log to fix a portion).
 */
export async function updateDietLog(
  id: UUID,
  patch: Partial<Pick<DietLog, 'portion' | 'foodKey' | 'date'>>,
): Promise<DietLog | null> {
  const cur = await getOne<DietLog>(STORES.dietLogs, id);
  if (!cur) return null;
  const updated: DietLog = {
    ...cur,
    ...patch,
    portion: patch.portion != null ? Math.max(0.25, patch.portion) : cur.portion,
  };
  return put(STORES.dietLogs, updated);
}

export async function deleteDietLog(id: UUID): Promise<void> {
  await del(STORES.dietLogs, id);
}

/* ─────────────────── Skin / Hair logs ─────────────────── */

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

/* ─────────────────── Vitals ─────────────────── */

export async function listVitals(): Promise<VitalLog[]> {
  const all = await getAll<VitalLog>(STORES.vitals);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getVitalForDate(date: string): Promise<VitalLog | null> {
  const all = await listVitals();
  return all.find((v) => v.date === date) ?? null;
}

export async function upsertVital(
  entry: Omit<VitalLog, 'id' | 'loggedAt'> & { id?: UUID },
): Promise<VitalLog> {
  const existing = await getVitalForDate(entry.date);
  const out: VitalLog = {
    id: entry.id ?? existing?.id ?? uuid(),
    date: entry.date,
    steps: entry.steps,
    sleepHours: entry.sleepHours,
    sleepQuality: entry.sleepQuality,
    restingHR: entry.restingHR,
    hrv: entry.hrv,
    weightKg: entry.weightKg,
    bpSystolic: entry.bpSystolic,
    bpDiastolic: entry.bpDiastolic,
    hydrationLiters: entry.hydrationLiters,
    energy: entry.energy,
    mood: entry.mood,
    notes: entry.notes,
    loggedAt: Date.now(),
  };
  return put(STORES.vitals, out);
}

export async function deleteVital(id: UUID): Promise<void> {
  await del(STORES.vitals, id);
}

/* ─────────────────── Profile (singleton) ─────────────────── */

export async function getProfile(): Promise<AthleteProfile | null> {
  const p = await getOne<AthleteProfile>(STORES.profile, 'me');
  return p ?? null;
}

export async function saveProfile(
  input: Omit<AthleteProfile, 'id' | 'updatedAt'>,
): Promise<AthleteProfile> {
  const out: AthleteProfile = { id: 'me', ...input, updatedAt: Date.now() };
  return put(STORES.profile, out);
}

/* ─────────────────── Workouts ─────────────────── */

export async function listWorkouts(): Promise<WorkoutSession[]> {
  const all = await getAll<WorkoutSession>(STORES.workouts);
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function saveWorkout(
  input: Omit<WorkoutSession, 'id'> & { id?: UUID },
): Promise<WorkoutSession> {
  const out: WorkoutSession = { id: input.id ?? uuid(), ...input };
  return put(STORES.workouts, out);
}

export async function deleteWorkout(id: UUID): Promise<void> {
  await del(STORES.workouts, id);
}

/* ─────────────────── Goals ─────────────────── */

export async function listGoals(): Promise<Goal[]> {
  const all = await getAll<Goal>(STORES.goals);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveGoal(
  input: Omit<Goal, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number },
): Promise<Goal> {
  const out: Goal = {
    id: input.id ?? uuid(),
    metric: input.metric,
    target: input.target,
    period: input.period,
    active: input.active,
    createdAt: input.createdAt ?? Date.now(),
  };
  return put(STORES.goals, out);
}

export async function deleteGoal(id: UUID): Promise<void> {
  await del(STORES.goals, id);
}

/* ─────────────────── Hydration events ─────────────────── */

export async function listHydration(): Promise<HydrationEvent[]> {
  const all = await getAll<HydrationEvent>(STORES.hydration);
  return all.sort((a, b) => b.ts - a.ts);
}

export async function logHydration(
  amountMl: number,
  source: HydrationEvent['source'] = 'water',
): Promise<HydrationEvent> {
  const now = Date.now();
  const date = todayIso();
  const e: HydrationEvent = { id: uuid(), date, ts: now, amountMl, source };
  return put(STORES.hydration, e);
}

export async function deleteHydration(id: UUID): Promise<void> {
  await del(STORES.hydration, id);
}

/* ─────────────────── Fasting sessions ─────────────────── */

export async function listFasting(): Promise<FastingSession[]> {
  const all = await getAll<FastingSession>(STORES.fasting);
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getActiveFasting(): Promise<FastingSession | null> {
  const all = await listFasting();
  return all.find((f) => !f.endedAt) ?? null;
}

export async function startFasting(
  targetHours: number,
  protocol = '16:8',
): Promise<FastingSession> {
  const f: FastingSession = {
    id: uuid(),
    startedAt: Date.now(),
    targetHours,
    protocol,
  };
  return put(STORES.fasting, f);
}

export async function endFasting(id: UUID): Promise<FastingSession | null> {
  const cur = await getOne<FastingSession>(STORES.fasting, id);
  if (!cur) return null;
  const updated: FastingSession = { ...cur, endedAt: Date.now() };
  return put(STORES.fasting, updated);
}

export async function deleteFasting(id: UUID): Promise<void> {
  await del(STORES.fasting, id);
}

/* ─────────────────── Export / Wipe ─────────────────── */

export async function exportAll(): Promise<{
  supplements: Supplement[];
  intakeLogs: IntakeLog[];
  dietLogs: DietLog[];
  skinHairLogs: SkinHairLog[];
  vitalLogs: VitalLog[];
  profile: AthleteProfile | null;
  workouts: WorkoutSession[];
  goals: Goal[];
  hydration: HydrationEvent[];
  fasting: FastingSession[];
  exportedAt: number;
}> {
  const [supplements, intakeLogs, dietLogs, skinHairLogs, vitalLogs, profile, workouts, goals, hydration, fasting] =
    await Promise.all([
      listSupplements(),
      listIntakeLogs(),
      listDietLogs(),
      listSkinHairLogs(),
      listVitals(),
      getProfile(),
      listWorkouts(),
      listGoals(),
      listHydration(),
      listFasting(),
    ]);
  return {
    supplements, intakeLogs, dietLogs, skinHairLogs, vitalLogs,
    profile, workouts, goals, hydration, fasting,
    exportedAt: Date.now(),
  };
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

/** Convert epoch ms to local YYYY-MM-DD. */
export function isoFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
