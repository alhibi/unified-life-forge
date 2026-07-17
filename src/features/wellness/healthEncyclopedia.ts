/**
 * Health Encyclopedia — science-based wellness wisdom for athletes in their 20s.
 *
 * Topics covered:
 *  • Sleep architecture & recovery
 *  • Hormones (testosterone, cortisol, growth hormone)
 *  • Stress & nervous system regulation
 *  • Mental performance & focus
 *  • Longevity & biohacking
 *  • Recovery science
 *  • Body composition & fat loss
 *  • Energy systems & metabolism
 *
 * All content based on peer-reviewed research, simplified for action.
 *
 * Pure data — no React, no network.
 */

export type Lang = 'ar' | 'de';

export type EncyclopediaCategory =
  | 'sleep' | 'hormones' | 'stress' | 'mental'
  | 'longevity' | 'recovery' | 'body_comp' | 'energy'
  | 'gut' | 'hydration' | 'breath' | 'light'
  | 'cold_heat' | 'mobility' | 'heart' | 'habits';

export interface KnowledgeFact {
  /** Concise headline */
  title: Record<Lang, string>;
  /** Why this matters (the science) */
  body: Record<Lang, string>;
  /** Concrete action item */
  action: Record<Lang, string>;
  /** Optional myth-busting note */
  myth?: Record<Lang, string>;
  /** Numerical impact: e.g. "+15% recovery", "30% lower cortisol" */
  impact: Record<Lang, string>;
}

export interface KnowledgeChapter {
  category: EncyclopediaCategory;
  emoji: string;
  color: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  facts: KnowledgeFact[];
}

/* ═══════════════════════════════════════════════════════════════════
 *  THE ENCYCLOPEDIA
 * ═══════════════════════════════════════════════════════════════════ */

