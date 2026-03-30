import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { ChevronRight, ChevronLeft, Moon, Sunrise, Sun, BookOpen, CloudSun, SunDim, Sunset, MoonStar } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimeSection {
  titleAr: string;
  titleDe: string;
  timeRange: string;
  icon: React.ElementType;
  iconColor: string;
  items: { ar: string; de: string }[];
}

const sections: TimeSection[] = [
  {
    titleAr: 'قبل الفجر', titleDe: 'Vor dem Fajr', timeRange: '00:00 - 05:00',
    icon: Moon, iconColor: 'text-indigo-400',
    items: [
      { ar: 'يتهجد ويصلي قيام الليل في المنزل أو في المسجد', de: 'Tahajjud und Nachtgebet zu Hause oder in der Moschee' },
      { ar: 'يأخذ قيلولة قصيرة بعد التهجد', de: 'Kurzes Nickerchen nach Tahajjud' },
    ],
  },
  {
    titleAr: 'الفجر', titleDe: 'Fajr', timeRange: '05:00 - 07:00',
    icon: Sunrise, iconColor: 'text-amber-400',
    items: [
      { ar: 'يستيقظ، يتطهر فمه بالسواك', de: 'Aufwachen, Mund mit Siwak reinigen' },
      { ar: 'يحمد الله ويثني عليه', de: 'Allah loben und preisen' },
      { ar: 'يستمع إلى الأذان', de: 'Dem Adhan zuhören' },
      { ar: 'يصلي ركعتين قبل الفجر', de: 'Zwei Rakat vor dem Fajr beten' },
      { ar: 'يصلي صلاة الفجر ويخطب فيهم', de: 'Fajr-Gebet verrichten und predigen' },
    ],
  },
  {
    titleAr: 'بعد شروق الشمس', titleDe: 'Nach Sonnenaufgang', timeRange: '07:00 - 09:00',
    icon: Sun, iconColor: 'text-orange-400',
    items: [
      { ar: 'يصلي ركعتين', de: 'Zwei Rakat beten' },
      { ar: 'يذهب إلى المنزل ويحدث أهله', de: 'Nach Hause gehen und mit der Familie sprechen' },
      { ar: 'يذهب إلى أصحابه', de: 'Zu den Gefährten gehen' },
    ],
  },
  {
    titleAr: 'بداية اليوم', titleDe: 'Tagesbeginn', timeRange: '09:00 - 12:00',
    icon: BookOpen, iconColor: 'text-teal-400',
    items: [
      { ar: 'يعود إلى المسجد ويصلي ركعتين', de: 'Zurück zur Moschee und zwei Rakat beten' },
      { ar: 'يعلم أصحابه ويعظهم', de: 'Die Gefährten lehren und ermahnen' },
      { ar: 'يستمع ويعالج القضايا السياسية والاجتماعية', de: 'Politische und soziale Angelegenheiten behandeln' },
      { ar: 'يزور الأهل والأقارب', de: 'Familie und Verwandte besuchen' },
    ],
  },
  {
    titleAr: 'الظهر', titleDe: 'Dhuhr', timeRange: '12:00 - 15:00',
    icon: SunDim, iconColor: 'text-yellow-500',
    items: [
      { ar: 'يقوم المصلين بصلاة الظهر', de: 'Dhuhr-Gebet verrichten' },
      { ar: 'في بعض الأحيان يعظهم ويوجههم', de: 'Manchmal predigen und anleiten' },
      { ar: 'يخرج مع أصحابه في مهام محددة', de: 'Mit den Gefährten zu bestimmten Aufgaben gehen' },
    ],
  },
  {
    titleAr: 'العصر', titleDe: 'Asr', timeRange: '15:00 - 18:00',
    icon: CloudSun, iconColor: 'text-orange-500',
    items: [
      { ar: 'يقوم المصلين بصلاة العصر', de: 'Asr-Gebet verrichten' },
      { ar: 'يعود إلى بيته ويمضي فترة مع أهله', de: 'Nach Hause zurückkehren und Zeit mit der Familie verbringen' },
      { ar: 'أحياناً يزور أصحابه أو يستقبل ضيوفاً', de: 'Manchmal Gefährten besuchen oder Gäste empfangen' },
    ],
  },
  {
    titleAr: 'المغرب', titleDe: 'Maghrib', timeRange: '18:00 - 20:00',
    icon: Sunset, iconColor: 'text-rose-400',
    items: [
      { ar: 'يقوم المصلين بصلاة المغرب', de: 'Maghrib-Gebet verrichten' },
      { ar: 'يصلي ركعتين بعد المغرب', de: 'Zwei Rakat nach Maghrib beten' },
      { ar: 'يتناول العشاء إذا وُجد', de: 'Abendessen einnehmen, wenn vorhanden' },
      { ar: 'يجلس مع أهله وأصحابه', de: 'Mit Familie und Gefährten sitzen' },
    ],
  },
  {
    titleAr: 'العشاء', titleDe: 'Isha', timeRange: '20:00 - 23:00',
    icon: MoonStar, iconColor: 'text-violet-400',
    items: [
      { ar: 'يقوم المصلين بصلاة العشاء', de: 'Isha-Gebet verrichten' },
      { ar: 'يذكر الله ويثني عليه', de: 'Allah gedenken und Ihn preisen' },
      { ar: 'يعود إلى بيته ويخطب بعد صلاة العشاء', de: 'Nach Hause zurückkehren und nach Isha predigen' },
      { ar: 'يذهب إلى النوم مبكراً', de: 'Früh schlafen gehen' },
    ],
  },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
const fadeItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function PropheticDay() {
  const navigate = useNavigate();
  const { language, dir } = useApp();
  const isAr = language === 'ar';
  const BackArrow = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen bg-background pb-24" dir={dir}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary/60 active:scale-95 transition-transform">
            <BackArrow className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[15px] font-bold text-foreground">
            {isAr ? 'نظرة على يوم النبي ﷺ' : 'Ein Tag des Propheten ﷺ'}
          </h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Sections */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="pt-4 pb-4 space-y-6">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <motion.div key={idx} variants={fadeItem}>
              {/* Section header - icon in circle on end, title+time next to it */}
              <div className="flex items-center justify-end gap-3 mb-3 px-5">
                <div className="flex flex-col items-end">
                  <h2 className="text-[15px] font-extrabold text-foreground">{isAr ? section.titleAr : section.titleDe}</h2>
                  <span className="text-[11px] text-muted-foreground mt-0.5" dir="ltr">{section.timeRange}</span>
                </div>
                <div className="w-11 h-11 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${section.iconColor}`} />
                </div>
              </div>

              {/* Items - card with golden top border, bullet on end side */}
              <div className="mx-3 rounded-2xl overflow-hidden border border-border/40" style={{ borderTop: '2.5px solid hsl(45 70% 45% / 0.6)' }}>
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-end gap-3 px-4 py-3.5 bg-card ${
                      i < section.items.length - 1 ? 'border-b border-border/30' : ''
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed text-foreground font-medium">
                      {isAr ? item.ar : item.de}
                    </p>
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: 'hsl(45 70% 50%)' }} />
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
