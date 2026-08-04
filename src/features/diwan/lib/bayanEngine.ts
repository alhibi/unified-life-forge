import type {
  AlBayanAnalysisResult,
  SyntacticToken,
  SyntacticBranch,
  PoeticMeterAnalysis,
  TafilaBlock,
  PoeticSyllable,
  MorphologicalToken,
  RhetoricalFigure,
  BalaghaAnalysis,
  MeterId
} from "../types/bayan";
import {
  BAYAN_POETIC_METERS,
  BAYAN_MORPHOLOGY_PATTERNS,
  BAYAN_SYNTAX_ROLES,
  BAYAN_RHETORIC_FIGURES
} from "../data/bayanLinguisticDatabase";

// Auxiliary functions for cleaning Arabic characters
export function removeDiacritics(text: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return text.replace(/[\u064B-\u0652]/g, "");
}

export function cleanString(text: string): string {
  let clean = text.trim();
  clean = removeDiacritics(clean);
  // Normalize Alifs
  clean = clean.replace(/[أإآ]/g, "ا");
  // Normalize Ya'
  clean = clean.replace(/ى/g, "ي");
  // Normalize Ta' Marbuta
  clean = clean.replace(/ة/g, "ه");
  return clean;
}

// Map of common prepositions / particles in Arabic
const PARTICLES = new Set([
  "في", "من", "إلى", "على", "عن", "حتى", "مذ", "منذ", "رب", "الواو", "الباء", "التاء", "الكاف", "اللام",
  "إن", "أن", "كأن", "لكن", "ليت", "لعل", "لا", "ما", "إلا", "غير", "سوى", "خلا", "عدا", "حاشا", "ثم", "أو", "أم", "بل", "لكن"
]);

// Map of common verbs
const VERB_ROOTS = [
  { root: "كتب", pattern: "فعل" },
  { root: "قرأ", pattern: "فعل" },
  { root: "سمع", pattern: "فعل" },
  { root: "دخل", pattern: "فعل" },
  { root: "خرج", pattern: "فعل" },
  { root: "شعر", pattern: "فعل" },
  { root: "علم", pattern: "فعل" },
  { root: "ذهب", pattern: "فعل" },
  { root: "جلس", pattern: "فعل" },
  { root: "قال", pattern: "فعل" },
  { root: "كان", pattern: "فعال" },
  { root: "رأى", pattern: "فعل" },
];

/**
 * Heuristically identifies part of speech (Noun, Verb, Particle) and provides syntactic info.
 */
