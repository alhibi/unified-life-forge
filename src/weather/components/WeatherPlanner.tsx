import { motion } from 'framer-motion';
import { Sun, CheckCircle, AlertTriangle, Info, Shield, Droplets, Leaf } from '@/lib/icons';

interface WeatherPlannerProps {
  aqiUs: number;
  uvIndex: number;
  humidityPercent: number;
  temperatureC: number;
  pollenRisk: string;
  solarElevationDeg: number;
  ar: boolean;
}

export default function WeatherPlanner({
  aqiUs,
  uvIndex,
  humidityPercent,
  temperatureC,
  pollenRisk,
  solarElevationDeg,
  ar
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
      return ar
        ? 'زاوية الشمس منخفضة حالياً، يصعب تخليق فيتامين د الطبيعي في الجلد'
        : 'Der Sonnenstand ist zu niedrig für eine effektive Vitamin-D-Synthese.';
    }
    if (uvIndex < 3) {
      return ar
        ? 'مؤشر الأشعة منخفض جداً، يوصى بالتعرض المباشر لمدة 30-40 دقيقة'
        : 'Sehr niedriger UV-Index. Ein längerer Aufenthalt ist erforderlich.';
    }
    if (uvIndex <= 7) {
      return ar
        ? 'مثالي! التعرض لمدة 10-15 دقيقة كافٍ جداً لتوفير احتياجك اليومي بدون ضرر'
        : 'Perfekt! 10-15 Minuten direkte Bestrahlung sind ausreichend.';
    }
    return ar
      ? 'الأشعة شديدة الخطورة! تجنب التعرض بدون واقي لمنع الحروق'
      : 'Extremer UV-Index! Nur mit Sonnenschutz exponieren, um Sonnenbrand zu vermeiden.';
  };

  const getAdvisories = () => {
    const list = [];
    if (aqiUs > 100) {
      list.push({
        type: 'danger',
        text: ar
          ? 'الهواء غير صحي للمجموعات الحساسة. قلل من الأنشطة البدنية المجهدة خارج المنزل.'
          : 'Schlechte Luftqualität für empfindliche Personen. Anstrengung im Freien reduzieren.'
      });
    }
    if (pollenRisk !== 'none' && pollenRisk !== 'low') {
      list.push({
        type: 'warning',
        text: ar
          ? 'مستوى حبوب اللقاح مرتفع، قد تعاني من أعراض الحساسية الموسمية اليوم.'
          : 'Erhöhte Pollenbelastung. Vorsicht bei Heuschnupfen.'
      });
    }
    if (humidityPercent > 80 && temperatureC > 28) {
      list.push({
        type: 'warning',
        text: ar
          ? 'رطوبة عالية خانقة مع حرارة مرتفعة، تزيد من الإرهاق الحراري وتعيق تبريد الجسم بالتعرق.'
          : 'Kombination aus Hitze und hoher Feuchtigkeit erschwert die körpereigene Kühlung.'
      });
    }
    if (uvIndex >= 8) {
      list.push({
        type: 'danger',
        text: ar
          ? 'مؤشر الأشعة البنفسجية مرتفع للغاية! التعرض المباشر دون حماية يسبب حروق الجلد خلال دقائق.'
          : 'Sehr hoher UV-Index! Direkte Sonne ohne Schutz schädigt die Haut extrem schnell.'
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'success',
        text: ar
          ? 'الأجواء الخارجية آمنة ومريحة جداً صحياً، مثالية للاسترخاء والأنشطة في الهواء الطلق.'
          : 'Die atmosphärischen Bedingungen sind äußerst sicher und angenehm für alle Aktivitäten.'
      });
    }
    return list;
  };

  const advisories = getAdvisories();

  return (
    <section className="relative rounded-[22px] surface-depth overflow-hidden p-4">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <header className="mb-4">
        <h2 className="font-cormorant text-[24px] leading-none text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {ar ? 'مخطط الأنشطة والتحذيرات الذكية' : 'Aktivitäten-Planer & Gesundheit'}
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity suitability dial */}
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{ar ? 'مؤشر ممارسة الرياضة في الهواء الطلق' : 'Sporttauglichkeit im Freien'}</span>
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
                <span className="font-cormorant text-[36px] font-bold text-foreground leading-none">{exerciseScore}%</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {exerciseScore >= 80
                    ? (ar ? 'أجواء ممتازة وملائمة للجري' : 'Hervorragendes Wetter für Sport')
                    : exerciseScore >= 50
                    ? (ar ? 'ملائمة مقبولة، انتبه للحرارة' : 'Akzeptable Bedingungen')
                    : (ar ? 'غير موصى بممارسة الرياضة خارجاً' : 'Sport im Freien nicht empfohlen')}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-3 mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
              <Sun className="w-4 h-4 text-primary" />
              <span>{ar ? 'تخليق فيتامين د (D3 Window)' : 'Vitamin-D-Fenster'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {getD3SynthesisWindow()}
            </p>
          </div>
        </div>

        {/* Health advisories & Respiratory notes */}
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{ar ? 'الإرشادات والتحذيرات الطبية الجوية' : 'Ärztliche Wetterhinweise'}</span>

            <div className="space-y-2">
              {advisories.map((adv, idx) => {
                const Icon = adv.type === 'danger' ? AlertTriangle : adv.type === 'warning' ? Info : CheckCircle;
                return (
                  <div
                    key={idx}
                    className={`flex gap-2.5 p-3 rounded-lg border text-xs leading-relaxed ${
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

          <div className="border-t border-border/30 pt-3 mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              <span>{ar ? 'حبوب اللقاح:' : 'Pollen:'}</span>
              <span className="text-foreground font-semibold">{pollenRisk}</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-primary" />
              <span>{ar ? 'الرطوبة:' : 'Feuchte:'}</span>
              <span className="text-foreground font-semibold">{humidityPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
