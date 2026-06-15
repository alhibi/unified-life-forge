// Literary Connections Data — relationships between poets across eras
// Used by the LiteraryGraph component in the Diwan section

export type RelationType =
  | 'teacher_student'   // أستاذ ← تلميذ
  | 'contemporary'      // معاصرون
  | 'rival'            // خصوم أدبيون (نقائض)
  | 'influenced'       // تأثّر به
  | 'family'           // قرابة
  | 'lover_muse';      // عاشق ومعشوق (شعر الغزل)

export interface LiteraryRelation {
  source: string;       // poet id
  target: string;       // poet id
  type: RelationType;
  description: string;  // Arabic description of the relationship
}

export interface PoetNode {
  id: string;
  name: string;
  era: string;
  eraAr: string;
  birth?: string;
  death?: string;
  title?: string;       // لقب
  color: string;        // era-based color
}

// Era color palette
export const eraColors: Record<string, string> = {
  jahili: '#d97706',      // amber
  mukhadram: '#059669',   // emerald
  islami: '#0891b2',      // cyan
  umawi: '#7c3aed',       // violet
  abbasi: '#dc2626',      // red
  andalusi: '#2563eb',    // blue
};

export const poetNodes: PoetNode[] = [
  // العصر الجاهلي
  { id: 'imru-alqays', name: 'امرؤ القيس', era: 'jahili', eraAr: 'الجاهلي', birth: '500م', death: '540م', title: 'الملك الضليل', color: eraColors.jahili },
  { id: 'tarafa', name: 'طرفة بن العبد', era: 'jahili', eraAr: 'الجاهلي', birth: '543م', death: '569م', title: 'أشعر الشباب', color: eraColors.jahili },
  { id: 'zuhayr', name: 'زهير بن أبي سلمى', era: 'jahili', eraAr: 'الجاهلي', birth: '520م', death: '609م', title: 'شاعر الحكمة', color: eraColors.jahili },
  { id: 'antara', name: 'عنترة بن شداد', era: 'jahili', eraAr: 'الجاهلي', birth: '525م', death: '608م', title: 'فارس الشعراء', color: eraColors.jahili },
  { id: 'labid', name: 'لبيد بن ربيعة', era: 'jahili', eraAr: 'الجاهلي', birth: '560م', death: '661م', title: 'ذو العفّة', color: eraColors.jahili },
  { id: 'nabigha', name: 'النابغة الذبياني', era: 'jahili', eraAr: 'الجاهلي', birth: '535م', death: '604م', title: 'حَكَم عكاظ', color: eraColors.jahili },
  { id: 'aasha', name: 'الأعشى', era: 'jahili', eraAr: 'الجاهلي', birth: '570م', death: '629م', title: 'صنّاجة العرب', color: eraColors.jahili },
  { id: 'shanfara', name: 'الشنفرى', era: 'jahili', eraAr: 'الجاهلي', title: 'شاعر الصعاليك', color: eraColors.jahili },
  { id: 'hatim-tai', name: 'حاتم الطائي', era: 'jahili', eraAr: 'الجاهلي', title: 'أجود العرب', color: eraColors.jahili },

  // العصر المخضرم
  { id: 'hutayia', name: 'الحُطيئة', era: 'mukhadram', eraAr: 'المخضرم', title: 'شاعر الهجاء', color: eraColors.mukhadram },
  { id: 'abu-dhuayb', name: 'أبو ذؤيب الهذلي', era: 'mukhadram', eraAr: 'المخضرم', title: 'شاعر الرثاء', color: eraColors.mukhadram },
  { id: 'amr-maadi-karib', name: 'عمرو بن معدي كرب', era: 'mukhadram', eraAr: 'المخضرم', title: 'فارس اليمن', color: eraColors.mukhadram },

  // العصر الإسلامي
  { id: 'hassan', name: 'حسان بن ثابت', era: 'islami', eraAr: 'الإسلامي', birth: '563م', death: '674م', title: 'شاعر الرسول ﷺ', color: eraColors.islami },
  { id: 'kaab', name: 'كعب بن زهير', era: 'islami', eraAr: 'الإسلامي', title: 'صاحب البُردة', color: eraColors.islami },
  { id: 'khansa', name: 'الخنساء', era: 'islami', eraAr: 'الإسلامي', birth: '575م', death: '664م', title: 'سيدة الرثاء', color: eraColors.islami },
  { id: 'jamil-buthayna', name: 'جميل بثينة', era: 'islami', eraAr: 'الإسلامي', title: 'شاعر العشق العذري', color: eraColors.islami },

  // العصر الأموي
  { id: 'jarir', name: 'جرير', era: 'umawi', eraAr: 'الأموي', birth: '650م', death: '728م', title: 'غسّان الشعر', color: eraColors.umawi },
  { id: 'farazdaq', name: 'الفرزدق', era: 'umawi', eraAr: 'الأموي', birth: '641م', death: '730م', title: 'نحّات الشعر', color: eraColors.umawi },
  { id: 'akhtal', name: 'الأخطل', era: 'umawi', eraAr: 'الأموي', birth: '640م', death: '710م', title: 'شاعر بني أمية', color: eraColors.umawi },
  { id: 'umar-abi-rabia', name: 'عمر بن أبي ربيعة', era: 'umawi', eraAr: 'الأموي', birth: '644م', death: '711م', title: 'شاعر الغزل الحضري', color: eraColors.umawi },
  { id: 'kuthayyir', name: 'كثيّر عزّة', era: 'umawi', eraAr: 'الأموي', title: 'شاعر العشق', color: eraColors.umawi },
  { id: 'layla-akhyaliya', name: 'ليلى الأخيلية', era: 'umawi', eraAr: 'الأموي', title: 'شاعرة الوفاء', color: eraColors.umawi },

  // العصر العباسي
  { id: 'mutanabbi', name: 'المتنبي', era: 'abbasi', eraAr: 'العباسي', birth: '915م', death: '965م', title: 'ملء الدنيا وشاغل الناس', color: eraColors.abbasi },
  { id: 'abu-tammam', name: 'أبو تمام', era: 'abbasi', eraAr: 'العباسي', birth: '796م', death: '845م', title: 'صاحب الحماسة', color: eraColors.abbasi },
  { id: 'abu-nawas', name: 'أبو نواس', era: 'abbasi', eraAr: 'العباسي', birth: '756م', death: '814م', title: 'شاعر الخمريّات', color: eraColors.abbasi },
  { id: 'buhtury', name: 'البحتري', era: 'abbasi', eraAr: 'العباسي', birth: '821م', death: '897م', title: 'شاعر الطبع', color: eraColors.abbasi },
  { id: 'maarri', name: 'أبو العلاء المعري', era: 'abbasi', eraAr: 'العباسي', birth: '973م', death: '1057م', title: 'رهين المحبسين', color: eraColors.abbasi },
  { id: 'bashshar', name: 'بشار بن برد', era: 'abbasi', eraAr: 'العباسي', birth: '714م', death: '783م', title: 'أول المُحدَثين', color: eraColors.abbasi },
  { id: 'abu-firas', name: 'أبو فراس الحمداني', era: 'abbasi', eraAr: 'العباسي', birth: '932م', death: '968م', title: 'صاحب الروميّات', color: eraColors.abbasi },
  { id: 'sharif-radhi', name: 'الشريف الرضي', era: 'abbasi', eraAr: 'العباسي', birth: '970م', death: '1016م', title: 'جامع نهج البلاغة', color: eraColors.abbasi },

  // العصر الأندلسي
  { id: 'ibn-hani', name: 'ابن هانئ الأندلسي', era: 'andalusi', eraAr: 'الأندلسي', birth: '936م', death: '973م', title: 'متنبي المغرب', color: eraColors.andalusi },
  { id: 'ibn-zaydun', name: 'ابن زيدون', era: 'andalusi', eraAr: 'الأندلسي', birth: '1003م', death: '1071م', title: 'بحتري المغرب', color: eraColors.andalusi },
  { id: 'wallada', name: 'ولّادة بنت المستكفي', era: 'andalusi', eraAr: 'الأندلسي', birth: '1001م', death: '1091م', title: 'أميرة الشعر', color: eraColors.andalusi },
  { id: 'ibn-khafaja', name: 'ابن خفاجة', era: 'andalusi', eraAr: 'الأندلسي', birth: '1058م', death: '1139م', title: 'صنوبري الأندلس', color: eraColors.andalusi },
  { id: 'mutamid', name: 'المعتمد بن عبّاد', era: 'andalusi', eraAr: 'الأندلسي', birth: '1040م', death: '1095م', title: 'الملك الشاعر', color: eraColors.andalusi },
  { id: 'rundi', name: 'أبو البقاء الرندي', era: 'andalusi', eraAr: 'الأندلسي', birth: '1204م', death: '1285م', title: 'راثي الأندلس', color: eraColors.andalusi },
  { id: 'ibn-hazm', name: 'ابن حزم', era: 'andalusi', eraAr: 'الأندلسي', birth: '994م', death: '1064م', title: 'صاحب طوق الحمامة', color: eraColors.andalusi },
];



