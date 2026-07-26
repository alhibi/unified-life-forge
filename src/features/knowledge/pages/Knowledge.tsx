import { useState, useEffect } from "react";
import BackButton from "@/components/BackButton";
import SEO from "@/components/SEO";

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────
interface Category {
  id: string;
  icon: string;
  label: string;
  labelEn: string;
  color: string;
  bg: string;
}

interface Model {
  id: string;
  name: string;
  color: string;
  year: string;
  type: string;
  price: string;
  tags: string[];
  story: string;
  highlights: string[];
  bar: { label: string; value: number };
  perf?: Record<string, string>;
  engine?: Record<string, string>;
  chassis?: Record<string, string>;
  pyramid?: Record<string, string>;
  character?: Record<string, string>;
  notes?: Record<string, string>;
  movement?: Record<string, string>;
  case?: Record<string, string>;
  dial?: Record<string, string>;
  complications?: Record<string, string>;
  fiber?: Record<string, string>;
  leather?: Record<string, string>;
  craft?: Record<string, string>;
  hardware?: Record<string, string>;
  sizing?: Record<string, string>;
  market?: Record<string, string>;
  components?: Record<string, string>;
  process?: Record<string, string>;
  tasting?: Record<string, string>;
  origin_story?: Record<string, string>;
  profile?: Record<string, string>;
  technical?: Record<string, string>;
  uses?: Record<string, string>;
}

interface Brand {
  id: string;
  name: string;
  origin: string;
  founded: string;
  logo: string;
  tagline: string;
  desc: string;
  models: Model[];
}

interface CategoryData {
  brands: Brand[];
}

interface ModalContentProps {
  m: Model;
  color: string;
}

interface SectionProps {
  title: string;
  color: string;
  children: React.ReactNode;
}

interface Grid2Props {
  data?: Record<string, string>;
  color: string;
}

interface PyramidBlockProps {
  data?: Record<string, string>;
  color: string;
}

interface ComponentsBlockProps {
  data?: Record<string, string>;
  color: string;
}

interface DetailModalProps {
  model: Model;
  brand: Brand;
  catId: string;
  catColor: string;
  onClose: () => void;
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  { id:"cars",     icon:"◈", label:"السيارات",  labelEn:"Automobiles", color:"#C8A96E", bg:"from-amber-950"   },
  { id:"perfumes", icon:"◉", label:"العطور",    labelEn:"Perfumery",   color:"#D4A5C9", bg:"from-purple-950"  },
  { id:"watches",  icon:"◎", label:"الساعات",   labelEn:"Horology",    color:"#7EB8C9", bg:"from-sky-950"     },
  { id:"fashion",  icon:"◆", label:"الأزياء",   labelEn:"Fashion",     color:"#C9A87E", bg:"from-stone-900"   },
  { id:"sweets",   icon:"◐", label:"الحلويات",  labelEn:"Confiserie",  color:"#C97E8A", bg:"from-rose-950"    },
];

