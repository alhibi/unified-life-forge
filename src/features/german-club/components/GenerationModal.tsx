import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Flame,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from '@/lib/icons';

import {
  GENDER_COLORS,
  GermanGender,
  GermanRegister,
  OpenRouterModelItem,
  REGISTER_LABELS_AR,
  REJECTION_REASON_LABELS_AR,
  StrictnessLevel,
} from '../types';

interface GenerationJobRow {
  id: string;
  shelf_id: string;
  model_id: string;
  mode: 'model_capacity' | 'fixed_count';
  target_count: number | null;
  strictness: StrictnessLevel;
  register_targets: GermanRegister[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  entries_generated: number;
  entries_skipped_duplicate: number;
  entries_discarded_low_quality: number;
  estimated_cost_usd: number;
  error_message: string | null;
}

interface JobRejectionRow {
  id: string;
  job_id: string;
  candidate_text: string;
  reason: 'duplicate' | 'gender_uncertain' | 'register_mismatch' | 'shelf_mismatch' | 'low_confidence';
  created_at: string;
}

interface JobAcceptedEntryStub {
  id: string;
  german_text: string;
  gender: GermanGender;
}

interface GenerationModalProps {
  shelfId: string;
  shelfSlug: string;
  shelfTitleAr: string;
  shelfTitleDe?: string | null;
  shelfDescriptionAr?: string | null;
  currentEntryCount: number;
  targetCount?: number;
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'model_selection' | 'generation_options' | 'generating' | 'summary';

export const GenerationModal: React.FC<GenerationModalProps> = ({
  shelfId,
  shelfSlug,
  shelfTitleAr,
  shelfTitleDe,
  shelfDescriptionAr,
  currentEntryCount,
  targetCount = 25,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  // Wizard active step state
  const [step, setStep] = useState<WizardStep>('model_selection');

  // Model selection state
  const [models, setModels] = useState<OpenRouterModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [modelSearch, setModelSearch] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelItem | null>(null);

  // Control levers state
  const [mode, setMode] = useState<'model_capacity' | 'fixed_count'>('model_capacity');
  const [fixedCount, setFixedCount] = useState<number>(20);
  const [strictness, setStrictness] = useState<StrictnessLevel>('balanced');
  const [registerTargets, setRegisterTargets] = useState<GermanRegister[]>([]);

  // Execution & Live progress state
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJobRow | null>(null);
  const [isStartingJob, setIsStartingJob] = useState<boolean>(false);
  const [jobError, setJobError] = useState<string | null>(null);

  // Live shelf slotting and rejections feed
  const [acceptedStubs, setAcceptedStubs] = useState<JobAcceptedEntryStub[]>([]);
  const [rejections, setRejections] = useState<JobRejectionRow[]>([]);
  const [isRejectionsExpanded, setIsRejectionsExpanded] = useState<boolean>(false);

  // Fetch OpenRouter models with performance stats
  const fetchModels = useCallback(
    async (query = '') => {
      setIsLoadingModels(true);
      try {
        const { data, error } = await supabase.functions.invoke('openrouter-list-models', {
          body: { query, shelf_id: shelfId },
        });

        if (!error && data?.models && Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel((prev) => prev ?? data.models[0]);
        } else {
          // Fallback curated model suite if edge function fails or API key unavailable locally
          const fallbackModels: OpenRouterModelItem[] = [
            {
              id: 'google/gemini-2.5-flash',
              name: 'Google: Gemini 2.5 Flash',
              context_length: 1048576,
              pricing: { prompt: 0.075, completion: 0.3 },
              performance: { badge_text: 'الأعلى كفاءة وسرعة' },
            },
            {
              id: 'deepseek/deepseek-chat',
              name: 'DeepSeek: DeepSeek V3',
              context_length: 64000,
              pricing: { prompt: 0.14, completion: 0.28 },
              performance: { badge_text: 'أداء لغوي دقيق جدًا' },
            },
            {
              id: 'anthropic/claude-3.5-sonnet',
              name: 'Anthropic: Claude 3.5 Sonnet',
              context_length: 200000,
              pricing: { prompt: 3.0, completion: 15.0 },
              performance: { badge_text: 'فائقة الجودة اللغوية' },
            },
            {
              id: 'openai/gpt-4o-mini',
              name: 'OpenAI: GPT-4o Mini',
              context_length: 128000,
              pricing: { prompt: 0.15, completion: 0.6 },
              performance: { badge_text: 'اقتصادي ومتزن' },
            },
            {
              id: 'qwen/qwen-2.5-72b-instruct',
              name: 'Qwen: Qwen 2.5 72B Instruct',
              context_length: 131072,
              pricing: { prompt: 0.35, completion: 0.4 },
              performance: { badge_text: 'ممتاز في اللغات' },
            },
          ];
          setModels(fallbackModels);
          setSelectedModel((prev) => prev ?? fallbackModels[0]);
        }
      } catch (err) {
        console.error('Failed to list OpenRouter models:', err);
      } finally {
        setIsLoadingModels(false);
      }
    },
    [shelfId],
  );

  // Fetch accepted entries generated by this job
  const fetchJobAcceptedEntries = useCallback(async (jId: string) => {
    const { data } = await supabase
      .from('german_club_entries')
      .select('id, german_text, gender')
      .eq('generation_job_id', jId)
      .order('created_at', { ascending: true });

    if (data) {
      setAcceptedStubs(data as JobAcceptedEntryStub[]);
    }
  }, []);

  // Fetch rejections for this job
  const fetchJobRejections = useCallback(async (jId: string) => {
    const { data } = await supabase
      .from('generation_job_rejections')
      .select('*')
      .eq('job_id', jId)
      .order('created_at', { ascending: false });

    if (data) {
      setRejections(data as JobRejectionRow[]);
    }
  }, []);

  // Check if a job is already running for this shelf
  const checkRunningJob = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_generation_jobs')
        .select('*')
        .eq('shelf_id', shelfId)
        .in('status', ['queued', 'running'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setJobId(data.id);
        setJob(data as GenerationJobRow);
        setStep('generating');
        void fetchJobAcceptedEntries(data.id);
        void fetchJobRejections(data.id);
      }
    } catch (err) {
      console.warn('Failed to check running job status:', err);
    }
  }, [shelfId, fetchJobAcceptedEntries, fetchJobRejections]);

