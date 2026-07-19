/**
 * Calisthenics Atlas — comprehensive bilingual reference for elite bodyweight training.
 *
 * Each skill includes:
 *  • Detailed level progressions with technique cues
 *  • Prerequisites (what you need to master first)
 *  • Common mistakes to avoid
 *  • Recommended training frequency & holds
 *  • Difficulty rating (1-10)
 *  • Muscle groups activated
 *
 * Designed for athletes in their 20s — peak adaptation window.
 *
 * Pure data — no React, no network.
 */

export type Lang = 'ar' | 'de';

export type SkillCategory =
  | 'push' | 'pull' | 'core' | 'legs' | 'static' | 'dynamic';

export interface SkillLevel {
  /** Level name (e.g. "Wall Push-up") */
  name: Record<Lang, string>;
  /** What it looks like / how to perform */
  description: Record<Lang, string>;
  /** Recommended sets × reps OR hold time in seconds */
  prescription: Record<Lang, string>;
  /** When to progress (objective benchmark) */
  progressCriteria: Record<Lang, string>;
}

export interface CalisthenicsSkill {
  key: string;
  category: SkillCategory;
  /** Display color (tailwind hue) */
  color: string;
  /** Difficulty 1 (easy) → 10 (elite) */
  difficulty: number;
  /** Months of consistent training, ballpark */
  estimatedMonths: number;
  /** Hero icon emoji-equivalent — for visual variety */
  emoji: string;
  name: Record<Lang, string>;
  /** One-paragraph overview */
  description: Record<Lang, string>;
  /** Prerequisite skill keys + minimum reps/holds */
  prerequisites: { key: string; min: Record<Lang, string> }[];
  /** Detailed levels in progression order */
  levels: SkillLevel[];
  /** Top 3-5 cues every athlete must remember */
  cues: Record<Lang, string[]>;
  /** Common mistakes — what NOT to do */
  mistakes: Record<Lang, string[]>;
  /** Muscles primarily worked */
  muscles: Record<Lang, string[]>;
  /** Frequency per week */
  frequency: Record<Lang, string>;
  /** Bonus: scientific tip / mindset cue */
  proTip: Record<Lang, string>;
}

/* ═══════════════════════════════════════════════════════════════════
 *  THE ATLAS
 * ═══════════════════════════════════════════════════════════════════ */

