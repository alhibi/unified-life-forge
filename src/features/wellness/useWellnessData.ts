/**
 * React hook that centralises loading and mutating wellness data.
 * Keeps all four stores synchronised in a single context-free hook.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  deleteDietLog,
  deleteIntakeLog,
  deleteSkinHair,
  deleteSupplement,
  listDietLogs,
  listIntakeLogs,
  listSkinHairLogs,
  listSupplements,
  logDiet,
  logIntake,
  saveSupplement,
  upsertSkinHair,
  wipeAll,
  type DietLog,
  type IntakeLog,
  type SkinHairLog,
  type Supplement,
  type UUID,
} from './wellnessDb';

export function useWellnessData() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [skinHair, setSkinHair] = useState<SkinHairLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, i, d, sh] = await Promise.all([
        listSupplements(),
        listIntakeLogs(),
        listDietLogs(),
        listSkinHairLogs(),
      ]);
      setSupplements(s);
      setIntakeLogs(i);
      setDietLogs(d);
      setSkinHair(sh);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- Supplements ---
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
    async (id: UUID) => {
      await deleteSupplement(id);
      await refresh();
    },
    [refresh],
  );

  // --- Intake ---
  const addIntake = useCallback(
    async (supplementId: UUID, scheduledTime?: string) => {
      await logIntake(supplementId, scheduledTime);
      await refresh();
    },
    [refresh],
  );
  const removeIntake = useCallback(
    async (id: UUID) => {
      await deleteIntakeLog(id);
      await refresh();
    },
    [refresh],
  );

  // --- Diet ---
  const addDiet = useCallback(
    async (date: string, foodKey: string, portion = 1) => {
      await logDiet(date, foodKey, portion);
      await refresh();
    },
    [refresh],
  );
  const removeDiet = useCallback(
    async (id: UUID) => {
      await deleteDietLog(id);
      await refresh();
    },
    [refresh],
  );

  // --- Skin / Hair ---
  const saveSkinHair = useCallback(
    async (entry: Parameters<typeof upsertSkinHair>[0]) => {
      await upsertSkinHair(entry);
      await refresh();
    },
    [refresh],
  );
  const removeSkinHair = useCallback(
    async (id: UUID) => {
      await deleteSkinHair(id);
      await refresh();
    },
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
    loading,
    refresh,
    addOrUpdateSupplement,
    removeSupplement,
    addIntake,
    removeIntake,
    addDiet,
    removeDiet,
    saveSkinHair,
    removeSkinHair,
    wipe,
  };
}
