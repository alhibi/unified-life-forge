/**
 * React hook centralising the wellness data the surfaced tabs actually
 * read — supplements, intake logs, diet logs, skin/hair, plus the
 * athletic stores still surfaced through the UI: profile and workouts.
 *
 * Single source of truth — every mutation refreshes everything so the
 * consumers stay consistent.
 *
 * Stores that have no UI surface (vitals, goals, hydration events,
 * fasting sessions) remain on disk and are still included in the
 * privacy export, but are not loaded here. If a future tab needs them
 * it should add its own slice.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  type AthleteProfile,
  deleteDietLog,
  deleteWorkout,
  type DietLog,
  getProfile,
  type IntakeLog,
  listDietLogs,
  listIntakeLogs,
  listSkinHairLogs,
  listSupplements,
  listWorkouts,
  logDiet,
  saveWorkout,
  type SkinHairLog,
  type Supplement,
  updateDietLog,
  type UUID,
  wipeAll,
  type WorkoutSession,
} from './wellnessDb';

export function useWellnessData() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [skinHair, setSkinHair] = useState<SkinHairLog[]>([]);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);

  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, i, d, sh, p, w] = await Promise.all([
        listSupplements(),
        listIntakeLogs(),
        listDietLogs(),
        listSkinHairLogs(),
        getProfile(),
        listWorkouts(),
      ]);
      setSupplements(s);
      setIntakeLogs(i);
      setDietLogs(d);
      setSkinHair(sh);
      setProfile(p);
      setWorkouts(w);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const wipe = useCallback(async () => {
    await wipeAll();
    await refresh();
  }, [refresh]);

  return {
    supplements,
    intakeLogs,
    dietLogs,
    skinHair,
    profile,
    workouts,
    loading,
    refresh,
    addDiet,
    removeDiet,
    patchDiet,
    saveWorkoutSession,
    removeWorkoutSession,
    wipe,
  };
}
