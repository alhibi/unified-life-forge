// ============================================================================
// WeatherPlanner — exercise suitability score, D3 synthesis window,
// and health advisories. Two-column layout: a circular dial + a list of
// colour-coded advisories. Each advisory carries its own severity icon.
// ============================================================================

import { motion } from 'framer-motion';

import {
  AlertTriangle,
  CheckCircle,
  Droplets,
  Info,
  Leaf,
  Shield,
  Sun,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import { duration, easing } from '../lib/weather-motion';

interface WeatherPlannerProps {
  aqiUs: number;
  uvIndex: number;
  humidityPercent: number;
  temperatureC: number;
  pollenRisk: string;
  solarElevationDeg: number;
}

type Severity = 'danger' | 'warning' | 'success';

interface Advisory {
  type: Severity;
  text: string;
}

export default function WeatherPlanner({
  aqiUs,
  uvIndex,
  humidityPercent,
  temperatureC,
  pollenRisk,
  solarElevationDeg,
}: WeatherPlannerProps) {
  // Exercise suitability — penalise AQI, heat/cold extremes, humidity.
  const exerciseScore = (() => {
    let score = 100;
    score -= Math.min(60, aqiUs / 3);
    if (temperatureC > 30) score -= (temperatureC - 30) * 4;
    else if (temperatureC < 10) score -= (10 - temperatureC) * 3;
    if (humidityPercent > 70) score -= (humidityPercent - 70) * 0.5;
    return Math.max(0, Math.min(100, Math.round(score)));
  })();

  const d3Window = (() => {
    if (solarElevationDeg < 45) {
      return 'زاوية الشمس منخفضة حالياً، يصعب تخليق فيتامين د الطبيعي في الجلد.';
    }
    if (uvIndex < 3) {
      return 'الأشعة فوق البنفسجية منخفضة جداً. يوصى بالتعرض المباشر لمدة 30-40 دقيقة.';
    }
    if (uvIndex <= 7) {
      return 'مثالي! 10-15 دقيقة كافية لتوفير احتياجك اليومي دون ضرر.';
    }
    return 'الأشعة شديدة الخطورة! تجنب التعرض المباشر دون واقي.';
  })();

  const advisories: Advisory[] = [];
  if (aqiUs > 100) {
    advisories.push({
      type: 'danger',
      text: 'الهواء غير صحي للمجموعات الحساسة. قلل الأنشطة البدنية المجهدة خارج المنزل.',
    });
  }
  if (pollenRisk !== 'none' && pollenRisk !== 'low') {
    advisories.push({
      type: 'warning',
      text: 'مستوى حبوب اللقاح مرتفع، قد تظهر أعراض الحساسية الموسمية اليوم.',
    });
  }
  if (humidityPercent > 80 && temperatureC > 28) {
    advisories.push({
      type: 'warning',
      text: 'رطوبة عالية خانقة مع حرارة مرتفعة، تزيد الإرهاق الحراري وتعيق تبريد الجسم.',
    });
  }
  if (uvIndex >= 8) {
    advisories.push({
      type: 'danger',
      text: 'مؤشر الأشعة البنفسجية مرتفع للغاية! التعرض المباشر دون حماية يسبب حروقاً في دقائق.',
    });
  }
  if (advisories.length === 0) {
    advisories.push({
      type: 'success',
      text: 'الأجواء الخارجية آمنة ومريحة صحياً، مثالية للأنشطة في الهواء الطلق.',
    });
  }

  const severityClass: Record<Severity, { wrap: string; icon: string; iconBg: string }> = {
    danger: {
      wrap: 'bg-rose-500/8 border-rose-500/30 text-rose-700 dark:text-rose-300',
      icon: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/15',
    },
    warning: {
      wrap: 'bg-amber-500/8 border-amber-500/30 text-amber-700 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/15',
    },
    success: {
      wrap: 'bg-emerald-500/8 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/15',
    },
  };

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-3">
        <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
          <Shield className="w-5 h-5 text-primary" aria-hidden />
          {'مخطط الأنشطة والتحذيرات الذكية'}
        </h2>
        <p className="mt-1 text-mini text-foreground/65 leading-snug">
          {'مدى ملاءمة الجو للأنشطة الخارجية، تخليق فيتامين د، وتحذيرات طبية'}
        </p>
      </header>

      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exercise suitability + D3 window */}
        <div className="rounded-xl bg-background/40 border border-foreground/10 p-5 flex flex-col gap-5">
          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-3">
              {'مؤشر الرياضة في الهواء الطلق'}
            </p>
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    className="text-foreground/10"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <motion.path
                    className="text-primary"
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    initial={{ strokeDasharray: '0, 100' }}
                    animate={{ strokeDasharray: `${exerciseScore}, 100` }}
                    transition={{ duration: duration.reveal * 1.5, ease: easing.decelerate }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-[1.25rem] font-extralight tracking-tight tabular-nums text-foreground" dir="ltr">
                    {exerciseScore}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-meta font-bold text-foreground leading-tight">
                  {exerciseScore >= 80
                    ? 'أجواء ممتازة'
                    : exerciseScore >= 50
                      ? 'ملائمة مقبولة'
                      : 'غير موصى بها'}
                </p>
                <p className="mt-1 text-mini text-foreground/65 leading-snug">
                  {exerciseScore >= 80
                    ? 'مثالية للجري والأنشطة المجهدة.'
                    : exerciseScore >= 50
                      ? 'انتبه للحرارة والرطوبة قبل البدء.'
                      : 'الأفضل تأجيل النشاط أو نقله داخل المنزل.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-foreground/10">
            <p className="flex items-center gap-1.5 text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2">
              <Sun className="w-3.5 h-3.5 text-primary" aria-hidden />
              {'تخليق فيتامين د (D3 Window)'}
            </p>
            <p className="text-mini text-foreground/80 leading-relaxed">{d3Window}</p>
          </div>
        </div>

        {/* Advisories */}
        <div className="rounded-xl bg-background/40 border border-foreground/10 p-5 flex flex-col gap-5">
          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-3">
              {'الإرشادات والتحذيرات الطبية'}
            </p>
            <div className="space-y-2.5">
              {advisories.map((adv, idx) => {
                const Icon = adv.type === 'danger' ? AlertTriangle : adv.type === 'warning' ? Info : CheckCircle;
                const cls = severityClass[adv.type];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: duration.base, ease: easing.standard }}
                    className={cn('flex items-start gap-2.5 p-3 rounded-lg border text-mini leading-relaxed', cls.wrap)}
                  >
                    <span className={cn('shrink-0 mt-0.5 w-7 h-7 grid place-items-center rounded-lg', cls.iconBg, cls.icon)}>
                      <Icon className="w-4 h-4" aria-hidden />
                    </span>
                    <span>{adv.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-foreground/10 flex items-center gap-5 text-mini text-foreground/65">
            <span className="flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-primary" aria-hidden />
              <span>{'حبوب اللقاح:'}</span>
              <span className="text-foreground font-bold capitalize">{pollenRisk}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-primary" aria-hidden />
              <span>{'الرطوبة:'}</span>
              <span className="text-foreground font-bold tabular-nums">{Math.round(humidityPercent)}٪</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}