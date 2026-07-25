import { useState } from 'react';

import { BookOpen, Droplets, Sliders,Thermometer } from '@/lib/icons';

import {
absoluteHumidity_gm3,
apparentTemperature_C,   classifyThermalComfort,   dewPoint_C, discomfortIndex,
vaporPressureDeficit_kPa, wetBulb_C} from '../compute/ThermalCalculator';

interface MeteorologyConsoleProps {
}

export default function MeteorologyConsole({ }: MeteorologyConsoleProps) {
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
      title: 'درجة الحرارة المحسوسة (Apparent Temp)',
      desc: 'تحاكي كيف يشعر جسم الإنسان فعلياً بالحرارة استناداً لسرعة الرياح والرطوبة. تستخدم نموذج Rothfusz عند ارتفاع الحرارة، ومؤشر Wind Chill عند البرودة.',
      eq: 'AT = T + 0.33 × e - 0.70 × v - 4.00'
    },
    {
      title: 'درجة الكرة الرطبة (Wet Bulb Temp)',
      desc: 'أدنى درجة حرارة يمكن الوصول إليها عبر التبخر المباشر للمياه. مؤشر حاسم لبقاء الكائنات الحية؛ إذا تجاوزت 35 درجة مئوية تصبح قاتلة للبشر.',
      eq: 'Stull (2011) Formula'
    },
    {
      title: 'عجز ضغط البخار (Vapor Pressure Deficit)',
      desc: 'الفرق بين الضغط الفعلي لبخار الماء وضغط الإشباع الكامل عند درجة حرارة معينة. مؤشر حيوي جداً في الزراعة لتنفس النباتات ونضح الرطوبة.',
      eq: 'VPD = e_s(T) - e_a(T, RH)'
    },
    {
      title: 'مؤشر ثوم للضيق (Thom Discomfort Index)',
      desc: 'مقياس إحصائي لتحديد درجة الضيق والانزعاج التي تصيب المجتمعات البشرية بسبب الرطوبة العالية والحرارة العالية معاً.',
      eq: 'DI = T - 0.55 × (1 - 0.01 × RH) × (T - 14.5)'
    }
  ];

  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden p-4">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />

      <header className="mb-4">
        <h2 className="font-montserrat font-semibold text-[20px] leading-none text-foreground flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          {'مختبر المحاكاة والرياضيات المترولوجية'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5">
          {'عدل القيم الجوية الافتراضية وشاهد كيف تتصرف فيزياء الغلاف الجوي والراحة البشرية لحظياً'}
        </p>
      </header>

      {/* Control Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-1.5 bg-background/30 border border-border/40 p-3 rounded-xl">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-foreground flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-primary" /> {'الحرارة المحاكية'}</span>
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
            <span className="text-foreground flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-primary" /> {'الرطوبة النسبية'}</span>
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
            <span className="text-foreground flex items-center gap-1">💨 {'سرعة الرياح'}</span>
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
          { label: 'الحرارة المحسوسة', value: `${app.toFixed(1)}°`, hint: comfortLabel(comfort) },
          { label: 'نقطة الندى', value: `${dp.toFixed(1)}°`, hint: 'تكاثف البخار' },
          { label: 'الكرة الرطبة', value: `${wb.toFixed(1)}°`, hint: 'أدنى تبريد مائي' },
          { label: 'عجز البخار VPD', value: `${vpd.toFixed(2)}`, unit: 'kPa', hint: 'تنفس المزروعات' },
          { label: 'الرطوبة المطلقة', value: `${absHum.toFixed(1)}`, unit: 'g/m³', hint: 'كتلة البخار في الفضاء' },
          { label: 'مؤشر الضيق', value: `${di.toFixed(1)}`, hint: (di > 24 ? 'ضيق ملحوظ' : 'مريح') },
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
          <span>{'المرجع العلمي والمعادلات المستخدمة'}</span>
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
              <div className="mt-1 bg-secondary/40 border border-border/20 px-2 py-1 rounded text-[10px] font-mono text-primary select-all" dir="ltr">
                {eq.eq}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function comfortLabel(value: string) {
  const map: Record<string, string> = {
    dangerously_cold: 'برد قارس خطر',
    cold: 'بارد جداً',
    cool: 'لطيف مائل للبرودة',
    comfortable: 'مريح ومثالي',
    warm: 'دافئ نسبيّاً',
    hot: 'حار ومرهق',
    dangerously_hot: 'حرارة شديدة خطرة',
  };
  return map[value] ?? value;
}