function analyzeSyntacticToken(word: string, index: number, totalWords: number): SyntacticToken {
  const cleanWordValue = cleanString(word);
  const isParticle = PARTICLES.has(cleanWordValue) || PARTICLES.has(word);

  let partOfSpeech: "noun" | "verb" | "particle" | "unknown" = "noun";
  let caseState: "nominative" | "accusative" | "genitive" | "jussive" | "none" = "none";
  let markerType: "original" | "subsidiary" | "estimated" | "local" = "original";
  let markerDetail = "الضمة الظاهرة على آخره";
  let syntacticRole = "مضاف إليه مجرور";
  let explanation = "";

  if (isParticle) {
    partOfSpeech = "particle";
    caseState = "none";
    markerType = "local";
    syntacticRole = "حرف مبني";
    markerDetail = "مبني على السكون لا محل له من الإعراب";
    explanation = `حرف مبني لا محل له من الإعراب؛ يسهم في ربط عناصر الجملة وتحديد سياقها التركيبي.`;
  } else {
    // Check if looks like a verb
    const startsWithVerbPrefix = /^(أ|ت|ي|ن)/.test(word) && word.length >= 3;
    const endsWithVerbSuffix = /(تَ|تُ|تِ|نا|وا|تم)$/.test(word);
    const isCommonVerb = VERB_ROOTS.some(v => cleanWordValue.includes(v.root));

    if (startsWithVerbPrefix || endsWithVerbSuffix || isCommonVerb) {
      partOfSpeech = "verb";
      caseState = "none";
      syntacticRole = "فعل";

      if (word.startsWith("ي") || word.startsWith("ت") || word.startsWith("أ") || word.startsWith("ن")) {
        caseState = "nominative";
        syntacticRole = "فعل مضارع مرفوع";
        markerDetail = "الضمة الظاهرة على آخره";
        explanation = `فعل مضارع يدل على التجدد والاستمرار، مرفوع لتجرده من الناصب والجازم.`;
      } else {
        markerType = "local";
        syntacticRole = "فعل ماض مبني";
        markerDetail = "مبني على الفتح الظاهر";
        explanation = `فعل ماض يدل على حدث وقع وانتهى في الزمن الماضي، مبني على الفتح لا محل له من الإعراب إلا إذا وقع في جملة لها محل.`;
      }
    } else {
      // Noun logic
      partOfSpeech = "noun";
      if (index === 0) {
        caseState = "nominative";
        syntacticRole = "مبتدأ مرفوع";
        const rule = BAYAN_SYNTAX_ROLES.find(r => r.role === "مبتدأ مرفوع");
        markerDetail = "الضمة الظاهرة على آخره";
        explanation = rule ? rule.defaultExplanation : `اسم مرفوع تبدأ به الجملة الاسمية، وهو الركن الأول فيها وعامل الرفع فيه هو الابتداء.`;
      } else if (index === 1 && totalWords >= 2) {
        caseState = "nominative";
        syntacticRole = "خبر مرفوع";
        const rule = BAYAN_SYNTAX_ROLES.find(r => r.role === "خبر مرفوع");
        markerDetail = "الضمة الظاهرة على آخره";
        explanation = rule ? rule.defaultExplanation : `الركن الثاني في الجملة الاسمية الذي يتمم الفائدة مع المبتدأ ويحصل به معنى تام بالتعاون معه.`;
      } else if (index === totalWords - 1) {
        caseState = "genitive";
        syntacticRole = "مضاف إليه مجرور";
        const rule = BAYAN_SYNTAX_ROLES.find(r => r.role === "مضاف إليه مجرور");
        markerDetail = "الكسرة الظاهرة تحت آخره";
        explanation = rule ? rule.defaultExplanation : `اسم مجرور ينسب إلى اسم قبله لتعريفه أو تخصيصه، مضاف إليه مجرور وعلامة جره الكسرة الظاهرة.`;
      } else {
        caseState = "accusative";
        syntacticRole = "مفعول به منصوب";
        const rule = BAYAN_SYNTAX_ROLES.find(r => r.role === "مفعول به منصوب");
        markerDetail = "الفتحة الظاهرة على آخرها";
        explanation = rule ? rule.defaultExplanation : `اسم منصوب يقع عليه فعل الفاعل في الجملة الفعلية بشكل مباشر أو غير مباشر.`;
      }
    }
  }

  // Adjust marker types for special endings (e.g. Alif Maqsura)
  if (word.endsWith("ى") || word.endsWith("ا")) {
    markerType = "estimated";
    markerDetail = "الضمة المقدرة للتعذر";
  }

  return {
    id: `token-${index}-${word}`,
    word,
    cleanWord: cleanWordValue,
    partOfSpeech,
    caseState,
    markerType,
    markerDetail,
    syntacticRole,
    explanation,
    positionInSentence: [0, word.length], // simplified mapping
    isDiacritized: /[\u064B-\u0652]/.test(word),
  };
}

/**
 * Builds a simulated Abstract Syntax Tree (AST) out of parsed tokens.
 */
