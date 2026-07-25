import { motion } from 'framer-motion';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { BookOpen, CloudSun, Moon, MoonStar,Sun, SunDim, Sunrise, Sunset } from '@/lib/icons';

interface TimeSection {
  titleAr: string;
  timeRange: string;
  icon: React.ElementType;
  iconColor: string;
  items: { ar: string; }[];
}

const sections: TimeSection[] = [
  {
    titleAr: 'قبل الفجر', timeRange: '00:00 - 05:00',
    icon: Moon, iconColor: 'text-primary',
    items: [
      { ar: 'يتهجد ويصلي قيام الليل في المنزل أو في المسجد', },
      { ar: 'يأخذ قيلولة قصيرة بعد التهجد', },
    ],
  },
  {
    titleAr: 'الفجر', timeRange: '05:00 - 07:00',
    icon: Sunrise, iconColor: 'text-primary',
    items: [
      { ar: 'يستيقظ، يتطهر فمه بالسواك', },
      { ar: 'يحمد الله ويثني عليه', },
      { ar: 'يستمع إلى الأذان', },
      { ar: 'يصلي ركعتين قبل الفجر', },
      { ar: 'يصلي صلاة الفجر ويخطب فيهم', },
    ],
  },
  {
    titleAr: 'بعد شروق الشمس', timeRange: '07:00 - 09:00',
    icon: Sun, iconColor: 'text-primary',
    items: [
      { ar: 'يصلي ركعتين', },
      { ar: 'يذهب إلى المنزل ويحدث أهله', },
      { ar: 'يذهب إلى أصحابه', },
    ],
  },
  {
    titleAr: 'بداية اليوم', timeRange: '09:00 - 12:00',
    icon: BookOpen, iconColor: 'text-primary',
    items: [
      { ar: 'يعود إلى المسجد ويصلي ركعتين', },
      { ar: 'يعلم أصحابه ويعظهم', },
      { ar: 'يستمع ويعالج القضايا السياسية والاجتماعية', },
      { ar: 'يزور الأهل والأقارب', },
    ],
  },
  {
    titleAr: 'الظهر', timeRange: '12:00 - 15:00',
    icon: SunDim, iconColor: 'text-primary',
    items: [
      { ar: 'يقوم المصلين بصلاة الظهر', },
      { ar: 'في بعض الأحيان يعظهم ويوجههم', },
      { ar: 'يخرج مع أصحابه في مهام محددة', },
    ],
  },
  {
    titleAr: 'العصر', timeRange: '15:00 - 18:00',
    icon: CloudSun, iconColor: 'text-primary',
    items: [
      { ar: 'يقوم المصلين بصلاة العصر', },
      { ar: 'يعود إلى بيته ويمضي فترة مع أهله', },
      { ar: 'أحياناً يزور أصحابه أو يستقبل ضيوفاً', },
    ],
  },
  {
    titleAr: 'المغرب', timeRange: '18:00 - 20:00',
    icon: Sunset, iconColor: 'text-primary',
    items: [
      { ar: 'يقوم المصلين بصلاة المغرب', },
      { ar: 'يصلي ركعتين بعد المغرب', },
      { ar: 'يتناول العشاء إذا وُجد', },
      { ar: 'يجلس مع أهله وأصحابه', },
    ],
  },
  {
    titleAr: 'العشاء', timeRange: '20:00 - 23:00',
    icon: MoonStar, iconColor: 'text-primary',
    items: [
      { ar: 'يقوم المصلين بصلاة العشاء', },
      { ar: 'يذكر الله ويثني عليه', },
      { ar: 'يعود إلى بيته ويخطب بعد صلاة العشاء', },
      { ar: 'يذهب إلى النوم مبكراً', },
    ],
  },
];

import { pageItem as fadeItem,pageStagger as stagger } from '@/lib/motion';

export default function PropheticDay() {
  const navigate = useNavigate();
  const { dir } = useApp();

  return (
    <div className="min-h-screen bg-background pb-page" dir={dir}>
      <SEO title="اليوم النبوي — هدي النبي ﷺ — SmartHub" description="يوم النبي ﷺ مقسماً إلى ثماني فترات مع السنن والأذكار المتعلقة بكل فترة." path="/section/prophetic-day" />
      {/* Header */}
      <PageHeader sticky title={'نظرة على يوم النبي ﷺ'} className="px-4 py-3 bg-background border-b border-border" />

      {/* Sections */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="pt-4 pb-4 space-y-6">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <motion.div key={idx} variants={fadeItem}>
              {/* Section header - icon on start, title+time next to it */}
              <div className="flex items-center gap-3 mb-3 px-5">
                <div className="w-11 h-11 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${section.iconColor}`} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-[0.9375rem] font-extrabold text-foreground">{section.titleAr}</h2>
                  <span className="text-[0.6875rem] text-muted-foreground mt-0.5" dir="ltr">{section.timeRange}</span>
                </div>
              </div>

              {/* Items - card with golden top border, bullet on start */}
              <div className="mx-5 rounded-2xl overflow-hidden border border-border/40 border-t-[2.5px] border-t-primary/40">
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3.5 bg-card ${
                      i < section.items.length - 1 ? 'border-b border-border/30' : ''
                    }`}
                  >
                    <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-primary" />
                    <p className="text-[0.8125rem] leading-relaxed text-foreground font-medium">
                      {item.ar}
                    </p>
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
