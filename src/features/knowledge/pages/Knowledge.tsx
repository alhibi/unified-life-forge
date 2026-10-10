import { type CSSProperties, type ReactNode, useState } from "react";

import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { AppCard, AppList, AppRow, IconChip, PageShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import ResponsiveDrawer from "@/components/ui/ResponsiveDrawer";
import { StateView } from "@/components/ui/state-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Knowledge — "موسوعة الرقي" (the curated luxury encyclopedia).
 *
 * System pass: the bespoke dark theatre (ambient glow, per-item hex accents,
 * tinted gradients, the hand-rolled modal) is gone. The page now composes the
 * shared primitives — PageHeader (display), Tabs for the five collections,
 * AppCard for brand dossiers and model cards, AppList/AppRow for the selected
 * brand rail, StateView for the browse prompt, ResponsiveDrawer for the model
 * detail. Category identity is the only colour left, and it rides the six-hue
 * data palette (index.css --data-1…6) instead of a raw hex.
 */

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────

/** The six-hue categorical key from index.css (--data-1…6). A category is a
 *  genuine data label for one of five collections, so it gets a documented
 *  palette key instead of a decorative hex. */
type DataTone = "data-1" | "data-2" | "data-3" | "data-4" | "data-5" | "data-6";

/** Literal class pairs for each tone — dynamic `text-${tone}` strings would be
 *  invisible to Tailwind's scanner. */
const TONE_TEXT: Record<DataTone, string> = {
  "data-1": "text-data-1",
  "data-2": "text-data-2",
  "data-3": "text-data-3",
  "data-4": "text-data-4",
  "data-5": "text-data-5",
  "data-6": "text-data-6",
};

interface Category {
  id: string;
  icon: string;
  label: string;
  labelEn: string;
  tone: DataTone;
}

interface Model {
  id: string;
  name: string;
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
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
// The five collections as categorical data: each id carries its label pair and
// its palette tone. Hues are picked from the published data key
// (--data-1…6 in index.css): amber for cars, violet for perfumery, blue for
// horology, clay for fashion, rose for confiserie.
const CATEGORIES: Category[] = [
  { id:"cars",     icon:"◈", label:"السيارات",  labelEn:"Automobiles", tone:"data-3" },
  { id:"perfumes", icon:"◉", label:"العطور",    labelEn:"Perfumery",   tone:"data-6" },
  { id:"watches",  icon:"◎", label:"الساعات",   labelEn:"Horology",    tone:"data-4" },
  { id:"fashion",  icon:"◆", label:"الأزياء",   labelEn:"Fashion",     tone:"data-2" },
  { id:"sweets",   icon:"◐", label:"الحلويات",  labelEn:"Confiserie",  tone:"data-5" },
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
            id:"911s", name:"911 Carrera S", year:"2024",
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
            id:"taycan", name:"Taycan Turbo S", year:"2024",
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
            id:"gt3rs", name:"911 GT3 RS", year:"2023",
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
            id:"sf90", name:"SF90 Stradale", year:"2024",
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
            id:"purosangue", name:"Purosangue V12", year:"2023",
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
            id:"gt63se", name:"AMG GT 63 S E Performance", year:"2024",
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
            id:"aventus", name:"Aventus", year:"2010",
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
            id:"virgin", name:"Virgin Island Water", year:"2007",
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
            id:"br540", name:"Baccarat Rouge 540", year:"2015",
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
            id:"oud", name:"Oud Satin Mood", year:"2015",
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
            id:"nautilus5711", name:"Nautilus 5711/1A-011", year:"2021",
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
            id:"sky6002", name:"Sky Moon Tourbillon 6002G", year:"2019",
            type:"Double-Sided Grand Complication", price:"$1,200,000–$1,800,000",
            tags:["Platinum","12 Complications","Double Tourbillon","Celestial Map"],
            story:"الساعة التي تُبيّن أن باتيك تصنع فناً، لا توقيتاً. وجهان، 12 وظيفة، خريطة سماء تتحرك بدقة فلكية — وسنوات عمل خلف كل قطعة.",
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
            id:"offshore44ti", name:"Royal Oak Offshore 44 Titanium", year:"2022",
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
            id:"concept_ft", name:"Concept Flying Tourbillon GMT", year:"2021",
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
            id:"vicuna_coat", name:"معطف الڤيكونيا الكامل", year:"2024",
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
            id:"baby_cashmere_hoodie", name:"هودي Baby Cashmere", year:"2024",
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
            id:"birkin25", name:"Birkin 25 Togo Leather", year:"1984 (أيقونة مستمرة)",
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
            id:"ispahan_cake", name:"Ispahan — La Tarte 20cm", year:"2001 (أيقونة)",
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
            id:"2000feuilles", name:"2000 Feuilles au Praliné", year:"2006",
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
            id:"mogador_tarte", name:"Mogador — Tarte Passion-Chocolat", year:"2005",
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
            id:"guanaja70", name:"Guanaja 70% — Grand Cru", year:"1986",
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
            id:"dulcey32", name:"Dulcey Blond 32%", year:"2012",
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
    ]
  },

};

