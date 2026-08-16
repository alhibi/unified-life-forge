import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, ArrowLeft, CheckCircle2, RotateCcw } from '@/lib/icons';

interface ScenarioScenario {
  id: string;
  title_ar: string;
  title_de: string;
  location_ar: string;
  partner_name: string;
  opening_de: string;
  opening_ar: string;
  options: {
    id: string;
    text_de: string;
    text_ar: string;
    is_best: boolean;
    feedback_ar: string;
    response_de: string;
    response_ar: string;
  }[];
}

const SCENARIOS: ScenarioScenario[] = [
  {
    id: 'sc-01',
    title_ar: 'طلب القهوة في مقاهي ميته (Mitte)',
    title_de: 'Kaffee bestellen in Berlin Mitte',
    location_ar: 'مقهى عصري في برلين',
    partner_name: 'Barista Lukas',
    opening_de: 'Hallo! Was darf es für dich sein?',
    opening_ar: 'أهلاً! شو بتحب تطلب؟',
    options: [
      {
        id: 'opt-1',
        text_de: 'Einen Hafer-Cappuccino zum Mitnehmen, bitte!',
        text_ar: 'كابتشينو بشوفان سفري، لو سمحت!',
        is_best: true,
        feedback_ar: 'رد طبيعي ومباشر 100% مستخدم يومياً في برلين!',
        response_de: 'Sehr gerne! Macht 4,20 Euro. Mit Karte?',
        response_ar: 'تكرم! الحساب 4.20 يورو. بالبطاقة؟',
      },
      {
        id: 'opt-2',
        text_de: 'Geben Sie mir sofort Kaffee!',
        text_ar: 'أعطني قهوة فوراً!',
        is_best: false,
        feedback_ar: 'أسلوب مباشر جداً وجاف قد يبدو غير تهذيبي في المقهى.',
        response_de: 'Äh... ja, Moment bitte.',
        response_ar: 'أمم... نعم، لحظة من فضلك.',
      },
    ],
  },
  {
    id: 'sc-02',
    title_ar: 'دفع الحساب وإعطاء البقشيش',
    title_de: 'Zahlen & Trinkgeld geben',
    location_ar: 'مطعم ألماني في ميونخ',
    partner_name: 'Kellnerin Sophie',
    opening_de: 'Hat es Ihnen geschmeckt? Möchten Sie bezahlen?',
    opening_ar: 'هل كان الطعام لذيذاً؟ هل تحبون دفع الحساب؟',
    options: [
      {
        id: 'opt-a',
        text_de: 'Es war super! Stimmt so, danke.',
        text_ar: 'كان ممتازاً! خلي الباقي مع المحاسب، شكراً.',
        is_best: true,
        feedback_ar: 'تعبير أرقى لترك البقشيش (Trinkgeld) بالنظام الألماني الأصيل.',
        response_de: 'Vielen Dank! Schönen Tag noch!',
        response_ar: 'شكراً جزيلاً! أتمنى لك يوماً جميلاً!',
      },
      {
        id: 'opt-b',
        text_de: 'Ich gebe kein Trinkgeld.',
        text_ar: 'أنا لا أدفع إكرامية.',
        is_best: false,
        feedback_ar: 'حرج اجتماعي خفيف، حيث يفضل ترك 5-10% إكرامية دائماً.',
        response_de: 'Alles klar, danke trotzdem.',
        response_ar: 'حسناً، شكراً على أية حال.',
      },
    ],
  },
];

export const DeutschScenarioSimulator: React.FC = () => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('sc-01');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  const selectedOption = scenario.options.find((o) => o.id === selectedOptionId);

  return (
    <div className="space-y-6">
      <div className="text-end space-y-1">
        <div className="flex items-center gap-2 justify-end">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-tajawal text-micro font-bold uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-rose-400" />
            محاكي المواقف المباشر
          </span>
        </div>
        <h3 className="font-amiri text-display font-bold text-foreground">
          محاكي محادثات الحياة الواقعية
        </h3>
        <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
          تدرب على اتخاذ القرار اللغوي المناسب في مواقف حقيقية مع ردود فعل وتحليل ثقافي فوري.
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => {
              setActiveScenarioId(sc.id);
              setSelectedOptionId(null);
            }}
            className={`shrink-0 px-3.5 py-2 rounded-xl border font-tajawal text-mini font-bold transition-all ${
              activeScenarioId === sc.id
                ? 'bg-card text-rose-400 border-rose-500/40 shadow-sm'
                : 'bg-secondary/30 text-muted-foreground border-border/40'
            }`}
          >
            {sc.title_ar}
          </button>
        ))}
      </div>

      {/* Active Conversation Card */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <span className="font-tajawal text-micro font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
            {scenario.location_ar}
          </span>
          <h4 className="font-plex-mono text-meta font-extrabold text-foreground" dir="ltr">
            {scenario.title_de}
          </h4>
        </div>

        {/* Conversation Bubble */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/30 space-y-1 text-start" dir="ltr">
            <span className="block font-tajawal text-micro font-bold text-rose-400">{scenario.partner_name}</span>
            <p className="font-plex-mono font-extrabold text-foreground text-meta">{scenario.opening_de}</p>
            <p className="font-tajawal text-mini text-muted-foreground" dir="rtl">{scenario.opening_ar}</p>
          </div>

          {!selectedOption ? (
            <div className="space-y-2 pt-2 text-end">
              <span className="block font-tajawal text-micro font-bold text-muted-foreground">اختر رداً ألمانياً مناسباً:</span>
              <div className="grid grid-cols-1 gap-2.5">
                {scenario.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className="p-3.5 rounded-xl border border-border/40 bg-background hover:border-rose-500/40 hover:bg-rose-500/5 text-end transition-all space-y-0.5"
                  >
                    <p className="font-plex-mono font-extrabold text-foreground text-meta" dir="ltr">
                      {opt.text_de}
                    </p>
                    <p className="font-tajawal text-mini text-muted-foreground">
                      {opt.text_ar}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-2"
              >
                {/* User Selected Response */}
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-end space-y-1">
                  <span className="block font-tajawal text-micro font-bold text-rose-400">ردك الاختياري</span>
                  <p className="font-plex-mono font-extrabold text-foreground text-meta" dir="ltr">{selectedOption.text_de}</p>
                  <p className="font-tajawal text-mini text-muted-foreground">{selectedOption.text_ar}</p>
                </div>

                {/* Partner Feedback & Reaction */}
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/30 space-y-1 text-start" dir="ltr">
                  <span className="block font-tajawal text-micro font-bold text-rose-400">{scenario.partner_name}</span>
                  <p className="font-plex-mono font-extrabold text-foreground text-meta">{selectedOption.response_de}</p>
                  <p className="font-tajawal text-mini text-muted-foreground" dir="rtl">{selectedOption.response_ar}</p>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 text-end space-y-0.5">
                  <span className="block font-tajawal text-micro font-bold text-rose-400">💡 التحليل الثقافي للرد</span>
                  <p className="font-tajawal text-mini text-foreground">{selectedOption.feedback_ar}</p>
                </div>

                <button
                  onClick={() => setSelectedOptionId(null)}
                  className="w-full py-2.5 rounded-xl border border-border/40 bg-secondary/50 text-foreground font-tajawal text-mini font-bold hover:bg-secondary transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>إعادة المحاولة مع خيار آخر</span>
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
