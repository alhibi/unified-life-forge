/**
 * Training infrastructure — shared types.
 *
 * The training subsystem is split into pure data/engine modules (this folder)
 * and UI components (./components). Nothing here imports React. Everything is
 * deterministic, side-effect free, fully tree-shakeable.
 *
 * The athletic store schemas live in `wellnessDb.ts` (single source of truth
 * for IndexedDB). The types here describe the *behavioural* contracts that
 * sit on top of those records: programs, prescriptions, derived metrics,
 * progression rules.
 */

import type { MuscleGroup } from '../exerciseCatalog';
import type { AthleteProfile, SetEntry, Sex,WorkoutSession } from '../wellnessDb';

/* ────────────────── Bilingual labels ────────────────── */

export type Lang = 'ar';
export type LocalizedString = Record<Lang, string>;

/* ────────────────── Set prescription ────────────────── */

/**
 * A *prescribed* set — what a program tells the user to do, before they
 * actually do it. Distinct from `SetEntry` which records what was performed.
 *
 *   reps      — number of repetitions (omit for time-based sets)
 *   weightKg  — explicit kg, OR undefined when relative
 *   pct1RM    — percentage of 1RM (overrides weightKg if both present)
 *   rpe / rir — autoregulated targets
 *   amrap     — last set is "as many reps as possible" (Greyskull / 531 style)
 *   tempo     — eccentric/pause/concentric/lockout in seconds, e.g. "3-1-2-0"
 *   restSec   — prescribed rest before the next set
 *   note      — coaching cue specific to this set
 */
export interface PrescribedSet {
  reps?: number;
  weightKg?: number;
  pct1RM?: number;
  rpe?: number;
  rir?: number;
  amrap?: boolean;
  tempo?: string;
  restSec?: number;
  durationSec?: number;
  distanceKm?: number;
  note?: LocalizedString;
}

/** Canonical prescription unit — one exercise inside a session. */
export interface PrescribedExercise {
  exerciseKey: string;
  /** Deterministic order of sets. */
  sets: PrescribedSet[];
  /** Optional super-set / circuit grouping — same letter = grouped. */
  group?: string;
  notes?: LocalizedString;
  /** Default rest applied if a set has no explicit `restSec`. */
  defaultRestSec?: number;
}

/* ────────────────── Program model ────────────────── */

export type ProgramExperience = 'beginner' | 'intermediate' | 'advanced';
export type ProgramGoal =
  | 'strength'
  | 'hypertrophy'
  | 'powerbuilding'
  | 'fat_loss'
  | 'general'
  | 'skill';

export interface ProgramSession {
  /** Stable key inside the program — used for "did the user complete this?" */
  key: string;
  name: LocalizedString;
  /** Optional "Day A / Push / Heavy" label shown above the title. */
  banner?: LocalizedString;
  notes?: LocalizedString;
  /** Suggested duration for the planner. */
  estMinutes: number;
  exercises: PrescribedExercise[];
}

export interface ProgramWeek {
  index: number; // 1-based
  /** Optional human-readable banner — e.g. "Deload" / "Test week". */
  label?: LocalizedString;
  isDeload?: boolean;
  isTest?: boolean;
  sessions: ProgramSession[];
}

export interface ProgramDef {
  key: string;
  name: LocalizedString;
  shortName: LocalizedString;
  author: string;
  origin?: string;
  experience: ProgramExperience;
  goal: ProgramGoal;
  /** Sessions per week (used for scheduling / display). */
  daysPerWeek: number;
  /** Total weeks. Some programs are open-ended; use 0 or 99. */
  weeks: number;
  description: LocalizedString;
  /** A 4-6 bullet list of what the user gets out of this program. */
  highlights: LocalizedString[];
  /** Equipment requirements as keys: e.g. ['barbell', 'rack', 'bench']. */
  equipment: string[];
  /** Pre-conditions (e.g. squat 60 kg, can do 5 strict pull-ups). */
  prerequisites?: LocalizedString[];
  /** Hard estimate of session duration. */
  sessionMinutes: number;
  /** Linear/Double/Wave/Block — a free-form tag. */
  scheme: LocalizedString;
  weekTemplate: ProgramWeek[];
  /** Optional progression rule applied between weeks. */
  progression?: ProgressionRule;
}

/* ────────────────── Progression rules ────────────────── */