// العلاقات الأدبية بين الشعراء
export const literaryRelations: LiteraryRelation[] = [
  // === العصر الجاهلي ===
  { source: 'zuhayr', target: 'kaab', type: 'family', description: 'كعب بن زهير ابن الشاعر زهير بن أبي سلمى، ورث الشعر عن أبيه' },
  { source: 'nabigha', target: 'imru-alqays', type: 'contemporary', description: 'تنافسا على صدارة الشعر العربي في سوق عكاظ' },
  { source: 'nabigha', target: 'zuhayr', type: 'teacher_student', description: 'كان النابغة حَكَم الشعراء في عكاظ وأثّر على أسلوب زهير' },
  { source: 'nabigha', target: 'aasha', type: 'teacher_student', description: 'أنشد الأعشى أمام النابغة في سوق عكاظ' },
  { source: 'imru-alqays', target: 'tarafa', type: 'influenced', description: 'تأثّر طرفة بأسلوب امرئ القيس في وصف الخيل والطبيعة' },
  { source: 'imru-alqays', target: 'antara', type: 'influenced', description: 'تأثّر عنترة بقوة التصوير عند امرئ القيس' },
  { source: 'shanfara', target: 'hatim-tai', type: 'contemporary', description: 'عاشا في بيئة واحدة، وكلاهما عُرف بالشهامة' },

  // === العلاقة بين الجاهلي والمخضرم ===
  { source: 'zuhayr', target: 'hutayia', type: 'teacher_student', description: 'تتلمذ الحطيئة على يد زهير بن أبي سلمى في نظم الشعر' },
  { source: 'labid', target: 'abu-dhuayb', type: 'contemporary', description: 'أدركا الإسلام معاً وكانا من فحول الشعر' },
  { source: 'antara', target: 'amr-maadi-karib', type: 'influenced', description: 'تأثر عمرو بشعر الفروسية عند عنترة' },

  // === العصر الإسلامي ===
  { source: 'hassan', target: 'kaab', type: 'contemporary', description: 'كلاهما شاعر في المدينة أنشد أمام النبي ﷺ' },
  { source: 'khansa', target: 'hassan', type: 'contemporary', description: 'معاصران، وقد أثنى عليها النبي ﷺ بحضور حسان' },
  { source: 'umar-abi-rabia', target: 'jamil-buthayna', type: 'contemporary', description: 'تنافسا في شعر الغزل: عمر الحضري وجميل العذري' },

  // === النقائض الأموية — العلاقة الأشهر ===
  { source: 'jarir', target: 'farazdaq', type: 'rival', description: 'أشهر نقائض الشعر العربي: تهاجيا أربعين سنة ثم بكى كل منهما الآخر' },
  { source: 'jarir', target: 'akhtal', type: 'rival', description: 'كان الأخطل ثالث أطراف النقائض مع جرير والفرزدق' },
  { source: 'farazdaq', target: 'akhtal', type: 'contemporary', description: 'صداقة وتنافس: مدحا بني أمية معاً رغم اختلاف الدين' },
  { source: 'kuthayyir', target: 'jamil-buthayna', type: 'influenced', description: 'سار كثيّر على نهج جميل في الغزل العذري' },
  { source: 'layla-akhyaliya', target: 'jarir', type: 'contemporary', description: 'حضرت مجالس الشعر مع جرير وأُعجب بها' },

  // === العلاقة بين الأموي والعباسي ===
  { source: 'bashshar', target: 'abu-nawas', type: 'teacher_student', description: 'تتلمذ أبو نواس على بشار بن برد وتأثر بجرأته الشعرية' },
  { source: 'jarir', target: 'bashshar', type: 'influenced', description: 'تأثّر بشار بقوة هجاء جرير ومتانة نظمه' },

  // === العصر العباسي — الذروة ===
  { source: 'abu-tammam', target: 'buhtury', type: 'teacher_student', description: 'البحتري تلميذ أبي تمام المباشر، وعنه أخذ الصنعة والبديع' },
  { source: 'abu-tammam', target: 'mutanabbi', type: 'influenced', description: 'تأثّر المتنبي بقوة معاني أبي تمام وبلاغة صوره' },
  { source: 'buhtury', target: 'mutanabbi', type: 'influenced', description: 'أخذ المتنبي من سلاسة البحتري وطبيعيّة أسلوبه' },
  { source: 'mutanabbi', target: 'abu-firas', type: 'rival', description: 'تنافسا في بلاط سيف الدولة الحمداني وكلاهما مدحه' },
  { source: 'mutanabbi', target: 'sharif-radhi', type: 'influenced', description: 'تأثر الشريف الرضي بفخامة المتنبي وحكمته' },
  { source: 'mutanabbi', target: 'maarri', type: 'influenced', description: 'عظّم المعري المتنبي وشرح ديوانه في "معجز أحمد"' },
  { source: 'abu-nawas', target: 'abu-tammam', type: 'influenced', description: 'فتح أبو نواس باب التجديد الذي أكمله أبو تمام' },

  // === العصر الأندلسي ===
  { source: 'ibn-zaydun', target: 'wallada', type: 'lover_muse', description: 'قصة حب خالدة: أحبّها وكتب فيها "نونيّته" ثم هجرته' },
  { source: 'buhtury', target: 'ibn-zaydun', type: 'influenced', description: 'لُقّب ابن زيدون ببحتري المغرب لتشابه أسلوبهما' },
  { source: 'mutanabbi', target: 'ibn-hani', type: 'influenced', description: 'لُقّب ابن هانئ بمتنبي المغرب لقوة شعره وفخامته' },
  { source: 'ibn-zaydun', target: 'ibn-khafaja', type: 'influenced', description: 'تأثّر ابن خفاجة بوصف ابن زيدون للطبيعة الأندلسية' },
  { source: 'mutamid', target: 'ibn-zaydun', type: 'contemporary', description: 'حظي ابن زيدون بمكانة في بلاط بني عبّاد' },
  { source: 'ibn-hazm', target: 'wallada', type: 'contemporary', description: 'عاشا في قرطبة وكانا من أعلام الأندلس الأدبية' },

  // === علاقات تأثير عابرة للعصور ===
  { source: 'imru-alqays', target: 'mutanabbi', type: 'influenced', description: 'اعتبر المتنبي امرأ القيس سيّد الشعراء وتأثّر بقوة تصويره' },
  { source: 'imru-alqays', target: 'abu-tammam', type: 'influenced', description: 'استلهم أبو تمام من فنّ امرئ القيس في وصف الطبيعة' },
  { source: 'antara', target: 'abu-firas', type: 'influenced', description: 'تأثّر أبو فراس بفروسية عنترة ومزج الشعر بالبطولة' },
  { source: 'khansa', target: 'rundi', type: 'influenced', description: 'ارتقى الرندي بفنّ الرثاء الذي أسّسته الخنساء' },
];

// Relationship type labels in Arabic
export const relationLabels: Record<RelationType, string> = {
  teacher_student: 'أستاذ وتلميذ',
  contemporary: 'معاصرون',
  rival: 'نقائض وتنافس',
  influenced: 'تأثّر وتأثير',
  family: 'قرابة عائلية',
  lover_muse: 'عشق وإلهام',
};

// Relationship type colors
export const relationColors: Record<RelationType, string> = {
  teacher_student: '#10b981',   // emerald
  contemporary: '#6366f1',      // indigo
  rival: '#ef4444',             // red
  influenced: '#f59e0b',        // amber
  family: '#ec4899',            // pink
  lover_muse: '#f43f5e',        // rose
};