// ─── DATA ─────────────────────────────────────────────────────────────────────
const DATA: Record<string, CategoryData> = {

  // ══ CARS ══════════════════════════════════════════════════════════════════
  cars: {
    brands: [
      {
        id:"porsche", name:"Porsche", origin:"Stuttgart, DE", founded:"1931", logo:"P",
        tagline:"روح الأداء — في جسد من الفولاذ",
        desc:"منذ 1931، تصنع بورش السيارة التي تُعيد تعريف العلاقة بين الإنسان والطريق.",
        models:[
          {
            id:"911s", name:"911 Carrera S", color:"#C8A96E", year:"2024",
            type:"Sports Coupe", price:"$145,000",
            tags:["RWD","PDK 8-Speed","Sport Chrono","PASM"],
            story:"ستة عقود، قلب واحد. الـ911 لم تتغير لأنها كانت صحيحة منذ البداية. المحرك خلفي، الثقل خلفي، والشعور لا يوصف.",
            highlights:["محرك Flat-6 أفقي خلف المحور الخلفي — فريد عالمياً","أداء مضمار على إطارات الشارع","هيكل ألومنيوم هجين يوفر 50% من الوزن"],
            perf:{ "0→100 كم/ساعة":"3.5 ث", "0→200 كم/ساعة":"11.9 ث", "السرعة القصوى":"308 كم/ساعة", "نوع التسارع":"Sport Chrono" },
            engine:{ "المحرك":"3.0L Flat-6 Biturbo", "الاستطاعة":"450 حصان @ 6,500 RPM", "العزم":"530 Nm @ 2,300 RPM", "ناقل الحركة":"PDK 8 سرعات", "نظام الدفع":"RWD" },
            chassis:{ "الوزن":"1,515 كغ", "قاعدة العجلات":"2,450 ملم", "الإطارات الأمامية":"245/35 ZR20", "الإطارات الخلفية":"305/30 ZR21", "الفرامل الأمامية":"PCCB كربون اختياري" },
            bar:{ label:"مؤشر الأداء", value:88 }
          },
          {
            id:"taycan", name:"Taycan Turbo S", color:"#5B9BD5", year:"2024",
            type:"Electric Sport Sedan", price:"$188,000",
            tags:["AWD","800V Architecture","Launch Control","PDCC Sport"],
            story:"ثورة هادئة. بورش أثبتت أن الكهربائي لا يعني الملل — الـTaycan يتسارع بشكل يصعب تصديقه وفرامله تعيد شحن البطارية.",
            highlights:["معمارية 800 فولت — أسرع شحن في الفئة","نظام PDCC يُلغي الميل الجانبي شبه كلياً","Launch Control يُفعّل كامل الطاقة في 0.5 ثانية"],
            perf:{ "0→100 كم/ساعة":"2.8 ث", "0→200 كم/ساعة":"9.2 ث", "السرعة القصوى":"260 كم/ساعة (مقيّدة)", "Launch Control":"نعم — غير محدود" },
            engine:{ "المحركان":"Front + Rear PSM Motors", "الاستطاعة (Overboost)":"761 حصان", "العزم الفوري":"1,050 Nm", "البطارية":"93.4 kWh (نت)", "الشحن الأقصى":"270 kW DC" },
            chassis:{ "الوزن":"2,305 كغ", "المدى (WLTP)":"630 كم", "قاعدة العجلات":"2,900 ملم", "الإطارات الأمامية":"265/35 ZR21", "الإطارات الخلفية":"305/30 ZR21" },
            bar:{ label:"مؤشر الأداء", value:96 }
          },
          {
            id:"gt3rs", name:"911 GT3 RS", color:"#E85D04", year:"2023",
            type:"Track-Focused Homologation", price:"$225,000",
            tags:["RWD","PDK","Weissach Package","DRS Active Aero"],
            story:"هذه ليست سيارة — هذا مقاتل طائرات مع لوحات ترخيص. الأجنحة النشطة توفر ضغطاً أرضياً أعلى من وزن السيارة نفسها.",
            highlights:["أجنحة DRS: وضع السحب لأقصى سرعة + وضع الضغط للمنعطفات","4.0L Flat-6 يصل 9,000 RPM — أعلى دوران في فئته","Nordschleife: 6:49.328 — ركوردة إنتاجية قياسية"],
            perf:{ "0→100 كم/ساعة":"3.2 ث", "السرعة القصوى":"296 كم/ساعة", "نوردشلايف":"6:49.328", "الضغط الأرضي":"409 كغ @ 200 كم/ساعة" },
            engine:{ "المحرك":"4.0L Flat-6 شفط طبيعي", "الاستطاعة":"525 حصان @ 9,000 RPM", "العزم":"465 Nm @ 6,300 RPM", "دوران المحرك":"9,000 RPM (أقصى)", "ناقل الحركة":"PDK 7 سرعات مع Launch" },
            chassis:{ "الوزن":"1,450 كغ", "الهيكل":"ألومنيوم هجين + CFRP", "الإطارات الأمامية":"275/35 R20 Michelin Cup 2R", "الإطارات الخلفية":"335/30 R21 Michelin Cup 2R", "الكسارة الهوائية":"نشطة إلكترونياً" },
            bar:{ label:"مؤشر الأداء", value:99 }
          },
        ]
      },
      {
        id:"ferrari", name:"Ferrari", origin:"Maranello, IT", founded:"1947", logo:"F",
        tagline:"Non si può spiegare — لا يمكن تفسيره، فقط إحساسه",
        desc:"من مارانيلو، تخرج كل سنة بضع مئات من السيارات التي تحرك قلوب الملايين.",
        models:[
          {
            id:"sf90", name:"SF90 Stradale", color:"#CC0000", year:"2024",
            type:"PHEV Hypercar", price:"$625,000",
            tags:["AWD","PHEV","eSSC","F1-Trac","Side Slip Control 6.0"],
            story:"فيراري الهجينة الأولى بدفع رباعي في تاريخ البيت. ثلاثة محركات كهربائية تضاف إلى V8 لينتج نظام يشبه F1.",
            highlights:["أول فيراري AWD في تاريخ الإنتاج","ألف حصان من 4 مصادر — V8 + 3 كهربائيات","0-200 في 6.7 ثانية — أسرع إنتاجية فيراري عبر التاريخ"],
            perf:{ "0→100 كم/ساعة":"2.5 ث", "0→200 كم/ساعة":"6.7 ث", "السرعة القصوى":"340 كم/ساعة", "مدى EV":"25 كم (EV Only Mode)" },
            engine:{ "محرك البنزين":"4.0L V8 Biturbo — 780 حصان", "المحرك الأمامي":"2 × Axial Flux (eSSC)", "المحرك الخلفي":"1 × MGU-K خلف ناقل الحركة", "إجمالي الاستطاعة":"1,000 حصان / 800 Nm", "البطارية":"7.9 kWh" },
            chassis:{ "الوزن":"1,570 كغ", "الهيكل":"CFRP بالكامل", "ناقل الحركة":"8DCT F1 + eSSC", "نظام الدفع":"AWD ذكي", "الفرامل":"Brembo CCM-R Ceramic" },
            bar:{ label:"مؤشر الأداء", value:100 }
          },
          {
            id:"purosangue", name:"Purosangue V12", color:"#8B0000", year:"2023",
            type:"Sports SUV", price:"$395,000",
            tags:["AWD","V12 NA","4 Porte","Active Suspension"],
            story:"فيراري رفضت صنع SUV لعقود. حين قررت، جعلتها الأقوى في الفئة وأضافت V12 شفطاً طبيعياً لا يملكه أي SUV آخر.",
            highlights:["V12 6.5L شفط طبيعي — غير موجود في أي SUV آخر","أبواب خلفية تُفتح عكسياً (Dihedral) — اقتراح فيراري","Active Suspension تكيفي يُلغي الميل كلياً في المنعطفات"],
            perf:{ "0→100 كم/ساعة":"3.3 ث", "السرعة القصوى":"310 كم/ساعة", "0→200 كم/ساعة":"10.6 ث", "الفرامل 100→0":"32 متر" },
            engine:{ "المحرك":"6.5L V12 Naturally Aspirated", "الاستطاعة":"725 حصان @ 7,750 RPM", "العزم":"716 Nm @ 6,250 RPM", "ناقل الحركة":"8DCT Dual Clutch", "دوران المحرك":"8,250 RPM (أقصى)" },
            chassis:{ "الوزن":"2,033 كغ", "قاعدة العجلات":"3,020 ملم", "الخزان":"90 لتر", "التعليق":"Active Magnetic Ride 4.0", "الإطارات":"296/35 ZR22 (خلفي)" },
            bar:{ label:"مؤشر الأداء", value:93 }
          },
        ]
      },
      {
        id:"amg", name:"Mercedes-AMG", origin:"Affalterbach, DE", founded:"1967", logo:"AMG",
        tagline:"One Man, One Engine — كل محرك يبنيه رجل واحد بيده",
        desc:"ورشة صغيرة في أفالتيرباخ حوّلت مرسيدس إلى وحوش. كل محرك AMG يوقّعه الميكانيكي الذي بناه.",
        models:[
          {
            id:"gt63se", name:"AMG GT 63 S E Performance", color:"#D4AF37", year:"2024",
            type:"PHEV Performance Sedan", price:"$165,000",
            tags:["AWD","PHEV","843hp","4MATIC+","E-Boost"],
            story:"الأقوى من AMG على الإطلاق. يجمع V8 بيتوربو مع محرك كهربائي خلفي لينتج 1,470 Nm من العزم — عزم شاحنة في جسد سيدان فاخر.",
            highlights:["1,470 Nm عزم — الأعلى في تاريخ AMG","E-Boost يُضيف 204 حصاناً إضافياً كهربائياً","النظام الهجين يقلل استهلاك الوقود 30% في المدينة"],
            perf:{ "0→100 كم/ساعة":"2.9 ث", "السرعة القصوى":"316 كم/ساعة", "0→200 كم/ساعة":"9.4 ث", "Launch Control":"Race Start Mode" },
            engine:{ "محرك البنزين":"4.0L V8 Biturbo — 639 حصان", "المحرك الكهربائي":"204 حصان (خلفي)", "الاستطاعة الإجمالية":"843 حصان", "العزم الإجمالي":"1,470 Nm", "البطارية":"6.1 kWh AMG HighPerformance" },
            chassis:{ "الوزن":"2,385 كغ", "قاعدة العجلات":"3,070 ملم", "ناقل الحركة":"AMG Speedshift MCT 9-Speed", "نظام الدفع":"AMG Performance 4MATIC+", "الفرامل":"AMG Ceramic Composite (اختياري)" },
            bar:{ label:"مؤشر الأداء", value:97 }
          },
        ]
      },
      {
        id:"lamborghini", name:"Lamborghini", origin:"Sant'Agata, IT", founded:"1963", logo:"L",
        tagline:"الجرأة والتصميم الهجومي المطلق",
        desc:"تجسيد العنف البصري والأداء الجبار من قلب إيطاليا.",
        models:[
          {
            id:"revuelto", name:"Revuelto V12 Hybrid", color:"#FF6F00", year:"2024",
            type:"PHEV Hypercar", price:"$608,000",
            tags:["V12","Hybrid","AWD","Monofuselage"],
            story:"عصر جديد للثور الإيطالي الهائج. تجمع Revuelto بين محرك V12 الأسطوري وثلاثة محركات كهربائية.",
            highlights:["هيكل أحادي كربوني متكامل وخفيف الوزن","دوران محرك يصل إلى 9,500 دورة/دقيقة","أول هجين خارق بمحرك V12 ذو تنفس طبيعي"],
            perf:{ "0→100 كم/ساعة":"2.5 ث", "0→200 كم/ساعة":"7.0 ث", "السرعة القصوى":"350 كم/ساعة", "الوزن الجاف":"1,775 كغ" },
            engine:{ "المحرك":"6.5L V12 + 3 E-Motors", "الاستطاعة":"1,015 حصان", "العزم":"807 Nm @ 6,750 RPM", "ناقل الحركة":"8DCT مزدوج القابض", "الدفع":"AWD إلكتروني" },
            chassis:{ "قاعدة العجلات":"2,779 ملم", "الفرامل":"كربون سيراميك", "الإطارات":"265/35 ZR20 (أمامي)", "توزيع الوزن":"44:56" },
            bar:{ label:"مؤشر الأداء", value:98 }
          }
        ]
      },
      {
        id:"aston_martin", name:"Aston Martin", origin:"Gaydon, UK", founded:"1913", logo:"AM",
        tagline:"القوة والجمال والروح البريطانية الخالدة",
        desc:"أناقة لا غبار عليها ممزوجة بقوة رعدية وهندسة دقيقة للغاية.",
        models:[
          {
            id:"valkyrie", name:"Valkyrie Hybrid", color:"#33691E", year:"2024",
            type:"Formula-1 For The Road", price:"$3,500,000",
            tags:["Cosworth V12","F1 Aero","Active Suspension","Limited"],
            story:"ثمرة التعاون بين عبقري الهوائية أدريان نيوي وأستون مارتن. طائرة حربية حقيقية تلامس الإسفلت.",
            highlights:["محرك Cosworth ذو تنفس طبيعي يدور حتى 11,100 RPM","توليد داونفورس يعادل وزن السيارة ذاته","هيكل كربوني بالكامل بدون برغي حديدي واحد"],
            perf:{ "0→100 كم/ساعة":"2.6 ث", "السرعة القصوى":"400 كم/ساعة", "الداونفورس":"1,100 كغ", "الوزن":"1,030 كغ" },
            engine:{ "المحرك":"6.5L Cosworth V12 NA", "الاستطاعة":"1,155 حصان @ 10,500 RPM", "العزم":"900 Nm @ 6,000 RPM", "نظام هجين":"KERS مستوحى من F1" },
            chassis:{ "الهيكل":"MonoCell كربوني بالكامل", "التعليق":"نشط تكيفي نشط", "ناقل الحركة":"7-Speed تسلسلي", "الفرامل":"F1-grade كربون" },
            bar:{ label:"مؤشر الأداء", value:100 }
          }
        ]
      }
    ]
  },

  // ══ PERFUMES ══════════════════════════════════════════════════════════════
  perfumes: {
    brands:[
      {
        id:"creed", name:"Creed", origin:"Paris / London", founded:"1760", logo:"C",
        tagline:"عطّارو الملوك منذ 1760",
        desc:"أقدم دار عطور فاخرة مستقلة في العالم. كل زجاجة نتيجة حرفية يدوية حقيقية.",
        models:[
          {
            id:"aventus", name:"Aventus", color:"#D4A5C9", year:"2010",
            type:"Woody Aromatic Chypre", price:"$495 / 50ml",
            tags:["Masculine","Projection Beast","Iconic","Batch-Variable"],
            story:"أطلقه أوليفييه كريد تكريماً لنابليون. منذ 2010 وهو الأكثر نقاشاً ومبيعاً في تاريخ العطور الراقية — يختلف من دفعة لأخرى ومن جلد لآخر.",
            highlights:["كل دفعة إنتاج تختلف قليلاً — المجمّعون يصنّفون كل batch","بتولا مدخّنة في القلب تميّزه فوراً قبل أن ترى الزجاجة","حضور إشعاعي يصل 3 أمتار — يسبق دخولك الغرفة"],
            pyramid:{ "رائحة القمة":"برغموت إيطالي، أناناس، تفاح أخضر، كاسيس", "رائحة القلب":"بتولا مدخّنة، ورد بلغاري، ياسمين، نعناع", "رائحة القاعدة":"مسك، عنبر رمادي، عود، باتشولي، أملبريت" },
            character:{ "العائلة الشمية":"Woody Chypre Aromatic", "التركيز":"Eau de Parfum", "الانتشار":"عالي جداً (8/10)", "الديمومة":"12–14 ساعة", "الموسم المثالي":"خريف / شتاء / ربيع" },
            notes:{ "المُعطّر":"أوليفييه كريد", "سنة الإطلاق":"2010", "الأحجام":"30 / 50 / 100 / 250ml", "اللانشر الخاص":"Aventus for Her (2016)" },
            bar:{ label:"قوة الحضور", value:95 }
          },
          {
            id:"virgin", name:"Virgin Island Water", color:"#7EC8E3", year:"2007",
            type:"Tropical Aquatic Fresh", price:"$410 / 50ml",
            tags:["Unisex","Beach Signature","Rum","Summer Masterpiece"],
            story:"الرحلة في زجاجة. اختلط فيها عصير الليمون والرم الكاريبي مع نسيم جوز الهند. الأقل توقعاً من كريد — والأكثر فرحاً.",
            highlights:["الرم الحقيقي في التركيبة — ليس مجرد تأثير","يُعيد ذاكرة الشاطئ والصيف بمجرد رشّة واحدة","Unisex حقيقي — يعمل على الجلد الأنثوي والذكوري بشكل مختلف وجميل"],
            pyramid:{ "رائحة القمة":"ليمون أخضر، رم كاريبي، جوز هند طازج", "رائحة القلب":"زنجبيل، خيزران، موز خضر", "رائحة القاعدة":"مسك أبيض، خشب أرز فرجيني" },
            character:{ "العائلة الشمية":"Tropical Aquatic Fougere", "التركيز":"Eau de Parfum", "الانتشار":"معتدل (5/10)", "الديمومة":"8–10 ساعات", "الموسم المثالي":"ربيع / صيف حصراً" },
            notes:{ "المُعطّر":"Pierre Bourdon", "سنة الإطلاق":"2007", "الأحجام":"50 / 100 / 250ml", "تحذير":"لا يناسب الطقس البارد" },
            bar:{ label:"الانتعاش والخفة", value:85 }
          },
        ]
      },
      {
        id:"mfk", name:"Maison Francis Kurkdjian", origin:"Paris, FR", founded:"2009", logo:"MFK",
        tagline:"العطر كفن معماري — هندسة شمية",
        desc:"فرانسيس كوركجيان — العطّار الذي فاز بـ Prix François Coty وهو في الثلاثينيات. MFK دار تخصصها الكمال الفرنسي الحديث.",
        models:[
          {
            id:"br540", name:"Baccarat Rouge 540", color:"#E8B4A0", year:"2015",
            type:"Floral Woody Musky Amber", price:"$335 / 70ml",
            tags:["Unisex","Global Phenomenon","Compliment Magnet","Long-Lasting"],
            story:"أُنشئ أصلاً لدار Baccarat للكريستال كعطر حصري. حين طرحه MFK للعموم, أصبح الأكثر تداولاً في السوشيال ميديا — ظاهرة لا تُفسَّر.",
            highlights:["بلّورة الأملبريت (Ambroxan) هي سر دفء لا ينتهي","الزعفران + ياسمين + عود = مثلث يُدمن عليه أي أنف","أثار أكثر من 200 محاولة تقليد في السوق — لم تنجح أي"],
            pyramid:{ "رائحة القمة":"زعفران فارسي، تفاح البخور (فريو)", "رائحة القلب":"ياسمين مصري (جراند كرو)، ورد جوري", "رائحة القاعدة":"عود، أملبريت (Ambroxan)، أرز سيدار" },
            character:{ "العائلة الشمية":"Woody Floral Amber Musky", "التركيز":"Eau de Parfum", "الانتشار":"كثيف جداً (9/10)", "الديمومة":"14–16+ ساعة", "الموسم المثالي":"طوال العام" },
            notes:{ "المُعطّر":"Francis Kurkdjian", "المصدر":"طُلب من Baccarat Crystal 2014", "الأحجام":"35 / 70 / 200ml + Extrait de Parfum", "نسخة أقوى":"540 Extrait de Parfum — 2022" },
            bar:{ label:"الديمومة والإشعاع", value:97 }
          },
          {
            id:"oud", name:"Oud Satin Mood", color:"#8B5A6E", year:"2015",
            type:"Floral Woody Oriental Oud", price:"$360 / 70ml",
            tags:["Unisex","Oud Gateway","Romantic","Evening"],
            story:"البوابة المثالية لعالم العود لمن يخشاه. كوركجيان أحاط العود بالفانيليا والورد حتى أصبح حضنًا دافئاً لا وحشاً.",
            highlights:["عود مُلطَّف بالفانيليا — مثالي لمن لا يُحب العود الخام","ورد تركي من مزارع Isparta عالية الجودة","يتطور من رومانسي في البداية إلى دافئ وعميق في القاعدة"],
            pyramid:{ "رائحة القمة":"ورد تركي (Isparta)، فانيليا بوربون", "رائحة القلب":"عود هندي، بخور (Olibanum)", "رائحة القاعدة":"مسك أبيض، خشب الأرز الأطلسي، عنبر" },
            character:{ "العائلة الشمية":"Floral Woody Oriental", "التركيز":"Eau de Parfum", "الانتشار":"كثيف (7/10)", "الديمومة":"12–14 ساعة", "الموسم المثالي":"خريف / شتاء / مساء" },
            notes:{ "المُعطّر":"Francis Kurkdjian", "مناسبة":"عشاء، مناسبات رسمية، ليلية", "الأحجام":"70 / 200ml", "ملاحظة":"يحتاج تطور 30 دقيقة على الجلد" },
            bar:{ label:"الدفء والعمق", value:92 }
          },
        ]
      },
      {
        id:"amouage", name:"Amouage", origin:"Muscat, OM", founded:"1983", logo:"A",
        tagline:"هدية الملوك وسحر الشرق الأصيل",
        desc:"تأسست الدار العُمانية الفاخرة بأمر سامي لإحياء تراث العطور الشرقية البديعة.",
        models:[
          {
            id:"interlude", name:"Interlude Man", color:"#1E3A8A", year:"2012",
            type:"Spicy Amber Woody", price:"$360 / 100ml",
            tags:["Beast Mode","Incense","Oryx-grade","Royal"],
            story:"الوحش الأزرق الأسطوري. عطر ذو طابع دخاني وخشبي مهيب، يحيطك بهالة من الهيبة والسلطة الكلاسيكية.",
            highlights:["اللبان الحوجري العماني الفاخر يغلب على القلب","ثبات يدوم لأيام على الملابس والجلد بلا كلل","توازن حاد بين التوابل والأخشاب النبيلة"],
            pyramid:{ "رائحة القمة":"الأوريغانو، الفلفل الأسود، البرغموت", "رائحة القلب":"البخور، العنبر، الأوبوبوناكس، القريضة", "رائحة القاعدة":"الجلود، العود، الباتشولي، خشب الصندل" },
            character:{ "العائلة الشمية":"Spicy Amber Woody", "التركيز":"Eau de Parfum", "الانتشار":"وحشي (10/10)", "الديمومة":"24+ ساعة", "الموسم المثالي":"الشتاء والأجواء الباردة" },
            notes:{ "المُعطّر":"Pierre Negrin", "سنة الإطلاق":"2012", "الأحجام":"50 / 100ml", "ملاحظة":"عطر شتوي بامتياز" },
            bar:{ label:"قوة الديمومة والثبات", value:99 }
          }
        ]
      },
      {
        id:"roja", name:"Roja Parfums", origin:"London, UK", founded:"2011", logo:"R",
        tagline:"أفخم عطور الأرض قاطبة",
        desc:"ابتكرها روجا دوف بمكونات تفوق في نقائها وسعرها غرامات الذهب الخالص.",
        models:[
          {
            id:"elysium", name:"Elysium Pour Homme", color:"#1565C0", year:"2017",
            type:"Fresh Citrus Fougere", price:"$315 / 100ml",
            tags:["Elite Fresh","Seductive","Niche Standard","Summery"],
            story:"بوابة العطور المنعشة الراقية. عطر يفيض بالحيوية والأناقة، يجمع بين الفواكه والجلود بانسجام تام.",
            highlights:["جريب فروت طبيعي بالكامل ومشرق للغاية","قاعدة مسكية عنبرية تمنحه لمسة ترف لا تقاوم","محبوب الملايين وأكثر عطور روجا مبيعاً"],
            pyramid:{ "رائحة القمة":"الجريب فروت، الليمون، الزعتر، البرغموت", "رائحة القلب":"التفاح، الياسمين، الفلفل الوردي، نجيل الهند", "رائحة القاعدة":"العنبر الرمادي، الجلود، الفانيليا، الأرز" },
            character:{ "العائلة الشمية":"Citrus Aromatic Fougere", "التركيز":"Parfum Cologne", "الانتشار":"عالي جداً (7/10)", "الديمومة":"8–10 ساعات", "الموسم المثالي":"الربيع والصيف" },
            notes:{ "المُعطّر":"Roja Dove", "سنة الإطلاق":"2017", "الأحجام":"100ml", "ملاحظة":"عطر نهاري بامتياز" },
            bar:{ label:"نقاء المكونات الطبيعية", value:94 }
          }
        ]
      }
    ]
  },

  // ══ WATCHES ═══════════════════════════════════════════════════════════════
  watches: {
    brands:[
      {
        id:"patek", name:"Patek Philippe", origin:"Geneva, CH", founded:"1839", logo:"PP",
        tagline:"You never actually own a Patek Philippe",
        desc:"الدار التي تصنع أقل من 70,000 ساعة سنوياً — وكل واحدة منها تحفة لا تُكرَّر.",
        models:[
          {
            id:"nautilus5711", name:"Nautilus 5711/1A-011", color:"#4A9B7F", year:"2021",
            type:"Integrated Steel Bracelet", price:"$150,000–$200,000 (السوق الثانوية)",
            tags:["Discontinued","Steel GOAT","Opaline Dial","Green Bezel 2021"],
            story:"توقّفت باتيك عن إنتاجها عام 2021 — فارتفع سعرها ثلاثة أضعاف في أسبوع. اللون الأخير كان Tiffany Blue وصل في المزادات إلى $6.5 مليون.",
            highlights:["جيرالد جنتا رسمها في ليلة واحدة عام 1972 على علبة سجائر","نسيج الأوجانو على القرص — نمط أيقوني لا يُنسخ بكفاءة","السعر في السوق ارتفع 300% بعد إيقاف الإنتاج"],
            movement:{ "الحركة":"Calibre 26-330 S C", "النوع":"أوتوماتيك ذاتي التعبئة", "الدوران":"21,600 vph", "الاحتياطي":"45 ساعة", "عدد القطع":"324 قطعة" },
            case:{ "القطر":"40 ملم", "السُمك":"8.3 ملم", "المادة":"فولاذ 316L المصقول/المفروش", "المقاومة":"120 متر", "الزجاج":"صفير مقبب (وجهان)" },
            dial:{ "النوع":"Opaline مع نسيج Clous de Paris", "المؤشرات":"Baton ذهب أبيض مدمج", "لون الإبرات":"ذهب أبيض", "التاريخ":"نافذة 3 ساعة" },
            bar:{ label:"ندرة الحصول عليها اليوم", value:99 }
          },
          {
            id:"sky6002", name:"Sky Moon Tourbillon 6002G", color:"#F0E68C", year:"2019",
            type:"Double-Sided Grand Complication", price:"$1,200,000–$1,800,000",
            tags:["Platinum","12 Complications","Double Tourbillon","Celestial Map"],
            story:"الساعة التي تُبيّن أن باتيك تصنع فناً, لا توقيتاً. وجهان، 12 وظيفة، خريطة سماء تتحرك بدقة فلكية — وسنوات عمل خلف كل قطعة.",
            highlights:["خريطة سماء متحركة تعرض موقع النجوم في أي مكان بالعالم","الـMinute Repeater يُنتج أصفى رنين في تاريخ الساعات","تحتاج ساعات عمل أسبوعياً من الحرفيين لإنهاء وجه واحد"],
            movement:{ "الحركة":"Calibre R TO 27 QR SID LU CL", "النوع":"يدوي التعبئة", "التعقيدات":"12 وظيفة كاملة", "عدد القطع":"686 قطعة", "مدة التصنيع":"سنوات لكل قطعة" },
            case:{ "القطر":"42.8 ملم", "السُمك":"16.25 ملم", "المادة":"ذهب أبيض 18 قيراط", "المقاومة":"30 متر", "الوجهان":"أمامي + خلفي — كلاهما معقّد" },
            complications:{ "الوجه الأمامي":"Perpetual Calendar + Minute Repeater + Moonphase", "الوجه الخلفي":"Celestial Chart + Sidereal Time + Tourbillon مزدوج", "إضافات":"وقت شروق وغروب الشمس" },
            bar:{ label:"التعقيد الهندسي", value:100 }
          },
        ]
      },
      {
        id:"ap", name:"Audemars Piguet", origin:"Le Brassus, CH", founded:"1875", logo:"AP",
        tagline:"منذ 1875 — يتحدّى العرف ويُعيد تعريف الجرأة",
        desc:"AP من الدرجة الأولى في جرأة التصميم. Royal Oak، Offshore، Code 11.59 — كلها أثارت الجدل ثم أصبحت أيقونات.",
        models:[
          {
            id:"offshore44ti", name:"Royal Oak Offshore 44 Titanium", color:"#4A90D9", year:"2022",
            type:"Sport Luxury Chronograph", price:"$38,500",
            tags:["Titanium","70hr Reserve","COSC Certified","Tapisserie"],
            story:"The Beast. ضخامة مدروسة، وحشية مضبوطة. الأوفشور 44 لمن يريد أن يُثير الاهتمام قبل أن يتكلم.",
            highlights:["70 ساعة احتياطي طاقة — استثنائي في الفئة","تيتانيوم Grade 23 أخف وأصلب من الفولاذ","نسيج الـTapisserie على القرص — يدوي بالكامل"],
            movement:{ "الحركة":"Calibre 4401", "النوع":"أوتوماتيك ذاتي التعبئة", "الدوران":"21,600 vph", "الاحتياطي":"70 ساعة", "شهادة الدقة":"COSC ±4 ث/يوم" },
            case:{ "القطر":"44 ملم", "السُمك":"14.4 ملم", "المادة":"تيتانيوم Grade 23", "المقاومة":"100 متر", "المزلاج":"Folding Clasp تيتانيوم" },
            dial:{ "النوع":"Méga Tapisserie (يدوي)", "الكرونوغراف":"3 عقارب + 30دق + 12ساعة", "لون القرص":"فحمي مع لمسات زرقاء", "المؤشرات":"Appliqué معدنية" },
            bar:{ label:"احتياطي الطاقة", value:85 }
          },
          {
            id:"concept_ft", name:"Concept Flying Tourbillon GMT", color:"#1A2744", year:"2021",
            type:"Openworked Grand Complication", price:"$380,000",
            tags:["Limited","Flying Tourbillon","GMT","Titanium","Skeletonized"],
            story:"الشفافية المطلقة. كل تروس الحركة مكشوفة خلف زجاج الصفير. الفن الميكانيكي في أعلى تجلياته — توربيون يطير دون محور سفلي.",
            highlights:["Flying Tourbillon — لا محور سفلي، يُعطي وهم الطيران","مجوّف بالكامل — ترى الحركة مباشرة من الوجهين","إنتاج محدود لا يُكشف عن عدده"],
            movement:{ "الحركة":"Calibre 2953 (AP خاص)", "النوع":"يدوي التعبئة", "الاحتياطي":"72 ساعة", "التعقيد":"Flying Tourbillon + GMT", "عدد القطع":"343 قطعة" },
            case:{ "القطر":"44 ملم", "السُمك":"10.4 ملم", "المادة":"تيتانيوم + DLC Black", "المقاومة":"20 متر فقط", "الهيكل":"مجوّف من وجهين" },
            dial:{ "القرص":"لا يوجد — هيكل مكشوف كامل", "الجسر الرئيسي":"تيتانيوم منقوش يدوياً", "لون الحركة":"رمادي + ذهبي", "الميناء":"لا يوجد — الحركة ظاهرة" },
            bar:{ label:"التعقيد الهندسي", value:96 }
          },
        ]
      },
      {
        id:"vacheron", name:"Vacheron Constantin", origin:"Geneva, CH", founded:"1755", logo:"VC",
        tagline:"أقدم صانع ساعات مستمر بلا انقطاع",
        desc:"فخر جنيف الأبدي. تمثل الساعات الفاخرة التي تحمل شعار صليب مالطا قمة الصياغة الراقية.",
        models:[
          {
            id:"overseas", name:"Overseas Dual Time", color:"#0D47A1", year:"2023",
            type:"Luxury Sports GMT", price:"$31,000",
            tags:["Maltese Cross","Triple Straps","AM/PM Indicator"],
            story:"رفيق الترحال المرموق. تجمع ساعة Overseas بين مقاومة الماء القوية والهندسة المتأصلة.",
            highlights:["صليب مالطا المحفور على جوانب السوار المعدني الأنيق","نظام ذكي وسريع لتغيير السوار من فولاذ إلى مطاط أو جلد طبيعي","مؤشر ليل/نهار لراحة المسافر الفاخر عبر القارات"],
            movement:{ "الحركة":"Calibre 5110 DT", "النوع":"أوتوماتيك ذاتي التعبئة", "القطع":"234 قطعة", "الاحتياطي":"60 ساعة" },
            case:{ "القطر":"41 ملم", "السُمك":"12.8 ملم", "المادة":"فولاذ 316L فائق المقاومة", "المقاومة":"150 متر" },
            dial:{ "النوع":"أزرق مطلي بالورنيش الشفاف", "المؤشرات":"ذهب أبيض عيار 18 مطلي بمادة لومينوفا" },
            bar:{ label:"ملائمة السفر الفاخر", value:95 }
          }
        ]
      },
      {
        id:"rolex", name:"Rolex", origin:"Geneva, CH", founded:"1905", logo:"R",
        tagline:"التاج الأيقوني وعلامة الإنجاز الإنساني",
        desc:"توقيت الملوك والرؤساء ومحطمي الأرقام القياسية العالمية.",
        models:[
          {
            id:"daytona", name:"Cosmograph Daytona", color:"#111111", year:"2024",
            type:"Sport Luxury Chronograph", price:"$15,100 (رسمي) — $35,000+",
            tags:["Cerachrom","Chronometer","Oystersteel","Paul Newman Legacy"],
            story:"ساعة سباق السيارات الرياضية الأشهر تاريخياً. لا تزال Daytona متربعة على عرش الرغبة والطلب العالمي بلا منازع.",
            highlights:["إطار Cerachrom مدمج بمقياس تاكيمتر مقاوم للخدش تماماً","دقة متناهية معتمدة من معهد COSC السويسري بنسبة تفوق ±2 ثانية في اليوم","تاريخ حافل بالمجمّعين والمزادات العالمية"],
            movement:{ "الحركة":"Calibre 4131 (Rolex خاص)", "النوع":"أوتوماتيك ذاتي التعبئة", "الاحتياطي":"72 ساعة", "الدقة":"±2 ثانية/يوم (كرونومتر خارق)" },
            case:{ "القطر":"40 ملم", "المادة":"Oystersteel 904L", "المقاومة":"100 متر", "الزجاج":"صفير مقاوم للانعكاس" },
            dial:{ "القرص":"أسود متباين مع حلقات فضية للعدادات الثلاثية" },
            bar:{ label:"قيمة الاستثمار طويل الأجل", value:98 }
          }
        ]
      }
    ]
  },

  // ══ FASHION ═══════════════════════════════════════════════════════════════
  fashion: {
    brands:[
      {
        id:"loro", name:"Loro Piana", origin:"Quarona, IT", founded:"1924", logo:"LP",
        tagline:"الفخامة التي لا تصرخ — أندر الألياف الطبيعية",
        desc:"لورو بيانا تملك حقوق حصرية على الڤيكونيا البيروفية وعلى Baby Cashmere الهيركاني. لا تُعلن ولا تُبرز شعارها — الخامة تتكلم.",
        models:[
          {
            id:"vicuna_coat", name:"معطف الڤيكونيا الكامل", color:"#C9A87E", year:"2024",
            type:"Ultra-Luxury Statement Outerwear", price:"$18,000 – $60,000",
            tags:["Vicuña","12 Microns","Hand-Loomed Peru","CITES Protected"],
            story:"أغلى خيط حيواني في العالم. الڤيكونيا تُقصّ مرة كل سنتين، ولا تُستأصل بالذبح — محمية بموجب اتفاقية CITES الدولية منذ 1975.",
            highlights:["12 ميكرون — أرق من الكشمير بـ30%، أكثر دفئاً بـ40%","30 ڤيكونيا على الأقل لكل معطف واحد","المنسوج يدوياً بنول تقليدي في بيرو، التشطيب في إيطاليا"],
            fiber:{ "الخامة":"100% Vicuña (Vicugna vicugna)", "النعومة":"12 ميكرون (أدق من الإنسان × 7)", "المصدر":"Pampas Galeras, Peru 4,500m", "طريقة الجمع":"Chaku — طقس أندي سنوي", "الكمية السنوية":"5,000 كغ فقط عالمياً" },
            craft:{ "النسج":"نول يدوي تقليدي", "الخياطة":"يدوية في قوارنا إيطاليا", "مدة التصنيع":"6 أشهر للقطعة الواحدة", "العناية":"تنظيف جاف عند متخصص فقط", "عمر القطعة":"يتجاوز عمر صاحبها" },
            sizing:{ "النماذج المتاحة":"معطف، سترة، وشاح، بطانية", "الألوان":"ذهبي طبيعي (لون الڤيكونيا) أو مصبوغ", "التخصيص":"بيسبوك متاح بـ+40%", "الحماية القانونية":"CITES Appendix II — محمية دولياً" },
            bar:{ label:"ندرة الخامة عالمياً", value:100 }
          },
          {
            id:"baby_cashmere_hoodie", name:"هودي Baby Cashmere", color:"#E8DCC8", year:"2024",
            type:"Ultra-Fine Knitwear", price:"$3,200",
            tags:["Baby Cashmere","14 Microns","Hircus Goat","Seasonal"],
            story:"كشمير صغار الماعز الهيركاني قبل أول تساقط طبيعي — 14 ميكرون من النعومة الخيالية. LP تملك حقوق حصرية على هذا الخيط.",
            highlights:["14 ميكرون — الكشمير العادي 16–18، الكشمير الرديء 20+","كل صغير ماعز يُنتج 80–100 غرام فقط سنوياً","LP تملك حقوقاً حصرية على الاسم والخيط"],
            fiber:{ "الخامة":"100% Baby Cashmere Hircus", "النعومة":"14–14.5 ميكرون", "المصدر":"إيران + أفغانستان (الأقل تلوثاً)", "عمر الحيوان":"أول تساقط فقط قبل 6 أشهر", "الكمية السنوية":"30 طن فقط عالمياً" },
            craft:{ "الحياكة":"آلة إيطالية 16-gauge (أدق ما يُصنع)", "الغرزة":"Jersey + Rib (بحسب القطعة)", "الصباغة":"طبيعية + كيميائية بارزة بلا أضرار", "العناية":"غسيل بارد يدوي — تجفيف مسطح فقط", "الكي":"بخار خفيف فقط" },
            sizing:{ "النماذج":"هودي، كنزة، كارديجان، بدلة", "الألوان":"40+ درجة موسمية", "مقاسات":"XS → XXL مع تفصيل اختياري", "التخصيص":"monogram يدوي متاح" },
            bar:{ label:"نعومة الخيط", value:96 }
          },
        ]
      },
      {
        id:"hermes", name:"Hermès", origin:"Paris, FR", founded:"1837", logo:"H",
        tagline:"منذ 1837 — الحرفي في قلب كل قطعة",
        desc:"Hermès بدأت صانعة سروج خيل للأرستقراطية الفرنسية. اليوم كل حقيبة تُصنع بنفس فلسفة السرج — حرفي واحد، من البداية للنهاية.",
        models:[
          {
            id:"birkin25", name:"Birkin 25 Togo Leather", color:"#BF5E3B", year:"1984 (أيقونة مستمرة)",
            type:"Ultimate Status Handbag", price:"$12,000 (رسمي) — $500,000+ (مزادات)",
            tags:["Togo","Handstitched","18K Hardware","100yr Warranty"],
            story:"وُلدت في طائرة عندما التقت Jane Birkin بالرئيس التنفيذي Jean-Louis Dumas وشكت من صعوبة إيجاد حقيبة جيدة. أخرج مظروفاً ورسم عليه تصميماً.",
            highlights:["حرفي واحد يصنع كل قطعة من البداية للنهاية — 18–24 ساعة عمل","إبزيم Palladium أو ذهب 18 قيراط — يدوي بالكامل","ترتفع قيمتها 14.2% سنوياً في المتوسط — تتفوق على S&P500 تاريخياً"],
            leather:{ "نوع الجلد":"Togo (عجل فرنسي مدبوغ بنباتات)", "الخصائص":"ناعم، مقاوم للخدش، يتحسن بالاستخدام", "البديل الأندر":"Niloticus Crocodile / Himalaya", "الخياطة":"Saddle Stitch يدوي بإبرتين", "الخيط":"حرير لينين مشمّع" },
            hardware:{ "المعدن الأساسي":"Palladium (فضي مطفأ)", "البديل":"Gold-Plated 18K", "الإبزيم":"Turnlock يدوي (laquage)", "التخصيص":"Rose Gold، Permabrass، Brushed Gold", "الختم":"مكتوب يدوياً في باريس" },
            market:{ "قائمة الانتظار":"5–10 سنوات رسمياً", "الحصول عليها":"يتطلب تاريخ شراء مع Hermès", "عائد الاستثمار":"14.2% سنوياً (Knight Frank 2022)", "الأحجام":"25 / 30 / 35 / 40 سم", "ندرة Himalaya":"واحدة أو اثنتان سنوياً عالمياً" },
            bar:{ label:"عائد الاستثمار التاريخي", value:92 }
          },
        ]
      },
      {
        id:"brioni", name:"Brioni", origin:"Rome, IT", founded:"1945", logo:"B",
        tagline:"بدلة الرجل النبيل ومقياس الهيبة الإيطالية",
        desc:"كل خط مرسوم باليد، وكل غرزة مصممة بقياس الجسد لتتحرك معك كطبقة جلد ثانية.",
        models:[
          {
            id:"bespoke_suit", name:"بدلة بيسبوك غولد لاين", color:"#1B263B", year:"2024",
            type:"Haute Bespoke Tailoring", price:"$15,000 – $45,000",
            tags:["Super 250s Wool","Silk Lining","30+ Measure Points","Roman Cut"],
            story:"البدلة المفضلة لملوك الدبلوماسية ورجال الأعمال. تصنع ببطء مفرط في مشاغل الدار في روما.",
            highlights:["120 ساعة على الأقل من الخياطة اليدوية الخالصة","أصواف 'Super 250s' النادرة والناعمة للغاية كالحرير الطبيعي","تأتي مع ضمان ملائمة كامل وحقيبة سفر مخملية مخصصة"],
            fiber:{ "الخامة":"100% Super 250s Virgin Wool", "البطانة":"حرير طبيعي 100% من بحيرة كومو", "بلد الغزل":"Quarona, Italy" },
            craft:{ "الخياطة":"يدوية كاملة بإبر حريرية دقيقة", "ساعات التحضير":"120–150 ساعة عمل متواصلة", "العناية":"تخزين معلق وتهوية مستمرة فقط" },
            sizing:{ "التخصيص":"تطريز مونوغرام الاسم بخيوط ذهبية عيار 18" },
            bar:{ label:"دقة ومستوى التفصيل يدوياً", value:100 }
          }
        ]
      },
      {
        id:"brunello", name:"Brunello Cucinelli", origin:"Solomeo, IT", founded:"1978", logo:"BC",
        tagline:"ملك الكشمير الإيطالي وروح سولوميو البديعة",
        desc:"فلسفة الفخامة الإنسانية الهادئة والملابس المصنوعة في القرى التاريخية بأمبريا.",
        models:[
          {
            id:"suede_jacket", name:"جاكيت سويدي منجد بالحرير", color:"#8D6E63", year:"2024",
            type:"Luxury Smart Casual Outerwear", price:"$5,200",
            tags:["Premium Suede","Silk-Woven","Solomeo Crafted"],
            story:"يدمج هذا الجاكيت بين متانة الجلد السويدي الإيطالي المختار وفخامة التبطين الحريري الداخلي الناعم.",
            highlights:["جلد سويدي طبيعي ذو ملمس كشميري رقيق للغاية","أزرار طبيعية من قرون الغزال المعالجة باليد","تصميم ذو تفاصيل إنسانية وهندسية هادئة"],
            fiber:{ "المادة":"جلد سويدي طبيعي فائق النعومة", "البطانة":"حرير وتيسير خفيف", "المنشأ":"أتيليه سولوميو، إيطاليا" },
            craft:{ "الحياكة":"آلات ريفية تقليدية باليد", "الكي":"بخار دافئ بمستويات حرارة دقيقة" },
            sizing:{ "الألوان Available":"رمادي حجري، بني كستنائي، بيج سولوميو" },
            bar:{ label:"مستوى النعومة والملمس", value:95 }
          }
        ]
      }
    ]
  },

  // ══ SWEETS ════════════════════════════════════════════════════════════════
  sweets: {
    brands:[
      {
        id:"pierre", name:"Pierre Hermé", origin:"Paris, FR", founded:"1998", logo:"PH",
        tagline:"Picasso of Pastry — باكاسو الحلويات الفرنسية",
        desc:"تتلمذ على يد Gaston Lenôtre في سن 14. أصبح Chef Pâtissier لدى Fauchon في 24. غيّر قواعد الحلويات الفرنسية للأبد وهو في الثلاثينيات.",
        models:[
          {
            id:"ispahan_cake", name:"Ispahan — La Tarte 20cm", color:"#E8A0B4", year:"2001 (أيقونة)",
            type:"Signature Rose-Lychee-Raspberry Tarte", price:"€85 / تورتة للـ6–8",
            tags:["Signature Creation","World-Copied","Rose","Seasonal Lychee"],
            story:"ألهمته حديقة إصفهان الفارسية وشعر الرومي عن الورد. ثلاثة مكونات فقط — لكن توازنها الدقيق يتطلب 3 أيام تحضير ومهارة لا تُتعلم في كتاب.",
            highlights:["الأكثر تقليداً في تاريخ الحلويات الفرنسية الحديثة","الليتشي الطازج موسمي — التورتة تتغير خارج الموسم","كريمة الورد تُصنع من تقطير بتلات ورد حقيقية — ليس مستخلصاً"],
            components:{ "القاعدة":"Dacquoise اللوز — بيض + سكر + لوز خشن", "المحيط":"ماكرون الورد الكبير (15 سم)", "الكريمة":"Mousseline ورد بلغاري من Grasse", "الحشوة":"ليتشي طازج أو معلّب (راهي 5 نجوم)", "التشطيب":"حبات توت العُليق الطازجة منظّمة يدوياً" },
            process:{ "اليوم الأول":"خبز Dacquoise + تحضير كريمة الورد", "اليوم الثاني":"خبز ماكرون الورد + تجميع الطبقات", "اليوم الثالث":"التشطيب + التقديم", "درجة الصعوبة":"عالية جداً — فشل 90% من المحاولات الأولى", "درجة التقديم":"تُقدَّم بارداً (4°C)" },
            tasting:{ "القوام":"ثلاثة طبقات — هش + كريمي + طري في آن واحد", "التوازن":"حموضة التوت تكسر حلاوة الورد والليتشي", "الألوان":"وردي فاتح + أحمر + أخضر — جمال بصري أول", "الديمومة":"3 أيام حداً أقصى (4°C)", "التقطيع":"يحتاج سكيناً مبللاً وساخناً" },
            bar:{ label:"دقة التحضير الفنية", value:97 }
          },
          {
            id:"2000feuilles", name:"2000 Feuilles au Praliné", color:"#D4A56A", year:"2006",
            type:"Reimagined Mille-Feuille", price:"€75 / تورتة",
            tags:["Mille-Feuille Revolution","Praline","Caramel","Deconstructed"],
            story:"أأخذ Hermé أشهر حلوى فرنسية — Mille-Feuille — وقلبها رأساً على عقب. بدلاً من الكريمة السادة، استخدم Praline Feuilletine الذي يبقى هشاً لأيام.",
            highlights:["ابتكر Praline Feuilletine — خليط البندق + الكراميل المُقرمش يمنع الترطيب","القشرات المطبوخة عمياء (à blanc) تضمن الهشاشة المثالية","يُبقى هشاً لـ48 ساعة — عكس الـMille-Feuille التقليدي الذي يلين بساعات"],
            components:{ "العجينة":"Pâte Feuilletée — 729 طبقة زبدة وعجين بالتناوب", "الكريمة":"Mousseline Praliné Feuilletine (بلدق + بندق + Pailleté feuilletine)", "الكراميل":"Caramel au Beurre Salé (نصف مالح)", "التشطيب":"صفائح Feuilletage مكرملة فوق الكريمة", "الديكور":"مسحوق البندق + ذهب خوراقي" },
            process:{ "اليوم الأول":"طي عجينة Feuilletée (6 طيات بفترات تبريد)", "اليوم الثاني":"الخبز العمياء + تصنيع Praline Feuilletine", "اليوم الثالث":"التجميع + الكراميل + التشطيب", "درجة الصعوبة":"خبير فقط — العجينة حساسة للحرارة والرطوبة", "السر":"الزبدة 84% دهون من Poitou-Charentes" },
            tasting:{ "القوام":"هش خارجياً + كريمي مترامش داخلياً", "النكهة":"بندق + كراميل مالح + زبدة عالية الجودة", "الحرارة المثالية":"غرفة (20°C) — مباشر من البراد أقل جودة", "الديمومة":"48 ساعة (4°C)", "التقطيع":"سكين مسنّن فقط" },
            bar:{ label:"تعقيد التقنية الفنية", value:94 }
          },
          {
            id:"mogador_tarte", name:"Mogador — Tarte Passion-Chocolat", color:"#F4A460", year:"2005",
            type:"Exotic Chocolate-Passion Tarte", price:"€75 / تورتة",
            tags:["Passion Fruit","Valrhona Milk Choc 40%","Ganache","Mogador"],
            story:"Mogador — مدينة مغربية ساحلية اليوم تُعرف بالصويرة. ألهم الشيف اسم مقرونه الشهير بالشوكولاتة والباشن فروت — ثم حوّله تورتة كاملة.",
            highlights:["Ganache يستخدم Valrhona Jivara 40% فقط — لا شوكولاتة بديلة","الباشن فروت من مزارع برازيلية محددة — الحموضة تُوازن دهنية الـGanache بدقة","طبقة Croustillant Feuilletine تمنع تراجع الجودة لـ48 ساعة"],
            components:{ "القاعدة":"Pâte Sablée بالشوكولاتة (مُقرمشة ملوّنة)", "Croustillant":"Feuilletine + Jivara 40% + Praliné (طبقة هشة حاجزة)", "Ganache":"Jivara 40% + كريمة 35% + باشن فروت طازج", "Crémeux":"باشن فروت + بيض + زبدة (طبقة حامضة)", "التشطيب":"مرآة شوكولاتة حليب + بذور Passion للديكور" },
            process:{ "اليوم الأول":"خبز القاعدة + صنع Ganache + تبريد الطبقات", "اليوم الثاني":"تجميع الطبقات + Crémeux + التبريد", "التشطيب":"مرآة الشوكولاتة تُصب في آخر 2 ساعة", "درجة الصعوبة":"عالية — الـGanache يتجمد بسرعة", "درجة صب المرآة":"31–32°C بالضبط" },
            tasting:{ "التوازن":"حموضة الباشن فروت 45% + دهنية الشوكولاتة 55%", "الديمومة":"48 ساعة (4°C)", "تسلسل النكهة":"أول شوكولاتة حليب → ثم انفجار الباشن → ثم هشاشة القاعدة", "الحرارة المثالية":"15–18°C — يُخرج من البراد 20 دقيقة قبل التقديم" },
            bar:{ label:"توازن النكهات المتضادة", value:93 }
          },
        ]
      },
      {
        id:"valrhona", name:"Valrhona", origin:"Tain-l'Hermitage, FR", founded:"1922", logo:"V",
        tagline:"Ensemble on va plus loin — معاً نصل أبعد",
        desc:"أسسها Albéric Guironnet عام 1922 بهدف واحد: تعليم العالم ما هي الشوكولاتة الحقيقية. اليوم تُدرّب 25,000 شيف سنوياً في Cité du Chocolat.",
        models:[
          {
            id:"guanaja70", name:"Guanaja 70% — Grand Cru", color:"#3D1A00", year:"1986",
            type:"Intense Dark Chocolate Grand Cru", price:"€25 / 250g | €180 / كغ",
            tags:["First 70%","Grand Cru","Professional Standard","1986 Pioneer"],
            story:"1986 — العالم كله يصنع شوكولاتة داكنة بنسبة 60% أو أقل. Valrhona كسرت القاعدة وأطلقت أول 70% رسمية. الصناعة كلها تبعتها بعد 10 سنوات.",
            highlights:["أول شوكولاتة 70% في التاريخ — 1986","تُستخدم في 80% من مطاعم الميشلان 3 نجوم عالمياً","اسمها من Guanaja — جزيرة هندوراس حيث لمس Columbus الكاكاو أول مرة"],
            origin_story:{ "بلد المنشأ":"Trinidad + جزر الكاريبي (blend)", "نوع الحبة":"Trinitario (هجين Forastero + Criollo)", "المزارع":"شراكات مباشرة مع المزارعين", "التخمير":"7–10 أيام مُراقَب", "التجفيف":"شمسي طبيعي على طاولات مرتفعة" },
            profile:{ "نسبة الكاكاو":"70%", "النكهات الأساسية":"فاكهة حمراء، قهوة، كاكاو عميق", "النكهات الثانوية":"توابل، عرق الليمون، خشب", "الحموضة":"متوسطة (مميزة)", "الحلاوة المتبقية":"ضعيفة — مرجعية للداكنة" },
            technical:{ "قطعة التذوق":"كسرها يُصدر صوتاً (Snap) — علامة جودة", "نقطة الإذابة":"31–32°C (يذوب عند لمسه تقريباً)", "الـCrystallization":"Form V فقط للبريق المثالي", "التخزين":"16–18°C / رطوبة أقل من 60%", "العمر":"24 شهر في التخزين الصحيح" },
            uses:{ "الـGanache":"المرجع الذهبي عالمياً", "الـMousse":"يُعطي بنية مثالية", "الـTempering":"يستجيب بدقة استثنائية", "الخبز":"يحتفظ بنكهته حتى 200°C", "التذوق المباشر":"يُذاب على اللسان ببطء — لا يُمضغ" },
            bar:{ label:"عمق الكاكاو وشدته", value:85 }
          },
          {
            id:"dulcey32", name:"Dulcey Blond 32%", color:"#D4A017", year:"2012",
            type:"Blonde Chocolate — 4th Category", price:"€22 / 250g",
            tags:["Happy Accident","Blonde","4th Category","Caramel Biscuit","Unique"],
            story:"2006 — الشيف Frédéric Bau نسي زجاجة شوكولاتة بيضاء في Bain-marie على حرارة منخفضة لساعات. حين عاد وجد لوناً ذهبياً ونكهة لم يتخيلها. 6 سنوات تجارب قبل الإطلاق عام 2012.",
            highlights:["اكتُشفت بالصدفة التامة — أهم اكتشاف في الشوكولاتة منذ عقود","الفئة الرابعة: داكنة / حليب / بيضاء / بلوند — Dulcey أسّستها","طعم البسكويت والكراميل لا نظير له في أي شوكولاتة أخرى"],
            origin_story:{ "المبتكر":"Frédéric Bau (Chef École Valrhona)", "سنة الاكتشاف":"2006 — بالصدفة", "سنة الإطلاق":"2012 — بعد 6 سنوات تجارب", "الأساس":"White Chocolate مُكرملة ببطء (120°C / 4–6 ساعات)", "مكونات سر الصنع":"حليب مجفف + سكر مكرمل + كاكاو butter" },
            profile:{ "نسبة الكاكاو":"32% (كاكاو butter فقط — لا solid)", "اللون":"ذهبي — Dulcey = دُلسيّ بالإسبانية (حلو)", "النكهات الأساسية":"بسكويت بلغاري، كراميل مالح خفيف", "النكهات الثانوية":"فانيليا، حليب كامل الدسم", "الحموضة":"لا توجد — ناعمة كلياً" },
            technical:{ "نقطة الإذابة":"28–29°C (أسرع من الداكنة)", "الـCrystallization":"Form V — أصعب من الداكنة", "التخزين":"16°C / رطوبة أقل 50% (أحساس للرطوبة)", "العمر":"12 شهر (أقل من الداكنة)", "التحدي":"يتطلب دقة تمبير أعلى لأنه أقل استقراراً" },
            uses:{ "الـGanache":"يُعطي Ganache دافئاً لا نظير له", "الـMousse":"خفيف ومذاق استثنائي", "التزيين":"لونه الذهبي ديكور بحد ذاته", "السكب":"مرايا بلوند — اتجاه جديد", "المزج":"مع Guanaja = توازن غير متوقع" },
            bar:{ label:"تفرد النكهة وعدم الوجود البديل", value:99 }
          },
        ]
      },
      {
        id:"laduree", name:"Ladurée", origin:"Paris, FR", founded:"1862", logo:"L",
        tagline:"مخترع الماكرون الفرنسي الكلاسيكي المزدوج",
        desc:"تأسست الدار في شارع رويال بباريس لتمثل الفخامة والمذاق الأرستقراطي الراقي.",
        models:[
          {
            id:"box_gold_macarons", name:"صندوق ماكرون الملوك الذهبي", color:"#E1BEE7", year:"2024",
            type:"Royal Confectionery Box", price:"€45 / 12 Pieces",
            tags:["Tahiti Vanilla","Pistachio","24K Gold Foil","Classic"],
            story:"تشكيلة بديعة مصنوعة من أنعم دقيق لوز ومزينة يدوياً بأوراق الذهب عيار 24 الصالحة للأكل.",
            highlights:["استخدام الفانيليا الطبيعية المستوردة من جزر تاهيتي","قشور اللوز متناهية النعومة وتذوب في الفم بلطف وسحر","التعبئة والتغليف في صندوق مخملي فاخر يستحق التقدير"],
            components:{ "القشرة":"دقيق اللوز الفاخر مع بياض البيض والسكر المطحون دقيقاً", "الكريمة":"غاناش الشوكولاتة البيضاء مع خلاصة فانيليا تاهيتي النادرة" },
            process:{ "تخمير العجينة":"خبز على حرارة 140 درجة لمدة 12 دقيقة", "التزيين":"تطبيق رقائق الذهب عيار 24 يدوياً بملقط خاص" },
            bar:{ label:"الأناقة والفخامة الفرنسية", value:96 }
          }
        ]
      }
    ]
  },

};

