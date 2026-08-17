import { z } from "zod";

export type GermanEntryType = "word" | "phrase" | "sentence" | "idiom";
export type GermanGender = "der" | "die" | "das" | "plural" | "n_a";
export type GermanRegister = "formal" | "neutral" | "informal" | "slang";
export type ContentReviewStatus = "ai_generated" | "reviewed" | "verified";

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

export interface GermanProgress {
  user_id: string;
  entry_id: string;
  is_mastered: boolean;
  last_seen_at: string;
}

export interface PremiumEntitlement {
  id: string;
  user_id: string;
  product_slug: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

// Color tokens for German Club
export const GERMAN_CLUB_TOKENS = {
  paper: "#EFEEE7",
  ink: "#17181C",
  prussian: "#17324D",
  oak: "#8B7E68",
  derBlue: "#3E6E9E",
  dieRose: "#A15A6B",
  dasStone: "#6B6558",
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
});
