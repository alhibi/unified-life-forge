import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SEO from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import {
  ChevronLeft,
  Sparkles,
  Star,
  CheckCircle,
  MapPin,
  Calendar,
  Crown,
} from "@/lib/icons";

/**
 * /knowledge — "المعرفة"
 * ---------------------------------------------------------------------------
 * A self-contained luxury knowledge catalog. Five worlds of refined taste —
 * automobiles, perfumery, horology, fashion and confiserie — each with its
 * iconic houses (brands) and signature pieces (models). The section drills
 * three levels deep entirely from component state (no URL change), so it
 * behaves like a native push/pop flow inside a single bottom-nav tab.
 *
 *   level 0 — browse  : category pills + the houses of the active world
 *   level 1 — brand   : the house header + its signature pieces
 *   level 2 — model   : the full immersive detail sheet for one piece
 *
 * The visual language is theme-aware (uses the app's background / card
 * tokens) but every house and piece carries its own accent colour, so the
 * luxury feel comes from rich coloured glows, gradients and typography
 * layered on top of the neutral surface — and it stays legible in both the
 * light and dark app themes.
 */

// ───────────────────────────── Types ─────────────────────────────

interface Model {
  id: string;
  name: string;
  type: string;
  year: string;
  engine: string;
  power: string;
  torque: string;
  speed: string;
  topSpeed: string;
  price: string;
  tags: string[];
  color: string;
  desc: string;
  highlights: string[];
  specs: Record<string, string>;
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

interface Category {
  id: string;
  icon: string;
  label: string;
  labelEn: string;
  color: string;
}

// ─────────────────────────── Categories ───────────────────────────

const CATEGORIES: Category[] = [
  { id: "cars", icon: "◈", label: "السيارات", labelEn: "Automobiles", color: "#C8A96E" },
  { id: "perfumes", icon: "◉", label: "العطور", labelEn: "Perfumery", color: "#D4A5C9" },
  { id: "watches", icon: "◎", label: "الساعات", labelEn: "Horology", color: "#7EB8C9" },
  { id: "fashion", icon: "◆", label: "الأزياء", labelEn: "Fashion", color: "#C9A87E" },
  { id: "sweets", icon: "◐", label: "الحلويات", labelEn: "Confiserie", color: "#C97E8A" },
];

// ────────────────────────────── Data ──────────────────────────────

const DATA: Record<string, { brands: Brand[] }> = {
  cars: {
    brands: [
      {
        id: "porsche", name: "Porsche", origin: "ألمانيا", founded: "1931",
        logo: "P", desc: "روح الأداء وجمال التصميم في جسد واحد",
        models: [
          {
            id: "911s", name: "911 Carrera S", type: "Sports", year: "2024",
            engine: "3.0L Twin-Turbo Flat-6", power: "450 حصان", torque: "530 نيوتن متر",
            speed: "0–100 في 3.5 ثانية", topSpeed: "308 كم/ساعة", price: "$145,000",
            tags: ["RWD", "PDK", "Sport Chrono"], color: "#C8A96E",
            desc: "الأصيل الخالد. أيقونة 60 عاماً من الحماس والدقة الألمانية. الـ911 ليست مجرد سيارة — إنها فلسفة في الحركة.",
            highlights: ["محرك خلفي أفقي فريد من نوعه", "فنانة المنعطفات الألمانية", "إرث ستة عقود لا يُعادل"],
            specs: { الوزن: "1,515 كغ", القاعدة: "2,450 ملم", الخزان: "67 لتر" }
          },
          {
            id: "taycan", name: "Taycan Turbo S", type: "Electric", year: "2024",
            engine: "محركان كهربائيان AWD", power: "761 حصان", torque: "1,050 نيوتن متر",
            speed: "0–100 في 2.8 ثانية", topSpeed: "260 كم/ساعة", price: "$188,000",
            tags: ["AWD", "800V", "Launch Control"], color: "#5B9BD5",
            desc: "ثورة كهربائية بروح بورش الحقيقية. أسرع من الكارييرا، أهدأ من السكوت، أجمل من المتوقع.",
            highlights: ["شحن فائق 800 فولت", "صفر انبعاثات — لا حدود للإحساس", "الأسرع في تاريخ بورش"],
            specs: { المدى: "630 كم", البطارية: "93.4 كيلوواط/ساعة", الوزن: "2,305 كغ" }
          },
          {
            id: "gt3", name: "911 GT3 RS", type: "Track King", year: "2023",
            engine: "4.0L Flat-6 شفط طبيعي", power: "525 حصان", torque: "465 نيوتن متر",
            speed: "0–100 في 3.2 ثانية", topSpeed: "296 كم/ساعة", price: "$225,000",
            tags: ["RWD", "Manual", "Weissach"], color: "#E85D04",
            desc: "المضمار بثياب الشارع. هندسة جوية استثنائية، أجنحة نشطة، 9,000 دورة من الانتشاء.",
            highlights: ["أجنحة DRS نشطة ديناميكياً", "9,000 RPM — أعلى من الفئة", "حقّق 6:49 على نوردشلايف"],
            specs: { الوزن: "1,450 كغ", الضغط_الأرضي: "409 كغ", النوردشلايف: "6:49.328" }
          },
        ]
      },
      {
        id: "audi", name: "Audi", origin: "ألمانيا", founded: "1909",
        logo: "A", desc: "Vorsprung durch Technik — التقدم عبر التكنولوجيا",
        models: [
          {
            id: "r8", name: "R8 V10 Performance", type: "Supercar", year: "2023",
            engine: "5.2L V10 شفط طبيعي", power: "620 حصان", torque: "580 نيوتن متر",
            speed: "0–100 في 3.1 ثانية", topSpeed: "331 كم/ساعة", price: "$198,000",
            tags: ["AWD", "Quattro", "Mid-Engine"], color: "#E8E8E8",
            desc: "آخر V10 طبيعي من أودي. صوت أسطوري عند 8,250 دورة/دقيقة يجعل جلدك ينتفض.",
            highlights: ["V10 شفط طبيعي 8,250 RPM", "Quattro AWD الأسطوري", "هيكل ألومنيوم+كربون"],
            specs: { الوزن: "1,695 كغ", القاعدة: "2,650 ملم", الخزان: "83 لتر" }
          },
          {
            id: "rs6", name: "RS6 Avant", type: "Wagon Beast", year: "2024",
            engine: "4.0L Twin-Turbo V8", power: "630 حصان", torque: "850 نيوتن متر",
            speed: "0–100 في 3.4 ثانية", topSpeed: "305 كم/ساعة", price: "$132,000",
            tags: ["AWD", "Quattro", "Air Suspension"], color: "#2D6A4F",
            desc: "عربة العائلة التي تهزم السيارات الرياضية. عملية بالكامل، وحشية بالكامل، أنيقة تماماً.",
            highlights: ["850 نيوتن متر في لحظة", "Dynamic Ride Control التكيفي", "5 مقاعد + أداء السباق"],
            specs: { الوزن: "2,035 كغ", الحمولة: "565–1,680 لتر", الخزان: "80 لتر" }
          },
        ]
      },
      {
        id: "mercedes", name: "Mercedes-AMG", origin: "ألمانيا", founded: "1967",
        logo: "M", desc: "Das Beste oder Nichts — الأفضل أو لا شيء",
        models: [
          {
            id: "gt63s", name: "GT 63 S E Performance", type: "Hybrid Beast", year: "2024",
            engine: "4.0L V8 + محرك كهربائي", power: "843 حصان", torque: "1,470 نيوتن متر",
            speed: "0–100 في 2.9 ثانية", topSpeed: "316 كم/ساعة", price: "$165,000",
            tags: ["AWD", "Hybrid", "4-Door GT"], color: "#D4AF37",
            desc: "الأقوى من AMG على الإطلاق. هجين مذهل، عزم خيالي 1,470 نيوتن متر، فخامة سيدان مع قلب سباق.",
            highlights: ["843 حصان — أقوى AMG التاريخ", "E-Boost الكهربائي الفوري", "4 أبواب + GT الحقيقي"],
            specs: { الوزن: "2,385 كغ", البطارية: "6.1 كيلوواط/ساعة", EV_مدى: "12 كم" }
          },
          {
            id: "sls", name: "SL 63 AMG", type: "Roadster", year: "2023",
            engine: "4.0L Biturbo V8", power: "585 حصان", torque: "800 نيوتن متر",
            speed: "0–100 في 3.6 ثانية", topSpeed: "315 كم/ساعة", price: "$175,000",
            tags: ["RWD", "Soft-Top", "AMG Speedshift"], color: "#C0C0C0",
            desc: "روادستر الحرية المطلقة. السماء سقف، الطريق أفق، والـV8 يصدح كأوركسترا.",
            highlights: ["كشف نسيج فاخر", "ميزان ثقل مثالي 50:50", "AMG Performance Seats"],
            specs: { الوزن: "1,870 كغ", القاعدة: "2,700 ملم", الخزان: "65 لتر" }
          },
        ]
      },
      {
        id: "ferrari", name: "Ferrari", origin: "إيطاليا", founded: "1947",
        logo: "F", desc: "حيث الفن يلتقي بالأداء — Il Cavallino Rampante",
        models: [
          {
            id: "sf90", name: "SF90 Stradale", type: "Hybrid Hypercar", year: "2024",
            engine: "4.0L V8 + 3 محركات كهربائية", power: "1,000 حصان", torque: "800 نيوتن متر",
            speed: "0–100 في 2.5 ثانية", topSpeed: "340 كم/ساعة", price: "$625,000",
            tags: ["AWD", "Hybrid", "PHEV"], color: "#CC0000",
            desc: "ألف حصان إيطالي في سيارة أرضية. معجزة هجينة من مارانيلو. الأسرع فيراري إنتاجية.",
            highlights: ["1,000 حصان من V8 + 3 كهربائيات", "AWD لأول مرة في تاريخ فيراري", "0-200 في 6.7 ثانية"],
            specs: { الوزن: "1,570 كغ", البطارية: "7.9 كيلوواط/ساعة", EV_مدى: "25 كم" }
          },
        ]
      },
    ]
  },
  perfumes: {
    brands: [
      {
        id: "creed", name: "Creed", origin: "فرنسا / لندن", founded: "1760",
        logo: "C", desc: "عطر الملوك والأرستقراطية منذ ثلاثة قرون",
        models: [
          {
            id: "aventus", name: "Aventus", type: "Woody Aromatic", year: "2010",
            engine: "برغموت، أناناس، تفاح، توت أسود", power: "الثقة والحضور الملكي", torque: "الإشعاع والقوة",
            speed: "الانتشار: فوري وقوي", topSpeed: "الديمومة: 12+ ساعة", price: "$495 / 50ml",
            tags: ["Masculine", "Iconic", "Projection Beast"], color: "#D4A5C9",
            desc: "الأسطورة الحية. يجسد انتصار نابليون. الأكثر نقاشاً عبر الإنترنت. يختلف من جلد لآخر ومن دفعة لأخرى.",
            highlights: ["بتولا مدخّنة في القلب", "قاعدة المسك والعنبر والعود", "ظاهرة ثقافية عالمية"],
            specs: { العائلة: "Woody Chypre", الديمومة: "12–14 ساعة", التركيز: "EDP" }
          },
          {
            id: "virgin", name: "Virgin Island Water", type: "Tropical Fresh", year: "2007",
            engine: "ليمون، رم، جوز هند، زنجبيل", power: "الانتعاش الاستوائي", torque: "الحرية والبحر",
            speed: "الانتشار: معتدل", topSpeed: "الديمومة: 8–10 ساعات", price: "$410 / 50ml",
            tags: ["Unisex", "Beach", "Summer Icon"], color: "#7EC8E3",
            desc: "رحلة إلى جزر العذراء في زجاجة. الرم الحقيقي واللايم والجوز — إجازة حرفية على جلدك.",
            highlights: ["رم حقيقي في التركيبة", "مثالي لفصل الصيف", "يُفاجئ من يتوقع كريد تقليدياً"],
            specs: { العائلة: "Aquatic Tropical", الديمومة: "8–10 ساعات", التركيز: "EDP" }
          },
          {
            id: "gii", name: "Green Irish Tweed", type: "Fougere Fresh", year: "1985",
            engine: "ليمون أخضر، زنبق الوادي، حشيش", power: "الشباب الخالد", torque: "النضارة الأبدية",
            speed: "الانتشار: معتدل رفيع", topSpeed: "الديمومة: 10–12 ساعة", price: "$430 / 50ml",
            tags: ["Masculine", "Classic", "GOAT"], color: "#4A9B7F",
            desc: "الجد الشرعي لكول ووتر وكلين وكل عطر أخضر طازج عرفه العالم. الأصل قبل النسخ.",
            highlights: ["صدر عام 1985 — قبل كل المنافسين", "ملهم لجيل كامل من العطور", "بساطة الملوك الحقيقيين"],
            specs: { العائلة: "Fougere Aromatic", الديمومة: "10–12 ساعة", التركيز: "EDP" }
          },
        ]
      },
      {
        id: "mf", name: "Maison Francis Kurkdjian", origin: "فرنسا", founded: "2009",
        logo: "MFK", desc: "العطّار الذي أعاد تعريف الفخامة الفرنسية الحديثة",
        models: [
          {
            id: "baccarat", name: "Baccarat Rouge 540", type: "Floral Woody Musky", year: "2015",
            engine: "زعفران، ياسمين، عود، أرز", power: "السحر الأنثوي الغامض", torque: "الدفء والعمق",
            speed: "الانتشار: كثيف جداً", topSpeed: "الديمومة: 14+ ساعة", price: "$335 / 70ml",
            tags: ["Unisex", "Iconic", "Compliment Monster"], color: "#E8B4A0",
            desc: "الظاهرة العالمية. برتقال خشبي محمّص مع خيط من العود والمسك. لم يُمل أحد حتى الآن.",
            highlights: ["الأكثر مبيعاً في الفئة الراقية", "يُستشعر قبل دخول صاحبه", "أثار موجة تقليد عالمية"],
            specs: { العائلة: "Woody Floral Musky", الديمومة: "14–16 ساعة", التركيز: "EDP" }
          },
        ]
      },
      {
        id: "lv", name: "Louis Vuitton Parfums", origin: "فرنسا", founded: "1854",
        logo: "LV", desc: "فن العطر من أعظم دور الأزياء الباريسية",
        models: [
          {
            id: "ombre", name: "Ombré Nomade", type: "Woody Oud", year: "2018",
            engine: "عود، ورد، خشب لاوس، بنفسج", power: "العمق الشرقي المتوازن", torque: "الفخامة الهادئة",
            speed: "الانتشار: كثيف", topSpeed: "الديمومة: 14+ ساعة", price: "$520 / 50ml",
            tags: ["Unisex", "Oud", "Statement Piece"], color: "#8B4513",
            desc: "رحلة البدوي عبر الصحراء والغابات. عود لاوسي نادر مُوازَن بالخشب ونسمة من الورد والبنفسج.",
            highlights: ["عود لاوسي من أندر أنواع العود", "كثافة استثنائية لا تذوب", "مستوحى من ترحل البدو"],
            specs: { العائلة: "Woody Oriental", الديمومة: "14–16 ساعة", التركيز: "EDP" }
          },
        ]
      },
    ]
  },
  watches: {
    brands: [
      {
        id: "patek", name: "Patek Philippe", origin: "جنيف، سويسرا", founded: "1839",
        logo: "PP", desc: "لا تملك باتيك — أنت تحفظها للجيل القادم",
        models: [
          {
            id: "nautilus", name: "Nautilus 5711/1A", type: "Integrated Bracelet", year: "1976",
            engine: "Calibre 26-330 S C", power: "الرقي المطلق", torque: "الإرث الأبدي",
            speed: "الدقة: ±2 ثانية/يوم", topSpeed: "الاحتياطي: 45 ساعة", price: "+$150,000 (السوق الثانوية)",
            tags: ["Steel", "Iconic", "Discontinued"], color: "#4A9B7F",
            desc: "جيرالد جنتا والساعة التي غيّرت الفولاذ إلى فخامة. الأندر والأغلى من الفولاذ في التاريخ.",
            highlights: ["أوقفت إنتاجها عام 2021 فارتفع سعرها", "نسيج الأوجانو الأيقوني", "الحلم المستحيل للمجمعين"],
            specs: { القطر: "40 ملم", مقاومة_الماء: "120 متر", الحركة: "أوتوماتيك" }
          },
          {
            id: "sky", name: "Sky Moon Tourbillon", type: "Grand Complication", year: "2001",
            engine: "Calibre R TO 27 QR SID LU CL", power: "التعقيد الأقصى", torque: "القمة المطلقة",
            speed: "تصنيع واحدة: سنوات", topSpeed: "عدد الوظائف: 12", price: "$1,200,000+",
            tags: ["Platinum", "Tourbillon", "Grand Complication"], color: "#E8E8E8",
            desc: "التاج المطلق. جانبان، 12 وظيفة، توربيون من الخلف، خريطة سماوية. قمة صناعة الساعات.",
            highlights: ["12 تعقيداً في ساعة واحدة", "توربيون مزدوج", "خريطة السماء المتحركة"],
            specs: { القطر: "42 ملم", وظائف: "12 وظيفة", المادة: "بلاتينيوم" }
          },
        ]
      },
      {
        id: "ap", name: "Audemars Piguet", origin: "لو براسوس، سويسرا", founded: "1875",
        logo: "AP", desc: "منذ 1875 — الجرأة في التصميم، التفوق في الصناعة",
        models: [
          {
            id: "roo", name: "Royal Oak Offshore 44mm", type: "Sport Chronograph", year: "1993",
            engine: "Calibre 4401", power: "الجرأة المطلقة", torque: "الهيمنة الرياضية",
            speed: "الدقة: ±4 ثانية/يوم", topSpeed: "الاحتياطي: 70 ساعة", price: "$38,000",
            tags: ["Titanium", "Chronograph", "Bold Icon"], color: "#1A1A2E",
            desc: "The Beast. الأوفشور ضخم، جريء، وحشي الجمال. لمن يرفض أن يمر دون أن يُلاحَظ.",
            highlights: ["70 ساعة احتياطي طاقة", "تيتانيوم فائق الخفة نسبياً", "أيقونة التسعينيات الخالدة"],
            specs: { القطر: "44 ملم", مقاومة_الماء: "100 متر", الحركة: "أوتوماتيك COSC" }
          },
          {
            id: "concept", name: "Concept Supersonnerie", type: "Ultra-Complication", year: "2015",
            engine: "Calibre 2953 SP", power: "الصوت الأصفى", torque: "رنين الفولاذ المثالي",
            speed: "الدقة: ±2 ثانية/يوم", topSpeed: "الإنتاج: قطعة واحدة سنوياً", price: "$750,000+",
            tags: ["Titanium", "Minute Repeater", "Ultra-Rare"], color: "#4A90D9",
            desc: "المنبّه الموسيقي الأنقى في تاريخ الساعات. رنين لا يُصدَّق — كعزف بيانو على معصمك.",
            highlights: ["أنقى صوت minute repeater", "4 سنوات تطوير للرنين فقط", "عدد محدود لا يُكشف"],
            specs: { القطر: "44 ملم", المادة: "تيتانيوم", خاصية: "Minute Repeater" }
          },
        ]
      },
      {
        id: "rolex", name: "Rolex", origin: "جنيف، سويسرا", founded: "1905",
        logo: "R", desc: "تاج المعصم — الأكثر تعرفاً في العالم",
        models: [
          {
            id: "daytona", name: "Daytona 116500LN", type: "Sport Chronograph", year: "2016",
            engine: "Calibre 4130", power: "الدقة الزمنية المطلقة", torque: "الأناقة الكلاسيكية",
            speed: "الدقة: ±2 ثانية/يوم", topSpeed: "الاحتياطي: 72 ساعة", price: "+$35,000 (السوق)",
            tags: ["Steel", "Ceramic", "Waiting List"], color: "#0A0A0A",
            desc: "ملك الكرونوغراف. أصعب ساعة رولكس في الحصول عليها. بيضاء أو سوداء — كلتاهما أسطورة.",
            highlights: ["أوتوماتيك داخلي 4130 المتطور", "قرص سيراميك لا يتأثر بالأشعة", "قائمة انتظار 5+ سنوات"],
            specs: { القطر: "40 ملم", مقاومة_الماء: "100 متر", الحركة: "أوتوماتيك COSC" }
          },
        ]
      },
    ]
  },
  fashion: {
    brands: [
      {
        id: "loro", name: "Loro Piana", origin: "إيطاليا", founded: "1924",
        logo: "LP", desc: "أفخر الأقمشة الطبيعية في العالم — بصمت مطبق",
        models: [
          {
            id: "vicuna", name: "معطف الڤيكونيا", type: "Ultra-Luxury Outerwear", year: "2024",
            engine: "100% ألياف الڤيكونيا", power: "الدفء المطلق", torque: "الفخامة الهادئة",
            speed: "التصنيع: 6 أشهر يدوياً", topSpeed: "النعومة: 12 ميكرون", price: "$18,000 – $60,000",
            tags: ["Vicuña", "Hand-Finished", "Ultra-Rare"], color: "#C9A87E",
            desc: "أغلى قماش طبيعي في العالم. تعيش الڤيكونيا في جبال الأنديز المحمية. 30 حيوان لمعطف واحد.",
            highlights: ["12 ميكرون — أرق من الكشمير بمرات", "محمية بموجب القانون الدولي", "قطعة تورث للأجيال"],
            specs: { الوزن: "1.2 كغ", النعومة: "12 ميكرون", العناية: "تنظيف جاف فقط" }
          },
          {
            id: "vigogna", name: "كنزة الكشمير الملكي", type: "Knitwear", year: "2024",
            engine: "100% Baby Cashmere", power: "نعومة غير مسبوقة", torque: "الدفء الناعم",
            speed: "الإنتاج: 3 أشهر", topSpeed: "النعومة: 14 ميكرون", price: "$2,800 – $5,500",
            tags: ["Baby Cashmere", "Iconic", "Minimal"], color: "#D4C5A9",
            desc: "كشمير صغار الماعز الهرقاني — أرق من كشمير البالغين. الكنزة التي تُغيّر تعريفك للنعومة.",
            highlights: ["من صغار الماعز فقط دون الأذى", "غسل بارد يدوياً فقط", "النعومة المطلقة بلا منافس"],
            specs: { النعومة: "14 ميكرون", الوزن: "280 غرام", الأصل: "منغوليا / أفغانستان" }
          },
        ]
      },
      {
        id: "hermes", name: "Hermès", origin: "فرنسا", founded: "1837",
        logo: "H", desc: "منذ 1837 — الحرفية الفرنسية في أجمل تجلياتها",
        models: [
          {
            id: "birkin", name: "Birkin 25 Togo", type: "Iconic Handbag", year: "1984",
            engine: "جلد Togo العجل الفرنسي", power: "الرمزية المطلقة", torque: "الاستثمار الأكيد",
            speed: "قائمة انتظار: 5+ سنوات", topSpeed: "الديمومة: عمر كامل", price: "$12,000 – $500,000+",
            tags: ["Togo", "Handmade", "Investment"], color: "#BF5E3B",
            desc: "الأكثر شهرة والأغلى. كل حقيبة يصنعها حرفي واحد من البداية للنهاية. 18 ساعة عمل للقطعة.",
            highlights: ["18 ساعة عمل يدوي متواصل", "150+ درجة لونية متاحة", "ترتفع قيمتها مع الزمن"],
            specs: { الحجم: "25 سم", الحرفي: "فرد واحد للكل", ضمان: "عمر كامل مع الخدمة" }
          },
        ]
      },
    ]
  },
  sweets: {
    brands: [
      {
        id: "pierre", name: "Pierre Hermé", origin: "باريس، فرنسا", founded: "1998",
        logo: "PH", desc: "إيف سان لوران الحلويات — يُغيّر الموضة كل موسم",
        models: [
          {
            id: "ispahan", name: "Ispahan", type: "Macaron Signature", year: "2001",
            engine: "ورد، ليتشي، توت أحمر طازج", power: "الحساسية المتوازنة", torque: "الجمال البصري",
            speed: "التحضير: 3 أيام كاملة", topSpeed: "العمر: 3 أيام فقط", price: "€9 للقطعة / €85 للتورتة",
            tags: ["Signature", "Award-Winning", "Rose"], color: "#E8A0B4",
            desc: "تحفة دائرية. الورد والليتشي والتوت في تناغم يصعب نسيانه. مستوحى من حديقة إصفهان الفارسية.",
            highlights: ["الأكثر تقليداً عالمياً من ماكاروناته", "ماكرون 15سم بديل للكيكة", "3 مكونات بتوازن مثالي"],
            specs: { القوام: "هش + طري", العمر: "3 أيام", التخزين: "4–6°C" }
          },
          {
            id: "mogador", name: "Mogador Tarte", type: "Signature Tarte", year: "2005",
            engine: "باشن فروت، شوكولاتة حليب 40%", power: "التعقيد الحلو-الحامض", torque: "المفاجأة المثالية",
            speed: "التحضير: يومان", topSpeed: "العمر: يومان", price: "€85 للتورتة",
            tags: ["Signature", "Exotic", "Ganache Masterpiece"], color: "#F4A460",
            desc: "المغادور — ميناء مغربي ألهم عطّاراً فرنسياً. الباشن فروت يرقص مع الشوكولاتة بتناغم استثنائي.",
            highlights: ["غاناش الشوكولاتة الحليب 40% من فاليرونا", "رغوة الباشن فروت الطازج", "قشرة باريس بريست هشة"],
            specs: { القطر: "20 سم", الحصص: "6–8 أشخاص", المسببات: "غلوتين، حليب، بيض" }
          },
          {
            id: "tarte_citron", name: "Tarte Citron Infiniment", type: "Citrus Tarte", year: "2008",
            engine: "ليمون بروفانسال، كريمة، مارينغ", power: "الحموضة المثالية", torque: "النضارة الانفجارية",
            speed: "التحضير: يوم ونصف", topSpeed: "العمر: 48 ساعة", price: "€75 للتورتة",
            tags: ["Citrus", "Meringue", "Refreshing"], color: "#F4D03F",
            desc: "ليمون بروفانس الفرنسي بلا رحمة. الحموضة الكاملة مع مارينغ ناعم يوازنها برفق.",
            highlights: ["ليمون بروفانسي من مزارع محددة", "كريمة الليمون بدون مبالغة", "مارينغ محروق لحظياً"],
            specs: { القطر: "20 سم", الحصص: "6–8 أشخاص", المسببات: "غلوتين، حليب، بيض" }
          },
        ]
      },
      {
        id: "valrhona", name: "Valrhona", origin: "فرنسا / كل العالم", founded: "1922",
        logo: "V", desc: "أكاديمية الشوكولاتة الفرنسية — تُعلّم الشيفات العالم",
        models: [
          {
            id: "guanaja", name: "جواناجا 70%", type: "Dark Chocolate", year: "1986",
            engine: "كاكاو ترينيداد + كاريبي بلند", power: "المرارة النبيلة", torque: "التعقيد العميق",
            speed: "التذوّق: طبقات متتالية", topSpeed: "النهاية: طويلة ومُرّة", price: "€12 / 100غ",
            tags: ["70% Cacao", "Grand Cru", "Iconic"], color: "#3B2417",
            desc: "أعظم شوكولاتة داكنة من فاليرونا. خلطة كاريبية أسطورية صُنعت عام 1986 لتقدّم أعلى نسبة مرارة نبيلة عرفها عالم الباتيسري.",
            highlights: ["خلطة 'جراند كرو' الكاريبية الشهيرة", "المرجع الذهبي لكل شيف باتيسري", "توازن مثالي بين المرارة والعمق"],
            specs: { الكاكاو: "70%", المنشأ: "بلند كاريبي", الاستخدام: "حلويات راقية / تذوّق" }
          },
          {
            id: "manjari", name: "مانجاري 64%", type: "Single-Origin", year: "1991",
            engine: "كاكاو مدغشقر أحادي المنشأ", power: "الحموضة الفاكهية", torque: "نكهة التوت الأحمر",
            speed: "التذوّق: حيوي ومنعش", topSpeed: "النهاية: حمضية لامعة", price: "€13 / 100غ",
            tags: ["64% Cacao", "Single-Origin", "Fruity"], color: "#7B2D26",
            desc: "أول شوكولاتة أحادية المنشأ في العالم. كاكاو مدغشقر النادر يمنحها حموضة توتية حيّة لا تُنسى — ثورة غيّرت مفهوم النكهة.",
            highlights: ["أول 'سينغل أوريجن' في التاريخ", "نكهة التوت الأحمر الطبيعية", "كاكاو ترينيتاريو من مدغشقر"],
            specs: { الكاكاو: "64%", المنشأ: "مدغشقر", النكهة: "توت أحمر / حمضيات" }
          },
          {
            id: "dulcey", name: "دولسيه 32%", type: "Blond Chocolate", year: "2012",
            engine: "زبدة الكاكاو، حليب، بسكويت", power: "الحلاوة المُكرملة", torque: "دفء البسكويت", 
            speed: "التذوّق: مخملي كريمي", topSpeed: "النهاية: كراميل وملح خفيف", price: "€12 / 100غ",
            tags: ["32% Cacao", "Blond", "Caramel"], color: "#C68B4E",
            desc: "الشوكولاتة الشقراء التي وُلدت من الصدفة. لون عاجي دافئ، نكهة بسكويت محمّص وكراميل بلمسة ملح — فئة رابعة من الشوكولاتة بأكملها.",
            highlights: ["اكتُشفت بالصدفة بعد 'نسيان' الشوكولاتة", "فئة رابعة بعد الداكنة والحليب والبيضاء", "نكهة بسكويت مكرمل لا تُقاوم"],
            specs: { الكاكاو: "32%", النوع: "شوكولاتة شقراء", النكهة: "كراميل / بسكويت" }
          },
        ]
      },
    ]
  },
};

// ─── Per-category fallback labels for the five "signature" stat fields ───
// Many non-car values already embed their own label (e.g. "الانتشار: فوري")
// which `parseStat` splits out; these fallbacks cover the rest (mostly cars).
const STAT_LABELS: Record<string, Record<"engine" | "power" | "torque" | "speed" | "topSpeed", string>> = {
  cars:     { engine: "المحرّك",   power: "القوة",     torque: "العزم",    speed: "التسارع",  topSpeed: "السرعة القصوى" },
  perfumes: { engine: "المكوّنات", power: "الطابع",    torque: "الإحساس",  speed: "الانتشار", topSpeed: "الثبات" },
  watches:  { engine: "الحركة",    power: "الطابع",    torque: "القيمة",   speed: "الدقة",    topSpeed: "احتياطي الطاقة" },
  fashion:  { engine: "الخامة",    power: "الميزة",    torque: "الإحساس",  speed: "التصنيع",  topSpeed: "التميّز" },
  sweets:   { engine: "المكوّنات", power: "النكهة",    torque: "التجربة",  speed: "التذوّق",  topSpeed: "النهاية" },
};

const STAT_ORDER: Array<keyof typeof STAT_LABELS["cars"]> = [
  "engine", "power", "torque", "speed", "topSpeed",
];

/** Split a "label: value" string; otherwise fall back to a default label. */
function parseStat(raw: string, fallbackLabel: string): { label: string; value: string } {
  const i = raw.indexOf(":");
  if (i > 0 && i <= 16) {
    return { label: raw.slice(0, i).trim(), value: raw.slice(i + 1).trim() };
  }
  return { label: fallbackLabel, value: raw };
}

/** Arabic spec keys use underscores as spaces ("مقاومة_الماء"). */
const prettyKey = (k: string) => k.replace(/_/g, " ");

/** Append an alpha channel to a 6-digit hex colour (e.g. "#C8A96E" + "22"). */
const tint = (hex: string, alpha: string) => `${hex}${alpha}`;

// ──────────────────────────── Component ────────────────────────────

export default function KnowledgePage() {
  const { language } = useApp();
  const isAr = language === "ar";
  const navigate = useNavigate();

  const [catId, setCatId] = useState<string>(CATEGORIES[0].id);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === catId) ?? CATEGORIES[0],
    [catId],
  );
  const brands = useMemo(() => DATA[catId]?.brands ?? [], [catId]);
  const brand = useMemo(
    () => (brandId ? brands.find((b) => b.id === brandId) ?? null : null),
    [brandId, brands],
  );
  const model = useMemo(
    () => (brand && modelId ? brand.models.find((m) => m.id === modelId) ?? null : null),
    [brand, modelId],
  );

  // Always start each drill-down from the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [catId, brandId, modelId]);

  const view: "browse" | "brand" | "model" = model ? "model" : brand ? "brand" : "browse";

  const selectCategory = (id: string) => {
    setCatId(id);
    setBrandId(null);
    setModelId(null);
  };

  const goBack = () => {
    if (model) setModelId(null);
    else if (brand) setBrandId(null);
    else navigate("/");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground px-4 pt-8 pb-28">
      <SEO
        title={isAr ? "المعرفة — عالم الفخامة والذوق الرفيع" : "Wissen — Welt des Luxus & feinen Geschmacks"}
        description={isAr
          ? "المعرفة: دليل مرئي للسيارات والعطور والساعات والأزياء والحلويات الفاخرة — أعرق الدور وأيقوناتها."
          : "Wissen: ein visueller Führer durch Luxus-Automobile, Parfums, Uhren, Mode und Confiserie."}
        path="/knowledge"
      />

      <div className="max-w-lg mx-auto">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 mb-5">
          {view !== "browse" && (
            <button
              type="button"
              onClick={goBack}
              aria-label={isAr ? "رجوع" : "Back"}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground/85 hover:bg-foreground/[0.08] active:scale-95 transition-[background-color,transform] duration-150"
            >
              <ChevronLeft className="h-[18px] w-[18px] rtl:rotate-180" aria-hidden />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight leading-tight">
              <Crown className="w-5 h-5" style={{ color: category.color }} aria-hidden />
              {isAr ? "المعرفة" : "Wissen"}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {isAr ? "عالم الفخامة والذوق الرفيع" : "Eine Welt des feinen Geschmacks"}
            </p>
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {view === "browse" && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <BrowseView
                categories={CATEGORIES}
                activeCat={category}
                onSelectCat={selectCategory}
                brands={brands}
                onSelectBrand={setBrandId}
                isAr={isAr}
              />
            </motion.div>
          )}

          {view === "brand" && brand && (
            <motion.div
              key={`brand-${brand.id}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <BrandView
                brand={brand}
                accent={category.color}
                onSelectModel={setModelId}
                isAr={isAr}
              />
            </motion.div>
          )}

          {view === "model" && brand && model && (
            <motion.div
              key={`model-${model.id}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <ModelView brand={brand} model={model} catId={catId} isAr={isAr} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────── Browse view ───────────────────────────

function BrowseView({
  categories, activeCat, onSelectCat, brands, onSelectBrand, isAr,
}: {
  categories: Category[];
  activeCat: Category;
  onSelectCat: (id: string) => void;
  brands: Brand[];
  onSelectBrand: (id: string) => void;
  isAr: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Category pills */}
      <nav aria-label={isAr ? "تصنيفات المعرفة" : "Knowledge categories"} className="-mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => {
            const active = c.id === activeCat.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectCat(c.id)}
                aria-pressed={active}
                className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full border transition-all duration-150 active:scale-95"
                style={{
                  borderColor: active ? c.color : "hsl(var(--border) / 0.5)",
                  background: active ? tint(c.color, "1f") : "hsl(var(--card) / 0.6)",
                  color: active ? c.color : "hsl(var(--muted-foreground))",
                }}
              >
                <span className="text-[15px] leading-none" aria-hidden>{c.icon}</span>
                <span className="text-[13px] font-semibold whitespace-nowrap">
                  {isAr ? c.label : c.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Active category banner */}
      <div
        className="rounded-2xl p-4 border"
        style={{
          borderColor: tint(activeCat.color, "33"),
          background: `linear-gradient(135deg, ${tint(activeCat.color, "22")}, transparent 80%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: tint(activeCat.color, "26"), color: activeCat.color }}
            aria-hidden
          >
            {activeCat.icon}
          </div>
          <div>
            <h2 className="text-[17px] font-bold leading-tight">{isAr ? activeCat.label : activeCat.labelEn}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5 tracking-wider uppercase">
              {isAr ? activeCat.labelEn : activeCat.label} · {brands.length} {isAr ? "دار" : "houses"}
            </p>
          </div>
        </div>
      </div>

      {/* Brand cards */}
      <div className="space-y-3">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelectBrand(b.id)}
            className="w-full text-right rounded-2xl border border-border/50 bg-card/70 p-4 flex items-center gap-3.5 hover:bg-card transition-colors active:scale-[0.99]"
          >
            <div
              className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center font-extrabold text-lg tracking-tight"
              style={{
                background: `linear-gradient(140deg, ${tint(activeCat.color, "33")}, ${tint(activeCat.color, "14")})`,
                color: activeCat.color,
                border: `1px solid ${tint(activeCat.color, "40")}`,
              }}
              aria-hidden
            >
              {b.logo}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[16px] font-bold leading-tight truncate">{b.name}</h3>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {b.models.length} {isAr ? "قطعة" : "items"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{b.origin}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{b.founded}</span>
              </p>
              <p className="text-[12px] text-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">{b.desc}</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground/60 shrink-0 rtl:rotate-180" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── Brand view ───────────────────────────

function BrandView({
  brand, accent, onSelectModel, isAr,
}: {
  brand: Brand;
  accent: string;
  onSelectModel: (id: string) => void;
  isAr: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Brand hero */}
      <div
        className="rounded-2xl p-5 border text-center"
        style={{
          borderColor: tint(accent, "33"),
          background: `radial-gradient(120% 120% at 50% 0%, ${tint(accent, "22")}, transparent 70%)`,
        }}
      >
        <div
          className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center font-extrabold text-2xl tracking-tight"
          style={{
            background: `linear-gradient(140deg, ${tint(accent, "3d")}, ${tint(accent, "12")})`,
            color: accent,
            border: `1px solid ${tint(accent, "4d")}`,
          }}
          aria-hidden
        >
          {brand.logo}
        </div>
        <h2 className="text-[22px] font-bold mt-3 leading-tight">{brand.name}</h2>
        <p className="text-[12px] text-muted-foreground mt-1 flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{brand.origin}</span>
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{isAr ? "تأسست" : "est."} {brand.founded}</span>
        </p>
        <p className="text-[13px] text-foreground/80 mt-3 leading-relaxed max-w-sm mx-auto">{brand.desc}</p>
      </div>

      {/* Model count label */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4" style={{ color: accent }} aria-hidden />
        <h3 className="text-[14px] font-bold">{isAr ? "القطع المميّزة" : "Signature pieces"}</h3>
        <span className="text-[11px] text-muted-foreground">({brand.models.length})</span>
      </div>

      {/* Model cards */}
      <div className="space-y-3">
        {brand.models.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectModel(m.id)}
            className="w-full text-right rounded-2xl border border-border/50 bg-card/70 overflow-hidden hover:bg-card transition-colors active:scale-[0.99]"
          >
            <div className="flex">
              {/* Accent rail */}
              <div className="w-1.5 shrink-0" style={{ background: m.color }} aria-hidden />
              <div className="flex-1 min-w-0 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-[16px] font-bold leading-tight truncate">{m.name}</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: m.color }}>{m.type} · {m.year}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-1 rtl:rotate-180" aria-hidden />
                </div>
                <p className="text-[12px] text-foreground/70 mt-2 line-clamp-2 leading-relaxed">{m.desc}</p>
                <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                  <div className="flex gap-1.5 flex-wrap">
                    {m.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: tint(m.color, "1f"), color: m.color }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: m.color }}>{m.price}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── Model view ───────────────────────────

function ModelView({
  brand, model, catId, isAr,
}: {
  brand: Brand;
  model: Model;
  catId: string;
  isAr: boolean;
}) {
  const labels = STAT_LABELS[catId] ?? STAT_LABELS.cars;
  const stats = STAT_ORDER.map((k) => parseStat(model[k], labels[k]));
  const specEntries = Object.entries(model.specs);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="rounded-3xl p-6 border relative overflow-hidden"
        style={{
          borderColor: tint(model.color, "40"),
          background: `radial-gradient(130% 120% at 50% 0%, ${tint(model.color, "30")}, transparent 72%)`,
        }}
      >
        <div
          className="absolute -top-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: model.color }}
          aria-hidden
        />
        <div className="relative">
          <p className="text-[12px] font-semibold tracking-wide text-muted-foreground">{brand.name}</p>
          <h2 className="text-[26px] font-extrabold leading-tight mt-1">{model.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: tint(model.color, "26"), color: model.color }}
            >
              {model.type}
            </span>
            <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{model.year}
            </span>
          </div>
          <p className="text-[14px] text-foreground/85 leading-relaxed mt-4">{model.desc}</p>
        </div>
      </div>

      {/* Price banner */}
      <div
        className="rounded-2xl px-4 py-3.5 border flex items-center justify-between"
        style={{ borderColor: tint(model.color, "33"), background: tint(model.color, "14") }}
      >
        <span className="text-[12px] font-semibold text-muted-foreground">{isAr ? "السعر" : "Price"}</span>
        <span className="text-[16px] font-extrabold" style={{ color: model.color }}>{model.price}</span>
      </div>

      {/* Signature stats */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/70 p-3.5"
            style={i === 0 ? { gridColumn: "1 / -1" } : undefined}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: model.color }} aria-hidden />
              <span className="text-[11px] font-semibold text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-[14px] font-bold mt-1 leading-snug">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div className="flex gap-2 flex-wrap">
        {model.tags.map((tag) => (
          <span
            key={tag}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full border"
            style={{ borderColor: tint(model.color, "40"), color: model.color, background: tint(model.color, "12") }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Highlights */}
      <section className="rounded-2xl border border-border/50 bg-card/70 p-4">
        <h3 className="flex items-center gap-2 text-[14px] font-bold mb-3">
          <Star className="w-4 h-4" style={{ color: model.color }} aria-hidden />
          {isAr ? "ما يميّزها" : "Highlights"}
        </h3>
        <ul className="space-y-2.5">
          {model.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: model.color }} aria-hidden />
              <span className="text-[13px] text-foreground/85 leading-relaxed">{h}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Detailed specs */}
      <section className="rounded-2xl border border-border/50 bg-card/70 p-4">
        <h3 className="text-[14px] font-bold mb-3">{isAr ? "المواصفات" : "Specifications"}</h3>
        <div className="divide-y divide-border/40">
          {specEntries.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[12px] text-muted-foreground">{prettyKey(k)}</span>
              <span className="text-[13px] font-semibold text-foreground/90 text-left">{v}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
