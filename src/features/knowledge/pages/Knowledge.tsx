import { useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import BackButton from "@/components/BackButton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AppCard } from "@/components/ui/app-shell";
import { Car, Sparkle, Clock, Shirt, Cookie, BookOpen, ArrowUpRight } from "@/lib/icons";
import { pageStagger as stagger, pageItem as item } from "@/lib/motion";

/**
 * /knowledge — "موسوعة الرقي"
 * A self-contained luxury knowledge catalog. Five worlds: cars, perfumery,
 * horology, fashion, confiserie. RTL, dark (#080808). Tailwind only; dynamic
 * accent colors via inline style (per-category / per-model).
 */

type CategoryId = "cars" | "perfumes" | "watches" | "fashion" | "sweets";

interface Category {
  id: CategoryId;
  icon: ComponentType<{ className?: string }>;
  label: string;
  labelEn: string;
  color: string;
  barLabel: string;
  fieldLabels: [string, string, string, string]; // 4 main fields
}

interface Model {
  id: string;
  name: string;
  type: string;
  year: string;
  price: string;
  color: string;
  desc: string;
  highlights: string[];
  fields: [string, string, string, string]; // 4 values matching category.fieldLabels
  extras: { label: string; value: string }[]; // 3 extra spec rows
  barValue: number; // 0-100
  tags: string[];
}

interface Brand {
  id: string;
  name: string;
  origin: string;
  founded: string;
  logo: string;
  desc: string;
  models: Model[];
}

// ─────────────────────────── Categories ───────────────────────────
const CATEGORIES: Category[] = [
  {
    id: "cars",
    icon: Car,
    label: "السيارات",
    labelEn: "Automobiles",
    color: "#C8A96E",
    barLabel: "مستوى الأداء",
    fieldLabels: ["المحرك", "القوة", "العزم", "التسارع"],
  },
  {
    id: "perfumes",
    icon: Sparkle,
    label: "العطور",
    labelEn: "Perfumery",
    color: "#D4A5C9",
    barLabel: "الديمومة",
    fieldLabels: ["رائحة القمة", "القلب", "القاعدة", "العائلة"],
  },
  {
    id: "watches",
    icon: Clock,
    label: "الساعات",
    labelEn: "Horology",
    color: "#7EB8C9",
    barLabel: "التعقيد التقني",
    fieldLabels: ["الحركة", "نوع الحركة", "الدقة", "مقاومة الماء"],
  },
  {
    id: "fashion",
    icon: Shirt,
    label: "الأزياء",
    labelEn: "Fashion",
    color: "#C9A87E",
    barLabel: "مستوى الحرفية",
    fieldLabels: ["الخامة", "طريقة الصنع", "بلد المنشأ", "مدة التصنيع"],
  },
  {
    id: "sweets",
    icon: Cookie,
    label: "الحلويات",
    labelEn: "Confiserie",
    color: "#C97E8A",
    barLabel: "دقة التحضير",
    fieldLabels: ["المكونات", "القاعدة", "الحشوة", "وقت التحضير"],
  },
];

// ────────────────────────────── Data ──────────────────────────────
const DATA: Record<CategoryId, Brand[]> = {
  cars: [
    {
      id: "porsche", name: "Porsche", origin: "ألمانيا", founded: "1931", logo: "P",
      desc: "روح الأداء وجمال التصميم في جسد واحد.",
      models: [
        {
          id: "911s", name: "911 Carrera S", type: "Sports", year: "2024", price: "$145,000", color: "#C8A96E",
          desc: "الأصيل الخالد. أيقونة 60 عاماً من الحماس والدقة الألمانية. الـ911 ليست مجرد سيارة — إنها فلسفة في الحركة.",
          highlights: ["محرك خلفي أفقي فريد", "فنانة المنعطفات الألمانية", "إرث ستة عقود لا يُعادل"],
          fields: ["3.0L Twin-Turbo Flat-6", "450 حصان", "530 نيوتن متر", "0–100 في 3.5ث"],
          extras: [
            { label: "السرعة القصوى", value: "308 كم/س" },
            { label: "الوزن", value: "1,515 كغ" },
            { label: "القاعدة", value: "2,450 ملم" },
          ],
          barValue: 88,
          tags: ["RWD", "PDK", "Sport Chrono"],
        },
        {
          id: "taycan", name: "Taycan Turbo S", type: "Electric", year: "2024", price: "$188,000", color: "#5B9BD5",
          desc: "ثورة كهربائية بروح بورش الحقيقية. أسرع من الكارييرا، أهدأ من الصمت، أجمل من المتوقع.",
          highlights: ["شحن فائق 800 فولت", "صفر انبعاثات، لا حدود للإحساس", "الأسرع في تاريخ بورش"],
          fields: ["محركان كهربائيان AWD", "761 حصان", "1,050 نيوتن متر", "0–100 في 2.8ث"],
          extras: [
            { label: "السرعة القصوى", value: "260 كم/س" },
            { label: "البطارية", value: "93.4 kWh" },
            { label: "المدى", value: "630 كم" },
          ],
          barValue: 95,
          tags: ["AWD", "800V", "Launch Control"],
        },
        {
          id: "gt3", name: "911 GT3 RS", type: "Track King", year: "2023", price: "$225,000", color: "#E85D04",
          desc: "المضمار بثياب الشارع. هندسة جوية استثنائية، أجنحة نشطة، و9,000 دورة من الانتشاء.",
          highlights: ["أجنحة DRS نشطة ديناميكياً", "9,000 RPM — أعلى من الفئة", "حقّق 6:49 على نوردشلايف"],
          fields: ["4.0L Flat-6 شفط طبيعي", "525 حصان", "465 نيوتن متر", "0–100 في 3.2ث"],
          extras: [
            { label: "السرعة القصوى", value: "296 كم/س" },
            { label: "الوزن", value: "1,450 كغ" },
            { label: "نوردشلايف", value: "6:49.328" },
          ],
          barValue: 98,
          tags: ["RWD", "Manual", "Weissach"],
        },
      ],
    },
    {
      id: "audi", name: "Audi", origin: "ألمانيا", founded: "1909", logo: "A",
      desc: "Vorsprung durch Technik — التقدم عبر التكنولوجيا.",
      models: [
        {
          id: "r8", name: "R8 V10 Performance", type: "Supercar", year: "2023", price: "$198,000", color: "#E0E0E0",
          desc: "آخر V10 طبيعي من أودي. صوت أسطوري عند 8,250 دورة/دقيقة يجعل جلدك ينتفض.",
          highlights: ["V10 شفط طبيعي 8,250 RPM", "Quattro AWD الأسطوري", "هيكل ألومنيوم وكربون"],
          fields: ["5.2L V10 شفط طبيعي", "620 حصان", "580 نيوتن متر", "0–100 في 3.1ث"],
          extras: [
            { label: "السرعة القصوى", value: "331 كم/س" },
            { label: "الوزن", value: "1,695 كغ" },
            { label: "القاعدة", value: "2,650 ملم" },
          ],
          barValue: 93,
          tags: ["AWD", "Quattro", "Mid-Engine"],
        },
        {
          id: "rs6", name: "RS6 Avant", type: "Wagon Beast", year: "2024", price: "$132,000", color: "#2D6A4F",
          desc: "عربة العائلة التي تهزم السيارات الرياضية. عملية بالكامل، وحشية بالكامل، أنيقة تماماً.",
          highlights: ["850 نيوتن متر في لحظة", "Dynamic Ride Control التكيفي", "5 مقاعد وأداء السباق"],
          fields: ["4.0L Twin-Turbo V8", "630 حصان", "850 نيوتن متر", "0–100 في 3.4ث"],
          extras: [
            { label: "السرعة القصوى", value: "305 كم/س" },
            { label: "الوزن", value: "2,035 كغ" },
            { label: "الحمولة", value: "565–1,680 لتر" },
          ],
          barValue: 90,
          tags: ["AWD", "Quattro", "Air Suspension"],
        },
      ],
    },
    {
      id: "amg", name: "Mercedes-AMG", origin: "ألمانيا", founded: "1967", logo: "M",
      desc: "Das Beste oder Nichts — الأفضل أو لا شيء.",
      models: [
        {
          id: "gt63s", name: "GT 63 S E Performance", type: "Hybrid Beast", year: "2024", price: "$165,000", color: "#D4AF37",
          desc: "الأقوى من AMG على الإطلاق. هجين مذهل، عزم خيالي، فخامة سيدان مع قلب سباق.",
          highlights: ["843 حصان — أقوى AMG في التاريخ", "E-Boost الكهربائي الفوري", "4 أبواب وروح GT"],
          fields: ["4.0L V8 + محرك كهربائي", "843 حصان", "1,470 نيوتن متر", "0–100 في 2.9ث"],
          extras: [
            { label: "السرعة القصوى", value: "316 كم/س" },
            { label: "الوزن", value: "2,385 كغ" },
            { label: "البطارية", value: "6.1 kWh" },
          ],
          barValue: 97,
          tags: ["AWD", "Hybrid", "4-Door GT"],
        },
      ],
    },
    {
      id: "ferrari", name: "Ferrari", origin: "إيطاليا", founded: "1947", logo: "F",
      desc: "حيث الفن يلتقي بالأداء — Il Cavallino Rampante.",
      models: [
        {
          id: "sf90", name: "SF90 Stradale", type: "Hybrid Hypercar", year: "2024", price: "$625,000", color: "#CC0000",
          desc: "ألف حصان إيطالي في سيارة أرضية. معجزة هجينة من مارانيلو. الأسرع فيراري إنتاجية.",
          highlights: ["ألف حصان من V8 وثلاث كهربائيات", "AWD لأول مرة في فيراري", "0–200 في 6.7 ثانية"],
          fields: ["4.0L V8 + 3 محركات كهربائية", "1,000 حصان", "800 نيوتن متر", "0–100 في 2.5ث"],
          extras: [
            { label: "السرعة القصوى", value: "340 كم/س" },
            { label: "الوزن", value: "1,570 كغ" },
            { label: "EV مدى", value: "25 كم" },
          ],
          barValue: 99,
          tags: ["AWD", "Hybrid", "PHEV"],
        },
      ],
    },
  ],

  perfumes: [
    {
      id: "creed", name: "Creed", origin: "فرنسا / لندن", founded: "1760", logo: "C",
      desc: "عطر الملوك والأرستقراطية منذ ثلاثة قرون.",
      models: [
        {
          id: "aventus", name: "Aventus", type: "Woody Aromatic", year: "2010", price: "$495 / 50ml", color: "#D4A5C9",
          desc: "الأسطورة الحية. يجسد انتصار نابليون. الأكثر نقاشاً عبر الإنترنت — يختلف من جلد لآخر ومن دفعة لأخرى.",
          highlights: ["بتولا مدخّنة تميّزه فوراً", "قاعدة المسك والعنبر والعود", "ظاهرة ثقافية عالمية"],
          fields: ["برغموت، أناناس، تفاح", "بتولا مدخّنة وورد", "مسك، عنبر، عود", "Woody Chypre"],
          extras: [
            { label: "الديمومة", value: "12–14 ساعة" },
            { label: "الانتشار", value: "قوي جداً" },
            { label: "التركيز", value: "EDP" },
          ],
          barValue: 90,
          tags: ["Masculine", "Iconic", "Projection"],
        },
        {
          id: "virgin", name: "Virgin Island Water", type: "Tropical Fresh", year: "2007", price: "$410 / 50ml", color: "#7EC8E3",
          desc: "رحلة إلى جزر العذراء في زجاجة. الرم الحقيقي واللايم والجوز — إجازة حرفية على جلدك.",
          highlights: ["رم حقيقي في التركيبة", "مثالي لفصل الصيف", "يُفاجئ من يتوقع كريد تقليدياً"],
          fields: ["ليمون، رم، جوز هند", "زنجبيل وخيزران", "مسك أبيض", "Aquatic Tropical"],
          extras: [
            { label: "الديمومة", value: "8–10 ساعات" },
            { label: "الانتشار", value: "معتدل" },
            { label: "التركيز", value: "EDP" },
          ],
          barValue: 70,
          tags: ["Unisex", "Beach", "Summer"],
        },
        {
          id: "git", name: "Green Irish Tweed", type: "Fougere Fresh", year: "1985", price: "$430 / 50ml", color: "#4A9B7F",
          desc: "الجد الشرعي لكول ووتر وكل عطر أخضر طازج عرفه العالم. الأصل قبل النسخ.",
          highlights: ["صدر عام 1985 — قبل كل المنافسين", "ملهم لجيل كامل من العطور", "بساطة الملوك الحقيقيين"],
          fields: ["ليمون أخضر وعنبر", "زنبق الوادي وحشيش", "خشب الصندل", "Fougere Aromatic"],
          extras: [
            { label: "الديمومة", value: "10–12 ساعة" },
            { label: "الانتشار", value: "معتدل" },
            { label: "التركيز", value: "EDP" },
          ],
          barValue: 80,
          tags: ["Masculine", "Classic", "GOAT"],
        },
      ],
    },
    {
      id: "mfk", name: "Maison Francis Kurkdjian", origin: "فرنسا", founded: "2009", logo: "MFK",
      desc: "العطّار الذي أعاد تعريف الفخامة الفرنسية الحديثة.",
      models: [
        {
          id: "br540", name: "Baccarat Rouge 540", type: "Floral Woody Musky", year: "2015", price: "$335 / 70ml", color: "#E8B4A0",
          desc: "الظاهرة العالمية. زعفران خشبي محمّص مع خيط من العود والمسك. لم يُمل أحد حتى الآن.",
          highlights: ["الأكثر مبيعاً في الفئة الراقية", "يُستشعر قبل دخول صاحبه", "أثار موجة تقليد عالمية"],
          fields: ["زعفران وجريب فروت", "ياسمين مصري وعود", "أرز ومسك", "Woody Floral Musky"],
          extras: [
            { label: "الديمومة", value: "14+ ساعة" },
            { label: "الانتشار", value: "كثيف جداً" },
            { label: "التركيز", value: "EDP" },
          ],
          barValue: 96,
          tags: ["Unisex", "Iconic", "Compliments"],
        },
        {
          id: "oudsm", name: "Oud Satin Mood", type: "Woody Oriental", year: "2015", price: "$360 / 70ml", color: "#8B5A6E",
          desc: "ساتان شرقي يلامس البشرة. عود ناعم محتضن بالورد والبنفسج — فخامة هادئة وحميمة.",
          highlights: ["عود مصقول لا يُثقل", "خيوط ورد بلغاري", "حضور أنيق دافئ"],
          fields: ["بنفسج وفلفل", "ورد ومستكة", "عود وفانيليا", "Woody Oriental"],
          extras: [
            { label: "الديمومة", value: "12+ ساعة" },
            { label: "الانتشار", value: "كثيف" },
            { label: "التركيز", value: "EDP" },
          ],
          barValue: 94,
          tags: ["Unisex", "Oud", "Cozy"],
        },
      ],
    },
    {
      id: "lv", name: "Louis Vuitton Parfums", origin: "فرنسا", founded: "1854", logo: "LV",
      desc: "فن العطر من أعظم دور الأزياء الباريسية.",
      models: [
        {
          id: "ombre", name: "Ombré Nomade", type: "Woody Oud", year: "2018", price: "$520 / 50ml", color: "#8B4513",
          desc: "رحلة البدوي عبر الصحراء والغابات. عود لاوسي نادر مُوازَن بالخشب ونسمة من الورد والبنفسج.",
          highlights: ["عود لاوسي من أندر الأنواع", "كثافة استثنائية لا تذوب", "مستوحى من ترحال البدو"],
          fields: ["برتقال وبنفسج", "ورد وخشب لاوس", "عود ومسك", "Woody Oriental"],
          extras: [
            { label: "الديمومة", value: "14+ ساعة" },
            { label: "الانتشار", value: "كثيف" },
            { label: "التركيز", value: "EDP" },
          ],
          barValue: 95,
          tags: ["Unisex", "Oud", "Statement"],
        },
      ],
    },
  ],

  watches: [
    {
      id: "patek", name: "Patek Philippe", origin: "جنيف، سويسرا", founded: "1839", logo: "PP",
      desc: "لا تملك باتيك — أنت تحفظها للجيل القادم.",
      models: [
        {
          id: "naut", name: "Nautilus 5711/1A", type: "Integrated Bracelet", year: "1976", price: "+$150,000", color: "#4A9B7F",
          desc: "جيرالد جنتا والساعة التي غيّرت الفولاذ إلى فخامة. الأندر والأغلى من الفولاذ في التاريخ.",
          highlights: ["أوقفت إنتاجها 2021 فارتفع سعرها", "نسيج الأوجانو الأيقوني", "الحلم المستحيل للمجمعين"],
          fields: ["Calibre 26-330 S C", "أوتوماتيك", "±2 ث/يوم", "120 متر"],
          extras: [
            { label: "القطر", value: "40 ملم" },
            { label: "السُمك", value: "8.3 ملم" },
            { label: "الاحتياطي", value: "45 ساعة" },
          ],
          barValue: 99,
          tags: ["Steel", "Iconic", "Discontinued"],
        },
        {
          id: "sky", name: "Sky Moon Tourbillon 6002G", type: "Grand Complication", year: "2001", price: "$1,200,000+", color: "#E0E0E0",
          desc: "التاج المطلق. جانبان، 12 وظيفة، توربيون من الخلف، خريطة سماوية. قمة صناعة الساعات.",
          highlights: ["12 تعقيداً في ساعة واحدة", "توربيون مزدوج", "خريطة السماء المتحركة"],
          fields: ["Calibre R TO 27 QR SID LU CL", "يدوي", "كرونومتر", "30 متر"],
          extras: [
            { label: "القطر", value: "42 ملم" },
            { label: "وظائف", value: "12 تعقيد" },
            { label: "المادة", value: "بلاتينيوم" },
          ],
          barValue: 100,
          tags: ["Platinum", "Tourbillon", "Grand"],
        },
      ],
    },
    {
      id: "ap", name: "Audemars Piguet", origin: "لو براسوس، سويسرا", founded: "1875", logo: "AP",
      desc: "منذ 1875 — الجرأة في التصميم، التفوق في الصناعة.",
      models: [
        {
          id: "roo", name: "Royal Oak Offshore 44", type: "Sport Chronograph", year: "1993", price: "$38,000", color: "#1A1A2E",
          desc: "الجرأة بأبعادها القصوى. ساعة رياضية بفولاذ متين، بيزل ثماني، حضور لا يُخطئه أحد.",
          highlights: ["بيزل ثماني أيقوني", "حركة كرونوغراف داخلية", "حضور رياضي قوي"],
          fields: ["Calibre 4401", "أوتوماتيك", "±2 ث/يوم", "100 متر"],
          extras: [
            { label: "القطر", value: "44 ملم" },
            { label: "الاحتياطي", value: "70 ساعة" },
            { label: "المادة", value: "Steel/Ceramic" },
          ],
          barValue: 82,
          tags: ["Steel", "Chrono", "Sport"],
        },
      ],
    },
    {
      id: "rolex", name: "Rolex", origin: "جنيف، سويسرا", founded: "1905", logo: "R",
      desc: "التاج الذي عرّف الدقة الحديثة.",
      models: [
        {
          id: "daytona", name: "Daytona 116500LN", type: "Sport Chronograph", year: "2016", price: "+$35,000", color: "#111111",
          desc: "كرونوغراف السباق الأسطوري. بيزل سيراميك أسود، بسيط الشكل، صعب المنال.",
          highlights: ["بيزل Cerachrom السيراميكي", "حركة 4130 المعيارية", "قائمة انتظار سنوات"],
          fields: ["Calibre 4130", "أوتوماتيك", "±2 ث/يوم", "100 متر"],
          extras: [
            { label: "القطر", value: "40 ملم" },
            { label: "الاحتياطي", value: "72 ساعة" },
            { label: "المادة", value: "904L Steel" },
          ],
          barValue: 92,
          tags: ["Steel", "Chrono", "Icon"],
        },
        {
          id: "sub", name: "Submariner Date 126610LV", type: "Dive Watch", year: "2020", price: "$10,800", color: "#2D6A4F",
          desc: "ساعة الغوص التي أصبحت معياراً عالمياً. بيزل أخضر، إطار 41 ملم، إرث ستة عقود.",
          highlights: ["بيزل سيراميك أخضر", "مقاومة 300 متر", "الكلاسيكي الذي لا يُخطئ"],
          fields: ["Calibre 3235", "أوتوماتيك", "±2 ث/يوم", "300 متر"],
          extras: [
            { label: "القطر", value: "41 ملم" },
            { label: "الاحتياطي", value: "70 ساعة" },
            { label: "البيزل", value: "Cerachrom أخضر" },
          ],
          barValue: 88,
          tags: ["Steel", "Diver", "Hulk"],
        },
      ],
    },
  ],

  fashion: [
    {
      id: "loro", name: "Loro Piana", origin: "إيطاليا", founded: "1924", logo: "LP",
      desc: "أرقى الألياف الطبيعية في العالم — الڤيكونيا والكشمير الرضيع.",
      models: [
        {
          id: "vicuna", name: "معطف الڤيكونيا", type: "Ultra-Luxury Outerwear", year: "2024", price: "$18,000–$60,000", color: "#C9A87E",
          desc: "ألياف الڤيكونيا الأندر في العالم. ناعمة كالحرير، دافئة كالنار، خفيفة كالنسيم.",
          highlights: ["12 ميكرون — الأنعم في الطبيعة", "حصاد كل ثلاث سنوات من حيوان واحد", "ست أشهر من العمل اليدوي"],
          fields: ["100% ألياف الڤيكونيا", "يدوي 6 أشهر", "بيرو / إيطاليا", "6 أشهر"],
          extras: [
            { label: "النعومة", value: "12 ميكرون" },
            { label: "الإنتاج السنوي", value: "محدود" },
            { label: "المنشأ", value: "Andes — Peru" },
          ],
          barValue: 99,
          tags: ["Vicuña", "Bespoke", "Rare"],
        },
        {
          id: "babycash", name: "كنزة Baby Cashmere", type: "Knitwear", year: "2024", price: "$2,800–$5,500", color: "#D4C5A9",
          desc: "كشمير من ماعز الـHircus الرضيع — أنعم 80 غراماً تنتجها العنزة في حياتها الأولى.",
          highlights: ["80 غم فقط لكل عنزة سنوياً", "13.5 ميكرون من النعومة", "دفء استثنائي بوزن خفيف"],
          fields: ["100% Baby Cashmere", "حياكة إيطالية", "منغوليا / إيطاليا", "3 أشهر"],
          extras: [
            { label: "النعومة", value: "13.5 ميكرون" },
            { label: "العمر", value: "أول سنة فقط" },
            { label: "المنشأ", value: "Mongolia" },
          ],
          barValue: 96,
          tags: ["Cashmere", "Knit", "Rare"],
        },
      ],
    },
    {
      id: "hermes", name: "Hermès", origin: "باريس، فرنسا", founded: "1837", logo: "H",
      desc: "بيت السرج الذي أصبح إمبراطورية الفخامة الفرنسية.",
      models: [
        {
          id: "birkin", name: "Birkin 25 Togo", type: "Iconic Handbag", year: "1984", price: "$12,000–$500,000+", color: "#BF5E3B",
          desc: "الحقيبة الأسطورة. حرفي واحد، 18 ساعة عمل، قائمة انتظار سنوات. أداة فخامة عابرة للأجيال.",
          highlights: ["حرفي فرنسي واحد لكل قطعة", "18 ساعة من الخياطة اليدوية", "تتفوق على الذهب كاستثمار"],
          fields: ["جلد Togo عجل فرنسي", "يدوي بالكامل", "فرنسا", "18 ساعة"],
          extras: [
            { label: "الحرفي", value: "فرد واحد" },
            { label: "الحجم", value: "25 سم" },
            { label: "المنشأ", value: "France" },
          ],
          barValue: 97,
          tags: ["Birkin", "Iconic", "Investment"],
        },
        {
          id: "kelly", name: "Kelly 32 Retourné", type: "Structured Bag", year: "1956", price: "$10,000–$400,000+", color: "#1C3A5E",
          desc: "حقيبة الأميرة جريس كيلي. أناقة بنيوية، خطوط هندسية، إرث ملكي على الكتف.",
          highlights: ["سُميّت تكريماً للأميرة كيلي", "بنية محكمة بقفل ذهبي", "خياطة سرج تقليدية"],
          fields: ["جلد Togo / Epsom", "يدوي بالكامل", "فرنسا", "20+ ساعة"],
          extras: [
            { label: "الحرفي", value: "فرد واحد" },
            { label: "الحجم", value: "32 سم" },
            { label: "المنشأ", value: "France" },
          ],
          barValue: 95,
          tags: ["Kelly", "Iconic", "Royal"],
        },
      ],
    },
    {
      id: "brioni", name: "Brioni", origin: "روما، إيطاليا", founded: "1945", logo: "B",
      desc: "بدلة الرجل الحر — مفصّلة بدقة الفنانين الرومان.",
      models: [
        {
          id: "vanquish", name: "Vanquish II Bespoke", type: "Bespoke Suit", year: "2024", price: "$15,000–$65,000", color: "#2C3E50",
          desc: "بدلة بيسبوك من أنعم الأقمشة في العالم. كل غرزة بيد فنان، كل خط بقياس الجسد.",
          highlights: ["قماش Super 250's–300's", "120+ ساعة من العمل اليدوي", "تفصيل من قياس الجسد مباشرة"],
          fields: ["Super 250's–300's", "بيسبوك يدوي", "إيطاليا", "8–12 أسبوعاً"],
          extras: [
            { label: "ساعات العمل", value: "120+ ساعة" },
            { label: "القياسات", value: "30+ نقطة" },
            { label: "المنشأ", value: "Italy" },
          ],
          barValue: 100,
          tags: ["Bespoke", "Wool", "Tailored"],
        },
      ],
    },
  ],

  sweets: [
    {
      id: "ph", name: "Pierre Hermé", origin: "باريس، فرنسا", founded: "1998", logo: "PH",
      desc: "بيكاسو الحلويات — كل قطعة عمل فني صالح للأكل.",
      models: [
        {
          id: "ispahan", name: "Ispahan", type: "Macaron Signature", year: "2001", price: "€9 / قطعة", color: "#E8A0B4",
          desc: "الورد واللتيشي وتوت العُليق — ثلاثية باريسية أصبحت توقيع بيير إرميه حول العالم.",
          highlights: ["توقيع بيير إرميه الأشهر", "ثلاثية نكهات متوازنة", "3 أيام من التحضير الدقيق"],
          fields: ["ورد، لتيشي، توت", "ماكرون باللوز", "كريمة ورد ولتيشي", "3 أيام"],
          extras: [
            { label: "الصلاحية", value: "3 أيام" },
            { label: "الحفظ", value: "4–6°C" },
            { label: "الوزن", value: "≈35 غم" },
          ],
          barValue: 97,
          tags: ["Macaron", "Rose", "Signature"],
        },
        {
          id: "mogador", name: "Mogador Tarte", type: "Signature Tarte", year: "2005", price: "€85", color: "#F4A460",
          desc: "باشن فروت وشوكولاتة حليب — حلاوة استوائية تُكمل غناشيه فالرونا الناعم.",
          highlights: ["غاناش Valrhona فاخر", "توازن حمض الباشن", "قاعدة Paris-Brest"],
          fields: ["باشن فروت وشوكولاتة 40%", "Paris-Brest", "غاناش Valrhona", "يومان"],
          extras: [
            { label: "الصلاحية", value: "يومان" },
            { label: "الحفظ", value: "4°C" },
            { label: "حصص", value: "6–8 أفراد" },
          ],
          barValue: 94,
          tags: ["Tarte", "Passion", "Valrhona"],
        },
        {
          id: "citron", name: "Tarte Citron Infiniment", type: "Citrus Tarte", year: "2008", price: "€75", color: "#F4D03F",
          desc: "ليمون بروفانس بكل دفئه. حمضي مشرق على قاعدة مقرمشة مع مارينغ إيطالي محروق.",
          highlights: ["ليمون بروفانس طازج", "مارينغ إيطالي محروق", "توازن حامض/حلو مثالي"],
          fields: ["ليمون، بيض، زبدة", "Sablé Breton", "كريمة ليمون", "يومان"],
          extras: [
            { label: "الصلاحية", value: "يومان" },
            { label: "الحفظ", value: "4°C" },
            { label: "حصص", value: "6–8 أفراد" },
          ],
          barValue: 90,
          tags: ["Tarte", "Citron", "Provence"],
        },
      ],
    },
    {
      id: "valrhona", name: "Valrhona", origin: "فرنسا", founded: "1922", logo: "V",
      desc: "بيت الشوكولاتة الذي يصنع لأفضل شيفات العالم منذ قرن.",
      models: [
        {
          id: "guanaja", name: "Guanaja 70%", type: "Grand Cru Dark", year: "1986", price: "€25 / 250g", color: "#3D1A00",
          desc: "70% كاكاو من ترينيداد والكاريبي. مرارة عميقة، أرومات حمضية، نهاية طويلة.",
          highlights: ["كاكاو Trinitario كاريبي", "تخمير 10 أيام", "70% — التوازن الكلاسيكي"],
          fields: ["كاكاو 70%", "كاكاو خالص", "—", "تخمير 10 أيام"],
          extras: [
            { label: "الأصل", value: "Trinidad / Caribbean" },
            { label: "الصلاحية", value: "12 شهر" },
            { label: "الحفظ", value: "16–18°C" },
          ],
          barValue: 82,
          tags: ["Dark", "70%", "Grand Cru"],
        },
        {
          id: "dulcey", name: "Dulcey Blond 32%", type: "Blonde Chocolate", year: "2012", price: "€22 / 250g", color: "#D4A017",
          desc: "شوكولاتة شقراء بنكهة الكراميل والبسكويت والفانيليا — اختراع فالرونا الذي غيّر السوق.",
          highlights: ["أول شوكولاتة شقراء عالمياً", "كراميل وبسكويت طبيعي", "32% كاكاو لطف لا يُقاوم"],
          fields: ["كاكاو 32%", "حليب وزبدة كاكاو", "—", "خبز طويل"],
          extras: [
            { label: "النكهة", value: "كراميل / بسكويت" },
            { label: "الصلاحية", value: "12 شهر" },
            { label: "الحفظ", value: "16–18°C" },
          ],
          barValue: 98,
          tags: ["Blonde", "32%", "Iconic"],
        },
      ],
    },
  ],
};

// ────────────────────────── Helpers ──────────────────────────

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ────────────────────────── Components ──────────────────────────

export default function Knowledge() {
  const [activeCat, setActiveCat] = useState<CategoryId>("cars");
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<Model | null>(null);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCat)!,
    [activeCat],
  );
  const brands = DATA[activeCat];
  const activeBrand = useMemo(
    () => brands.find((b) => b.id === activeBrandId) ?? null,
    [brands, activeBrandId],
  );

  const handleSelectCategory = (id: CategoryId) => {
    setActiveCat(id);
    setActiveBrandId(null);
  };

  return (
    <PageShell flush>
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
      <BackButton />

      <div className="pt-20">
        {/* ── Header ── */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            موسوعة الرقي
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            معرفة منتقاة — السيارات · العطور · الساعات · الأزياء · الحلويات
          </p>
        </header>

        {/* ── Category strip ── */}
        <nav
          className="mb-8 grid grid-cols-5 gap-2 sm:gap-3"
          aria-label="الفئات"
        >
          {CATEGORIES.map((c) => {
            const active = c.id === activeCat;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCategory(c.id)}
                className={`group flex flex-col items-center justify-center rounded-2xl border px-2 py-3 transition-colors ${
                  active
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-accent/50"
                }`}
                aria-pressed={active}
              >
                <span className={`text-2xl ${active ? "text-primary" : "text-foreground"}`}>
                  {c.icon}
                </span>
                <span className={`mt-1 text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                  {c.label}
                </span>
                <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {c.labelEn}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── Two columns: brands / models ── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Brands list */}
          <section aria-label="الماركات" className="space-y-3">
            <h2 className="mb-2 text-base font-bold text-foreground">
              الماركات
            </h2>
            {brands.map((b) => {
              const isActive = activeBrandId === b.id;
              return (
                <AppCard
                  as="button"
                  pressable
                  key={b.id}
                  onClick={() => setActiveBrandId(b.id)}
                  className={`block w-full text-right ${isActive ? "border-primary" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-accent text-lg font-bold text-foreground">
                      {b.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-foreground">{b.name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {b.origin} · {b.founded}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {b.desc}
                  </p>
                </AppCard>
              );
            })}
          </section>

          {/* Models list */}
          <section aria-label="الطرازات" className="space-y-3">
            <h2 className="mb-2 text-base font-bold text-foreground">
              الطرازات
            </h2>

            {!activeBrand && (
              <AppCard className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  اختر ماركة لاستعراض طرازاتها
                </p>
              </AppCard>
            )}

            {activeBrand && (
              <div key={activeBrand.id} className="animate-knowledge-fade-slide space-y-3">
                {activeBrand.models.map((m) => (
                  <AppCard
                    as="button"
                    pressable
                    key={m.id}
                    onClick={() => setActiveModel(m)}
                    className="block w-full text-right"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-foreground">{m.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] text-foreground">
                            {m.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {m.year} · {m.price}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {m.desc.length > 90 ? m.desc.slice(0, 90) + "…" : m.desc}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border bg-accent/50 px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 text-left text-[11px] text-primary">
                      اضغط للمزيد ↗
                    </div>
                  </AppCard>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Detail dialog ── */}
      <ModelDetailDialog
        model={activeModel}
        brand={activeBrand}
        category={category}
        onClose={() => setActiveModel(null)}
      />
    </PageShell>
  );
}

function ModelDetailDialog({
  model,
  brand,
  category,
  onClose,
}: {
  model: Model | null;
  brand: Brand | null;
  category: Category;
  onClose: () => void;
}) {
  return (
    <Dialog open={model !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card p-0 text-foreground sm:rounded-2xl"
        dir="rtl"
      >
        <VisuallyHidden>
          <DialogTitle>{model?.name ?? "تفاصيل"}</DialogTitle>
        </VisuallyHidden>

        {model && (
          <div className="relative">
            {/* Header */}
            <div className="px-6 pt-8 pb-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-accent px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground">
                  {brand?.name}
                </span>
                <span className="rounded-full border border-border bg-accent/60 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground">
                  {model.type}
                </span>
                <span className="text-[10px] text-muted-foreground">{model.year}</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {model.name}
              </h3>
              <div className="mt-2 text-lg font-semibold text-primary">
                {model.price}
              </div>
            </div>

            {/* Description */}
            <div className="px-6">
              <p className="border-r-2 border-border pr-3 text-[15px] leading-loose text-foreground/85">
                {model.desc}
              </p>
            </div>

            {/* Highlights */}
            <div className="px-6 pt-6">
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
                أبرز المميزات
              </h4>
              <ul className="space-y-2">
                {model.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span className="text-sm leading-relaxed text-foreground">{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2x2 main fields */}
            <div className="px-6 pt-6">
              <div className="grid grid-cols-2 gap-2.5">
                {category.fieldLabels.map((label, i) => (
                  <div key={label} className="rounded-xl border border-border bg-accent/40 p-3">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 text-sm text-foreground">
                      {model.fields[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extras */}
            <div className="px-6 pt-6">
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
                تفاصيل إضافية
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {model.extras.map((e) => (
                  <div key={e.label} className="rounded-xl border border-border bg-accent/40 p-3 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {e.label}
                    </div>
                    <div className="mt-1 text-xs text-foreground">{e.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-6 pt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{category.barLabel}</span>
                <span className="text-xs text-primary">
                  {model.barValue}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${model.barValue}%` }}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="px-6 pt-6 pb-8">
              <div className="flex flex-wrap gap-1.5">
                {model.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-accent/50 px-2.5 py-1 text-[10px] uppercase tracking-wider text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}