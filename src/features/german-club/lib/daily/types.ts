/**
 * Heute im Club — daily content types
 *
 * The German Club surfaces four small pieces of fresh content each day:
 *  1. Wort         — a beautiful, useful, surprising word
 *  2. Sprichwort   — a Sprichwort (German proverb) with literal + real meaning
 *  3. Satz         — a real sentence that locals actually say
 *  4. Kulturperle  — a tiny cultural fact / food / tradition / holiday
 *
 * All content is hand-curated, static, and stored in this folder.
 * Selection is deterministic by date so the same day always shows the same items.
 *
 * There is NO streak, NO reminder, NO push notification. The content just
 * floats on the home page when the user visits — like the daily card on a
 * small-town café chalkboard. Read it or walk past it.
 */

export interface DailyWort {
  /** The German word or short expression */
  readonly wort: string;
  /** IPA pronunciation (optional) */
  readonly ipa?: string;
  /** Arabic translation */
  readonly arabic: string;
  /** Short, punchy Arabic hint about when/how to use it */
  readonly hint_ar: string;
  /** Optional gender — der/die/das/n_a */
  readonly gender?: 'der' | 'die' | 'das' | 'plural';
  /** Register: formal / neutral / informal / slang */
  readonly register: 'formal' | 'neutral' | 'informal' | 'slang';
  /** Where to look it up in the Club — shelf slug */
  readonly shelf_slug?: string;
}

export interface DailySprichwort {
  /** The German proverb / Redewendung */
  readonly sprichwort: string;
  /** Literal word-by-word translation into Arabic (the surprising part) */
  readonly literal_ar: string;
  /** What it actually means */
  readonly meaning_ar: string;
  /** Where it's from (region / context) */
  readonly origin_note_ar?: string;
  /** Optional shelf slug */
  readonly shelf_slug?: string;
}

export interface DailySatz {
  /** The German sentence — exactly how a real person would say it */
  readonly satz: string;
  /** Arabic translation */
  readonly arabic: string;
  /** When/where you'd actually hear this */
  readonly context_ar: string;
  /** Register */
  readonly register: 'formal' | 'neutral' | 'informal' | 'slang';
  /** Optional shelf slug */
  readonly shelf_slug?: string;
}

export interface DailyKulturperle {
  /** Short headline in Arabic */
  readonly title_ar: string;
  /** German title or phrase */
  readonly title_de: string;
  /** 2-4 sentences in Arabic — the pearl itself */
  readonly body_ar: string;
  /** Optional shelf slug if related to a Club shelf */
  readonly shelf_slug?: string;
}

export interface DailyBundle {
  readonly wort: DailyWort;
  readonly sprichwort: DailySprichwort;
  readonly satz: DailySatz;
  readonly kulturperle: DailyKulturperle;
}