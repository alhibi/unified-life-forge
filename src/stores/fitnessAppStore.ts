import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================================================
// TypeScript Interface and Domain Schemas
// ============================================================================

export interface WorkoutSet {
  id: string;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutDayExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutDay {
  name: string;
  isRestDay: boolean;
  exercises: WorkoutDayExercise[];
}

export interface WeightLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  bodyFatPct?: number;
}

export interface WaterLog {
  date: string; // YYYY-MM-DD
  amountMl: number;
}

export type DayOfWeekKey = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export interface FitnessAppState {
  // Weekly training table
  timetable: Record<DayOfWeekKey, WorkoutDay>;

  // Daily water logs
  waterLogs: Record<string, number>; // date_string -> ml
  dailyWaterTargetMl: number;

  // Body metrics
  weightLogs: WeightLog[];
  weightTargetKg: number;

  // App settings & states
  lastActiveTab: string;
}

export interface FitnessAppActions {
  // Timetable Actions
  updateWorkoutDayMeta: (day: DayOfWeekKey, name: string, isRestDay: boolean) => void;
  addExerciseToDay: (day: DayOfWeekKey, exerciseName: string) => void;
  removeExerciseFromDay: (day: DayOfWeekKey, exerciseId: string) => void;
  addSetToExercise: (day: DayOfWeekKey, exerciseId: string) => void;
  removeSetFromExercise: (day: DayOfWeekKey, exerciseId: string, setIndex: number) => void;
  toggleSetCompletion: (day: DayOfWeekKey, exerciseId: string, setIndex: number) => void;
  updateSetValues: (day: DayOfWeekKey, exerciseId: string, setIndex: number, weightKg: number, reps: number) => void;
  resetWeeklySchedule: () => void;

  // Water Hydration Actions
  addWater: (dateStr: string, amountMl: number) => void;
  resetWater: (dateStr: string) => void;
  setWaterTarget: (targetMl: number) => void;

  // Body Progress Actions
  logWeight: (dateStr: string, weightKg: number, bodyFatPct?: number) => void;
  deleteWeightLog: (id: string) => void;
  setWeightTarget: (targetKg: number) => void;

  // Navigation state
  setLastActiveTab: (tab: string) => void;

  // Complete Reset
  clearAllFitnessAppData: () => void;
}

// ============================================================================
// Default / Initial State Definitions
// ============================================================================

const initialTimetable: Record<DayOfWeekKey, WorkoutDay> = {
  sat: {
    name: 'تمارين الصدر والذراعين',
    isRestDay: false,
    exercises: [
      {
        id: 'ex-bench',
        name: 'بنش بريس بالبار (Bench Press)',
        sets: [
          { id: 's1', weightKg: 60, reps: 10, completed: false },
          { id: 's2', weightKg: 70, reps: 8, completed: false },
          { id: 's3', weightKg: 80, reps: 6, completed: false },
        ],
      },
      {
        id: 'ex-bicep-curl',
        name: 'تبادل بايسبس بالدمبلز (Dumbbell Bicep Curl)',
        sets: [
          { id: 's4', weightKg: 12.5, reps: 12, completed: false },
          { id: 's5', weightKg: 15, reps: 10, completed: false },
        ],
      },
    ],
  },
  sun: {
    name: 'تمارين الظهر والكتف الخلفي',
    isRestDay: false,
    exercises: [
      {
        id: 'ex-lat-pulldown',
        name: 'سحب ظهر واسع (Lat Pulldown)',
        sets: [
          { id: 's6', weightKg: 45, reps: 12, completed: false },
          { id: 's7', weightKg: 55, reps: 10, completed: false },
          { id: 's8', weightKg: 65, reps: 8, completed: false },
        ],
      },
    ],
  },
  mon: {
    name: 'يوم استراحة واستشفاء فعال',
    isRestDay: true,
    exercises: [],
  },
  tue: {
    name: 'تمارين الأرجل والبطن',
    isRestDay: false,
    exercises: [
      {
        id: 'ex-squat',
        name: 'قرفصاء بالبار (Barbell Squat)',
        sets: [
          { id: 's9', weightKg: 60, reps: 10, completed: false },
          { id: 's10', weightKg: 80, reps: 8, completed: false },
          { id: 's11', weightKg: 100, reps: 6, completed: false },
        ],
      },
    ],
  },
  wed: {
    name: 'تمارين الأكتاف والذراعين',
    isRestDay: false,
    exercises: [
      {
        id: 'ex-ohp',
        name: 'ضغط أكتاف بالبار (Overhead Press)',
        sets: [
          { id: 's12', weightKg: 30, reps: 10, completed: false },
          { id: 's13', weightKg: 40, reps: 8, completed: false },
        ],
      },
    ],
  },
  thu: {
    name: 'تمارين كارديو وحركة حرة',
    isRestDay: false,
    exercises: [],
  },
  fri: {
    name: 'يوم استراحة تامة',
    isRestDay: true,
    exercises: [],
  },
};