  // Reset state on modal open. The async IIFE keeps the loaders off the
  // effect's synchronous phase (each one sets its own loading flag), so opening
  // the dialog never cascades renders through the parent commit.
  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      await Promise.all([fetchModels(''), checkRunningJob()]);
    })();
  }, [isOpen, fetchModels, checkRunningJob]);

  // Realtime subscription for running job, live entries, and rejections
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`furnace_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_generation_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as GenerationJobRow;
          setJob(updated);
          if (updated.status === 'completed' || updated.status === 'failed') {
            setStep('summary');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'german_club_entries',
          filter: `generation_job_id=eq.${jobId}`,
        },
        (payload) => {
          const newEntry = payload.new as JobAcceptedEntryStub;
          setAcceptedStubs((prev) => [...prev, newEntry]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generation_job_rejections',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newRejection = payload.new as JobRejectionRow;
          setRejections((prev) => [newRejection, ...prev]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId]);

  // Vendor options for filtering models
  const vendors = [
    { id: 'all', label: 'جميع الشركات' },
    { id: 'google', label: 'Google' },
    { id: 'deepseek', label: 'DeepSeek' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'qwen', label: 'Qwen' },
  ];

  // Filter models by vendor and search query
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (vendorFilter !== 'all' && !m.id.toLowerCase().includes(vendorFilter)) {
        return false;
      }
      if (
        modelSearch &&
        !m.id.toLowerCase().includes(modelSearch.toLowerCase()) &&
        !m.name.toLowerCase().includes(modelSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [models, vendorFilter, modelSearch]);

  // Pre-start live estimate calculation
  const liveEstimate = useMemo(() => {
    if (!selectedModel) return { estCount: 0, estCostUsd: 0 };

    const estimatedEntries =
      mode === 'fixed_count' ? fixedCount : Math.max(targetCount - currentEntryCount, 15);

    const candidatesCount = Math.ceil(estimatedEntries * 1.35);
    const estPromptTokens = candidatesCount * 120;
    const estCompletionTokens = candidatesCount * 140;

    const promptCost = (estPromptTokens / 1000000) * (selectedModel.pricing?.prompt || 0.1);
    const completionCost = (estCompletionTokens / 1000000) * (selectedModel.pricing?.completion || 0.3);
    const totalCost = promptCost + completionCost;

    return {
      estCount: estimatedEntries,
      estCostUsd: Math.max(totalCost, 0.0005),
    };
  }, [selectedModel, mode, fixedCount, targetCount, currentEntryCount]);

  // Toggle register emphasis
  const toggleRegister = (reg: GermanRegister) => {
    setRegisterTargets((prev) =>
      prev.includes(reg) ? prev.filter((r) => r !== reg) : [...prev, reg]
    );
  };

  const handleStartGeneration = async () => {
    if (!selectedModel) return;

    setIsStartingJob(true);
    setJobError(null);
    setAcceptedStubs([]);
    setRejections([]);

    try {
      // The jobs table is server-write only, so the edge function creates the job
      // row with the service role and hands the real id back for realtime tracking.
      const { data: fnData, error: invokeErr } = await supabase.functions.invoke(
        'german-club-generate-content',
        {
          body: {
            create_job: true,
            shelf_id: shelfId,
            shelf_slug: shelfSlug,
            shelf_title_ar: shelfTitleAr,
            shelf_title_de: shelfTitleDe ?? null,
            shelf_description_ar: shelfDescriptionAr ?? null,
            shelf_target_count: targetCount,
            model_id: selectedModel.id,
            mode,
            target_count: mode === 'fixed_count' ? fixedCount : undefined,
            strictness,
            register_targets: registerTargets,
            situation_brief: shelfDescriptionAr ?? shelfTitleAr,
          },
        }
      );

      if (invokeErr) {
        setJobError(`تعذر الاتصال بفرن التوليد: ${invokeErr.message}`);
        return;
      }
      if (fnData?.error) {
        setJobError(`خطأ من وحدة التوليد: ${fnData.error}`);
        return;
      }

      const createdJobId: string | null = fnData?.job_id ?? null;
      if (!createdJobId) {
        setJobError('لم يُصدر الفرن رقم مهمة صالحًا.');
        return;
      }

      setJobId(createdJobId);
      setJob(
        (fnData.job as GenerationJobRow | null) ?? {
          id: createdJobId,
          shelf_id: shelfId,
          model_id: selectedModel.id,
          mode,
          target_count: mode === 'fixed_count' ? fixedCount : null,
          strictness,
          register_targets: registerTargets,
          status: 'running',
          entries_generated: 0,
          entries_skipped_duplicate: 0,
          entries_discarded_low_quality: 0,
          estimated_cost_usd: liveEstimate.estCostUsd,
          error_message: null,
        }
      );
      setStep('generating');
    } catch (err) {
      setJobError((err as Error)?.message || 'Error starting furnace generation job');
    } finally {
      setIsStartingJob(false);
    }
  };

  if (!isOpen) return null;

  const isJobActive = Boolean(job && (job.status === 'queued' || job.status === 'running'));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
        aria-label="الفرن — وحدة التوليد بالذكاء الاصطناعي"
      >
        {/* Panel Header */}
        <DialogHeader className="gap-0 border-b border-track bg-secondary px-5 py-4 pe-14">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-signal/60 bg-foreground">
              <span className="font-mono text-lead font-black text-signal">D</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lead font-extrabold leading-tight text-foreground">
                  الفرن — وحدة التوليد بالذكاء الاصطناعي v2
                </DialogTitle>
                <span className="rounded-full border border-signal/30 bg-signal/15 px-2 py-0.5 font-mono text-micro font-bold text-signal">
                  OpenRouter API
                </span>
              </div>
              <DialogDescription className="mt-0.5 text-mini font-medium text-muted-foreground">
                الرف: <span className="font-bold text-primary">{shelfTitleAr}</span>{' '}
                {shelfTitleDe ? `(${shelfTitleDe})` : ''} • (
                <span className="tabular-nums">{currentEntryCount}</span>/
                <span className="tabular-nums">{targetCount}</span> عنصر)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Wizard Progress Bar Stepper Header */}
        {!isJobActive && step !== 'summary' && (
          <div className="flex items-center justify-between border-b border-track px-5 py-2.5 text-mini">
            <button
              type="button"
              onClick={() => setStep('model_selection')}
              className={`flex items-center gap-2 font-bold transition-motion ${
                step === 'model_selection'
                  ? 'text-signal'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-micro ${
                  step === 'model_selection'
                    ? 'bg-signal text-signal-foreground'
                    : 'bg-secondary text-foreground'
                }`}
              >
                1
              </span>
              <span>1. اختيار النموذج المقبول</span>
            </button>

            <span className="text-muted-foreground">←</span>

            <button
              type="button"
              disabled={!selectedModel}
              onClick={() => selectedModel && setStep('generation_options')}
              className={`flex items-center gap-2 font-bold transition-motion ${
                step === 'generation_options'
                  ? 'text-signal'
                  : 'text-muted-foreground hover:text-foreground'
              } ${!selectedModel ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-micro ${
                  step === 'generation_options'
                    ? 'bg-signal text-signal-foreground'
                    : 'bg-secondary text-foreground'
                }`}
              >
                2
              </span>
              <span>2. نمط وضوابط التوليد</span>
            </button>
          </div>
        )}

        {/* Panel Body */}
        <div className="space-y-5 p-5 text-body">
          {/* STEP 1: MODEL SELECTION STAGE */}
          {step === 'model_selection' && !isJobActive && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-body font-extrabold text-foreground">
                    <Cpu className="h-4 w-4 text-signal" aria-hidden />
                    <span>اختر نموذج الذكاء الاصطناعي المناسب لرفك من OpenRouter:</span>
                  </h3>
                  <p className="mt-0.5 text-mini text-muted-foreground">
                    يتم استدعاء النماذج مباشرةً بواسطة مفتاح OpenRouter مع مراقبة الأداء والتكلفة لكل 1M توكن.
                  </p>
                </div>
                <IconButton
                  onClick={() => fetchModels(modelSearch)}
                  title="تحديث قائمة النماذج"
                  aria-label="تحديث قائمة النماذج"
                  className="shrink-0"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`}
                    aria-hidden
                  />
                </IconButton>
              </div>

              {/* Vendor Category Filter Chips */}
              <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-1 text-mini">
                {vendors.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVendorFilter(v.id)}
                    className={`shrink-0 rounded-full border px-3 py-1 font-bold transition-motion ${
                      vendorFilter === v.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-track bg-secondary/50 text-foreground hover:bg-secondary'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Model Search Input */}
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="text"
                  placeholder="ابحث باسم الموديل أو المعرف (gpt-4o, gemini, claude, deepseek, qwen)..."
                  value={modelSearch}
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                  }}
                  className="ps-9"
                  aria-label="بحث في النماذج"
                />
              </div>

              {/* Models List Container */}
              {isLoadingModels ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-md bg-secondary" />
                  ))}
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pe-1">
                  {filteredModels.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border py-6 text-center">
                      <p className="text-mini text-muted-foreground">
                        لا توجد نماذج تطابق بحثك الحالي.
                      </p>
                    </div>
                  ) : (
                    filteredModels.map((m) => {
                      const isSelected = selectedModel?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedModel(m)}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-3 text-start transition-motion ${
                            isSelected
                              ? 'border-signal bg-signal/10'
                              : 'border-track hover:bg-secondary/50'
                          }`}
                        >
                          <div className="min-w-0 space-y-1 pe-3">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-mini font-extrabold text-foreground">
                                {m.name}
                              </p>
                              {m.performance?.badge_text && (
                                <span className="shrink-0 rounded-full border border-signal/30 bg-signal/15 px-2 py-0.5 text-micro font-bold text-signal">
                                  {m.performance.badge_text}
                                </span>
                              )}
                            </div>
                            <p
                              className="truncate font-mono text-micro text-muted-foreground"
                              dir="ltr"
                            >
                              {m.id}
                            </p>
                          </div>

                          <div className="shrink-0 space-y-0.5 ps-2 text-end">
                            <span className="block rounded bg-secondary px-2 py-0.5 font-mono text-micro font-bold tabular-nums text-foreground">
                              {(m.context_length / 1024).toFixed(0)}k سياق
                            </span>
                            <span className="block font-mono text-micro font-black tabular-nums text-data-1">
                              ${m.pricing?.prompt ?? 0}/1M
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Model Selection Action Bar */}
              <div className="flex items-center justify-between border-t border-track pt-3">
                <div className="text-mini">
                  <span className="block text-muted-foreground">الموديل المحدد:</span>
                  <span className="block max-w-xs truncate font-mono text-mini font-bold text-foreground">
                    {selectedModel?.name || 'لم يتم الاختيار'}
                  </span>
                </div>

                <Button
                  disabled={!selectedModel}
                  onClick={() => setStep('generation_options')}
                  className="gap-2"
                >
                  <span>التالي: تحديد نمط التوليد</span>
                  <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: GENERATION SETUP & LEVERS STAGE */}
          {step === 'generation_options' && !isJobActive && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-track pb-3">
                <div>
                  <h3 className="flex items-center gap-2 text-body font-extrabold text-foreground">
                    <Sparkles className="h-4 w-4 text-signal" aria-hidden />
                    <span>خيارات النمط والصرامة وضوابط الإبداع:</span>
                  </h3>
                  <p className="mt-0.5 text-mini text-muted-foreground">
                    اختر بين التوليد حسب قدرة النموذج أو تحديد عدد ثابت صارم.
                  </p>
                </div>

                <Button variant="link" size="sm" onClick={() => setStep('model_selection')}>
                  تغيير الموديل ←
                </Button>
              </div>

              {/* 2 DISTINCT GENERATION MODES (USER REQUEST CORE REQUIREMENT) */}
              <div className="space-y-2">
                <label className="block text-mini font-extrabold text-foreground">
                  أ) نمط التوليد المستهدف:
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Option 1: Model Capacity Mode */}
                  <button
                    type="button"
                    onClick={() => setMode('model_capacity')}
                    className={`relative cursor-pointer rounded-lg border p-3.5 text-start transition-motion ${
                      mode === 'model_capacity'
                        ? 'border-primary bg-primary/10'
                        : 'border-track hover:bg-secondary/50'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-mini font-extrabold">1. حسب قدرة النموذج</span>
                      <Flame
                        className={`h-4 w-4 ${
                          mode === 'model_capacity' ? 'text-signal' : 'text-muted-foreground'
                        }`}
                        aria-hidden
                      />
                    </div>
                    <p className="text-micro leading-relaxed text-muted-foreground">
                      يولد الموديل أقصى حصيلة ممكنة من العبارات الأصيلة وغير المكررة حتى يستنفذ أفكاره ذات الثقة العالية وتتوقف الحلقة تلقائيًا.
                    </p>
                  </button>

                  {/* Option 2: Fixed Count Mode */}
                  <button
                    type="button"
                    onClick={() => setMode('fixed_count')}
                    className={`relative cursor-pointer rounded-lg border p-3.5 text-start transition-motion ${
                      mode === 'fixed_count'
                        ? 'border-primary bg-primary/10'
                        : 'border-track hover:bg-secondary/50'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-mini font-extrabold">2. حسب العدد الذي اختاره انا</span>
                      <Layers
                        className={`h-4 w-4 ${
                          mode === 'fixed_count' ? 'text-signal' : 'text-muted-foreground'
                        }`}
                        aria-hidden
                      />
                    </div>
                    <p className="text-micro leading-relaxed text-muted-foreground">
                      تحديد عدد دقيق ومحدد مسبقًا للمفردات المراد إضافتها إلى هذا الرف دون زيادة أو نقصان.
                    </p>
                  </button>
                </div>

                {/* Numeric Stepper for Fixed Count Mode */}
                {mode === 'fixed_count' && (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-track bg-secondary/40 p-3 text-mini">
                    <label className="font-bold text-foreground">حدد عدد العناصر المطلوبة:</label>
                    <div className="flex items-center gap-2">
                      <IconButton
                        onClick={() => setFixedCount((prev) => Math.max(prev - 5, 5))}
                        aria-label="تقليل العدد"
                      >
                        <span className="text-lead font-bold text-foreground">−</span>
                      </IconButton>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={fixedCount}
                        onChange={(e) =>
                          setFixedCount(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 500))
                        }
                        className="w-16 text-center font-mono font-extrabold tabular-nums"
                        aria-label="عدد العناصر"
                      />
                      <IconButton
                        onClick={() => setFixedCount((prev) => Math.min(prev + 5, 500))}
                        aria-label="زيادة العدد"
                      >
                        <span className="text-lead font-bold text-foreground">+</span>
                      </IconButton>
                      <span className="font-mono text-micro font-medium text-muted-foreground">
                        عنصر
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* STRICTNESS LEVEL CONTROLS */}
              <div className="space-y-2">
                <label className="block text-mini font-extrabold text-foreground">
                  ب) حد الصرامة وتدقيق الجودة:
                </label>
                <div className="grid grid-cols-3 gap-2 text-mini">
                  {[
                    { id: 'balanced', label: 'متوازن', score: '75%', desc: 'قبول عالي مع تصفية للتكرار' },
                    { id: 'strict', label: 'صارم جداً', score: '85%', desc: 'استبعاد العبارات الضعيفة' },
                    { id: 'very_strict', label: 'أقصى صرامة', score: '92%', desc: 'أصالة وقوة صياغة تامة' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrictness(s.id as StrictnessLevel)}
                      title={s.desc}
                      className={`cursor-pointer rounded-md border p-2.5 text-center transition-motion ${
                        strictness === s.id
                          ? 'border-signal bg-signal/15 font-bold'
                          : 'border-track text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <span className="block text-mini font-bold">{s.label}</span>
                      <span className="block font-mono text-micro tabular-nums opacity-90">
                        {s.score} ثقة
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* REGISTER STEERING CHIPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-mini font-extrabold text-foreground">
                    ج) توجيه السجل اللغوي (اختياري):
                  </label>
                  {registerTargets.length === 0 && (
                    <span className="text-micro italic text-muted-foreground">
                      ترك التنوع للموديل
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['formal', 'neutral', 'informal', 'slang'] as GermanRegister[]).map((reg) => {
                    const isSelected = registerTargets.includes(reg);
                    return (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => toggleRegister(reg)}
                        className={`cursor-pointer rounded-md border px-3.5 py-1.5 text-mini font-bold transition-motion ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-track bg-secondary/40 text-foreground hover:bg-secondary'
                        }`}
                      >
                        {REGISTER_LABELS_AR[reg]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIVE ESTIMATE SUMMARY CARD */}
              <div className="flex items-center justify-between rounded-lg border border-signal/30 bg-signal/10 p-4 text-mini">
                <div>
                  <span className="block font-extrabold text-signal">تقدير التكلفة والمخرجات:</span>
                  <span className="mt-0.5 block text-micro text-signal">
                    النموذج: <span className="font-bold">{selectedModel?.name}</span> • التوقع: ~
                    <span className="tabular-nums">{liveEstimate.estCount}</span> عنصر أصيل
                  </span>
                </div>
                <div className="text-end font-mono">
                  <span className="block text-lead font-black tabular-nums text-signal">
                    ~${liveEstimate.estCostUsd.toFixed(4)}
                  </span>
                  <span className="text-micro text-muted-foreground">حسب الاستهلاك الفعلي</span>
                </div>
              </div>

              {/* START FURNACE GENERATION BUTTON */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep('model_selection')}>
                  السابق
                </Button>

                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  disabled={isStartingJob}
                  onClick={handleStartGeneration}
                >
                  {isStartingJob ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      <span>جاري إطلاق شعلة الفرن...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="h-5 w-5" aria-hidden />
                      <span>ابدأ التوليد بالفرن الآن (حسب الخيارات)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: LIVE WORKING GENERATION STAGE */}
          {isJobActive && (
            <div className="space-y-5 py-2">
              <div className="relative space-y-3 overflow-hidden rounded-lg border border-signal/40 bg-foreground p-4 text-background">
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full bg-signal motion-safe:animate-ping" />
                    <span className="text-mini font-extrabold text-signal">
                      الفرن يعمل في الخلفية بـ OpenRouter AI...
                    </span>
                  </div>
                  <span className="rounded-full border border-background/20 bg-background/10 px-2.5 py-1 font-mono text-mini font-black tabular-nums text-signal">
                    ${(job?.estimated_cost_usd || 0).toFixed(5)} USD
                  </span>
                </div>

                <div className="relative grid grid-cols-3 gap-2.5 text-center text-mini">
                  <div className="rounded-md border border-background/15 bg-background/10 p-2.5">
                    <span className="block font-mono text-xl font-black tabular-nums text-data-1">
                      {job?.entries_generated || acceptedStubs.length}
                    </span>
                    <span className="text-micro font-bold opacity-90">مقبول أصيل</span>
                  </div>

                  <div className="rounded-md border border-background/15 bg-background/10 p-2.5">
                    <span className="block font-mono text-xl font-black tabular-nums text-signal">
                      {job?.entries_skipped_duplicate || 0}
                    </span>
                    <span className="text-micro font-bold opacity-90">مستبعد لتكراره</span>
                  </div>

                  <div className="rounded-md border border-background/15 bg-background/10 p-2.5">
                    <span className="block font-mono text-xl font-black tabular-nums text-muted-foreground">
                      {job?.entries_discarded_low_quality || 0}
                    </span>
                    <span className="text-micro font-bold opacity-90">مرفوض لضعف الثقة</span>
                  </div>
                </div>
              </div>

              {/* LIVE SHELF ENTRY SLOTTING FEED */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-mini font-extrabold text-foreground">
                    <Database className="h-4 w-4 text-primary" aria-hidden />
                    <span>تغذية الرف الحية (نزول المفردات المعتمدة مباشر):</span>
                  </h4>
                  <span className="rounded-full bg-data-1/15 px-2 py-0.5 font-mono text-micro font-extrabold tabular-nums text-data-1">
                    +{acceptedStubs.length} عنصر
                  </span>
                </div>

                <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-md border border-track bg-background p-3.5">
                  {acceptedStubs.length === 0 ? (
                    <div className="w-full space-y-1 py-8 text-center text-mini italic text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-signal" aria-hidden />
                      <p>جاري صياغة الدفعة الأولى وتصفيتها بالصارمة المحددة...</p>
                    </div>
                  ) : (
                    acceptedStubs.map((item) => {
                      const dotColor = GENDER_COLORS[item.gender] || 'hsl(var(--muted-foreground))';
                      return (
                        <div
                          key={item.id}
                          className="flex shrink-0 items-center gap-2 rounded-md border border-track bg-secondary/40 px-3 py-1.5 text-mini"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="font-mono font-bold text-foreground" dir="ltr">
                            {item.german_text}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* LIVE REJECTION REASONS FEED */}
              <div className="overflow-hidden rounded-lg border border-track bg-background">
                <button
                  type="button"
                  onClick={() => setIsRejectionsExpanded(!isRejectionsExpanded)}
                  className="flex w-full cursor-pointer items-center justify-between p-3 text-mini font-bold text-foreground transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-signal" aria-hidden />
                    <span>سجل المستبعدات والمرفوضات (أسباب الاستبعاد الحية)</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-micro tabular-nums text-foreground">
                      {rejections.length}
                    </span>
                  </div>
                  {isRejectionsExpanded ? (
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                </button>

                {isRejectionsExpanded && (
                  <div className="max-h-36 space-y-1.5 overflow-y-auto border-t border-track p-3 font-mono text-mini">
                    {rejections.length === 0 ? (
                      <p className="py-3 text-center text-micro text-muted-foreground">
                        لا توجد مرفوضات حتى اللحظة.
                      </p>
                    ) : (
                      rejections.map((rej) => (
                        <div
                          key={rej.id}
                          className="flex items-center justify-between rounded-md bg-secondary/40 p-1.5"
                        >
                          <span className="max-w-[65%] truncate text-foreground" dir="ltr">
                            {rej.candidate_text}
                          </span>
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-sans text-micro font-bold text-destructive">
                            {REJECTION_REASON_LABELS_AR[rej.reason] || rej.reason}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="secondary" onClick={onClose}>
                  إغلاق (المتابعة بالخلفية)
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETION SUMMARY STAGE */}
          {step === 'summary' && !isJobActive && (
            <div className="space-y-5 py-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-data-1/40 bg-data-1/15 text-data-1">
                <Check className="h-7 w-7" aria-hidden />
              </div>

              <div>
                <h3 className="text-lead font-extrabold text-foreground">
                  {job?.status === 'completed' ? 'اكتملت عملة التوليد بالفرن بنجاح أصيل!' : 'توقفت مهمة التوليد'}
                </h3>
                <p className="mt-1 text-mini text-muted-foreground">
                  تم صياغة واستقرار المفردات بالرف مباشرة.
                </p>
              </div>

              {/* Job Summary Breakdown Box */}
              <div className="space-y-3 rounded-lg border border-track bg-background p-4 text-start text-mini">
                <div className="flex justify-between border-b border-track pb-2">
                  <span className="font-bold text-muted-foreground">إجمالي المفردات المضافة للرف:</span>
                  <span className="font-mono text-body font-black tabular-nums text-data-1">
                    +{job?.entries_generated || acceptedStubs.length} عنصر
                  </span>
                </div>

                <div className="flex justify-between border-b border-track pb-2">
                  <span className="font-bold text-muted-foreground">المستبعد (تكرار / ثقة / سجل):</span>
                  <span className="font-mono font-extrabold tabular-nums text-foreground">
                    {(job?.entries_skipped_duplicate || 0) + (job?.entries_discarded_low_quality || 0)} عنصر
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-muted-foreground">التكلفة النهائية المستهلكة:</span>
                  <span className="font-mono font-black tabular-nums text-signal">
                    ${(job?.estimated_cost_usd || 0).toFixed(5)} USD
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="secondary" onClick={onClose}>
                  تم والإغلاق
                </Button>

                <Button
                  className="gap-2"
                  onClick={() => {
                    onClose();
                    navigate('/german-club/review');
                  }}
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  <span>انتقل لصفحة مراجعة واعتماد المحتوى ←</span>
                </Button>
              </div>
            </div>
          )}

          {jobError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-mini font-bold text-destructive">
              {jobError}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
