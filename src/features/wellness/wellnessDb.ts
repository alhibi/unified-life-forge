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

/* ─────────────────────── Cloud storage layer ─────────────────────── */

const TABLE = 'wellness_records';

type Kind =
  | 'supplement' | 'intake' | 'diet' | 'skin_hair' | 'vital'
  | 'profile' | 'workout' | 'goal' | 'hydration' | 'fasting';

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function requireUserId(): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error('wellness:not_signed_in');
  return uid;
}

async function listByKind<T>(kind: Kind): Promise<T[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', uid)
    .eq('kind', kind);
  if (error) throw error;
  return (data ?? []).map((r: { data: T }) => r.data);
}

async function putRecord<T extends { id?: string }>(
  kind: Kind,
  recordId: string,
  value: T,
): Promise<T> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: uid, kind, record_id: recordId, data: value as unknown as object },
      { onConflict: 'user_id,kind,record_id' },
    );
  if (error) throw error;
  return value;
}

async function delRecord(kind: Kind, recordId: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', uid)
    .eq('kind', kind)
    .eq('record_id', recordId);
  if (error) throw error;
}

async function getRecord<T>(kind: Kind, recordId: string): Promise<T | undefined> {
  const uid = await currentUserId();
  if (!uid) return undefined;
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', uid)
    .eq('kind', kind)
    .eq('record_id', recordId)
    .maybeSingle();
  if (error) throw error;
  return (data?.data as T) ?? undefined;
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

/* ─────────────────── Supplements ─────────────────── */

export async function listSupplements(): Promise<Supplement[]> {
  const all = await listByKind<Supplement>('supplement');
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
  return putRecord('supplement', s.id, s);
}

export async function deleteSupplement(id: UUID): Promise<void> {
  await delRecord('supplement', id);
}

/* ─────────────────── Intake Logs ─────────────────── */

export async function listIntakeLogs(): Promise<IntakeLog[]> {
  const all = await listByKind<IntakeLog>('intake');
  return all.sort((a, b) => b.takenAt - a.takenAt);
}

export async function logIntake(
  supplementId: UUID,
  scheduledTime?: string,
): Promise<IntakeLog> {
  const entry: IntakeLog = { id: uuid(), supplementId, takenAt: Date.now(), scheduledTime };
  return putRecord('intake', entry.id, entry);
}

export async function deleteIntakeLog(id: UUID): Promise<void> {
  await delRecord('intake', id);
}

/* ─────────────────── Diet Logs ─────────────────── */

export async function listDietLogs(): Promise<DietLog[]> {
  const all = await listByKind<DietLog>('diet');
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
  return putRecord('diet', entry.id, entry);
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
  const cur = await getRecord<DietLog>('diet', id);
  if (!cur) return null;
  const updated: DietLog = {
    ...cur,
    ...patch,
    portion: patch.portion != null ? Math.max(0.25, patch.portion) : cur.portion,
  };
  return putRecord('diet', updated.id, updated);
}

export async function deleteDietLog(id: UUID): Promise<void> {
  await delRecord('diet', id);
}

/* ─────────────────── Skin / Hair logs ─────────────────── */

export async function listSkinHairLogs(): Promise<SkinHairLog[]> {
  const all = await listByKind<SkinHairLog>('skin_hair');
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
  return putRecord('skin_hair', out.id, out);
}

export async function deleteSkinHair(id: UUID): Promise<void> {
  await delRecord('skin_hair', id);
}

/* ─────────────────── Vitals ─────────────────── */

export async function listVitals(): Promise<VitalLog[]> {
  const all = await listByKind<VitalLog>('vital');
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
  return putRecord('vital', out.id, out);
}

export async function deleteVital(id: UUID): Promise<void> {
  await delRecord('vital', id);
}

/* ─────────────────── Profile (singleton) ─────────────────── */

export async function getProfile(): Promise<AthleteProfile | null> {
  const p = await getRecord<AthleteProfile>('profile', 'me');
  return p ?? null;
}

export async function saveProfile(
  input: Omit<AthleteProfile, 'id' | 'updatedAt'>,
): Promise<AthleteProfile> {
  const out: AthleteProfile = { id: 'me', ...input, updatedAt: Date.now() };
  return putRecord('profile', 'me', out);
}

/* ─────────────────── Workouts ─────────────────── */

export async function listWorkouts(): Promise<WorkoutSession[]> {
  const all = await listByKind<WorkoutSession>('workout');
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function saveWorkout(
  input: Omit<WorkoutSession, 'id'> & { id?: UUID },
): Promise<WorkoutSession> {
  const out: WorkoutSession = { id: input.id ?? uuid(), ...input };
  return putRecord('workout', out.id, out);
}

export async function deleteWorkout(id: UUID): Promise<void> {
  await delRecord('workout', id);
}

/* ─────────────────── Goals ─────────────────── */

export async function listGoals(): Promise<Goal[]> {
  const all = await listByKind<Goal>('goal');
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
  return putRecord('goal', out.id, out);
}

export async function deleteGoal(id: UUID): Promise<void> {
  await delRecord('goal', id);
}

/* ─────────────────── Hydration events ─────────────────── */

export async function listHydration(): Promise<HydrationEvent[]> {
  const all = await listByKind<HydrationEvent>('hydration');
  return all.sort((a, b) => b.ts - a.ts);
}

export async function logHydration(
  amountMl: number,
  source: HydrationEvent['source'] = 'water',
): Promise<HydrationEvent> {
  const now = Date.now();
  const date = todayIso();
  const e: HydrationEvent = { id: uuid(), date, ts: now, amountMl, source };
  return putRecord('hydration', e.id, e);
}

export async function deleteHydration(id: UUID): Promise<void> {
  await delRecord('hydration', id);
}

/* ─────────────────── Fasting sessions ─────────────────── */

export async function listFasting(): Promise<FastingSession[]> {
  const all = await listByKind<FastingSession>('fasting');
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
  return putRecord('fasting', f.id, f);
}

export async function endFasting(id: UUID): Promise<FastingSession | null> {
  const cur = await getRecord<FastingSession>('fasting', id);
  if (!cur) return null;
  const updated: FastingSession = { ...cur, endedAt: Date.now() };
  return putRecord('fasting', updated.id, updated);
}

export async function deleteFasting(id: UUID): Promise<void> {
  await delRecord('fasting', id);
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
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', uid);
  if (error) throw error;
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