export type ProgressionRule =
  | { kind: 'linear'; addKgUpper: number; addKgLower: number; addKgPress: number }
  | { kind: 'double'; topRepRange: [number, number]; addKg: number }
  | { kind: 'amrap'; minReps: number; addKgWhenAbove: number }
  | { kind: '531'; trainingMaxPct: number }
  | { kind: 'percent'; pct1RM: number[] }
  | { kind: 'autoreg'; targetRpe: number; rpeWindow: number }
  | { kind: 'none' };

/* ────────────────── Active program state ────────────────── */

/**
 * Persistent per-program tracker. Stored in localStorage under the key
 * `training:activeProgram` keyed by program key.
 */
export interface ActiveProgramState {
  programKey: string;
  startedIso: string;
  /** 1-based week index — wraps to 1 once weeks.length is reached. */
  week: number;
  /** 0-based session index inside the week. */
  sessionIdx: number;
  /** Per-lift training-max snapshot (used by 531/Madcow/GZCLP). */
  trainingMax: Record<string, number>;
  /** Completed session keys per ISO date — drives the streak/heatmap. */
  completedByDate: Record<string, string[]>;
  notes?: string;
}

/* ────────────────── Coaching cue cards ────────────────── */

export type CueSeverity = 'tip' | 'warning' | 'critical';

export interface CueCard {
  exerciseKey: string;
  setupCues: LocalizedString[];
  executionCues: LocalizedString[];
  commonMistakes: { text: LocalizedString; severity: CueSeverity }[];
  breathingCue: LocalizedString;
  injuryWatch?: LocalizedString[];
  /** Mobility prerequisites that should be cleared before loading heavy. */
  prerequisites?: LocalizedString[];
  /** Cool, encouraging one-liner shown on completion. */
  finisherQuote?: LocalizedString;
}

/* ────────────────── Volume landmarks (RP-style) ────────────────── */

export interface VolumeLandmarks {
  mv: number; // Maintenance Volume — keeps current size
  mev: number; // Minimum Effective Volume — minimum stimulus
  mav: number; // Maximum Adaptive Volume — sweet spot upper bound
  mrv: number; // Maximum Recoverable Volume — cap before regression
}

/* ────────────────── Strength standards table ────────────────── */

export type StrengthLevel =
  | 'untrained'
  | 'novice'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'elite';

/** Body-weight ratio thresholds for one lift. */
export interface BodyweightRatioRow {
  exerciseKey: string;
  /** keys ordered untrained → elite. */
  male: Record<StrengthLevel, number>;
  female: Record<StrengthLevel, number>;
}

/* ────────────────── Plate calculator types ────────────────── */

export interface PlateInventory {
  /** Available plate sizes per side, sorted desc — kg. */
  kg: number[];
  lb: number[];
  /** Bar weight in kg (the spec uses metric internally; lb is a UI choice). */
  barKg: number;
  collarKg: number;
}

export interface PlateBreakdown {
  /** Plates per side, descending. */
  plates: number[];
  /** Sum of bar + plates × 2 + collars. */
  totalKg: number;
  /** Difference between requested and achievable in kg. */
  errorKg: number;
}

/* ────────────────── Warm-up generator ────────────────── */

export interface WarmupSet {
  pct: number; // of working weight
  reps: number;
  weightKg: number;
  restSec: number;
  /** Optional cue label e.g. "tempo" / "feel weight". */
  cue?: LocalizedString;
}

/* ────────────────── PR / record types ────────────────── */

export type PrKind =
  | 'max_weight' // most weight × N reps
  | 'max_reps' // most reps × W weight (or BW)
  | 'max_e1rm' // best estimated 1RM
  | 'max_volume' // single-session tonnage on the lift
  | 'max_hold'; // longest static hold (seconds)

export interface PersonalRecord {
  exerciseKey: string;
  kind: PrKind;
  value: number;
  unit: 'kg' | 'reps' | 'sec' | 'kg_x_reps';
  date: string;
  /** Optional context — e.g. RPE 9, tempo 3-1-2 */
  context?: string;
  /** Source workout ID. */
  sourceId: string;
}

/* ────────────────── Calisthenics skill tree ────────────────── */

export type SkillCategory = 'push' | 'pull' | 'legs' | 'core' | 'static' | 'dynamic';

export interface SkillProgressionStep {
  /** Stable key inside the skill — used for completion tracking. */
  key: string;
  name: LocalizedString;
  /** Reps × Sets target, or hold time in seconds. */
  target: { reps?: number; sets?: number; holdSec?: number };
  /** Coaching cues for this specific step. */
  cues: LocalizedString[];
  /** Common mistakes to watch for. */
  mistakes?: LocalizedString[];
  /** What you must achieve before unlocking the next step. */
  unlockCriterion: LocalizedString;
  /** Optional regressions for users struggling here. */
  regressions?: LocalizedString[];
  /** Difficulty 1..10. */
  difficulty: number;
  /** Whether this step is a *static* hold. */
  isHold?: boolean;
  /** Estimated weeks of training to clear at average pace. */
  weeksAverage: number;
}

