/**
 * ShelfVisual — personality & styling for each situational shelf.
 *
 * Every shelf has a unique visual identity:
 *   - emoji glyph (a tiny pictogram, never noisy)
 *   - accent color (used for borders, hover, hero gradient)
 *   - gradient (a soft 2-stop CSS linear-gradient for the hero backdrop)
 *
 * Match by situation_tags first (the most stable identifier), then by
 * slug as fallback. Unmatched shelves get a neutral default.
 */

export interface ShelfVisual {
  emoji: string;
  accent: string;   // hex (used sparingly — borders, dots)
  gradient: string; // CSS linear-gradient for hero
  vibe: string;     // single-word in Arabic describing the mood
}

const DEFAULT_VISUAL: ShelfVisual = {
  emoji: '•',
  accent: '#17324D',
  gradient: 'linear-gradient(135deg, rgba(23,50,77,0.05), rgba(199,112,59,0.04))',
  vibe: 'مرجعي',
};

interface PatternRule {
  match: (tags: readonly string[], slug: string) => boolean;
  visual: ShelfVisual;
}

const RULES: PatternRule[] = [
  // Coffee / bakery
  { match: (t) => t.includes('coffee') || t.includes('bakery') || t.includes('cafe') || t.includes('breakfast'),
    visual: { emoji: '☕', accent: '#8B5A2B', gradient: 'linear-gradient(135deg, rgba(139,90,43,0.10), rgba(212,165,116,0.06))', vibe: 'دافئ صباحي' } },
  // Trains & transport
  { match: (t) => t.includes('train') || t.includes('bus') || t.includes('transit') || t.includes('db'),
    visual: { emoji: '🚆', accent: '#C03030', gradient: 'linear-gradient(135deg, rgba(192,48,48,0.10), rgba(255,255,255,0.06))', vibe: 'حركة واقعية' } },
  // Weather
  { match: (t) => t.includes('weather') || t.includes('smalltalk'),
    visual: { emoji: '🌤️', accent: '#5B8DBE', gradient: 'linear-gradient(135deg, rgba(91,141,190,0.12), rgba(255,255,255,0.05))', vibe: 'حوار خفيف' } },
  // Numbers / time
  { match: (t) => t.includes('time') || t.includes('numbers') || t.includes('appointments'),
    visual: { emoji: '⏰', accent: '#2A6B5C', gradient: 'linear-gradient(135deg, rgba(42,107,92,0.10), rgba(255,255,255,0.05))', vibe: 'دقة' } },
  // Grocery
  { match: (t) => t.includes('groceries') || t.includes('pfand') || t.includes('shopping'),
    visual: { emoji: '🛒', accent: '#6B8E23', gradient: 'linear-gradient(135deg, rgba(107,142,35,0.10), rgba(255,255,255,0.05))', vibe: 'تسوق عملي' } },
  // Texting
  { match: (t) => t.includes('texting') || t.includes('chat') || t.includes('abbreviation'),
    visual: { emoji: '💬', accent: '#7E57C2', gradient: 'linear-gradient(135deg, rgba(126,87,194,0.10), rgba(255,255,255,0.05))', vibe: 'دردشة عصرية' } },
  // Bürgeramt / bureaucracy
  { match: (t) => t.includes('bürgeramt') || t.includes('burgeramt') || t.includes('bureaucracy') || t.includes('registration'),
    visual: { emoji: '🏛️', accent: '#5D4037', gradient: 'linear-gradient(135deg, rgba(93,64,55,0.10), rgba(255,255,255,0.05))', vibe: 'رسمي' } },
  // Banking / insurance
  { match: (t) => t.includes('bank') || t.includes('insurance'),
    visual: { emoji: '🏦', accent: '#1565C0', gradient: 'linear-gradient(135deg, rgba(21,101,192,0.10), rgba(255,255,255,0.05))', vibe: 'مالي جدي' } },
  // Post
  { match: (t) => t.includes('post') || t.includes('parcel') || t.includes('mail'),
    visual: { emoji: '📮', accent: '#D81B60', gradient: 'linear-gradient(135deg, rgba(216,27,96,0.10), rgba(255,255,255,0.05))', vibe: 'لوجستيات' } },
  // Taxes
  { match: (t) => t.includes('tax') || t.includes('finanzamt'),
    visual: { emoji: '🧾', accent: '#455A64', gradient: 'linear-gradient(135deg, rgba(69,90,100,0.10), rgba(255,255,255,0.05))', vibe: 'مالي دقيق' } },
  // Housing / WG
  { match: (t) => t.includes('housing') || t.includes('wg') || t.includes('apartment'),
    visual: { emoji: '🏠', accent: '#8B6F47', gradient: 'linear-gradient(135deg, rgba(139,111,71,0.10), rgba(255,255,255,0.05))', vibe: 'منزلي' } },
  // Work / job application / email
  { match: (t) => t.includes('work') || t.includes('job') || t.includes('email') || t.includes('application'),
    visual: { emoji: '💼', accent: '#37474F', gradient: 'linear-gradient(135deg, rgba(55,71,79,0.10), rgba(255,255,255,0.05))', vibe: 'احترافي' } },
  // University / exams
  { match: (t) => t.includes('university') || t.includes('exam') || t.includes('education'),
    visual: { emoji: '🎓', accent: '#1976D2', gradient: 'linear-gradient(135deg, rgba(25,118,210,0.10), rgba(255,255,255,0.05))', vibe: 'أكاديمي' } },
  // Doctor / pharmacy / health
  { match: (t) => t.includes('doctor') || t.includes('pharmacy') || t.includes('medical') || t.includes('health') || t.includes('sick'),
    visual: { emoji: '⚕️', accent: '#C62828', gradient: 'linear-gradient(135deg, rgba(198,40,40,0.10), rgba(255,255,255,0.05))', vibe: 'صحي' } },
  // Restaurant / tipping / food
  { match: (t) => t.includes('restaurant') || t.includes('food') || t.includes('grocery') || t.includes('delivery'),
    visual: { emoji: '🍽️', accent: '#E65100', gradient: 'linear-gradient(135deg, rgba(230,81,0,0.10), rgba(255,255,255,0.05))', vibe: 'مأكولات' } },
  // Späti / going out
  { match: (t) => t.includes('späti') || t.includes('going-out') || t.includes('nightlife') || t.includes('club'),
    visual: { emoji: '🌙', accent: '#5E35B1', gradient: 'linear-gradient(135deg, rgba(94,53,177,0.10), rgba(0,0,0,0.04))', vibe: 'ليلي' } },
  // Dating / relationship / break-up / romance
  { match: (t) => t.includes('dating') || t.includes('flirting') || t.includes('relationship') || t.includes('breakup') || t.includes('romance') || t.includes('pet-name') || t.includes('love'),
    visual: { emoji: '🌸', accent: '#D81B60', gradient: 'linear-gradient(135deg, rgba(216,27,96,0.10), rgba(255,255,255,0.05))', vibe: 'عاطفي' } },
  // Idioms
  { match: (t) => t.includes('idiom') || t.includes('animal') || t.includes('weather-idiom') || t.includes('food-idiom') || t.includes('body'),
    visual: { emoji: '🎭', accent: '#6D4C41', gradient: 'linear-gradient(135deg, rgba(109,76,65,0.10), rgba(255,255,255,0.05))', vibe: 'تعبيري' } },
  // Dialects
  { match: (t) => t.includes('dialect') || t.includes('bavarian') || t.includes('swabian') || t.includes('kölsch') || t.includes('austrian') || t.includes('swiss'),
    visual: { emoji: '🗺️', accent: '#0277BD', gradient: 'linear-gradient(135deg, rgba(2,119,189,0.10), rgba(255,255,255,0.05))', vibe: 'إقليمي' } },
  // Insults / venting
  { match: (t) => t.includes('swearing') || t.includes('insult') || t.includes('venting'),
    visual: { emoji: '🔥', accent: '#BF360C', gradient: 'linear-gradient(135deg, rgba(191,54,12,0.10), rgba(255,255,255,0.05))', vibe: 'انفعال' } },
  // Festivals FIRST — oktoberfest/karneval/christmas must beat the
    // generic "festival" tag in the Subcultures block below.
    { match: (t) => t.includes('oktoberfest'),
      visual: { emoji: '🍺', accent: '#F57F17', gradient: 'linear-gradient(135deg, rgba(245,127,23,0.10), rgba(255,255,255,0.05))', vibe: 'احتفالي' } },
    { match: (t) => t.includes('karneval'),
      visual: { emoji: '🎭', accent: '#D81B60', gradient: 'linear-gradient(135deg, rgba(216,27,96,0.10), rgba(255,255,255,0.05))', vibe: 'كرنفالي' } },
    { match: (t) => t.includes('christmas') || t.includes('weihnacht'),
      visual: { emoji: '🎄', accent: '#2E7D32', gradient: 'linear-gradient(135deg, rgba(46,125,32,0.10), rgba(212,165,116,0.06))', vibe: 'شتوي' } },
    // Subcultures: techno, football, gaming — catches bare `festival` tag
    { match: (t) => t.includes('techno') || t.includes('club') || t.includes('festival'),
      visual: { emoji: '🎧', accent: '#E91E63', gradient: 'linear-gradient(135deg, rgba(233,30,99,0.12), rgba(0,0,0,0.06))', vibe: 'موسيقي' } },
    { match: (t) => t.includes('football') || t.includes('fan'),
      visual: { emoji: '⚽', accent: '#2E7D32', gradient: 'linear-gradient(135deg, rgba(46,125,32,0.10), rgba(255,255,255,0.05))', vibe: 'رياضي' } },
  { match: (t) => t.includes('gaming'),
    visual: { emoji: '🎮', accent: '#7B1FA2', gradient: 'linear-gradient(135deg, rgba(123,31,162,0.12), rgba(0,0,0,0.05))', vibe: 'رقمي' } },
  // Privacy / online / tech-support
  { match: (t) => t.includes('privacy') || t.includes('datenschutz') || t.includes('online') || t.includes('tech-support') || t.includes('banking'),
    visual: { emoji: '🔐', accent: '#00838F', gradient: 'linear-gradient(135deg, rgba(0,131,143,0.10), rgba(255,255,255,0.05))', vibe: 'رقمي' } },
  // Mülltrennung / ruhezeit
  { match: (t) => t.includes('müll') || t.includes('recycling') || t.includes('trash') || t.includes('separation'),
    visual: { emoji: '♻️', accent: '#388E3C', gradient: 'linear-gradient(135deg, rgba(56,142,60,0.10), rgba(255,255,255,0.05))', vibe: 'بيئي' } },
  { match: (t) => t.includes('ruhezeit') || t.includes('quiet'),
    visual: { emoji: '🌙', accent: '#455A64', gradient: 'linear-gradient(135deg, rgba(69,90,100,0.10), rgba(255,255,255,0.05))', vibe: 'هادئ' } },
  // Gym / cycling / running
  { match: (t) => t.includes('gym') || t.includes('fitness'),
    visual: { emoji: '💪', accent: '#D84315', gradient: 'linear-gradient(135deg, rgba(216,67,21,0.10), rgba(255,255,255,0.05))', vibe: 'رياضي' } },
  { match: (t) => t.includes('cycling') || t.includes('bike'),
    visual: { emoji: '🚴', accent: '#00897B', gradient: 'linear-gradient(135deg, rgba(0,137,123,0.10), rgba(255,255,255,0.05))', vibe: 'ريفي' } },
  { match: (t) => t.includes('running') || t.includes('marathon'),
    visual: { emoji: '🏃', accent: '#C2185B', gradient: 'linear-gradient(135deg, rgba(194,24,91,0.10), rgba(255,255,255,0.05))', vibe: 'ديناميكي' } },
  // Travel: deutschlandticket / hostel
  { match: (t) => t.includes('deutschlandticket') || t.includes('travel'),
    visual: { emoji: '🧳', accent: '#00695C', gradient: 'linear-gradient(135deg, rgba(0,105,92,0.10), rgba(255,255,255,0.05))', vibe: 'مسافر' } },
  { match: (t) => t.includes('hostel'),
    visual: { emoji: '🛏️', accent: '#5D4037', gradient: 'linear-gradient(135deg, rgba(93,64,55,0.10), rgba(255,255,255,0.05))', vibe: 'مؤقت' } },

  // Pets / chores
  { match: (t) => t.includes('pet') || t.includes('dog') || t.includes('cat'),
    visual: { emoji: '🐾', accent: '#8B6F47', gradient: 'linear-gradient(135deg, rgba(139,111,71,0.10), rgba(255,255,255,0.05))', vibe: 'حنون' } },
  { match: (t) => t.includes('chores') || t.includes('putzplan') || t.includes('cleaning'),
    visual: { emoji: '🧹', accent: '#558B2F', gradient: 'linear-gradient(135deg, rgba(85,139,47,0.10), rgba(255,255,255,0.05))', vibe: 'منزلي' } },
  // Denglisch
  { match: (t) => t.includes('denglisch') || t.includes('loanword'),
    visual: { emoji: '🔀', accent: '#F57C00', gradient: 'linear-gradient(135deg, rgba(245,124,0,0.10), rgba(255,255,255,0.05))', vibe: 'هجين' } },
  // Humour / sarcasm
  { match: (t) => t.includes('humor') || t.includes('sarcasm') || t.includes('irony') || t.includes('dry'),
    visual: { emoji: '😏', accent: '#6A1B9A', gradient: 'linear-gradient(135deg, rgba(106,27,154,0.10), rgba(255,255,255,0.05))', vibe: 'ساخر' } },
];

/** Resolve a shelf's visual identity by its situation_tags + slug. */
export function resolveShelfVisual(
  situationTags: readonly string[],
  slug: string,
): ShelfVisual {
  const t = (situationTags ?? []).map((x) => x.toLowerCase());
  for (const rule of RULES) {
    if (rule.match(t, slug)) return rule.visual;
  }
  return DEFAULT_VISUAL;
}