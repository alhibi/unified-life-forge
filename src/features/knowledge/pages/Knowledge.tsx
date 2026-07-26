import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';
import { type ComponentType, useMemo, useState } from 'react';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard } from '@/components/ui/app-shell';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import {
  ArrowUpSquare,
  BookOpen,
  Car,
  ChevronRight,
  Clock,
  Cookie,
  Shirt,
  Sparkle,
} from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

/**
 * /knowledge — "موسوعة الرقي"
 * A self-contained luxury knowledge catalog. Five worlds: cars, perfumery,
 * horology, fashion, confiserie. RTL, dark (#080808). Tailwind only; dynamic
 * accent colors via inline style (per-category / per-model).
 */

type CategoryId = 'cars' | 'perfumes' | 'watches' | 'fashion' | 'sweets';

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
    id: 'cars',
    icon: Car,
    label: 'السيارات',
    labelEn: 'Automobiles',
    color: '#C8A96E',
    barLabel: 'مستوى الأداء',
    fieldLabels: ['المحرك', 'القوة', 'العزم', 'التسارع'],
  },
  {
    id: 'perfumes',
    icon: Sparkle,
    label: 'العطور',
    labelEn: 'Perfumery',
    color: '#D4A5C9',
    barLabel: 'الديمومة',
    fieldLabels: ['رائحة القمة', 'القلب', 'القاعدة', 'العائلة'],
  },
  {
    id: 'watches',
    icon: Clock,
    label: 'الساعات',
    labelEn: 'Horology',
    color: '#7EB8C9',
    barLabel: 'التعقيد التقني',
    fieldLabels: ['الحركة', 'نوع الحركة', 'الدقة', 'مقاومة الماء'],
  },
  {
    id: 'fashion',
    icon: Shirt,
    label: 'الأزياء',
    labelEn: 'Fashion',
    color: '#C9A87E',
    barLabel: 'مستوى الحرفية',
    fieldLabels: ['الخامة', 'طريقة الصنع', 'بلد المنشأ', 'مدة التصنيع'],
  },
  {
    id: 'sweets',
    icon: Cookie,
    label: 'الحلويات',
    labelEn: 'Confiserie',
    color: '#C97E8A',
    barLabel: 'دقة التحضير',
    fieldLabels: ['المكونات', 'القاعدة', 'الحشوة', 'وقت التحضير'],
  },
];

