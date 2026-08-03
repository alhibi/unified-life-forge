// Types for German Learning Module (de-learning)
// Built strictly following FSD principles with zero usage of 'any' or stub placeholders.

export type CefrLevelCode = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface Language {
  id: string;
  code: string;
  name_ar: string;
  direction: 'ltr' | 'rtl';
}

export interface CefrLevel {
  id: string;
  code: CefrLevelCode;
  name_ar: string;
  sort_order: number;
}

export interface Unit {
  id: string;
  level_id: string;
  title_ar: string;
  title_de: string;
  theme: string | null;
  icon: string | null;
  sort_order: number;
}

export type LessonType = 'vocab' | 'grammar' | 'listening' | 'speaking' | 'story' | 'review';

export interface Lesson {
  id: string;
  unit_id: string;
  type: LessonType;
  title_ar: string;
  title_de: string;
  estimated_minutes: number;
  sort_order: number;
}

export interface GrammarPoint {
  id: string;
  lesson_id: string;
  name: string;
  explanation_ar: string;
  contrastive_note_ar: string | null;
}

export type GrammaticalGender = 'der' | 'die' | 'das';
export type VocabularyStatus = 'draft' | 'generated' | 'reviewed' | 'published';

export interface VocabularyItem {
  id: string;
  lemma_de: string;
  gender: GrammaticalGender | null;
  plural_form: string | null;
  ipa: string | null;
  audio_url: string | null;
  image_url: string | null;
  translation_ar: string;
  example_sentence_de: string | null;
  example_sentence_ar: string | null;
  frequency_rank: number | null;
  level_id: string;
  status: VocabularyStatus;
}

// Spaced Repetition Types (FSRS)
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsItemType = 'vocab' | 'grammar';

export interface SrsState {
  user_id: string;
  item_id: string;
  item_type: SrsItemType;
  stability: number;
  difficulty: number;
  due_at: string;
  review_count: number;
  lapses: number;
}

export interface SrsReviewLog {
  id: string;
  user_id: string;
  item_id: string;
  rating: SrsRating;
  reviewed_at: string;
  elapsed_days: number;
}

// Exercise Payloads & Types
export type ExerciseType =
  | 'mcq'
  | 'type_answer'
  | 'listen_choose'
  | 'dictation'
  | 'speak_repeat'
  | 'sentence_build'
  | 'fill_blank_grammar'
  | 'dialogue_simulation'
  | 'story_comprehension'
  | 'matching_pairs'
  | 'error_correction'
  | 'compound_word_decomposition';

export interface McqOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface McqPayload {
  prompt_de?: string;
  prompt_ar?: string;
  media?: {
    image_url?: string;
    audio_url?: string;
  };
  options: McqOption[];
}

export interface TypeAnswerPayload {
  direction: 'ar_to_de' | 'de_to_ar';
  prompt: string;
  accepted_answers: string[];
  hint?: string;
}

export interface ListenChooseOption {
  id: string;
  text: string;
}

export interface ListenChoosePayload {
  audio_url: string;
  options: ListenChooseOption[];
  correct_option_id: string;
}

export interface DictationPayload {
  audio_url: string;
  correct_text: string;
  allow_partial_credit: boolean;
}

export interface SpeakRepeatPayload {
  target_text_de: string;
  target_audio_url: string;
  min_score_threshold: number;
}

export interface SentenceBuildPayload {
  correct_sentence: string;
  shuffled_tokens: string[];
  distractor_tokens?: string[];
}

export interface FillBlankGrammarPayload {
  sentence_template: string; // e.g. "Ich bin ___ Student."
  correct_answer: string;
  options?: string[];
  grammar_point_id?: string;
}

export interface DialogueTurn {
  speaker: string;
  text_de: string;
  text_ar: string;
}

export interface DialogueSimulationOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface DialogueSimulationPayload {
  turns: DialogueTurn[];
  response_options: DialogueSimulationOption[];
}

export interface StoryComprehensionQuestion {
  question: string;
  options: string[];
  correct_option_id: number; // index of the option
}

export interface StoryComprehensionPayload {
  story_text_de: string;
  story_text_ar?: string;
  questions: StoryComprehensionQuestion[];
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingPairsPayload {
  pairs: MatchingPair[];
}

export interface ErrorCorrectionPayload {
  incorrect_sentence: string;
  correct_sentence: string;
  error_token_index: number;
  explanation_ar: string;
}

export interface CompoundPart {
  part: string;
  meaning_ar: string;
}

export interface CompoundWordDecompositionPayload {
  compound_word: string;
  parts: CompoundPart[];
  combined_meaning_ar: string;
}

export type ExercisePayload =
  | McqPayload
  | TypeAnswerPayload
  | ListenChoosePayload
  | DictationPayload
  | SpeakRepeatPayload
  | SentenceBuildPayload
  | FillBlankGrammarPayload
  | DialogueSimulationPayload
  | StoryComprehensionPayload
  | MatchingPairsPayload
  | ErrorCorrectionPayload
  | CompoundWordDecompositionPayload;

export interface Exercise {
  id: string;
  lesson_id: string;
  type: ExerciseType;
  payload: ExercisePayload;
  difficulty: number;
  status: 'draft' | 'generated' | 'reviewed' | 'published';
}

export interface ExerciseVocabMap {
  exercise_id: string;
  vocab_id: string;
}

// User scoped stats and progress
export interface UserProgress {
  user_id: string;
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  mastery_score: number;
  last_practiced_at: string | null;
}

export interface UserStats {
  user_id: string;
  xp: number;
  streak_days: number;
  league_tier: string;
  last_active_date: string | null;
}

export interface PlacementTestResult {
  id: string;
  user_id: string;
  placed_level_id: string | null;
  raw_score: number;
  taken_at: string;
}

export interface ContentGenerationJob {
  id: string;
  unit_id: string;
  status: 'pending' | 'generated' | 'reviewed' | 'published' | 'failed';
  model_used: string | null;
  created_at: string;
}

// Session compositions
export interface SessionItem {
  exercise_id: string;
  type: ExerciseType;
  payload: ExercisePayload;
  srs_item_id?: string;
  vocab_item?: VocabularyItem; // Reference for gender visual rendering
  grammar_point?: GrammarPoint; // Reference for pedagogical bridge
}

export interface SessionData {
  session_id: string;
  items: SessionItem[];
  composition: {
    new: number;
    review: number;
    weak_point: number;
  };
}

// Rich Corpus Types for Extended Dictionary & Phrasebook
export interface GermanSentence {
  id: string;
  text_de: string;
  text_ar: string;
  level_id: string;
  grammar_note_ar?: string;
}

export interface GermanPhrase {
  id: string;
  text_de: string;
  text_ar: string;
  level_id: string;
  situation_ar: string;
}

export interface GermanExpression {
  id: string;
  text_de: string;
  text_ar: string;
  level_id: string;
  cultural_equivalent_ar: string;
  literal_meaning_ar?: string;
}
