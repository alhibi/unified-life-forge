import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  X,
} from '@/lib/icons';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import {
  GENDER_COLORS,
  GERMAN_CLUB_TOKENS,
  GermanGender,
  GermanRegister,
  OpenRouterModelItem,
  REJECTION_REASON_LABELS_AR,
  REGISTER_LABELS_AR,
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
  shelfTitleAr: string;
  shelfTitleDe?: string | null;
  currentEntryCount: number;
  targetCount?: number;
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'model_selection' | 'generation_options' | 'generating' | 'summary';

export const GenerationModal: React.FC<GenerationModalProps> = ({
  shelfId,
  shelfTitleAr,
  shelfTitleDe,
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

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setStep('model_selection');
      void fetchModels('');
      void checkRunningJob();
    }
  }, [isOpen, shelfId]);

  // Fetch OpenRouter models with performance stats
  const fetchModels = async (query = '') => {
    setIsLoadingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke('openrouter-list-models', {
        body: { query, shelf_id: shelfId },
      });

      if (!error && data?.models && Array.isArray(data.models) && data.models.length > 0) {
        setModels(data.models);
        if (!selectedModel) {
          setSelectedModel(data.models[0]);
        }
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
        if (!selectedModel) setSelectedModel(fallbackModels[0]);
      }
    } catch (err) {
      console.error('Failed to list OpenRouter models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Check if a job is already running for this shelf
  const checkRunningJob = async () => {
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
  };

  // Fetch accepted entries generated by this job
  const fetchJobAcceptedEntries = async (jId: string) => {
    const { data } = await supabase
      .from('german_club_entries')
      .select('id, german_text, gender')
      .eq('generation_job_id', jId)
      .order('created_at', { ascending: true });

    if (data) {
      setAcceptedStubs(data as JobAcceptedEntryStub[]);
    }
  };

  // Fetch rejections for this job
  const fetchJobRejections = async (jId: string) => {
    const { data } = await supabase
      .from('generation_job_rejections')
      .select('*')
      .eq('job_id', jId)
      .order('created_at', { ascending: false });

    if (data) {
      setRejections(data as JobRejectionRow[]);
    }
  };

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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      let createdJobId: string | null = null;
      let createdJobRow: GenerationJobRow | null = null;

      // 1. Try creating content_generation_jobs row in database
      const { data: newJob, error: createErr } = await supabase
        .from('content_generation_jobs')
        .insert({
          shelf_id: shelfId,
          model_id: selectedModel.id,
          mode,
          target_count: mode === 'fixed_count' ? fixedCount : null,
          strictness,
          register_targets: registerTargets,
          status: 'queued',
          triggered_by: userId,
        })
        .select('*')
        .single();

      if (!createErr && newJob) {
        createdJobId = newJob.id;
        createdJobRow = newJob as GenerationJobRow;
      } else {
        console.warn('Database insert into content_generation_jobs returned error/fallback:', createErr?.message);
        // Fallback job ID if DB schema cache or table is temporarily unavailable
        createdJobId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `job_${Date.now()}`;
        createdJobRow = {
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
        };
      }

      setJobId(createdJobId);
      setJob(createdJobRow);
      setStep('generating');

      // 2. Invoke Edge Function asynchronously
      const { data: fnData, error: invokeErr } = await supabase.functions.invoke('german-club-generate-content', {
        body: {
          job_id: createdJobId,
          shelf_id: shelfId,
          model_id: selectedModel.id,
          mode,
          target_count: mode === 'fixed_count' ? fixedCount : undefined,
          strictness,
          register_targets: registerTargets,
        },
      });

      if (invokeErr) {
        setJobError(`تعذر الاتصال بفرن التوليد: ${invokeErr.message}`);
      } else if (fnData?.error) {
        setJobError(`خطأ من وحدة التوليد: ${fnData.error}`);
      }
    } catch (err: any) {
      setJobError(err?.message || 'Error starting furnace generation job');
    } finally {
      setIsStartingJob(false);
    }
  };

  if (!isOpen) return null;

  const isJobActive = job && (job.status === 'queued' || job.status === 'running');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs transition-all">
      <div
        className="w-full max-w-2xl rounded-3xl border border-stone-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all relative"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* Panel Header */}
        <div className="px-5 py-4 border-b border-stone-300/80 flex items-center justify-between bg-stone-200/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A170F] to-[#0D0704] border border-[#FF7A29]/60 flex items-center justify-center shadow-md shrink-0">
              <span className="font-black font-mono text-base text-[#FF9E4A] drop-shadow-xs">D</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-900 leading-tight">
                  الفرن — وحدة التوليد بالذكاء الاصطناعي v2
                </h2>
                <span className="text-[0.625rem] font-mono font-bold bg-[#FF7A29]/15 text-[#C9703B] px-2 py-0.5 rounded-full border border-[#FF7A29]/30">
                  OpenRouter API
                </span>
              </div>
              <p className="text-xs text-stone-600 font-medium mt-0.5">
                الرف: <span className="font-bold text-[#17324D]">{shelfTitleAr}</span>{' '}
                {shelfTitleDe ? `(${shelfTitleDe})` : ''} • ({currentEntryCount}/{targetCount} عنصر)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-300/60 transition-colors text-stone-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Bar Stepper Header */}
        {!isJobActive && step !== 'summary' && (
          <div className="px-5 py-2.5 border-b border-stone-200 bg-stone-100/70 flex items-center justify-between text-xs shrink-0">
            <button
              type="button"
              onClick={() => setStep('model_selection')}
              className={`flex items-center gap-2 font-bold transition-all ${
                step === 'model_selection' ? 'text-[#C9703B]' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.6875rem] ${
                step === 'model_selection' ? 'bg-[#C9703B] text-white' : 'bg-stone-300 text-stone-700'
              }`}>
                1
              </span>
              <span>1. اختيار النموذج المقبول</span>
            </button>

            <span className="text-stone-400">←</span>

            <button
              type="button"
              disabled={!selectedModel}
              onClick={() => selectedModel && setStep('generation_options')}
              className={`flex items-center gap-2 font-bold transition-all ${
                step === 'generation_options' ? 'text-[#C9703B]' : 'text-stone-500 hover:text-stone-800'
              } ${!selectedModel ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.6875rem] ${
                step === 'generation_options' ? 'bg-[#C9703B] text-white' : 'bg-stone-300 text-stone-700'
              }`}>
                2
              </span>
              <span>2. نمط وضوابط التوليد</span>
            </button>
          </div>
        )}

        {/* Panel Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-sm">
          {/* STEP 1: MODEL SELECTION STAGE */}
          {step === 'model_selection' && !isJobActive && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#C9703B]" />
                    <span>اختر نموذج الذكاء الاصطناعي المناسب لرفك من OpenRouter:</span>
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    يتم استدعاء النماذج مباشرةً بواسطة مفتاح OpenRouter مع مراقبة الأداء والتكلفة لكل 1M توكن.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchModels(modelSearch)}
                  className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 text-stone-600 transition-colors"
                  title="تحديث قائمة النماذج"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Vendor Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {vendors.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVendorFilter(v.id)}
                    className={`px-3 py-1 rounded-full font-bold transition-all border shrink-0 ${
                      vendorFilter === v.id
                        ? 'bg-[#17324D] text-white border-[#17324D] shadow-xs'
                        : 'bg-white/80 text-stone-700 border-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Model Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute inset-s-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم الموديل أو المعرف (gpt-4o, gemini, claude, deepseek, qwen)..."
                  value={modelSearch}
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                  }}
                  className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9703B]"
                />
              </div>

              {/* Models List Container */}
              {isLoadingModels ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 rounded-2xl bg-stone-200/60 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
                  {filteredModels.length === 0 ? (
                    <div className="text-center py-8 text-stone-500 text-xs">
                      لا توجد نماذج تطابق بحثك الحالي.
                    </div>
                  ) : (
                    filteredModels.map((m) => {
                      const isSelected = selectedModel?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedModel(m)}
                          className={`w-full text-start p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#C9703B]/10 border-[#C9703B] ring-2 ring-[#C9703B]/30 shadow-xs'
                              : 'bg-white border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <div className="min-w-0 pe-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-xs text-stone-900 truncate">{m.name}</p>
                              {m.performance?.badge_text && (
                                <span className="text-[0.625rem] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold shrink-0 border border-amber-300">
                                  {m.performance.badge_text}
                                </span>
                              )}
                            </div>
                            <p className="text-[0.625rem] font-mono text-stone-500 truncate" dir="ltr">
                              {m.id}
                            </p>
                          </div>

                          <div className="text-end shrink-0 ps-2 space-y-0.5">
                            <span className="text-[0.625rem] font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-700 block font-bold">
                              {(m.context_length / 1024).toFixed(0)}k سياق
                            </span>
                            <span className="text-[0.6875rem] font-mono text-emerald-800 block font-black">
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
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-stone-600 block">الموديل المحدد:</span>
                  <span className="font-bold text-stone-900 font-mono text-xs truncate max-w-xs block">
                    {selectedModel?.name || 'لم يتم الاختيار'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!selectedModel}
                  onClick={() => setStep('generation_options')}
                  className="px-5 py-2.5 rounded-xl bg-[#17324D] text-white font-bold text-xs hover:bg-[#12273d] transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>التالي: تحديد نمط التوليد</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GENERATION SETUP & LEVERS STAGE */}
          {step === 'generation_options' && !isJobActive && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C9703B]" />
                    <span>خيارات النمط والصرامة وضوابط الإبداع:</span>
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    اختر بين التوليد حسب قدرة النموذج أو تحديد عدد ثابت صارم.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('model_selection')}
                  className="text-xs text-[#17324D] font-bold hover:underline"
                >
                  تغيير الموديل ←
                </button>
              </div>

              {/* 2 DISTINCT GENERATION MODES (USER REQUEST CORE REQUIREMENT) */}
              <div className="space-y-2">
                <label className="font-extrabold text-xs text-stone-900 block">
                  أ) نمط التوليد المستهدف:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Model Capacity Mode */}
                  <button
                    type="button"
                    onClick={() => setMode('model_capacity')}
                    className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer relative ${
                      mode === 'model_capacity'
                        ? 'bg-[#17324D] text-white border-[#17324D] ring-2 ring-[#17324D]/30 shadow-md'
                        : 'bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs">1. حسب قدرة النموذج</span>
                      <Flame className={`w-4 h-4 ${mode === 'model_capacity' ? 'text-amber-400' : 'text-stone-400'}`} />
                    </div>
                    <p className={`text-[0.6875rem] leading-relaxed ${mode === 'model_capacity' ? 'text-stone-200' : 'text-stone-600'}`}>
                      يولد الموديل أقصى حصيلة ممكنة من العبارات الأصيلة وغير المكررة حتى يستنفذ أفكاره ذات الثقة العالية وتتوقف الحلقة تلقائيًا.
                    </p>
                  </button>

                  {/* Option 2: Fixed Count Mode */}
                  <button
                    type="button"
                    onClick={() => setMode('fixed_count')}
                    className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer relative ${
                      mode === 'fixed_count'
                        ? 'bg-[#17324D] text-white border-[#17324D] ring-2 ring-[#17324D]/30 shadow-md'
                        : 'bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs">2. حسب العدد الذي اختاره انا</span>
                      <Layers className={`w-4 h-4 ${mode === 'fixed_count' ? 'text-amber-400' : 'text-stone-400'}`} />
                    </div>
                    <p className={`text-[0.6875rem] leading-relaxed ${mode === 'fixed_count' ? 'text-stone-200' : 'text-stone-600'}`}>
                      تحديد عدد دقيق ومحدد مسبقًا للمفردات المراد إضافتها إلى هذا الرف دون زيادة أو نقصان.
                    </p>
                  </button>
                </div>

                {/* Numeric Stepper for Fixed Count Mode */}
                {mode === 'fixed_count' && (
                  <div className="p-3 bg-white rounded-2xl border border-stone-300 text-xs flex items-center justify-between shadow-2xs mt-2">
                    <label className="font-bold text-stone-800">حدد عدد العناصر المطلوبة:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFixedCount((prev) => Math.max(prev - 5, 5))}
                        className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 font-bold text-stone-800 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={fixedCount}
                        onChange={(e) =>
                          setFixedCount(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 500))
                        }
                        className="w-16 px-2 py-1 rounded-lg border border-stone-300 font-mono text-center font-extrabold text-stone-900"
                      />
                      <button
                        type="button"
                        onClick={() => setFixedCount((prev) => Math.min(prev + 5, 500))}
                        className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 font-bold text-stone-800 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-[0.6875rem] text-stone-500 font-mono font-medium">عنصر</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STRICTNESS LEVEL CONTROLS */}
              <div className="space-y-2">
                <label className="font-extrabold text-xs text-stone-900 block">
                  ب) حد الصرامة وتدقيق الجودة:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'balanced', label: 'متوازن', score: '75%', desc: 'قبول عالي مع تصفية للتكرار' },
                    { id: 'strict', label: 'صارم جداً', score: '85%', desc: 'استبعاد العبارات الضعيفة' },
                    { id: 'very_strict', label: 'أقصى صرامة', score: '92%', desc: 'أصالة وقوة صياغة تامة' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrictness(s.id as StrictnessLevel)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        strictness === s.id
                          ? 'bg-[#C9703B] text-white border-[#C9703B] font-bold shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      <span className="block font-bold text-xs">{s.label}</span>
                      <span className="text-[0.625rem] font-mono block opacity-90">{s.score} ثقة</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* REGISTER STEERING CHIPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-xs text-stone-900 block">
                    ج) توجيه السجل اللغوي (اختياري):
                  </label>
                  {registerTargets.length === 0 && (
                    <span className="text-[0.625rem] text-stone-500 italic">ترك التنوع للموديل</span>
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
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-[#17324D] text-white border-[#17324D] shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {REGISTER_LABELS_AR[reg]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIVE ESTIMATE SUMMARY CARD */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-xs flex items-center justify-between shadow-2xs">
                <div>
                  <span className="font-extrabold text-amber-900 block">تقدير التكلفة والمخرجات:</span>
                  <span className="text-[0.6875rem] text-amber-800 block mt-0.5">
                    النموذج: <span className="font-bold">{selectedModel?.name}</span> • التوقع: ~{liveEstimate.estCount} عنصر أصيل
                  </span>
                </div>
                <div className="text-end font-mono">
                  <span className="text-base font-black text-[#C9703B] block">
                    ~${liveEstimate.estCostUsd.toFixed(4)}
                  </span>
                  <span className="text-[0.625rem] text-stone-500">حسب الاستهلاك الفعلي</span>
                </div>
              </div>

              {/* START FURNACE GENERATION BUTTON */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('model_selection')}
                  className="px-4 py-3 rounded-2xl bg-stone-200 text-stone-800 font-bold text-xs hover:bg-stone-300 transition-colors cursor-pointer"
                >
                  السابق
                </button>

                <button
                  type="button"
                  disabled={isStartingJob}
                  onClick={handleStartGeneration}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#C9703B] to-[#b05f2e] text-white font-black text-sm hover:from-[#b05f2e] hover:to-[#964f24] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isStartingJob ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري إطلاق شعلة الفرن...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-5 h-5 text-amber-300" />
                      <span>ابدأ التوليد بالفرن الآن (حسب الخيارات)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: LIVE WORKING GENERATION STAGE */}
          {isJobActive && (
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1A0E08] via-[#17324D] to-[#0D0704] text-white space-y-3 shadow-xl border border-[#FF7A29]/40 relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF7A29] animate-ping" />
                    <span className="font-extrabold text-xs text-amber-200">
                      الفرن يعمل في الخلفية بـ OpenRouter AI...
                    </span>
                  </div>
                  <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-full text-amber-300 font-black border border-white/20">
                    ${(job?.estimated_cost_usd || 0).toFixed(5)} USD
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs relative z-10">
                  <div className="p-2.5 rounded-2xl bg-white/10 border border-white/10">
                    <span className="block text-xl font-black font-mono text-emerald-300">
                      {job?.entries_generated || acceptedStubs.length}
                    </span>
                    <span className="text-[0.625rem] opacity-90 font-bold">مقبول أصيل</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/10 border border-white/10">
                    <span className="block text-xl font-black font-mono text-amber-300">
                      {job?.entries_skipped_duplicate || 0}
                    </span>
                    <span className="text-[0.625rem] opacity-90 font-bold">مستبعد لتكراره</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/10 border border-white/10">
                    <span className="block text-xl font-black font-mono text-stone-300">
                      {job?.entries_discarded_low_quality || 0}
                    </span>
                    <span className="text-[0.625rem] opacity-90 font-bold">مرفوض لضعف الثقة</span>
                  </div>
                </div>
              </div>

              {/* LIVE SHELF ENTRY SLOTTING FEED */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#17324D]" />
                    <span>تغذية الرف الحية (نزول المفردات المعتمدة مباشر):</span>
                  </h4>
                  <span className="text-[0.6875rem] font-mono text-emerald-800 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-full">
                    +{acceptedStubs.length} عنصر
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-stone-300 max-h-44 overflow-y-auto flex flex-wrap gap-2 shadow-inner">
                  {acceptedStubs.length === 0 ? (
                    <div className="w-full text-center py-8 text-stone-400 text-xs italic space-y-1">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C9703B]" />
                      <p>جاري صياغة الدفعة الأولى وتصفيتها بالصارمة المحددة...</p>
                    </div>
                  ) : (
                    acceptedStubs.map((item) => {
                      const dotColor = GENDER_COLORS[item.gender] || '#8B7E68';
                      return (
                        <div
                          key={item.id}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-300 text-xs flex items-center gap-2 shadow-2xs shrink-0"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="font-bold text-stone-900 font-mono" dir="ltr">
                            {item.german_text}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* LIVE REJECTION REASONS FEED */}
              <div className="border border-stone-300 rounded-2xl overflow-hidden bg-white/90">
                <button
                  type="button"
                  onClick={() => setIsRejectionsExpanded(!isRejectionsExpanded)}
                  className="w-full p-3 flex items-center justify-between text-xs font-bold text-stone-800 hover:bg-stone-200/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>سجل المستبعدات والمرفوضات (أسباب الاستبعاد الحية)</span>
                    <span className="bg-stone-200 text-stone-700 font-mono px-2 py-0.5 rounded-full text-[0.625rem]">
                      {rejections.length}
                    </span>
                  </div>
                  {isRejectionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isRejectionsExpanded && (
                  <div className="p-3 border-t border-stone-200 max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono">
                    {rejections.length === 0 ? (
                      <p className="text-stone-500 text-center py-3 text-[0.6875rem]">
                        لا توجد مرفوضات حتى اللحظة.
                      </p>
                    ) : (
                      rejections.map((rej) => (
                        <div key={rej.id} className="p-1.5 rounded-lg bg-stone-100 flex items-center justify-between">
                          <span className="text-stone-800 truncate max-w-[65%]" dir="ltr">
                            {rej.candidate_text}
                          </span>
                          <span className="text-[0.625rem] font-sans font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            {REJECTION_REASON_LABELS_AR[rej.reason] || rej.reason}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-stone-200 text-stone-800 font-bold text-xs hover:bg-stone-300 transition-colors cursor-pointer"
                >
                  إغلاق (المتابعة بالخلفية)
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETION SUMMARY STAGE */}
          {step === 'summary' && !isJobActive && (
            <div className="space-y-5 py-3 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 mx-auto flex items-center justify-center shadow-sm">
                <Check className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-extrabold text-base text-stone-900">
                  {job?.status === 'completed' ? 'اكتملت عملة التوليد بالفرن بنجاح أصيل!' : 'توقفت مهمة التوليد'}
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  تم صياغة واستقرار المفردات بالرف مباشرة.
                </p>
              </div>

              {/* Job Summary Breakdown Box */}
              <div className="p-4 rounded-2xl bg-white border border-stone-300 text-xs space-y-3 text-start shadow-xs">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-600 font-bold">إجمالي المفردات المضافة للرف:</span>
                  <span className="font-black text-emerald-800 font-mono text-sm">
                    +{job?.entries_generated || acceptedStubs.length} عنصر
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-600 font-bold">المستبعد (تكرار / ثقة / سجل):</span>
                  <span className="font-extrabold text-stone-800 font-mono">
                    {(job?.entries_skipped_duplicate || 0) + (job?.entries_discarded_low_quality || 0)} عنصر
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-stone-600 font-bold">التكلفة النهائية المستهلكة:</span>
                  <span className="font-black text-[#C9703B] font-mono">
                    ${(job?.estimated_cost_usd || 0).toFixed(5)} USD
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-stone-200 text-stone-800 font-bold text-xs hover:bg-stone-300 transition-colors cursor-pointer"
                >
                  تم والإغلاق
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/german-club/review');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#17324D] text-white font-bold text-xs hover:bg-[#12273d] transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>انتقل لصفحة مراجعة واعتماد المحتوى ←</span>
                </button>
              </div>
            </div>
          )}

          {jobError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
              {jobError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