const initialAppState: FitnessAppState = {
  timetable: initialTimetable,
  waterLogs: {},
  dailyWaterTargetMl: 3000,
  weightLogs: [
    { id: 'w-init-1', date: '2025-01-15', weightKg: 78.5, bodyFatPct: 18.2 },
    { id: 'w-init-2', date: '2025-01-22', weightKg: 77.9, bodyFatPct: 17.9 },
    { id: 'w-init-3', date: '2025-02-01', weightKg: 77.2, bodyFatPct: 17.5 },
  ],
  weightTargetKg: 72.0,
  lastActiveTab: 'dashboard',
};

// ============================================================================
// Standalone Premium Fitness App Persistent Store
// ============================================================================

export const useFitnessAppStore = create<FitnessAppState & FitnessAppActions>()(
  persist(
    (set, get) => ({
      ...initialAppState,

      // Timetable Actions
      updateWorkoutDayMeta: (day, name, isRestDay) => {
        set((state) => ({
          timetable: {
            ...state.timetable,
            [day]: {
              ...state.timetable[day],
              name,
              isRestDay,
              exercises: isRestDay ? [] : state.timetable[day].exercises,
            },
          },
        }));
      },

      addExerciseToDay: (day, exerciseName) => {
        const newExercise: WorkoutDayExercise = {
          id: `ex-${crypto.randomUUID()}`,
          name: exerciseName,
          sets: [{ id: `s-${crypto.randomUUID()}`, weightKg: 0, reps: 0, completed: false }],
        };
        set((state) => ({
          timetable: {
            ...state.timetable,
            [day]: {
              ...state.timetable[day],
              isRestDay: false,
              exercises: [...state.timetable[day].exercises, newExercise],
            },
          },
        }));
      },

      removeExerciseFromDay: (day, exerciseId) => {
        set((state) => ({
          timetable: {
            ...state.timetable,
            [day]: {
              ...state.timetable[day],
              exercises: state.timetable[day].exercises.filter((ex) => ex.id !== exerciseId),
            },
          },
        }));
      },

      addSetToExercise: (day, exerciseId) => {
        set((state) => {
          const dayData = state.timetable[day];
          const exerciseIndex = dayData.exercises.findIndex((ex) => ex.id === exerciseId);
          if (exerciseIndex === -1) return state;

          const updatedExercises = [...dayData.exercises];
          const exercise = updatedExercises[exerciseIndex];

          // Carry over previous set's parameters for seamless typing experience
          const lastSet = exercise.sets[exercise.sets.length - 1];
          const newSet: WorkoutSet = {
            id: `s-${crypto.randomUUID()}`,
            weightKg: lastSet ? lastSet.weightKg : 0,
            reps: lastSet ? lastSet.reps : 0,
            completed: false,
          };

          updatedExercises[exerciseIndex] = {
            ...exercise,
            sets: [...exercise.sets, newSet],
          };

          return {
            timetable: {
              ...state.timetable,
              [day]: {
                ...dayData,
                exercises: updatedExercises,
              },
            },
          };
        });
      },

      removeSetFromExercise: (day, exerciseId, setIndex) => {
        set((state) => {
          const dayData = state.timetable[day];
          const exerciseIndex = dayData.exercises.findIndex((ex) => ex.id === exerciseId);
          if (exerciseIndex === -1) return state;

          const updatedExercises = [...dayData.exercises];
          const exercise = updatedExercises[exerciseIndex];
          const updatedSets = exercise.sets.filter((_, idx) => idx !== setIndex);

          updatedExercises[exerciseIndex] = {
            ...exercise,
            sets: updatedSets,
          };

          return {
            timetable: {
              ...state.timetable,
              [day]: {
                ...dayData,
                exercises: updatedExercises,
              },
            },
          };
        });
      },

      toggleSetCompletion: (day, exerciseId, setIndex) => {
        set((state) => {
          const dayData = state.timetable[day];
          const exerciseIndex = dayData.exercises.findIndex((ex) => ex.id === exerciseId);
          if (exerciseIndex === -1) return state;

          const updatedExercises = [...dayData.exercises];
          const exercise = updatedExercises[exerciseIndex];
          const updatedSets = [...exercise.sets];
          const targetSet = updatedSets[setIndex];

          updatedSets[setIndex] = {
            ...targetSet,
            completed: !targetSet.completed,
          };

          updatedExercises[exerciseIndex] = {
            ...exercise,
            sets: updatedSets,
          };

          return {
            timetable: {
              ...state.timetable,
              [day]: {
                ...dayData,
                exercises: updatedExercises,
              },
            },
          };
        });
      },

      updateSetValues: (day, exerciseId, setIndex, weightKg, reps) => {
        set((state) => {
          const dayData = state.timetable[day];
          const exerciseIndex = dayData.exercises.findIndex((ex) => ex.id === exerciseId);
          if (exerciseIndex === -1) return state;

          const updatedExercises = [...dayData.exercises];
          const exercise = updatedExercises[exerciseIndex];
          const updatedSets = [...exercise.sets];
          const targetSet = updatedSets[setIndex];

          updatedSets[setIndex] = {
            ...targetSet,
            weightKg: Number(weightKg) || 0,
            reps: Number(reps) || 0,
          };

          updatedExercises[exerciseIndex] = {
            ...exercise,
            sets: updatedSets,
          };

          return {
            timetable: {
              ...state.timetable,
              [day]: {
                ...dayData,
                exercises: updatedExercises,
              },
            },
          };
        });
      },

      resetWeeklySchedule: () => {
        set({ timetable: initialTimetable });
      },

      // Water Hydration Actions
      addWater: (dateStr, amountMl) => {
        set((state) => {
          const currentAmount = state.waterLogs[dateStr] || 0;
          return {
            waterLogs: {
              ...state.waterLogs,
              [dateStr]: Math.max(0, currentAmount + amountMl),
            },
          };
        });
      },

      resetWater: (dateStr) => {
        set((state) => ({
          waterLogs: {
            ...state.waterLogs,
            [dateStr]: 0,
          },
        }));
      },

      setWaterTarget: (targetMl) => {
        set({ dailyWaterTargetMl: Math.max(100, targetMl) });
      },

      // Body Progress Actions
      logWeight: (dateStr, weightKg, bodyFatPct) => {
        set((state) => {
          // Remove existing log for same date if any, to prevent duplications
          const filtered = state.weightLogs.filter((log) => log.date !== dateStr);
          const newLog: WeightLog = {
            id: `w-${crypto.randomUUID()}`,
            date: dateStr,
            weightKg: Number(weightKg),
            bodyFatPct: bodyFatPct ? Number(bodyFatPct) : undefined,
          };

          // Keep logs sorted chronologically
          const sorted = [...filtered, newLog].sort((a, b) => a.date.localeCompare(b.date));

          return {
            weightLogs: sorted,
          };
        });
      },

      deleteWeightLog: (id) => {
        set((state) => ({
          weightLogs: state.weightLogs.filter((log) => log.id !== id),
        }));
      },

      setWeightTarget: (targetKg) => {
        set({ weightTargetKg: Math.max(10, targetKg) });
      },

      // Navigation & Last Active Tab
      setLastActiveTab: (tab) => {
        set({ lastActiveTab: tab });
      },

      // Comprehensive Master Reset
      clearAllFitnessAppData: () => {
        set(initialAppState);
      },
    }),
    {
      name: 'zen-elite-fitness-app-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
