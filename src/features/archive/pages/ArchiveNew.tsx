import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { AlertCircle, Check, ChevronDown, Sparkles, X } from '@/lib/icons';

import { archiveApi, type ModelConfig } from '../api';
import type { ArchiveDepth, ProgressEvent } from '../types';

const DEPTHS: { key: ArchiveDepth; title: string; subtitle: string; est: string }[] = [
  {
    key: 'standard',
    title: 'قياسي',
    subtitle: '4 × 2 · ~4400 كلمة · بحث + هيكل + كتابة',
    est: '~3 دقائق',
  },
  {
    key: 'deep',
    title: 'متعمّق',
    subtitle: '5 × 3 · ~13500 كلمة · بحث + هيكل + نقد + كتابة + تلميع',
    est: '~8 دقائق',
  },
  {
    key: 'deepest',
    title: 'أقصى عمق',
    subtitle: '6 × 4 · ~31000 كلمة · بحث موسّع + نقد + بحث دقيق لكل فقرة + تلميع',
    est: '~20 دقيقة',
  },
];

const AVAILABLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'claude-3.5-haiku',
  'claude-3.5-sonnet',
  'gpt-4o-mini',
  'gpt-4o',
  'deepseek-chat',
];

// Empty by default — backend picks the right model per depth level.
// User overrides here take precedence server-side.
const DEFAULT_MODELS: ModelConfig = {
  outline: '',
  expansion: '',
  synthesis: '',
};

// Displayed placeholder per depth so users see which model will run.
const DEPTH_AUTO_MODELS: Record<ArchiveDepth, ModelConfig> = {
  standard: {
    outline: 'gemini-2.5-flash',
    expansion: 'gemini-2.5-flash',
    synthesis: 'gemini-2.5-flash',
  },
  deep: { outline: 'gemini-2.5-flash', expansion: 'gemini-2.5-flash', synthesis: 'gemini-2.5-pro' },
  deepest: { outline: 'gemini-2.5-pro', expansion: 'gemini-2.5-pro', synthesis: 'gemini-2.5-pro' },
};

type StageKey =
  | 'idle'
  | 'research'
  | 'outline'
  | 'critique'
  | 'expansion'
  | 'polish'
  | 'synthesis'
  | 'filed'
  | 'error';

type PipelineStage = Exclude<StageKey, 'idle' | 'error'>;
const STAGE_ORDER: PipelineStage[] = [
  'research',
  'outline',
  'critique',
  'expansion',
  'polish',
  'synthesis',
  'filed',
];
const STAGE_LABEL: Record<PipelineStage, string> = {
  research: 'بحث',
  outline: 'هيكل',
  critique: 'نقد',
  expansion: 'توسيع',
  polish: 'تلميع',
  synthesis: 'تجميع',
  filed: 'حُفظ',
};

const STAGE_HEADLINE: Record<PipelineStage, string> = {
  research: 'نمشّط الويب بحثاً عن الحقائق',
  outline: 'نصمّم هيكل المعرفة',
  critique: 'ننقد الهيكل ونشحذه',
  expansion: 'نكتب الفصول واحداً تلو الآخر',
  polish: 'نلمّع اللغة والإيقاع',
  synthesis: 'نجمع الأرشيف ونفهرسه',
  filed: 'اكتمل — نفتح الأرشيف',
};