function buildAST(tokens: SyntacticToken[]): SyntacticBranch {
  if (tokens.length === 0) {
    return { id: "empty", label: "فارغ", role: "جملة خالية", tokenIds: [], children: [] };
  }

  const isVerbal = tokens[0]?.partOfSpeech === "verb";
  const label = isVerbal ? "جملة فعلية" : "جملة اسمية";
  const role = isVerbal ? "مسند ومسند إليه" : "مبتدأ وخبر";

  const rootBranch: SyntacticBranch = {
    id: "root-branch",
    label,
    role,
    tokenIds: tokens.map(t => t.id),
    children: []
  };

  if (isVerbal) {
    // Branch Verb
    rootBranch.children.push({
      id: "verb-branch",
      label: "الفعل",
      role: "مسند",
      value: tokens[0].word,
      tokenIds: [tokens[0].id],
      children: []
    });

    if (tokens.length > 1) {
      // Branch Subject / Object
      rootBranch.children.push({
        id: "complement-branch",
        label: "الفضلات والمكملات",
        role: "متعلقات الفعل والفاعل",
        tokenIds: tokens.slice(1).map(t => t.id),
        children: tokens.slice(1).map((t, idx) => ({
          id: `child-${idx}`,
          label: t.syntacticRole,
          role: t.partOfSpeech === "noun" ? "مسند إليه / مفعول" : "متعلق",
          value: t.word,
          tokenIds: [t.id],
          children: []
        }))
      });
    }
  } else {
    // Nominal Sentence
    if (tokens.length > 0) {
      rootBranch.children.push({
        id: "subject-branch",
        label: "المبتدأ",
        role: "مسند إليه",
        value: tokens[0].word,
        tokenIds: [tokens[0].id],
        children: []
      });
    }
    if (tokens.length > 1) {
      rootBranch.children.push({
        id: "predicate-branch",
        label: "الخبر",
        role: "مسند",
        value: tokens[1].word,
        tokenIds: [tokens[1].id],
        children: []
      });
    }
    if (tokens.length > 2) {
      rootBranch.children.push({
        id: "dependents-branch",
        label: "متعلقات وتوابع",
        role: "نعت / مضاف إليه / عطف",
        tokenIds: tokens.slice(2).map(t => t.id),
        children: tokens.slice(2).map((t, idx) => ({
          id: `dep-${idx}`,
          label: t.syntacticRole,
          role: "تابع",
          value: t.word,
          tokenIds: [t.id],
          children: []
        }))
      });
    }
  }

  return rootBranch;
}

/**
 * Heuristically identifies morphological tokens using the comprehensive database rules.
 */
function analyzeMorphologyToken(token: SyntacticToken): MorphologicalToken {
  const cleanWordValue = token.cleanWord;
  let root = "ف ع ل";
  let pattern = "فَعَلَ";
  let wordType: "noun_derived" | "noun_solid" | "verb_triliteral" | "verb_quadriliteral" | "particle" = "noun_solid";
  let derivationType: string | undefined = undefined;
  const features: string[] = [];

  // Match pattern from our comprehensive rule database
  const ruleMatch = BAYAN_MORPHOLOGY_PATTERNS.find(rule => {
    // check simple matches or root extractions
    if (rule.type === "verb" && token.partOfSpeech === "verb") {
      if (rule.pattern === "اسْتَفْعَلَ" && cleanWordValue.startsWith("است")) return true;
      if (rule.pattern === "تَفَعَّلَ" && cleanWordValue.startsWith("ت") && cleanWordValue.length > 4) return true;
    }
    if (rule.type === "derived" && token.partOfSpeech === "noun") {
      if (rule.pattern === "فَاعِل" && cleanWordValue.charAt(1) === "ا") return true;
      if (rule.pattern === "مَفْعُول" && cleanWordValue.startsWith("م") && cleanWordValue.charAt(3) === "و") return true;
    }
    return false;
  });

  if (token.partOfSpeech === "particle") {
    wordType = "particle";
    root = "-";
    pattern = "-";
  } else if (ruleMatch) {
    pattern = ruleMatch.pattern;
    wordType = ruleMatch.type === "verb" ? "verb_triliteral" : "noun_derived";
    derivationType = ruleMatch.derivationType;
    features.push(ruleMatch.meaning);

    // Extract root heuristically based on pattern
    if (pattern === "اسْتَفْعَلَ") {
      root = cleanWordValue.slice(3, 6).split("").join(" ");
    } else if (pattern === "تَفَعَّلَ") {
      root = cleanWordValue.slice(1, 4).split("").join(" ");
    } else if (pattern === "فَاعِل") {
      root = (cleanWordValue.charAt(0) + cleanWordValue.slice(2, 4)).split("").join(" ");
    } else if (pattern === "مَفْعُول") {
      root = (cleanWordValue.slice(1, 3) + cleanWordValue.charAt(4)).split("").join(" ");
    } else {
      root = cleanWordValue.slice(0, 3).split("").join(" ");
    }
  } else {
    // Fallback standard classification
    if (token.partOfSpeech === "verb") {
      wordType = "verb_triliteral";
      let rootCand = cleanWordValue;
      if (rootCand.startsWith("ي") || rootCand.startsWith("ن") || rootCand.startsWith("أ")) {
        rootCand = rootCand.slice(1);
        pattern = "يَفْعُلُ";
      }
      if (rootCand.length >= 3) {
        root = rootCand.slice(0, 3).split("").join(" ");
      } else {
        root = cleanWordValue.split("").join(" ");
      }
    } else {
      wordType = "noun_solid";
      pattern = "فَعْل";
      if (cleanWordValue.length >= 3) {
        root = cleanWordValue.slice(0, 3).split("").join(" ");
      } else {
        root = cleanWordValue.split("").join(" ");
      }
    }
  }

  return {
    id: `morph-${token.id}`,
    word: token.word,
    root,
    pattern,
    wordType,
    derivationType,
    state: {
      isGenderFeminine: token.word.endsWith("ة") || token.word.endsWith("ى"),
      number: token.word.endsWith("ون") || token.word.endsWith("ين") || token.word.endsWith("ات") ? "plural" : token.word.endsWith("ان") || token.word.endsWith("ين") ? "dual" : "singular",
      isDefinite: token.word.startsWith("ال"),
      transitivity: token.partOfSpeech === "verb" ? "transitive" : undefined,
    },
    features,
  };
}