export const HEALTH_ENCYCLOPEDIA: KnowledgeChapter[] = [
  /* ─────────── SLEEP ─────────── */
  {
    category: 'sleep',
    emoji: '🌙',
    color: '#6366f1',
    title: { ar: 'النوم — أعظم أداة استشفاء', de: 'Schlaf — die mächtigste Erholung' },
    description: {
      ar: 'النوم ليس "وقت ميت" — إنه أكبر مختبر للتعافي العضلي والإدراكي والهرموني. سُن في العشرينات تحدّد جودتها أداء الـ60 سنة القادمة.',
      de: 'Schlaf ist keine "tote Zeit" — es ist das größte Recovery-Labor für Muskeln, Hirn, Hormone. In den 20ern definierst du deine nächsten 60 Jahre.',
    },
    facts: [
      {
        title: {
          ar: 'هرمون النمو يُفرز ليلاً',
          de: 'Wachstumshormon wird nachts ausgeschüttet',
        },
        body: {
          ar: '70% من إفراز هرمون النمو يحدث في النوم العميق (Slow-Wave). هذا الهرمون يبني العضلات، يحرق الدهون، ويُصلح الأنسجة. كل ساعة نوم تخسرها = نقص 20% في إفرازه.',
          de: '70% des Wachstumshormons werden im Tiefschlaf ausgeschüttet — baut Muskeln, verbrennt Fett, repariert Gewebe.',
        },
        action: {
          ar: 'نم 7-9 ساعات في غرفة مظلمة تماماً (≤18°م) بنفس الوقت كل ليلة',
          de: '7-9 h in dunklem Raum (≤18°C), gleiche Uhrzeit',
        },
        impact: { ar: '+200% هرمون النمو', de: '+200% GH' },
      },
      {
        title: {
          ar: 'نقص النوم يخفض التستوستيرون 15%',
          de: 'Schlafmangel senkt Testosteron um 15%',
        },
        body: {
          ar: 'دراسة جامعة شيكاغو: 5 ساعات نوم لأسبوع واحد تخفض التستوستيرون 10-15% — يعادل 10 سنوات شيخوخة.',
          de: 'Studie Univ. Chicago: 5 h Schlaf für 1 Woche senkt Testosteron um 10-15% — entspricht 10 Jahren Alterung.',
        },
        action: {
          ar: 'لا تضحي بالنوم لأي سبب — لا تمارين، لا دراسة، لا حفلات',
          de: 'Niemals Schlaf opfern — kein Training, kein Lernen, keine Party',
        },
        impact: { ar: '-15% T, -25% أداء', de: '-15% T, -25% Leistung' },
      },
      {
        title: {
          ar: 'الضوء الأزرق يدمّر الميلاتونين',
          de: 'Blaues Licht zerstört Melatonin',
        },
        body: {
          ar: 'شاشات الهاتف تنبعث منها 480nm (ضوء أزرق) يخدع الدماغ ويظنّه نهاراً. النتيجة: تأخر نوم 30-90 دقيقة وتدمير دورة الميلاتونين.',
          de: 'Bildschirmlicht (480 nm) täuscht das Gehirn — Schlaf verzögert sich 30-90 min, Melatonin kollabiert.',
        },
        action: {
          ar: 'لا شاشات قبل النوم بساعة، أو استخدم نظارات حجب أزرق',
          de: 'Keine Screens 1 h vor Schlaf — oder Blaulichtbrille',
        },
        myth: {
          ar: 'وضع الليلي (Night Shift) ليس كافياً — يُقلّل لكن لا يُلغي',
          de: 'Night Shift Mode reicht nicht — reduziert nur',
        },
        impact: { ar: 'نوم أعمق 23%', de: '+23% Tiefschlaf' },
      },
      {
        title: {
          ar: 'الكافيين يبقى 6 ساعات',
          de: 'Koffein bleibt 6 Stunden',
        },
        body: {
          ar: 'نصف العمر للكافيين 5-6 ساعات. قهوة الساعة 4 مساءً = نصف الجرعة لا تزال في دمك عند النوم. تدمّر النوم العميق دون أن تعرف.',
          de: 'Halbwertszeit 5-6 h. Kaffee um 16 h = Hälfte noch beim Einschlafen aktiv — zerstört Tiefschlaf.',
        },
        action: {
          ar: 'لا كافيين بعد الساعة 2 ظهراً (بحد أقصى)',
          de: 'Kein Koffein nach 14 h',
        },
        impact: { ar: '-20% نوم عميق', de: '-20% Tiefschlaf' },
      },
      {
        title: {
          ar: 'NREM 3 و REM لا يتفاوضان',
          de: 'NREM 3 + REM sind nicht verhandelbar',
        },
        body: {
          ar: 'النوم العميق (NREM 3) للجسم، الـ REM للدماغ. كلاهما يحدث آخر ساعتين من النوم. 6 ساعات ≠ 8 ساعات منقوصة 25% — بل منقوصة 60% من الفائدة.',
          de: 'Tiefschlaf für Körper, REM fürs Gehirn — beide in den letzten 2 h. 6 h Schlaf = 60% weniger Nutzen, nicht 25%.',
        },
        action: {
          ar: 'الدورتان الأخيرتان مقدّستان — لا تستيقظ على المنبه قبل اكتمالهما',
          de: 'Letzte 2 Zyklen heilig — nicht zu früh wecken',
        },
        impact: { ar: '+200% تذكّر', de: '+200% Gedächtnis' },
      },
      {
        title: {
          ar: 'القاعدة 10-3-2-1-0',
          de: 'Die 10-3-2-1-0 Regel',
        },
        body: {
          ar: '10 ساعات قبل النوم: لا كافيين. 3 ساعات: لا طعام أو كحول. 2 ساعة: لا عمل. 1 ساعة: لا شاشات. 0: عدد المرات التي ستضغط Snooze.',
          de: '10 h vor Schlaf: kein Koffein. 3 h: kein Essen/Alkohol. 2 h: keine Arbeit. 1 h: keine Screens. 0: Snooze-Mal.',
        },
        action: {
          ar: 'تطبيق 3 من هذه القواعد فقط يحدث ثورة في نومك',
          de: 'Nur 3 davon umsetzen revolutioniert deinen Schlaf',
        },
        impact: { ar: '+45% جودة', de: '+45% Qualität' },
      },
    ],
  },

  /* ─────────── HORMONES ─────────── */
  {
    category: 'hormones',
    emoji: '⚗️',
    color: '#dc2626',
    title: { ar: 'الهرمونات — لوحة قيادة الجسم', de: 'Hormone — das Cockpit des Körpers' },
    description: {
      ar: 'في العشرينات، التستوستيرون و GH و IGF-1 في الذروة. كل قرار حياة (نوم، طعام، إجهاد) يصنع موجة هرمونية تستمرّ ساعات.',
      de: 'In den 20ern: Testosteron, GH, IGF-1 auf Höchstwert. Jede Lebensentscheidung erzeugt stundenlange Hormonwellen.',
    },
    facts: [
      {
        title: {
          ar: 'الكورتيزول المرتفع يقتل العضلات',
          de: 'Hohes Cortisol tötet Muskeln',
        },
        body: {
          ar: 'الكورتيزول المزمن (إجهاد، نوم سيء، حمية شديدة) يحطّم البروتين العضلي ويزيد دهن البطن. كورتيزول صباحي طبيعي ≠ كورتيزول مزمن مرتفع.',
          de: 'Chronisch erhöhtes Cortisol zerstört Muskelprotein, erhöht Bauchfett. Morgens hoch = normal. Chronisch = Problem.',
        },
        action: {
          ar: 'تأمّل 10 دقائق + ضحك يومي + 8 ساعات نوم',
          de: '10 min Meditation + täglich lachen + 8 h Schlaf',
        },
        impact: { ar: '-30% كورتيزول', de: '-30% Cortisol' },
      },
      {
        title: {
          ar: 'الكولين والكوليسترول يبنيان التستوستيرون',
          de: 'Cholesterin baut Testosteron',
        },
        body: {
          ar: 'التستوستيرون يُصنع من الكوليسترول. حمية خالية تماماً من الدهون = خصية معطّلة. الدهون المشبعة (بيض كامل، لحم) أساسية للذكور.',
          de: 'Testosteron entsteht aus Cholesterin. Fettfreie Diät = Hodenstillstand. Gesättigte Fette (Eier, Fleisch) essentiell.',
        },
        action: {
          ar: '20-25% من سعراتك دهون، نصفها مشبعة',
          de: '20-25% Kalorien aus Fett, Hälfte gesättigt',
        },
        myth: {
          ar: 'الدهون المشبعة لا ترفع كوليسترول الدم لمن يتمرّن',
          de: 'Bei Sportlern erhöhen gesättigte Fette nicht das Blutcholesterin',
        },
        impact: { ar: '+15-20% T', de: '+15-20% T' },
      },
      {
        title: {
          ar: 'الزنك معدن التستوستيرون',
          de: 'Zink — das Testosteron-Mineral',
        },
        body: {
          ar: 'نقص الزنك (شائع جداً) يخفض التستوستيرون 30%. الرياضيون يفقدونه عبر العرق. مصادر: لحم، محار، بذور قرع.',
          de: 'Zinkmangel (sehr häufig) senkt T um 30%. Sportler verlieren es über Schweiß. Quellen: Fleisch, Austern, Kürbiskerne.',
        },
        action: {
          ar: '15-30مغ زنك يومياً (طعام أو مكمّل في المساء)',
          de: '15-30 mg täglich (Lebensmittel + Supplement abends)',
        },
        impact: { ar: '+25% T إذا كان نقص', de: '+25% T bei Mangel' },
      },
      {
        title: {
          ar: 'الإفراط في الكارديو يحرق التستوستيرون',
          de: 'Zu viel Cardio verbrennt Testosteron',
        },
        body: {
          ar: 'كارديو ثبات لمدة طويلة (>60 دقيقة، 5+ أيام أسبوعياً) يرفع الكورتيزول ويخفض T. متسابقو الماراثون لديهم T أقل من الكسالى.',
          de: 'Lange Steady-Cardio (>60 min, 5+×/Wo) hebt Cortisol, senkt T. Marathonläufer haben weniger T als Stubenhocker.',
        },
        action: {
          ar: 'استبدل بـ HIIT 2× أسبوعياً + رفع أوزان 3-4× أسبوعياً',
          de: 'Lieber HIIT 2× + Krafttraining 3-4× pro Woche',
        },
        impact: { ar: '-20% T مع كارديو مفرط', de: '-20% T bei Übermaß' },
      },
      {
        title: {
          ar: 'الإنسولين هو مفتاح الدهون',
          de: 'Insulin ist der Fett-Schalter',
        },
        body: {
          ar: 'كل أكلة بكربوهيدرات تطلق إنسولين. مع الإنسولين، الجسم يخزّن دهناً ولا يحرق. السكر السريع المتكرر = مقاومة إنسولين = مرض السكر.',
          de: 'Carbs lösen Insulin aus. Bei Insulin speichert der Körper Fett. Häufiger Schnellzucker = Insulinresistenz.',
        },
        action: {
          ar: 'ركّز على كربوهيدرات معقدة + بروتين + ألياف في كل وجبة',
          de: 'Komplexe Carbs + Protein + Ballaststoffe pro Mahlzeit',
        },
        impact: { ar: '+200% حساسية إنسولين', de: '+200% Insulinsensitivität' },
      },
      {
        title: {
          ar: 'الصيام المتقطع يرفع GH 5×',
          de: 'Intermittent Fasting erhöht GH 5-fach',
        },
        body: {
          ar: 'صيام 16 ساعة يرفع هرمون النمو حتى 500% للرجال. يحسّن الحساسية للإنسولين، يحرق الدهون، يحفز الالتهام الذاتي.',
          de: '16 h Fasten erhöht GH bis zu 500% bei Männern. Verbessert Insulin, verbrennt Fett, aktiviert Autophagie.',
        },
        action: {
          ar: 'ابدأ بـ 14:10 ثم 16:8. لا تكسر بعصير سكريّ',
          de: 'Start mit 14:10, dann 16:8. Brich nicht mit Süßsaft',
        },
        impact: { ar: '+500% GH', de: '+500% GH' },
      },
    ],
  },

  /* ─────────── STRESS ─────────── */
  {
    category: 'stress',
    emoji: '🧘',
    color: '#16a34a',
    title: { ar: 'الإجهاد — العدوّ الصامت', de: 'Stress — der stille Feind' },
    description: {
      ar: 'الإجهاد المزمن في العشرينات يبرمج جسدك لينفجر بمرض في الثلاثينات. تعلّم تنظيم العصب الـVagus = استثمار 60 سنة.',
      de: 'Chronischer Stress in den 20ern programmiert Krankheit in den 30ern. Vagus-Regulation = 60-Jahres-Investition.',
    },
    facts: [
      {
        title: {
          ar: 'تنفّس البطن يفعّل العصب الـVagus',
          de: 'Bauchatmung aktiviert den Vagus',
        },
        body: {
          ar: '4-7-8 (شهيق 4، حبس 7، زفير 8) لمدة دقيقتَين يُفعّل الجهاز العصبي اللاودي ويخفض ضربات القلب 15-20.',
          de: '4-7-8 Atmung (4 ein, 7 halten, 8 aus) für 2 min senkt Puls um 15-20.',
        },
        action: {
          ar: '3 مرات يومياً (صباحاً، قبل أي اجتماع/تمرين، قبل النوم)',
          de: '3×/Tag (morgens, vor Stress-Situationen, abends)',
        },
        impact: { ar: '-40% كورتيزول', de: '-40% Cortisol' },
      },
      {
        title: {
          ar: 'الحمام البارد = جرعة دوبامين 250%',
          de: 'Kaltdusche = 250% Dopamin',
        },
        body: {
          ar: 'الانغماس البارد (10°م × 3 دقائق) يرفع الدوبامين 250% ويبقى لساعات. أفضل من القهوة، بدون انهيار.',
          de: 'Kaltbad (10°C × 3 min) erhöht Dopamin um 250% — hält stundenlang. Besser als Kaffee.',
        },
        action: {
          ar: 'انهي دش الصباح بـ60 ثانية ماء بارد',
          de: 'Beende Morgendusche mit 60 s kalt',
        },
        impact: { ar: '+250% دوبامين', de: '+250% Dopamin' },
      },
      {
        title: {
          ar: 'وسائل التواصل تخلق إجهاداً اجتماعياً',
          de: 'Social Media erzeugt sozialen Stress',
        },
        body: {
          ar: '60 دقيقة سكرول يومياً يرفع الكورتيزول والقلق ويُقارن دماغك بمئات الناس. شيوخ القرى لم يعرفوا أكثر من 200 شخص — أنت ترى 200 شخصاً قبل الإفطار.',
          de: '60 min Scrollen/Tag hebt Cortisol + Angst. Dein Gehirn ist nicht für 200+ Menschen vor dem Frühstück gebaut.',
        },
        action: {
          ar: 'قاعدة 1-1: ساعة بدون هاتف صباحاً، ساعة قبل النوم',
          de: '1-1 Regel: 1 h ohne Handy morgens + abends',
        },
        impact: { ar: '-50% قلق', de: '-50% Angst' },
      },
      {
        title: {
          ar: 'الطبيعة 20 دقيقة = جلسة علاج',
          de: '20 min Natur = Therapie-Session',
        },
        body: {
          ar: 'دراسة جامعة ميتشيغان: 20 دقيقة في الطبيعة تخفض الكورتيزول بنفس قدر 50 دقيقة جلسة علاج.',
          de: 'Studie Univ. Michigan: 20 min Natur senkt Cortisol so stark wie 50 min Therapie.',
        },
        action: {
          ar: 'مشي يومي في الحديقة بدون هاتف',
          de: 'Tägl. Spaziergang im Park ohne Handy',
        },
        impact: { ar: '-21% كورتيزول', de: '-21% Cortisol' },
      },
      {
        title: {
          ar: 'تقدير ذاتي ↔ عقدة هرمونية',
          de: 'Selbstwert ↔ Hormonkomplex',
        },
        body: {
          ar: 'الفائزون يطلقون T أعلى. النيّة بفوز معركة (ولو صغيرة) ترفع T 10-20%. الانكسار العقلي يخفض T فعلياً.',
          de: 'Sieger schütten mehr T aus. Eine kleine Schlacht zu gewinnen erhöht T um 10-20%. Mentale Niederlage senkt T tatsächlich.',
        },
        action: {
          ar: 'حقّق إنجازاً صغيراً يومياً قبل 9 صباحاً (تمرين، قراءة)',
          de: 'Tägl. kleinen Sieg vor 9 Uhr erringen (Training, Lesen)',
        },
        impact: { ar: '+15% T', de: '+15% T' },
      },
    ],
  },

  /* ─────────── MENTAL ─────────── */
  {
    category: 'mental',
    emoji: '🧠',
    color: '#8b5cf6',
    title: { ar: 'الأداء الذهني — الميزة غير العادلة', de: 'Mentale Performance — der unfaire Vorteil' },
    description: {
      ar: 'دماغك في العشرينات لا يزال يبني الميالين والمشابك. ما تتعلّمه/تعتاده الآن يتمأسس بقوّة في بنية دماغك.',
      de: 'Dein Gehirn baut in den 20ern noch Myelin + Synapsen. Was du jetzt lernst/übst, prägt sich strukturell ein.',
    },
    facts: [
      {
        title: {
          ar: 'العمل العميق 90 دقيقة = نمط ألفا',
          de: 'Deep Work 90 min = Alpha-State',
        },
        body: {
          ar: 'دماغك يدخل الفلو بعد 25 دقيقة. كل تشتيت يُعيد العداد للصفر. 90 دقيقة عميقة = إنتاج يوم كامل من المشتت.',
          de: 'Flow-State nach 25 min. Jede Ablenkung resettet. 90 min Deep Work = ganzer Tag Multitasking.',
        },
        action: {
          ar: 'هاتف خارج الغرفة، 90 دقيقة، مهمّة واحدة',
          de: 'Handy raus, 90 min, eine Aufgabe',
        },
        impact: { ar: '+400% إنتاجية', de: '+400% Produktivität' },
      },
      {
        title: {
          ar: 'ممارسة عضوية تُغذّي الدماغ',
          de: 'Bewegung füttert das Gehirn',
        },
        body: {
          ar: 'تمرين 30 دقيقة يرفع BDNF (سماد الدماغ) 30%. يبني خلايا عصبية جديدة في الحُصين (Hippocampus).',
          de: 'Training 30 min erhöht BDNF (Hirndünger) um 30%. Baut neue Neuronen im Hippocampus.',
        },
        action: {
          ar: 'تمرين قبل أي مهمة معرفية مهمة',
          de: 'Training vor wichtigen kognitiven Aufgaben',
        },
        impact: { ar: '+30% BDNF', de: '+30% BDNF' },
      },
      {
        title: {
          ar: 'تعدّد المهام أسطورة',
          de: 'Multitasking ist ein Mythos',
        },
        body: {
          ar: 'الدماغ لا يفعل مهمتَين معاً — يبدّل بسرعة. كل تبديل يضيع 23 دقيقة لاستعادة التركيز. المتعدّدون أداؤهم أسوأ بـ 40%.',
          de: 'Gehirn kann nicht 2 Aufgaben — es switcht. Jeder Switch kostet 23 min Fokus. Multitasker sind 40% schlechter.',
        },
        action: {
          ar: 'مهمّة واحدة لـ 25 دقيقة (Pomodoro) قبل التبديل',
          de: 'Eine Aufgabe für 25 min (Pomodoro) vor Switch',
        },
        myth: {
          ar: '"أنا جيد في تعدّد المهام" = "أنا جيد في الفشل"',
          de: '"Ich kann Multitasking" = "Ich versage gerne"',
        },
        impact: { ar: '+40% أداء', de: '+40% Leistung' },
      },
      {
        title: {
          ar: 'الذاكرة تتطلّب نوماً، لا تكراراً',
          de: 'Gedächtnis braucht Schlaf, kein Wiederholen',
        },
        body: {
          ar: 'الذاكرة تنتقل من قصيرة المدى للطويلة المدى أثناء النوم العميق. السهر للامتحان = حرق المعلومات قبل تثبيتها.',
          de: 'Gedächtnis wandert vom Kurz- ins Langzeit im Tiefschlaf. Durchlernen = Info verbrennen vor Festigung.',
        },
        action: {
          ar: 'ادرس مساءً، نم 8 ساعات، راجع صباحاً 10 دقائق',
          de: 'Abends lernen, 8 h schlafen, morgens 10 min wiederholen',
        },
        impact: { ar: '+150% احتفاظ', de: '+150% Retention' },
      },
      {
        title: {
          ar: 'الكتابة بالقلم تحفر بعمق',
          de: 'Handschrift speichert tiefer',
        },
        body: {
          ar: 'الكتابة على ورق تنشّط مناطق دماغية أعمق من الكيبورد. الطلاب الذين يكتبون يدوياً يفهمون 23% أعمق.',
          de: 'Handschrift aktiviert tiefere Hirnregionen. Schüler verstehen 23% tiefer beim Schreiben mit Stift.',
        },
        action: {
          ar: 'كتب الأهداف اليومية في دفتر ورق',
          de: 'Tägl. Ziele auf Papier notieren',
        },
        impact: { ar: '+23% فهم', de: '+23% Verständnis' },
      },
    ],
  },

  /* ─────────── RECOVERY ─────────── */
  {
    category: 'recovery',
    emoji: '♻️',
    color: '#0891b2',
    title: { ar: 'التعافي — حيث يُبنى الجسد', de: 'Recovery — wo der Körper gebaut wird' },
    description: {
      ar: 'التمرين هو الإشارة، التعافي هو البناء. تجاهل التعافي = تمزّق وإصابة. المحترف ينام أكثر مما يتمرّن.',
      de: 'Training = Signal, Recovery = Aufbau. Ignorieren = Verletzung. Profis schlafen mehr als sie trainieren.',
    },
    facts: [
      {
        title: {
          ar: 'العضلات تنمو في الراحة',
          de: 'Muskeln wachsen in der Pause',
        },
        body: {
          ar: 'البروتين العضلي يُصنع 36-72 ساعة بعد التمرين. تمرين كل يوم لنفس المجموعة = منع البناء وتراكم إصابات.',
          de: 'Muskelprotein-Synthese läuft 36-72 h nach Training. Tägl. dieselbe Muskelgruppe = Verhinderung + Verletzung.',
        },
        action: {
          ar: '48 ساعة بين تمرين نفس المجموعة العضلية',
          de: '48 h zwischen gleicher Muskelgruppe',
        },
        impact: { ar: '+40% نمو', de: '+40% Wachstum' },
      },
      {
        title: {
          ar: 'الترطيب يسرّع التعافي 35%',
          de: 'Hydration beschleunigt Recovery 35%',
        },
        body: {
          ar: '2% جفاف يبطّئ تخليق البروتين 35%. الجلوكوز لا ينقل، الفضلات لا تطرد، الكهارل تختل.',
          de: '2% Dehydration bremst Proteinsynthese um 35%. Glukose stockt, Abfall stockt, Elektrolyte aus.',
        },
        action: {
          ar: '500مل ماء + رشة ملح بعد كل تمرين',
          de: '500 ml + Prise Salz nach Training',
        },
        impact: { ar: '+35% تخليق بروتين', de: '+35% Synthese' },
      },
      {
        title: {
          ar: 'الانغماس البارد بعد التمرين الثقيل = قاتل',
          de: 'Eisbad nach Krafttraining = Killer',
        },
        body: {
          ar: 'دش بارد بعد رفع أوزان يقلّل بناء العضلات 50% (يثبط الالتهاب الذي يُحفّز النمو). جيد بعد كارديو فقط.',
          de: 'Kaltdusche nach Krafttraining reduziert Muskelaufbau um 50% (hemmt nötige Entzündung). Nur nach Cardio gut.',
        },
        action: {
          ar: 'بارد فقط بعد كارديو/تمرين خفيف، ليس بعد رفع أوزان',
          de: 'Nur nach Cardio kalt — nicht nach Krafttraining',
        },
        myth: {
          ar: '"التعافي البارد دائماً جيد" — خاطئ تماماً',
          de: '"Kalt = immer gut" — falsch',
        },
        impact: { ar: '-50% نمو إذا أُسيء استخدامه', de: '-50% Wachstum bei Fehlanwendung' },
      },
      {
        title: {
          ar: 'فوم رول 5 دقائق يومياً',
          de: '5 min Foam Rolling täglich',
        },
        body: {
          ar: 'الفوم رول يكسر الالتصاقات اللفافية، يحسّن مدى الحركة 12%، ويقلّل الألم العضلي 30%.',
          de: 'Bricht fasziale Verklebungen, verbessert ROM um 12%, reduziert Muskelkater um 30%.',
        },
        action: {
          ar: 'كل صباح 5 دقائق على المناطق المؤلمة',
          de: 'Tägl. 5 min auf schmerzhafte Stellen',
        },
        impact: { ar: '-30% ألم', de: '-30% Muskelkater' },
      },
      {
        title: {
          ar: 'الإفراط في التدريب يصيبك سنة',
          de: 'Übertraining kostet ein Jahr',
        },
        body: {
          ar: 'متلازمة OTS تظهر بعد 3-4 أشهر تدريب 6+ أيام أسبوعياً بدون راحة. التعافي يستغرق 6-12 شهراً. فقدان عضلات + هرمونات + مزاج.',
          de: 'OTS nach 3-4 Monaten 6+ Tage/Woche ohne Pause. Erholung dauert 6-12 Monate. Muskel-, Hormon-, Stimmungs-Verlust.',
        },
        action: {
          ar: 'يوم راحة كامل/أسبوع + أسبوع تخفيف كل 4 أسابيع',
          de: '1 Pausentag/Woche + Deload alle 4 Wochen',
        },
        impact: { ar: '+12 شهر تجنّب', de: '12 Monate vermeiden' },
      },
      {
        title: {
          ar: 'ساونا 4×/أسبوع = -40% أمراض قلب',
          de: 'Sauna 4×/Woche = -40% Herzkrankheiten',
        },
        body: {
          ar: 'دراسة فنلندية على 20 سنة: 4 جلسات ساونا أسبوعياً (20 دقيقة) تخفض أمراض القلب 40% والوفيّات 50%.',
          de: 'Finnische 20-Jahres-Studie: 4 Sauna-Sessions/Woche (20 min) senken Herzkrankheiten um 40%, Sterblichkeit um 50%.',
        },
        action: {
          ar: '20 دقيقة ساونا × 4 مرات/أسبوع، أو دش حار طويل',
          de: '20 min × 4×/Woche Sauna, oder lange heiße Dusche',
        },
        impact: { ar: '-50% وفيات', de: '-50% Mortalität' },
      },
    ],
  },

  /* ─────────── BODY COMPOSITION ─────────── */
  {
    category: 'body_comp',
    emoji: '🧬',
    color: '#ea580c',
    title: { ar: 'تركيب الجسم — العلم الحقيقي', de: 'Körperkomposition — die echte Wissenschaft' },
    description: {
      ar: 'الميزان يكذب. الفرق بين 75كغ و 12% دهون vs 75كغ و 25% دهون = جسمان مختلفان كلياً.',
      de: 'Die Waage lügt. 75 kg bei 12% Fett ≠ 75 kg bei 25% Fett — zwei verschiedene Körper.',
    },
    facts: [
      {
        title: {
          ar: 'البروتين يعجل الشبع 3×',
          de: 'Protein sättigt 3× stärker',
        },
        body: {
          ar: 'البروتين أكثر شبعاً من الكربوهيدرات أو الدهون (TEF أعلى أيضاً). 30غ بروتين كل وجبة = أقل جوع، عضلات أكثر.',
          de: 'Protein sättigt mehr als Carbs/Fett (höchster TEF). 30 g pro Mahlzeit = weniger Hunger, mehr Muskeln.',
        },
        action: {
          ar: '30غ بروتين كل وجبة، 4 وجبات يومياً',
          de: '30 g Protein × 4 Mahlzeiten/Tag',
        },
        impact: { ar: '+25% TEF', de: '+25% TEF' },
      },
      {
        title: {
          ar: 'العضلات تحرق دهناً وأنت نائم',
          de: 'Muskeln verbrennen Fett im Schlaf',
        },
        body: {
          ar: 'كل كيلو عضلات يحرق 13 سعرة/يوم في الراحة. 5 كغ عضلات إضافية = 65 سعرة/يوم = 3 كغ دهن/سنة.',
          de: 'Pro kg Muskel = 13 kcal/Tag in Ruhe. 5 kg mehr = 65 kcal/Tag = 3 kg Fett/Jahr.',
        },
        action: {
          ar: 'رفع أوزان 3-4×/أسبوع — أهم من الكارديو لخسارة الدهن',
          de: 'Krafttraining 3-4×/Wo > Cardio für Fettverlust',
        },
        impact: { ar: '+3كغ دهن خسارة/سنة', de: '+3 kg Fett verlieren/Jahr' },
      },
      {
        title: {
          ar: 'فقدان الدهن السريع = فقدان عضلات',
          de: 'Schneller Fettverlust = Muskelverlust',
        },
        body: {
          ar: 'عجز سعرات >25% يجعل الجسم يحرق العضلات لحماية الدهون. النتيجة: أرق، أضعف، أبطأ أيض. عاد الوزن خلال شهور.',
          de: 'Defizit >25% lässt Körper Muskeln verbrennen, um Fett zu schützen. Resultat: dünner, schwächer, langsamerer Stoffwechsel.',
        },
        action: {
          ar: 'عجز 300-500 سعرة فقط = خسارة 0.5-1كغ/أسبوع',
          de: 'Defizit nur 300-500 kcal = 0,5-1 kg/Woche',
        },
        myth: {
          ar: 'الحميات السريعة = الفشل السريع',
          de: 'Crash-Diäten = Crash-Erfolg',
        },
        impact: { ar: '90% فشل بعد 5 سنوات', de: '90% Misserfolg nach 5 Jahren' },
      },
      {
        title: {
          ar: 'دهن البطن أخطر من الكلي',
          de: 'Bauchfett gefährlicher als Gesamtfett',
        },
        body: {
          ar: 'الدهن الحشوي (حول الأعضاء) يفرز سيتوكينات التهابية، يزيد الإستروجين، يخفض T. شخص نحيل بدهن حشوي مرتفع = مريض.',
          de: 'Viszerales Fett schüttet Entzündungs-Zytokine aus, erhöht Östrogen, senkt T. Schlanker mit viel = krank.',
        },
        action: {
          ar: 'محيط خصر <90% من ارتفاعك (مثلاً 180سم → 90سم)',
          de: 'Taillenumfang <90% Körpergröße (180 cm → 90 cm)',
        },
        impact: { ar: '5× خطر السكر', de: '5× Diabetes-Risiko' },
      },
      {
        title: {
          ar: 'وزن الماء يخدع الميزان',
          de: 'Wassergewicht täuscht die Waage',
        },
        body: {
          ar: 'الكربوهيدرات تحبس 3غ ماء لكل 1غ. وجبة بيتزا = +2كغ في الميزان من ماء، لا دهن. لا تذعر.',
          de: 'Carbs binden 3 g Wasser pro g. Pizza = +2 kg auf Waage durch Wasser, nicht Fett.',
        },
        action: {
          ar: 'وزن صباحي بعد المرحاض، نفس الظروف، أسبوعياً لا يومياً',
          de: 'Morgens nach Toilette, gleiche Bedingungen, wöchentlich',
        },
        impact: { ar: '0 ذعر', de: '0 Panik' },
      },
    ],
  },

  /* ─────────── ENERGY ─────────── */
  {
    category: 'energy',
    emoji: '⚡',
    color: '#facc15',
    title: { ar: 'أنظمة الطاقة — وقود البطل', de: 'Energiesysteme — Treibstoff des Champions' },
    description: {
      ar: 'لجسمك 3 أنظمة طاقة. فهمها يوضح متى تأكل ماذا، ولماذا تتعب أحياناً ولا تتعب أحياناً.',
      de: 'Dein Körper hat 3 Energiesysteme. Verstehen erklärt, wann du was isst und warum du müde bist.',
    },
    facts: [
      {
        title: {
          ar: 'ATP-CP — الانفجار 0-10 ثوان',
          de: 'ATP-CP — Explosion 0-10 s',
        },
        body: {
          ar: 'كرياتين فوسفات يمدّك بطاقة فورية لـ 10 ثوان (سكوات ثقيل، عدو 50م). ينضب بسرعة، يتجدّد بـ 3-5 دقائق راحة.',
          de: 'Kreatinphosphat liefert Energie für 10 s (schwere Kniebeuge, 50 m Sprint). Erholt sich in 3-5 min.',
        },
        action: {
          ar: 'استخدم 3-5 دقائق راحة بين سيتات القوة الثقيلة',
          de: '3-5 min Pause zwischen schweren Kraft-Sätzen',
        },
        impact: { ar: '+25% قوة', de: '+25% Kraft' },
      },
      {
        title: {
          ar: 'الجلكلة اللاهوائية — 10ث-2 دقيقة',
          de: 'Anaerobe Glykolyse — 10 s-2 min',
        },
        body: {
          ar: 'حرق سكر بدون أكسجين. ينتج لاكتات (الحرق الذي تشعر به). HIIT و كروسفت يدرّبانه.',
          de: 'Zuckerverbrennung ohne O2 — produziert Laktat (das Brennen). HIIT + CrossFit trainieren das.',
        },
        action: {
          ar: 'HIIT 2× أسبوعياً (30 ث عمل / 30 ث راحة × 8)',
          de: 'HIIT 2×/Wo (30s/30s × 8)',
        },
        impact: { ar: '+15% VO2max', de: '+15% VO2max' },
      },
      {
        title: {
          ar: 'الأكسدة الهوائية — أكثر من 2 دقيقة',
          de: 'Aerob — über 2 min',
        },
        body: {
          ar: 'مع الأكسجين تحرق الجسم سكراً ودهوناً. الكفاءة عالية والاستمرار طويل. الجري الطويل، السباحة، الدراجة.',
          de: 'Mit O2 — verbrennt Zucker + Fett. Sehr effizient. Langlauf, Schwimmen, Radfahren.',
        },
        action: {
          ar: 'كارديو متوسط 2-3×/أسبوع لـ 30-45 دقيقة',
          de: 'Mittl. Cardio 2-3×/Wo, 30-45 min',
        },
        impact: { ar: '+30% قاعدة هوائية', de: '+30% aerobe Basis' },
      },
      {
        title: {
          ar: 'الميتوكوندريا = طاقة',
          de: 'Mitochondrien = Energie',
        },
        body: {
          ar: 'الميتوكوندريا "محطة الطاقة" في خلاياك. كثرتها وكفاءتها = طاقتك. تتعدّد مع تمارين التحمل، الصيام، البرد، CoQ10.',
          de: 'Mitochondrien = Kraftwerk. Anzahl + Effizienz = deine Energie. Wachsen durch Ausdauer, Fasten, Kälte, CoQ10.',
        },
        action: {
          ar: 'مزج HIIT + كارديو + صيام أحياناً + CoQ10',
          de: 'Mix HIIT + Cardio + gelegentliches Fasten + CoQ10',
        },
        impact: { ar: '+50% طاقة خلوية', de: '+50% Zellenergie' },
      },
      {
        title: {
          ar: 'الكافيين يطلق دهنك للحرق',
          de: 'Koffein setzt Fett zur Verbrennung frei',
        },
        body: {
          ar: 'كافيين قبل التمرين بـ 30 دقيقة (3-5مغ/كغ) يحرّر أحماض دهنية حرة، يحسّن الأداء 5-7%، يقلّل الألم.',
          de: 'Koffein 30 min vor Training (3-5 mg/kg) setzt freie Fettsäuren frei, verbessert Leistung um 5-7%.',
        },
        action: {
          ar: '200-400مغ قبل التمرين الصباحي',
          de: '200-400 mg vor Morgentraining',
        },
        impact: { ar: '+7% أداء', de: '+7% Leistung' },
      },
    ],
  },

  /* ─────────── LONGEVITY ─────────── */
  {
    category: 'longevity',
    emoji: '🌟',
    color: '#a855f7',
    title: { ar: 'طول العمر — ابني الـ 80 الآن', de: 'Langlebigkeit — baue jetzt für die 80er' },
    description: {
      ar: 'أنت في العشرين، لكن خلاياك تخزّن قراراتك. ابتعاد عن الكحول والتدخين، تمرين منتظم، نوم جيّد، علاقات قوية = +10 سنوات صحية.',
      de: 'Du bist 20, aber deine Zellen merken sich alle Entscheidungen. Kein Alkohol/Tabak, Sport, Schlaf, Beziehungen = +10 gesunde Jahre.',
    },
    facts: [
      {
        title: {
          ar: 'العلاقات القوية = أقوى مؤشّر طول عمر',
          de: 'Beziehungen = stärkster Lebensspanne-Faktor',
        },
        body: {
          ar: 'دراسة هارفارد 80 سنة: العلاقات الاجتماعية القوية أهمّ من الجينات والمال والتمارين في تحديد طول العمر السعيد.',
          de: 'Harvard 80-Jahres-Studie: Beziehungen wichtiger als Gene, Geld, Sport für ein langes glückliches Leben.',
        },
        action: {
          ar: 'استثمر في 3-5 صداقات عميقة، لا 200 معروف',
          de: 'Investiere in 3-5 tiefe Freundschaften, nicht 200 Bekannte',
        },
        impact: { ar: '+50% طول عمر', de: '+50% Lebenserwartung' },
      },
      {
        title: {
          ar: 'كل مشروب كحول يقطع 15 دقيقة من عمرك',
          de: 'Jeder Drink kürzt das Leben um 15 min',
        },
        body: {
          ar: 'بحث 2023 (لانسيت): كل وحدة كحول (10غ) = خسارة 15 دقيقة عمر متوقع. لا توجد كمية آمنة. حتى "كأس صحي" خرافة.',
          de: 'Lancet 2023: Jede Alkoholeinheit (10 g) = -15 min Lebenserwartung. Kein "gesundes Glas".',
        },
        action: {
          ar: '0 كحول هو الحدّ الصحي علمياً',
          de: '0 Alkohol = wissenschaftlich gesund',
        },
        myth: {
          ar: '"كأس نبيذ يومياً صحي" — أُسطورة فُنّدت 2018',
          de: '"Tägliches Glas Wein" — Mythos seit 2018 widerlegt',
        },
        impact: { ar: '-15 دقيقة/مشروب', de: '-15 min/Drink' },
      },
      {
        title: {
          ar: 'الزواكر التيلوميرية تتآكل بالضغط',
          de: 'Telomere schrumpfen durch Stress',
        },
        body: {
          ar: 'التيلوميرز هي "أغطية" الكروموسومات. تقصر مع كل انقسام خلوي. الإجهاد المزمن يسرّع تقصيرها 10×. تأمّل يطيلها فعلياً.',
          de: 'Telomere = Kappen der Chromosomen. Werden bei Zellteilung kürzer. Chron. Stress beschleunigt das 10×. Meditation verlängert sie.',
        },
        action: {
          ar: 'تأمّل 10 دقائق يومياً (Headspace, Calm, أو فقط تنفّس)',
          de: '10 min Meditation tägl. (auch nur Atmen)',
        },
        impact: { ar: '+5 سنوات بيولوجية', de: '+5 biologische Jahre' },
      },
      {
        title: {
          ar: 'الالتهام الذاتي = شباب خلوي',
          de: 'Autophagie = zelluläre Jugend',
        },
        body: {
          ar: 'الجسم يمتص ويعيد تدوير الخلايا التالفة عند الجوع. صيام 16+ ساعة يطلق الالتهام الذاتي = تنظيف الفضلات الخلوية.',
          de: 'Körper recycelt geschädigte Zellen beim Fasten. 16+ h aktiviert Autophagie = Zellmüll-Beseitigung.',
        },
        action: {
          ar: 'صيام 16:8 مرّتين أسبوعياً',
          de: '16:8 Fasten 2×/Woche',
        },
        impact: { ar: 'تجديد خلوي', de: 'Zellverjüngung' },
      },
      {
        title: {
          ar: 'قاعدة Blue Zones',
          de: 'Blue-Zones-Regel',
        },
        body: {
          ar: '5 مناطق في العالم يعيش سكانها لـ 100+ بصحة. مشتركاتهم: حركة طبيعية، طعام نباتي 80%، توقّف عند 80% شبع، علاقات قوية، هدف.',
          de: '5 Regionen: Bewohner werden 100+ gesund. Gemeinsam: natürl. Bewegung, 80% Pflanzen, Essen bis 80% satt, Beziehungen, Sinn.',
        },
        action: {
          ar: 'طبّق 3 من هذه القواعد لتعيش 10 سنوات أطول',
          de: '3 Regeln umsetzen = 10 Jahre länger',
        },
        impact: { ar: '+10 سنوات', de: '+10 Jahre' },
      },
    ],
  },

  /* ─────────── GUT & MICROBIOME ─────────── */
  {
    category: 'gut',
    emoji: '🌱',
    color: '#84cc16',
    title: { ar: 'الأمعاء — دماغك الثاني', de: 'Darm — dein zweites Gehirn' },
    description: {
      ar: 'أمعاؤك تحتوي 100 تريليون كائن يزن مجموعها 2 كغ — يصنعون 90% من السيروتونين، ينظّمون المناعة والوزن والمزاج. صحة الأمعاء = صحة الجسم.',
      de: '100 Billionen Mikroben, 2 kg schwer — sie produzieren 90 % des Serotonins, steuern Immunsystem, Gewicht und Stimmung.',
    },
    facts: [
      {
        title: { ar: '30 نوع نبات أسبوعياً', de: '30 Pflanzen pro Woche' },
        body: { ar: 'دراسة American Gut Project: من يأكل 30 نوع نبات (خضار/فواكه/بقوليات/توابل/مكسرات) أسبوعياً يملك تنوعاً ميكروبيّاً أعلى بـ70% ممن يأكل <10.', de: 'American Gut Project: 30 verschiedene Pflanzen/Woche → 70 % höhere mikrobielle Vielfalt als <10.' },
        action: { ar: 'اكتب 30 نبات مختلف على الثلاجة واشطبهم أسبوعياً', de: 'Notiere 30 Pflanzen an den Kühlschrank und hake ab' },
        impact: { ar: '+70% تنوّع ميكروبي', de: '+70 % Vielfalt' },
      },
      {
        title: { ar: 'الألياف تُطعم الجراثيم النافعة', de: 'Ballaststoffe füttern gute Bakterien' },
        body: { ar: 'الألياف تتحوّل في القولون إلى أحماض دهنية قصيرة السلسلة (SCFA) — تُقلّل الالتهاب، تُحسّن المزاج، وتحرق الدهون. الحد الأدنى: 30 غ/يوم.', de: 'Ballaststoffe → kurzkettige Fettsäuren (SCFA): weniger Entzündung, bessere Stimmung, Fettverbrennung. Ziel: 30 g/Tag.' },
        action: { ar: 'أضف بذور شيا، شوفان، بقوليات، فاكهة بقشرها', de: 'Chia, Hafer, Hülsenfrüchte, Obst mit Schale' },
        impact: { ar: '-40% التهاب معوي', de: '-40 % Darmentzündung' },
      },
      {
        title: { ar: 'البروبيوتيك الطبيعي > الحبوب', de: 'Fermentierte Lebensmittel > Kapseln' },
        body: { ar: 'دراسة ستانفورد: 6 أسابيع من الأطعمة المخمّرة (كفير، كيمتشي، مخلل ملفوف) رفعت التنوّع الميكروبي وخفضت مؤشرات الالتهاب أكثر من حبوب البروبيوتيك.', de: 'Stanford: 6 Wochen fermentierte Lebensmittel (Kefir, Kimchi, Sauerkraut) schlagen Kapseln bei Vielfalt und Entzündung.' },
        action: { ar: 'حصة يومية من طعام مخمّر — كفير، لبن رائب حيّ، كيمتشي', de: 'Täglich fermentiertes: Kefir, Joghurt, Kimchi' },
        impact: { ar: 'مناعة أقوى', de: 'Stärkeres Immunsystem' },
      },
      {
        title: { ar: 'المحلّيات الصناعية تدمّر الفلورا', de: 'Süßstoffe zerstören die Flora' },
        body: { ar: 'السكرالوز والأسبرتام يخفضون بكتيريا Bifidobacterium 40% خلال أسبوعين، ويرفعان مقاومة الأنسولين رغم صفر سعرات.', de: 'Sucralose/Aspartam senken Bifidobacterium 40 % in 2 Wochen — Insulinresistenz steigt trotz 0 kcal.' },
        action: { ar: 'استبدل بالستيفيا أو راهبات الفاكهة (Monk fruit)', de: 'Stevia oder Mönchsfrucht statt Süßstoffe' },
        myth: { ar: '"دايت زيرو" ليس بريئاً على الأمعاء', de: '"Zero"-Getränke sind nicht neutral' },
        impact: { ar: '+40% بكتيريا نافعة', de: '+40 % gute Bakterien' },
      },
      {
        title: { ar: 'الصيام يُصلح جدار الأمعاء', de: 'Fasten repariert die Darmwand' },
        body: { ar: '14-16 ساعة صيام تنشّط MMC (موجات التنظيف المعوية) وتُصلح الخلايا الطلائية. النتيجة: أقل انتفاخ، أقل حساسية، امتصاص أفضل.', de: '14-16 h Fasten aktiviert MMC (Reinigungswellen) und repariert Epithel — weniger Blähungen, bessere Aufnahme.' },
        action: { ar: 'توقّف عن الأكل بعد العشاء وامدد الفطور 14 ساعة', de: 'Kein Snack nach dem Abendessen — 14 h bis Frühstück' },
        impact: { ar: '-60% انتفاخ', de: '-60 % Blähungen' },
      },
      {
        title: { ar: 'الإجهاد يُسرِّب الأمعاء', de: 'Stress macht den Darm undicht' },
        body: { ar: 'الكورتيزول المرتفع يفكّك البروتينات التي تربط خلايا الأمعاء (tight junctions) — يمرّ الطعام غير المهضوم للدم ويشعل الالتهاب الجهازي (Leaky Gut).', de: 'Cortisol lockert Tight Junctions — unverdaute Partikel gelangen ins Blut, systemische Entzündung (Leaky Gut).' },
        action: { ar: '10 دقائق تنفس عميق قبل كل وجبة', de: '10 min tiefe Atmung vor jeder Mahlzeit' },
        impact: { ar: 'أمعاء محكمة', de: 'Dichter Darm' },
      },
    ],
  },

  /* ─────────── HYDRATION ─────────── */
  {
    category: 'hydration',
    emoji: '💧',
    color: '#0ea5e9',
    title: { ar: 'الترطيب — كل خلية تعطش', de: 'Hydration — jede Zelle dürstet' },
    description: {
      ar: 'الدماغ 76% ماء، العضلة 75%، الدم 82%. نقص 2% فقط يخفض الأداء 20% ويشوّه المزاج. الماء ليس رفاهية — إنه بروتوكول.',
      de: 'Gehirn 76 %, Muskel 75 %, Blut 82 % Wasser. −2 % → −20 % Leistung. Wasser ist Protokoll, nicht Luxus.',
    },
    facts: [
      {
        title: { ar: 'قاعدة 35 مل/كغ', de: 'Regel: 35 ml/kg' },
        body: { ar: 'الاحتياج الأساسي = 35 مل × وزنك بالكيلو. رياضي 80 كغ = 2.8 لتر + 500 مل لكل ساعة تمرين + 500 مل لكل ساعة حرارة.', de: 'Grundbedarf = 35 ml × kg. 80 kg → 2,8 l + 500 ml pro Trainingsstunde + 500 ml Hitze/h.' },
        action: { ar: 'زجاجة 750 مل × 4 يومياً — واحدة قبل كل وجبة', de: '4× 750 ml täglich — eine vor jeder Mahlzeit' },
        impact: { ar: '+20% أداء ذهني', de: '+20 % Kognition' },
      },
      {
        title: { ar: 'الكهارل قبل الماء عند الاستيقاظ', de: 'Elektrolyte zuerst am Morgen' },
        body: { ar: 'استيقظت مُجَفَّفاً بعد 8 ساعات صيام. ماء عادي فقط يخفف الصوديوم ويسبب دوخة. الحل: قرصة ملح بحر + عصير ليمون قبل القهوة.', de: 'Nach 8 h Fasten dehydriert — reines Wasser verdünnt Natrium. Lösung: Prise Meersalz + Zitrone vor dem Kaffee.' },
        action: { ar: '500 مل ماء + ¼ ملعقة ملح + ليمون فور الاستيقاظ', de: '500 ml Wasser + ¼ TL Salz + Zitrone direkt nach dem Aufstehen' },
        impact: { ar: 'يقظة فورية', de: 'Sofortige Wachheit' },
      },
      {
        title: { ar: 'لون البول = المؤشر الصادق', de: 'Urinfarbe = ehrlicher Indikator' },
        body: { ar: 'أصفر شاحب (limonade فاتحة) = مثالي. غامق = نقص. شفاف تماماً = إفراط قد يغسل الكهارل.', de: 'Hellgelb = optimal. Dunkel = Mangel. Farblos = Übermaß, wäscht Elektrolyte aus.' },
        action: { ar: 'راقب لون البول 3 مرات يومياً وعدّل', de: 'Farbe 3× am Tag checken und anpassen' },
        impact: { ar: 'تعديل دقيق', de: 'Feine Steuerung' },
      },
      {
        title: { ar: 'العطش = تأخّرت', de: 'Durst = zu spät' },
        body: { ar: 'حين تحس بالعطش تكون فقدت 1-2% من ماء الجسم — والأداء بدأ يتراجع فعلاً. اشرب بجدول، لا بشعور.', de: 'Wenn du Durst spürst, hast du bereits 1-2 % verloren — Leistung sinkt. Trink nach Plan, nicht Gefühl.' },
        action: { ar: 'كل ساعة: 250 مل — منبّه على الساعة', de: 'Alle 60 min 250 ml — Timer nutzen' },
        impact: { ar: 'ثبات أداء', de: 'Stabile Leistung' },
      },
      {
        title: { ar: 'الكافيين ليس عدو الترطيب', de: 'Koffein ist nicht der Feind' },
        body: { ar: 'الاعتقاد بأن القهوة تُجفّف قديم. الدراسات الحديثة: القهوة المعتدلة (<400 مغ) تُحسب ضمن الترطيب الصافي — لكن ليست بديلاً عن الماء.', de: 'Alter Mythos widerlegt: <400 mg Koffein zählt zur Netto-Hydration — kein Ersatz für Wasser.' },
        action: { ar: 'قهوة صباحاً نعم، مع 500 مل ماء بجانبها', de: 'Kaffee ok, aber 500 ml Wasser dazu' },
        myth: { ar: 'القهوة لا تُجفّف — تعتبر ماء', de: 'Kaffee zählt zur Wassermenge' },
        impact: { ar: 'ترطيب صافي', de: 'Netto-Hydration' },
      },
      {
        title: { ar: 'الماء البارد يحرق أكثر', de: 'Kaltes Wasser verbrennt mehr' },
        body: { ar: 'شرب 500 مل ماء بارد يحرق 25 سعرة إضافية لتسخينه لدرجة الجسم، ويرفع الأيض 30% لمدة 40 دقيقة.', de: '500 ml kaltes Wasser: +25 kcal zum Aufheizen, +30 % Stoffwechsel für 40 min.' },
        action: { ar: 'كوب ماء بارد قبل كل وجبة', de: 'Glas kaltes Wasser vor jeder Mahlzeit' },
        impact: { ar: '+30% أيض 40 دقيقة', de: '+30 % Stoffwechsel/40 min' },
      },
    ],
  },

  /* ─────────── BREATH ─────────── */
  {
    category: 'breath',
    emoji: '🌬️',
    color: '#22d3ee',
    title: { ar: 'التنفس — التحكم الوحيد بالجهاز العصبي', de: 'Atmung — der einzige Nerven-Fernbedienung' },
    description: {
      ar: 'التنفس هو الوظيفة الوحيدة الحيوية التي تعمل تلقائياً ويمكنك التحكم بها. كل شهيق يرفع ضربات القلب، وكل زفير يخفضها. أنت تملك مفتاح جهازك العصبي.',
      de: 'Atmung ist die einzige vitale Funktion, die automatisch läuft und bewusst steuerbar ist. Einatmen ↑ Herzrate, Ausatmen ↓ — der Schalter für dein Nervensystem.',
    },
    facts: [
      {
        title: { ar: 'تنفّس بالأنف فقط', de: 'Nur durch die Nase atmen' },
        body: { ar: 'الأنف يُرشّح، يُدفّئ، ويُنتج أكسيد النيتريك (NO) الذي يوسّع الأوعية ويرفع امتصاص الأكسجين 20%. التنفس بالفم = فقدان هذه المكاسب.', de: 'Nase filtert, wärmt, produziert NO → weitet Gefäße, +20 % O₂-Aufnahme. Mundatmung verliert das.' },
        action: { ar: 'اقفل فمك حتى أثناء التمرين — إن اضطررت للفم، خفّف الشدّة', de: 'Mund zu, auch beim Training — sonst Intensität senken' },
        impact: { ar: '+20% أكسجين خلوي', de: '+20 % O₂-Aufnahme' },
      },
      {
        title: { ar: 'تنفس صندوقي 4-4-4-4', de: 'Box Breathing 4-4-4-4' },
        body: { ar: 'يستخدمه القوات الخاصة الأمريكية. 4 ثوان شهيق، 4 حبس، 4 زفير، 4 حبس. 4 دقائق تكفي لخفض الكورتيزول 30% وتصفية الذهن.', de: 'US Navy SEALs Standard: 4-4-4-4. 4 min → Cortisol −30 %, klarer Kopf.' },
        action: { ar: 'قبل أي موقف ضاغط: 4 جولات صندوقية', de: 'Vor Stresssituation: 4 Runden Box' },
        impact: { ar: '-30% كورتيزول', de: '-30 % Cortisol' },
      },
      {
        title: { ar: 'التنهيدة المزدوجة', de: 'Physiological Sigh' },
        body: { ar: 'مختبر أندرو هيوبرمان: شهيقان متتاليان قصيران عبر الأنف + زفير طويل ممتد عبر الفم = الطريقة الأسرع لهدوء الجهاز العصبي (خلال 30 ثانية).', de: 'Huberman-Labor: 2 kurze Nasenzüge + langer Mundausatmer — schnellste Beruhigung (<30 s).' },
        action: { ar: 'كرر 3 مرات عند القلق — مفعول فوري', de: '3× wiederholen bei Anspannung' },
        impact: { ar: 'هدوء خلال 30 ث', de: 'Beruhigung in 30 s' },
      },
      {
        title: { ar: 'الزفير أطول من الشهيق', de: 'Ausatmen länger als Einatmen' },
        body: { ar: 'زفير أطول (2:1) ينشّط العصب المُبهم ويرفع HRV. مثال: شهيق 4 ثوان، زفير 8. هذه هي "قاعدة الاسترخاء".', de: 'Ausatmen doppelt so lang (2:1) aktiviert Vagusnerv, HRV steigt.' },
        action: { ar: 'شهيق 4، زفير 8 — 5 دقائق قبل النوم', de: 'Ein 4, aus 8 — 5 min vor dem Schlaf' },
        impact: { ar: '+40% HRV', de: '+40 % HRV' },
      },
      {
        title: { ar: 'حبس النفس يبني CO₂ Tolerance', de: 'Atempausen bauen CO₂-Toleranz' },
        body: { ar: 'قدرتك على تحمّل CO₂ العالي = ثباتك تحت الضغط. اختبار BOLT: بعد زفير عادي، احبس. <20 ث = ضعيف، >40 ث = ممتاز.', de: 'CO₂-Toleranz = Ruhe unter Druck. BOLT-Test: nach Ausatmen halten. <20 s schwach, >40 s exzellent.' },
        action: { ar: 'يومياً: 5 جولات حبس 20-40 ث بعد زفير', de: 'Täglich 5 Runden halten (20-40 s)' },
        impact: { ar: 'اتزان تحت ضغط', de: 'Ruhe unter Druck' },
      },
      {
        title: { ar: 'Wim Hof للطاقة الصباحية', de: 'Wim Hof für Morgenenergie' },
        body: { ar: '30 نفس عميق + حبس بعد الزفير + شهيق طويل × 3 جولات = يرفع الأدرينالين طبيعياً، يقوّي المناعة، ويوقظك أكثر من القهوة.', de: '30× tief + Halten + langer Ein × 3 → natürlich Adrenalin, Immunboost, wacher als Kaffee.' },
        action: { ar: 'أول 15 دقيقة بعد الاستيقاظ — ليس بعد الأكل', de: 'Erste 15 min am Morgen, nicht nach dem Essen' },
        impact: { ar: 'يقظة بلا كافيين', de: 'Wachheit ohne Kaffee' },
      },
    ],
  },

  /* ─────────── LIGHT & CIRCADIAN ─────────── */
  {
    category: 'light',
    emoji: '☀️',
    color: '#f59e0b',
    title: { ar: 'الضوء — الساعة الرئيسية للجسم', de: 'Licht — die Hauptuhr deines Körpers' },
    description: {
      ar: 'الشمس ليست فقط فيتامين D. ضوء الصباح يضبط 24 ساعة قادمة: نوم، هرمونات، مزاج، جوع، أداء. أخطر ما فعلته الحداثة: عزلنا عن ضوء الشمس.',
      de: 'Sonnenlicht = mehr als Vitamin D. Morgenlicht kalibriert 24 h: Schlaf, Hormone, Stimmung, Hunger, Leistung.',
    },
    facts: [
      {
        title: { ar: '10 دقائق شمس صباحية قبل 9 صباحاً', de: '10 min Sonne vor 9 Uhr' },
        body: { ar: 'مختبر هيوبرمان: 10 دقائق ضوء شمس مباشر على العينين (بدون نظارة) خلال أول ساعة يقظة يضبط الميلاتونين والكورتيزول لبقية اليوم.', de: 'Huberman-Lab: 10 min direktes Sonnenlicht (ohne Brille) in der ersten Wachstunde kalibriert Melatonin & Cortisol.' },
        action: { ar: 'امشِ خارجاً 10 دقائق فور الاستيقاظ — لا تنظر للشمس مباشرة', de: '10 min draußen laufen — nicht direkt in die Sonne schauen' },
        impact: { ar: 'نوم أعمق ليلاً', de: 'Tieferer Schlaf abends' },
      },
      {
        title: { ar: 'شمس الظهيرة تبني التستوستيرون', de: 'Mittagssonne baut Testosteron' },
        body: { ar: 'دراسة: 15 دقيقة شمس بين 11-14 على الصدر والذراعين ترفع التستوستيرون 120% وفيتامين D بلا مكمّلات.', de: '15 min Sonne 11-14 Uhr auf Brust/Arme: Testosteron +120 %, Vitamin D ohne Kapseln.' },
        action: { ar: 'استراحة غداء خارجية 15 دقيقة بأقل ملابس ممكنة', de: 'Mittagspause draußen mit möglichst freier Haut' },
        impact: { ar: '+120% تستوستيرون', de: '+120 % Testosteron' },
      },
      {
        title: { ar: 'الغروب يُشعر الدماغ بالاسترخاء', de: 'Sonnenuntergang signalisiert Ruhe' },
        body: { ar: 'الضوء الأحمر/البرتقالي للغروب يُبطّئ إنتاج الكورتيزول ويبدأ الميلاتونين. تفويت الغروب = دماغ يظنّ الوقت ظهراً.', de: 'Rot/Orange des Sonnenuntergangs stoppt Cortisol, startet Melatonin. Verpasst = Gehirn glaubt Mittag.' },
        action: { ar: 'دقيقتان نظر أفقي للغروب من نافذتك يكفيان', de: '2 min horizontal Richtung Sonnenuntergang schauen' },
        impact: { ar: 'ميلاتونين طبيعي', de: 'Natürliches Melatonin' },
      },
      {
        title: { ar: 'الإضاءة الليلية القوية تُشيخك', de: 'Helles Licht abends beschleunigt Alterung' },
        body: { ar: 'الإضاءة السقفية القوية بعد الغروب تُثبّط الميلاتونين — الذي هو مضاد أكسدة أقوى من فيتامين C 200 مرة. الفقد اليومي = شيخوخة خلوية.', de: 'Grelles Deckenlicht nach Sonnenuntergang stoppt Melatonin (Antioxidans, 200× stärker als Vit. C). Tägl. Verlust = Zellalterung.' },
        action: { ar: 'بعد الغروب: مصابيح دافئة منخفضة عند مستوى العين', de: 'Warmes, niedrig gesetztes Licht nach Sonnenuntergang' },
        impact: { ar: 'ميلاتونين +40%', de: '+40 % Melatonin' },
      },
      {
        title: { ar: 'الظلام أثناء النوم قاعدة صارمة', de: 'Absolute Dunkelheit beim Schlafen' },
        body: { ar: 'أي ضوء (LED للشاحن، ضوء الشارع) على جلدك أثناء النوم يخفض جودة النوم العميق 20% ويرفع سكر الدم صباحاً.', de: 'Jedes Licht (LEDs, Straße) auf Haut senkt Tiefschlaf 20 % und erhöht Nüchternzucker.' },
        action: { ar: 'قناع نوم + شرائط سوداء على أي LED في الغرفة', de: 'Schlafmaske + schwarzes Tape auf LEDs' },
        impact: { ar: '+20% نوم عميق', de: '+20 % Tiefschlaf' },
      },
      {
        title: { ar: 'شمس تحت العين في الشتاء', de: 'Wintersonne trotzdem holen' },
        body: { ar: 'حتى في يوم غائم، الضوء الخارجي أقوى بـ100 ضعف من ضوء المكتب الداخلي. لا تعذر — 20 دقيقة خارج البيت شتاءً > ساعتان داخل.', de: 'Selbst bedeckt: draußen 100× heller als Büro. 20 min Winter draußen > 2 h drinnen.' },
        action: { ar: 'مشية خارجية إجبارية يومياً حتى في البرد', de: 'Tägliche Pflicht: Draußen-Spaziergang, auch im Winter' },
        impact: { ar: 'لا اكتئاب موسمي', de: 'Kein Winterblues' },
      },
    ],
  },

  /* ─────────── COLD & HEAT ─────────── */
  {
    category: 'cold_heat',
    emoji: '🧊',
    color: '#38bdf8',
    title: { ar: 'البرد والحرارة — إجهاد نافع', de: 'Kälte & Hitze — heilsamer Stress' },
    description: {
      ar: 'التعرض المتحكّم للبرد والسخونة (Hormesis) يقوّي الميتوكوندريا، يرفع دوبامين النقي 250%، ويطيل العمر. أقوى أداتين مجانيتين.',
      de: 'Kontrollierter Kälte/Hitze-Reiz (Hormesis) stärkt Mitochondrien, +250 % Dopamin, Langlebigkeit. Zwei mächtigste kostenlose Tools.',
    },
    facts: [
      {
        title: { ar: 'ماء بارد يرفع الدوبامين 250%', de: 'Kaltes Wasser +250 % Dopamin' },
        body: { ar: 'دراسة: 3 دقائق في ماء 11°م ترفع الدوبامين 250% والنورأدرينالين 530% — أثر يدوم 6 ساعات بدون كافيين ولا سكر.', de: '3 min bei 11 °C: Dopamin +250 %, Noradrenalin +530 % — hält 6 h ohne Koffein.' },
        action: { ar: 'ابدأ بـ 30 ث دش بارد نهاية استحمامك اليومي', de: 'Starte mit 30 s kalter Dusche am Ende' },
        impact: { ar: '+250% دوبامين', de: '+250 % Dopamin' },
      },
      {
        title: { ar: 'الساونا تخفض وفيات القلب 63%', de: 'Sauna −63 % Herztodesrisiko' },
        body: { ar: 'دراسة فنلندية (KIHD, 2,315 رجل): 4-7 مرات ساونا أسبوعياً خفضت وفيات القلب 63% وكل الأسباب 40%.', de: 'KIHD-Studie: 4-7× Sauna/Woche → Herztod −63 %, Gesamtmortalität −40 %.' },
        action: { ar: '20 دقيقة × 3-4 مرات/أسبوع عند 80°م', de: '20 min × 3-4×/Wo bei 80 °C' },
        impact: { ar: '-63% وفيات قلبية', de: '-63 % Herztod' },
      },
      {
        title: { ar: 'صدمة البرد تحرق الدهون البنية', de: 'Kälteschock aktiviert braunes Fett' },
        body: { ar: 'دهون بنية = ميتوكوندريا كثيفة تحرق سعرات كتدفئة. 15 دقيقة برد أسبوعياً تضاعف كتلة الدهون البنية وترفع الحرق البازلي 15%.', de: 'Braunes Fett = Mitochondrien-reich, verbrennt Kalorien als Wärme. 15 min Kälte/Wo verdoppelt braunes Fett, +15 % Grundumsatz.' },
        action: { ar: 'حمّام بارد 2-3 دقائق × 3/أسبوع', de: 'Kältebad 2-3 min × 3/Wo' },
        impact: { ar: '+15% حرق بازلي', de: '+15 % Grundumsatz' },
      },
      {
        title: { ar: 'الحرارة تُصلّب بروتينات الصدمة الحرارية', de: 'Hitze aktiviert Heat-Shock-Proteins' },
        body: { ar: 'HSP70 يُصلح البروتينات التالفة ويحمي الخلايا. الساونا ترفعها 50% — نفس أثر تمرين مقاومة على العضلات.', de: 'HSP70 repariert Proteine, schützt Zellen. Sauna +50 % — wie Krafttraining für Muskeln.' },
        action: { ar: 'ساونا بعد التمرين تُضاعف نمو العضل', de: 'Sauna nach Training verdoppelt Muskelwachstum' },
        impact: { ar: '+50% HSP70', de: '+50 % HSP70' },
      },
      {
        title: { ar: 'التوقيت مهم', de: 'Zeitpunkt ist entscheidend' },
        body: { ar: 'برد بعد تمرين المقاومة يُقلّل النمو 30% (يوقف الالتهاب النافع). لكن برد قبل التمرين أو في يوم راحة = فوائد كاملة بلا خسارة.', de: 'Kälte NACH Krafttraining −30 % Wachstum (stoppt nützliche Entzündung). VOR oder Ruhetag = alle Vorteile.' },
        action: { ar: 'برد قبل التمرين، وساونا بعده', de: 'Kälte vorher, Sauna nachher' },
        myth: { ar: 'ليس كل برد بعد تمرين مفيداً', de: 'Nicht jeder Eis-Reiz nach Training gut' },
        impact: { ar: 'نمو عضلي كامل', de: 'Voller Muskelaufbau' },
      },
      {
        title: { ar: 'التبديل بارد↔ساخن يبني الأوعية', de: 'Kontrastbäder trainieren Gefäße' },
        body: { ar: '3 دورات (3 دقائق ساخن + 30 ث بارد) تُدرّب الأوعية على التوسّع والانقباض — كتمرين قلب داخلي. يخفض ضغط الدم 12/8.', de: '3 Zyklen (3 min heiß + 30 s kalt) trainieren Gefäße wie Herztraining — Blutdruck −12/8.' },
        action: { ar: 'نهاية استحمامك: 3 دورات ساخن-بارد', de: 'Am Duschende: 3 Zyklen heiß-kalt' },
        impact: { ar: '-12 ضغط انقباضي', de: '-12 mmHg' },
      },
    ],
  },

  /* ─────────── MOBILITY ─────────── */
  {
    category: 'mobility',
    emoji: '🌀',
    color: '#a855f7',
    title: { ar: 'الحركة والمرونة — العمر البيولوجي الحقيقي', de: 'Mobilität — dein biologisches Alter' },
    description: {
      ar: 'قوة العضلة تخدعك — قد تكون قوياً وأنت مُتيبّس. المرونة والمدى الحركي هما ما يفصل جسم 25 عن جسم 45. الجلوس هو العدو الأول.',
      de: 'Kraft täuscht — man kann stark und starr sein. Beweglichkeit trennt einen 25er von einem 45er Körper. Sitzen ist Feind Nr. 1.',
    },
    facts: [
      {
        title: { ar: 'الجلوس يُقصّر ثنية الحوض', de: 'Sitzen verkürzt den Hüftbeuger' },
        body: { ar: 'كل ساعة جلوس تقصّر عضلة Iliopsoas بضعة مليمترات — بعد سنوات: انحناء أمامي، آلام ظهر، ضعف تمديد الحوض في التمرين والجنس.', de: 'Jede Sitzstunde verkürzt Iliopsoas — Jahre später: Hyperlordose, Rückenschmerz, schwache Hüftstreckung.' },
        action: { ar: 'Couch stretch يومياً — 2 دقيقة لكل جانب', de: 'Couch Stretch täglich — 2 min pro Seite' },
        impact: { ar: 'ظهر خالٍ من الآلام', de: 'Rücken schmerzfrei' },
      },
      {
        title: { ar: 'الجلوس القرفصائي العميق', de: 'Tiefe Hocke — Deep Squat' },
        body: { ar: '95% من أطفال 3 سنوات يجلسون قرفصائياً كاملاً. 5% من بالغي الغرب يستطيعون. القدرة على الجلوس بكعب أرضي = مؤشر مرونة كامل.', de: '95 % der 3-Jährigen können tiefe Hocke, nur 5 % westlicher Erwachsener. Ferse am Boden = Mobilitätsmarker.' },
        action: { ar: '5 دقائق يومياً قرفصاء عميق — قسّمها', de: '5 min täglich tiefe Hocke, verteilt' },
        impact: { ar: 'حوض وكاحل حرّان', de: 'Hüfte + Sprunggelenk frei' },
      },
      {
        title: { ar: 'الرقبة الأمامية = صداع مزمن', de: 'Vorwärts-Kopfhaltung = Kopfschmerz' },
        body: { ar: 'كل 2.5 سم إمالة أمامية للرأس = 4.5 كغ ضغط إضافي على الفقرات العلوية. صداع، شد، دوار، وجيوب أنفية مسدودة.', de: 'Jeder 2,5 cm Kopf-Vorwärts = 4,5 kg extra Last. Kopfschmerz, Nackenverspannung, Sinusdruck.' },
        action: { ar: 'شد ذقن (Chin tucks) 30 مرة يومياً', de: 'Chin Tucks 30× täglich' },
        impact: { ar: '-70% صداع رقبي', de: '-70 % Nackenkopfschmerz' },
      },
      {
        title: { ar: 'الكاحل مفتاح كل شيء', de: 'Sprunggelenk = Master-Schlüssel' },
        body: { ar: 'كاحل مُتيبّس يجبر الركبة، الحوض، ثم الظهر على التعويض. اختبار: قف على بُعد 10 سم من جدار، حاول لمس الجدار بركبتك دون رفع الكعب.', de: 'Starres Sprunggelenk zwingt Knie, Hüfte, Rücken zum Kompensieren. Test: 10 cm zur Wand, Knie berühren ohne Ferse zu heben.' },
        action: { ar: 'دلك الكاحل بكرة تنس + Ankle rocks 3 د/يوم', de: 'Tennisball + Ankle Rocks 3 min/Tag' },
        impact: { ar: 'ركبة وظهر مرتاحان', de: 'Knie + Rücken entlastet' },
      },
      {
        title: { ar: 'التنفس الحجابي يفتح الصدر', de: 'Zwerchfellatmung öffnet die Brust' },
        body: { ar: '90% من الناس يتنفسون بأعلى الصدر — يشدّون الرقبة والكتف. تنفس بطن مع فتح ضلوع = يُطلق شد أوتار الرقبة تلقائياً.', de: '90 % atmen in die obere Brust — Nacken/Schulter verspannen. Bauch + Rippenweitung löst Nacken.' },
        action: { ar: '5 دقائق تنفس بطني مستلقياً يدك على السرة', de: '5 min Bauchatmung liegend, Hand am Bauch' },
        impact: { ar: 'كتف مسترخي', de: 'Entspannte Schultern' },
      },
      {
        title: { ar: 'المرونة تحدث في الجهاز العصبي', de: 'Beweglichkeit sitzt im Nervensystem' },
        body: { ar: 'العضلة ليست "قصيرة" — الدماغ يمنعها من الامتداد خوفاً. تدريب مرونة ناجح = تعليم الدماغ الأمان في المدى الجديد (PNF, load-stretch).', de: 'Der Muskel ist nicht "kurz" — das Gehirn bremst. Erfolg = neuen Bereich sicher lernen (PNF, Loaded Stretch).' },
        action: { ar: 'استخدم Loaded stretching بأوزان خفيفة في المدى الأقصى', de: 'Loaded Stretching mit leichtem Gewicht in Endposition' },
        impact: { ar: 'مدى دائم', de: 'Bleibender Zuwachs' },
      },
    ],
  },

  /* ─────────── HEART & CARDIO ─────────── */
  {
    category: 'heart',
    emoji: '❤️',
    color: '#ef4444',
    title: { ar: 'القلب — العضلة التي تنسى تدريبها', de: 'Herz — der vergessene Muskel' },
    description: {
      ar: 'الرياضي في الجيم يبني الصدر لكنه ينسى القلب. VO₂max أقوى مؤشر مفرد للعمر — أعلى من التدخين والضغط والسكر. تدريب القلب ليس اختياراً.',
      de: 'Gymgänger baut Brust, vergisst Herz. VO₂max = stärkster einzelner Lebenserwartungs-Marker — stärker als Rauchen/Druck/Zucker.',
    },
    facts: [
      {
        title: { ar: 'VO₂max أهم من الوزن', de: 'VO₂max wichtiger als Gewicht' },
        body: { ar: 'دراسة كليفلاند (122k شخص): الفرق بين "مُنخفض" و"عالي" VO₂max = 5 أضعاف خطر الموت — أضخم من التدخين أو السكري.', de: 'Cleveland-Studie (122k): niedrig vs. hoch VO₂max = 5× Sterberisiko — größer als Rauchen oder Diabetes.' },
        action: { ar: 'قِس VO₂max سنوياً — هدف >45 مل/كغ/د للرجل 20ي', de: 'VO₂max jährlich messen — Ziel >45 ml/kg/min für Männer 20+' },
        impact: { ar: '5× خطر الوفاة', de: '5× Sterberisiko' },
      },
      {
        title: { ar: 'Zone 2 يبني الميتوكوندريا', de: 'Zone 2 baut Mitochondrien' },
        body: { ar: 'إيقاع تستطيع الكلام فيه لكن ليس الغناء (60-70% من الأقصى). ساعتان أسبوعياً تضاعف كثافة الميتوكوندريا في العضلة — طاقة، حرق دهون، صحة.', de: 'Sprechen ja, singen nein (60-70 % Max). 2 h/Wo verdoppelt Mitochondrien — Energie, Fettverbrennung, Gesundheit.' },
        action: { ar: '3-4 جلسات × 45 د دراجة/جري خفيف/سباحة أسبوعياً', de: '3-4 Sitzungen × 45 min leichtes Radeln/Joggen/Schwimmen' },
        impact: { ar: 'ميتوكوندريا 2×', de: '2× Mitochondrien' },
      },
      {
        title: { ar: 'HRV = مؤشر التعافي', de: 'HRV = Regenerations-Indikator' },
        body: { ar: 'تفاوت ضربات القلب (HRV) يقيس توازن العصب المُبهم. HRV عالي = تعافيت. منخفض = تدرّب بخفة اليوم. ساعة ذكية تكفي.', de: 'HRV misst Vagus-Balance. Hoch = erholt. Niedrig = leicht trainieren. Smartwatch reicht.' },
        action: { ar: 'كل صباح: راقب HRV، خطط التمرين بناءً عليه', de: 'Jeden Morgen HRV checken → Trainingsplan anpassen' },
        impact: { ar: 'تعافي دقيق', de: 'Präzise Regeneration' },
      },
      {
        title: { ar: 'HIIT 4×4 يرفع VO₂max بسرعة', de: 'HIIT 4×4 pusht VO₂max' },
        body: { ar: 'بروتوكول Tabata النرويجي: 4 دقائق شدة عالية (90% HRmax) + 3 راحة × 4 جولات، مرتان أسبوعياً. رفع VO₂max 13% خلال 8 أسابيع.', de: 'Norwegisches 4×4: 4 min hart (90 % HRmax) + 3 min Pause × 4 Runden, 2×/Wo. +13 % VO₂max in 8 Wochen.' },
        action: { ar: 'مرة أسبوعياً 4×4 بعد أسبوعين من Zone 2', de: '1×/Wo 4×4 nach 2 Wochen Zone 2' },
        impact: { ar: '+13% VO₂max', de: '+13 % VO₂max' },
      },
      {
        title: { ar: 'المشي 8000 خطوة خط النجاة', de: '8000 Schritte = Überlebenslinie' },
        body: { ar: 'دراسة JAMA (2023, 78k): 8000 خطوة يومية = تخفيض 51% في وفيات كل الأسباب. لا حاجة لـ10000 — 8000 كافية.', de: 'JAMA 2023 (78k): 8000 Schritte/Tag = −51 % Sterblichkeit. 10 000 nicht nötig.' },
        action: { ar: 'أضف 3 مشية 10 دقائق بعد الوجبات', de: '3× 10 min Gehen nach Mahlzeiten' },
        impact: { ar: '-51% وفيات', de: '-51 % Sterblichkeit' },
      },
      {
        title: { ar: 'أفضل تمرين هو الذي تفعله', de: 'Beste Übung = die, die du machst' },
        body: { ar: 'دراسة (يوهانس هوبكينز): الرياضيون الذين خلطوا نشاطات (سباحة+تنس+مشي) عاشوا أطول من مُتخصّصين نوع واحد. التنوع = حماية.', de: 'Johns Hopkins: Sportler, die mischten (Schwimmen+Tennis+Gehen), lebten länger als Spezialisten. Vielfalt schützt.' },
        action: { ar: 'اختر 3 رياضات مختلفة تحبها بالتناوب', de: 'Wähle 3 verschiedene Sportarten im Wechsel' },
        impact: { ar: '+2.5 سنوات عمر', de: '+2,5 Lebensjahre' },
      },
    ],
  },

  /* ─────────── HABITS & DISCIPLINE ─────────── */
  {
    category: 'habits',
    emoji: '🎯',
    color: '#f97316',
    title: { ar: 'العادات — هندسة النسخة الأفضل منك', de: 'Gewohnheiten — Architektur deines besseren Ichs' },
    description: {
      ar: 'الانضباط ليس قوة إرادة — إنه بيئة وأنظمة. 40% من قراراتك اليومية عادات لا واعية. من يهندس عاداته يفوز؛ من يعتمد على "الحماس" يخسر.',
      de: 'Disziplin ist keine Willenskraft — sie ist Umgebung + System. 40 % deiner Entscheidungen sind unbewusste Gewohnheiten.',
    },
    facts: [
      {
        title: { ar: 'قاعدة الدقيقتين', de: 'Zwei-Minuten-Regel' },
        body: { ar: 'أي عادة جديدة اجعلها تستغرق دقيقتين لتبدأ. "أقرأ 10 صفحات" → "أفتح الكتاب". الدماغ يقاوم الحجم، لا الفعل. البداية أهم من الكمية.', de: 'Neue Gewohnheit auf 2 min schrumpfen. "10 Seiten lesen" → "Buch öffnen". Gehirn wehrt Größe, nicht Handlung.' },
        action: { ar: 'اختر عادة جديدة، صغّرها لدقيقتين، افعلها 30 يوم', de: 'Neue Gewohnheit → 2 min → 30 Tage' },
        impact: { ar: '90% احتمال الاستمرار', de: '90 % Durchhaltequote' },
      },
      {
        title: { ar: 'التلقيح الظرفي (Habit Stacking)', de: 'Habit Stacking' },
        body: { ar: 'اربط العادة الجديدة بعادة راسخة: "بعد ما أشرب قهوتي (راسخ)، أكتب هدفي اليومي (جديد)". العادة الراسخة تصبح مُطلق العادة الجديدة.', de: '"Nach [alter Gewohnheit], mache ich [neue]." Alte triggert neue automatisch.' },
        action: { ar: 'اكتب: "بعد ___، سأفعل ___"', de: 'Formuliere: "Nach ___ mache ich ___"' },
        impact: { ar: '3× ثبات', de: '3× stabiler' },
      },
      {
        title: { ar: 'اجعل السيّئة صعبة', de: 'Mache Schlechtes schwer' },
        body: { ar: 'الإرادة تخسر أمام الاحتكاك المنخفض. الشوكولاته في الدرج تُؤكل. الشوكولاته في السيارة تحت المقعد الخلفي لا تُؤكل. صمّم بيئتك، لا نفسك.', de: 'Wille verliert gegen niedrige Reibung. Schokolade in der Schublade wird gegessen — im Auto unterm Rücksitz nicht.' },
        action: { ar: 'أزل الإغراءات بُعد 3 خطوات على الأقل', de: 'Versuchungen 3 Schritte weiter entfernen' },
        impact: { ar: '-70% انزلاق', de: '-70 % Rückfälle' },
      },
      {
        title: { ar: 'قاعدة عدم التفويت مرتين', de: 'Nie zweimal aussetzen' },
        body: { ar: 'يوم واحد فوت التمرين = طبيعي. يومان = بداية عادة جديدة (سلبية). الأبطال يمتلكون قاعدة صارمة: never miss twice.', de: '1× ausfallen = normal. 2× = neue (schlechte) Gewohnheit beginnt. Regel der Champions: nie 2× hintereinander.' },
        action: { ar: 'إن فوّت اليوم، تدرّب غداً حتى لو 10 دقائق', de: 'Nach Ausfall: nächster Tag mindestens 10 min' },
        impact: { ar: 'استمرار 5+ سنوات', de: '5+ Jahre Konstanz' },
      },
      {
        title: { ar: 'الهوية تسبق الفعل', de: 'Identität kommt vor Tun' },
        body: { ar: 'الفرق بين "أحاول التوقف عن التدخين" و"أنا لست مدخّناً" هو الفرق بين الفشل والنجاح. العادات تنبع من هوية، ليس أهدافاً.', de: '"Ich versuche aufzuhören" vs. "Ich rauche nicht" — Unterschied zwischen Scheitern und Erfolg. Identität > Ziele.' },
        action: { ar: 'اكتب: "أنا شخص ___" وكرّرها يومياً', de: 'Schreibe: "Ich bin ein Mensch, der ___" täglich' },
        impact: { ar: 'تحوّل جذري', de: 'Radikaler Wandel' },
      },
      {
        title: { ar: 'الإنجاز يولّد الدوبامين، الحلم يقتله', de: 'Erfolg gibt Dopamin, Träumen nimmt es' },
        body: { ar: 'دراسة (NYU): إخبار الآخرين بأهدافك يفرز دوبامين "الإنجاز" قبل الفعل — فتخسر الدافع. الأهداف الصامتة تُنجَز، المُعلنة تُنسى.', de: 'NYU-Studie: Ziel anderen erzählen gibt "Erfolgs"-Dopamin vor der Tat — Motivation schwindet. Still gehalten wird erreicht.' },
        action: { ar: 'لا تُعلن أهدافك — أعلن نتائجك', de: 'Ziele nicht ankündigen — nur Ergebnisse' },
        myth: { ar: '"اجعل هدفك عاماً للمحاسبة" خرافة', de: '"Öffentlich = mehr Verantwortung" ist Mythos' },
        impact: { ar: '2× معدل إنجاز', de: '2× Erfolgsquote' },
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
 *  CATEGORY METADATA
 * ═══════════════════════════════════════════════════════════════════ */

export const CATEGORY_LABELS_ENC: Record<EncyclopediaCategory, Record<Lang, string>> = {
  sleep:     { ar: 'النوم',          de: 'Schlaf' },
  hormones:  { ar: 'الهرمونات',      de: 'Hormone' },
  stress:    { ar: 'الإجهاد',        de: 'Stress' },
  mental:    { ar: 'العقل',          de: 'Mental' },
  longevity: { ar: 'طول العمر',      de: 'Langlebigkeit' },
  recovery:  { ar: 'التعافي',        de: 'Recovery' },
  body_comp: { ar: 'تركيب الجسم',    de: 'Körper' },
  energy:    { ar: 'الطاقة',         de: 'Energie' },
  gut:       { ar: 'الأمعاء والميكروبيوم', de: 'Darm & Mikrobiom' },
  hydration: { ar: 'الترطيب',        de: 'Hydration' },
  breath:    { ar: 'التنفس',          de: 'Atmung' },
  light:     { ar: 'الضوء والساعة',   de: 'Licht & Rhythmus' },
  cold_heat: { ar: 'البرد والحرارة',  de: 'Kälte & Hitze' },
  mobility:  { ar: 'الحركة والمرونة', de: 'Mobilität' },
  heart:     { ar: 'القلب والدورة',   de: 'Herz & Kreislauf' },
  habits:    { ar: 'العادات والانضباط', de: 'Gewohnheiten' },
};
