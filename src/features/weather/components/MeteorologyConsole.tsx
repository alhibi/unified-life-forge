// ============================================================================
// MeteorologyConsole — interactive simulator that recomputes six derived
// atmospheric quantities from three sliders.
//
// VISUAL REDESIGN
//   • Sliders now live in one elegant row at the top.
//   • Outputs are six cards in a 2×3 grid with gradient hover effects.
//   • Formula reference is a separate section with monospace typography.
//   • Title uses an explicit icon (Sliders/Horizontal) instead of inline emoji.
// ============================================================================

import { useState } from 'react';

import { BookOpen, Droplets, Sliders, Thermometer, Wind } from '@/lib/icons';

import {
  absoluteHumidity_gm3,
  apparentTemperature_C,
  classifyThermalComfort,
  dewPoint_C,
  discomfortIndex,
  vaporPressureDeficit_kPa,
  wetBulb_C,
} from '../compute/ThermalCalculator';

function comfortLabel(value: string): string {
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

interface SimSliderProps {
  label: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}

function SimSlider({ label, icon, min, max, step, value, unit, onChange }: SimSliderProps) {
  return (
    <div className="rounded-xl bg-background/40 border border-foreground/10 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between text-mini font-bold">
        <span className="flex items-center gap-1.5 text-foreground/80">
          <span className="text-primary [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
          {label}
        </span>
        <span className="text-meta font-extralight tracking-tight tabular-nums text-foreground" dir="ltr">
          {value}
          <span className="ms-1 text-[0.625rem] font-bold text-foreground/55">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary h-1 cursor-pointer appearance-none rounded-full bg-foreground/10"
        aria-label={label}
      />
    </div>
  );
}

interface OutputCardProps {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  highlight?: boolean;
}

function OutputCard({ label, value, unit, hint, highlight }: OutputCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-1.5 transition-colors hover:border-primary/40 ${
        highlight
          ? 'bg-primary/8 border-primary/30'
          : 'bg-background/40 border-foreground/10'
      }`}
    >
      <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55">
        {label}
      </span>
      <div className="flex items-baseline gap-1 tabular-nums leading-none" dir="ltr">
        <span className="text-title font-extralight tracking-tight text-foreground">
          {value}
        </span>
        {unit && <span className="text-mini font-bold text-foreground/55">{unit}</span>}
      </div>
      <span className="text-mini text-foreground/60 font-medium leading-snug">{hint}</span>
    </div>
  );
}

export default function MeteorologyConsole() {
  const [simTemp, setSimTemp] = useState(25);
  const [simRH, setSimRH] = useState(50);
  const [simWind, setSimWind] = useState(15);

  const T = simTemp;
  const RH = simRH;
  const W = simWind;

  const dp = dewPoint_C(T, RH);
  const wb = wetBulb_C(T, RH);
  const vpd = vaporPressureDeficit_kPa(T, RH);
  const absHum = absoluteHumidity_gm3(T, RH);
  const di = discomfortIndex(T, RH);
  const app = apparentTemperature_C(T, RH, W);
  const comfort = classifyThermalComfort(app);

  const equations = [
    {
      title: 'الحرارة المحسوسة (Apparent)',
      desc: 'كيف يشعر الجسم فعلياً بالحرارة مع الرياح والرطوبة. Rothfusz للحرارة، Wind Chill للبرودة.',
      eq: 'AT = T + 0.33·e − 0.70·v − 4.00',
    },
    {
      title: 'الكرة الرطبة (Wet Bulb)',
      desc: 'أدنى حرارة ممكنة عبر التبخر. أعلى من 35°C قاتلة للبشر.',
      eq: 'Stull (2011) Formula',
    },
    {
      title: 'عجز ضغط البخار (VPD)',
      desc: 'فرق ضغط البخار الفعلي عن الإشباع. مؤشر حيوي للزراعة.',
      eq: 'VPD = eₛ(T) − eₐ(T, RH)',
    },
    {
      title: 'مؤشر ثوم للضيق (Thom DI)',
      desc: 'مؤشر إحصائي للضيق الناجم عن الرطوبة والحرارة معاً.',
      eq: 'DI = T − 0.55·(1 − 0.01·RH)·(T − 14.5)',
    },
  ];

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-4">
        <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
          <Sliders className="w-5 h-5 text-primary" aria-hidden />
          {'مختبر المحاكاة والفيزياء'}
        </h2>
        <p className="mt-1 text-mini text-foreground/65 leading-snug">
          {'اضبط الحرارة والرطوبة والرياح، شاهد كيف تتصرف الفيزياء والراحة البشرية'}
        </p>
      </header>

      <div className="px-6 pb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <SimSlider
          label="حرارة"
          icon={<Thermometer />}
          min={-20}
          max={50}
          step={1}
          value={simTemp}
          unit="°C"
          onChange={setSimTemp}
        />
        <SimSlider
          label="رطوبة"
          icon={<Droplets />}
          min={5}
          max={100}
          step={1}
          value={simRH}
          unit="٪"
          onChange={setSimRH}
        />
        <SimSlider
          label="رياح"
          icon={<Wind />}
          min={0}
          max={100}
          step={1}
          value={simWind}
          unit="km/h"
          onChange={setSimWind}
        />
      </div>

      <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <OutputCard
          label="الحرارة المحسوسة"
          value={app.toFixed(1)}
          unit="°"
          hint={comfortLabel(comfort)}
          highlight
        />
        <OutputCard
          label="نقطة الندى"
          value={dp.toFixed(1)}
          unit="°"
          hint="تكاثف البخار"
        />
        <OutputCard
          label="الكرة الرطبة"
          value={wb.toFixed(1)}
          unit="°"
          hint="أدنى تبريد مائي"
        />
        <OutputCard
          label="عجز البخار"
          value={vpd.toFixed(2)}
          unit="kPa"
          hint="تنفس المزروعات"
        />
        <OutputCard
          label="الرطوبة المطلقة"
          value={absHum.toFixed(1)}
          unit="g/m³"
          hint="كتلة البخار"
        />
        <OutputCard
          label="مؤشر الضيق"
          value={di.toFixed(1)}
          hint={di > 24 ? 'ضيق ملحوظ' : 'مريح'}
        />
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-xl bg-background/40 border border-foreground/10 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-3">
            <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden />
            {'المرجع العلمي والمعادلات'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {equations.map((eq, i) => (
              <div key={i} className="space-y-1.5">
                <h3 className="text-mini font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary" aria-hidden />
                  {eq.title}
                </h3>
                <p className="text-mini text-foreground/65 leading-relaxed">{eq.desc}</p>
                <code className="inline-block mt-1 bg-foreground/5 border border-foreground/10 px-2 py-1 rounded text-mini font-mono text-primary tabular-nums" dir="ltr">
                  {eq.eq}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}