export interface SkillDef {
  key: string;
  name: LocalizedString;
  category: SkillCategory;
  /** Top difficulty 1..10 based on the FINAL step. */
  difficulty: number;
  /** Hex accent for the UI. */
  color: string;
  /** Single-character emoji used as a thumbnail. */
  emoji: string;
  /** Body parts highlighted in the silhouette. */
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  /** Optional gating skills: must be at level X of skill Y first. */
  prerequisites?: { skillKey: string; minStep: number }[];
  /** Tagline shown on the card. */
  tagline: LocalizedString;
  /** Detailed prose: what the skill is and why train it. */
  about: LocalizedString;
  /** Ordered ladder of progression steps, beginner → final. */
  steps: SkillProgressionStep[];
}

/* ────────────────── Skill knowledge cards ────────────────── */

export interface SkillKnowledgeCard {
  skillKey: string;
  /** "Why train this" — motivation + benefits. */
  whyTrainIt: LocalizedString;
  /** Mobility / prerequisite checklist. */
  mobilityPrereqs: LocalizedString[];
  /** Specific warm-up sequence before working on this skill. */
  warmupSequence: LocalizedString[];
  /** Top mistakes that ruin progress. */
  topMistakes: { mistake: LocalizedString; fix: LocalizedString }[];
  /** Recovery considerations (joints, tendons, frequency). */
  recoveryNotes: LocalizedString;
  /** Recommended training frequency per week. */
  frequencyPerWeek: { min: number; ideal: number; max: number };
  /** Programming style: "high frequency low volume" or similar. */
  programmingStyle: LocalizedString;
  /** Skill-specific tools/equipment that help (e.g. parallettes). */
  helpfulEquipment: LocalizedString[];
  /** External milestones to celebrate. */
  milestones: LocalizedString[];
}

/* ────────────────── Calisthenics programs ────────────────── */

export interface CaliExerciseStep {
  /** Skill the step belongs to — used for highlight in skill tree. */
  skillKey: string;
  /** The progression step name to perform — must match SkillProgressionStep.key. */
  stepKey: string;
  sets: number;
  /** Either reps OR holdSec. */
  reps?: number;
  holdSec?: number;
  restSec?: number;
  notes?: LocalizedString;
}

export interface CaliSession {
  key: string;
  name: LocalizedString;
  banner?: LocalizedString;
  estMinutes: number;
  notes?: LocalizedString;
  exercises: CaliExerciseStep[];
}

export interface CaliProgramDef {
  key: string;
  name: LocalizedString;
  shortName: LocalizedString;
  author: string;
  description: LocalizedString;
  experience: ProgramExperience;
  daysPerWeek: number;
  weeks: number;
  highlights: LocalizedString[];
  prerequisites?: LocalizedString[];
  /** Equipment: 'pull_bar' | 'rings' | 'parallettes' | 'dipbars' | 'none'. */
  equipment: string[];
  sessionMinutes: number;
  weekTemplate: { index: number; label?: LocalizedString; sessions: CaliSession[] }[];
}

/* ────────────────── Calisthenics assessment ────────────────── */

export interface AssessmentQuestion {
  key: string;
  question: LocalizedString;
  /** Skill this question gates. */
  skillKey: string;
  /** Answer options — the chosen index becomes the assigned step in the skill ladder. */
  options: { label: LocalizedString; stepIdx: number }[];
}

export interface AssessmentResult {
  bySkill: Record<string, number>;
  /** Overall recommended experience tier. */
  tier: ProgramExperience;
  /** Suggested program keys, ordered by best fit. */
  suggestedPrograms: string[];
}

/* ────────────────── Analytics output ────────────────── */

export interface VolumePoint {
  weekIso: string; // YYYY-Www
  byMuscle: Record<MuscleGroup, number>;
}

export interface OneRmPoint {
  date: string;
  exerciseKey: string;
  e1rm: number;
}

export interface FrequencyCell {
  date: string;
  count: number;
  totalVolumeKg: number;
}

/* ────────────────── Re-export helpers ────────────────── */

export type { AthleteProfile, MuscleGroup,SetEntry, Sex, WorkoutSession };
