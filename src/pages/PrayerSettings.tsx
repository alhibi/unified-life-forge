import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { ChevronLeft, Check, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const MADHABS = [
  {
    key: 'shafii' as const,
    nameAr: 'الشافعي',
    nameDe: 'Schafi\'i',
    descAr: 'وقت العصر عندما يصبح ظل الشيء مثل طوله — المعتمد عند الشافعية',
    descDe: 'Asr wenn der Schatten gleich der Objektlänge ist',
    school: 0,
  },
  {
    key: 'hanbali' as const,
    nameAr: 'الحنبلي',
    nameDe: 'Hanbali',
    descAr: 'وقت العصر عندما يصبح ظل الشيء مثل طوله — نفس حساب الشافعي',
    descDe: 'Asr wie bei Schafi\'i (Schatten = Objektlänge)',
    school: 0,
  },
  {
    key: 'maliki' as const,
    nameAr: 'المالكي',
    nameDe: 'Maliki',
    descAr: 'وقت العصر عندما يصبح ظل الشيء مثل طوله — نفس حساب الشافعي',
    descDe: 'Asr wie bei Schafi\'i (Schatten = Objektlänge)',
    school: 0,
  },
  {
    key: 'hanafi' as const,
    nameAr: 'الحنفي',
    nameDe: 'Hanafi',
    descAr: 'وقت العصر عندما يصبح ظل الشيء مثلَي طوله — المعتمد عند الحنفية',
    descDe: 'Asr wenn der Schatten doppelt so lang wie das Objekt ist',
    school: 1,
  },
];

export default function PrayerSettings() {
  const { language, prayerMadhab, setPrayerMadhab } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-primary stroke-[1.8] ltr:rotate-180" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Moon className="w-5 h-5 text-primary stroke-[1.8]" />
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-foreground">
              {isAr ? 'المذهب الفقهي' : 'Gebetsschule'}
            </h1>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div variants={item} className="premium-card-elevated p-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {isAr
              ? 'يؤثر اختيار المذهب على حساب وقت صلاة العصر فقط. المذهب الحنفي يؤخر العصر لأن ظل الشيء يجب أن يصبح مثلَي طوله، بينما المذاهب الأخرى تحسبه عندما يصبح الظل مثل طوله.'
              : 'Die Wahl der Rechtsschule beeinflusst nur die Berechnung der Asr-Gebetszeit. Die hanafitische Schule berechnet Asr später.'}
          </p>
        </motion.div>

        {/* Madhab selection */}
        {MADHABS.map((m) => {
          const isSelected = prayerMadhab === m.key;
          return (
            <motion.div key={m.key} variants={item}>
              <button
                onClick={() => setPrayerMadhab(m.key)}
                className={`w-full premium-card-elevated p-4 transition-all duration-200 active:scale-[0.99] ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-start flex-1">
                    <h2 className="font-semibold text-[15px] text-foreground">
                      {isAr ? m.nameAr : m.nameDe}
                    </h2>
                    <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                      {isAr ? m.descAr : m.descDe}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ms-3 transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
