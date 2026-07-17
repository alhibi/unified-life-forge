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
