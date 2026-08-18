import { z } from "zod";

export type GermanEntryType = "word" | "phrase" | "sentence" | "idiom";
export type GermanGender = "der" | "die" | "das" | "plural" | "n_a";
export type GermanRegister = "formal" | "neutral" | "informal" | "slang";
export type ContentReviewStatus = "ai_generated" | "reviewed" | "verified";
export type StrictnessLevel = "balanced" | "strict" | "very_strict";
export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";

export interface GermanShelf {
  id: string;
  slug: string;
  title_ar: string;
  title_de: string | null;
  description_ar: string | null;
  situation_tags: string[];
  icon: string | null;
  sort_order: number;
  is_premium: boolean;
  created_at: string;
  target_entry_count?: number; // Target capacity (e.g., 25 or 35-40 for flagship)
}

export interface GermanEntry {
  id: string;
  shelf_id: string;
  entry_type: GermanEntryType;
  german_text: string;
  gender: GermanGender;
  ipa: string | null;
  arabic_translation: string;
  register: GermanRegister;
  is_separable_verb: boolean;
  separable_prefix: string | null;
  example_sentence_de: string | null;
  example_sentence_ar: string | null;
  audio_url: string | null;
  difficulty_level: string;
  review_status: ContentReviewStatus;
  sort_order: number;
  created_at: string;
  locked?: boolean;
  generation_job_id?: string | null;
}

export interface GermanGrammarNote {
  id: string;
  title_ar: string;
  title_de: string | null;
  body_md: string;
  related_shelf_ids: string[];
  difficulty_level: string;
  review_status: ContentReviewStatus;
  sort_order: number;
  created_at: string;
}

export interface ModelPerformanceInfo {
  shelf_acceptance_rate?: number;
  shelf_total_generated?: number;
  overall_acceptance_rate?: number;
  overall_total_generated?: number;
  badge_text?: string;
}

export interface OpenRouterModelItem {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: number; // USD per 1M tokens
    completion: number; // USD per 1M tokens
  };
  performance?: ModelPerformanceInfo | null;
}

export interface GenerationJob {
  id: string;
  shelf_id: string;
  model_id: string;
  mode: "model_capacity" | "fixed_count";
  target_count: number | null;
  strictness: StrictnessLevel;
  register_targets: GermanRegister[];
  status: GenerationJobStatus;
  entries_generated: number;
  entries_skipped_duplicate: number;
  entries_discarded_low_quality: number;
  estimated_cost_usd: number;
  error_message: string | null;
  started_at?: string;
  completed_at?: string | null;
}

export interface GenerationJobRejection {
  id: string;
  job_id: string;
  candidate_text: string;
  reason: "duplicate" | "gender_uncertain" | "register_mismatch" | "shelf_mismatch" | "low_confidence";
  created_at: string;
}

export const REJECTION_REASON_LABELS_AR: Record<GenerationJobRejection["reason"], string> = {
  duplicate: "مكرر في الرف",
  gender_uncertain: "جنس غير دقيق (Gender)",
  register_mismatch: "خارج السجل المحدد",
  shelf_mismatch: "غير متوافق مع الموقف",
  low_confidence: "ثقة/جودة منخفضة",
};

// Color tokens for German Club & Furnace Console v2
export const GERMAN_CLUB_TOKENS = {
  paper: "#EFEEE7",
  ink: "#17181C",
  prussian: "#17324D",
  oak: "#8B7E68",
  ember: "#C9703B",
  derBlue: "#3E6E9E",
  dieRose: "#A15A6B",
  dasStone: "#6B6558",
} as const;

export const SURGE_TOKENS = {
  surgeCobalt: "#2D6FF2",
  surgeEmberHot: "#FF7A29",
} as const;

export const GENDER_COLORS: Record<GermanGender, string | null> = {
  der: GERMAN_CLUB_TOKENS.derBlue,
  die: GERMAN_CLUB_TOKENS.dieRose,
  das: GERMAN_CLUB_TOKENS.dasStone,
  plural: "#7E7259",
  n_a: null,
};

export const GENDER_LABELS_AR: Record<GermanGender, string> = {
  der: "مذكر",
  die: "مؤنث",
  das: "محايد",
  plural: "جمع",
  n_a: "",
};

export const REGISTER_LABELS_AR: Record<GermanRegister, string> = {
  formal: "رسمي",
  neutral: "محايد",
  informal: "غير رسمي",
  slang: "عامي / سلاج",
};