// ─── CATEGORY-SPECIFIC MODAL RENDERER ─────────────────────────────────────────
function CarsModalContent({ m, color }: ModalContentProps) {
  return (
    <>
      <Section title="أداء قياسي" color={color}>
        <Grid2 data={m.perf} color={color} />
      </Section>
      <Section title="المحرك والقوة" color={color}>
        <Grid2 data={m.engine} color={color} />
      </Section>
      <Section title="الشاصي والأبعاد" color={color}>
        <Grid2 data={m.chassis} color={color} />
      </Section>
    </>
  );
}

function PerfumesModalContent({ m, color }: ModalContentProps) {
  return (
    <>
      <Section title="هرم الرائحة" color={color}>
        <PyramidBlock data={m.pyramid} color={color} />
      </Section>
      <Section title="شخصية العطر" color={color}>
        <Grid2 data={m.character} color={color} />
      </Section>
      <Section title="معلومات المعطّر" color={color}>
        <Grid2 data={m.notes} color={color} />
      </Section>
    </>
  );
}

function WatchesModalContent({ m, color }: ModalContentProps) {
  return (
    <>
      <Section title="الحركة الداخلية" color={color}>
        <Grid2 data={m.movement} color={color} />
      </Section>
      <Section title="العلبة والقياسات" color={color}>
        <Grid2 data={m.case} color={color} />
      </Section>
      <Section title={m.dial ? "القرص والوجه" : m.complications ? "التعقيدات الكاملة" : "مواصفات إضافية"} color={color}>
        <Grid2 data={m.dial || m.complications} color={color} />
      </Section>
    </>
  );
}