export const CALISTHENICS_ATLAS: CalisthenicsSkill[] = [
  /* ─────────── PUSH ─────────── */
  {
    key: 'pushup',
    category: 'push',
    color: '#ef4444',
    difficulty: 2,
    estimatedMonths: 2,
    emoji: '💪',
    name: { ar: 'تمرين الضغط (Push-Up)', de: 'Liegestütz' },
    description: {
      ar: 'الأساس المطلق لكل تدريب الجسم العلوي. يعمل على الصدر والترايسبس والأكتاف الأمامية والجذع. اتقانه شرط لأي مهارة أعلى.',
      de: 'Die absolute Basis jedes Oberkörper-Trainings. Trainiert Brust, Trizeps, vordere Schultern und Rumpf — Voraussetzung für jede höhere Skill.',
    },
    prerequisites: [
      { key: 'plank', min: { ar: '60 ثانية ثبات', de: '60 s Hold' } },
    ],
    levels: [
      {
        name: { ar: 'ضغط على الحائط', de: 'Wand-Liegestütz' },
        description: {
          ar: 'قف بزاوية 45° من الحائط، اخفض جذعك للأمام مع شد البطن.',
          de: 'Stehe schräg zur Wand, senke den Oberkörper kontrolliert ab.',
        },
        prescription: { ar: '3 × 15 تكرار', de: '3 × 15 Wdh.' },
        progressCriteria: { ar: 'حين يصبح 20 تكرار سهلاً', de: 'Sobald 20 Wdh. leicht sind' },
      },
      {
        name: { ar: 'ضغط مرتفع', de: 'Erhöhter Liegestütz' },
        description: {
          ar: 'يداك على طاولة أو مقعد. الجسم خط مستقيم من الكعب للرأس.',
          de: 'Hände auf Tisch/Bank. Körper bildet eine gerade Linie.',
        },
        prescription: { ar: '3 × 12 تكرار', de: '3 × 12 Wdh.' },
        progressCriteria: { ar: '15 تكرار نظيف', de: '15 saubere Wdh.' },
      },
      {
        name: { ar: 'ضغط على الركبة', de: 'Knie-Liegestütz' },
        description: {
          ar: 'الركبتان على الأرض، خط مستقيم من الركبة للرأس.',
          de: 'Knie am Boden, gerade Linie von Knie zu Kopf.',
        },
        prescription: { ar: '3 × 12 تكرار', de: '3 × 12 Wdh.' },
        progressCriteria: { ar: '15 تكرار جيد', de: '15 gute Wdh.' },
      },
      {
        name: { ar: 'ضغط قياسي', de: 'Standard-Liegestütz' },
        description: {
          ar: 'الجسم لوح. اخفض الصدر حتى لمس الأرض. ابدأ من 1.',
          de: 'Körper als Brett. Brust bis zum Boden.',
        },
        prescription: { ar: '4 × 10 تكرار', de: '4 × 10 Wdh.' },
        progressCriteria: { ar: '15 تكرار متتابع', de: '15 saubere Wdh. am Stück' },
      },
      {
        name: { ar: 'ضغط الماس', de: 'Diamant-Liegestütz' },
        description: {
          ar: 'الإبهامان والسبابة يشكلان ماسة تحت الصدر — يستهدف الترايسبس بشدة.',
          de: 'Daumen + Zeigefinger formen eine Raute — extremes Trizeps-Training.',
        },
        prescription: { ar: '3 × 10 تكرار', de: '3 × 10 Wdh.' },
        progressCriteria: { ar: '12 تكرار', de: '12 Wdh.' },
      },
      {
        name: { ar: 'ضغط الرامي', de: 'Archer Push-up' },
        description: {
          ar: 'انخفض على ذراع واحدة بينما الأخرى ممتدة جانباً.',
          de: 'Senke dich auf einen Arm, der andere bleibt seitlich gestreckt.',
        },
        prescription: { ar: '3 × 6 لكل ذراع', de: '3 × 6 pro Seite' },
        progressCriteria: { ar: '8 لكل ذراع', de: '8 pro Seite' },
      },
      {
        name: { ar: 'ضغط بيد واحدة', de: 'Einarmiger Liegestütz' },
        description: {
          ar: 'فتحة قدمين عريضة، ذراع للجانب، تحكم تام بالجذع.',
          de: 'Breiter Stand, ein Arm seitlich, totale Rumpfkontrolle.',
        },
        prescription: { ar: '4 × 5 لكل ذراع', de: '4 × 5 pro Seite' },
        progressCriteria: { ar: 'إتقان كامل', de: 'Vollendet' },
      },
    ],
    cues: {
      ar: [
        'شد البطن والأرداف — الجسم لوح واحد',
        'الكتف بعيد عن الأذن (لوحا الكتف للأسفل والخلف)',
        'الكوع بزاوية 45° من الجذع لا 90°',
        'انفجر صعوداً، وتحكم نزولاً (3 ثوانٍ)',
      ],
      de: [
        'Bauch + Po anspannen — Körper als ein Brett',
        'Schultern weg von den Ohren (Schulterblätter zurück)',
        'Ellbogen 45° zum Rumpf — nicht 90°',
        'Explosiv hoch, kontrolliert runter (3 s)',
      ],
    },
    mistakes: {
      ar: [
        'تدلي الورك أو رفعه عالياً',
        'الكوع 90° يضغط الكتف',
        'عدم اللمس الكامل للأرض',
        'حبس النفس — تنفس مع كل تكرار',
      ],
      de: [
        'Hüfte hängt durch oder ist zu hoch',
        '90°-Ellbogen belastet die Schulter',
        'Brust berührt nicht den Boden',
        'Luft anhalten — atme bei jeder Wdh.',
      ],
    },
    muscles: {
      ar: ['صدر', 'ترايسبس', 'كتف أمامي', 'جذع'],
      de: ['Brust', 'Trizeps', 'vordere Schulter', 'Rumpf'],
    },
    frequency: { ar: '3-4 مرات/أسبوع', de: '3-4×/Woche' },
    proTip: {
      ar: 'الجودة قبل الكمية: 5 تكرارات مثالية أفضل من 20 تكرار سيّء. الجسم يبني العضلات من الإجهاد التحت أقصى لا الفوضى.',
      de: 'Qualität vor Quantität: 5 perfekte Wdh. > 20 schlampige. Muskeln wachsen durch kontrollierten Reiz, nicht durch Chaos.',
    },
  },

  /* ─────────── PULL ─────────── */
  {
    key: 'pullup',
    category: 'pull',
    color: '#3b82f6',
    difficulty: 4,
    estimatedMonths: 6,
    emoji: '🔝',
    name: { ar: 'العقلة (Pull-Up)', de: 'Klimmzug' },
    description: {
      ar: 'ملك تمارين الجسم العلوي. يبني الظهر العريض والبايسبس والقبضة. الفرق بين الرياضي والمتفرّج.',
      de: 'Der König des Oberkörpertrainings. Baut breiten Rücken, Bizeps und Griff — Trennlinie zwischen Athlet und Zuschauer.',
    },
    prerequisites: [
      { key: 'dead_hang', min: { ar: '30 ثانية تعليق', de: '30 s Hang' } },
      { key: 'inverted_row', min: { ar: '12 تكرار', de: '12 Wdh.' } },
    ],
    levels: [
      {
        name: { ar: 'تعليق ميت', de: 'Dead Hang' },
        description: {
          ar: 'تعلّق من البار بقبضة واسعة. الكتف بعيد عن الأذن.',
          de: 'Hänge an der Stange, Schultern aktiv weg von den Ohren.',
        },
        prescription: { ar: '3 × 30 ث', de: '3 × 30 s' },
        progressCriteria: { ar: 'دقيقة كاملة', de: '60 s' },
      },
      {
        name: { ar: 'سحب لوح الكتف', de: 'Scapular Pulls' },
        description: {
          ar: 'من تعليق ميت، اسحب لوحَي الكتف للأسفل دون ثني الكوع.',
          de: 'Aus Dead Hang Schulterblätter nach unten ziehen, Ellbogen gestreckt.',
        },
        prescription: { ar: '3 × 10', de: '3 × 10' },
        progressCriteria: { ar: '15 تكرار نظيف', de: '15 saubere Wdh.' },
      },
      {
        name: { ar: 'تجديف مقلوب', de: 'Inverted Row' },
        description: {
          ar: 'تحت بار منخفض، الجسم مستقيم، اسحب الصدر للبار.',
          de: 'Unter niedriger Stange, Körper gestreckt, Brust zur Stange.',
        },
        prescription: { ar: '4 × 10', de: '4 × 10' },
        progressCriteria: { ar: '12 تكرار افقياً', de: '12 Wdh. horizontal' },
      },
      {
        name: { ar: 'سحب بمطّاط', de: 'Band-Klimmzug' },
        description: {
          ar: 'مطّاط مقاومة حول البار يحمل قدميك أثناء السحب.',
          de: 'Widerstandsband um die Stange unterstützt deine Füße.',
        },
        prescription: { ar: '4 × 8', de: '4 × 8' },
        progressCriteria: { ar: 'مع أخفّ مطّاط', de: 'Mit dünnstem Band' },
      },
      {
        name: { ar: 'سحب سلبي', de: 'Negative Klimmzug' },
        description: {
          ar: 'اقفز فوق البار، انزل ببطء (5 ثوانٍ) حتى التعليق الكامل.',
          de: 'Springe hoch, lass dich langsam runter (5 s) bis volle Streckung.',
        },
        prescription: { ar: '4 × 5', de: '4 × 5' },
        progressCriteria: { ar: '6 ثوانٍ × 5', de: '6 s × 5' },
      },
      {
        name: { ar: 'سحب قياسي', de: 'Standard-Klimmzug' },
        description: {
          ar: 'قبضة فوق، اسحب حتى الذقن فوق البار.',
          de: 'Obergriff, ziehe bis das Kinn die Stange überragt.',
        },
        prescription: { ar: '4 × 6', de: '4 × 6' },
        progressCriteria: { ar: '10 متتابعة', de: '10 am Stück' },
      },
      {
        name: { ar: 'سحب مرجّح', de: 'Gewichteter Klimmzug' },
        description: {
          ar: 'حزام أوزان أو دمبل بين الكاحلين.',
          de: 'Gewichtsgürtel oder Kurzhantel zwischen den Knöcheln.',
        },
        prescription: { ar: '5 × 5 + 10kg', de: '5 × 5 + 10 kg' },
        progressCriteria: { ar: '+25kg × 5', de: '+25 kg × 5' },
      },
      {
        name: { ar: 'الرامي (Archer)', de: 'Archer Pull-up' },
        description: {
          ar: 'اسحب لجهة واحدة، الذراع الأخرى ممتدة جانباً.',
          de: 'Ziehe zu einer Seite, anderer Arm seitlich gestreckt.',
        },
        prescription: { ar: '3 × 5 لكل', de: '3 × 5 pro Seite' },
        progressCriteria: { ar: '6 لكل', de: '6 pro Seite' },
      },
      {
        name: { ar: 'سحب بيد واحدة', de: 'Einarmiger Klimmzug' },
        description: {
          ar: 'القمة المطلقة. تتطلب سنوات من البناء.',
          de: 'Der absolute Gipfel. Erfordert jahrelange Vorbereitung.',
        },
        prescription: { ar: '5 × 1', de: '5 × 1' },
        progressCriteria: { ar: '3 متتابعة', de: '3 am Stück' },
      },
    ],
    cues: {
      ar: [
        'ابدأ من تعليق ميت تام (تمدد كامل)',
        'فكّر "اسحب البار للأسفل"، لا "اسحب نفسي للأعلى"',
        'الكوع للأسفل والخلف، لا للجوانب',
        'لا تتأرجح — حركة نقية',
      ],
      de: [
        'Aus vollem Dead Hang starten',
        'Denke "Stange nach unten ziehen", nicht "Körper hoch"',
        'Ellbogen nach unten/hinten, nicht zur Seite',
        'Kein Schwingen — saubere Bewegung',
      ],
    },
    mistakes: {
      ar: [
        'عدم النزول للتعليق الكامل (نصف تكرار)',
        'استخدام الزخم والأرجل (Kipping)',
        'انكماش الكتف للأذن',
        'القفز قبل بناء قاعدة قوة',
      ],
      de: [
        'Nicht voll abhängen (halbe Wiederholung)',
        'Kipping / Schwung benutzen',
        'Schultern zu den Ohren ziehen',
        'Zu früh starten ohne Basis',
      ],
    },
    muscles: {
      ar: ['ظهر علوي', 'بايسبس', 'ساعد', 'جذع'],
      de: ['Lat', 'Bizeps', 'Unterarme', 'Rumpf'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', de: '2-3×/Woche' },
    proTip: {
      ar: 'إذا لم تستطع سحب واحد، استثمر 6 أسابيع في النيغاتيف والتجديف المقلوب — ستصدمك النتيجة.',
      de: 'Wenn du noch keinen kannst: 6 Wochen Negative + Rows. Die Ergebnisse werden dich überraschen.',
    },
  },

  /* ─────────── DIPS ─────────── */
  {
    key: 'dip',
    category: 'push',
    color: '#f59e0b',
    difficulty: 5,
    estimatedMonths: 4,
    emoji: '🦅',
    name: { ar: 'الديبس (Dips)', de: 'Dips' },
    description: {
      ar: 'سكوات الجسم العلوي. يبني الصدر السفلي والترايسبس والكتف الأمامي. شريان الكاليستنيكس.',
      de: 'Die Kniebeuge des Oberkörpers. Baut untere Brust, Trizeps und vordere Schulter — Adern des Calisthenics.',
    },
    prerequisites: [
      { key: 'pushup', min: { ar: '20 تكرار', de: '20 Wdh.' } },
      { key: 'support_hold', min: { ar: '30 ث ثبات أعلى', de: '30 s Stütz oben' } },
    ],
    levels: [
      {
        name: { ar: 'ثبات الدعم', de: 'Stütz-Halt' },
        description: {
          ar: 'ثبات في أعلى الديبس. ذراعان مستقيمان، أكتاف منخفضة.',
          de: 'Halt oben — gestreckte Arme, tiefe Schultern.',
        },
        prescription: { ar: '3 × 20 ث', de: '3 × 20 s' },
        progressCriteria: { ar: '45 ث', de: '45 s' },
      },
      {
        name: { ar: 'ديبس على المقعد', de: 'Bench Dips' },
        description: {
          ar: 'يداك خلفك على مقعد، انزل بالكوع 90°.',
          de: 'Hände hinter dir auf Bank, Ellbogen 90°.',
        },
        prescription: { ar: '3 × 12', de: '3 × 12' },
        progressCriteria: { ar: '20 تكرار', de: '20 Wdh.' },
      },
      {
        name: { ar: 'ديبس مساعد', de: 'Assistierte Dips' },
        description: {
          ar: 'مطّاط أو جهاز مساعد. ركّز على الشكل.',
          de: 'Mit Band oder Maschine — Fokus auf Form.',
        },
        prescription: { ar: '3 × 8', de: '3 × 8' },
        progressCriteria: { ar: 'بأخفّ مساعدة', de: 'Mit minimaler Hilfe' },
      },
      {
        name: { ar: 'ديبس قياسي', de: 'Standard Dips' },
        description: {
          ar: 'متوازي، انزل حتى الكوع 90°، ادفع للأعلى.',
          de: 'Barren, runter bis 90° Ellbogen, hoch drücken.',
        },
        prescription: { ar: '4 × 8', de: '4 × 8' },
        progressCriteria: { ar: '12 متتابعة', de: '12 am Stück' },
      },
      {
        name: { ar: 'ديبس حلقات', de: 'Ring Dips' },
        description: {
          ar: 'الحلقات تتحرك = صعوبة 3× أعلى. ثبّت الكتفين.',
          de: 'Ringe bewegen sich = 3× schwerer. Stabilisiere die Schultern.',
        },
        prescription: { ar: '4 × 6', de: '4 × 6' },
        progressCriteria: { ar: '8 نظيفة', de: '8 saubere Wdh.' },
      },
      {
        name: { ar: 'ديبس مرجّح', de: 'Gewichtete Dips' },
        description: {
          ar: 'حزام أوزان. تأكد من شكل مثالي قبل التحميل.',
          de: 'Gewichtsgürtel — perfekte Form vor Belastung.',
        },
        prescription: { ar: '5 × 5 + 15kg', de: '5 × 5 + 15 kg' },
        progressCriteria: { ar: '+30kg × 5', de: '+30 kg × 5' },
      },
      {
        name: { ar: 'ديبس كوري', de: 'Korean Dips' },
        description: {
          ar: 'يداك خلف الجسم على بار، حركة قاسية على الكتف الأمامي.',
          de: 'Hände hinter dem Körper an Stange — extrem für vordere Schulter.',
        },
        prescription: { ar: '3 × 6', de: '3 × 6' },
        progressCriteria: { ar: '8 متتابعة', de: '8 am Stück' },
      },
    ],
    cues: {
      ar: [
        'ميل الجذع للأمام قليلاً (15°) لاستهداف الصدر',
        'الكتف للأسفل والخلف دائماً',
        'انزل تماماً 90° — لا تخدع نفسك',
        'الكوع قريب من الجسم',
      ],
      de: [
        'Leichter Vorlehn (15°) für Brustfokus',
        'Schultern unten und zurück',
        'Volle 90° runtergehen — kein Schummeln',
        'Ellbogen nah am Körper',
      ],
    },
    mistakes: {
      ar: [
        'تقصير الحركة (نصف ديبس)',
        'انكماش الكتف يؤدي لإصابة',
        'تأرجح بدلاً من قوة عضلية',
        'البدء قبل بناء الكتف',
      ],
      de: [
        'Halbe Bewegung',
        'Schultern gehen hoch — Verletzungsrisiko',
        'Schwingen statt Kraft',
        'Zu früh ohne Schulterstabilität',
      ],
    },
    muscles: {
      ar: ['صدر سفلي', 'ترايسبس', 'كتف أمامي'],
      de: ['Untere Brust', 'Trizeps', 'vordere Schulter'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', de: '2-3×/Woche' },
    proTip: {
      ar: 'الديبس أكثر تطلباً للكتف من الضغط. ابنِ ثبات لوح الكتف أولاً عبر Scapular Pulls و Support Holds.',
      de: 'Dips sind schulterfordernd — baue zuerst Schulterstabilität via Scapular Pulls + Stützhalt.',
    },
  },

  /* ─────────── PISTOL SQUAT ─────────── */
  {
    key: 'pistol',
    category: 'legs',
    color: '#10b981',
    difficulty: 6,
    estimatedMonths: 5,
    emoji: '🦵',
    name: { ar: 'بستول سكوات', de: 'Pistol Squat' },
    description: {
      ar: 'سكوات بساق واحدة. يطلق قوة الأرجل والتوازن والمرونة في حركة واحدة.',
      de: 'Einbeinige Kniebeuge. Entfesselt Beinkraft, Balance und Mobilität in einer Bewegung.',
    },
    prerequisites: [
      { key: 'air_squat', min: { ar: '30 تكرار عميق', de: '30 tiefe Wdh.' } },
      { key: 'ankle_mobility', min: { ar: 'مرونة كاحل كاملة', de: 'Volle Sprunggelenk-Mobilität' } },
    ],
    levels: [
      {
        name: { ar: 'سكوات هواء عميق', de: 'Tiefe Body-Squat' },
        description: {
          ar: 'كعبان على الأرض، الورك تحت الركبة، صدر منتصب.',
          de: 'Fersen am Boden, Hüfte unter Knie, Brust aufrecht.',
        },
        prescription: { ar: '3 × 20', de: '3 × 20' },
        progressCriteria: { ar: '30 عميقة', de: '30 tief' },
      },
      {
        name: { ar: 'سكوات سلبي بستول', de: 'Negative Pistol' },
        description: {
          ar: 'انزل ببطء بساق واحدة، انهض بقدمَين.',
          de: 'Senke dich langsam einbeinig, hebe beidbeinig.',
        },
        prescription: { ar: '3 × 5 لكل', de: '3 × 5 pro Bein' },
        progressCriteria: { ar: '8 ثوانٍ نزول', de: '8 s Abstieg' },
      },
      {
        name: { ar: 'بستول مساعد بمنشفة', de: 'Pistol mit Handtuch' },
        description: {
          ar: 'منشفة معلّقة على بار تساعدك بسحب خفيف.',
          de: 'Handtuch an Stange — leichte Hilfe beim Hochkommen.',
        },
        prescription: { ar: '3 × 6', de: '3 × 6' },
        progressCriteria: { ar: 'بسحب خفيف', de: 'Mit minimalem Zug' },
      },
      {
        name: { ar: 'بستول مرتفع', de: 'Erhöhter Pistol' },
        description: {
          ar: 'القدم العاملة على ارتفاع، الساق المعلّقة تتدلى.',
          de: 'Arbeitsbein erhöht, anderes Bein hängt frei.',
        },
        prescription: { ar: '3 × 6 لكل', de: '3 × 6 pro Bein' },
        progressCriteria: { ar: '10 لكل', de: '10 pro Bein' },
      },
      {
        name: { ar: 'بستول كامل', de: 'Voller Pistol' },
        description: {
          ar: 'انزل حتى الورك بمستوى الكاحل، انهض دون استعانة.',
          de: 'Hüfte auf Knöchelhöhe, hochkommen ohne Hilfe.',
        },
        prescription: { ar: '4 × 5 لكل', de: '4 × 5 pro Bein' },
        progressCriteria: { ar: '8 نظيفة', de: '8 saubere Wdh.' },
      },
      {
        name: { ar: 'بستول مرجّح', de: 'Gewichteter Pistol' },
        description: {
          ar: 'دمبل أمام الصدر يساعد التوازن ويزيد الحمل.',
          de: 'Kurzhantel vor der Brust — Balance + zusätzlicher Reiz.',
        },
        prescription: { ar: '3 × 5 + 10kg', de: '3 × 5 + 10 kg' },
        progressCriteria: { ar: '+20kg × 5', de: '+20 kg × 5' },
      },
    ],
    cues: {
      ar: [
        'الكعب راسخ على الأرض دائماً',
        'الركبة تتبع اتجاه القدم (لا للداخل)',
        'الذراعان مرفوعتان للأمام كثقل موازن',
        'صدر منتصب، نظر للأمام',
      ],
      de: [
        'Ferse fest am Boden',
        'Knie folgt Zehenrichtung',
        'Arme nach vorn als Gegengewicht',
        'Brust aufrecht, Blick nach vorn',
      ],
    },
    mistakes: {
      ar: [
        'رفع الكعب — مرونة كاحل ناقصة',
        'الركبة للداخل (Valgus)',
        'انحناء الظهر للأمام',
        'القفز قبل سيطرة كاملة',
      ],
      de: [
        'Ferse hebt sich — Mobilitätsmangel',
        'Knie kippt nach innen',
        'Oberkörper kollabiert',
        'Zu schnell ohne Kontrolle',
      ],
    },
    muscles: {
      ar: ['كوادريسبس', 'أرداف', 'هامسترينج', 'جذع'],
      de: ['Quadrizeps', 'Glutes', 'Hamstrings', 'Rumpf'],
    },
    frequency: { ar: '2 مرات/أسبوع', de: '2×/Woche' },
    proTip: {
      ar: 'إذا لم يصعد كعبك، فالمشكلة في الكاحل لا الساق. اقضي 5 دقائق يومياً في تمديد الكاحل.',
      de: 'Wenn die Ferse nicht unten bleibt, liegt es am Sprunggelenk. Täglich 5 min Mobility.',
    },
  },

  /* ─────────── L-SIT ─────────── */
  {
    key: 'lsit',
    category: 'core',
    color: '#8b5cf6',
    difficulty: 5,
    estimatedMonths: 3,
    emoji: '🪑',
    name: { ar: 'إل-سيت (L-Sit)', de: 'L-Sit' },
    description: {
      ar: 'الجسم على شكل L. يبني جذعاً فولاذياً وكتفين قويين وقبضة حديدية في وقت واحد.',
      de: 'Körper als L. Baut stählernen Rumpf, starke Schultern und eisernen Griff zugleich.',
    },
    prerequisites: [
      { key: 'plank', min: { ar: '90 ث', de: '90 s' } },
      { key: 'compression', min: { ar: 'مرونة هامسترينج', de: 'Hamstring-Mobilität' } },
    ],
    levels: [
      {
        name: { ar: 'إل-سيت متكوّر', de: 'Tuck L-Sit' },
        description: {
          ar: 'ركبتان للصدر، يداك على الأرض، رفع جسمك.',
          de: 'Knie zur Brust, Hände am Boden, Körper anheben.',
        },
        prescription: { ar: '5 × 15 ث', de: '5 × 15 s' },
        progressCriteria: { ar: '30 ث', de: '30 s' },
      },
      {
        name: { ar: 'إل-سيت بساق واحدة', de: 'Einbeiniger L-Sit' },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
          de: 'Ein Bein gestreckt, das andere getuckt.',
        },
        prescription: { ar: '5 × 10 ث', de: '5 × 10 s' },
        progressCriteria: { ar: '20 ث لكل', de: '20 s pro Bein' },
      },
      {
        name: { ar: 'إل-سيت مفتوح', de: 'Straddle L-Sit' },
        description: {
          ar: 'ساقان ممدودتان جانباً (V).',
          de: 'Beine seitlich gestreckt (Grätsche).',
        },
        prescription: { ar: '5 × 10 ث', de: '5 × 10 s' },
        progressCriteria: { ar: '15 ث', de: '15 s' },
      },
      {
        name: { ar: 'إل-سيت كامل', de: 'Voller L-Sit' },
        description: {
          ar: 'ساقان مستقيمتان أفقياً، 90° مع الجذع.',
          de: 'Beine waagerecht gestreckt — 90° zum Körper.',
        },
        prescription: { ar: '5 × 10 ث', de: '5 × 10 s' },
        progressCriteria: { ar: '20 ث', de: '20 s' },
      },
      {
        name: { ar: 'في-سيت (V-Sit)', de: 'V-Sit' },
        description: {
          ar: 'ساقان أعلى من الورك بزاوية حادة.',
          de: 'Beine höher als Hüfte, V-Form.',
        },
        prescription: { ar: '5 × 5 ث', de: '5 × 5 s' },
        progressCriteria: { ar: '10 ث', de: '10 s' },
      },
      {
        name: { ar: 'منّا (Manna)', de: 'Manna' },
        description: {
          ar: 'الكتف فوق اليد والأرجل أعلى الرأس — مهارة جمنازية.',
          de: 'Schultern über den Händen, Beine über dem Kopf — Turnerskill.',
        },
        prescription: { ar: '5 × 3 ث', de: '5 × 3 s' },
        progressCriteria: { ar: '5 ث', de: '5 s' },
      },
    ],
    cues: {
      ar: [
        'ادفع الأرض بقوة (تنشيط الكتف)',
        'انكمش (Compression) — الورك للصدر',
        'لا تنحني للأمام — انتصب',
        'تنفس — لا تحبس النفس',
      ],
      de: [
        'Boden kräftig wegdrücken',
        'Aktive Kompression — Hüfte zur Brust',
        'Nicht nach vorne lehnen',
        'Atmen — nicht Luft anhalten',
      ],
    },
    mistakes: {
      ar: [
        'كتف منكمش للأذن',
        'ميل الجذع للخلف',
        'ركبتان منثنيتان (في الإصدار الكامل)',
        'إحساس بالألم في الرسغ — استخدم ركائز',
      ],
      de: [
        'Schulter zu hoch',
        'Oberkörper kippt nach hinten',
        'Knie gebeugt (im vollen L)',
        'Handgelenkschmerzen — nutze Parallettes',
      ],
    },
    muscles: {
      ar: ['جذع', 'كتفان', 'هامسترينج', 'كوادريسبس'],
      de: ['Rumpf', 'Schultern', 'Hamstrings', 'Quadrizeps'],
    },
    frequency: { ar: '4-5 مرات/أسبوع (تكرار)', de: '4-5×/Woche (Frequenz!)' },
    proTip: {
      ar: 'L-Sit يستجيب للتكرار العالي لا الكثافة. مارسه يومياً 5 جولات قصيرة.',
      de: 'L-Sit reagiert auf Frequenz, nicht Intensität. Täglich 5 kurze Sätze.',
    },
  },

  /* ─────────── HANDSTAND ─────────── */
  {
    key: 'handstand',
    category: 'static',
    color: '#ec4899',
    difficulty: 7,
    estimatedMonths: 9,
    emoji: '🤸',
    name: { ar: 'الوقوف على اليدين', de: 'Handstand' },
    description: {
      ar: 'انقلاب على ذراعَين. يبني توازناً عقلياً، قوة كتف عميقة، ووعياً جسدياً نادراً.',
      de: 'Kopfüber auf den Armen. Baut mentale Balance, tiefe Schulterkraft und seltenes Körperbewusstsein.',
    },
    prerequisites: [
      { key: 'pike_pushup', min: { ar: '10 تكرار', de: '10 Wdh.' } },
      { key: 'shoulder_mobility', min: { ar: 'مرونة كتف كاملة', de: 'Volle Schulterflexion' } },
    ],
    levels: [
      {
        name: { ar: 'وقوف يدين على الحائط (وجه للحائط)', de: 'Wand-HS (Brust an Wand)' },
        description: {
          ar: 'الصدر يلمس الحائط، الأنف لاصق. الأكتاف فوق اليدين.',
          de: 'Brust zur Wand, Nase berührt fast die Wand.',
        },
        prescription: { ar: '5 × 30 ث', de: '5 × 30 s' },
        progressCriteria: { ar: 'دقيقة كاملة', de: '60 s' },
      },
      {
        name: { ar: 'وقوف يدين على الحائط (ظهر للحائط)', de: 'Wand-HS (Rücken an Wand)' },
        description: {
          ar: 'ابدأ بطرد الصدر عن الحائط — اشعر بالتوازن.',
          de: 'Schiebe Brust von der Wand weg — finde Balance.',
        },
        prescription: { ar: '5 × 30 ث', de: '5 × 30 s' },
        progressCriteria: { ar: 'لمسة بعصبية', de: 'Nur leichter Wand-Touch' },
      },
      {
        name: { ar: 'القفز للوقوف على اليدين', de: 'Kick-Up' },
        description: {
          ar: 'تعلّم رفع نفسك بدفعة معتدلة لا انفجارية.',
          de: 'Hochsteigen mit kontrolliertem Kick, nicht explosiv.',
        },
        prescription: { ar: '20 محاولة', de: '20 Versuche' },
        progressCriteria: { ar: 'تثبيت 5 ث متكرر', de: '5 s freistehend' },
      },
      {
        name: { ar: 'وقوف حر', de: 'Freier Handstand' },
        description: {
          ar: 'بلا حائط. لمسات كتف صغيرة لتعديل الميزان.',
          de: 'Ohne Wand — kleine Schulteranpassungen für Balance.',
        },
        prescription: { ar: '10 × 10 ث', de: '10 × 10 s' },
        progressCriteria: { ar: '30 ث ثبات', de: '30 s frei' },
      },
      {
        name: { ar: 'مشي على اليدين', de: 'Handstand-Walk' },
        description: {
          ar: 'حرك يداً عن يد. السر: الاتجاه قبل الأقدام.',
          de: 'Hand vor Hand. Geheimnis: Richtung vor Bewegung.',
        },
        prescription: { ar: '5 × 10 خطوات', de: '5 × 10 Schritte' },
        progressCriteria: { ar: '10 متر', de: '10 m' },
      },
      {
        name: { ar: 'ضغط وقوف على اليدين', de: 'Handstand Push-up' },
        description: {
          ar: 'انزل برأسك للأرض، ادفع للأعلى. القوة المطلقة.',
          de: 'Kopf zum Boden, hochdrücken. Absolute Schulterkraft.',
        },
        prescription: { ar: '5 × 5', de: '5 × 5' },
        progressCriteria: { ar: '8 متتابعة حرة', de: '8 freistehend' },
      },
    ],
    cues: {
      ar: [
        'الكتف فوق اليد فوق الورك — خط مستقيم',
        'الأصابع منفرجة، اضغط الأرض كالمخالب',
        'انظر بين يديك (لا للأمام)',
        'تنفس — هذه ليست عقوبة',
      ],
      de: [
        'Schulter über Hand über Hüfte — gerade Linie',
        'Finger gespreizt, drücke wie Krallen',
        'Blick zwischen die Hände',
        'Atmen — das ist keine Strafe',
      ],
    },
    mistakes: {
      ar: [
        'تقوّس الظهر (الموز Banana)',
        'كتف مفتوح ناقصاً',
        'النظر للأمام يخل بالتوازن',
        'القفز بقوة فائقة',
      ],
      de: [
        'Hohlkreuz (Banana-HS)',
        'Schulter nicht voll geöffnet',
        'Blick nach vorne stört Balance',
        'Zu kraftvoller Kick-up',
      ],
    },
    muscles: {
      ar: ['أكتاف', 'جذع', 'ساعد', 'تربس'],
      de: ['Schultern', 'Rumpf', 'Unterarme', 'Trapezius'],
    },
    frequency: { ar: '5-7 مرات/أسبوع (يومياً!)', de: '5-7×/Woche (täglich!)' },
    proTip: {
      ar: 'تدرّب يومياً 5-10 دقائق قصيرة. الجهاز العصبي يحتاج تكراراً، لا إجهاداً.',
      de: 'Täglich 5-10 min — das Nervensystem braucht Frequenz, nicht Erschöpfung.',
    },
  },

  /* ─────────── FRONT LEVER ─────────── */
  {
    key: 'frontLever',
    category: 'static',
    color: '#06b6d4',
    difficulty: 8,
    estimatedMonths: 12,
    emoji: '🪂',
    name: { ar: 'فرنت ليفر (Front Lever)', de: 'Front Lever' },
    description: {
      ar: 'الجسم أفقي مع الأرض، معلّق من بار. مهارة جمنازية تختبر القوة المطلقة للظهر والجذع.',
      de: 'Körper waagerecht zum Boden, hängend an Stange. Turnerskill — testet Rücken- und Rumpfkraft.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '12 تكرار', de: '12 Wdh.' } },
      { key: 'tuck_lever', min: { ar: '20 ث', de: '20 s' } },
    ],
    levels: [
      {
        name: { ar: 'تكوّر فرنت ليفر', de: 'Tuck Front Lever' },
        description: {
          ar: 'ركبتان للصدر، الظهر أفقي.',
          de: 'Knie zur Brust, Rücken waagerecht.',
        },
        prescription: { ar: '5 × 15 ث', de: '5 × 15 s' },
        progressCriteria: { ar: '30 ث', de: '30 s' },
      },
      {
        name: { ar: 'تكوّر متقدّم', de: 'Adv. Tuck Front Lever' },
        description: {
          ar: 'الورك مفتوح أكثر، الفخذ موازٍ للأرض.',
          de: 'Hüfte offener, Oberschenkel parallel.',
        },
        prescription: { ar: '5 × 12 ث', de: '5 × 12 s' },
        progressCriteria: { ar: '20 ث', de: '20 s' },
      },
      {
        name: { ar: 'فرنت ليفر بساق واحدة', de: 'Einbeiniger Front Lever' },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
          de: 'Ein Bein gestreckt, anderes getuckt.',
        },
        prescription: { ar: '5 × 8 ث لكل', de: '5 × 8 s pro Bein' },
        progressCriteria: { ar: '15 ث', de: '15 s' },
      },
      {
        name: { ar: 'فرنت ليفر مفتوح', de: 'Straddle Front Lever' },
        description: {
          ar: 'ساقان ممدودتان جانباً (يسهّل الذراع الطويلة).',
          de: 'Beine in Grätsche (vereinfacht den Hebel).',
        },
        prescription: { ar: '5 × 8 ث', de: '5 × 8 s' },
        progressCriteria: { ar: '12 ث', de: '12 s' },
      },
      {
        name: { ar: 'فرنت ليفر كامل', de: 'Voller Front Lever' },
        description: {
          ar: 'الجسم لوح، أفقي تماماً.',
          de: 'Körper als Brett, perfekt waagerecht.',
        },
        prescription: { ar: '5 × 5 ث', de: '5 × 5 s' },
        progressCriteria: { ar: '10 ث', de: '10 s' },
      },
      {
        name: { ar: 'سحب فرنت ليفر', de: 'Front Lever Pull-Up' },
        description: {
          ar: 'ابدأ من فرنت ليفر، اسحب الجسم للبار. ملك الكاليستنيكس.',
          de: 'Aus FL den Körper zur Stange ziehen — der König.',
        },
        prescription: { ar: '5 × 3', de: '5 × 3' },
        progressCriteria: { ar: '5 متتابعة', de: '5 am Stück' },
      },
    ],
    cues: {
      ar: [
        'انكماش (Hollow Body) — حوض للأمام',
        'لوحا الكتف للأسفل والخلف',
        'ذراعان مستقيمتان (لا تثني الكوع)',
        'قاوم الجاذبية بالظهر، لا البطن',
      ],
      de: [
        'Hollow Body — Becken nach vorn',
        'Schulterblätter unten und zurück',
        'Arme gestreckt — nicht beugen',
        'Widerstand kommt vom Rücken',
      ],
    },
    mistakes: {
      ar: [
        'تقوّس الظهر (سيفقدك الفائدة)',
        'كوع منثني — حركة مزيفة',
        'ورك منخفض جداً (الورك على مستوى الكتف)',
        'القفز قبل قاعدة سحب قوية',
      ],
      de: [
        'Hohlkreuz statt Hollow',
        'Gebeugte Ellbogen',
        'Hüfte hängt zu tief',
        'Zu früh ohne starke Pull-up Basis',
      ],
    },
    muscles: {
      ar: ['ظهر', 'بطن', 'فخذ خلفي', 'لاتس'],
      de: ['Rücken', 'Bauch', 'Hamstrings', 'Lats'],
    },
    frequency: { ar: '3 مرات/أسبوع', de: '3×/Woche' },
    proTip: {
      ar: 'فرنت ليفر اختبار للجذع لا الظهر فقط. اقضِ 3 أشهر في تثبيت Hollow Hold قبل البدء.',
      de: 'FL testet vor allem den Rumpf. 3 Monate Hollow Hold vor dem Einstieg.',
    },
  },

  /* ─────────── PLANCHE ─────────── */
  {
    key: 'planche',
    category: 'static',
    color: '#f97316',
    difficulty: 10,
    estimatedMonths: 24,
    emoji: '🦅',
    name: { ar: 'البلانش (Planche)', de: 'Planche' },
    description: {
      ar: 'الجسم أفقي مع الأرض، محمول على الذراعين فقط. أصعب مهارة كاليستنيكس وأكثرها إثارة للإعجاب.',
      de: 'Körper waagerecht, nur auf den Armen gestützt. Die schwerste Calisthenics-Skill — pure Magie.',
    },
    prerequisites: [
      { key: 'pseudo_planche', min: { ar: '10 تكرار', de: '10 Wdh.' } },
      { key: 'wrist_strength', min: { ar: 'إعداد رسغ يومي', de: 'Tägliche Handgelenk-Vorb.' } },
    ],
    levels: [
      {
        name: { ar: 'انحناء الكتف للأمام', de: 'Planche Lean' },
        description: {
          ar: 'بوضع البلانك، اميل بالأكتاف للأمام بأقصى زاوية.',
          de: 'Aus Plank, Schultern maximal nach vorne neigen.',
        },
        prescription: { ar: '5 × 30 ث', de: '5 × 30 s' },
        progressCriteria: { ar: 'الكتف فوق الأصابع', de: 'Schulter über Fingern' },
      },
      {
        name: { ar: 'ضغط بلانش وهمي', de: 'Pseudo Planche Push-up' },
        description: {
          ar: 'يدان منخفضتان (مستوى الورك)، ميلان شديد للأمام.',
          de: 'Hände auf Hüfthöhe, extremer Vorlehn.',
        },
        prescription: { ar: '4 × 8', de: '4 × 8' },
        progressCriteria: { ar: '12 تكرار', de: '12 Wdh.' },
      },
      {
        name: { ar: 'تكوّر بلانش', de: 'Tuck Planche' },
        description: {
          ar: 'ركبتان للصدر، قدمان مرفوعتان عن الأرض، حمل كامل على الذراعين.',
          de: 'Knie zur Brust, Füße vom Boden — voller Armstütz.',
        },
        prescription: { ar: '5 × 10 ث', de: '5 × 10 s' },
        progressCriteria: { ar: '20 ث', de: '20 s' },
      },
      {
        name: { ar: 'تكوّر متقدّم', de: 'Adv. Tuck Planche' },
        description: {
          ar: 'الورك مفتوح، الفخذ موازٍ.',
          de: 'Hüfte geöffnet, Oberschenkel parallel.',
        },
        prescription: { ar: '5 × 8 ث', de: '5 × 8 s' },
        progressCriteria: { ar: '15 ث', de: '15 s' },
      },
      {
        name: { ar: 'بلانش بساق واحدة', de: 'Einbeiniger Planche' },
        description: {
          ar: 'ساق ممدودة خلفاً، الأخرى متكوّرة.',
          de: 'Ein Bein gestreckt, anderes getuckt.',
        },
        prescription: { ar: '5 × 5 ث', de: '5 × 5 s' },
        progressCriteria: { ar: '10 ث لكل', de: '10 s pro Bein' },
      },
      {
        name: { ar: 'بلانش مفتوح', de: 'Straddle Planche' },
        description: {
          ar: 'ساقان مفتوحتان جانباً، أفقي تماماً.',
          de: 'Beine in Grätsche, waagerecht.',
        },
        prescription: { ar: '5 × 5 ث', de: '5 × 5 s' },
        progressCriteria: { ar: '10 ث', de: '10 s' },
      },
      {
        name: { ar: 'بلانش كامل', de: 'Full Planche' },
        description: {
          ar: 'الجسم لوح أفقي تام. ندرة تُدرَّس.',
          de: 'Körper als waagerechtes Brett — Lehrbuch-Skill.',
        },
        prescription: { ar: '5 × 3 ث', de: '5 × 3 s' },
        progressCriteria: { ar: '8 ث', de: '8 s' },
      },
    ],
    cues: {
      ar: [
        'ادفع الأرض كأنك تحاول كسرها',
        'الكتف للأمام، الأصابع للجانبين أو للأمام',
        'انكماش جذعي تام (Hollow)',
        'ابتسم — التوتر يقتل الشكل',
      ],
      de: [
        'Boden wegdrücken, als wolltest du ihn zerbrechen',
        'Schulter nach vorne, Finger zur Seite/vorne',
        'Volles Hollow Body',
        'Lächle — Spannung im Gesicht ruiniert die Form',
      ],
    },
    mistakes: {
      ar: [
        'كتف غير مدفوع للأمام كافياً',
        'الورك مرتفع (شكل V)',
        'انفجار الأكتاف للأذن',
        'إصابة الرسغ من الإهمال',
      ],
      de: [
        'Schulter nicht weit genug vorne',
        'Hüfte zu hoch (V-Form)',
        'Schultern hochgezogen',
        'Handgelenkverletzung durch Vernachlässigung',
      ],
    },
    muscles: {
      ar: ['كتف أمامي', 'صدر علوي', 'بايسبس', 'جذع', 'ساعد'],
      de: ['vordere Schulter', 'obere Brust', 'Bizeps', 'Rumpf', 'Unterarme'],
    },
    frequency: { ar: '3 مرات/أسبوع (موجات)', de: '3×/Woche (Wellen)' },
    proTip: {
      ar: 'البلانش 80% رسغ وكتف. اقضِ 5 دقائق يومياً في إعداد الرسغ — هذا يفصلك عن الإصابة.',
      de: 'Planche ist 80% Handgelenk + Schulter. Tägliche Vorbereitung schützt vor Verletzung.',
    },
  },

  /* ─────────── MUSCLE-UP ─────────── */
  {
    key: 'muscleup',
    category: 'dynamic',
    color: '#6366f1',
    difficulty: 8,
    estimatedMonths: 8,
    emoji: '🎯',
    name: { ar: 'ماصل أب (Muscle-Up)', de: 'Muscle-Up' },
    description: {
      ar: 'انتقال من تحت البار إلى فوقه في حركة واحدة. سحب + ديبس في انتقال انفجاري.',
      de: 'Übergang von unter zu über der Stange in einer Bewegung — Pull-up + Dip in einer Explosion.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '15 تكرار صدر للبار', de: '15 Brust-zur-Stange' } },
      { key: 'dip', min: { ar: '15 ديبس قياسي', de: '15 Standard-Dips' } },
    ],
    levels: [
      {
        name: { ar: 'سحب عالٍ صدر للبار', de: 'High Pull-up' },
        description: {
          ar: 'اسحب حتى يلامس الصدر السفلي البار.',
          de: 'Ziehe so hoch, dass die untere Brust die Stange berührt.',
        },
        prescription: { ar: '4 × 5', de: '4 × 5' },
        progressCriteria: { ar: 'البار للسرة', de: 'Bauchnabel-zur-Stange' },
      },
      {
        name: { ar: 'ماصل أب سلبي', de: 'Negative Muscle-up' },
        description: {
          ar: 'ابدأ فوق البار، انزل ببطء عبر الانتقال.',
          de: 'Starte oben, lasse dich langsam durch die Transition runter.',
        },
        prescription: { ar: '4 × 3', de: '4 × 3' },
        progressCriteria: { ar: '8 ثوانٍ', de: '8 s' },
      },
      {
        name: { ar: 'ماصل أب مساعد', de: 'Assistierter Muscle-up' },
        description: {
          ar: 'مطّاط أو قفزة بسيطة. ركّز على الانتقال.',
          de: 'Mit Band oder kleinem Sprung — Fokus auf Transition.',
        },
        prescription: { ar: '4 × 3', de: '4 × 3' },
        progressCriteria: { ar: 'بأخفّ مساعدة', de: 'Minimale Hilfe' },
      },
      {
        name: { ar: 'ماصل أب صارم', de: 'Strikter Muscle-up' },
        description: {
          ar: 'لا تأرجح. سحب نقي + كبّ + دفع.',
          de: 'Kein Schwung — reines Ziehen + Drehen + Drücken.',
        },
        prescription: { ar: '5 × 2', de: '5 × 2' },
        progressCriteria: { ar: '5 متتابعة', de: '5 am Stück' },
      },
      {
        name: { ar: 'ماصل أب بطيء', de: 'Slow Muscle-up' },
        description: {
          ar: 'كل مرحلة 3 ثوانٍ. سيطرة كاملة.',
          de: 'Jede Phase 3 s — volle Kontrolle.',
        },
        prescription: { ar: '4 × 1', de: '4 × 1' },
        progressCriteria: { ar: 'انتقال 5 ث', de: '5 s Transition' },
      },
      {
        name: { ar: 'ماصل أب على حلقات', de: 'Ring Muscle-up' },
        description: {
          ar: 'الحلقات أصعب 3× من البار. مهارة جمنازية.',
          de: 'Ringe sind 3× schwerer — Turner-Skill.',
        },
        prescription: { ar: '5 × 3', de: '5 × 3' },
        progressCriteria: { ar: '5 متتابعة', de: '5 am Stück' },
      },
    ],
    cues: {
      ar: [
        'ابدأ بقبضة كاذبة (Hands above bar)',
        'اسحب البار للسرّة (لا للذقن)',
        'مل برأسك للأمام عند الانتقال',
        'انفجر — السرعة شريك الجاذبية',
      ],
      de: [
        'False Grip von Anfang an',
        'Stange zum Bauchnabel ziehen',
        'Kopf bei Transition nach vorne',
        'Explosiv — Geschwindigkeit besiegt die Schwerkraft',
      ],
    },
    mistakes: {
      ar: [
        'سحب ضعيف (لا يصل للسرة)',
        'انتقال متأخر (الجسم يهبط)',
        'قبضة عادية بدل كاذبة',
        'محاولة قبل القوة الكافية',
      ],
      de: [
        'Schwacher Pull (nicht hoch genug)',
        'Späte Transition — Körper sackt ab',
        'Normaler statt False Grip',
        'Zu früh ohne genug Pull-Strength',
      ],
    },
    muscles: {
      ar: ['ظهر', 'بايسبس', 'ترايسبس', 'صدر', 'جذع'],
      de: ['Rücken', 'Bizeps', 'Trizeps', 'Brust', 'Rumpf'],
    },
    frequency: { ar: '2 مرات/أسبوع', de: '2×/Woche' },
    proTip: {
      ar: 'لا تحاول ماصل أب قبل 12 سحب نظيف صدر للبار. الجسر مكسور بدونها.',
      de: 'Kein Muscle-up vor 12 sauberen Brust-zur-Stange. Sonst fehlt das Fundament.',
    },
  },

  /* ─────────── HUMAN FLAG ─────────── */
  {
    key: 'humanflag',
    category: 'static',
    color: '#dc2626',
    difficulty: 9,
    estimatedMonths: 14,
    emoji: '🚩',
    name: { ar: 'العلم البشري (Human Flag)', de: 'Human Flag' },
    description: {
      ar: 'الجسم أفقي على عمود رأسي. مهارة جانبية تتطلب جذعاً جانبياً وحشياً وقوة كتف.',
      de: 'Körper waagerecht an vertikaler Stange — laterale Skill, fordert seitlichen Rumpf + Schulter.',
    },
    prerequisites: [
      { key: 'side_plank', min: { ar: '60 ث', de: '60 s' } },
      { key: 'pullup', min: { ar: '10 تكرار', de: '10 Wdh.' } },
    ],
    levels: [
      {
        name: { ar: 'تكوّر العلم', de: 'Tuck Flag' },
        description: {
          ar: 'ركبتان للصدر، الجسم جانبي.',
          de: 'Knie zur Brust, Körper seitlich.',
        },
        prescription: { ar: '5 × 8 ث', de: '5 × 8 s' },
        progressCriteria: { ar: '15 ث', de: '15 s' },
      },
      {
        name: { ar: 'علم بساق واحدة', de: 'Einbeinige Flag' },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
          de: 'Ein Bein gestreckt, anderes getuckt.',
        },
        prescription: { ar: '5 × 5 ث', de: '5 × 5 s' },
        progressCriteria: { ar: '10 ث لكل', de: '10 s pro Bein' },
      },
      {
        name: { ar: 'علم مفتوح', de: 'Straddle Flag' },
        description: {
          ar: 'ساقان مفتوحتان جانباً.',
          de: 'Beine in Grätsche.',
        },
        prescription: { ar: '5 × 5 ث', de: '5 × 5 s' },
        progressCriteria: { ar: '10 ث', de: '10 s' },
      },
      {
        name: { ar: 'علم بشري كامل', de: 'Full Human Flag' },
        description: {
          ar: 'الجسم لوح أفقي تام جانب العمود.',
          de: 'Körper als waagerechtes Brett seitlich.',
        },
        prescription: { ar: '5 × 5 ث', de: '5 × 5 s' },
        progressCriteria: { ar: '10 ث', de: '10 s' },
      },
    ],
    cues: {
      ar: [
        'اليد العليا تسحب، السفلى تدفع',
        'الكتفان مغلقان (لا تنفجران)',
        'الجذع الجانبي شغّال 100%',
        'اضغط الورك للجانب',
      ],
      de: [
        'Obere Hand zieht, untere drückt',
        'Schultern stabil',
        'Seitlicher Rumpf voll aktiv',
        'Hüfte zur Seite drücken',
      ],
    },
    mistakes: {
      ar: [
        'محاولة بدون قاعدة Side Plank',
        'ميل الجسم للخلف',
        'كتف محنية',
        'قبضة ضعيفة',
      ],
      de: [
        'Versuch ohne Side-Plank-Basis',
        'Körper kippt nach hinten',
        'Gebeugter Arm',
        'Schwacher Griff',
      ],
    },
    muscles: {
      ar: ['جذع جانبي (Obliques)', 'لاتس', 'كتفان', 'ساعد'],
      de: ['Schräger Bauch', 'Lats', 'Schultern', 'Unterarme'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', de: '2-3×/Woche' },
    proTip: {
      ar: 'العلم 70% Obliques. اقضِ شهرين في تقوية الجذع الجانبي قبل تجربة العلم.',
      de: '70% schräger Bauch. 2 Monate seitliche Rumpfarbeit vor dem ersten Versuch.',
    },
  },

  /* ─────────── DRAGON FLAG ─────────── */
  {
    key: 'dragonflag',
    category: 'core',
    color: '#a855f7',
    difficulty: 7,
    estimatedMonths: 6,
    emoji: '🐉',
    name: { ar: 'علم التنّين (Dragon Flag)', de: 'Dragon Flag' },
    description: {
      ar: 'تمرين بروس لي الأسطوري للجذع. الجسم لوح صلب من الكتف للقدم.',
      de: 'Bruce Lees legendäre Rumpfübung — Körper als steifes Brett von Schulter zu Fuß.',
    },
    prerequisites: [
      { key: 'hollow_hold', min: { ar: '60 ث', de: '60 s' } },
      { key: 'leg_raise', min: { ar: '15 رفع رجل معلّق', de: '15 hängende Beinheben' } },
    ],
    levels: [
      {
        name: { ar: 'تنّين متكوّر', de: 'Tuck Dragon Flag' },
        description: {
          ar: 'استلقِ على مقعد، يداك خلفك، ارفع جسمك بركبتَين متكوّرتَين.',
          de: 'Auf Bank, Hände hinterm Kopf, Körper mit getuckten Knien heben.',
        },
        prescription: { ar: '4 × 8', de: '4 × 8' },
        progressCriteria: { ar: '12 تكرار', de: '12 Wdh.' },
      },
      {
        name: { ar: 'سلبي تنّين', de: 'Negative Dragon' },
        description: {
          ar: 'ابدأ من الأعلى (مستقيم)، انزل ببطء (5 ث) للوضع الأفقي.',
          de: 'Von oben (gestreckt), langsam runter (5 s) zur Waagerechte.',
        },
        prescription: { ar: '4 × 5', de: '4 × 5' },
        progressCriteria: { ar: '8 ث نزول', de: '8 s Abstieg' },
      },
      {
        name: { ar: 'تنّين بساق واحدة', de: 'Einbeiniger Dragon' },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
          de: 'Ein Bein gestreckt, anderes getuckt.',
        },
        prescription: { ar: '4 × 5 لكل', de: '4 × 5 pro Bein' },
        progressCriteria: { ar: '8 لكل', de: '8 pro Bein' },
      },
      {
        name: { ar: 'تنّين كامل', de: 'Voller Dragon Flag' },
        description: {
          ar: 'جسم لوح صلب، يستند فقط على الكتفَين.',
          de: 'Körper als steifes Brett, nur Schultern auf der Bank.',
        },
        prescription: { ar: '4 × 5', de: '4 × 5' },
        progressCriteria: { ar: '8 متتابعة', de: '8 am Stück' },
      },
    ],
    cues: {
      ar: [
        'البطن مشدود، الأرداف مشدودة (Hollow)',
        'لا تثني الورك',
        'تنفس مع الحركة',
        'تحكّم نزول 3 ثوانٍ',
      ],
      de: [
        'Bauch + Po angespannt (Hollow)',
        'Hüfte nicht beugen',
        'Atmen während der Bewegung',
        '3 s kontrollierter Abstieg',
      ],
    },
    mistakes: {
      ar: [
        'انثناء الورك (مفصلية لا تنّين)',
        'تأرجح الجسم',
        'قفزة قبل قاعدة جذعية',
        'تحميل الرقبة',
      ],
      de: [
        'Hüfte beugt sich (kein Dragon mehr)',
        'Schwingen statt Kontrolle',
        'Zu früh ohne Rumpfbasis',
        'Belastung des Nackens',
      ],
    },
    muscles: {
      ar: ['بطن', 'هامسترينج', 'لاتس'],
      de: ['Bauch', 'Hamstrings', 'Lats'],
    },
    frequency: { ar: '3 مرات/أسبوع', de: '3×/Woche' },
    proTip: {
      ar: 'التنّين 100% انكماش (Hollow). إذا انفتح الورك = الحركة فقدت معناها.',
      de: '100% Hollow Body. Öffnet sich die Hüfte, ist die Übung sinnlos.',
    },
  },
  /* ─────────── ELITE BODYWEIGHT SKILLS (EXPANSION) ─────────── */
  {
    key: 'backlever',
    category: 'static',
    color: '#3b82f6',
    difficulty: 6,
    estimatedMonths: 6,
    emoji: '🦇',
    name: { ar: 'باك ليفر (Back Lever)', de: 'Back Lever' },
    description: {
      ar: 'تعليق أفقي للجسم بحيث يكون الوجه للأسفل والظهر للأعلى ممسكاً بالبار خلف الظهر. مهارة أساسية ومدهشة تبني قوة خارقة للكتف الخلفي والظهر السفلي والجذع.',
      de: 'Horizontales Hängen mit dem Gesicht nach unten, gehalten durch die Stange hinter dem Rücken. Eine fundamentale Kraftübung für hintere Schultern, unteren Rücken und Rumpf.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '10 تكرار نظيف', de: '10 saubere Wdh.' } },
      { key: 'skin_the_cat', min: { ar: '5 تكرارات بمدى كامل', de: '5 saubere Skin-the-Cats' } },
    ],
    levels: [
      {
        name: { ar: 'تكوّر كامل (Tuck Back Lever)', de: 'Tuck Back Lever' },
        description: {
          ar: 'اسحب ركبتيك لصدرك بالكامل مع الحفاظ على الظهر مستوياً وموازياً للأرض.',
          de: 'Knie ganz zur Brust ziehen, während der Rücken parallel zum Boden bleibt.',
        },
        prescription: { ar: '4 × 15 ثانية ثبات', de: '4 × 15 s Hold' },
        progressCriteria: { ar: 'ثبات 20 ثانية براحة', de: '20 s kontrolliert halten' },
      },
      {
        name: { ar: 'تكوّر متقدم (Advanced Tuck)', de: 'Advanced Tuck Back Lever' },
        description: {
          ar: 'افتح زاوية الفخذ لتصبح 90 درجة مع الجذع مع الحفاظ على استقامة الظهر.',
          de: 'Hüftwinkel auf 90° öffnen, während der Rücken gerade gehalten wird.',
        },
        prescription: { ar: '4 × 10 ثوانٍ ثبات', de: '4 × 10 s Hold' },
        progressCriteria: { ar: 'ثبات 15 ثانية', de: '15 s Hold' },
      },
      {
        name: { ar: 'باك ليفر بساق واحدة (Single Leg)', de: 'Einbeiniger Back Lever' },
        description: {
          ar: 'امد ساقاً واحدة للخارج تماماً واجعل الأخرى متكوّرة عند الصدر.',
          de: 'Ein Bein voll ausstrecken, das andere angewinkelt an der Brust halten.',
        },
        prescription: { ar: '4 × 8 ثوانٍ لكل ساق', de: '4 × 8 s pro Seite' },
        progressCriteria: { ar: 'ثبات 12 ثانية لكل ساق', de: '12 s pro Seite' },
      },
      {
        name: { ar: 'باك ليفر مفتوح (Straddle)', de: 'Straddle Back Lever' },
        description: {
          ar: 'افتح ساقيك على اتساعهما جانباً لتقصير طول الرافعة الميكانيكية.',
          de: 'Beine weit grätschen, um den mechanischen Hebel zu verkürzen.',
        },
        prescription: { ar: '4 × 6 ثوانٍ ثبات', de: '4 × 6 s Hold' },
        progressCriteria: { ar: 'ثبات 10 ثوانٍ نظيفة', de: '10 s sauber halten' },
      },
      {
        name: { ar: 'باك ليفر كامل (Full Back Lever)', de: 'Voller Back Lever' },
        description: {
          ar: 'افرد الساقين والجسم بالكامل لتشكيل خط أفقي مثالي موازٍ للأرض.',
          de: 'Beine und Körper vollständig strecken, um eine perfekte horizontale Linie zu bilden.',
        },
        prescription: { ar: '5 × 5 ثوانٍ ثبات', de: '5 × 5 s Hold' },
        progressCriteria: { ar: 'ثبات 10 ثوانٍ مثالية', de: '10 s perfekte Form' },
      },
    ],
    cues: {
      ar: [
        'ادفع البار للأسفل وللخلف بنشاط (Pronation)',
        'شد الأرداف والبطن تماماً لمنع تقوس الظهر السفلي',
        'اضغط لوحي الكتف للأمام وللأسفل (Protraction & Depression)',
        'اجعل نظرك متجهاً للأسفل أمامك مباشرة',
      ],
      de: [
        'Drücke die Stange aktiv nach unten und hinten (Pronation)',
        'Po und Rumpf maximal anspannen, um Hohlkreuz zu vermeiden',
        'Schulterblätter nach vorne und unten drücken (Protraction & Depression)',
        'Blick geradeaus nach unten richten',
      ],
    },
    mistakes: {
      ar: [
        'تقوس الظهر السفلي (شكل الموزة)',
        'ثني الكوعين لتسهيل الحركة',
        'ارتخاء الأكتاف للأذن مما يضغط على الأوتار',
        'عدم ضبط الجسم أفقياً بشكل حقيقي (الورك مرتفع أو منخفض جداً)',
      ],
      de: [
        'Hohlkreuz (Bananenform)',
        'Ellbogen beugen, um Hebel zu verkürzen',
        'Schultern zu den Ohren ziehen (belastet die Sehnen)',
        'Körper nicht waagerecht (Hüfte zu hoch oder zu tief)',
      ],
    },
    muscles: {
      ar: ['كتف خلفي', 'ظهر سفلي', 'مجاص (Lats)', 'جذع', 'ساعدين'],
      de: ['hintere Schulter', 'unterer Rücken', 'Lats', 'Rumpf', 'Unterarme'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', de: '2-3×/Woche' },
    proTip: {
      ar: 'مهارة الباك ليفر تضغط بشدة على أوتار الكوع الثنائية (Biceps Tendon). تأكد من الإحماء التام والتدريج الطويل جداً لتجنب التهاب الأوتار.',
      de: 'Der Back Lever belastet die Bizepssehnen enorm. Gründliches Aufwärmen und langsame Progression sind Pflicht, um Sehnenentzündungen zu vermeiden.',
    },
  },
  {
    key: 'one_arm_pullup',
    category: 'pull',
    color: '#ef4444',
    difficulty: 9,
    estimatedMonths: 15,
    emoji: '🥇',
    name: { ar: 'العقلة بذراع واحدة (One-Arm Pull-up)', de: 'Einarmiger Klimmzug' },
    description: {
      ar: 'سحب الجسم بالكامل حتى الذقن فوق البار باستخدام ذراع واحدة فقط دون أي مساعدة. تجسيد خارق لقوة السحب النسبية والتحكم في الكتف والساعد.',
      de: 'Den gesamten Körper mit nur einem Arm an der Stange hochziehen, bis das Kinn sie überragt. Ultimative relative Zugkraft und Schulterstabilität.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '20 تكرار متتالي أو سحب مرجّح بوزن +70% من وزن الجسم', de: '20 saubere Wdh. oder weighted Pull-up +70% bodyweight' } },
    ],
    levels: [
      {
        name: { ar: 'تعليق نشط بذراع واحدة (One-Arm Active Hang)', de: 'Einarmiges aktives Hängen' },
        description: {
          ar: 'تعلّق بذراع واحدة مع سحب الكتف لأسفل وللخلف بقوة لتنشيط لوح الكتف.',
          de: 'An einem Arm hängen, dabei die Schulter aktiv nach unten und hinten ziehen.',
        },
        prescription: { ar: '3 × 15 ثانية لكل ذراع', de: '3 × 15 s pro Seite' },
        progressCriteria: { ar: '30 ثانية ثبات نشط ومستقر', de: '30 s aktiver und stabiler Halt' },
      },
      {
        name: { ar: 'سحب مائل بمساعدة الذراع الأخرى', de: 'Archer Pull-ups' },
        description: {
          ar: 'اسحب نفسك لأعلى مائلاً لجهة واحدة، بينما الذراع الأخرى ممتدة على البار للمساعدة بأقل قدر.',
          de: 'Zu einer Seite hochziehen, während der andere Arm gestreckt auf der Stange leicht unterstützt.',
        },
        prescription: { ar: '4 × 5 تكرارات لكل ذراع', de: '4 × 5 Wdh. pro Seite' },
        progressCriteria: { ar: '8 تكرارات نظيفة لكل ذراع', de: '8 saubere Wdh. pro Seite' },
      },
      {
        name: { ar: 'سحب سلبي بذراع واحدة (OAP Negative)', de: 'Einarmiger negativer Klimmzug' },
        description: {
          ar: 'اقفز لأعلى العقلة بذراع واحدة، ثم انزل ببطء شديد وبشكل متحكم حتى الامتداد الكامل.',
          de: 'Mit einem Arm oben starten (Kinn über Stange) und extrem langsam und kontrolliert herablassen.',
        },
        prescription: { ar: '4 × 3 تكرارات سلبي بـ5 ثوانٍ نزول', de: '4 × 3 Negatives mit 5 s Abstieg' },
        progressCriteria: { ar: 'نزول مستمر لـ8 ثوانٍ دون هبوط مفاجئ', de: '8 s gleichmäßiger Abstieg ohne Einbrechen' },
      },
      {
        name: { ar: 'سحب بمطاط المقاومة بذراع واحدة', de: 'Band-assisted OAP' },
        description: {
          ar: 'استخدم مطاط مقاومة معلق بالبار تحت قدمك أو تحت يدك المساعدة لتخفيف الوزن.',
          de: 'Widerstandsband nutzen, das unter dem Fuß oder der unterstützenden Hand liegt.',
        },
        prescription: { ar: '4 × 4 تكرارات لكل ذراع', de: '4 × 4 Wdh. pro Seite' },
        progressCriteria: { ar: '6 تكرارات بأخف مطاط مقاومة', de: '6 Wdh. mit dünnstem Band' },
      },
      {
        name: { ar: 'عقلة كاملة بذراع واحدة (OAP)', de: 'Voller einarmiger Klimmzug' },
        description: {
          ar: 'سحب من الامتداد الكامل بذراع واحدة حتى عبور الذقن البار بشكل صارم.',
          de: 'Aus dem kompletten Hang mit einem Arm hochziehen, bis das Kinn über der Stange ist.',
        },
        prescription: { ar: '5 × 1 تكرار لكل ذراع', de: '5 × 1 Wdh. pro Seite' },
        progressCriteria: { ar: '3 تكرارات متتالية لكل ذراع', de: '3 saubere Wdh. am Stück' },
      },
    ],
    cues: {
      ar: [
        'اعصر البار بأقصى قوة ممكنة لتنشيط الجهاز العصبي (Irradiation)',
        'ابدأ الحركة من لوح الكتف أولاً ثم الكوع',
        'ابذل جهداً لجلب البار للكتف المقابل لتغيير خط الجاذبية',
        'شد عضلات بطنك وفخذيك بقوة لتقليل اهتزاز الجسم',
      ],
      de: [
        'Stange so fest wie möglich drücken (Irradiation)',
        'Bewegung aus dem Schulterblatt starten, dann erst den Ellbogen beugen',
        'Ziehe die Stange gefühlt zur gegenüberliegenden Schulter',
        'Rumpf und Beine maximal anspannen, um Schwung zu verhindern',
      ],
    },
    mistakes: {
      ar: [
        'البدء من تعليق مرتخٍ كلياً مما يعرض أوتار الكتف لتمزق',
        'استخدام الركل بالقدمين (Kipping) للتغلب على الوزن',
        'عدم إكمال المدى الحركي (عدم النزول للنهاية أو عدم عبور الذقن)',
        'إهمال الاستشفاء الكافي للأوتار والمفاصل',
      ],
      de: [
        'Aus komplett passivem Hang starten (Gefahr für Sehnen)',
        'Kipping oder Schwung aus den Beinen nutzen',
        'Unvollständige ROM (kein Dead Hang am Start oder kein Kinn über der Stange)',
        'Mangelnde Erholungszeit für Sehnen und Gelenke',
      ],
    },
    muscles: {
      ar: ['عضلات المجنص (Lats)', 'البايسبس', 'عضلة الكتف الخلفية', 'العضلة العضدية العضدية', 'الجذع والساعد'],
      de: ['Latissimus', 'Bizeps', 'hintere Schulter', 'Brachialis', 'Rumpf und Unterarm'],
    },
    frequency: { ar: '2 مرات/أسبوع لضمان تعافي الأوتار', de: '2×/Woche für maximale Sehnenerholung' },
    proTip: {
      ar: 'الأوتار تتكيف ببطء أبطأ 10 مرات من العضلات. قد تمتلك القوة العضلية لتنفيذ العقلة لكن أوتار كوعك قد تلتهب وتتضرر لشهور إن تسرّعت.',
      de: 'Sehnen passen sich 10-mal langsamer an als Muskeln. Du hast vielleicht die Muskelkraft, aber überlastete Sehnen können dich monatelang zurückwerfen.',
    },
  },
  {
    key: 'hefesto',
    category: 'dynamic',
    color: '#a855f7',
    difficulty: 10,
    estimatedMonths: 18,
    emoji: '🧗',
    name: { ar: 'هيفستو (Hefesto)', de: 'Hefesto (Back Muscle-up)' },
    description: {
      ar: 'سحب الجسم من وضع التعليق الخلفي (تحت البار واليدين خلف الظهر) والدوران لأعلى حتى الجلوس على البار. مهارة ديناميكية صعبة جداً وتتطلب قوة أوتار بايسبس استثنائية.',
      de: 'Aus dem Rückhang hinter dem Rücken an der Stange hochziehen und nach oben rotieren, bis man auf der Stange sitzt. Extrem schwerer Bizeps-Heber.',
    },
    prerequisites: [
      { key: 'backlever', min: { ar: '10 ثوانٍ ثبات كامل', de: '10 s sauberer Back Lever' } },
      { key: 'korean_dip', min: { ar: '10 تكرار نظيف', de: '10 saubere Korean Dips' } },
    ],
    levels: [
      {
        name: { ar: 'ديبس كوري ممتد (Korean Dip)', de: 'Korean Dips' },
        description: {
          ar: 'انزل خلف البار حتى يلامس الظهر السفلي البار ثم ادفع للأعلى تماماً.',
          de: 'Hinter der Stange absenken, bis der untere Rücken sie berührt, dann hochdrücken.',
        },
        prescription: { ar: '3 × 8 تكرارات', de: '3 × 8 Wdh.' },
        progressCriteria: { ar: '12 تكرار بنظافة وسهولة', de: '12 saubere Wdh. mühelos' },
      },
      {
        name: { ar: 'رفع خلفي مائل بمساعدة الأرجل', de: 'Rack-assisted Hefesto' },
        description: {
          ar: 'على بار منخفض، استخدم الأرجل على الأرض لتخفيف الحمل أثناء الدوران خلف الظهر.',
          de: 'An niedriger Stange Füße am Boden nutzen, um das Gewicht beim Eindrehen zu entlasten.',
        },
        prescription: { ar: '4 × 6 تكرارات', de: '4 × 6 Wdh.' },
        progressCriteria: { ar: '8 تكرارات نظيفة مع دفع قليل من الأرجل', de: '8 saubere Wdh. mit minimaler Beinhilfe' },
      },
      {
        name: { ar: 'هيفستو سلبي ببطء (Negative Hefesto)', de: 'Negativer Hefesto' },
        description: {
          ar: 'ابدأ بالجلوس فوق البار، انزل ببطء شديد وتحكم بالدوران للخلف حتى التعليق الكامل.',
          de: 'Auf der Stange starten, dann extrem langsam und kontrolliert nach hinten abrollen bis in den Hang.',
        },
        prescription: { ar: '4 × 3 تكرارات بـ6 ثوانٍ نزول', de: '4 × 3 Negatives mit 6 s Abstieg' },
        progressCriteria: { ar: 'نزول 8 ثوانٍ دون فقدان التحكم في أي زاوية', de: '8 s Abstieg ohne Kontrollverlust' },
      },
      {
        name: { ar: 'هيفستو بمطاط مقاومة عريض', de: 'Band-assisted Hefesto' },
        description: {
          ar: 'ثبت مطاط المقاومة على مستوى الفخذين لرفع الورك ودفع الجسم لأعلى البار.',
          de: 'Widerstandsband auf Hüfthöhe einspannen, um die Hüfte über die Stange zu katapultieren.',
        },
        prescription: { ar: '4 × 4 تكرارات', de: '4 × 4 Wdh.' },
        progressCriteria: { ar: '6 تكرارات بأخف مطاط مقاومة', de: '6 saubere Wdh. mit dünnstem Band' },
      },
      {
        name: { ar: 'هيفستو صارم كامل (Strict Hefesto)', de: 'Voller Hefesto' },
        description: {
          ar: 'من التعليق الخلفي التام، اسحب الدوران للخلف بقوة الأوتار حتى الجلوس على البار.',
          de: 'Aus dem kompletten Rückhang ohne Schwung über die Stange eindrehen und aufsitzen.',
        },
        prescription: { ar: '5 × 1 تكرار', de: '5 × 1 Wdh.' },
        progressCriteria: { ar: '3 تكرارات متتالية مثالية', de: '3 saubere Wdh. am Stück' },
      },
    ],
    cues: {
      ar: [
        'استخدم قبضة كاذبة خلفية (False Grip) مريحة وثابتة',
        'اسحب البار للوركين بنشاط تام لتقريب مركز الجاذبية',
        'أبق كوعيك قريبين جداً من جذعك ولا تسمح لهما بالتفتح جانباً',
        'احنِ رأسك وصدرك للأمام بقوة لتسريع الدوران فوق البار',
      ],
      de: [
        'Nutze einen stabilen False Grip hinter dem Rücken',
        'Stange aktiv zur Hüfte ziehen, um den Hebel zu verringern',
        'Ellbogen eng am Körper halten, nicht nach außen ausbrechen lassen',
        'Kopf und Brustkorb kräftig nach vorne neigen, um die Rotation zu unterstützen',
      ],
    },
    mistakes: {
      ar: [
        'تفتيح الكوعين للخارج مما يضعف القوة الهندسية ويسبب إصابة الكتف والرسغ',
        'إهمال القبضة الكاذبة بالكامل مما يجعل الحركة شبه مستحيلة للرسغ',
        'الاندفاع بالزخم العنيف والضرب بالورك على البار لتجاوز زاوية الصعوبة',
        'تمرين المهارة بأكتاف مجهدة أو أوتار كوع غير معافاة',
      ],
      de: [
        'Ellbogen nach außen drehen (schädigt Schulter und Handgelenk)',
        'False Grip vernachlässigen (macht das Eindrehen unmöglich)',
        'Mit extremem Schwung arbeiten und an die Stange schlagen',
        'Training mit ermüdeten Schultern oder entzündeten Sehnen',
      ],
    },
    muscles: {
      ar: ['أوتار البايسبس', 'عضلة الكتف الخلفية والأمامية', 'الساعدين وقبضة اليد', 'الجذع والظهر السفلي'],
      de: ['Bizepssehnen', 'hintere und vordere Schulter', 'Unterarme und Griff', 'Rumpf und unterer Rücken'],
    },
    frequency: { ar: '1-2 مرات/أسبوع بحد أقصى لمنع الإصابات الجسيمة', de: '1-2×/Woche maximal zur Verletzungsprävention' },
    proTip: {
      ar: 'هيفستو هي أكثر مهارة تضع ضغط تمدد أقصى تحت مقاومة على البايسبس (Eccentric Biceps Strain). لا تتدرب عليها إلا وجهازك العصبي والمفصلي في قمة نشاطه واستشفائه.',
      de: 'Der Hefesto erzeugt die höchste exzentrische Dehnungsbelastung auf den Bizeps. Nur bei absoluter Frische und maximaler Regeneration trainieren.',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
 *  CATEGORY METADATA
 * ═══════════════════════════════════════════════════════════════════ */

export const CATEGORY_LABELS: Record<SkillCategory, Record<Lang, string>> = {
  push: { ar: 'الدفع', de: 'Drücken' },
  pull: { ar: 'السحب', de: 'Ziehen' },
  core: { ar: 'الجذع', de: 'Rumpf' },
  legs: { ar: 'الأرجل', de: 'Beine' },
  static: { ar: 'الثبات', de: 'Statisch' },
  dynamic: { ar: 'الديناميكي', de: 'Dynamisch' },
};

/* ═══════════════════════════════════════════════════════════════════
 *  PHILOSOPHIES — wisdom for 20-somethings starting calisthenics
 * ═══════════════════════════════════════════════════════════════════ */

export interface CaliPhilosophy {
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  emoji: string;
}

export const CALI_PHILOSOPHIES: CaliPhilosophy[] = [
  {
    emoji: '🎯',
    title: { ar: 'القوة قبل المهارة', de: 'Kraft vor Skill' },
    body: {
      ar: 'لا توجد بلانش بدون 20 ضغطاً نظيفاً. لا فرنت ليفر بدون 12 سحبة. القوة الأساسية تستغرق 1-2 سنة من العمل المنضبط — هذا الاستثمار سيُعفيك من 90% من الإصابات لاحقاً.',
      de: 'Kein Planche ohne 20 saubere Liegestütze. Kein Front Lever ohne 12 Klimmzüge. Grundkraft braucht 1-2 Jahre — diese Investition erspart dir 90% aller Verletzungen später.',
    },
  },
  {
    emoji: '⏰',
    title: { ar: 'الجهاز العصبي يحتاج تكراراً', de: 'Das Nervensystem braucht Frequenz' },
    body: {
      ar: 'المهارات الثابتة (وقوف يدين، L-Sit) تتعلّمها بالتكرار اليومي القصير، لا بجلسة طويلة أسبوعياً. 7 جلسات × 5 دقائق > 1 جلسة × 35 دقيقة.',
      de: 'Statische Skills (Handstand, L-Sit) lernst du durch tägliche Kurz-Sessions, nicht durch Wochen-Marathons. 7 × 5 min schlägt 1 × 35 min.',
    },
  },
  {
    emoji: '🧠',
    title: { ar: 'الإصابة عدوّ التقدّم', de: 'Verletzung tötet Fortschritt' },
    body: {
      ar: 'أسبوعان إصابة = 6 أشهر تأخير في مهارات النخبة. اتباع التدرّج، الإحماء الكافي، إعداد الرسغ والكتف ليس اختيارياً.',
      de: '2 Wochen Verletzung = 6 Monate Rückstand bei Elite-Skills. Progression, Aufwärmen, Handgelenks-Vorbereitung sind keine Option.',
    },
  },
  {
    emoji: '🥩',
    title: { ar: 'البروتين والنوم > كل المكمّلات', de: 'Protein + Schlaf > jedes Supplement' },
    body: {
      ar: '1.6-2.2 جم بروتين/كجم وزن جسم. 7-9 ساعات نوم. هذان عاملا التعافي الحقيقيان. كل المكمّلات مكمّلة لهما، لا بديل عنهما.',
      de: '1,6-2,2 g Protein/kg KG. 7-9 h Schlaf. Das sind die echten Recovery-Faktoren. Supplements ergänzen — sie ersetzen niemals.',
    },
  },
  {
    emoji: '📅',
    title: { ar: 'العشرينات نافذة ذهبية', de: 'Die 20er sind das goldene Fenster' },
    body: {
      ar: 'التستوستيرون والـ IGF-1 وحساسية الإنسولين في ذروتها. تكيُّفك العصبي والعضلي 2-3× أسرع مما سيكون في الأربعينات. لا تضيّع هذا الوقت.',
      de: 'Testosteron, IGF-1, Insulinsensitivität auf Höchststand. Neurale Adaption ist 2-3× schneller als mit 40. Verschwende diese Zeit nicht.',
    },
  },
  {
    emoji: '🌊',
    title: { ar: 'الموجات تتغلّب على الخط المستقيم', de: 'Wellen schlagen Geradlinigkeit' },
    body: {
      ar: 'لا يستطيع جسمك التحسّن خطياً للأبد. خطّط دورات: 4 أسابيع كثيفة، أسبوع تخفيف. هذا ليس كسلاً، هذا علم.',
      de: 'Dein Körper kann nicht ewig linear besser werden. 4 intensive Wochen + 1 Deload. Das ist keine Faulheit, das ist Wissenschaft.',
    },
  },
];