/**
 * Syllabic Prosody (Arood) Scansion Heuristic Engine
 */
function scanHemistich(text: string): { scansionText: string; symbols: string; tafilas: TafilaBlock[] } {
  const clean = cleanString(text);
  const words = clean.split(/\s+/);

  // Create simulated phonetic representation
  // E.g., solar Lams disappear, Tanween becomes Noon, etc.
  let scansionText = words.map(w => {
    let phon = w;
    // Normalize tanween
    if (/[ًٌٍ]/.test(phon)) {
      phon += "ن";
    }
    // Solar letters
    if (phon.startsWith("ال")) {
      const solarLetters = ["ت", "ث", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ل", "ن"];
      const nextChar = phon.charAt(2);
      if (solarLetters.includes(nextChar)) {
        phon = phon.slice(2); // remove Al
      }
    }
    return phon;
  }).join(" ");

  // Map letters to patterns: consonants followed by voweled sounds.
  // We simulate `/` for متحرك and `o` for ساكن.
  let symbols = "";
  for (let i = 0; i < scansionText.length; i++) {
    const char = scansionText[i];
    if (char === " ") {
      symbols += " ";
      continue;
    }
    // simple heuristic: Alif, Waw, Ya are usually vowels/sukun (o), other letters are consonants (/)
    if (["ا", "و", "ي", "ى"].includes(char)) {
      symbols += "o";
    } else {
      symbols += "/";
    }
  }

  // Clean double spaces
  symbols = symbols.replace(/\s+/g, " ");

  // Divide into Tafila groups based on patterns
  const tafilas: TafilaBlock[] = [];
  const symbolGroups = symbols.split(" ");

  const tafilaPatterns = [
    { name: "فعولن", pattern: "//o/o" },
    { name: "مفاعيلن", pattern: "//o/o/o" },
    { name: "فاعلاتن", pattern: "/o//o/o" },
    { name: "مستفعلن", pattern: "/o/o//o" },
    { name: "مفاعلتن", pattern: "//o///o" },
    { name: "متفاعلن", pattern: "///o//o" },
    { name: "فاعلن", pattern: "/o//o" },
    { name: "مفعولات", pattern: "/o/o/o/" },
  ];

  symbolGroups.forEach((groupSymbols, idx) => {
    // Find closest tafila matching the symbols
    let bestTafila = tafilaPatterns[0];
    let bestDiff = 999;

    tafilaPatterns.forEach(cand => {
      // simple diff count
      let diff = Math.abs(cand.pattern.length - groupSymbols.length);
      for (let k = 0; k < Math.min(cand.pattern.length, groupSymbols.length); k++) {
        if (cand.pattern[k] !== groupSymbols[k]) diff++;
      }
      if (diff < bestDiff) {
        bestDiff = diff;
        bestTafila = cand;
      }
    });

    const syllables: PoeticSyllable[] = groupSymbols.split("").map((sym, charIdx) => ({
      text: words[idx]?.charAt(charIdx) || "ـ",
      phonetic: words[idx]?.charAt(charIdx) || "ـ",
      isMoving: sym === "/",
      symbol: sym as "/" | "o",
    }));

    tafilas.push({
      tafilaName: bestTafila.name,
      symbolPattern: groupSymbols,
      syllables,
      deviation: bestDiff > 1 ? "زحاف مقبول (القبض/الخبن)" : undefined,
    });
  });

  return {
    scansionText,
    symbols,
    tafilas,
  };
}

/**
 * Checks for classical meters (البحور الستة عشر).
 */
function identifyPoeticMeter(text: string): PoeticMeterAnalysis | undefined {
  // Try split by comma, asterisk, or space padding to detect hemistiches (الشطرين)
  let hemistiches = text.split(/[\*\t،,]/);
  if (hemistiches.length < 2) {
    // Try midpoint splitting
    const words = text.split(/\s+/);
    if (words.length >= 4) {
      const mid = Math.floor(words.length / 2);
      hemistiches = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    } else {
      hemistiches = [text, ""];
    }
  }

  const firstHem = scanHemistich(hemistiches[0] || "");
  const secondHem = scanHemistich(hemistiches[1] || "");

  // Heuristic meter classification from the database
  const totalSymbolsLength = firstHem.symbols.replace(/\s/g, "").length;

  let matchedMeter = BAYAN_POETIC_METERS[0]; // default taweel
  let score = 0.5;

  if (totalSymbolsLength >= 12 && totalSymbolsLength <= 15) {
    matchedMeter = BAYAN_POETIC_METERS.find(m => m.id === "taweel") || matchedMeter;
    score = 0.95;
  } else if (totalSymbolsLength >= 10 && totalSymbolsLength <= 11) {
    matchedMeter = BAYAN_POETIC_METERS.find(m => m.id === "baseet") || matchedMeter;
    score = 0.92;
  } else if (totalSymbolsLength >= 8 && totalSymbolsLength <= 9) {
    matchedMeter = BAYAN_POETIC_METERS.find(m => m.id === "kamel") || matchedMeter;
    score = 0.88;
  } else if (totalSymbolsLength >= 6 && totalSymbolsLength <= 7) {
    matchedMeter = BAYAN_POETIC_METERS.find(m => m.id === "wafer") || matchedMeter;
    score = 0.90;
  } else {
    matchedMeter = BAYAN_POETIC_METERS.find(m => m.id === "mutaqarib") || matchedMeter;
    score = 0.85;
  }

  // Deduce rhyme letter
  const cleanSecondText = cleanString(hemistiches[1] || hemistiches[0] || "");
  const lastChar = cleanSecondText.charAt(cleanSecondText.length - 1) || "م";

  return {
    meterId: matchedMeter.id as MeterId,
    meterName: matchedMeter.name,
    keyPoem: matchedMeter.keyPoem,
    firstHemistich: firstHem,
    secondHemistich: secondHem,
    rhymeLetter: lastChar,
    rhymeType: "مطلقة (متحركة الروي)",
    isPerfectMatch: true,
    score,
  };
}

/**
 * Rhetorical (Balagha) Diagnostic Engine.
 */
function analyzeRhetoric(text: string): BalaghaAnalysis {
  const cleanText = cleanString(text);
  const figures: RhetoricalFigure[] = [];

  // Scans for exact custom rhetoric definitions inside the database rules
  BAYAN_RHETORIC_FIGURES.forEach((figRule, index) => {
    figRule.indicators.forEach(indicator => {
      if (cleanText.includes(cleanString(indicator))) {
        figures.push({
          id: `rh-db-${index}-${indicator}`,
          type: figRule.type,
          category: figRule.category,
          snippet: indicator,
          description: figRule.description,
          eloquenceWeight: 8.5,
        });
      }
    });
  });

  // 1. Search for generic stylistic elements / indicators
  if (figures.length === 0 && (text.includes("كأنه") || text.includes("مثل") || text.includes("شبيه") || text.includes("كـ"))) {
    figures.push({
      id: "rh-1",
      type: "bayan",
      category: "التشبيه المرسل",
      snippet: text.substring(Math.max(0, text.indexOf("ك")), Math.min(text.length, text.indexOf("ك") + 15)),
      description: "ورود أداة التشبيه صراحة في النص مما يسهم في جلاء المعنى وتقريب الصورة الذهنية للمتلقي.",
      eloquenceWeight: 7.5,
    });
  }

  // 2. Identify word play (Ginas / الطباق)
  const words = cleanText.split(/\s+/);
  let hasGinas = false;
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (words[i] !== words[j] && words[i].slice(1) === words[j].slice(1)) {
        hasGinas = true;
        figures.push({
          id: `rh-ginas-${i}`,
          type: "badi",
          category: "الجناس الناقص",
          snippet: `${words[i]} - ${words[j]}`,
          description: "اتفاق الكلمتين في معظم الحروف مع اختلاف يسير، يضفي جرساً موسيقياً عذباً في الأسماع.",
          eloquenceWeight: 8.2,
        });
        break;
      }
    }
    if (hasGinas) break;
  }

  // 3. Sentence style (خبري أم إنشائي)
  let sentenceStyle: "informative" | "expressive" | "mixed" = "informative";
  let expressiveCategory: string | undefined = undefined;

  if (text.includes("هل") || text.includes("كيف") || text.includes("أين") || text.endsWith("؟")) {
    sentenceStyle = "expressive";
    expressiveCategory = "استفهام طلبي";
  } else if (text.startsWith("يا ") || text.includes(" يا ")) {
    sentenceStyle = "expressive";
    expressiveCategory = "نداء";
  } else if (text.includes("لا تفعل") || text.includes("إياك")) {
    sentenceStyle = "expressive";
    expressiveCategory = "نهي";
  } else if (figures.length > 0) {
    sentenceStyle = "mixed";
  }

  const eloquenceIndex = 75 + figures.length * 5;

  return {
    rhetoricalFigures: figures,
    sentenceStyle,
    expressiveCategory,
    eloquenceIndex: Math.min(100, eloquenceIndex),
    styleCohesionSummary: "يمتاز النص بجزالة اللفظ ومتانة التركيب، مع توظيف متزن للمحسنات البلاغية والبيانية لإيصال المعنى بوضوح وبلاغة تامة."
  };
}

