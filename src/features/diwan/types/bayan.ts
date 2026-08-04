import { z } from "zod";

// ============================================================================
// 1. Core Syntactic Analysis Types & Schemas
// ============================================================================

export type GrammaticalCase = "nominative" | "accusative" | "genitive" | "jussive" | "none";
export type GrammaticalMarkerType = "original" | "subsidiary" | "estimated" | "local";

export interface SyntacticToken {
  id: string;
  word: string;
  cleanWord: string;
  partOfSpeech: "noun" | "verb" | "particle" | "unknown";
  caseState: GrammaticalCase;
  markerType: GrammaticalMarkerType;
  markerDetail: string; // e.g., "الضمة الظاهرة على آخره", "الفتحة المقدرة للتعذر"
  syntacticRole: string; // e.g., "فاعل مرفوع", "مفعول به منصوب", "مبتدأ مؤخر"
  explanation: string;  // Long-form structural description
  positionInSentence: [number, number]; // [startOffset, endOffset]
  isDiacritized: boolean;
}

export const SyntacticTokenSchema = z.object({
  id: z.string(),
  word: z.string(),
  cleanWord: z.string(),
  partOfSpeech: z.enum(["noun", "verb", "particle", "unknown"]),
  caseState: z.enum(["nominative", "accusative", "genitive", "jussive", "none"]),
  markerType: z.enum(["original", "subsidiary", "estimated", "local"]),
  markerDetail: z.string(),
  syntacticRole: z.string(),
  explanation: z.string(),
  positionInSentence: z.tuple([z.number(), z.number()]),
  isDiacritized: z.boolean(),
});

export interface SyntacticBranch {
  id: string;
  label: string; // e.g., "جملة فعلية", "شبه جملة", "صلة الموصول"
  role: string;
  value?: string;
  tokenIds: string[];
  children: SyntacticBranch[];
}

export const SyntacticBranchSchema: z.ZodType<SyntacticBranch> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    role: z.string(),
    value: z.string().optional(),
    tokenIds: z.array(z.string()),
    children: z.array(SyntacticBranchSchema),
  })
);

// ============================================================================
// 2. Poetic Meter (Arood / العروض) Types & Schemas
// ============================================================================

export type MeterId =
  | "taweel" | "badeed" | "baseet" | "wafer" | "kamel" | "hazaj"
  | "rajaz" | "ramal" | "saree" | "munsarih" | "khafeef" | "mudari"
  | "muqtadab" | "mujthath" | "mutaqarib" | "mutadarak" | "unknown";

export interface PoeticSyllable {
  text: string;
  phonetic: string;
  isMoving: boolean; // متحرك (/) or ساكن (o)
  symbol: "/" | "o";
}

export const PoeticSyllableSchema = z.object({
  text: z.string(),
  phonetic: z.string(),
  isMoving: z.boolean(),
  symbol: z.enum(["/", "o"]),
});

export interface TafilaBlock {
  tafilaName: string; // e.g., "فعولن", "مفاعيلن"
  symbolPattern: string; // e.g., "///o/o"
  syllables: PoeticSyllable[];
  deviation?: string; // الزحاف أو العلة إن وجدت (e.g., "القبض", "الخبن")
}

export const TafilaBlockSchema = z.object({
  tafilaName: z.string(),
  symbolPattern: z.string(),
  syllables: z.array(PoeticSyllableSchema),
  deviation: z.string().optional(),
});

export interface HemistichAnalysis {
  text: string;
  scansionText: string; // الكتابة العروضية
  symbols: string; // e.g., "/o//o /o///o"
  tafilas: TafilaBlock[];
}

export const HemistichAnalysisSchema = z.object({
  text: z.string(),
  scansionText: z.string(),
  symbols: z.string(),
  tafilas: z.array(TafilaBlockSchema),
});

export interface PoeticMeterAnalysis {
  meterId: MeterId;
  meterName: string; // e.g., "البحر الطويل"
  keyPoem: string; // مفتاح البحر (e.g., "طويلٌ له دون البحور فضائلُ")
  firstHemistich: HemistichAnalysis;
  secondHemistich: HemistichAnalysis;
  rhymeLetter: string; // حرف الروي
  rhymeType: string; // القافية نوعها (e.g., "مطلقة", "مقيدة")
  isPerfectMatch: boolean;
  score: number; // confidence score 0.0 - 1.0
}

