import { useState } from 'react';
import { Thermometer, Droplets, BookOpen, Sliders } from '@/lib/icons';
import {
  dewPoint_C, wetBulb_C, vaporPressureDeficit_kPa, discomfortIndex,
  classifyThermalComfort, apparentTemperature_C, absoluteHumidity_gm3
} from '../compute/ThermalCalculator';

interface MeteorologyConsoleProps {
  ar: boolean;
}

export default function MeteorologyConsole({ ar }: MeteorologyConsoleProps) {
  const [simTemp, setSimTemp] = useState<number>(25);
  const [simRH, setSimRH] = useState<number>(50);
  const [simWind, setSimWind] = useState<number>(15);

  const T = simTemp;
  const RH = simRH;
  const W = simWind;

  // Perform meteorology math
  const dp = dewPoint_C(T, RH);
  const wb = wetBulb_C(T, RH);
  const vpd = vaporPressureDeficit_kPa(T, RH);
  const absHum = absoluteHumidity_gm3(T, RH);
  const di = discomfortIndex(T, RH);
  const app = apparentTemperature_C(T, RH, W);
  const comfort = classifyThermalComfort(app);

  const equations = [
    {
      title: ar ? 'درجة الحرارة المحسوسة (Apparent Temp)' : 'Gefühlte Temperatur',
      desc: ar
        ? 'تحاكي كيف يشعر جسم الإنسان فعلياً بالحرارة استناداً لسرعة الرياح والرطوبة. تستخدم نموذج Rothfusz عند ارتفاع الحرارة، ومؤشر Wind Chill عند البرودة.'
        : 'Berechnet, wie der menschliche Körper die Temperatur tatsächlich empfindt, basierend auf Wind und Feuchte.',
      eq: 'AT = T + 0.33 × e - 0.70 × v - 4.00'
    },
    {
      title: ar ? 'درجة الكرة الرطبة (Wet Bulb Temp)' : 'Feuchtkugeltemperatur',
      desc: ar
        ? 'أدنى درجة حرارة يمكن الوصول إليها عبر التبخر المباشر للمياه. مؤشر حاسم لبقاء الكائنات الحية؛ إذا تجاوزت 35 درجة مئوية تصبح قاتلة للبشر.'
        : 'Die tiefste Temperatur, die durch Verdunstungskühlung erreicht werden kann. Ein kritischer Wert für die Bewohnbarkeit.',
      eq: 'Stull (2011) Formula'
    },
    {
      title: ar ? 'عجز ضغط البخار (Vapor Pressure Deficit)' : 'Dampfdruckdefizit (VPD)',
      desc: ar
        ? 'الفرق بين الضغط الفعلي لبخار الماء وضغط الإشباع الكامل عند درجة حرارة معينة. مؤشر حيوي جداً في الزراعة لتنفس النباتات ونضح الرطوبة.'
        : 'Die Differenz zwischen dem tatsächlichen Dampfdruck und dem Sättigungsdampfdruck bei gleicher Temperatur.',
      eq: 'VPD = e_s(T) - e_a(T, RH)'
    },
    {
      title: ar ? 'مؤشر ثوم للضيق (Thom Discomfort Index)' : 'Thom Unbehagen-Index (DI)',
      desc: ar
        ? 'مقياس إحصائي لتحديد درجة الضيق والانزعاج التي تصيب المجتمعات البشرية بسبب الرطوبة العالية والحرارة العالية معاً.'
        : 'Ein meteorologischer Index, der das Unbehagen der Bevölkerung durch die kombinierte Wirkung von Hitze und Feuchtigkeit schätzt.',
      eq: 'DI = T - 0.55 × (1 - 0.01 × RH) × (T - 14.5)'
    }
  ];

  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden p-4">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />

      <header className="mb-4">
        <h2 className="font-montserrat font-semibold text-[20px] leading-none text-foreground flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          {ar ? 'مختبر المحاكاة والرياضيات المترولوجية' : 'Met-Simulationslabor & Mathematik'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5">
          {ar ? 'عدل القيم الجوية الافتراضية وشاهد كيف تتصرف فيزياء الغلاف الجوي والراحة البشرية لحظياً' : 'Verändere die atmosphärischen Werte und beobachte die Physik in Echtzeit'}
        </p>
      </header>

      {/* Control Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-1.5 bg-background/30 border border-border/40 p-3 rounded-xl">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-foreground flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-primary" /> {ar ? 'الحرارة المحاكية' : 'Simulierte Temp.'}</span>
            <span className="font-montserrat text-foreground font-bold tabular-nums">{simTemp}°C</span>
          </div>
          <input
            type="range"
            min="-20"
            max="50"
            step="1"
            value={simTemp}
            onChange={(e) => setSimTemp(parseFloat(e.target.value))}
            className="w-full accent-primary bg-muted h-1 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1.5 bg-background/30 border border-border/40 p-3 rounded-xl">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-foreground flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-primary" /> {ar ? 'الرطوبة النسبية' : 'Simulierte Feuchtigkeit'}</span>
            <span className="font-montserrat text-foreground font-bold tabular-nums">{simRH}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="1"
            value={simRH}
            onChange={(e) => setSimRH(parseFloat(e.target.value))}
            className="w-full accent-primary bg-muted h-1 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1.5 bg-background/30 border border-border/40 p-3 rounded-xl">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-foreground flex items-center gap-1">💨 {ar ? 'سرعة الرياح' : 'Simulierter Wind'}</span>
            <span className="font-montserrat text-foreground font-bold tabular-nums">{simWind} km/h</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={simWind}
            onChange={(e) => setSimWind(parseFloat(e.target.value))}
            className="w-full accent-primary bg-muted h-1 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Physics outputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: ar ? 'الحرارة المحسوسة' : 'AT (Gefühlt)', value: `${app.toFixed(1)}°`, hint: ar ? comfortLabel(comfort, true) : comfort },
          { label: ar ? 'نقطة الندى' : 'Taupunkt', value: `${dp.toFixed(1)}°`, hint: ar ? 'تكاثف البخار' : 'Kondensation' },
          { label: ar ? 'الكرة الرطبة' : 'Feuchtkugel', value: `${wb.toFixed(1)}°`, hint: ar ? 'أدنى تبريد مائي' : 'Limit' },
          { label: ar ? 'عجز البخار VPD' : 'Sättigungsdefizit', value: `${vpd.toFixed(2)}`, unit: 'kPa', hint: ar ? 'تنفس المزروعات' : 'Transpiration' },
          { label: ar ? 'الرطوبة المطلقة' : 'Abs. Feuchte', value: `${absHum.toFixed(1)}`, unit: 'g/m³', hint: ar ? 'كتلة البخار في الفضاء' : 'Masse/Volumen' },
          { label: ar ? 'مؤشر الضيق' : 'DI Index', value: `${di.toFixed(1)}`, hint: ar ? (di > 24 ? 'ضيق ملحوظ' : 'مريح') : (di > 24 ? 'Unbehaglich' : 'Angenehm') },
        ].map((item, idx) => (
          <div key={idx} className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center flex flex-col justify-between">
            <span className="text-[11px] tracking-wider uppercase text-foreground font-semibold">{item.label}</span>
            <div className="my-2 flex items-baseline justify-center gap-0.5 font-montserrat text-[24px] leading-none text-foreground font-bold tabular-nums">
              <span>{item.value}</span>
              {item.unit && <span className="text-xs text-primary/90 ms-0.5 font-semibold">{item.unit}</span>}
            </div>
            <span className="text-[10px] text-primary/90 font-semibold">{item.hint}</span>
          </div>
        ))}
      </div>

      {/* Physics Formulas Accordion / Box */}
      <div className="rounded-xl border border-border/40 bg-background/50 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>{ar ? 'المرجع العلمي والمعادلات المستخدمة' : 'Wissenschaftliche Referenz & Formeln'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {equations.map((eq, i) => (
            <div key={i} className="space-y-1 border-t border-border/30 pt-3 sm:border-t-0 sm:pt-0">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary" />
                {eq.title}
              </h3>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {eq.desc}
              </p>
              <div className="mt-1 bg-secondary/40 border border-border/20 px-2 py-1 rounded text-[9px] font-mono text-primary select-all" dir="ltr">
                {eq.eq}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function comfortLabel(value: string, ar: boolean) {
  const map: Record<string, string> = {
    dangerously_cold: ar ? 'برد قارس خطر' : 'Gefährlich kalt',
    cold: ar ? 'بارد جداً' : 'Kalt',
    cool: ar ? 'لطيف مائل للبرودة' : 'Kühl',
    comfortable: ar ? 'مريح ومثالي' : 'Angenehm',
    warm: ar ? 'دافئ نسبيّاً' : 'Warm',
    hot: ar ? 'حار ومرهق' : 'Heiß',
    dangerously_hot: ar ? 'حرارة شديدة خطرة' : 'Gefährlich heiß',
  };
  return map[value] ?? value;
}
