import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StateView } from '@/components/ui/state-view';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Sparkles,
} from '@/lib/icons';

import { archiveApi, type ModelConfig } from '../api';
import type { ArchiveDepth, ProgressEvent } from '../types';

const DEPTHS: { key: ArchiveDepth; title: string; subtitle: string; est: string }[] = [
  {
    key: 'standard',
    title: 'قياسي (السرعة والخفة)',
    subtitle: '4 × 2 · ~4800 كلمة · بحث هجين + تصميم الهيكل + كتابة كامل الفصول',
    est: '~45 ثانية (متوازي)',
  },
  {
    key: 'deep',
    title: 'متعمّق (الرصانة الأكاديمية)',
    subtitle:
      '5 × 3 · ~14250 كلمة · بحث هجين + هيكل مفصل + نقد ذاتي للهيكل + كتابة غنية + تلميع لغوي',
    est: '~1.5 دقيقة (متوازي)',
  },
  {
    key: 'deepest',
    title: 'الأطروحة الموسوعية الإمبراطورية (البُعد الأقصى)',
    subtitle:
      '7 × 4 · ~45000 كلمة · مونوغراف فخم كالأطروحات الفلسفية الكبرى + مراجعة ونقد صارم + بحث ويب ميكرو تفصيلي لكل فقرة + تلميع أدبي بليغ ومبهر',
    est: '~2.5 دقيقة (تسريع فائق)',
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
  'deepseek-r1',
  'o3-mini',
  'o1-mini',
  'o1',
  'qwen-2.5-72b',
  'llama-3.3-70b',
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

const AUTO = '__auto__';

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
  research: 'نمشّط الويب بحثاً عن الحقائق والأفكار',
  outline: 'نصمّم هيكل المعرفة الكوني',
  critique: 'ننقد الهيكل المعرفي ونشحذه بذكاء',
  expansion: 'نكتب الفصول بالتوازي لسرعة خارقة ورصانة قصوى',
  polish: 'نلمّع جودة السرد والإيقاع والأدبيات',
  synthesis: 'نجمع الأرشيف ونخرجه بجمالية فائقة',
  filed: 'اكتمل بنجاح — يتم فتح الأرشيف الآن',
};

const MIN_TOPIC = 3;

export default function ArchiveNew() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [touched, setTouched] = useState(false);
  const [depth, setDepth] = useState<ArchiveDepth>('standard');
  const [stage, setStage] = useState<StageKey>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [models, setModels] = useState<ModelConfig>(DEFAULT_MODELS);
  const abortRef = useRef<AbortController | null>(null);

  const running = stage !== 'idle' && stage !== 'error' && stage !== 'filed';
  const trimmedTopic = topic.trim();
  const topicValid = trimmedTopic.length >= MIN_TOPIC;
  const showTopicError = touched && topic.length > 0 && !topicValid;
  const selectedDepth = DEPTHS.find((d) => d.key === depth);

  async function start() {
    if (!topicValid) {
      setTouched(true);
      return;
    }
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
      for await (const ev of archiveApi.generate(trimmedTopic, depth, overrides, ctrl.signal)) {
        applyEvent(ev);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setStage('idle');
        return;
      }
      console.error(e);
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      setError(message);
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
      <PageHeader
        title={'توليد جديد'}
        subtitle={'من موضوع واحد إلى مونوغراف مفهرس برقم أرشيفي'}
      />

      <div className="app-stack" aria-busy={running || undefined}>
        <p className="text-meta leading-relaxed text-muted-foreground">
          {'اكتب موضوعاً محدّداً بما يكفي ليتفرّع إلى فصول: كلما كان أوضح، كان الهيكل أدقّ والكتابة أعمق.'}
        </p>

        <AppCard>
          <Label htmlFor="archive-topic" className="mb-2 block text-mini font-semibold text-foreground">
            {'الموضوع'}
          </Label>
          <Textarea
            id="archive-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={running}
            placeholder="مثال: فلسفة العطور الشرقية، تاريخ الخط الكوفي، الوعي عند ابن سينا…"
            rows={3}
            className="resize-none"
            maxLength={500}
            aria-invalid={showTopicError || undefined}
            aria-describedby="archive-topic-hint"
          />
          <div className="mt-1 flex items-start justify-between gap-3">
            <p
              id="archive-topic-hint"
              className={`min-h-4 text-micro leading-relaxed ${showTopicError ? 'text-destructive' : 'text-muted-foreground'}`}
              aria-live="polite"
            >
              {showTopicError ? (
                <span className="inline-flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {'الموضوع قصير جداً — أضف كلمة أوضح حتى يبدأ المحرك.'}
                </span>
              ) : (
                `اكتب ${MIN_TOPIC} أحرف على الأقل.`
              )}
            </p>
            <span className="text-micro tabular-nums text-muted-foreground shrink-0">
              {topic.length}/500
            </span>
          </div>
        </AppCard>

        <AppCard>
          <h2 className="mb-1 text-mini font-semibold text-foreground">{'مستوى العمق المعرفي'}</h2>
          <p className="mb-3 text-micro leading-relaxed text-muted-foreground">
            {'العمق يحدّد عدد الفصول وحجم المستند ووقت التوليد — لا يمكن تغييره بعد البدء.'}
          </p>
          <AppList>
            {DEPTHS.map((d) => {
              const selected = depth === d.key;
              return (
                <AppRow
                  key={d.key}
                  disabled={running}
                  onClick={() => setDepth(d.key)}
                  className={selected ? 'bg-primary/10' : undefined}
                  title={d.title}
                  subtitle={d.subtitle}
                  value={d.est}
                >
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                </AppRow>
              );
            })}
          </AppList>
        </AppCard>

        <AppCard>
          <button
            type="button"
            onClick={() => setShowModels(!showModels)}
            disabled={running}
            aria-expanded={showModels}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 text-start text-mini font-semibold text-foreground transition-motion hover:bg-muted/40 app-focus-ring disabled:opacity-60"
          >
            <span>{'إعدادات النماذج والذكاء الاصطناعي'}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${showModels ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {showModels && (
            <div className="mt-3 space-y-3 border-t border-border/20 pt-3">
              {(['outline', 'expansion', 'synthesis'] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`archive-model-${key}`} className="text-mini font-semibold">
                    {key === 'outline' && 'نموذج الهيكل والبحث'}
                    {key === 'expansion' && 'نموذج التوسيع والكتابة'}
                    {key === 'synthesis' && 'نموذج التلخيص والوسوم'}
                  </Label>
                  <Select
                    value={models[key] || AUTO}
                    onValueChange={(v) =>
                      setModels({ ...models, [key]: v === AUTO ? '' : v })
                    }
                    disabled={running}
                  >
                    <SelectTrigger id={`archive-model-${key}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO}>
                        {`تلقائي — ${DEPTH_AUTO_MODELS[depth][key]}`}
                      </SelectItem>
                      {AVAILABLE_MODELS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setModels(DEFAULT_MODELS)}
                disabled={running}
              >
                {'إعادة تعيين للإعدادات الافتراضية'}
              </Button>
            </div>
          )}
        </AppCard>

        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={start}
            disabled={!topicValid || running}
            isLoading={running}
            loadingText="جارٍ التوليد…"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {'ابدأ التوليد'}
          </Button>
          <p className="text-center text-micro tabular-nums text-muted-foreground">
            {selectedDepth ? `الوقت المتوقّع ${selectedDepth.est}` : null}
          </p>
        </div>
      </div>

      <GenerationOverlay
        open={running || stage === 'filed' || stage === 'error'}
        stage={stage}
        message={message}
        progress={progress}
        percent={stagePercent}
        topic={trimmedTopic}
        error={error}
        onCancel={cancel}
        onRetry={() => {
          setError(null);
          void start();
        }}
        onDismiss={() => {
          setError(null);
          setStage('idle');
        }}
      />
    </PageShell>
  );
}

// ─── Generation state surface (in-progress / filed / error) ──────────────
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
  const currentIdx = STAGE_ORDER.indexOf(pipelineStage);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-nested grid place-items-center overflow-y-auto p-4 app-scrim"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-generation-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[calc(var(--ui-content-max)+4rem)] rounded-2xl border border-border bg-overlay-surface p-5 text-start shadow-elevation-3"
          >
            {isError ? (
              <StateView
                kind="error"
                bare
                title="تعذّر إتمام التوليد"
                body={error || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم. الموضوع الذي كتبته محفوظ هنا، ويمكنك إعادة المحاولة.'}
                actions={
                  <div className="mt-1 flex flex-col gap-2 w-full max-w-xs">
                    <Button onClick={onRetry} isLoading={false}>
                      {'إعادة المحاولة'}
                    </Button>
                    <Button variant="ghost" onClick={onDismiss}>
                      {'العودة للنموذج دون فقدان الموضوع'}
                    </Button>
                  </div>
                }
              >
                <p className="text-micro text-muted-foreground line-clamp-2">{`« ${topic} »`}</p>
              </StateView>
            ) : isFiled ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-6 w-6" aria-hidden />
                </span>
                <h2 id="archive-generation-title" className="text-title font-bold text-foreground">
                  {'اكتمل المونوغراف وحُفظ في الأرشيف'}
                </h2>
                <p className="max-w-sm text-mini leading-relaxed text-muted-foreground">
                  {message || 'يتم فتح المستند الآن.'}
                </p>
                <p className="text-micro text-muted-foreground line-clamp-2">{`« ${topic} »`}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-micro tabular-nums text-muted-foreground">
                    {`${percent}٪ · ${selectedStageLabel(pipelineStage)}`}
                  </p>
                  <h2 id="archive-generation-title" className="text-title font-bold leading-snug text-foreground">
                    {STAGE_HEADLINE[pipelineStage] ?? '…'}
                  </h2>
                  <p className="text-mini text-muted-foreground line-clamp-2">{`« ${topic} »`}</p>
                </div>

                <div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-track">
                    <motion.div
                      className="absolute inset-y-0 start-0 rounded-full bg-primary"
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-mini text-muted-foreground">
                    <span className="truncate">{message}</span>
                    {progress.total > 0 && (
                      <span className="shrink-0 tabular-nums">
                        {progress.current}/{progress.total}
                      </span>
                    )}
                  </div>
                </div>

                <ol className="grid grid-cols-7 gap-1" aria-label="مراحل التوليد">
                  {STAGE_ORDER.map((s, i) => {
                    const isActive = s === pipelineStage;
                    const isDone = currentIdx > i;
                    return (
                      <li key={s} className="flex flex-col items-center gap-1.5">
                        <span
                          aria-hidden
                          className={`h-1 w-full rounded-full ${isDone ? 'bg-primary' : isActive ? 'bg-primary/60' : 'bg-track'}`}
                        />
                        <span
                          className={`text-micro ${isActive ? 'font-bold text-primary' : isDone ? 'text-foreground/70' : 'text-muted-foreground-subtle'}`}
                        >
                          {STAGE_LABEL[s]}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                <div className="flex justify-end border-t border-border/50 pt-3">
                  <Button variant="outline" size="sm" onClick={onCancel}>
                    {'إلغاء التوليد'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function selectedStageLabel(stage: PipelineStage): string {
  return STAGE_LABEL[stage];
}
