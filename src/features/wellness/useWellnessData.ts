/**
 * React hook centralising all wellness data — supplements, intake logs,
 * diet logs, skin/hair, vitals, plus the v3 athletic stores: profile,
 * workouts, goals, hydration events and fasting sessions.
 *
 * Single source of truth — every mutation refreshes everything so the
 * derived dashboards (Today, Hub, Goals) stay consistent.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  // existing
  deleteDietLog,
  deleteIntakeLog,
  deleteSkinHair,
  deleteSupplement,
  deleteVital,
  listDietLogs,
  listIntakeLogs,
  listSkinHairLogs,
  listSupplements,
  listVitals,
  logDiet,
  logIntake,
  saveSupplement,
  upsertSkinHair,
  upsertVital,
  wipeAll,
  updateDietLog,
  // premium
  getActiveFasting,
  getProfile,
  saveProfile,
  startFasting,
  endFasting,
  deleteFasting,
  listFasting,
  listGoals,
  saveGoal,
  deleteGoal,
  listHydration,
  logHydration,
  deleteHydration,
  listWorkouts,
  saveWorkout,
  deleteWorkout,
  // types
  type DietLog,
  type IntakeLog,
  type SkinHairLog,
  type Supplement,
  type VitalLog,
  type AthleteProfile,
  type WorkoutSession,
  type Goal,
  type HydrationEvent,
  type FastingSession,
  type UUID,
} from './wellnessDb';

export function useWellnessData() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [skinHair, setSkinHair] = useState<SkinHairLog[]>([]);
  const [vitals, setVitals] = useState<VitalLog[]>([]);

  // Premium stores
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydration, setHydration] = useState<HydrationEvent[]>([]);
  const [fasting, setFasting] = useState<FastingSession[]>([]);
  const [activeFasting, setActiveFasting] = useState<FastingSession | null>(null);

  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, i, d, sh, v, p, w, g, h, f, af] = await Promise.all([
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
        getActiveFasting(),
      ]);
      setSupplements(s);
      setIntakeLogs(i);
      setDietLogs(d);
      setSkinHair(sh);
      setVitals(v);
      setProfile(p);
      setWorkouts(w);
      setGoals(g);
      setHydration(h);
      setFasting(f);
      setActiveFasting(af);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Supplements ──
  const addOrUpdateSupplement = useCallback(
    async (
      input: Omit<Supplement, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number },
    ) => {
      await saveSupplement(input);
      await refresh();
    },
    [refresh],
  );
  const removeSupplement = useCallback(
    async (id: UUID) => { await deleteSupplement(id); await refresh(); },
    [refresh],
  );

  // ── Intake ──
  const addIntake = useCallback(
    async (supplementId: UUID, scheduledTime?: string) => {
      await logIntake(supplementId, scheduledTime);
      await refresh();
    },
    [refresh],
  );
  const removeIntake = useCallback(
    async (id: UUID) => { await deleteIntakeLog(id); await refresh(); },
    [refresh],
  );

  // ── Diet ──
  const addDiet = useCallback(
    async (date: string, foodKey: string, portion = 1) => {
      await logDiet(date, foodKey, portion);
      await refresh();
    },
    [refresh],
  );
  const removeDiet = useCallback(
    async (id: UUID) => { await deleteDietLog(id); await refresh(); },
    [refresh],
  );
  const patchDiet = useCallback(
    async (id: UUID, patch: { portion?: number; foodKey?: string; date?: string }) => {
      await updateDietLog(id, patch);
      await refresh();
    },
    [refresh],
  );

  // ── Skin / Hair ──
  const saveSkinHair = useCallback(
    async (entry: Parameters<typeof upsertSkinHair>[0]) => {
      await upsertSkinHair(entry);
      await refresh();
    },
    [refresh],
  );
  const removeSkinHair = useCallback(
    async (id: UUID) => { await deleteSkinHair(id); await refresh(); },
    [refresh],
  );

  // ── Vitals ──
  const saveVital = useCallback(
    async (entry: Parameters<typeof upsertVital>[0]) => {
      await upsertVital(entry);
      await refresh();
    },
    [refresh],
  );
  const removeVital = useCallback(
    async (id: UUID) => { await deleteVital(id); await refresh(); },
    [refresh],
  );

  // ── Profile ──
  const saveAthleteProfile = useCallback(
    async (input: Omit<AthleteProfile, 'id' | 'updatedAt'>) => {
      await saveProfile(input);
      await refresh();
    },
    [refresh],
  );

  // ── Workouts ──
  const saveWorkoutSession = useCallback(
    async (input: Omit<WorkoutSession, 'id'> & { id?: UUID }) => {
      await saveWorkout(input);
      await refresh();
    },
    [refresh],
  );
  const removeWorkoutSession = useCallback(
    async (id: UUID) => { await deleteWorkout(id); await refresh(); },
    [refresh],
  );

  // ── Goals ──
  const saveUserGoal = useCallback(
    async (input: Omit<Goal, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number }) => {
      await saveGoal(input);
      await refresh();
    },
    [refresh],
  );
  const removeUserGoal = useCallback(
    async (id: UUID) => { await deleteGoal(id); await refresh(); },
    [refresh],
  );

  // ── Hydration ──
  const addHydration = useCallback(
    async (amountMl: number, source: HydrationEvent['source'] = 'water') => {
      await logHydration(amountMl, source);
      await refresh();
    },
    [refresh],
  );
  const removeHydration = useCallback(
    async (id: UUID) => { await deleteHydration(id); await refresh(); },
    [refresh],
  );

  // ── Fasting ──
  const beginFasting = useCallback(
    async (targetHours: number, protocol = '16:8') => {
      await startFasting(targetHours, protocol);
      await refresh();
    },
    [refresh],
  );
  const stopFasting = useCallback(
    async (id?: UUID) => {
      const target = id ?? activeFasting?.id;
      if (!target) return;
      await endFasting(target);
      await refresh();
    },
    [refresh, activeFasting],
  );
  const removeFasting = useCallback(
    async (id: UUID) => { await deleteFasting(id); await refresh(); },
    [refresh],
  );

  const wipe = useCallback(async () => {
    await wipeAll();
    await refresh();
  }, [refresh]);

  return {
    // existing data
    supplements,
    intakeLogs,
    dietLogs,
    skinHair,
    vitals,
    // premium data
    profile,
    workouts,
    goals,
    hydration,
    fasting,
    activeFasting,
    // status
    loading,
    refresh,
    // existing mutations
    addOrUpdateSupplement,
    removeSupplement,
    addIntake,
    removeIntake,
    addDiet,
    removeDiet,
    patchDiet,
    saveSkinHair,
    removeSkinHair,
    saveVital,
    removeVital,
    // premium mutations
    saveAthleteProfile,
    saveWorkoutSession,
    removeWorkoutSession,
    saveUserGoal,
    removeUserGoal,
    addHydration,
    removeHydration,
    beginFasting,
    stopFasting,
    removeFasting,
    wipe,
  };
}
