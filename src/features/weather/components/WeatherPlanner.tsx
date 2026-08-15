import { motion } from 'framer-motion';

import { AlertTriangle, CheckCircle, Droplets, Info, Leaf,Shield, Sun } from '@/lib/icons';

interface WeatherPlannerProps {
  aqiUs: number;
  uvIndex: number;
  humidityPercent: number;
  temperatureC: number;
  pollenRisk: string;
  solarElevationDeg: number;
}

export default function WeatherPlanner({
  aqiUs,
  uvIndex,
  humidityPercent,
  temperatureC,
  pollenRisk,
  solarElevationDeg,
}: WeatherPlannerProps) {

  // Calculate running/exercise suitability (0-100)
  const getExerciseScore = () => {
    let score = 100;
    // AQI penalty
    score -= Math.min(60, (aqiUs / 3));
    // Extreme Heat / Cold penalty
    if (temperatureC > 30) score -= (temperatureC - 30) * 4;
    else if (temperatureC < 10) score -= (10 - temperatureC) * 3;
    // Humidity penalty
    if (humidityPercent > 70) score -= (humidityPercent - 70) * 0.5;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const exerciseScore = getExerciseScore();

  const getD3SynthesisWindow = () => {
    if (solarElevationDeg < 45) {
      return 'زاوية الشمس منخفضة حالياً، يصعب تخليق فيتامين د الطبيعي في الجلد';
    }
    if (uvIndex < 3) {
      return 'مؤشر الأشعة منخفض جداً، يوصى بالتعرض المباشر لمدة 30-40 دقيقة';
    }
    if (uvIndex <= 7) {
      return 'مثالي! التعرض لمدة 10-15 دقيقة كافٍ جداً لتوفير احتياجك اليومي بدون ضرر';
    }
    return 'الأشعة شديدة الخطورة! تجنب التعرض بدون واقي لمنع الحروق';
  };

  const getAdvisories = () => {
    const list = [];
    if (aqiUs > 100) {
      list.push({
        type: 'danger',
        text: 'الهواء غير صحي للمجموعات الحساسة. قلل من الأنشطة البدنية المجهدة خارج المنزل.'
      });
    }
    if (pollenRisk !== 'none' && pollenRisk !== 'low') {
      list.push({
        type: 'warning',
        text: 'مستوى حبوب اللقاح مرتفع، قد تعاني من أعراض الحساسية الموسمية اليوم.'
      });
    }
    if (humidityPercent > 80 && temperatureC > 28) {
      list.push({
        type: 'warning',
        text: 'رطوبة عالية خانقة مع حرارة مرتفعة، تزيد من الإرهاق الحراري وتعيق تبريد الجسم بالتعرق.'
      });
    }
    if (uvIndex >= 8) {
      list.push({
        type: 'danger',
        text: 'مؤشر الأشعة البنفسجية مرتفع للغاية! التعرض المباشر دون حماية يسبب حروق الجلد خلال دقائق.'
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'success',
        text: 'الأجواء الخارجية آمنة ومريحة جداً صحياً، مثالية للاسترخاء والأنشطة في الهواء الطلق.'
      });
    }
    return list;
  };

  const advisories = getAdvisories();

  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden p-4">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />

      <header className="mb-4">
        <h2 className="font-semibold text-title leading-none text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {'مخطط الأنشطة والتحذيرات الذكية'}
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity suitability dial */}
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 flex flex-col justify-between">
          <div>
            <span className="text-micro tracking-wider uppercase text-muted-foreground">{'مؤشر ممارسة الرياضة في الهواء الطلق'}</span>
            <div className="flex items-center gap-4 mt-3">
              <svg viewBox="0 0 36 36" className="w-16 h-16 shrink-0 -rotate-90">
                <path
                  className="text-foreground/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  className="text-primary"
                  strokeWidth="3.5"
                  strokeDasharray={`${exerciseScore}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${exerciseScore}, 100` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div>
                <span className="text-hero font-extrabold text-foreground leading-none tabular-nums">{exerciseScore}%</span>
                <p className="text-mini text-muted-foreground mt-1 font-semibold">
                  {exerciseScore >= 80
                    ? ('أجواء ممتازة وملائمة للجري')
                    : exerciseScore >= 50
                    ? ('ملائمة مقبولة، انتبه للحرارة')
                    : ('غير موصى بممارسة الرياضة خارجاً')}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-3 mt-4">
            <div className="flex items-center gap-1.5 text-mini font-semibold text-foreground mb-1.5">
              <Sun className="w-4 h-4 text-primary" />
              <span>{'تخليق فيتامين د (D3 Window)'}</span>
            </div>
            <p className="text-micro leading-relaxed text-muted-foreground">
              {getD3SynthesisWindow()}
            </p>
          </div>
        </div>

        {/* Health advisories & Respiratory notes */}
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-micro tracking-wider uppercase text-muted-foreground">{'الإرشادات والتحذيرات الطبية الجوية'}</span>

            <div className="space-y-2">
              {advisories.map((adv, idx) => {
                const Icon = adv.type === 'danger' ? AlertTriangle : adv.type === 'warning' ? Info : CheckCircle;
                return (
                  <div
                    key={idx}
                    className={`flex gap-2.5 p-3 rounded-lg border text-mini leading-relaxed ${
                      adv.type === 'danger'
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : adv.type === 'warning'
                        ? 'bg-warning/10 border-warning/20 text-warning-foreground'
                        : 'bg-primary/10 border-primary/20 text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{adv.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/30 pt-3 mt-4 flex items-center gap-4 text-micro text-muted-foreground">
            <div className="flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              <span>{'حبوب اللقاح:'}</span>
              <span className="text-foreground font-semibold">{pollenRisk}</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-primary" />
              <span>{'الرطوبة:'}</span>
              <span className="text-foreground font-semibold">{humidityPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