function FashionModalContent({ m, color }: ModalContentProps) {
  return (
    <>
      <Section title={m.fiber ? "الخامة والألياف" : m.leather ? "الجلد والخياطة" : "المادة الخام"} color={color}>
        <Grid2 data={m.fiber || m.leather} color={color} />
      </Section>
      <Section title={m.craft ? "الصناعة والحرفية" : m.hardware ? "المعادن والإبازيم" : "التفاصيل"} color={color}>
        <Grid2 data={m.craft || m.hardware} color={color} />
      </Section>
      <Section title={m.sizing ? "الأحجام والتخصيص" : m.market ? "السوق والاستثمار" : "إضافي"} color={color}>
        <Grid2 data={m.sizing || m.market} color={color} />
      </Section>
    </>
  );
}

function SweetsModalContent({ m, color }: ModalContentProps) {
  return (
    <>
      <Section title="مكونات القطعة" color={color}>
        <ComponentsBlock data={m.components} color={color} />
      </Section>
      <Section title="عملية التحضير" color={color}>
        <Grid2 data={m.process} color={color} />
      </Section>
      <Section title="التذوق والتقديم" color={color}>
        <Grid2 data={m.tasting || m.origin_story || m.profile} color={color} />
      </Section>
      {m.technical && (
        <Section title="التقنية والتخزين" color={color}>
          <Grid2 data={m.technical} color={color} />
        </Section>
      )}
      {m.uses && (
        <Section title="الاستخدامات الاحترافية" color={color}>
          <Grid2 data={m.uses} color={color} />
        </Section>
      )}
    </>
  );
}