export const PoeticMeterAnalysisSchema = z.object({
  meterId: z.enum([
    "taweel", "badeed", "baseet", "wafer", "kamel", "hazaj",
    "rajaz", "ramal", "saree", "munsarih", "khafeef", "mudari",
    "muqtadab", "mujthath", "mutaqarib", "mutadarak", "unknown"
  ]),
  meterName: z.string(),
  keyPoem: z.string(),
  firstHemistich: HemistichAnalysisSchema,
  secondHemistich: HemistichAnalysisSchema,
  rhymeLetter: z.string(),
  rhymeType: z.string(),
  isPerfectMatch: z.boolean(),
  score: z.number(),
});

// ============================================================================
// 3. Morphological (Sarf / الصرف) Types & Schemas
// ============================================================================

export interface MorphologicalToken {
  id: string;
  word: string;
  root: string; // الجذر الثلاثي أو الرباعي (e.g., "ك ت ب")
  pattern: string; // الوزن الصرفي (e.g., "فَاعِل", "مُسْتَفْعِل")
  wordType: "noun_derived" | "noun_solid" | "verb_triliteral" | "verb_quadriliteral" | "particle";
  derivationType?: string; // اسم فاعل، اسم مفعول، صفة مشبهة، إلخ
  state: {
    isGenderFeminine: boolean;
    number: "singular" | "dual" | "plural";
    isDefinite: boolean;
    transitivity?: "transitive" | "intransitive";
  };
  features: string[]; // الزيادات والعلل الصرفية (الإعلال، الإبدال)
}

export const MorphologicalTokenSchema = z.object({
  id: z.string(),
  word: z.string(),
  root: z.string(),
  pattern: z.string(),
  wordType: z.enum(["noun_derived", "noun_solid", "verb_triliteral", "verb_quadriliteral", "particle"]),
  derivationType: z.string().optional(),
  state: z.object({
    isGenderFeminine: z.boolean(),
    number: z.enum(["singular", "dual", "plural"]),
    isDefinite: z.boolean(),
    transitivity: z.enum(["transitive", "intransitive"]).optional(),
  }),
  features: z.array(z.string()),
});

// ============================================================================
// 4. Rhetorical Stylistics (Balagha / البلاغة) Types & Schemas
// ============================================================================

export interface RhetoricalFigure {
  id: string;
  type: "maani" | "bayan" | "badi";
  category: string; // e.g., "جناس", "استعارة مكنية", "تشبيه بليغ", "طباق إيجاب"
  snippet: string; // The part of the text exhibiting the figure
  description: string;
  eloquenceWeight: number; // Value indicating impact from 0.0 to 10.0
}

export const RhetoricalFigureSchema = z.object({
  id: z.string(),
  type: z.enum(["maani", "bayan", "badi"]),
  category: z.string(),
  snippet: z.string(),
  description: z.string(),
  eloquenceWeight: z.number(),
});

export interface BalaghaAnalysis {
  rhetoricalFigures: RhetoricalFigure[];
  sentenceStyle: "informative" | "expressive" | "mixed"; // خبري، إنشائي، مزيج
  expressiveCategory?: string; // أمر، نهي، استفهام، نداء، تمني
  eloquenceIndex: number; // Comprehensive score out of 100
  styleCohesionSummary: string;
}

export const BalaghaAnalysisSchema = z.object({
  rhetoricalFigures: z.array(RhetoricalFigureSchema),
  sentenceStyle: z.enum(["informative", "expressive", "mixed"]),
  expressiveCategory: z.string().optional(),
  eloquenceIndex: z.number().min(0).max(100),
  styleCohesionSummary: z.string(),
});

// ============================================================================
// 5. Complete Al-Bayan Core Analysis Result Schema
// ============================================================================

export interface AlBayanAnalysisResult {
  id: string;
  inputText: string;
  analyzedAt: string;

  // Syntax (Syntax/Grammar)
  syntax: {
    tokens: SyntacticToken[];
    ast: SyntacticBranch;
    sentenceType: "nominal" | "verbal" | "semi-sentence";
  };

  // Prosody (Arood)
  prosody?: PoeticMeterAnalysis;

  // Morphology (Sarf)
  morphology: {
    tokens: MorphologicalToken[];
  };

  // Rhetoric (Balagha)
  rhetoric: BalaghaAnalysis;
}

export const AlBayanAnalysisResultSchema = z.object({
  id: z.string(),
  inputText: z.string(),
  analyzedAt: z.string(),
  syntax: z.object({
    tokens: z.array(SyntacticTokenSchema),
    ast: SyntacticBranchSchema,
    sentenceType: z.enum(["nominal", "verbal", "semi-sentence"]),
  }),
  prosody: PoeticMeterAnalysisSchema.optional(),
  morphology: z.object({
    tokens: z.array(MorphologicalTokenSchema),
  }),
  rhetoric: BalaghaAnalysisSchema,
});
