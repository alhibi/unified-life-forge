import { motion } from 'framer-motion';
import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, IconChip, PageShell } from '@/components/ui/app-shell';
import { BookOpen, CloudSun, Moon, MoonStar, Sun, SunDim, Sunrise, Sunset } from '@/lib/icons';

interface TimeSection {
  titleAr: string;
  timeRange: string;
  icon: React.ComponentType<{ className?: string }>;
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

import { pageItem as fadeItem, pageStagger as stagger } from '@/lib/motion';

export default function PropheticDay() {

  return (
    <PageShell flush centered={false} className="px-4 pt-2">
      <SEO title="اليوم النبوي — هدي النبي ﷺ — SmartHub" description="يوم النبي ﷺ مقسماً إلى ثماني فترات مع السنن والأذكار المتعلقة بكل فترة." path="/section/prophetic-day" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-page">
        <PageHeader sticky title={'نظرة على يوم النبي ﷺ'} />

        {/* Sections */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="pt-2 pb-4 space-y-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.div key={idx} variants={fadeItem}>
                {/* Section header - icon plate on start, title + time next to it */}
                <div className="flex items-center gap-3 mb-3">
                  <IconChip aria-hidden>
                    <Icon className={`h-5 w-5 ${section.iconColor}`} />
                  </IconChip>
                  <div className="flex flex-col">
                    <h2 className="text-meta font-extrabold text-foreground">{section.titleAr}</h2>
                    <span className="text-micro text-muted-foreground mt-0.5 tabular-nums" dir="ltr">{section.timeRange}</span>
                  </div>
                </div>

                {/* Items — one grouped list per period, bullet on start */}
                <AppList>
                  {section.items.map((item, i) => (
                    <div key={i} className="app-row">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-primary" aria-hidden />
                      <p className="flex-1 text-mini leading-relaxed text-foreground font-medium">
                        {item.ar}
                      </p>
                    </div>
                  ))}
                </AppList>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </PageShell>
  );
}