// ============================================================================
// Main Entry point of Al-Bayan Deep Analysis Engine
// ============================================================================

export function analyzeArabicText(text: string): AlBayanAnalysisResult {
  const normalizedText = text.trim();
  const rawWords = normalizedText.split(/\s+/).filter(Boolean);

  // 1. Syntax Parsing
  const tokens = rawWords.map((word, idx) => analyzeSyntacticToken(word, idx, rawWords.length));
  const ast = buildAST(tokens);
  const sentenceType = tokens[0]?.partOfSpeech === "verb" ? "verbal" : "nominal";

  // 2. Morphology Parsing
  const morphologyTokens = tokens.map(t => analyzeMorphologyToken(t));

  // 3. Prosody (Arood) Scansion
  const isPossiblyPoem = rawWords.length >= 4 || text.includes("،") || text.includes("*");
  const prosody = isPossiblyPoem ? identifyPoeticMeter(text) : undefined;

  // 4. Rhetoric Diagnostic
  const rhetoric = analyzeRhetoric(text);

  return {
    id: `bayan-analysis-${Date.now()}`,
    inputText: text,
    analyzedAt: new Date().toISOString(),
    syntax: {
      tokens,
      ast,
      sentenceType,
    },
    prosody,
    morphology: {
      tokens: morphologyTokens,
    },
    rhetoric,
  };
}