export default function ArchiveNew() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<ArchiveDepth>('standard');
  const [stage, setStage] = useState<StageKey>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [models, setModels] = useState<ModelConfig>(DEFAULT_MODELS);
  const abortRef = useRef<AbortController | null>(null);

  const running = stage !== 'idle' && stage !== 'error' && stage !== 'filed';

  async function start() {
    if (!topic.trim() || topic.trim().length < 3) return;
    setError(null);
    setStage('outline');
    setMessage('تصميم الهيكل…');
    setProgress({ current: 0, total: 0 });

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Send only explicitly overridden models; empty string = let backend pick per depth.
      const overrides: ModelConfig = {};
      (Object.keys(models) as (keyof ModelConfig)[]).forEach((k) => {
        if (models[k]) overrides[k] = models[k];
      });
      for await (const ev of archiveApi.generate(topic.trim(), depth, overrides, ctrl.signal)) {
        applyEvent(ev);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setStage('idle');
        return;
      }
      console.error(e);
      setError(e?.message || 'حدث خطأ');
      setStage('error');
    }
  }

  function applyEvent(ev: ProgressEvent) {
    if (
      ev.stage === 'research' ||
      ev.stage === 'outline' ||
      ev.stage === 'critique' ||
      ev.stage === 'synthesis'
    ) {
      setStage(ev.stage);
      setMessage(ev.message);
    } else if (ev.stage === 'outline_done' || ev.stage === 'research_done') {
      // no-op; keep spinner
    } else if (ev.stage === 'expansion' || ev.stage === 'polish') {
      setStage(ev.stage);
      setMessage(ev.message);
      setProgress({ current: ev.current, total: ev.total });
    } else if (ev.stage === 'filed') {
      setStage('filed');
      setMessage(`تم الحفظ: ${ev.document.title}`);
      setTimeout(() => navigate(`/archive/${ev.document.id}`), 900);
    } else if (ev.stage === 'error') {
      setError(ev.message);
      setStage('error');
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setStage('idle');
  }

  const stagePercent = (() => {
    if (stage === 'research') return 4;
    if (stage === 'outline') return 12;
    if (stage === 'critique') return 18;
    if (stage === 'expansion' && progress.total > 0)
      return 20 + Math.round((60 * progress.current) / progress.total);
    if (stage === 'polish' && progress.total > 0)
      return 80 + Math.round((12 * progress.current) / progress.total);
    if (stage === 'synthesis') return 96;
    if (stage === 'filed') return 100;
    return 0;
  })();

  return (
    <PageShell>
      <SEO
        title="توليد جديد — الأرشيف المعرفي"
        description="اقترح موضوعاً ومستوى عمقاً لتوليد مونوغراف كامل ومفهرس."
        path="/archive/new"
      />
      <div className="flex items-center gap-3 mb-2">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">توليد جديد</h1>
      </div>

      <AppCard>
        <label className="block text-[13px] font-semibold text-foreground mb-2">الموضوع</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={running}
          placeholder="مثال: فلسفة العطور الشرقية، تاريخ الخط الكوفي، الوعي عند ابن سينا…"
          rows={3}
          className="w-full bg-muted/40 border border-border/40 rounded-xl p-3 text-[15px] outline-none focus:border-primary/50 resize-none"
          style={{ fontSize: 16 }}
          maxLength={500}
        />
        <div className="text-[11px] text-muted-foreground mt-1 text-end">{topic.length}/500</div>
      </AppCard>

      <AppCard>
        <label className="block text-[13px] font-semibold text-foreground mb-3">مستوى العمق</label>
        <div className="flex flex-col gap-2">
          {DEPTHS.map((d) => (
            <button
              key={d.key}
              disabled={running}
              onClick={() => setDepth(d.key)}
              className={`text-start rounded-xl border p-3 transition-all ${
                depth === d.key
                  ? 'border-primary/70 bg-primary/5'
                  : 'border-border/40 bg-muted/20 active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-bold text-foreground">{d.title}</span>
                <span className="text-[11px] text-muted-foreground">{d.est}</span>
              </div>
              <div className="text-[12px] text-muted-foreground">{d.subtitle}</div>
            </button>
          ))}
        </div>
      </AppCard>

      <AppCard>
        <button
          onClick={() => setShowModels(!showModels)}
          disabled={running}
          className="w-full flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-3 text-start text-[13px] font-semibold text-foreground hover:bg-muted/40 transition-all"
        >
          <span>⚙️ إعدادات النماذج</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showModels ? 'rotate-180' : ''}`}
          />
        </button>

        {showModels && (
          <div className="mt-3 space-y-3 pt-3 border-t border-border/20">
            {(['outline', 'expansion', 'synthesis'] as const).map((stage) => (
              <div key={stage}>
                <label className="block text-[12px] font-semibold text-foreground mb-2 capitalize">
                  {stage === 'outline' && '📋 نموذج الهيكل'}
                  {stage === 'expansion' && '✍️ نموذج التوسيع والكتابة'}
                  {stage === 'synthesis' && '🏷️ نموذج التلخيص والوسوم'}
                </label>
                <select
                  value={models[stage] || ''}
                  onChange={(e) => setModels({ ...models, [stage]: e.target.value })}
                  disabled={running}
                  className="w-full bg-muted/40 border border-border/40 rounded-lg p-2 text-[12px] outline-none focus:border-primary/50"
                >
                  <option value="">تلقائي — {DEPTH_AUTO_MODELS[depth][stage]}</option>
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button
              onClick={() => setModels(DEFAULT_MODELS)}
              disabled={running}
              className="w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors py-2 border-t border-border/20 mt-2 pt-2"
            >
              إعادة تعيين للإعدادات الافتراضية
            </button>
          </div>
        )}
      </AppCard>

      {stage === 'idle' && (
        <button
          onClick={start}
          disabled={topic.trim().length < 3}
          className="group relative w-full flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 text-[15px] font-bold disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-transform overflow-hidden"
        >
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <Sparkles className="w-4 h-4" />
          ابدأ التوليد
        </button>
      )}

      <GenerationOverlay
        open={running || stage === 'filed' || stage === 'error'}
        stage={stage}
        message={message}
        progress={progress}
        percent={stagePercent}
        topic={topic}
        error={error}
        onCancel={cancel}
        onRetry={() => {
          setError(null);
          start();
        }}
        onDismiss={() => {
          setError(null);
          setStage('idle');
        }}
      />
    </PageShell>
  );
}

// ─── Cinematic generation overlay ───────────────────────────────────────
interface OverlayProps {
  open: boolean;
  stage: StageKey;
  message: string;
  progress: { current: number; total: number };
  percent: number;
  topic: string;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

function GenerationOverlay({
  open,
  stage,
  message,
  progress,
  percent,
  topic,
  error,
  onCancel,
  onRetry,
  onDismiss,
}: OverlayProps) {
  const isFiled = stage === 'filed';
  const isError = stage === 'error';
  const pipelineStage: PipelineStage = stage === 'idle' || stage === 'error' ? 'research' : stage;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-6 backdrop-blur-2xl"
          style={{
            background: isError
              ? 'radial-gradient(1200px 800px at 50% 20%, hsl(var(--destructive) / 0.22), transparent 60%), radial-gradient(900px 700px at 50% 90%, hsl(var(--destructive) / 0.12), transparent 60%), hsl(var(--background) / 0.9)'
              : 'radial-gradient(1200px 800px at 50% 20%, hsl(var(--live) / 0.18), transparent 60%), radial-gradient(900px 700px at 50% 90%, hsl(var(--primary) / 0.14), transparent 60%), hsl(var(--background) / 0.85)',
          }}
        >
          {/* Breathing ambient rings */}
          {!isError && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 rounded-full border border-primary/20"
                  style={{ width: 240, height: 240, marginLeft: -120, marginTop: -120 }}
                  animate={{ scale: [1, 2.6, 2.6], opacity: [0.5, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 1.3, ease: 'easeOut' }}
                />
              ))}
            </div>
          )}

          {/* Cancel */}
          {!isFiled && !isError && (
            <button
              onClick={onCancel}
              className="absolute top-6 end-6 w-10 h-10 rounded-full bg-muted/60 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
              aria-label="إلغاء"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          )}

          {isError ? (
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="relative flex flex-col items-center max-w-sm w-full"
            >
              <motion.div
                className="relative w-24 h-24 rounded-full bg-destructive/15 border border-destructive/50 flex items-center justify-center mb-6"
                animate={{ x: [0, -6, 6, -4, 4, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <AlertCircle className="w-11 h-11 text-destructive" strokeWidth={2} />
              </motion.div>
              <h2 className="text-center text-lg font-bold text-foreground mb-2 tracking-tight">
                تعذّر إتمام التوليد
              </h2>
              <div className="max-w-sm text-center text-[12px] text-muted-foreground mb-2 line-clamp-2 px-4">
                « {topic} »
              </div>
              <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-3 mb-5">
                <p className="text-[12px] text-foreground/85 leading-relaxed text-center">
                  {error || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.'}
                </p>
              </div>
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={onRetry}
                  className="w-full rounded-full bg-primary text-primary-foreground py-3 text-[14px] font-bold active:scale-95 transition-transform"
                >
                  إعادة المحاولة
                </button>
                <button
                  onClick={onDismiss}
                  className="w-full rounded-full bg-muted/60 text-foreground py-3 text-[13px] font-semibold active:scale-95 transition-transform"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Central orb */}
              <motion.div
                className="relative mb-8 flex items-center justify-center"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              >
                {!isFiled ? (
                  <>
                    <motion.div
                      className="absolute w-40 h-40 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 0deg, hsl(var(--primary) / 0), hsl(var(--live) / 0.6), hsl(var(--primary) / 0.9), hsl(var(--primary) / 0))',
                        filter: 'blur(2px)',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute w-28 h-28 rounded-full border border-primary/40"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      <span className="absolute -top-1 left-1/2 w-2 h-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                    </motion.div>
                    <motion.div
                      className="relative w-20 h-20 rounded-full bg-primary/15 backdrop-blur flex items-center justify-center border border-primary/40"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="w-7 h-7 text-primary" />
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    className="relative w-24 h-24 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center"
                    initial={{ scale: 0.4, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  >
                    <Check className="w-10 h-10 text-primary" strokeWidth={2.5} />
                    {[...Array(8)].map((_, i) => (
                      <motion.span
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full bg-primary"
                        initial={{ x: 0, y: 0, opacity: 1 }}
                        animate={{
                          x: Math.cos((i / 8) * Math.PI * 2) * 70,
                          y: Math.sin((i / 8) * Math.PI * 2) * 70,
                          opacity: 0,
                        }}
                        transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>

              {/* Headline */}
              <AnimatePresence mode="wait">
                <motion.h2
                  key={pipelineStage}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center text-lg font-bold text-foreground mb-1.5 tracking-tight"
                >
                  {STAGE_HEADLINE[pipelineStage] ?? '...'}
                </motion.h2>
              </AnimatePresence>

              {/* Topic chip */}
              <div className="max-w-sm text-center text-[12px] text-muted-foreground mb-6 line-clamp-2 px-4">
                « {topic} »
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm">
                <div className="relative h-1 rounded-full bg-muted/50 overflow-hidden mb-3">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--live)), hsl(var(--primary)))',
                      backgroundSize: '200% 100%',
                    }}
                    animate={{ width: `${percent}%`, backgroundPosition: ['0% 0%', '200% 0%'] }}
                    transition={{
                      width: { duration: 0.6, ease: 'easeOut' },
                      backgroundPosition: { duration: 2.5, repeat: Infinity, ease: 'linear' },
                    }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={message}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between text-[12px] text-muted-foreground mb-5"
                  >
                    <span className="truncate flex-1">{message}</span>
                    {progress.total > 0 && (
                      <span className="tabular-nums shrink-0 ms-2">
                        {progress.current}/{progress.total}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Stage stepper */}
                <div className="flex gap-1">
                  {STAGE_ORDER.map((s, i) => {
                    const currentIdx = STAGE_ORDER.indexOf(pipelineStage);
                    const isActive = s === pipelineStage;
                    const isDone = currentIdx > i;
                    return (
                      <div key={s} className="flex-1 flex flex-col items-center gap-1">
                        <div className="relative w-full h-1 rounded-full bg-muted/40 overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-primary rounded-full"
                            initial={false}
                            animate={{ width: isDone ? '100%' : isActive ? '60%' : '0%' }}
                            transition={{ duration: 0.5 }}
                          />
                          {isActive && (
                            <motion.div
                              className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-primary to-transparent"
                              animate={{ x: ['-100%', '400%'] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                            />
                          )}
                        </div>
                        <span
                          className={`text-[9px] ${isActive ? 'text-primary font-bold' : isDone ? 'text-foreground/70' : 'text-muted-foreground/60'}`}
                        >
                          {STAGE_LABEL[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