// ────────────────────────────── Data ──────────────────────────────
const DATA: Record<CategoryId, Brand[]> = {
  cars: [
    {
      id: 'porsche',
      name: 'Porsche',
      origin: 'ألمانيا',
      founded: '1931',
      logo: 'P',
      desc: 'روح الأداء وجمال التصميم في جسد واحد.',
      models: [
        {
          id: '911s',
          name: '911 Carrera S',
          type: 'Sports',
          year: '2024',
          price: '$145,000',
          color: '#C8A96E',
          desc: 'الأصيل الخالد. أيقونة 60 عاماً من الحماس والدقة الألمانية. الـ911 ليست مجرد سيارة — إنها فلسفة في الحركة.',
          highlights: [
            'محرك خلفي أفقي فريد',
            'فنانة المنعطفات الألمانية',
            'إرث ستة عقود لا يُعادل',
          ],
          fields: ['3.0L Twin-Turbo Flat-6', '450 حصان', '530 نيوتن متر', '0–100 في 3.5ث'],
          extras: [
            { label: 'السرعة القصوى', value: '308 كم/س' },
            { label: 'الوزن', value: '1,515 كغ' },
            { label: 'القاعدة', value: '2,450 ملم' },
          ],
          barValue: 88,
          tags: ['RWD', 'PDK', 'Sport Chrono'],
        },
        {
          id: 'taycan',
          name: 'Taycan Turbo S',
          type: 'Electric',
          year: '2024',
          price: '$188,000',
          color: '#5B9BD5',
          desc: 'ثورة كهربائية بروح بورش الحقيقية. أسرع من الكارييرا، أهدأ من الصمت، أجمل من المتوقع.',
          highlights: [
            'شحن فائق 800 فولت',
            'صفر انبعاثات، لا حدود للإحساس',
            'الأسرع في تاريخ بورش',
          ],
          fields: ['محركان كهربائيان AWD', '761 حصان', '1,050 نيوتن متر', '0–100 في 2.8ث'],
          extras: [
            { label: 'السرعة القصوى', value: '260 كم/س' },
            { label: 'البطارية', value: '93.4 kWh' },
            { label: 'المدى', value: '630 كم' },
          ],
          barValue: 95,
          tags: ['AWD', '800V', 'Launch Control'],
        },
        {
          id: 'gt3',
          name: '911 GT3 RS',
          type: 'Track King',
          year: '2023',
          price: '$225,000',
          color: '#E85D04',
          desc: 'المضمار بثياب الشارع. هندسة جوية استثنائية، أجنحة نشطة، و9,000 دورة من الانتشاء.',
          highlights: [
            'أجنحة DRS نشطة ديناميكياً',
            '9,000 RPM — أعلى من الفئة',
            'حقّق 6:49 على نوردشلايف',
          ],
          fields: ['4.0L Flat-6 شفط طبيعي', '525 حصان', '465 نيوتن متر', '0–100 في 3.2ث'],
          extras: [
            { label: 'السرعة القصوى', value: '296 كم/س' },
            { label: 'الوزن', value: '1,450 كغ' },
            { label: 'نوردشلايف', value: '6:49.328' },
          ],
          barValue: 98,
          tags: ['RWD', 'Manual', 'Weissach'],
        },
      ],
    },
    {
      id: 'audi',
      name: 'Audi',
      origin: 'ألمانيا',
      founded: '1909',
      logo: 'A',
      desc: 'Vorsprung durch Technik — التقدم عبر التكنولوجيا.',
      models: [
        {
          id: 'r8',
          name: 'R8 V10 Performance',
          type: 'Supercar',
          year: '2023',
          price: '$198,000',
          color: '#E0E0E0',
          desc: 'آخر V10 طبيعي من أودي. صوت أسطوري عند 8,250 دورة/دقيقة يجعل جلدك ينتفض.',
          highlights: ['V10 شفط طبيعي 8,250 RPM', 'Quattro AWD الأسطوري', 'هيكل ألومنيوم وكربون'],
          fields: ['5.2L V10 شفط طبيعي', '620 حصان', '580 نيوتن متر', '0–100 في 3.1ث'],
          extras: [
            { label: 'السرعة القصوى', value: '331 كم/س' },
            { label: 'الوزن', value: '1,695 كغ' },
            { label: 'القاعدة', value: '2,650 ملم' },
          ],
          barValue: 93,
          tags: ['AWD', 'Quattro', 'Mid-Engine'],
        },
        {
          id: 'rs6',
          name: 'RS6 Avant',
          type: 'Wagon Beast',
          year: '2024',
          price: '$132,000',
          color: '#2D6A4F',
          desc: 'عربة العائلة التي تهزم السيارات الرياضية. عملية بالكامل، وحشية بالكامل، أنيقة تماماً.',
          highlights: [
            '850 نيوتن متر في لحظة',
            'Dynamic Ride Control التكيفي',
            '5 مقاعد وأداء السباق',
          ],
          fields: ['4.0L Twin-Turbo V8', '630 حصان', '850 نيوتن متر', '0–100 في 3.4ث'],
          extras: [
            { label: 'السرعة القصوى', value: '305 كم/س' },
            { label: 'الوزن', value: '2,035 كغ' },
            { label: 'الحمولة', value: '565–1,680 لتر' },
          ],
          barValue: 90,
          tags: ['AWD', 'Quattro', 'Air Suspension'],
        },
      ],
    },
    {
      id: 'amg',
      name: 'Mercedes-AMG',
      origin: 'ألمانيا',
      founded: '1967',
      logo: 'M',
      desc: 'Das Beste oder Nichts — الأفضل أو لا شيء.',
      models: [
        {
          id: 'gt63s',
          name: 'GT 63 S E Performance',
          type: 'Hybrid Beast',
          year: '2024',
          price: '$165,000',
          color: '#D4AF37',
          desc: 'الأقوى من AMG على الإطلاق. هجين مذهل، عزم خيالي، فخامة سيدان مع قلب سباق.',
          highlights: [
            '843 حصان — أقوى AMG في التاريخ',
            'E-Boost الكهربائي الفوري',
            '4 أبواب وروح GT',
          ],
          fields: ['4.0L V8 + محرك كهربائي', '843 حصان', '1,470 نيوتن متر', '0–100 في 2.9ث'],
          extras: [
            { label: 'السرعة القصوى', value: '316 كم/س' },
            { label: 'الوزن', value: '2,385 كغ' },
            { label: 'البطارية', value: '6.1 kWh' },
          ],
          barValue: 97,
          tags: ['AWD', 'Hybrid', '4-Door GT'],
        },
      ],
    },
    {
      id: 'ferrari',
      name: 'Ferrari',
      origin: 'إيطاليا',
      founded: '1947',
      logo: 'F',
      desc: 'حيث الفن يلتقي بالأداء — Il Cavallino Rampante.',
      models: [
        {
          id: 'sf90',
          name: 'SF90 Stradale',
          type: 'Hybrid Hypercar',
          year: '2024',
          price: '$625,000',
          color: '#CC0000',
          desc: 'ألف حصان إيطالي في سيارة أرضية. معجزة هجينة من مارانيلو. الأسرع فيراري إنتاجية.',
          highlights: [
            'ألف حصان من V8 وثلاث كهربائيات',
            'AWD لأول مرة في فيراري',
            '0–200 في 6.7 ثانية',
          ],
          fields: ['4.0L V8 + 3 محركات كهربائية', '1,000 حصان', '800 نيوتن متر', '0–100 في 2.5ث'],
          extras: [
            { label: 'السرعة القصوى', value: '340 كم/س' },
            { label: 'الوزن', value: '1,570 كغ' },
            { label: 'EV مدى', value: '25 كم' },
          ],
          barValue: 99,
          tags: ['AWD', 'Hybrid', 'PHEV'],
        },
        {
          id: 'purosangue',
          name: 'Purosangue V12',
          type: 'Luxury SUV',
          year: '2024',
          price: '$400,000',
          color: '#800000',
          desc: 'أول سيارة بأربعة أبواب وأربعة مقاعد من فيراري مع محرك V12 ذو تنفس طبيعي ساحر.',
          highlights: ['أبواب خلفية تفتح بشكل عكسي مذهل', 'محرك V12 تنفس طبيعي في قمة الروعة', 'نظام تعليق نشط متطور للغاية'],
          fields: ['6.5L V12 تنفس طبيعي', '725 حصان', '716 نيوتن متر', '0–100 في 3.3ث'],
          extras: [
            { label: 'السرعة القصوى', value: '310 كم/س' },
            { label: 'الوزن', value: '2,033 كغ' },
            { label: 'توزيع الوزن', value: '49:51' },
          ],
          barValue: 96,
          tags: ['V12', 'AWD', '4-Door'],
        }
      ],
    },
    {
      id: 'bugatti',
      name: 'Bugatti',
      origin: 'فرنسا',
      founded: '1909',
      logo: 'B',
      desc: 'إذا كان قابلاً للمقارنة، فهو ليس بوغاتي.',
      models: [
        {
          id: 'chiron_ss',
          name: 'Chiron Super Sport',
          type: 'Hypercar',
          year: '2023',
          price: '$3,825,000',
          color: '#1A237E',
          desc: 'القمة المطلقة في هندسة السرعة والفخامة. وحش بـ 16 أسطوانة يلتهم المسافات كأنه طائرة نفاثة أرضية.',
          highlights: ['أربع شواحن توربينية عملاقة', 'هيكل كربوني فائق الانسيابية', 'سرعة قصوى محددة لسلامة الإطارات'],
          fields: ['8.0L Quad-Turbo W16', '1600 حصان', '1600 نيوتن متر', '0–100 في 2.2ث'],
          extras: [
            { label: 'السرعة القصوى', value: '440 كم/س' },
            { label: 'الوزن', value: '1,945 كغ' },
            { label: 'معدل الانبعاث', value: 'كثيف' },
          ],
          barValue: 100,
          tags: ['W16', 'AWD', 'SuperSport'],
        }
      ]
    },
    {
      id: 'aston_martin',
      name: 'Aston Martin',
      origin: 'بريطانيا',
      founded: '1913',
      logo: 'AM',
      desc: 'الفخامة البريطانية والأداء الرياضي الخالد.',
      models: [
        {
          id: 'dbs_sl',
          name: 'DBS Superleggera',
          type: 'Grand Tourer',
          year: '2023',
          price: '$330,000',
          color: '#004D40',
          desc: 'الوحش الأنيق. سيارة الـ Grand Tourer الأجمل التي تجمع بين الفخامة المفرطة وعزم الدوران العنيف.',
          highlights: ['تصميم خارجي ساحر ومقدمة مرعبة', 'هيكل خفيف للغاية من ألياف الكربون', 'صوت عادم بريطاني مذهل'],
          fields: ['5.2L Twin-Turbo V12', '715 حصان', '900 نيوتن متر', '0–100 في 3.4ث'],
          extras: [
            { label: 'السرعة القصوى', value: '340 كم/س' },
            { label: 'الوزن', value: '1,693 كغ' },
            { label: 'ناقل الحركة', value: 'ZF 8-Speed' },
          ],
          barValue: 91,
          tags: ['V12', 'RWD', 'Carbon-Fiber'],
        },
        {
          id: 'valkyrie',
          name: 'Valkyrie',
          type: 'Hypercar',
          year: '2024',
          price: '$3,500,000',
          color: '#33691E',
          desc: 'سيارة فورمولا 1 مخصصة للطرق العامة. ثمرة التعاون بين أستون مارتن وعبقري الهوائية أدريان نيوي.',
          highlights: ['محرك Cosworth ذو دوران مرعب 11,100 دورة', 'توليد قوة داونفورس تعادل الطائرات', 'هيكل كربوني بالكامل لا مثيل له'],
          fields: ['6.5L V12 Hybrid', '1155 حصان', '900 نيوتن متر', '0–100 في 2.6ث'],
          extras: [
            { label: 'السرعة القصوى', value: '400 كم/س' },
            { label: 'الوزن', value: '1,030 كغ' },
            { label: 'مستوى الدوران', value: '11,100 RPM' },
          ],
          barValue: 100,
          tags: ['V12', 'Hybrid', 'F1-inspired'],
        }
      ]
    },
    {
      id: 'lamborghini',
      name: 'Lamborghini',
      origin: 'إيطاليا',
      founded: '1963',
      logo: 'L',
      desc: 'روح التصميم الهجومي الحاد والجرأة اللامحدودة.',
      models: [
        {
          id: 'revuelto',
          name: 'Revuelto V12 Hybrid',
          type: 'Hypercar',
          year: '2024',
          price: '$608,000',
          color: '#FF6F00',
          desc: 'الخليفة الشرعي لأفنتادور. أول سيارة هجينة فائقة الأداء بمحرك V12 وثلاثة محركات كهربائية.',
          highlights: ['أول وحش هجين خارق بمحرك V12', 'علبة تروس مزدوجة القابض بـ 8 سرعات', 'هيكل أحادي كربوني متكامل'],
          fields: ['6.5L V12 + 3 E-Motors', '1015 حصان', '807 نيوتن متر', '0–100 في 2.5ث'],
          extras: [
            { label: 'السرعة القصوى', value: '350 كم/س' },
            { label: 'الوزن', value: '1,775 كغ' },
            { label: 'وضع القيادة', value: '13 وضع قياسي' },
          ],
          barValue: 98,
          tags: ['V12', 'Hybrid', 'AWD'],
        }
      ]
    },
    {
      id: 'rolls_royce',
      name: 'Rolls-Royce',
      origin: 'بريطانيا',
      founded: '1906',
      logo: 'RR',
      desc: 'الملك غير المتوج لعالم السيارات الفاخرة.',
      models: [
        {
          id: 'phantom8',
          name: 'Phantom VIII',
          type: 'Ultra-Luxury Sedan',
          year: '2024',
          price: '$460,000',
          color: '#3E2723',
          desc: 'قمة الفخامة المطلقة والهدوء التام. واحة متحركة تعزل ركابها تماماً عن ضوضاء العالم الخارجي.',
          highlights: ['نظام تعليق هوائي يقرأ الطريق بالكاميرات', 'سقف مرصع بالألياف الضوئية يحاكي النجوم', 'صوت عزل مطلق أشبه بغرفة صامتة'],
          fields: ['6.75L Twin-Turbo V12', '563 حصان', '900 نيوتن متر', '0–100 في 5.3ث'],
          extras: [
            { label: 'السرعة القصوى', value: '250 كم/س' },
            { label: 'الوزن', value: '2,560 كغ' },
            { label: 'نوع العجلات', value: '22-inch Silent' },
          ],
          barValue: 99,
          tags: ['V12', 'Luxury', 'Sovereign'],
        }
      ]
    }
  ],

  perfumes: [
    {
      id: 'creed',
      name: 'Creed',
      origin: 'فرنسا / لندن',
      founded: '1760',
      logo: 'C',
      desc: 'عطر الملوك والأرستقراطية منذ ثلاثة قرون.',
      models: [
        {
          id: 'aventus',
          name: 'Aventus',
          type: 'Woody Aromatic',
          year: '2010',
          price: '$495 / 50ml',
          color: '#D4A5C9',
          desc: 'الأسطورة الحية. يجسد انتصار نابليون. الأكثر نقاشاً عبر الإنترنت — يختلف من جلد لآخر ومن دفعة لأخرى.',
          highlights: [
            'بتولا مدخّنة تميّزه فوراً',
            'قاعدة المسك والعنبر والعود',
            'ظاهرة ثقافية عالمية',
          ],
          fields: ['برغموت، أناناس، تفاح', 'بتولا مدخّنة وورد', 'مسك، عنبر، عود', 'Woody Chypre'],
          extras: [
            { label: 'الديمومة', value: '12–14 ساعة' },
            { label: 'الانتشار', value: 'قوي جداً' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 90,
          tags: ['Masculine', 'Iconic', 'Projection'],
        },
        {
          id: 'virgin',
          name: 'Virgin Island Water',
          type: 'Tropical Fresh',
          year: '2007',
          price: '$410 / 50ml',
          color: '#7EC8E3',
          desc: 'رحلة إلى جزر العذراء في زجاجة. الرم الحقيقي واللايم والجوز — إجازة حرفية على جلدك.',
          highlights: ['رم حقيقي في التركيبة', 'مثالي لفصل الصيف', 'يُفاجئ من يتوقع كريد تقليدياً'],
          fields: ['ليمون، رم، جوز هند', 'زنجبيل وخيزران', 'مسك أبيض', 'Aquatic Tropical'],
          extras: [
            { label: 'الديمومة', value: '8–10 ساعات' },
            { label: 'الانتشار', value: 'معتدل' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 70,
          tags: ['Unisex', 'Beach', 'Summer'],
        },
        {
          id: 'git',
          name: 'Green Irish Tweed',
          type: 'Fougere Fresh',
          year: '1985',
          price: '$430 / 50ml',
          color: '#4A9B7F',
          desc: 'الجد الشرعي لكول ووتر وكل عطر أخضر طازج عرفه العالم. الأصل قبل النسخ.',
          highlights: [
            'صدر عام 1985 — قبل كل المنافسين',
            'ملهم لجيل كامل من العطور',
            'بساطة الملوك الحقيقيين',
          ],
          fields: ['ليمون أخضر وعنبر', 'زنبق الوادي وحشيش', 'خشب الصندل', 'Fougere Aromatic'],
          extras: [
            { label: 'الديمومة', value: '10–12 ساعة' },
            { label: 'الانتشار', value: 'معتدل' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 80,
          tags: ['Masculine', 'Classic', 'GOAT'],
        },
      ],
    },
    {
      id: 'mfk',
      name: 'Maison Francis Kurkdjian',
      origin: 'فرنسا',
      founded: '2009',
      logo: 'MFK',
      desc: 'العطّار الذي أعاد تعريف الفخامة الفرنسية الحديثة.',
      models: [
        {
          id: 'br540',
          name: 'Baccarat Rouge 540',
          type: 'Floral Woody Musky',
          year: '2015',
          price: '$335 / 70ml',
          color: '#E8B4A0',
          desc: 'الظاهرة العالمية. زعفران خشبي محمّص مع خيط من العود والمسك. لم يُمل أحد حتى الآن.',
          highlights: [
            'الأكثر مبيعاً في الفئة الراقية',
            'يُستشعر قبل دخول صاحبه',
            'أثار موجة تقليد عالمية',
          ],
          fields: ['زعفران وجريب فروت', 'ياسمين مصري وعود', 'أرز ومسك', 'Woody Floral Musky'],
          extras: [
            { label: 'الديمومة', value: '14+ ساعة' },
            { label: 'الانتشار', value: 'كثيف جداً' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 96,
          tags: ['Unisex', 'Iconic', 'Compliments'],
        },
        {
          id: 'oudsm',
          name: 'Oud Satin Mood',
          type: 'Woody Oriental',
          year: '2015',
          price: '$360 / 70ml',
          color: '#8B5A6E',
          desc: 'ساتان شرقي يلامس البشرة. عود ناعم محتضن بالورد والبنفسج — فخامة هادئة وحميمة.',
          highlights: ['عود مصقول لا يُثقل', 'خيوط ورد بلغاري', 'حضور أنيق دافئ'],
          fields: ['بنفسج وفلفل', 'ورد ومستكة', 'عود وفانيليا', 'Woody Oriental'],
          extras: [
            { label: 'الديمومة', value: '12+ ساعة' },
            { label: 'الانتشار', value: 'كثيف' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 94,
          tags: ['Unisex', 'Oud', 'Cozy'],
        },
      ],
    },
    {
      id: 'lv',
      name: 'Louis Vuitton Parfums',
      origin: 'فرنسا',
      founded: '1854',
      logo: 'LV',
      desc: 'فن العطر من أعظم دور الأزياء الباريسية.',
      models: [
        {
          id: 'ombre',
          name: 'Ombré Nomade',
          type: 'Woody Oud',
          year: '2018',
          price: '$520 / 50ml',
          color: '#8B4513',
          desc: 'رحلة البدوي عبر الصحراء والغابات. عود لاوسي نادر مُوازَن بالخشب ونسمة من الورد والبنفسج.',
          highlights: [
            'عود لاوسي من أندر الأنواع',
            'كثافة استثنائية لا تذوب',
            'مستوحى من ترحال البدو',
          ],
          fields: ['برتقال وبنفسج', 'ورد وخشب لاوس', 'عود ومسك', 'Woody Oriental'],
          extras: [
            { label: 'الديمومة', value: '14+ ساعة' },
            { label: 'الانتشار', value: 'كثيف' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 95,
          tags: ['Unisex', 'Oud', 'Statement'],
        },
        {
          id: 'imagination',
          name: 'Imagination',
          type: 'Fresh Citrus',
          year: '2021',
          price: '$320 / 100ml',
          color: '#4DD0E1',
          desc: 'أيقونة الإبداع والانتعاش من لويس فويتون. عطر نضر يجمع بين الحمضيات الإيطالية والشاي الأسود.',
          highlights: ['أفضل عطور الصيف والانتعاش حالياً', 'نوتات الشاي الأسود المدخن بنعومة', 'نقاء متناهي ومكونات طبيعية'],
          fields: ['البرغموت، البرتقال المر', 'الشاي الأسود، القرفة', 'الأمبروكسان، البخور', 'Citrus Aquatic'],
          extras: [
            { label: 'الديمومة', value: '10–12 ساعة' },
            { label: 'الانتشار', value: 'قوي وراقي' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 91,
          tags: ['Summer', 'Citrus', 'Clean'],
        }
      ],
    },
    {
      id: 'amouage',
      name: 'Amouage',
      origin: 'عُمان',
      founded: '1983',
      logo: 'A',
      desc: 'هدية الملوك وسحر الشرق الأصيل وفخامته المعاصرة.',
      models: [
        {
          id: 'interlude',
          name: 'Interlude Man',
          type: 'Spicy Amber',
          year: '2012',
          price: '$360 / 100ml',
          color: '#1E3A8A',
          desc: 'الوحش الأزرق. عطر ذو طابع دخاني شرقي مهيب، يجمع بين البخور اللبان والجلود والأخشاب بروعة.',
          highlights: ['اللبان العماني الفاخر بتركيز عالٍ', 'عطر ذو هيبة وحضور طاغٍ لا ينسى', 'قوة ديمومة خيالية تتجاوز الأيام'],
          fields: ['الأوريغانو، الفلفل، البرغموت', 'البخور، العنبر، الأوبوبوناكس', 'الجلود، العود، الباتشولي', 'Amber Woody'],
          extras: [
            { label: 'الديمومة', value: '24+ ساعة' },
            { label: 'الانتشار', value: 'وحشي' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 98,
          tags: ['Beast-Mode', 'Incense', 'Royal'],
        },
        {
          id: 'reflection',
          name: 'Reflection Man',
          type: 'Floral Woody',
          year: '2007',
          price: '$360 / 100ml',
          color: '#E0E0E0',
          desc: 'انعكاس النقاء والرجولة العصرية الهادئة. مزيج زهري خشبي ناعم وساحر يمنح شعوراً رائعاً.',
          highlights: ['نوتة زهر البرتقال والياسمين المصقولة', 'عطر رجالي زهري غاية في الأناقة', 'محبوب جداً للمناسبات الرسمية واليومية'],
          fields: ['إكليل الجبل، الفلفل الحلو', 'الياسمين، زهر البرتقال', 'خشب الصندل، الباتشولي', 'Woody Floral'],
          extras: [
            { label: 'الديمومة', value: '8–10 ساعات' },
            { label: 'الانتشار', value: 'ممتاز وناعم' },
            { label: 'التركيز', value: 'EDP' },
          ],
          barValue: 87,
          tags: ['Elegant', 'Floral', 'Fresh'],
        }
      ]
    },
    {
      id: 'tomford',
      name: 'Tom Ford Beauty',
      origin: 'الولايات المتحدة',
      founded: '2005',
      logo: 'TF',
      desc: 'العطور الفاخرة التي تفيض جاذبية وجرأة وتفرداً.',
      models: [
        {
          id: 'tobaccovanille',
          name: 'Tobacco Vanille',
          type: 'Warm Spicy',
          year: '2007',
          price: '$295 / 50ml',
          color: '#4E342E',
          desc: 'تحفة توم فورد التي أعادت تعريف عطور التبغ والحلويات الفاخرة. مزيج غني ودافئ كليالٍ شتوية.',
          highlights: ['أوراق التبغ الإنجليزية الفاخرة', 'فانيليا غنية وكاكاو دافئ ولذيذ', 'مثالي للأجواء الباردة والمناسبات الفخمة'],
          fields: ['أوراق التبغ، التوابل', 'الفانيليا، الكاكاو، زهرة التبغ', 'الفواكه المجففة، الأخشاب', 'Amber Spicy'],
          extras: [
            { label: 'الديمومة', value: '12–15 ساعة' },
            { label: 'الانتشار', value: 'قوي جداً' },
            { label: 'التركيز', value: 'Eau de Parfum' },
          ],
          barValue: 93,
          tags: ['Winter', 'Tobacco', 'Sweet'],
        },
        {
          id: 'oudwood',
          name: 'Oud Wood',
          type: 'Woody Amber',
          year: '2007',
          price: '$295 / 50ml',
          color: '#212121',
          desc: 'العطر الذي أدخل ثقافة العود والشرق إلى عطور النيش الغربية بأسلوب راقٍ وغامض.',
          highlights: ['العود المدخن اللطيف غير الحاد', 'خشب الصندل والسموكي الراقي', 'عطر رسمي وجذاب بلا حدود'],
          fields: ['الهيل، فلفل سيتشوان', 'العود، خشب الصندل، نجيل الهند', 'الفانيليا، العنبر، التونكا', 'Woody Oud'],
          extras: [
            { label: 'الديمومة', value: '8–10 ساعات' },
            { label: 'الانتشار', value: 'معتدل فخم' },
            { label: 'التركيز', value: 'Eau de Parfum' },
          ],
          barValue: 85,
          tags: ['Oud', 'Classic', 'Signature'],
        }
      ]
    },
    {
      id: 'roja',
      name: 'Roja Parfums',
      origin: 'بريطانيا',
      founded: '2011',
      logo: 'R',
      desc: 'أفخم العطور في العالم من العطار الأسطوري روجا دوف.',
      models: [
        {
          id: 'elysium',
          name: 'Elysium Pour Homme',
          type: 'Fresh Citrus',
          year: '2017',
          price: '$315 / 100ml',
          color: '#1565C0',
          desc: 'العطر السماوي الفاخر. توليفة منعشة تفوق الوصف تجمع الحمضيات الغنية والروائح العشبية.',
          highlights: ['مكونات طبيعية بالغة النقاء والندرة', 'عطر منعش ذو طابع نيش فريد', 'قاعدة عنبرية مسكية تضفي فخامة إضافية'],
          fields: ['الجريب فروت، الليمون، الزعتر', 'التفاح، الياسمين، الفلفل الوردي', 'العنبر، الجلود، الأرز، العود', 'Citrus Fougere'],
          extras: [
            { label: 'الديمومة', value: '8–10 ساعات' },
            { label: 'الانتشار', value: 'رائع وراقي' },
            { label: 'التركيز', value: 'Parfum Cologne' },
          ],
          barValue: 89,
          tags: ['Fresh', 'Niche', 'Compliment-Magnet'],
        }
      ]
    }
  ],

  watches: [
    {
      id: 'patek',
      name: 'Patek Philippe',
      origin: 'جنيف، سويسرا',
      founded: '1839',
      logo: 'PP',
      desc: 'لا تملك باتيك — أنت تحفظها للجيل القادم.',
      models: [
        {
          id: 'naut',
          name: 'Nautilus 5711/1A',
          type: 'Integrated Bracelet',
          year: '1976',
          price: '+$150,000',
          color: '#4A9B7F',
          desc: 'جيرالد جنتا والساعة التي غيّرت الفولاذ إلى فخامة. الأندر والأغلى من الفولاذ في التاريخ.',
          highlights: [
            'أوقفت إنتاجها 2021 فارتفع سعرها',
            'نسيج الأوجانو الأيقوني',
            'الحلم المستحيل للمجمعين',
          ],
          fields: ['Calibre 26-330 S C', 'أوتوماتيك', '±2 ث/يوم', '120 متر'],
          extras: [
            { label: 'القطر', value: '40 ملم' },
            { label: 'السُمك', value: '8.3 ملم' },
            { label: 'الاحتياطي', value: '45 ساعة' },
          ],
          barValue: 99,
          tags: ['Steel', 'Iconic', 'Discontinued'],
        },
        {
          id: 'sky',
          name: 'Sky Moon Tourbillon 6002G',
          type: 'Grand Complication',
          year: '2001',
          price: '$1,200,000+',
          color: '#E0E0E0',
          desc: 'التاج المطلق. جانبان، 12 وظيفة، توربيون من الخلف، خريطة سماوية. قمة صناعة الساعات.',
          highlights: ['12 تعقيداً في ساعة واحدة', 'توربيون مزدوج', 'خريطة السماء المتحركة'],
          fields: ['Calibre R TO 27 QR SID LU CL', 'يدوي', 'كرونومتر', '30 متر'],
          extras: [
            { label: 'القطر', value: '42 ملم' },
            { label: 'وظائف', value: '12 تعقيد' },
            { label: 'المادة', value: 'بلاتينيوم' },
          ],
          barValue: 100,
          tags: ['Platinum', 'Tourbillon', 'Grand'],
        },
      ],
    },
    {
      id: 'ap',
      name: 'Audemars Piguet',
      origin: 'لو براسوس، سويسرا',
      founded: '1875',
      logo: 'AP',
      desc: 'منذ 1875 — الجرأة في التصميم، التفوق في الصناعة.',
      models: [
        {
          id: 'roo',
          name: 'Royal Oak Offshore 44',
          type: 'Sport Chronograph',
          year: '1993',
          price: '$38,000',
          color: '#1A1A2E',
          desc: 'الجرأة بأبعادها القصوى. ساعة رياضية بفولاذ متين، بيزل ثماني، حضور لا يُخطئه أحد.',
          highlights: ['بيزل ثماني أيقوني', 'حركة كرونوغراف داخلية', 'حضور رياضي قوي'],
          fields: ['Calibre 4401', 'أوتوماتيك', '±2 ث/يوم', '100 متر'],
          extras: [
            { label: 'القطر', value: '44 ملم' },
            { label: 'الاحتياطي', value: '70 ساعة' },
            { label: 'المادة', value: 'Steel/Ceramic' },
          ],
          barValue: 82,
          tags: ['Steel', 'Chrono', 'Sport'],
        },
        {
          id: 'royal_oak_15500',
          name: 'Royal Oak 15500ST',
          type: 'Sport Luxury',
          year: '2019',
          price: '$45,000',
          color: '#2196F3',
          desc: 'التصميم الكلاسيكي الخالد من جيرالد جنتا. الساعة التي حددت مفهوم الساعات الرياضية الفاخرة.',
          highlights: ['ميناء بنمط طوابع البريد "Grande Tapisserie"', 'سوار متكامل فولاذي مذهل هندسياً', 'إطار ثماني الأضلاع ببراغي مكشوفة'],
          fields: ['Calibre 4302', 'أوتوماتيك', '±2 ث/يوم', '50 متر'],
          extras: [
            { label: 'القطر', value: '41 ملم' },
            { label: 'الاحتياطي', value: '70 ساعة' },
            { label: 'المادة', value: 'Stainless Steel' },
          ],
          barValue: 94,
          tags: ['Steel', 'Tapisserie', 'Classic'],
        }
      ],
    },
    {
      id: 'rolex',
      name: 'Rolex',
      origin: 'جنيف، سويسرا',
      founded: '1905',
      logo: 'R',
      desc: 'التاج الذي عرّف الدقة الحديثة.',
      models: [
        {
          id: 'daytona',
          name: 'Daytona 116500LN',
          type: 'Sport Chronograph',
          year: '2016',
          price: '+$35,000',
          color: '#111111',
          desc: 'كرونوغراف السباق الأسطوري. بيزل سيراميك أسود، بسيط الشكل، صعب المنال.',
          highlights: ['بيزل Cerachrom السيراميكي', 'حركة 4130 المعيارية', 'قائمة انتظار سنوات'],
          fields: ['Calibre 4130', 'أوتوماتيك', '±2 ث/يوم', '100 متر'],
          extras: [
            { label: 'القطر', value: '40 ملم' },
            { label: 'الاحتياطي', value: '72 ساعة' },
            { label: 'المادة', value: '904L Steel' },
          ],
          barValue: 92,
          tags: ['Steel', 'Chrono', 'Icon'],
        },
        {
          id: 'sub',
          name: 'Submariner Date 126610LV',
          type: 'Dive Watch',
          year: '2020',
          price: '$10,800',
          color: '#2D6A4F',
          desc: 'ساعة الغوص التي أصبحت معياراً عالمياً. بيزل أخضر، إطار 41 ملم، إرث ستة عقود.',
          highlights: ['بيزل سيراميك أخضر', 'مقاومة 300 متر', 'الكلاسيكي الذي لا يُخطئ'],
          fields: ['Calibre 3235', 'أوتوماتيك', '±2 ث/يوم', '300 متر'],
          extras: [
            { label: 'القطر', value: '41 ملم' },
            { label: 'الاحتياطي', value: '70 ساعة' },
            { label: 'البيزل', value: 'Cerachrom أخضر' },
          ],
          barValue: 88,
          tags: ['Steel', 'Diver', 'Hulk'],
        },
      ],
    },
    {
      id: 'vacheron',
      name: 'Vacheron Constantin',
      origin: 'جنيف، سويسرا',
      founded: '1755',
      logo: 'VC',
      desc: 'أقدم صانع ساعات مستمر في العالم بلا انقطاع.',
      models: [
        {
          id: 'overseas',
          name: 'Overseas Dual Time',
          type: 'Travel Luxury',
          year: '2023',
          price: '$28,000',
          color: '#0D47A1',
          desc: 'رفيق السفر الفاخر. تصميم رائع يحاكي شعار "صليب مالطا" مع نظام تبديل أحزمة سريع وسهل.',
          highlights: ['صليب مالطا الأيقوني مدمج في التصميم', 'تأتي مع أحزمة فولاذ، مطاط وجلد', 'وظيفة عرض التوقيت المزدوج بدقة متناهية'],
          fields: ['Calibre 5110 DT', 'أوتوماتيك', '±2 ث/يوم', '150 متر'],
          extras: [
            { label: 'القطر', value: '41 ملم' },
            { label: 'الاحتياطي', value: '60 ساعة' },
            { label: 'نظام الأحزمة', value: 'ثلاث أحزمة مجانية' },
          ],
          barValue: 95,
          tags: ['Travel', 'MalteseCross', 'Versatile'],
        }
      ]
    },
    {
      id: 'richardmille',
      name: 'Richard Mille',
      origin: 'سويسرا',
      founded: '2001',
      logo: 'RM',
      desc: 'آلات سباق للمعصم — قمة الهندسة والابتكار العصري.',
      models: [
        {
          id: 'rm1103',
          name: 'RM 11-03 McLaren',
          type: 'Avant-Garde Chrono',
          year: '2018',
          price: '$350,000',
          color: '#E65100',
          desc: 'ساعة مصممة بالتعاون مع ماكلارين للسيارات الرياضية. هيكل مصنوع من التيتانيوم والكربون المتطور جداً.',
          highlights: ['مستوحاة من تصاميم سيارات ماكلارين الفاخرة', 'هيكل كربوني فائق الصلابة ومقاوم للصدمات', 'حركة هيكلية مكشوفة تفوق الوصف'],
          fields: ['RMAC3 Flyback', 'أوتوماتيك', 'كرونومتر', '50 متر'],
          extras: [
            { label: 'الأبعاد', value: '50 x 44 ملم' },
            { label: 'الوزن', value: 'خفيف جداً' },
            { label: 'المادة', value: 'Carbon TPT' },
          ],
          barValue: 97,
          tags: ['McLaren', 'CarbonTPT', 'Futuristic'],
        }
      ]
    },
    {
      id: 'lange_sohne',
      name: 'A. Lange & Söhne',
      origin: 'ألمانيا',
      founded: '1845',
      logo: 'ALS',
      desc: 'الدقة الجرمانية والأناقة الساكسونية في أبهى صورها.',
      models: [
        {
          id: 'lange1',
          name: 'Lange 1 White Gold',
          type: 'Dress Watch',
          year: '2024',
          price: '$42,000',
          color: '#ECEFF1',
          desc: 'الساعة الأيقونية التي أعادت إحياء صناعة الساعات الألمانية بعد سقوط جدار برلين. ميناء غير متماثل فريد.',
          highlights: ['نافذة التاريخ الثنائية المستوحاة من دار أوبرا درسدن', 'تشطيب يدوي مذهل لجسور الفضة الألمانية', 'توازن هندسي مثالي حائز على براءة اختراع'],
          fields: ['Calibre L121.1', 'يدوي', 'دقة مذهلة', '30 متر'],
          extras: [
            { label: 'القطر', value: '38.5 ملم' },
            { label: 'الاحتياطي', value: '72 ساعة' },
            { label: 'المادة', value: 'White Gold' },
          ],
          barValue: 98,
          tags: ['German', 'Asymmetrical', 'Dress'],
        }
      ]
    }
  ],

  fashion: [
    {
      id: 'loro',
      name: 'Loro Piana',
      origin: 'إيطاليا',
      founded: '1924',
      logo: 'LP',
      desc: 'أرقى الألياف الطبيعية في العالم — الڤيكونيا والكشمير الرضيع.',
      models: [
        {
          id: 'vicuna',
          name: 'معطف الڤيكونيا',
          type: 'Ultra-Luxury Outerwear',
          year: '2024',
          price: '$18,000–$60,000',
          color: '#C9A87E',
          desc: 'ألياف الڤيكونيا الأندر في العالم. ناعمة كالحرير، دافئة كالنار، خفيفة كالنسيم.',
          highlights: [
            '12 ميكرون — الأنعم في الطبيعة',
            'حصاد كل ثلاث سنوات من حيوان واحد',
            'ست أشهر من العمل اليدوي',
          ],
          fields: ['100% ألياف الڤيكونيا', 'يدوي 6 أشهر', 'بيرو / إيطاليا', '6 أشهر'],
          extras: [
            { label: 'النعومة', value: '12 ميكرون' },
            { label: 'الإنتاج السنوي', value: 'محدود' },
            { label: 'المنشأ', value: 'Andes — Peru' },
          ],
          barValue: 99,
          tags: ['Vicuña', 'Bespoke', 'Rare'],
        },
        {
          id: 'babycash',
          name: 'كنزة Baby Cashmere',
          type: 'Knitwear',
          year: '2024',
          price: '$2,800–$5,500',
          color: '#D4C5A9',
          desc: 'كشمير من ماعز الـHircus الرضيع — أنعم 80 غراماً تنتجها العنزة في حياتها الأولى.',
          highlights: [
            '80 غم فقط لكل عنزة سنوياً',
            '13.5 ميكرون من النعومة',
            'دفء استثنائي بوزن خفيف',
          ],
          fields: ['100% Baby Cashmere', 'حياكة إيطالية', 'منغوليا / إيطاليا', '3 أشهر'],
          extras: [
            { label: 'النعومة', value: '13.5 ميكرون' },
            { label: 'العمر', value: 'أول سنة فقط' },
            { label: 'المنشأ', value: 'Mongolia' },
          ],
          barValue: 96,
          tags: ['Cashmere', 'Knit', 'Rare'],
        },
      ],
    },
    {
      id: 'hermes',
      name: 'Hermès',
      origin: 'باريس، فرنسا',
      founded: '1837',
      logo: 'H',
      desc: 'بيت السرج الذي أصبح إمبراطورية الفخامة الفرنسية.',
      models: [
        {
          id: 'birkin',
          name: 'Birkin 25 Togo',
          type: 'Iconic Handbag',
          year: '1984',
          price: '$12,000–$500,000+',
          color: '#BF5E3B',
          desc: 'الحقيبة الأسطورة. حرفي واحد، 18 ساعة عمل، قائمة انتظار سنوات. أداة فخامة عابرة للأجيال.',
          highlights: [
            'حرفي فرنسي واحد لكل قطعة',
            '18 ساعة من الخياطة اليدوية',
            'تتفوق على الذهب كاستثمار',
          ],
          fields: ['جلد Togo عجل فرنسي', 'يدوي بالكامل', 'فرنسا', '18 ساعة'],
          extras: [
            { label: 'الحرفي', value: 'فرد واحد' },
            { label: 'الحجم', value: '25 سم' },
            { label: 'المنشأ', value: 'France' },
          ],
          barValue: 97,
          tags: ['Birkin', 'Iconic', 'Investment'],
        },
        {
          id: 'kelly',
          name: 'Kelly 32 Retourné',
          type: 'Structured Bag',
          year: '1956',
          price: '$10,000–$400,000+',
          color: '#1C3A5E',
          desc: 'حقيبة الأميرة جريس كيلي. أناقة بنيوية، خطوط هندسية، إرث ملكي على الكتف.',
          highlights: ['سُميّت تكريماً للأميرة كيلي', 'بنية محكمة بقفل ذهبي', 'خياطة سرج تقليدية'],
          fields: ['جلد Togo / Epsom', 'يدوي بالكامل', 'فرنسا', '20+ ساعة'],
          extras: [
            { label: 'الحرفي', value: 'فرد واحد' },
            { label: 'الحجم', value: '32 سم' },
            { label: 'المنشأ', value: 'France' },
          ],
          barValue: 95,
          tags: ['Kelly', 'Iconic', 'Royal'],
        },
      ],
    },
    {
      id: 'brioni',
      name: 'Brioni',
      origin: 'روما، إيطاليا',
      founded: '1945',
      logo: 'B',
      desc: 'بدلة الرجل الحر — مفصّلة بدقة الفنانين الرومان.',
      models: [
        {
          id: 'vanquish',
          name: 'Vanquish II Bespoke',
          type: 'Bespoke Suit',
          year: '2024',
          price: '$15,000–$65,000',
          color: '#2C3E50',
          desc: 'بدلة بيسبوك من أنعم الأقمشة في العالم. كل غرزة بيد فنان، كل خط بقياس الجسد.',
          highlights: [
            "قماش Super 250's–300's",
            '120+ ساعة من العمل اليدوي',
            'تفصيل من قياس الجسد مباشرة',
          ],
          fields: ["Super 250's–300's", 'بيسبوك يدوي', 'إيطاليا', '8–12 أسبوعاً'],
          extras: [
            { label: 'ساعات العمل', value: '120+ ساعة' },
            { label: 'القياسات', value: '30+ نقطة' },
            { label: 'المنشأ', value: 'Italy' },
          ],
          barValue: 100,
          tags: ['Bespoke', 'Wool', 'Tailored'],
        },
      ],
    },
    {
      id: 'brunello',
      name: 'Brunello Cucinelli',
      origin: 'سولوميو، إيطاليا',
      founded: '1978',
      logo: 'BC',
      desc: 'ملك الكشمير الإيطالي وفلسفة الفخامة الإنسانية الهادئة.',
      models: [
        {
          id: 'cashmere_vest',
          name: 'سترة الكشمير المبطنة',
          type: 'Luxury Outerwear',
          year: '2024',
          price: '$3,800',
          color: '#D7CCC8',
          desc: 'سترة كلاسيكية تدمج بين الحماية من الطقس ونعومة الكشمير الإيطالي الفاخر من جبال أمبريا.',
          highlights: ['كشمير معالج ومقاوم للمطر والرياح', 'تبطين حراري خفيف وعالي الكفاءة', 'لمسات جلدية وقرنية يدوية'],
          fields: ['كشمير وحرير ناعم', 'صناعة يدوية إيطالية', 'إيطاليا', 'شهر ونصف'],
          extras: [
            { label: 'المواد الأساسية', value: '92% كشمير 8% حرير' },
            { label: 'التبطين', value: 'أوز حراري فاخر' },
            { label: 'التشطيب', value: 'يدوي بالكامل' },
          ],
          barValue: 94,
          tags: ['QuietLuxury', 'Cashmere', 'Umbria'],
        },
        {
          id: 'suede_loafers',
          name: 'حذاء السويدي الفاخر',
          type: 'Luxury Footwear',
          year: '2024',
          price: '$1,200',
          color: '#8D6E63',
          desc: 'حذاء كاجوال راقٍ ومريح للغاية، مصنوع من جلد السويدي الإيطالي فائق النعومة والمقاوم للماء والخدوش.',
          highlights: ['جلد سويدي منتقى بعناية بالغة', 'نعل مرن ومريح للمشي الطويل واليومي', 'شريط يدوي محاك بخيوط حريرية متينة'],
          fields: ['جلد سويدي فاخر وحرير', 'خياطة يدوية متقنة', 'سولوميو، إيطاليا', 'شهر واحد'],
          extras: [
            { label: 'المنشأ والورش', value: 'Solomeo Atelier' },
            { label: 'مقاومة الماء', value: 'معالج مسبقاً' },
            { label: 'النعل والبطانة', value: 'جلد طبيعي مرن' },
          ],
          barValue: 92,
          tags: ['Footwear', 'Suede', 'Handcrafted'],
        }
      ]
    },
    {
      id: 'chanel_fashion',
      name: 'Chanel',
      origin: 'باريس، فرنسا',
      founded: '1910',
      logo: 'CH',
      desc: 'الدار التي غيرت أزياء المرأة إلى الأبد بالتويد والقصات الثورية.',
      models: [
        {
          id: 'tweed_jacket',
          name: 'بدلة التويد الكلاسيكية',
          type: 'Haute Couture',
          year: '2024',
          price: '$8,500',
          color: '#E0F7FA',
          desc: 'التوقيع الخالد لـ كوكو شانيل. جاكيت تويد منسوج يدوياً يحاكي الرقي والجمال الباريسي في كل غرزة.',
          highlights: ['نسيج التويد الخاص الذي تم تطويره في فرنسا', 'أزرار معدنية فريدة محفورة بشعار الدار باليد', 'قصة دقيقة للغاية تمنح حرية حركة مثالية'],
          fields: ['نسيج تويد صوفي فاخر', 'حياكة يدوية باريسية', 'فرنسا', '4 أشهر'],
          extras: [
            { label: 'ساعات الحياكة', value: '80+ ساعة' },
            { label: 'البطانة الداخلية', value: '100% حرير طبيعي' },
            { label: 'موقع الإنتاج', value: 'Rue Cambon - Paris' },
          ],
          barValue: 97,
          tags: ['Tweed', 'Couture', 'Coco'],
        },
        {
          id: 'bag_2_55',
          name: 'حقيبة Chanel 2.55',
          type: 'Iconic Accessory',
          year: '1955',
          price: '$10,200',
          color: '#000000',
          desc: 'أول حقيبة يد مزودة بحزام كتف معدني في التاريخ. رمز الاستقلال والأناقة العملية التي لا تشيخ.',
          highlights: ['قفل مستطيل يسمى قفل الآنسة الأسطوري', 'مبطنة بجلد العجل باللون العنابي الكلاسيكي', 'سلسلة معدنية منسوجة يدوياً'],
          fields: ['جلد عجل مبطن مدبوغ', 'خياطة يدوية فرنسية', 'فرنسا', '3 أشهر'],
          extras: [
            { label: 'المهندس المصمم', value: 'Coco Chanel' },
            { label: 'تاريخ الإطلاق', value: 'فبراير 1955' },
            { label: 'نوع الجلد', value: 'Aged Calfskin' },
          ],
          barValue: 96,
          tags: ['2.55', 'Vintage', 'CaviarLeather'],
        }
      ]
    }
  ],

  sweets: [
    {
      id: 'ph',
      name: 'Pierre Hermé',
      origin: 'باريس، فرنسا',
      founded: '1998',
      logo: 'PH',
      desc: 'بيكاسو الحلويات — كل قطعة عمل فني صالح للأكل.',
      models: [
        {
          id: 'ispahan',
          name: 'Ispahan',
          type: 'Macaron Signature',
          year: '2001',
          price: '€9 / قطعة',
          color: '#E8A0B4',
          desc: 'الورد واللتيشي وتوت العُليق — ثلاثية باريسية أصبحت توقيع بيير إرميه حول العالم.',
          highlights: [
            'توقيع بيير إرميه الأشهر',
            'ثلاثية نكهات متوازنة',
            '3 أيام من التحضير الدقيق',
          ],
          fields: ['ورد، لتيشي، توت', 'ماكرون باللوز', 'كريمة ورد ولتيشي', '3 أيام'],
          extras: [
            { label: 'الصلاحية', value: '3 أيام' },
            { label: 'الحفظ', value: '4–6°C' },
            { label: 'الوزن', value: '≈35 غم' },
          ],
          barValue: 97,
          tags: ['Macaron', 'Rose', 'Signature'],
        },
        {
          id: 'mogador',
          name: 'Mogador Tarte',
          type: 'Signature Tarte',
          year: '2005',
          price: '€85',
          color: '#F4A460',
          desc: 'باشن فروت وشوكولاتة حليب — حلاوة استوائية تُكمل غناشيه فالرونا الناعم.',
          highlights: ['غاناش Valrhona فاخر', 'توازن حمض الباشن', 'قاعدة Paris-Brest'],
          fields: ['باشن فروت وشوكولاتة 40%', 'Paris-Brest', 'غاناش Valrhona', 'يومان'],
          extras: [
            { label: 'الصلاحية', value: 'يومان' },
            { label: 'الحفظ', value: '4°C' },
            { label: 'حصص', value: '6–8 أفراد' },
          ],
          barValue: 94,
          tags: ['Tarte', 'Passion', 'Valrhona'],
        },
        {
          id: 'citron',
          name: 'Tarte Citron Infiniment',
          type: 'Citrus Tarte',
          year: '2008',
          price: '€75',
          color: '#F4D03F',
          desc: 'ليمون بروفانس بكل دفئه. حمضي مشرق على قاعدة مقرمشة مع مارينغ إيطالي محروق.',
          highlights: ['ليمون بروفانس طازج', 'مارينغ إيطالي محروق', 'توازن حامض/حلو مثالي'],
          fields: ['ليمون، بيض، زبدة', 'Sablé Breton', 'كريمة ليمون', 'يومان'],
          extras: [
            { label: 'الصلاحية', value: 'يومان' },
            { label: 'الحفظ', value: '4°C' },
            { label: 'حصص', value: '6–8 أفراد' },
          ],
          barValue: 90,
          tags: ['Tarte', 'Citron', 'Provence'],
        },
      ],
    },
    {
      id: 'valrhona',
      name: 'Valrhona',
      origin: 'فرنسا',
      founded: '1922',
      logo: 'V',
      desc: 'بيت الشوكولاتة الذي يصنع لأفضل شيفات العالم منذ قرن.',
      models: [
        {
          id: 'guanaja',
          name: 'Guanaja 70%',
          type: 'Grand Cru Dark',
          year: '1986',
          price: '€25 / 250g',
          color: '#3D1A00',
          desc: '70% كاكاو من ترينيداد والكاريبي. مرارة عميقة، أرومات حمضية، نهاية طويلة.',
          highlights: ['كاكاو Trinitario كاريبي', 'تخمير 10 أيام', '70% — التوازن الكلاسيكي'],
          fields: ['كاكاو 70%', 'كاكاو خالص', '—', 'تخمير 10 أيام'],
          extras: [
            { label: 'الأصل', value: 'Trinidad / Caribbean' },
            { label: 'الصلاحية', value: '12 شهر' },
            { label: 'الحفظ', value: '16–18°C' },
          ],
          barValue: 82,
          tags: ['Dark', '70%', 'Grand Cru'],
        },
        {
          id: 'dulcey',
          name: 'Dulcey Blond 32%',
          type: 'Blonde Chocolate',
          year: '2012',
          price: '€22 / 250g',
          color: '#D4A017',
          desc: 'شوكولاتة شقراء بنكهة الكراميل والبسكويت والفانيليا — اختراع فالرونا الذي غيّر السوق.',
          highlights: [
            'أول شوكولاتة شقراء عالمياً',
            'كراميل وبسكويت طبيعي',
            '32% كاكاو لطف لا يُقاوم',
          ],
          fields: ['كاكاو 32%', 'حليب وزبدة كاكاو', '—', 'خبز طويل'],
          extras: [
            { label: 'النكهة', value: 'كراميل / بسكويت' },
            { label: 'الصلاحية', value: '12 شهر' },
            { label: 'الحفظ', value: '16–18°C' },
          ],
          barValue: 98,
          tags: ['Blonde', '32%', 'Iconic'],
        },
      ],
    },
    {
      id: 'laduree',
      name: 'Ladurée',
      origin: 'باريس، فرنسا',
      founded: '1862',
      logo: 'L',
      desc: 'مخترع الماكرون المزدوج والجمال الكلاسيكي الباريسي الراقي.',
      models: [
        {
          id: 'macaron_box',
          name: 'علبة ماكرون الملوك',
          type: 'Luxury Gift Box',
          year: '2024',
          price: '€45 / 12 قطعة',
          color: '#E1BEE7',
          desc: 'مجموعة منتقاة من الماكرون الباريسي الفاخر المزين بأوراق الذهب عيار 24 والنكهات النادرة.',
          highlights: ['أوراق الذهب الصالحة للأكل عيار 24', 'مستخلص الفانيليا من جزر تاهيتي النادرة', 'علبة كرتونية مخملية فاخرة'],
          fields: ['فانيليا تاهيتي، فستق حلبي', 'قشرة لوز ناعمة', 'كريمة فانيليا وغناش', '3 أيام'],
          extras: [
            { label: 'عدد القطع', value: '12 قطعة فاخرة' },
            { label: 'نكهات بارزة', value: 'فستق حلبي، فانيليا' },
            { label: 'الصلاحية والحرارة', value: '3 أيام في 4°C' },
          ],
          barValue: 95,
          tags: ['Ladurée', 'TahitiVanilla', 'ParisianClassic'],
        },
        {
          id: 'marie_antoinette',
          name: 'تارت ماري أنطوانيت',
          type: 'Royal Cake',
          year: '2024',
          price: '€18 / قطعة',
          color: '#F8BBD0',
          desc: 'حلوى ملكية ساحرة بنكهة الشاي الأسود والزهور والفواكه المجففة اللذيذة.',
          highlights: ['شاي ماري أنطوانيت المعطر الحصري', 'ورد بري طازج للتزيين الجمالي', 'قوام كريمي مخملي ناعم للغاية'],
          fields: ['شاي معطر، فواكه برية', 'عجينة الغريبة الهشة', 'موس الشاي المعطر والكرز', '3 أيام'],
          extras: [
            { label: 'النوع', value: 'موس وتارت ملكي' },
            { label: 'العناصر الرئيسية', value: 'توت أزرق، ورد بري' },
            { label: 'الصلاحية والحرارة', value: 'يومان في 4°C' },
          ],
          barValue: 93,
          tags: ['Royal', 'MarieAntoinette', 'RoseTea'],
        }
      ]
    },
    {
      id: 'armani_dolci',
      name: 'Armani / Dolci',
      origin: 'ميلانو، إيطاليا',
      founded: '2002',
      logo: 'AD',
      desc: 'شوكولاتة وحلويات مصممة بأسلوب الأناقة البسيطة من جورجيو أرماني.',
      models: [
        {
          id: 'armani_pralines',
          name: 'شوكولاتة برالين الفاخرة',
          type: 'Designer Chocolate',
          year: '2024',
          price: '€65 / 16 قطعة',
          color: '#FFE082',
          desc: 'قطع الشوكولاتة ذات الأشكال الهندسية المثالية المصممة والمصنوعة يدوياً في إيطاليا بتركيز الكاكاو الفاخر.',
          highlights: ['تصميم مربع هندسي مثالي يعكس فلسفة أرماني', 'كاكاو من مزارع مستدامة وحصرية في فنزويلا', 'علب مخملية مغلفة بشرائط برونزية فاخرة'],
          fields: ['كاكاو فنزويلي 60-85%', 'قالب شوكولاتة هندسي', 'بندق بييمونتي المقرمش', 'تخمير 7 أيام'],
          extras: [
            { label: 'الإنتاج', value: 'يدوي في ميلانو' },
            { label: 'الوزن الكلي', value: '250 غرام' },
            { label: 'الصلاحية والحرارة', value: '6 أشهر في 16°C' },
          ],
          barValue: 94,
          tags: ['Armani', 'Pralines', 'PiemonteHazelnut'],
        }
      ]
    },
    {
      id: 'marchesi',
      name: 'Marchesi 1824',
      origin: 'ميلانو، إيطاليا',
      founded: '1824',
      logo: 'M',
      desc: 'أعرق وأفخم صانعي المعجنات والحلويات الإيطالية الكلاسيكية في ميلانو.',
      models: [
        {
          id: 'panettone_classic',
          name: 'بانتوني ميلانو الأصيل',
          type: 'Traditional Panettone',
          year: '1824',
          price: '€60 / 1kg',
          color: '#FFF59D',
          desc: 'خبز البانتوني الإيطالي التقليدي المخمر طبيعياً لمدة 48 ساعة والمزين بالزبيب والفواكه المجففة الفاخرة.',
          highlights: ['تخمير طبيعي بطيء لمدة 48 ساعة كاملة', 'فواكه مجففة مستوردة من جنوب إيطاليا', 'وصفة سرية متوارثة منذ عام 1824'],
          fields: ['خميرة برية، دقيق، بيض بلدي', 'عجينة مخمرة ببطء شديد', 'زبيب، برتقال مجفف معسل', '3 أيام'],
          extras: [
            { label: 'مدة التحضير', value: '48 ساعة تخمير' },
            { label: 'الحفظ والحرارة', value: 'درجة حرارة الغرفة' },
            { label: 'المنشأ التاريخي', value: 'Milano - Italy' },
          ],
          barValue: 98,
          tags: ['Panettone', 'Milano', 'LievitoMadre'],
        },
        {
          id: 'crostata_cioccolato',
          name: 'تارت كروستاتا بالشوكولاتة',
          type: 'Classic Italian Tart',
          year: '2024',
          price: '€45',
          color: '#8D6E63',
          desc: 'تارت كروستاتا الكلاسيكية بعجينتها المقرمشة والغنية بزبدة بروفانس ومحشوة بغاناش الكاكاو الداكن 70%.',
          highlights: ['عجينة باستا فرولا الإيطالية التقليدية', 'غاناش الشوكولاتة الغني المذوب بلطف وببطء', 'تزيين هندسي رائع بالكاكاو والذهب'],
          fields: ['زبدة، كاكاو 70%، فانيليا', 'Pasta Frolla مقرمشة', 'غاناش الشوكولاتة الداكنة', 'يومان'],
          extras: [
            { label: 'القطر والنسب', value: '22 سم - 6 حصص' },
            { label: 'الصلاحية والحرارة', value: '3 أيام في 4°C' },
            { label: 'الدهون الأساسية', value: 'زبدة بروفانس الفاخرة' },
          ],
          barValue: 92,
          tags: ['Crostata', 'Tart', 'ProvenceButter'],
        }
      ]
    }
  ],
};

// ────────────────────────── Components ──────────────────────────

export default function Knowledge() {
  const [activeCat, setActiveCat] = useState<CategoryId>('cars');
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<Model | null>(null);

  const category = useMemo(() => CATEGORIES.find((c) => c.id === activeCat)!, [activeCat]);
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
    <div className="min-h-screen bg-background pb-page px-5 pt-14">
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
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-lg mx-auto"
      >
        {/* Header — matches Theme/Prayer settings pattern */}
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground">موسوعة الرقي</h1>
          </div>
        </motion.div>

        {/* Category strip */}
        <motion.nav variants={item} className="grid grid-cols-5 gap-2" aria-label="الفئات">
          {CATEGORIES.map((c) => {
            const active = c.id === activeCat;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCategory(c.id)}
                className={`surface-depth-pressable flex flex-col items-center justify-center rounded-2xl px-1.5 py-3 transition-all ${
                  active ? 'ring-1 ring-primary/60' : ''
                }`}
                aria-pressed={active}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <span
                  className={`mt-1.5 text-[0.6875rem] font-semibold leading-tight text-center ${
                    active ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </motion.nav>

        {/* Brands OR Models — mutually exclusive to avoid double scroll */}
        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            {!activeBrand ? (
              <motion.section
                key={`brands-${activeCat}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.28, ease: [0.22, 0.9, 0.32, 1] }}
                aria-label="الماركات"
                className="space-y-3"
              >
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  الماركات
                </h2>
                <motion.div
                  className="space-y-2.5"
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.04 } } }}
                >
                  {brands.map((b) => (
                    <motion.div
                      key={b.id}
                      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.25, ease: [0.22, 0.9, 0.32, 1] }}
                    >
                      <AppCard
                        as="button"
                        pressable
                        onClick={() => setActiveBrandId(b.id)}
                        className="block w-full text-end"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-bold text-primary">
                            {b.logo}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.9375rem] font-semibold text-foreground truncate">
                              {b.name}
                            </div>
                            <div className="text-[0.6875rem] text-muted-foreground truncate">
                              {b.origin} · {b.founded}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      </AppCard>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            ) : (
              <motion.section
                key={`models-${activeBrand.id}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.28, ease: [0.22, 0.9, 0.32, 1] }}
                aria-label="الطرازات"
                className="space-y-3"
              >
                <button
                  onClick={() => setActiveBrandId(null)}
                  className="surface-depth-pressable flex items-center gap-2 rounded-2xl px-3 py-2 text-[0.75rem] text-muted-foreground"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>عودة إلى الماركات</span>
                </button>
                <div className="flex items-center gap-3 px-1">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {activeBrand.logo}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.9375rem] font-semibold text-foreground truncate">
                      {activeBrand.name}
                    </div>
                    <div className="text-[0.6875rem] text-muted-foreground truncate">
                      {activeBrand.origin} · {activeBrand.founded}
                    </div>
                  </div>
                </div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">
                  الطرازات
                </h2>
                <motion.div
                  className="space-y-2.5"
                  initial="hidden"
                  animate="show"
                  variants={{
                    show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
                  }}
                >
                  {activeBrand.models.map((m) => (
                    <motion.div
                      key={m.id}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.28, ease: [0.22, 0.9, 0.32, 1] }}
                    >
                      <AppCard
                        as="button"
                        pressable
                        onClick={() => setActiveModel(m)}
                        className="block w-full text-end"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[0.9375rem] font-semibold text-foreground">
                              {m.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] text-primary">
                                {m.type}
                              </span>
                              <span className="text-[0.625rem] text-muted-foreground">
                                {m.year} · {m.price}
                              </span>
                            </div>
                          </div>
                          <ArrowUpSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                        <p className="mt-2.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                          {m.desc}
                        </p>
                      </AppCard>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Detail dialog ── */}
      <ModelDetailDialog
        model={activeModel}
        brand={activeBrand}
        category={category}
        onClose={() => setActiveModel(null)}
      />
    </div>
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
    <Drawer
      open={model !== null}
      onOpenChange={(o: boolean) => {
        if (!o) onClose();
      }}
    >
      <DrawerContent className="max-h-[88dvh] border-border/60 bg-card text-foreground" dir="rtl">
        <VisuallyHidden>
          <DrawerTitle>{model?.name ?? 'تفاصيل'}</DrawerTitle>
        </VisuallyHidden>

        {model && (
          <div className="relative overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+6rem)]">
            {/* Header pills */}
            <div className="px-6 pt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[0.625rem] font-semibold tracking-wider text-primary">
                  {brand?.name}
                </span>
                <span className="rounded-full border border-border/60 bg-foreground/[0.04] px-2.5 py-0.5 text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                  {model.type}
                </span>
                <span className="text-[0.625rem] text-muted-foreground/80">{model.year}</span>
              </div>

              {/* Title + price */}
              <div className="space-y-1.5">
                <h3 className="text-[1.5rem] font-bold tracking-tight text-foreground leading-tight">
                  {model.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-light text-primary">{model.price}</span>
                </div>
              </div>
            </div>

            {/* Hairline divider */}
            <div className="mx-6 mt-6 h-px bg-border/60" />

            {/* Description */}
            <div className="px-6 pt-5">
              <p className="text-[0.875rem] font-light leading-loose text-muted-foreground">
                {model.desc}
              </p>
            </div>

            {/* Highlights */}
            <div className="px-6 pt-7">
              <h4 className="mb-3 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                أبرز المميزات
              </h4>
              <ul className="space-y-2.5">
                {model.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-[9px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="text-[0.8125rem] leading-relaxed text-foreground/90">{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2x2 main fields */}
            <div className="px-6 pt-7">
              <div className="grid grid-cols-2 gap-2.5">
                {category.fieldLabels.map((label, i) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border/50 bg-foreground/[0.025] p-3.5"
                  >
                    <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                      {label}
                    </div>
                    <div className="mt-1.5 text-[0.8125rem] font-medium text-foreground">
                      {model.fields[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extras */}
            <div className="px-6 pt-7">
              <h4 className="mb-3 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                تفاصيل إضافية
              </h4>
              <div className="grid grid-cols-3 gap-0 rounded-2xl border border-border/50 bg-foreground/[0.025] py-3.5">
                {model.extras.map((e, i) => (
                  <div
                    key={e.label}
                    className={`px-2 text-center ${i > 0 ? 'border-e border-border/40' : ''}`}
                  >
                    <div className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                      {e.label}
                    </div>
                    <div className="mt-1 text-[0.75rem] font-medium text-foreground">{e.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-6 pt-7">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {category.barLabel}
                </span>
                <span className="text-[0.75rem] font-semibold text-primary tabular-nums">
                  {model.barValue}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
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
                    className="rounded-lg border border-border/50 bg-foreground/[0.025] px-2.5 py-1 text-[0.625rem] font-medium tracking-wider text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