// Zod Schemas
export const GermanEntrySchema = z.object({
  id: z.string().uuid(),
  shelf_id: z.string().uuid(),
  entry_type: z.enum(["word", "phrase", "sentence", "idiom"]),
  german_text: z.string().min(1),
  gender: z.enum(["der", "die", "das", "plural", "n_a"]),
  ipa: z.string().nullable().optional(),
  arabic_translation: z.string().min(1),
  register: z.enum(["formal", "neutral", "informal", "slang"]),
  is_separable_verb: z.boolean(),
  separable_prefix: z.string().nullable().optional(),
  example_sentence_de: z.string().nullable().optional(),
  example_sentence_ar: z.string().nullable().optional(),
  audio_url: z.string().nullable().optional(),
  difficulty_level: z.string().default("A1"),
  review_status: z.enum(["ai_generated", "reviewed", "verified"]),
  sort_order: z.number().default(0),
  created_at: z.string(),
  locked: z.boolean().optional(),
  generation_job_id: z.string().uuid().nullable().optional(),
});

// Dictionary Domain Types
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type DictionaryWordType =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "preposition"
  | "conjunction"
  | "pronoun"
  | "expression"
  | "idiom";

export type GrammaticalCase = "nominative" | "accusative" | "dative" | "genitive" | "two_way";

export interface DictionaryVerbForms {
  present_3sg?: string; // e.g. "sieht"
  past_simple?: string; // Präteritum e.g. "sah"
  perfect?: string;     // Partizip II e.g. "gesehen" (ist/hat gesehen)
  auxiliary?: "haben" | "sein" | "both";
  is_reflexive?: boolean;
}

export interface DictionaryNounForms {
  plural_form?: string;  // e.g. "die Häuser"
  genitive_singular?: string; // e.g. "des Hauses"
}

export interface DictionaryExample {
  de: string;
  ar: string;
  context?: string;
}

export interface DictionaryEntry {
  id: string;
  german: string;
  arabic: string;
  word_type: DictionaryWordType;
  cefr: CEFRLevel;
  gender?: GermanGender;
  ipa?: string;
  category: string;
  noun_forms?: DictionaryNounForms;
  verb_forms?: DictionaryVerbForms;
  is_separable?: boolean;
  separable_prefix?: string;
  preposition_case?: GrammaticalCase;
  preposition_governed?: string; // e.g. "warten auf (+ Akk)"
  antonyms?: string[];
  synonyms?: string[];
  examples: DictionaryExample[];
  cultural_note_ar?: string;
  grammatical_note_ar?: string;
  plural_de?: string;
  tags?: string[];
}

export const DictionaryWordTypeLabels: Record<DictionaryWordType, string> = {
  noun: "اسم (Nomen)",
  verb: "فعل (Verb)",
  adjective: "صفة (Adjektiv)",
  adverb: "ظرف (Adverb)",
  preposition: "حرف جر (Präposition)",
  conjunction: "حرف عطف (Konjunktion)",
  pronoun: "ضمير (Pronomen)",
  expression: "تعبير (Ausdruck)",
  idiom: "مصطلح (Redewendung)",
};

export const CEFRLevelLabels: Record<CEFRLevel, { label_ar: string; badge_color: string }> = {
  A1: { label_ar: "A1 — مبتدئ", badge_color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  A2: { label_ar: "A2 — أساسي", badge_color: "bg-teal-100 text-teal-800 border-teal-300" },
  B1: { label_ar: "B1 — متوسط", badge_color: "bg-sky-100 text-sky-800 border-sky-300" },
  B2: { label_ar: "B2 — فوق المتوسط", badge_color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  C1: { label_ar: "C1 — متقدم", badge_color: "bg-amber-100 text-amber-800 border-amber-300" },
  C2: { label_ar: "C2 — طليق/متقن", badge_color: "bg-rose-100 text-rose-800 border-rose-300" },
};

export const DictionaryEntrySchema = z.object({
  id: z.string(),
  german: z.string().min(1),
  arabic: z.string().min(1),
  word_type: z.enum(["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "expression", "idiom"]),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  gender: z.enum(["der", "die", "das", "plural", "n_a"]).optional(),
  ipa: z.string().optional(),
  category: z.string(),
  noun_forms: z.object({
    plural_form: z.string().optional(),
    genitive_singular: z.string().optional(),
  }).optional(),
  verb_forms: z.object({
    present_3sg: z.string().optional(),
    past_simple: z.string().optional(),
    perfect: z.string().optional(),
    auxiliary: z.enum(["haben", "sein", "both"]).optional(),
    is_reflexive: z.boolean().optional(),
  }).optional(),
  is_separable: z.boolean().optional(),
  separable_prefix: z.string().optional(),
  preposition_case: z.enum(["nominative", "accusative", "dative", "genitive", "two_way"]).optional(),
  preposition_governed: z.string().optional(),
  antonyms: z.array(z.string()).optional(),
  synonyms: z.array(z.string()).optional(),
  examples: z.array(z.object({
    de: z.string(),
    ar: z.string(),
    context: z.string().optional(),
  })),
  cultural_note_ar: z.string().optional(),
  grammatical_note_ar: z.string().optional(),
  plural_de: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