// ─── CATEGORY-SPECIFIC MODAL RENDERER ─────────────────────────────────────────
function CarsModalContent({ m }: ModalContentProps) {
  return (
    <>
      <Section title="أداء قياسي">
        <Grid2 data={m.perf} />
      </Section>
      <Section title="المحرك والقوة">
        <Grid2 data={m.engine} />
      </Section>
      <Section title="الشاصي والأبعاد">
        <Grid2 data={m.chassis} />
      </Section>
    </>
  );
}

function PerfumesModalContent({ m }: ModalContentProps) {
  return (
    <>
      <Section title="هرم الرائحة">
        <PyramidBlock data={m.pyramid} />
      </Section>
      <Section title="شخصية العطر">
        <Grid2 data={m.character} />
      </Section>
      <Section title="معلومات المعطّر">
        <Grid2 data={m.notes} />
      </Section>
    </>
  );
}

function WatchesModalContent({ m }: ModalContentProps) {
  return (
    <>
      <Section title="الحركة الداخلية">
        <Grid2 data={m.movement} />
      </Section>
      <Section title="العلبة والقياسات">
        <Grid2 data={m.case} />
      </Section>
      <Section title={m.dial ? "القرص والوجه" : m.complications ? "التعقيدات الكاملة" : "مواصفات إضافية"}>
        <Grid2 data={m.dial || m.complications} />
      </Section>
    </>
  );
}

function FashionModalContent({ m }: ModalContentProps) {
  return (
    <>
      <Section title={m.fiber ? "الخامة والألياف" : m.leather ? "الجلد والخياطة" : "المادة الخام"}>
        <Grid2 data={m.fiber || m.leather} />
      </Section>
      <Section title={m.craft ? "الصناعة والحرفية" : m.hardware ? "المعادن والإبازيم" : "التفاصيل"}>
        <Grid2 data={m.craft || m.hardware} />
      </Section>
      <Section title={m.sizing ? "الأحجام والتخصيص" : m.market ? "السوق والاستثمار" : "إضافي"}>
        <Grid2 data={m.sizing || m.market} />
      </Section>
    </>
  );
}

function SweetsModalContent({ m }: ModalContentProps) {
  return (
    <>
      <Section title="مكونات القطعة">
        <ComponentsBlock data={m.components} />
      </Section>
      <Section title="عملية التحضير">
        <Grid2 data={m.process} />
      </Section>
      <Section title="التذوق والتقديم">
        <Grid2 data={m.tasting || m.origin_story || m.profile} />
      </Section>
      {m.technical && (
        <Section title="التقنية والتخزين">
          <Grid2 data={m.technical} />
        </Section>
      )}
      {m.uses && (
        <Section title="الاستخدامات الاحترافية">
          <Grid2 data={m.uses} />
        </Section>
      )}
    </>
  );
}

// ─── SHARED SUBCOMPONENTS ──────────────────────────────────────────────────────

/** One section of the dossier: the shared section label over its content. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="app-section-label">{title}</h3>
      {children}
    </section>
  );
}

/** Label → value pairs on quiet tonal tiles. */
function Grid2({ data }: { data?: Record<string, string> }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="rounded-md bg-muted/40 px-3 py-2.5">
          <div className="text-micro text-muted-foreground">{k.replace(/_/g, " ")}</div>
          <div className="mt-0.5 text-mini leading-relaxed text-foreground">{v}</div>
        </div>
      ))}
    </div>
  );
}

/** The olfactory pyramid, in wearing order: top → heart → base. */
function PyramidBlock({ data }: { data?: Record<string, string> }) {
  if (!data) return null;
  const layers = [
    { key: "رائحة القمة", icon: "▲", note: "أول 15 دقيقة" },
    { key: "رائحة القلب", icon: "◆", note: "15 دقيقة – 4 ساعات" },
    { key: "رائحة القاعدة", icon: "▼", note: "4 ساعات+" },
  ];
  return (
    <div className="space-y-2">
      {layers.map((l) => {
        const val = data[l.key];
        if (!val) return null;
        return (
          <div key={l.key} className="rounded-md bg-muted/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-micro text-muted-foreground">
              <span className="font-bold">
                {l.icon} {l.key}
              </span>
              <span className="tabular-nums">{l.note}</span>
            </div>
            <div className="mt-1 text-mini leading-relaxed text-foreground">{val}</div>
          </div>
        );
      })}
    </div>
  );
}

