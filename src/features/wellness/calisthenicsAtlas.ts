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

export type Lang = 'ar';

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
    name: { ar: 'تمرين الضغط (Push-Up)', },
    description: {
      ar: 'الأساس المطلق لكل تدريب الجسم العلوي. يعمل على الصدر والترايسبس والأكتاف الأمامية والجذع. اتقانه شرط لأي مهارة أعلى.',
    },
    prerequisites: [
      { key: 'plank', min: { ar: '60 ثانية ثبات', } },
    ],
    levels: [
      {
        name: { ar: 'ضغط على الحائط', },
        description: {
          ar: 'قف بزاوية 45° من الحائط، اخفض جذعك للأمام مع شد البطن.',
        },
        prescription: { ar: '3 × 15 تكرار', },
        progressCriteria: { ar: 'حين يصبح 20 تكرار سهلاً', },
      },
      {
        name: { ar: 'ضغط مرتفع', },
        description: {
          ar: 'يداك على طاولة أو مقعد. الجسم خط مستقيم من الكعب للرأس.',
        },
        prescription: { ar: '3 × 12 تكرار', },
        progressCriteria: { ar: '15 تكرار نظيف', },
      },
      {
        name: { ar: 'ضغط على الركبة', },
        description: {
          ar: 'الركبتان على الأرض، خط مستقيم من الركبة للرأس.',
        },
        prescription: { ar: '3 × 12 تكرار', },
        progressCriteria: { ar: '15 تكرار جيد', },
      },
      {
        name: { ar: 'ضغط قياسي', },
        description: {
          ar: 'الجسم لوح. اخفض الصدر حتى لمس الأرض. ابدأ من 1.',
        },
        prescription: { ar: '4 × 10 تكرار', },
        progressCriteria: { ar: '15 تكرار متتابع', },
      },
      {
        name: { ar: 'ضغط الماس', },
        description: {
          ar: 'الإبهامان والسبابة يشكلان ماسة تحت الصدر — يستهدف الترايسبس بشدة.',
        },
        prescription: { ar: '3 × 10 تكرار', },
        progressCriteria: { ar: '12 تكرار', },
      },
      {
        name: { ar: 'ضغط الرامي', },
        description: {
          ar: 'انخفض على ذراع واحدة بينما الأخرى ممتدة جانباً.',
        },
        prescription: { ar: '3 × 6 لكل ذراع', },
        progressCriteria: { ar: '8 لكل ذراع', },
      },
      {
        name: { ar: 'ضغط بيد واحدة', },
        description: {
          ar: 'فتحة قدمين عريضة، ذراع للجانب، تحكم تام بالجذع.',
        },
        prescription: { ar: '4 × 5 لكل ذراع', },
        progressCriteria: { ar: 'إتقان كامل', },
      },
    ],
    cues: {
      ar: [
        'شد البطن والأرداف — الجسم لوح واحد',
        'الكتف بعيد عن الأذن (لوحا الكتف للأسفل والخلف)',
        'الكوع بزاوية 45° من الجذع لا 90°',
        'انفجر صعوداً، وتحكم نزولاً (3 ثوانٍ)',
      ],
    },
    mistakes: {
      ar: [
        'تدلي الورك أو رفعه عالياً',
        'الكوع 90° يضغط الكتف',
        'عدم اللمس الكامل للأرض',
        'حبس النفس — تنفس مع كل تكرار',
      ],
    },
    muscles: {
      ar: ['صدر', 'ترايسبس', 'كتف أمامي', 'جذع'],
    },
    frequency: { ar: '3-4 مرات/أسبوع', },
    proTip: {
      ar: 'الجودة قبل الكمية: 5 تكرارات مثالية أفضل من 20 تكرار سيّء. الجسم يبني العضلات من الإجهاد التحت أقصى لا الفوضى.',
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
    name: { ar: 'العقلة (Pull-Up)', },
    description: {
      ar: 'ملك تمارين الجسم العلوي. يبني الظهر العريض والبايسبس والقبضة. الفرق بين الرياضي والمتفرّج.',
    },
    prerequisites: [
      { key: 'dead_hang', min: { ar: '30 ثانية تعليق', } },
      { key: 'inverted_row', min: { ar: '12 تكرار', } },
    ],
    levels: [
      {
        name: { ar: 'تعليق ميت', },
        description: {
          ar: 'تعلّق من البار بقبضة واسعة. الكتف بعيد عن الأذن.',
        },
        prescription: { ar: '3 × 30 ث', },
        progressCriteria: { ar: 'دقيقة كاملة', },
      },
      {
        name: { ar: 'سحب لوح الكتف', },
        description: {
          ar: 'من تعليق ميت، اسحب لوحَي الكتف للأسفل دون ثني الكوع.',
        },
        prescription: { ar: '3 × 10', },
        progressCriteria: { ar: '15 تكرار نظيف', },
      },
      {
        name: { ar: 'تجديف مقلوب', },
        description: {
          ar: 'تحت بار منخفض، الجسم مستقيم، اسحب الصدر للبار.',
        },
        prescription: { ar: '4 × 10', },
        progressCriteria: { ar: '12 تكرار افقياً', },
      },
      {
        name: { ar: 'سحب بمطّاط', },
        description: {
          ar: 'مطّاط مقاومة حول البار يحمل قدميك أثناء السحب.',
        },
        prescription: { ar: '4 × 8', },
        progressCriteria: { ar: 'مع أخفّ مطّاط', },
      },
      {
        name: { ar: 'سحب سلبي', },
        description: {
          ar: 'اقفز فوق البار، انزل ببطء (5 ثوانٍ) حتى التعليق الكامل.',
        },
        prescription: { ar: '4 × 5', },
        progressCriteria: { ar: '6 ثوانٍ × 5', },
      },
      {
        name: { ar: 'سحب قياسي', },
        description: {
          ar: 'قبضة فوق، اسحب حتى الذقن فوق البار.',
        },
        prescription: { ar: '4 × 6', },
        progressCriteria: { ar: '10 متتابعة', },
      },
      {
        name: { ar: 'سحب مرجّح', },
        description: {
          ar: 'حزام أوزان أو دمبل بين الكاحلين.',
        },
        prescription: { ar: '5 × 5 + 10kg', },
        progressCriteria: { ar: '+25kg × 5', },
      },
      {
        name: { ar: 'الرامي (Archer)', },
        description: {
          ar: 'اسحب لجهة واحدة، الذراع الأخرى ممتدة جانباً.',
        },
        prescription: { ar: '3 × 5 لكل', },
        progressCriteria: { ar: '6 لكل', },
      },
      {
        name: { ar: 'سحب بيد واحدة', },
        description: {
          ar: 'القمة المطلقة. تتطلب سنوات من البناء.',
        },
        prescription: { ar: '5 × 1', },
        progressCriteria: { ar: '3 متتابعة', },
      },
    ],
    cues: {
      ar: [
        'ابدأ من تعليق ميت تام (تمدد كامل)',
        'فكّر "اسحب البار للأسفل"، لا "اسحب نفسي للأعلى"',
        'الكوع للأسفل والخلف، لا للجوانب',
        'لا تتأرجح — حركة نقية',
      ],
    },
    mistakes: {
      ar: [
        'عدم النزول للتعليق الكامل (نصف تكرار)',
        'استخدام الزخم والأرجل (Kipping)',
        'انكماش الكتف للأذن',
        'القفز قبل بناء قاعدة قوة',
      ],
    },
    muscles: {
      ar: ['ظهر علوي', 'بايسبس', 'ساعد', 'جذع'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', },
    proTip: {
      ar: 'إذا لم تستطع سحب واحد، استثمر 6 أسابيع في النيغاتيف والتجديف المقلوب — ستصدمك النتيجة.',
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
    name: { ar: 'الديبس (Dips)', },
    description: {
      ar: 'سكوات الجسم العلوي. يبني الصدر السفلي والترايسبس والكتف الأمامي. شريان الكاليستنيكس.',
    },
    prerequisites: [
      { key: 'pushup', min: { ar: '20 تكرار', } },
      { key: 'support_hold', min: { ar: '30 ث ثبات أعلى', } },
    ],
    levels: [
      {
        name: { ar: 'ثبات الدعم', },
        description: {
          ar: 'ثبات في أعلى الديبس. ذراعان مستقيمان، أكتاف منخفضة.',
        },
        prescription: { ar: '3 × 20 ث', },
        progressCriteria: { ar: '45 ث', },
      },
      {
        name: { ar: 'ديبس على المقعد', },
        description: {
          ar: 'يداك خلفك على مقعد، انزل بالكوع 90°.',
        },
        prescription: { ar: '3 × 12', },
        progressCriteria: { ar: '20 تكرار', },
      },
      {
        name: { ar: 'ديبس مساعد', },
        description: {
          ar: 'مطّاط أو جهاز مساعد. ركّز على الشكل.',
        },
        prescription: { ar: '3 × 8', },
        progressCriteria: { ar: 'بأخفّ مساعدة', },
      },
      {
        name: { ar: 'ديبس قياسي', },
        description: {
          ar: 'متوازي، انزل حتى الكوع 90°، ادفع للأعلى.',
        },
        prescription: { ar: '4 × 8', },
        progressCriteria: { ar: '12 متتابعة', },
      },
      {
        name: { ar: 'ديبس حلقات', },
        description: {
          ar: 'الحلقات تتحرك = صعوبة 3× أعلى. ثبّت الكتفين.',
        },
        prescription: { ar: '4 × 6', },
        progressCriteria: { ar: '8 نظيفة', },
      },
      {
        name: { ar: 'ديبس مرجّح', },
        description: {
          ar: 'حزام أوزان. تأكد من شكل مثالي قبل التحميل.',
        },
        prescription: { ar: '5 × 5 + 15kg', },
        progressCriteria: { ar: '+30kg × 5', },
      },
      {
        name: { ar: 'ديبس كوري', },
        description: {
          ar: 'يداك خلف الجسم على بار، حركة قاسية على الكتف الأمامي.',
        },
        prescription: { ar: '3 × 6', },
        progressCriteria: { ar: '8 متتابعة', },
      },
    ],
    cues: {
      ar: [
        'ميل الجذع للأمام قليلاً (15°) لاستهداف الصدر',
        'الكتف للأسفل والخلف دائماً',
        'انزل تماماً 90° — لا تخدع نفسك',
        'الكوع قريب من الجسم',
      ],
    },
    mistakes: {
      ar: [
        'تقصير الحركة (نصف ديبس)',
        'انكماش الكتف يؤدي لإصابة',
        'تأرجح بدلاً من قوة عضلية',
        'البدء قبل بناء الكتف',
      ],
    },
    muscles: {
      ar: ['صدر سفلي', 'ترايسبس', 'كتف أمامي'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', },
    proTip: {
      ar: 'الديبس أكثر تطلباً للكتف من الضغط. ابنِ ثبات لوح الكتف أولاً عبر Scapular Pulls و Support Holds.',
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
    name: { ar: 'بستول سكوات', },
    description: {
      ar: 'سكوات بساق واحدة. يطلق قوة الأرجل والتوازن والمرونة في حركة واحدة.',
    },
    prerequisites: [
      { key: 'air_squat', min: { ar: '30 تكرار عميق', } },
      { key: 'ankle_mobility', min: { ar: 'مرونة كاحل كاملة', } },
    ],
    levels: [
      {
        name: { ar: 'سكوات هواء عميق', },
        description: {
          ar: 'كعبان على الأرض، الورك تحت الركبة، صدر منتصب.',
        },
        prescription: { ar: '3 × 20', },
        progressCriteria: { ar: '30 عميقة', },
      },
      {
        name: { ar: 'سكوات سلبي بستول', },
        description: {
          ar: 'انزل ببطء بساق واحدة، انهض بقدمَين.',
        },
        prescription: { ar: '3 × 5 لكل', },
        progressCriteria: { ar: '8 ثوانٍ نزول', },
      },
      {
        name: { ar: 'بستول مساعد بمنشفة', },
        description: {
          ar: 'منشفة معلّقة على بار تساعدك بسحب خفيف.',
        },
        prescription: { ar: '3 × 6', },
        progressCriteria: { ar: 'بسحب خفيف', },
      },
      {
        name: { ar: 'بستول مرتفع', },
        description: {
          ar: 'القدم العاملة على ارتفاع، الساق المعلّقة تتدلى.',
        },
        prescription: { ar: '3 × 6 لكل', },
        progressCriteria: { ar: '10 لكل', },
      },
      {
        name: { ar: 'بستول كامل', },
        description: {
          ar: 'انزل حتى الورك بمستوى الكاحل، انهض دون استعانة.',
        },
        prescription: { ar: '4 × 5 لكل', },
        progressCriteria: { ar: '8 نظيفة', },
      },
      {
        name: { ar: 'بستول مرجّح', },
        description: {
          ar: 'دمبل أمام الصدر يساعد التوازن ويزيد الحمل.',
        },
        prescription: { ar: '3 × 5 + 10kg', },
        progressCriteria: { ar: '+20kg × 5', },
      },
    ],
    cues: {
      ar: [
        'الكعب راسخ على الأرض دائماً',
        'الركبة تتبع اتجاه القدم (لا للداخل)',
        'الذراعان مرفوعتان للأمام كثقل موازن',
        'صدر منتصب، نظر للأمام',
      ],
    },
    mistakes: {
      ar: [
        'رفع الكعب — مرونة كاحل ناقصة',
        'الركبة للداخل (Valgus)',
        'انحناء الظهر للأمام',
        'القفز قبل سيطرة كاملة',
      ],
    },
    muscles: {
      ar: ['كوادريسبس', 'أرداف', 'هامسترينج', 'جذع'],
    },
    frequency: { ar: '2 مرات/أسبوع', },
    proTip: {
      ar: 'إذا لم يصعد كعبك، فالمشكلة في الكاحل لا الساق. اقضي 5 دقائق يومياً في تمديد الكاحل.',
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
    name: { ar: 'إل-سيت (L-Sit)', },
    description: {
      ar: 'الجسم على شكل L. يبني جذعاً فولاذياً وكتفين قويين وقبضة حديدية في وقت واحد.',
    },
    prerequisites: [
      { key: 'plank', min: { ar: '90 ث', } },
      { key: 'compression', min: { ar: 'مرونة هامسترينج', } },
    ],
    levels: [
      {
        name: { ar: 'إل-سيت متكوّر', },
        description: {
          ar: 'ركبتان للصدر، يداك على الأرض، رفع جسمك.',
        },
        prescription: { ar: '5 × 15 ث', },
        progressCriteria: { ar: '30 ث', },
      },
      {
        name: { ar: 'إل-سيت بساق واحدة', },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
        },
        prescription: { ar: '5 × 10 ث', },
        progressCriteria: { ar: '20 ث لكل', },
      },
      {
        name: { ar: 'إل-سيت مفتوح', },
        description: {
          ar: 'ساقان ممدودتان جانباً (V).',
        },
        prescription: { ar: '5 × 10 ث', },
        progressCriteria: { ar: '15 ث', },
      },
      {
        name: { ar: 'إل-سيت كامل', },
        description: {
          ar: 'ساقان مستقيمتان أفقياً، 90° مع الجذع.',
        },
        prescription: { ar: '5 × 10 ث', },
        progressCriteria: { ar: '20 ث', },
      },
      {
        name: { ar: 'في-سيت (V-Sit)', },
        description: {
          ar: 'ساقان أعلى من الورك بزاوية حادة.',
        },
        prescription: { ar: '5 × 5 ث', },
        progressCriteria: { ar: '10 ث', },
      },
      {
        name: { ar: 'منّا (Manna)', },
        description: {
          ar: 'الكتف فوق اليد والأرجل أعلى الرأس — مهارة جمنازية.',
        },
        prescription: { ar: '5 × 3 ث', },
        progressCriteria: { ar: '5 ث', },
      },
    ],
    cues: {
      ar: [
        'ادفع الأرض بقوة (تنشيط الكتف)',
        'انكمش (Compression) — الورك للصدر',
        'لا تنحني للأمام — انتصب',
        'تنفس — لا تحبس النفس',
      ],
    },
    mistakes: {
      ar: [
        'كتف منكمش للأذن',
        'ميل الجذع للخلف',
        'ركبتان منثنيتان (في الإصدار الكامل)',
        'إحساس بالألم في الرسغ — استخدم ركائز',
      ],
    },
    muscles: {
      ar: ['جذع', 'كتفان', 'هامسترينج', 'كوادريسبس'],
    },
    frequency: { ar: '4-5 مرات/أسبوع (تكرار)', },
    proTip: {
      ar: 'L-Sit يستجيب للتكرار العالي لا الكثافة. مارسه يومياً 5 جولات قصيرة.',
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
    name: { ar: 'الوقوف على اليدين', },
    description: {
      ar: 'انقلاب على ذراعَين. يبني توازناً عقلياً، قوة كتف عميقة، ووعياً جسدياً نادراً.',
    },
    prerequisites: [
      { key: 'pike_pushup', min: { ar: '10 تكرار', } },
      { key: 'shoulder_mobility', min: { ar: 'مرونة كتف كاملة', } },
    ],
    levels: [
      {
        name: { ar: 'وقوف يدين على الحائط (وجه للحائط)', },
        description: {
          ar: 'الصدر يلمس الحائط، الأنف لاصق. الأكتاف فوق اليدين.',
        },
        prescription: { ar: '5 × 30 ث', },
        progressCriteria: { ar: 'دقيقة كاملة', },
      },
      {
        name: { ar: 'وقوف يدين على الحائط (ظهر للحائط)', },
        description: {
          ar: 'ابدأ بطرد الصدر عن الحائط — اشعر بالتوازن.',
        },
        prescription: { ar: '5 × 30 ث', },
        progressCriteria: { ar: 'لمسة بعصبية', },
      },
      {
        name: { ar: 'القفز للوقوف على اليدين', },
        description: {
          ar: 'تعلّم رفع نفسك بدفعة معتدلة لا انفجارية.',
        },
        prescription: { ar: '20 محاولة', },
        progressCriteria: { ar: 'تثبيت 5 ث متكرر', },
      },
      {
        name: { ar: 'وقوف حر', },
        description: {
          ar: 'بلا حائط. لمسات كتف صغيرة لتعديل الميزان.',
        },
        prescription: { ar: '10 × 10 ث', },
        progressCriteria: { ar: '30 ث ثبات', },
      },
      {
        name: { ar: 'مشي على اليدين', },
        description: {
          ar: 'حرك يداً عن يد. السر: الاتجاه قبل الأقدام.',
        },
        prescription: { ar: '5 × 10 خطوات', },
        progressCriteria: { ar: '10 متر', },
      },
      {
        name: { ar: 'ضغط وقوف على اليدين', },
        description: {
          ar: 'انزل برأسك للأرض، ادفع للأعلى. القوة المطلقة.',
        },
        prescription: { ar: '5 × 5', },
        progressCriteria: { ar: '8 متتابعة حرة', },
      },
    ],
    cues: {
      ar: [
        'الكتف فوق اليد فوق الورك — خط مستقيم',
        'الأصابع منفرجة، اضغط الأرض كالمخالب',
        'انظر بين يديك (لا للأمام)',
        'تنفس — هذه ليست عقوبة',
      ],
    },
    mistakes: {
      ar: [
        'تقوّس الظهر (الموز Banana)',
        'كتف مفتوح ناقصاً',
        'النظر للأمام يخل بالتوازن',
        'القفز بقوة فائقة',
      ],
    },
    muscles: {
      ar: ['أكتاف', 'جذع', 'ساعد', 'تربس'],
    },
    frequency: { ar: '5-7 مرات/أسبوع (يومياً!)', },
    proTip: {
      ar: 'تدرّب يومياً 5-10 دقائق قصيرة. الجهاز العصبي يحتاج تكراراً، لا إجهاداً.',
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
    name: { ar: 'فرنت ليفر (Front Lever)', },
    description: {
      ar: 'الجسم أفقي مع الأرض، معلّق من بار. مهارة جمنازية تختبر القوة المطلقة للظهر والجذع.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '12 تكرار', } },
      { key: 'tuck_lever', min: { ar: '20 ث', } },
    ],
    levels: [
      {
        name: { ar: 'تكوّر فرنت ليفر', },
        description: {
          ar: 'ركبتان للصدر، الظهر أفقي.',
        },
        prescription: { ar: '5 × 15 ث', },
        progressCriteria: { ar: '30 ث', },
      },
      {
        name: { ar: 'تكوّر متقدّم', },
        description: {
          ar: 'الورك مفتوح أكثر، الفخذ موازٍ للأرض.',
        },
        prescription: { ar: '5 × 12 ث', },
        progressCriteria: { ar: '20 ث', },
      },
      {
        name: { ar: 'فرنت ليفر بساق واحدة', },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
        },
        prescription: { ar: '5 × 8 ث لكل', },
        progressCriteria: { ar: '15 ث', },
      },
      {
        name: { ar: 'فرنت ليفر مفتوح', },
        description: {
          ar: 'ساقان ممدودتان جانباً (يسهّل الذراع الطويلة).',
        },
        prescription: { ar: '5 × 8 ث', },
        progressCriteria: { ar: '12 ث', },
      },
      {
        name: { ar: 'فرنت ليفر كامل', },
        description: {
          ar: 'الجسم لوح، أفقي تماماً.',
        },
        prescription: { ar: '5 × 5 ث', },
        progressCriteria: { ar: '10 ث', },
      },
      {
        name: { ar: 'سحب فرنت ليفر', },
        description: {
          ar: 'ابدأ من فرنت ليفر، اسحب الجسم للبار. ملك الكاليستنيكس.',
        },
        prescription: { ar: '5 × 3', },
        progressCriteria: { ar: '5 متتابعة', },
      },
    ],
    cues: {
      ar: [
        'انكماش (Hollow Body) — حوض للأمام',
        'لوحا الكتف للأسفل والخلف',
        'ذراعان مستقيمتان (لا تثني الكوع)',
        'قاوم الجاذبية بالظهر، لا البطن',
      ],
    },
    mistakes: {
      ar: [
        'تقوّس الظهر (سيفقدك الفائدة)',
        'كوع منثني — حركة مزيفة',
        'ورك منخفض جداً (الورك على مستوى الكتف)',
        'القفز قبل قاعدة سحب قوية',
      ],
    },
    muscles: {
      ar: ['ظهر', 'بطن', 'فخذ خلفي', 'لاتس'],
    },
    frequency: { ar: '3 مرات/أسبوع', },
    proTip: {
      ar: 'فرنت ليفر اختبار للجذع لا الظهر فقط. اقضِ 3 أشهر في تثبيت Hollow Hold قبل البدء.',
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
    name: { ar: 'البلانش (Planche)', },
    description: {
      ar: 'الجسم أفقي مع الأرض، محمول على الذراعين فقط. أصعب مهارة كاليستنيكس وأكثرها إثارة للإعجاب.',
    },
    prerequisites: [
      { key: 'pseudo_planche', min: { ar: '10 تكرار', } },
      { key: 'wrist_strength', min: { ar: 'إعداد رسغ يومي', } },
    ],
    levels: [
      {
        name: { ar: 'انحناء الكتف للأمام', },
        description: {
          ar: 'بوضع البلانك، اميل بالأكتاف للأمام بأقصى زاوية.',
        },
        prescription: { ar: '5 × 30 ث', },
        progressCriteria: { ar: 'الكتف فوق الأصابع', },
      },
      {
        name: { ar: 'ضغط بلانش وهمي', },
        description: {
          ar: 'يدان منخفضتان (مستوى الورك)، ميلان شديد للأمام.',
        },
        prescription: { ar: '4 × 8', },
        progressCriteria: { ar: '12 تكرار', },
      },
      {
        name: { ar: 'تكوّر بلانش', },
        description: {
          ar: 'ركبتان للصدر، قدمان مرفوعتان عن الأرض، حمل كامل على الذراعين.',
        },
        prescription: { ar: '5 × 10 ث', },
        progressCriteria: { ar: '20 ث', },
      },
      {
        name: { ar: 'تكوّر متقدّم', },
        description: {
          ar: 'الورك مفتوح، الفخذ موازٍ.',
        },
        prescription: { ar: '5 × 8 ث', },
        progressCriteria: { ar: '15 ث', },
      },
      {
        name: { ar: 'بلانش بساق واحدة', },
        description: {
          ar: 'ساق ممدودة خلفاً، الأخرى متكوّرة.',
        },
        prescription: { ar: '5 × 5 ث', },
        progressCriteria: { ar: '10 ث لكل', },
      },
      {
        name: { ar: 'بلانش مفتوح', },
        description: {
          ar: 'ساقان مفتوحتان جانباً، أفقي تماماً.',
        },
        prescription: { ar: '5 × 5 ث', },
        progressCriteria: { ar: '10 ث', },
      },
      {
        name: { ar: 'بلانش كامل', },
        description: {
          ar: 'الجسم لوح أفقي تام. ندرة تُدرَّس.',
        },
        prescription: { ar: '5 × 3 ث', },
        progressCriteria: { ar: '8 ث', },
      },
    ],
    cues: {
      ar: [
        'ادفع الأرض كأنك تحاول كسرها',
        'الكتف للأمام، الأصابع للجانبين أو للأمام',
        'انكماش جذعي تام (Hollow)',
        'ابتسم — التوتر يقتل الشكل',
      ],
    },
    mistakes: {
      ar: [
        'كتف غير مدفوع للأمام كافياً',
        'الورك مرتفع (شكل V)',
        'انفجار الأكتاف للأذن',
        'إصابة الرسغ من الإهمال',
      ],
    },
    muscles: {
      ar: ['كتف أمامي', 'صدر علوي', 'بايسبس', 'جذع', 'ساعد'],
    },
    frequency: { ar: '3 مرات/أسبوع (موجات)', },
    proTip: {
      ar: 'البلانش 80% رسغ وكتف. اقضِ 5 دقائق يومياً في إعداد الرسغ — هذا يفصلك عن الإصابة.',
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
    name: { ar: 'ماصل أب (Muscle-Up)', },
    description: {
      ar: 'انتقال من تحت البار إلى فوقه في حركة واحدة. سحب + ديبس في انتقال انفجاري.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '15 تكرار صدر للبار', } },
      { key: 'dip', min: { ar: '15 ديبس قياسي', } },
    ],
    levels: [
      {
        name: { ar: 'سحب عالٍ صدر للبار', },
        description: {
          ar: 'اسحب حتى يلامس الصدر السفلي البار.',
        },
        prescription: { ar: '4 × 5', },
        progressCriteria: { ar: 'البار للسرة', },
      },
      {
        name: { ar: 'ماصل أب سلبي', },
        description: {
          ar: 'ابدأ فوق البار، انزل ببطء عبر الانتقال.',
        },
        prescription: { ar: '4 × 3', },
        progressCriteria: { ar: '8 ثوانٍ', },
      },
      {
        name: { ar: 'ماصل أب مساعد', },
        description: {
          ar: 'مطّاط أو قفزة بسيطة. ركّز على الانتقال.',
        },
        prescription: { ar: '4 × 3', },
        progressCriteria: { ar: 'بأخفّ مساعدة', },
      },
      {
        name: { ar: 'ماصل أب صارم', },
        description: {
          ar: 'لا تأرجح. سحب نقي + كبّ + دفع.',
        },
        prescription: { ar: '5 × 2', },
        progressCriteria: { ar: '5 متتابعة', },
      },
      {
        name: { ar: 'ماصل أب بطيء', },
        description: {
          ar: 'كل مرحلة 3 ثوانٍ. سيطرة كاملة.',
        },
        prescription: { ar: '4 × 1', },
        progressCriteria: { ar: 'انتقال 5 ث', },
      },
      {
        name: { ar: 'ماصل أب على حلقات', },
        description: {
          ar: 'الحلقات أصعب 3× من البار. مهارة جمنازية.',
        },
        prescription: { ar: '5 × 3', },
        progressCriteria: { ar: '5 متتابعة', },
      },
    ],
    cues: {
      ar: [
        'ابدأ بقبضة كاذبة (Hands above bar)',
        'اسحب البار للسرّة (لا للذقن)',
        'مل برأسك للأمام عند الانتقال',
        'انفجر — السرعة شريك الجاذبية',
      ],
    },
    mistakes: {
      ar: [
        'سحب ضعيف (لا يصل للسرة)',
        'انتقال متأخر (الجسم يهبط)',
        'قبضة عادية بدل كاذبة',
        'محاولة قبل القوة الكافية',
      ],
    },
    muscles: {
      ar: ['ظهر', 'بايسبس', 'ترايسبس', 'صدر', 'جذع'],
    },
    frequency: { ar: '2 مرات/أسبوع', },
    proTip: {
      ar: 'لا تحاول ماصل أب قبل 12 سحب نظيف صدر للبار. الجسر مكسور بدونها.',
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
    name: { ar: 'العلم البشري (Human Flag)', },
    description: {
      ar: 'الجسم أفقي على عمود رأسي. مهارة جانبية تتطلب جذعاً جانبياً وحشياً وقوة كتف.',
    },
    prerequisites: [
      { key: 'side_plank', min: { ar: '60 ث', } },
      { key: 'pullup', min: { ar: '10 تكرار', } },
    ],
    levels: [
      {
        name: { ar: 'تكوّر العلم', },
        description: {
          ar: 'ركبتان للصدر، الجسم جانبي.',
        },
        prescription: { ar: '5 × 8 ث', },
        progressCriteria: { ar: '15 ث', },
      },
      {
        name: { ar: 'علم بساق واحدة', },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
        },
        prescription: { ar: '5 × 5 ث', },
        progressCriteria: { ar: '10 ث لكل', },
      },
      {
        name: { ar: 'علم مفتوح', },
        description: {
          ar: 'ساقان مفتوحتان جانباً.',
        },
        prescription: { ar: '5 × 5 ث', },
        progressCriteria: { ar: '10 ث', },
      },
      {
        name: { ar: 'علم بشري كامل', },
        description: {
          ar: 'الجسم لوح أفقي تام جانب العمود.',
        },
        prescription: { ar: '5 × 5 ث', },
        progressCriteria: { ar: '10 ث', },
      },
    ],
    cues: {
      ar: [
        'اليد العليا تسحب، السفلى تدفع',
        'الكتفان مغلقان (لا تنفجران)',
        'الجذع الجانبي شغّال 100%',
        'اضغط الورك للجانب',
      ],
    },
    mistakes: {
      ar: [
        'محاولة بدون قاعدة Side Plank',
        'ميل الجسم للخلف',
        'كتف محنية',
        'قبضة ضعيفة',
      ],
    },
    muscles: {
      ar: ['جذع جانبي (Obliques)', 'لاتس', 'كتفان', 'ساعد'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', },
    proTip: {
      ar: 'العلم 70% Obliques. اقضِ شهرين في تقوية الجذع الجانبي قبل تجربة العلم.',
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
    name: { ar: 'علم التنّين (Dragon Flag)', },
    description: {
      ar: 'تمرين بروس لي الأسطوري للجذع. الجسم لوح صلب من الكتف للقدم.',
    },
    prerequisites: [
      { key: 'hollow_hold', min: { ar: '60 ث', } },
      { key: 'leg_raise', min: { ar: '15 رفع رجل معلّق', } },
    ],
    levels: [
      {
        name: { ar: 'تنّين متكوّر', },
        description: {
          ar: 'استلقِ على مقعد، يداك خلفك، ارفع جسمك بركبتَين متكوّرتَين.',
        },
        prescription: { ar: '4 × 8', },
        progressCriteria: { ar: '12 تكرار', },
      },
      {
        name: { ar: 'سلبي تنّين', },
        description: {
          ar: 'ابدأ من الأعلى (مستقيم)، انزل ببطء (5 ث) للوضع الأفقي.',
        },
        prescription: { ar: '4 × 5', },
        progressCriteria: { ar: '8 ث نزول', },
      },
      {
        name: { ar: 'تنّين بساق واحدة', },
        description: {
          ar: 'ساق ممدودة، الأخرى متكوّرة.',
        },
        prescription: { ar: '4 × 5 لكل', },
        progressCriteria: { ar: '8 لكل', },
      },
      {
        name: { ar: 'تنّين كامل', },
        description: {
          ar: 'جسم لوح صلب، يستند فقط على الكتفَين.',
        },
        prescription: { ar: '4 × 5', },
        progressCriteria: { ar: '8 متتابعة', },
      },
    ],
    cues: {
      ar: [
        'البطن مشدود، الأرداف مشدودة (Hollow)',
        'لا تثني الورك',
        'تنفس مع الحركة',
        'تحكّم نزول 3 ثوانٍ',
      ],
    },
    mistakes: {
      ar: [
        'انثناء الورك (مفصلية لا تنّين)',
        'تأرجح الجسم',
        'قفزة قبل قاعدة جذعية',
        'تحميل الرقبة',
      ],
    },
    muscles: {
      ar: ['بطن', 'هامسترينج', 'لاتس'],
    },
    frequency: { ar: '3 مرات/أسبوع', },
    proTip: {
      ar: 'التنّين 100% انكماش (Hollow). إذا انفتح الورك = الحركة فقدت معناها.',
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
    name: { ar: 'باك ليفر (Back Lever)', },
    description: {
      ar: 'تعليق أفقي للجسم بحيث يكون الوجه للأسفل والظهر للأعلى ممسكاً بالبار خلف الظهر. مهارة أساسية ومدهشة تبني قوة خارقة للكتف الخلفي والظهر السفلي والجذع.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '10 تكرار نظيف', } },
      { key: 'skin_the_cat', min: { ar: '5 تكرارات بمدى كامل', } },
    ],
    levels: [
      {
        name: { ar: 'تكوّر كامل (Tuck Back Lever)', },
        description: {
          ar: 'اسحب ركبتيك لصدرك بالكامل مع الحفاظ على الظهر مستوياً وموازياً للأرض.',
        },
        prescription: { ar: '4 × 15 ثانية ثبات', },
        progressCriteria: { ar: 'ثبات 20 ثانية براحة', },
      },
      {
        name: { ar: 'تكوّر متقدم (Advanced Tuck)', },
        description: {
          ar: 'افتح زاوية الفخذ لتصبح 90 درجة مع الجذع مع الحفاظ على استقامة الظهر.',
        },
        prescription: { ar: '4 × 10 ثوانٍ ثبات', },
        progressCriteria: { ar: 'ثبات 15 ثانية', },
      },
      {
        name: { ar: 'باك ليفر بساق واحدة (Single Leg)', },
        description: {
          ar: 'امد ساقاً واحدة للخارج تماماً واجعل الأخرى متكوّرة عند الصدر.',
        },
        prescription: { ar: '4 × 8 ثوانٍ لكل ساق', },
        progressCriteria: { ar: 'ثبات 12 ثانية لكل ساق', },
      },
      {
        name: { ar: 'باك ليفر مفتوح (Straddle)', },
        description: {
          ar: 'افتح ساقيك على اتساعهما جانباً لتقصير طول الرافعة الميكانيكية.',
        },
        prescription: { ar: '4 × 6 ثوانٍ ثبات', },
        progressCriteria: { ar: 'ثبات 10 ثوانٍ نظيفة', },
      },
      {
        name: { ar: 'باك ليفر كامل (Full Back Lever)', },
        description: {
          ar: 'افرد الساقين والجسم بالكامل لتشكيل خط أفقي مثالي موازٍ للأرض.',
        },
        prescription: { ar: '5 × 5 ثوانٍ ثبات', },
        progressCriteria: { ar: 'ثبات 10 ثوانٍ مثالية', },
      },
    ],
    cues: {
      ar: [
        'ادفع البار للأسفل وللخلف بنشاط (Pronation)',
        'شد الأرداف والبطن تماماً لمنع تقوس الظهر السفلي',
        'اضغط لوحي الكتف للأمام وللأسفل (Protraction & Depression)',
        'اجعل نظرك متجهاً للأسفل أمامك مباشرة',
      ],
    },
    mistakes: {
      ar: [
        'تقوس الظهر السفلي (شكل الموزة)',
        'ثني الكوعين لتسهيل الحركة',
        'ارتخاء الأكتاف للأذن مما يضغط على الأوتار',
        'عدم ضبط الجسم أفقياً بشكل حقيقي (الورك مرتفع أو منخفض جداً)',
      ],
    },
    muscles: {
      ar: ['كتف خلفي', 'ظهر سفلي', 'مجاص (Lats)', 'جذع', 'ساعدين'],
    },
    frequency: { ar: '2-3 مرات/أسبوع', },
    proTip: {
      ar: 'مهارة الباك ليفر تضغط بشدة على أوتار الكوع الثنائية (Biceps Tendon). تأكد من الإحماء التام والتدريج الطويل جداً لتجنب التهاب الأوتار.',
    },
  },
  {
    key: 'one_arm_pullup',
    category: 'pull',
    color: '#ef4444',
    difficulty: 9,
    estimatedMonths: 15,
    emoji: '🥇',
    name: { ar: 'العقلة بذراع واحدة (One-Arm Pull-up)', },
    description: {
      ar: 'سحب الجسم بالكامل حتى الذقن فوق البار باستخدام ذراع واحدة فقط دون أي مساعدة. تجسيد خارق لقوة السحب النسبية والتحكم في الكتف والساعد.',
    },
    prerequisites: [
      { key: 'pullup', min: { ar: '20 تكرار متتالي أو سحب مرجّح بوزن +70% من وزن الجسم', } },
    ],
    levels: [
      {
        name: { ar: 'تعليق نشط بذراع واحدة (One-Arm Active Hang)', },
        description: {
          ar: 'تعلّق بذراع واحدة مع سحب الكتف لأسفل وللخلف بقوة لتنشيط لوح الكتف.',
        },
        prescription: { ar: '3 × 15 ثانية لكل ذراع', },
        progressCriteria: { ar: '30 ثانية ثبات نشط ومستقر', },
      },
      {
        name: { ar: 'سحب مائل بمساعدة الذراع الأخرى', },
        description: {
          ar: 'اسحب نفسك لأعلى مائلاً لجهة واحدة، بينما الذراع الأخرى ممتدة على البار للمساعدة بأقل قدر.',
        },
        prescription: { ar: '4 × 5 تكرارات لكل ذراع', },
        progressCriteria: { ar: '8 تكرارات نظيفة لكل ذراع', },
      },
      {
        name: { ar: 'سحب سلبي بذراع واحدة (OAP Negative)', },
        description: {
          ar: 'اقفز لأعلى العقلة بذراع واحدة، ثم انزل ببطء شديد وبشكل متحكم حتى الامتداد الكامل.',
        },
        prescription: { ar: '4 × 3 تكرارات سلبي بـ5 ثوانٍ نزول', },
        progressCriteria: { ar: 'نزول مستمر لـ8 ثوانٍ دون هبوط مفاجئ', },
      },
      {
        name: { ar: 'سحب بمطاط المقاومة بذراع واحدة', },
        description: {
          ar: 'استخدم مطاط مقاومة معلق بالبار تحت قدمك أو تحت يدك المساعدة لتخفيف الوزن.',
        },
        prescription: { ar: '4 × 4 تكرارات لكل ذراع', },
        progressCriteria: { ar: '6 تكرارات بأخف مطاط مقاومة', },
      },
      {
        name: { ar: 'عقلة كاملة بذراع واحدة (OAP)', },
        description: {
          ar: 'سحب من الامتداد الكامل بذراع واحدة حتى عبور الذقن البار بشكل صارم.',
        },
        prescription: { ar: '5 × 1 تكرار لكل ذراع', },
        progressCriteria: { ar: '3 تكرارات متتالية لكل ذراع', },
      },
    ],
    cues: {
      ar: [
        'اعصر البار بأقصى قوة ممكنة لتنشيط الجهاز العصبي (Irradiation)',
        'ابدأ الحركة من لوح الكتف أولاً ثم الكوع',
        'ابذل جهداً لجلب البار للكتف المقابل لتغيير خط الجاذبية',
        'شد عضلات بطنك وفخذيك بقوة لتقليل اهتزاز الجسم',
      ],
    },
    mistakes: {
      ar: [
        'البدء من تعليق مرتخٍ كلياً مما يعرض أوتار الكتف لتمزق',
        'استخدام الركل بالقدمين (Kipping) للتغلب على الوزن',
        'عدم إكمال المدى الحركي (عدم النزول للنهاية أو عدم عبور الذقن)',
        'إهمال الاستشفاء الكافي للأوتار والمفاصل',
      ],
    },
    muscles: {
      ar: ['عضلات المجنص (Lats)', 'البايسبس', 'عضلة الكتف الخلفية', 'العضلة العضدية العضدية', 'الجذع والساعد'],
    },
    frequency: { ar: '2 مرات/أسبوع لضمان تعافي الأوتار', },
    proTip: {
      ar: 'الأوتار تتكيف ببطء أبطأ 10 مرات من العضلات. قد تمتلك القوة العضلية لتنفيذ العقلة لكن أوتار كوعك قد تلتهب وتتضرر لشهور إن تسرّعت.',
    },
  },
  {
    key: 'hefesto',
    category: 'dynamic',
    color: '#a855f7',
    difficulty: 10,
    estimatedMonths: 18,
    emoji: '🧗',
    name: { ar: 'هيفستو (Hefesto)', },
    description: {
      ar: 'سحب الجسم من وضع التعليق الخلفي (تحت البار واليدين خلف الظهر) والدوران لأعلى حتى الجلوس على البار. مهارة ديناميكية صعبة جداً وتتطلب قوة أوتار بايسبس استثنائية.',
    },
    prerequisites: [
      { key: 'backlever', min: { ar: '10 ثوانٍ ثبات كامل', } },
      { key: 'korean_dip', min: { ar: '10 تكرار نظيف', } },
    ],
    levels: [
      {
        name: { ar: 'ديبس كوري ممتد (Korean Dip)', },
        description: {
          ar: 'انزل خلف البار حتى يلامس الظهر السفلي البار ثم ادفع للأعلى تماماً.',
        },
        prescription: { ar: '3 × 8 تكرارات', },
        progressCriteria: { ar: '12 تكرار بنظافة وسهولة', },
      },
      {
        name: { ar: 'رفع خلفي مائل بمساعدة الأرجل', },
        description: {
          ar: 'على بار منخفض، استخدم الأرجل على الأرض لتخفيف الحمل أثناء الدوران خلف الظهر.',
        },
        prescription: { ar: '4 × 6 تكرارات', },
        progressCriteria: { ar: '8 تكرارات نظيفة مع دفع قليل من الأرجل', },
      },
      {
        name: { ar: 'هيفستو سلبي ببطء (Negative Hefesto)', },
        description: {
          ar: 'ابدأ بالجلوس فوق البار، انزل ببطء شديد وتحكم بالدوران للخلف حتى التعليق الكامل.',
        },
        prescription: { ar: '4 × 3 تكرارات بـ6 ثوانٍ نزول', },
        progressCriteria: { ar: 'نزول 8 ثوانٍ دون فقدان التحكم في أي زاوية', },
      },
      {
        name: { ar: 'هيفستو بمطاط مقاومة عريض', },
        description: {
          ar: 'ثبت مطاط المقاومة على مستوى الفخذين لرفع الورك ودفع الجسم لأعلى البار.',
        },
        prescription: { ar: '4 × 4 تكرارات', },
        progressCriteria: { ar: '6 تكرارات بأخف مطاط مقاومة', },
      },
      {
        name: { ar: 'هيفستو صارم كامل (Strict Hefesto)', },
        description: {
          ar: 'من التعليق الخلفي التام، اسحب الدوران للخلف بقوة الأوتار حتى الجلوس على البار.',
        },
        prescription: { ar: '5 × 1 تكرار', },
        progressCriteria: { ar: '3 تكرارات متتالية مثالية', },
      },
    ],
    cues: {
      ar: [
        'استخدم قبضة كاذبة خلفية (False Grip) مريحة وثابتة',
        'اسحب البار للوركين بنشاط تام لتقريب مركز الجاذبية',
        'أبق كوعيك قريبين جداً من جذعك ولا تسمح لهما بالتفتح جانباً',
        'احنِ رأسك وصدرك للأمام بقوة لتسريع الدوران فوق البار',
      ],
    },
    mistakes: {
      ar: [
        'تفتيح الكوعين للخارج مما يضعف القوة الهندسية ويسبب إصابة الكتف والرسغ',
        'إهمال القبضة الكاذبة بالكامل مما يجعل الحركة شبه مستحيلة للرسغ',
        'الاندفاع بالزخم العنيف والضرب بالورك على البار لتجاوز زاوية الصعوبة',
        'تمرين المهارة بأكتاف مجهدة أو أوتار كوع غير معافاة',
      ],
    },
    muscles: {
      ar: ['أوتار البايسبس', 'عضلة الكتف الخلفية والأمامية', 'الساعدين وقبضة اليد', 'الجذع والظهر السفلي'],
    },
    frequency: { ar: '1-2 مرات/أسبوع بحد أقصى لمنع الإصابات الجسيمة', },
    proTip: {
      ar: 'هيفستو هي أكثر مهارة تضع ضغط تمدد أقصى تحت مقاومة على البايسبس (Eccentric Biceps Strain). لا تتدرب عليها إلا وجهازك العصبي والمفصلي في قمة نشاطه واستشفائه.',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
 *  CATEGORY METADATA
 * ═══════════════════════════════════════════════════════════════════ */

export const CATEGORY_LABELS: Record<SkillCategory, Record<Lang, string>> = {
  push: { ar: 'الدفع', },
  pull: { ar: 'السحب', },
  core: { ar: 'الجذع', },
  legs: { ar: 'الأرجل', },
  static: { ar: 'الثبات', },
  dynamic: { ar: 'الديناميكي', },
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
    title: { ar: 'القوة قبل المهارة', },
    body: {
      ar: 'لا توجد بلانش بدون 20 ضغطاً نظيفاً. لا فرنت ليفر بدون 12 سحبة. القوة الأساسية تستغرق 1-2 سنة من العمل المنضبط — هذا الاستثمار سيُعفيك من 90% من الإصابات لاحقاً.',
    },
  },
  {
    emoji: '⏰',
    title: { ar: 'الجهاز العصبي يحتاج تكراراً', },
    body: {
      ar: 'المهارات الثابتة (وقوف يدين، L-Sit) تتعلّمها بالتكرار اليومي القصير، لا بجلسة طويلة أسبوعياً. 7 جلسات × 5 دقائق > 1 جلسة × 35 دقيقة.',
    },
  },
  {
    emoji: '🧠',
    title: { ar: 'الإصابة عدوّ التقدّم', },
    body: {
      ar: 'أسبوعان إصابة = 6 أشهر تأخير في مهارات النخبة. اتباع التدرّج، الإحماء الكافي، إعداد الرسغ والكتف ليس اختيارياً.',
    },
  },
  {
    emoji: '🥩',
    title: { ar: 'البروتين والنوم > كل المكمّلات', },
    body: {
      ar: '1.6-2.2 جم بروتين/كجم وزن جسم. 7-9 ساعات نوم. هذان عاملا التعافي الحقيقيان. كل المكمّلات مكمّلة لهما، لا بديل عنهما.',
    },
  },
  {
    emoji: '📅',
    title: { ar: 'العشرينات نافذة ذهبية', },
    body: {
      ar: 'التستوستيرون والـ IGF-1 وحساسية الإنسولين في ذروتها. تكيُّفك العصبي والعضلي 2-3× أسرع مما سيكون في الأربعينات. لا تضيّع هذا الوقت.',
    },
  },
  {
    emoji: '🌊',
    title: { ar: 'الموجات تتغلّب على الخط المستقيم', },
    body: {
      ar: 'لا يستطيع جسمك التحسّن خطياً للأبد. خطّط دورات: 4 أسابيع كثيفة، أسبوع تخفيف. هذا ليس كسلاً، هذا علم.',
    },
  },
];