// ─── SHARED SUBCOMPONENTS ──────────────────────────────────────────────────────
function Section({ title, color, children }: SectionProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "8px", color: color, fontFamily: "monospace",
        letterSpacing: "0.22em", marginBottom: "10px", opacity: 0.8,
        display: "flex", alignItems: "center", gap: "8px"
      }}>
        <div style={{ width: "16px", height: "1px", background: color, opacity: 0.5 }} />
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function Grid2({ data, color }: Grid2Props) {
  if (!data) return null;
  const entries = Object.entries(data);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{
          background: "#0e0e0e", border: "1px solid #1c1c1c",
          borderRadius: "8px", padding: "11px 10px",
        }}>
          <div style={{ fontSize: "7px", color: "#484848", fontFamily: "monospace", letterSpacing: "0.12em", marginBottom: "5px" }}>
            {k.replace(/_/g, " ")}
          </div>
          <div style={{ fontSize: "11px", color: "#d8d8d8", fontFamily: "'Cormorant Garamond', serif", lineHeight: "1.4" }}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

function PyramidBlock({ data, color }: PyramidBlockProps) {
  if (!data) return null;
  const layers = [
    { key: "رائحة القمة",  icon: "▲", note: "أول 15 دقيقة" },
    { key: "رائحة القلب",  icon: "◆", note: "15 دقيقة – 4 ساعات" },
    { key: "رائحة القاعدة",icon: "▼", note: "4 ساعات+" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {layers.map((l, i) => {
        const val = data[l.key];
        if (!val) return null;
        const widths = ["80%", "92%", "100%"];
        return (
          <div key={l.key} style={{
            background: "#0e0e0e", border: `1px solid ${i === 0 ? color + "30" : "#1c1c1c"}`,
            borderRadius: "8px", padding: "10px 12px",
            width: widths[i], marginLeft: i === 0 ? "auto" : i === 1 ? "auto" : "0",
            marginRight: i === 0 ? "auto" : i === 1 ? "auto" : "0",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "7px", color: i === 0 ? color : "#444", fontFamily: "monospace", letterSpacing: "0.15em" }}>
                {l.icon} {l.key.toUpperCase()}
              </span>
              <span style={{ fontSize: "7px", color: "#333", fontFamily: "monospace" }}>{l.note}</span>
            </div>
            <div style={{ fontSize: "11px", color: "#ccc", fontFamily: "'Cormorant Garamond', serif", lineHeight: "1.5" }}>{val}</div>
          </div>
        );
      })}
    </div>
  );
}

function ComponentsBlock({ data, color }: ComponentsBlockProps) {
  if (!data) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {Object.entries(data).map(([k, v], i) => (
        <div key={k} style={{
          display: "flex", gap: "10px", alignItems: "flex-start",
          background: "#0e0e0e", border: "1px solid #1a1a1a",
          borderRadius: "8px", padding: "10px 12px",
        }}>
          <div style={{
            width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
            background: `${color}18`, border: `1px solid ${color}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "9px", color: color, fontFamily: "monospace", fontWeight: "bold"
          }}>{i + 1}</div>
          <div>
            <div style={{ fontSize: "7px", color: "#484848", fontFamily: "monospace", letterSpacing: "0.12em", marginBottom: "3px" }}>
              {k.replace(/_/g, " ")}
            </div>
            <div style={{ fontSize: "11px", color: "#ccc", fontFamily: "'Cormorant Garamond', serif", lineHeight: "1.4" }}>{v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DETAIL MODAL ──────────────────────────────────────────────────────────────
function DetailModal({ model, brand, catId, catColor, onClose }: DetailModalProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 20); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 350); };

  const renderContent = () => {
    switch (catId) {
      case "cars":     return <CarsModalContent m={model} color={model.color} />;
      case "perfumes": return <PerfumesModalContent m={model} color={model.color} />;
      case "watches":  return <WatchesModalContent m={model} color={model.color} />;
      case "fashion":  return <FashionModalContent m={model} color={model.color} />;
      case "sweets":   return <SweetsModalContent m={model} color={model.color} />;
      default:         return null;
    }
  };

  return (
    <div onClick={handleClose} style={{
      position:"fixed", inset:0, zIndex:999,
      background:"rgba(0,0,0,0.9)", backdropFilter:"blur(24px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"16px",
      opacity: visible ? 1 : 0, transition:"opacity 0.35s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"linear-gradient(160deg, #141414 0%, #0c0c0c 60%, #0f0f0f 100%)",
        border:`1px solid ${model.color}38`, borderRadius:"24px",
        width:"100%", maxWidth:"520px", maxHeight:"90vh", overflowY:"auto",
        position:"relative",
        transform: visible ? "translateY(0) scale(1)" : "translateY(28px) scale(0.97)",
        transition:"all 0.45s cubic-bezier(0.23,1,0.32,1)",
        boxShadow:`0 60px 140px ${model.color}15, 0 0 0 1px ${model.color}15 inset`,
      }}>
        {/* Glow top */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:"150px",
          background:`radial-gradient(ellipse at 50% -10%, ${model.color}28 0%, transparent 70%)`,
          borderRadius:"24px 24px 0 0", pointerEvents:"none"
        }} />

        {/* Close */}
        <button onClick={handleClose} style={{
          position:"absolute", top:"16px", right:"16px", zIndex:10,
          background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"50%",
          width:"32px", height:"32px", color:"#666", fontSize:"13px",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        }}>✕</button>

        <div style={{ padding:"36px 26px 32px" }} dir="rtl">

          {/* Breadcrumb */}
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"20px", flexWrap:"wrap" }}>
            <span style={{
              padding:"3px 10px", background:`${model.color}15`,
              border:`1px solid ${model.color}30`, borderRadius:"20px",
              fontSize:"8px", color:model.color, fontFamily:"monospace", letterSpacing:"0.14em"
            }}>{brand.name.toUpperCase()}</span>
            <span style={{ color:"#333", fontSize:"9px", fontFamily:"monospace" }}>·</span>
            <span style={{ color:"#444", fontSize:"8px", fontFamily:"monospace", letterSpacing:"0.1em" }}>
              {model.type} · {model.year}
            </span>
          </div>

          {/* Name */}
          <h2 style={{
            fontFamily:"'Cormorant Garamond', serif",
            fontSize:"clamp(24px,5vw,36px)", fontWeight:"300",
            color:"#f0f0f0", lineHeight:"1.1", marginBottom:"8px"
          }}>{model.name}</h2>

          {/* Price */}
          <div style={{ fontSize:"14px", color:model.color, fontFamily:"monospace", marginBottom:"20px", opacity:0.9 }}>
            {model.price}
          </div>

          {/* Story */}
          <p style={{
            color:"#888", fontSize:"12.5px", fontFamily:"'Amiri', serif",
            lineHeight:"1.9", marginBottom:"24px",
            paddingRight:"12px", borderRight:`2px solid ${model.color}35`,
          }}>{model.story}</p>

          {/* Highlights */}
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"8px", color:"#383838", fontFamily:"monospace", letterSpacing:"0.22em", marginBottom:"12px", display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:"16px", height:"1px", background:"#383838" }} />
              أبرز المميزات
            </div>
            {model.highlights.map((h, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"9px" }}>
                <div style={{ width:"4px", height:"4px", background:model.color, borderRadius:"50%", marginTop:"6px", flexShrink:0 }} />
                <span style={{ color:"#bbb", fontSize:"12px", fontFamily:"'Amiri', serif", lineHeight:"1.7" }}>{h}</span>
              </div>
            ))}
          </div>

          {/* Category-specific content */}
          {renderContent()}

          {/* Bar */}
          <div style={{ background:"#0c0c0c", border:"1px solid #1a1a1a", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
              <span style={{ fontSize:"8px", color:"#444", fontFamily:"monospace", letterSpacing:"0.15em" }}>{model.bar.label}</span>
              <span style={{ fontSize:"11px", color:model.color, fontFamily:"monospace" }}>{model.bar.value} / 100</span>
            </div>
            <div style={{ height:"2px", background:"#1a1a1a", borderRadius:"1px", overflow:"hidden" }}>
              <div style={{
                height:"100%", background:`linear-gradient(90deg, ${model.color}55, ${model.color})`,
                borderRadius:"1px",
                width: visible ? `${model.bar.value}%` : "0%",
                transition:"width 1.5s cubic-bezier(0.23,1,0.32,1) 0.4s",
              }} />
            </div>
          </div>

          {/* Tags */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
            {model.tags.map(t => (
              <span key={t} style={{
                padding:"3px 9px", background:`${model.color}10`,
                border:`1px solid ${model.color}25`, borderRadius:"20px",
                fontSize:"8px", color:model.color, fontFamily:"monospace", letterSpacing:"0.08em"
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function Knowledge() {
  const [activeCat, setActiveCat] = useState<string>("cars");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<Model | null>(null);

  const cat = CATEGORIES.find(c => c.id === activeCat)!;
  const catData = DATA[activeCat];
  const brand = activeBrand ? catData.brands.find(b => b.id === activeBrand) : null;

  const switchCat = (id: string) => { setActiveCat(id); setActiveBrand(null); setActiveModel(null); };
  const selectBrand = (id: string) => { setActiveBrand(id); setActiveModel(null); };

  // Calculate stats to display total brands and total items/models accurately
  const totalBrands = catData?.brands?.length || 0;
  const totalItems = catData?.brands?.reduce((acc, b) => acc + (b.models?.length || 0), 0) || 0;

  return (
    <div style={{ minHeight:"100vh", background:"#080808", color:"#fff", overflowX:"hidden" }} dir="rtl">
      <SEO
        path="/knowledge"
        title="موسوعة الرقي — معرفة منتقاة"
        description="موسوعة فاخرة: السيارات، العطور، الساعات، الأزياء والحلويات."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': 'https://amv.life/knowledge',
          url: 'https://amv.life/knowledge',
          name: 'موسوعة الرقي',
          inLanguage: 'ar',
          description: 'موسوعة فاخرة منتقاة: السيارات، العطور، الساعات، الأزياء والحلويات.',
          about: [
            { '@type': 'Thing', name: 'السيارات' },
            { '@type': 'Thing', name: 'العطور' },
            { '@type': 'Thing', name: 'الساعات' },
            { '@type': 'Thing', name: 'الأزياء' },
            { '@type': 'Thing', name: 'الحلويات' },
          ],
        }}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Amiri:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#252525; border-radius:2px; }
        button { font-family:inherit; outline:none; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>

      {/* Ambient */}
      <div style={{
        position:"fixed", top:"-300px", left:"50%", transform:"translateX(-50%)",
        width:"1000px", height:"600px",
        background:`radial-gradient(ellipse, ${cat.color}0d 0%, transparent 65%)`,
        pointerEvents:"none", transition:"background 1.4s ease", zIndex:0,
      }} />

      <div style={{ position:"relative", zIndex:1, maxWidth:"860px", margin:"0 auto", padding:"clamp(24px,5vw,48px) clamp(16px,4vw,32px)" }}>

        {/* Header */}
        <div style={{ marginBottom:"clamp(28px,5vw,44px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <BackButton />
            <div style={{ fontSize:"8px", color:"#282828", fontFamily:"monospace", letterSpacing:"0.4em" }}>
              LISSAN · قسم المعرفة
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:"10px", flexWrap:"wrap" }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"clamp(34px,7vw,60px)", fontWeight:"300", color:"#efefef", lineHeight:"1", letterSpacing:"-0.03em" }}>
              موسوعة
            </h1>
            <span style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"clamp(34px,7vw,60px)", fontWeight:"300", color:cat.color, lineHeight:"1", letterSpacing:"-0.03em", fontStyle:"italic", transition:"color 0.8s ease" }}>
              الرقي
            </span>
          </div>
          <p style={{ color:"#303030", fontSize:"11px", fontFamily:"'Amiri', serif", marginTop:"10px" }}>
            السيارات · العطور · الساعات · الأزياء · الحلويات
          </p>
        </div>

        {/* Category Nav */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"6px", marginBottom:"clamp(24px,4vw,40px)" }}>
          {CATEGORIES.map(c => {
            const active = activeCat === c.id;
            return (
              <button key={c.id} onClick={() => switchCat(c.id)} style={{
                background: active ? `radial-gradient(ellipse at 50% 0%, ${c.color}1e, transparent 85%)` : "transparent",
                border:`1px solid ${active ? c.color + "48" : "#1c1c1c"}`,
                borderRadius:"14px", padding:"clamp(12px,2.5vw,22px) 6px", cursor:"pointer",
                transition:"all 0.4s cubic-bezier(0.23,1,0.32,1)",
                transform: active ? "translateY(-2px)" : "translateY(0)",
              }}>
                <div style={{ fontSize:"clamp(16px,3vw,24px)", color: active ? c.color : "#3a3a3a", marginBottom:"6px", transition:"all 0.35s", filter: active ? `drop-shadow(0 0 8px ${c.color}65)` : "none" }}>{c.icon}</div>
                <div style={{ color: active ? "#dedede" : "#484848", fontSize:"clamp(9px,1.6vw,11px)", fontFamily:"'Amiri', serif" }}>{c.label}</div>
                <div style={{ color: active ? c.color : "#222", fontSize:"7px", fontFamily:"monospace", letterSpacing:"0.1em", marginTop:"3px", opacity: active ? 0.8 : 1 }}>{c.labelEn}</div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"24px" }}>
          <div style={{ flex:1, height:"1px", background:`linear-gradient(90deg, transparent, ${cat.color}28)` }} />
          <span style={{ color:cat.color, fontSize:"8px", fontFamily:"monospace", letterSpacing:"0.28em", opacity:0.7 }}>{cat.labelEn.toUpperCase()}</span>
          <div style={{ flex:1, height:"1px", background:`linear-gradient(90deg, ${cat.color}28, transparent)` }} />
        </div>

        {/* Layout */}
        <div style={{ display:"grid", gridTemplateColumns: activeBrand ? "clamp(160px,26%,220px) 1fr" : "1fr", gap:"14px", alignItems:"start" }}>

          {/* Brands Column */}
          <div style={{ animation:"fadeIn 0.4s ease" }}>
            <div style={{ fontSize:"7px", color:"#2e2e2e", fontFamily:"monospace", letterSpacing:"0.25em", marginBottom:"10px" }}>
              ─── BRANDS
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
              {catData.brands.map(b => {
                const sel = activeBrand === b.id;
                return (
                  <button key={b.id} onClick={() => selectBrand(b.id)} style={{
                    background: sel ? `linear-gradient(135deg, ${cat.color}12, ${cat.color}06)` : "#0d0d0d",
                    border:`1px solid ${sel ? cat.color+"40" : "#181818"}`,
                    borderRadius:"12px", padding:"14px", cursor:"pointer",
                    transition:"all 0.35s cubic-bezier(0.23,1,0.32,1)", textAlign:"right",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom: sel ? "0" : "7px" }}>
                      <div style={{
                        width:"34px", height:"34px", borderRadius:"8px", flexShrink:0,
                        background: sel ? `${cat.color}16` : "#131313",
                        border:`1px solid ${sel ? cat.color+"30" : "#202020"}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color: sel ? cat.color : "#3a3a3a", fontFamily:"serif", fontSize:"10px", fontWeight:"bold",
                      }}>{b.logo}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: sel ? "#eeeeee" : "#888", fontSize:"13px", fontFamily:"'Cormorant Garamond', serif", fontWeight:"500" }}>{b.name}</div>
                        <div style={{ color:"#333", fontSize:"8px", fontFamily:"monospace" }}>{b.origin} · {b.founded}</div>
                      </div>
                    </div>
                    {!activeBrand && (
                      <div style={{ marginTop: "10px" }}>
                        <div style={{ color: cat.color, fontSize:"9px", fontFamily:"'Cormorant Garamond', serif", fontStyle:"italic", marginBottom:"4px", opacity:0.7 }}>{b.tagline}</div>
                        <div style={{ color:"#383838", fontSize:"10px", fontFamily:"'Amiri', serif", lineHeight:"1.5" }}>{b.desc}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Models Column */}
          {activeBrand && brand && (
            <div style={{ animation:"fadeSlide 0.4s cubic-bezier(0.23,1,0.32,1)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px" }}>
                <div>
                  <div style={{ fontSize:"7px", color:"#2e2e2e", fontFamily:"monospace", letterSpacing:"0.25em", marginBottom:"3px" }}>─── {brand.name.toUpperCase()}</div>
                  <div style={{ fontSize:"9px", color:cat.color, fontFamily:"'Cormorant Garamond', serif", fontStyle:"italic", opacity:0.7 }}>{brand.tagline}</div>
                </div>
                <button onClick={() => { setActiveBrand(null); setActiveModel(null); }} style={{
                  background:"transparent", border:"1px solid #1a1a1a", borderRadius:"7px",
                  padding:"5px 11px", color:"#3a3a3a", fontSize:"8px", fontFamily:"monospace", cursor:"pointer",
                }}>رجوع ←</button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:"9px" }}>
                {brand.models.map((m, i) => (
                  <button key={m.id} onClick={() => setActiveModel(m)} style={{
                    background:"linear-gradient(135deg, #0f0f0f, #0c0c0c)", border:"1px solid #191919",
                    borderRadius:"13px", padding:"16px", cursor:"pointer", textAlign:"right",
                    transition:"all 0.3s cubic-bezier(0.23,1,0.32,1)", position:"relative", overflow:"hidden",
                    animation:`fadeSlide 0.4s ease ${i*0.07}s both`,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = m.color+"40"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#191919"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {/* Corner glow */}
                    <div style={{ position:"absolute", top:0, right:0, width:"70px", height:"70px", background:`radial-gradient(circle at 80% 20%, ${m.color}15, transparent 70%)`, borderRadius:"0 13px 0 70px", pointerEvents:"none" }} />

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"7px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color:"#eeeeee", fontSize:"14px", fontFamily:"'Cormorant Garamond', serif", fontWeight:"500", marginBottom:"4px" }}>{m.name}</div>
                        <span style={{ display:"inline-block", padding:"1px 7px", background:`${m.color}16`, border:`1px solid ${m.color}30`, borderRadius:"20px", fontSize:"7px", color:m.color, fontFamily:"monospace", letterSpacing:"0.1em" }}>{m.type.toUpperCase()}</span>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ color:cat.color, fontSize:"8px", fontFamily:"monospace", opacity:0.7 }}>{m.year}</div>
                        <div style={{ color:"#444", fontSize:"8px", fontFamily:"monospace", marginTop:"2px" }}>{m.price.split(" ")[0]}</div>
                      </div>
                    </div>

                    <p style={{ color:"#484848", fontSize:"11px", fontFamily:"'Amiri', serif", lineHeight:"1.6", marginBottom:"9px" }}>
                      {m.story.slice(0, 100)}…
                    </p>

                    {/* Mini bar */}
                    <div style={{ marginBottom:"8px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                        <span style={{ fontSize:"7px", color:"#2e2e2e", fontFamily:"monospace" }}>{m.bar.label}</span>
                        <span style={{ fontSize:"7px", color:m.color, fontFamily:"monospace", opacity:0.7 }}>{m.bar.value}%</span>
                      </div>
                      <div style={{ height:"1px", background:"#181818", borderRadius:"1px" }}>
                        <div style={{ height:"100%", width:`${m.bar.value}%`, background:`linear-gradient(90deg, ${m.color}44, ${m.color}88)`, borderRadius:"1px" }} />
                      </div>
                    </div>

                    <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"7px" }}>
                      {m.tags.slice(0,3).map(t => (
                        <span key={t} style={{ padding:"1px 6px", background:"#121212", border:"1px solid #1e1e1e", borderRadius:"4px", fontSize:"7px", color:"#444", fontFamily:"monospace" }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ fontSize:"7px", color:cat.color, fontFamily:"monospace", letterSpacing:"0.15em", opacity:0.5 }}>تفاصيل كاملة ↗</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!activeBrand && (
          <div style={{ marginTop:"32px", padding:"44px 28px", border:"1px dashed #141414", borderRadius:"18px", textAlign:"center", animation:"fadeIn 0.5s ease" }}>
            <div style={{ fontSize:"clamp(32px,7vw,48px)", color:"#161616", marginBottom:"14px" }}>{cat.icon}</div>
            <div style={{ color:"#262626", fontSize:"12px", fontFamily:"'Amiri', serif" }}>اختر علامة تجارية للاستكشاف</div>
            <div style={{ color:"#1c1c1c", fontSize:"8px", fontFamily:"monospace", letterSpacing:"0.2em", marginTop:"7px" }}>
              {totalBrands} BRANDS · {totalItems} ITEMS
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:"52px", paddingTop:"18px", borderTop:"1px solid #0e0e0e", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
          <div style={{ fontSize:"7px", color:"#1e1e1e", fontFamily:"monospace", letterSpacing:"0.2em" }}>LISSAN · قسم المعرفة</div>
          <div style={{ fontSize:"7px", color:cat.color, fontFamily:"monospace", opacity:0.35, letterSpacing:"0.15em" }}>
            {cat.labelEn.toUpperCase()} — {totalItems} CURATED
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeModel && brand && (
        <DetailModal
          model={activeModel}
          brand={brand}
          catId={activeCat}
          catColor={cat.color}
          onClose={() => setActiveModel(null)}
        />
      )}
    </div>
  );
}