/** The numbered build order of a confection. */
function ComponentsBlock({ data }: { data?: Record<string, string> }) {
  if (!data) return null;
  return (
    <ol className="space-y-2">
      {Object.entries(data).map(([k, v], i) => (
        <li key={k} className="flex gap-3 rounded-md bg-muted/40 px-3 py-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-secondary text-micro font-bold tabular-nums text-foreground">
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-micro text-muted-foreground">{k.replace(/_/g, " ")}</span>
            <span className="mt-0.5 block text-mini leading-relaxed text-foreground">{v}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ─── DETAIL DRAWER ──────────────────────────────────────────────────────────────

/**
 * The full dossier for one model, on the shared transient surface
 * (ResponsiveDrawer → bottom sheet on mobile, dialog on desktop).
 */
function DetailDrawer({
  model,
  brand,
  catId,
  onClose,
}: {
  model: Model;
  brand: Brand;
  catId: string;
  onClose: () => void;
}) {
  const renderContent = () => {
    switch (catId) {
      case "cars":     return <CarsModalContent m={model} />;
      case "perfumes": return <PerfumesModalContent m={model} />;
      case "watches":  return <WatchesModalContent m={model} />;
      case "fashion":  return <FashionModalContent m={model} />;
      case "sweets":   return <SweetsModalContent m={model} />;
      default:         return null;
    }
  };

  return (
    <ResponsiveDrawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={model.name}
      description={`${brand.name} · ${model.type} · ${model.year}`}
    >
      <div className="space-y-5 px-1">
        {/* Price — a reading, given its own line */}
        <div className="text-lead font-semibold text-foreground tabular-nums">{model.price}</div>

        {/* Story — the editorial paragraph, in the reading face */}
        <p className="border-s-2 border-primary/40 ps-3 font-amiri text-mini leading-relaxed text-muted-foreground">
          {model.story}
        </p>

        {/* Highlights */}
        <Section title="أبرز المميزات">
          <ul className="space-y-1.5">
            {model.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-mini leading-relaxed text-foreground">
                <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Category-specific content */}
        {renderContent()}

        {/* Bar — the model's own scored indicator (data, not decoration) */}
        <div className="rounded-md bg-muted/40 px-3 py-3">
          <div className="flex items-center justify-between text-micro text-muted-foreground">
            <span>{model.bar.label}</span>
            <span className="tabular-nums text-foreground">{model.bar.value} / 100</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
            <div
              className="progress-fill h-full bg-primary"
              style={{ "--progress": model.bar.value / 100 } as CSSProperties}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {model.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border/60 px-2 py-0.5 text-micro text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </ResponsiveDrawer>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function Knowledge() {
  const [activeCat, setActiveCat] = useState<string>("cars");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<Model | null>(null);

  const cat = CATEGORIES.find((c) => c.id === activeCat)!;
  const catData = DATA[activeCat];
  const brand = activeBrand ? catData.brands.find((b) => b.id === activeBrand) : null;
  const itemsCount = catData.brands.reduce((a, b) => a + b.models.length, 0);

  const switchCat = (id: string) => {
    setActiveCat(id);
    setActiveBrand(null);
    setActiveModel(null);
  };
  const selectBrand = (id: string) => {
    setActiveBrand(id);
    setActiveModel(null);
  };

  return (
    <PageShell>
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

      <PageHeader
        variant="display"
        eyebrow="LISSAN · قسم المعرفة"
        title={
          <>
            موسوعة <span className="text-primary">الرقي</span>
          </>
        }
        subtitle="السيارات · العطور · الساعات · الأزياء · الحلويات"
      />

      <Tabs value={activeCat} onValueChange={switchCat}>
        {/* The five collections — one segmented control, one selected state */}
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className="flex-col gap-1 px-1 py-2.5">
              <span aria-hidden className={cn("text-lead leading-none", TONE_TEXT[c.tone])}>
                {c.icon}
              </span>
              <span className="text-micro font-medium leading-none">{c.label}</span>
              <span className="hidden text-[0.625rem] leading-none text-muted-foreground sm:block">
                {c.labelEn}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCat} className="space-y-5">
          {/* Divider register for the open collection */}
          <div className="flex items-center gap-3">
            <span className="rule-x flex-1" />
            <span
              className={cn("text-micro font-bold tracking-[0.28em]", TONE_TEXT[cat.tone])}
            >
              {cat.labelEn.toUpperCase()}
            </span>
            <span className="rule-x flex-1" />
          </div>

          <div className={cn("grid items-start gap-3", activeBrand && "md:grid-cols-[200px_1fr]")}>
            {/* Brands column — browse cards when nothing is open, the shared
                list rail once a brand is selected */}
            <div className="min-w-0">
              {activeBrand ? (
                <AppList compact>
                  {catData.brands.map((b) => {
                    const sel = activeBrand === b.id;
                    return (
                      <AppRow
                        key={b.id}
                        onClick={() => selectBrand(b.id)}
                        className={cn(sel && "bg-primary/10")}
                        leading={
                          <IconChip size="sm" tone="plain" className="text-micro font-bold" aria-hidden>
                            {b.logo}
                          </IconChip>
                        }
                        title={b.name}
                        subtitle={`${b.origin} · ${b.founded}`}
                      />
                    );
                  })}
                </AppList>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {catData.brands.map((b) => (
                    <AppCard
                      key={b.id}
                      as="button"
                      pressable
                      onClick={() => selectBrand(b.id)}
                      className="w-full text-start"
                    >
                      <div className="flex items-center gap-3">
                        <IconChip tone="plain" className="text-micro font-bold" aria-hidden>
                          {b.logo}
                        </IconChip>
                        <div className="min-w-0">
                          <div className="truncate text-body font-medium text-foreground">{b.name}</div>
                          <div className="truncate text-micro text-muted-foreground">
                            {b.origin} · {b.founded}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-mini italic text-muted-foreground">{b.tagline}</div>
                      <p className="mt-1 text-mini leading-relaxed text-foreground/80">{b.desc}</p>
                    </AppCard>
                  ))}
                </div>
              )}
            </div>

            {/* Models column */}
            {activeBrand && brand && (
              <div className="min-w-0 space-y-3">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {brand.name}
                    </div>
                    <div className="mt-0.5 text-mini italic text-muted-foreground">{brand.tagline}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setActiveBrand(null);
                      setActiveModel(null);
                    }}
                  >
                    رجوع ←
                  </Button>
                </header>

                <div className="space-y-3">
                  {brand.models.map((m) => (
                    <AppCard
                      key={m.id}
                      as="button"
                      pressable
                      onClick={() => setActiveModel(m)}
                      className="w-full text-start"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-body font-medium text-foreground">{m.name}</span>
                            <span className="rounded-full border border-border/60 px-2 py-0.5 text-micro uppercase tracking-[0.08em] text-muted-foreground">
                              {m.type}
                            </span>
                          </div>
                          <p className="mt-1.5 text-mini leading-relaxed text-muted-foreground">
                            {m.story.slice(0, 100)}…
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <div className="text-micro tabular-nums text-muted-foreground">{m.year}</div>
                          <div className="mt-0.5 text-mini tabular-nums text-foreground">
                            {m.price.split(" ")[0]}
                          </div>
                        </div>
                      </div>

                      {/* The model's scored indicator — real data */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-micro text-muted-foreground">
                          <span>{m.bar.label}</span>
                          <span className="tabular-nums">{m.bar.value}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
                          <div
                            className="progress-fill h-full bg-primary"
                            style={{ "--progress": m.bar.value / 100 } as CSSProperties}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-border/60 px-2 py-0.5 text-micro text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-micro tracking-[0.15em] text-muted-foreground-subtle">
                        تفاصيل كاملة ↗
                      </div>
                    </AppCard>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Browse prompt — shown until a brand opens */}
          {!activeBrand && (
            <StateView
              compact
              kind="empty"
              title="اختر علامة تجارية للاستكشاف"
              body={`${catData.brands.length} BRANDS · ${itemsCount} ITEMS`}
            />
          )}

          {/* Collection register */}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
            <span className="text-micro tracking-[0.2em] text-muted-foreground-subtle">
              LISSAN · قسم المعرفة
            </span>
            <span className="text-micro tracking-[0.15em] text-muted-foreground-subtle tabular-nums">
              {cat.labelEn.toUpperCase()} — {itemsCount} CURATED
            </span>
          </footer>
        </TabsContent>
      </Tabs>

      {/* Model dossier */}
      {activeModel && brand && (
        <DetailDrawer
          model={activeModel}
          brand={brand}
          catId={activeCat}
          onClose={() => setActiveModel(null)}
        />
      )}
    </PageShell>
  );
}
