import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Search, ShieldAlert, Sparkles, X } from '@/lib/icons';
import { supabase } from '@/integrations/supabase/client';
import { GERMAN_CLUB_TOKENS } from '../types';

interface ModelItem {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

interface GenerationJobRow {
  id: string;
  shelf_id: string;
  model_id: string;
  mode: 'model_capacity' | 'fixed_count';
  target_count: number | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  entries_generated: number;
  entries_skipped_duplicate: number;
  entries_discarded_low_quality: number;
  error_message: string | null;
}

interface GenerationModalProps {
  shelfId: string;
  shelfTitleAr: string;
  shelfTitleDe?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'model' | 'mode' | 'confirm' | 'progress' | 'summary';

export const GenerationModal: React.FC<GenerationModalProps> = ({
  shelfId,
  shelfTitleAr,
  shelfTitleDe,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<ModalStep>('model');
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [modelSearch, setModelSearch] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<ModelItem | null>(null);

  // Mode state
  const [mode, setMode] = useState<'model_capacity' | 'fixed_count'>('model_capacity');
  const [fixedCount, setFixedCount] = useState<number>(30);

  // Job & Progress state
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJobRow | null>(null);
  const [isStartingJob, setIsStartingJob] = useState<boolean>(false);
  const [jobError, setJobError] = useState<string | null>(null);

  // Fetch OpenRouter models via edge function
  useEffect(() => {
    if (isOpen && models.length === 0) {
      void fetchModels();
    }
  }, [isOpen]);

  const fetchModels = async (query = '') => {
    setIsLoadingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke('openrouter-list-models', {
        body: { query },
      });

      if (!error && data?.models) {
        setModels(data.models);
        if (!selectedModel && data.models.length > 0) {
          setSelectedModel(data.models[0]);
        }
      }
    } catch (err) {
      console.error('Failed to list OpenRouter models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Realtime subscription for running job updates
  useEffect(() => {
    if (!jobId) return;

    // Initial fetch of job row
    const fetchJobRow = async () => {
      const { data } = await supabase
        .from('content_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (data) {
        setJob(data as GenerationJobRow);
        if (data.status === 'completed' || data.status === 'failed') {
          setStep('summary');
        }
      }
    };

    void fetchJobRow();

    // Subscribe to Postgres Changes
    const channel = supabase
      .channel(`job_${jobId}`)
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId]);

  if (!isOpen) return null;

  const handleStartGeneration = async () => {
    if (!selectedModel) return;

    setIsStartingJob(true);
    setJobError(null);

    try {
      // 1. Create content_generation_jobs row
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data: newJob, error: createErr } = await supabase
        .from('content_generation_jobs')
        .insert({
          shelf_id: shelfId,
          model_id: selectedModel.id,
          mode,
          target_count: mode === 'fixed_count' ? fixedCount : null,
          status: 'queued',
          triggered_by: userId,
        })
        .select('*')
        .single();

      if (createErr || !newJob) {
        throw new Error(createErr?.message || 'Failed to create job row');
      }

      setJobId(newJob.id);
      setJob(newJob as GenerationJobRow);
      setStep('progress');

      // 2. Invoke german-club-generate-content Edge Function asynchronously with job_id
      const { error: invokeErr } = await supabase.functions.invoke('german-club-generate-content', {
        body: {
          job_id: newJob.id,
          shelf_id: shelfId,
          model_id: selectedModel.id,
          mode,
          target_count: mode === 'fixed_count' ? fixedCount : undefined,
        },
      });

      if (invokeErr) {
        setJobError(invokeErr.message);
      }
    } catch (err: any) {
      setJobError(err?.message || 'Error starting generation job');
    } finally {
      setIsStartingJob(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-xl rounded-3xl border border-stone-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-300/80 flex items-center justify-between bg-stone-200/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C9703B]/15 border border-[#C9703B]/40 flex items-center justify-center">
              <span className="font-bold text-sm text-[#C9703B]">D</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 leading-tight">
                أداة توليد المحتوى والتزويد الذكي
              </h2>
              <p className="text-[0.6875rem] text-stone-600">
                {shelfTitleAr} {shelfTitleDe ? `(${shelfTitleDe})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-300/60 transition-colors text-stone-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
          {/* STEP 1: MODEL PICKER */}
          {step === 'model' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900">1. اختر نموذج OpenRouter</h3>
                  <p className="text-xs text-stone-600">
                    نماذج الذكاء الاصطناعي المفلترة والمدعومة للتوليد اللغوي
                  </p>
                </div>
                <span className="text-xs font-mono bg-stone-200 px-2 py-0.5 rounded text-stone-700">
                  {models.length} نموذج
                </span>
              </div>

              {/* Search Field */}
              <div className="relative">
                <Search className="w-4 h-4 absolute inset-s-3 top-3 text-stone-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم النموذج (مثل claude, gpt, gemini)..."
                  value={modelSearch}
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                    void fetchModels(e.target.value);
                  }}
                  className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-stone-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#C9703B]"
                />
              </div>

              {/* Model List */}
              {isLoadingModels ? (
                <div className="space-y-2 py-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 rounded-xl bg-stone-200/60 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
                  {models.map((m) => {
                    const isSelected = selectedModel?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModel(m)}
                        className={`w-full text-start p-3 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#C9703B]/10 border-[#C9703B] shadow-xs'
                            : 'bg-white/60 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-stone-900 truncate">{m.name}</p>
                          <p className="text-[0.6875rem] font-mono text-stone-500 truncate" dir="ltr">
                            {m.id}
                          </p>
                        </div>

                        <div className="text-end shrink-0 ps-3">
                          <span className="text-[0.625rem] font-mono block text-stone-600">
                            سياق: {(m.context_length / 1024).toFixed(0)}k
                          </span>
                          <span className="text-[0.625rem] font-mono text-emerald-700 block">
                            ${m.pricing.prompt}/1M tok
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedModel}
                  onClick={() => setStep('mode')}
                  className="px-5 py-2.5 rounded-xl bg-[#17324D] text-white font-bold text-xs hover:bg-[#12273d] disabled:opacity-50 transition-colors shadow-xs"
                >
                  التالي: اختيار نمط التوليد ←
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MODE PICKER */}
          {step === 'mode' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-stone-900">2. اختر نمط التوليد</h3>
                <p className="text-xs text-stone-600">
                  حدد طريقة التكليف والانضباط أثناء عملية التوليد
                </p>
              </div>

              <div className="space-y-3">
                {/* Mode 1: Model Capacity */}
                <button
                  type="button"
                  onClick={() => setMode('model_capacity')}
                  className={`w-full text-start p-4 rounded-2xl border transition-all ${
                    mode === 'model_capacity'
                      ? 'bg-[#C9703B]/10 border-[#C9703B] shadow-xs'
                      : 'bg-white/60 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-stone-900">بحسب قدرة النموذج</span>
                    {mode === 'model_capacity' && <Check className="w-4 h-4 text-[#C9703B]" />}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    يتولى النموذج تحديد نقطة التوقف تلقائياً عندما يتوقف عن إنتاج مفردات أصيلة وجديدة للموقف، دون حشو أو تكرار.
                  </p>
                </button>

                {/* Mode 2: Fixed Count */}
                <button
                  type="button"
                  onClick={() => setMode('fixed_count')}
                  className={`w-full text-start p-4 rounded-2xl border transition-all ${
                    mode === 'fixed_count'
                      ? 'bg-[#C9703B]/10 border-[#C9703B] shadow-xs'
                      : 'bg-white/60 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-stone-900">بحسب عدد أحدده</span>
                    {mode === 'fixed_count' && <Check className="w-4 h-4 text-[#C9703B]" />}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed mb-3">
                    السعي نحو توليد عدد محدد بدقة، مع الالتزام التام بحظر الحشو والتكرار، وسيتوقف التوليد عند نفاد المواد الأصلية.
                  </p>

                  {mode === 'fixed_count' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-stone-300/60" onClick={(e) => e.stopPropagation()}>
                      <label className="text-xs font-bold text-stone-800">العدد المستهدف (حد أقصى 500):</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={fixedCount}
                        onChange={(e) => setFixedCount(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 500))}
                        className="w-24 px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-center font-bold text-xs"
                      />
                    </div>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('model')}
                  className="text-xs font-bold text-stone-600 hover:underline"
                >
                  ← العودة للنموذج
                </button>

                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="px-5 py-2.5 rounded-xl bg-[#17324D] text-white font-bold text-xs hover:bg-[#12273d] transition-colors shadow-xs"
                >
                  التالي: التأكيد والبدء ←
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-stone-900">3. تأكيد إطلاق مهمة التوليد</h3>
                <p className="text-xs text-stone-600">
                  راجِع إعدادات المهمة قبل التأكيد والعمل في الخلفية
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 border border-stone-300 space-y-3 text-xs">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-medium">الرف المستهدف:</span>
                  <span className="font-bold text-stone-900">{shelfTitleAr}</span>
                </div>

                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-medium">النموذج المحدد:</span>
                  <span className="font-mono font-bold text-[#17324D]">{selectedModel?.id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">نمط التوليد:</span>
                  <span className="font-bold text-stone-900">
                    {mode === 'model_capacity' ? 'بحسب قدرة النموذج' : `عدد محدد (${fixedCount} عنصر)`}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  المهمة تعمل كخدمة خلفية (Background Job). يمكنك إغلاق هذا التبويب أو التطبيق وسيتواصل التوليد دون انقطاع.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('mode')}
                  className="text-xs font-bold text-stone-600 hover:underline"
                >
                  ← العودة للتعديل
                </button>

                <button
                  type="button"
                  disabled={isStartingJob}
                  onClick={handleStartGeneration}
                  className="px-6 py-2.5 rounded-xl bg-[#C9703B] text-white font-bold text-xs hover:bg-[#b05f2e] transition-colors shadow-sm flex items-center gap-2"
                >
                  {isStartingJob ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري إطلاق المهمة...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      تأكيد وبدء التوليد
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: LIVE PROGRESS */}
          {step === 'progress' && (
            <div className="space-y-6 py-4 text-center">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#C9703B]/20 animate-ping absolute" />
                <div className="w-16 h-16 rounded-full bg-[#C9703B]/20 border-2 border-[#C9703B] flex items-center justify-center relative">
                  <Sparkles className="w-8 h-8 text-[#C9703B] animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-stone-900">جاري التوليد المباشر في الخلفية...</h3>
                <p className="text-xs text-stone-600">
                  يتم التوليد وتدقيق الجودة ومنع التكرار آنياً
                </p>
              </div>

              {/* Live Counters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="block text-xl font-bold font-mono text-emerald-800">
                    {job?.entries_generated || 0}
                  </span>
                  <span className="text-[0.625rem] font-bold text-emerald-700">مقبول وموّلد</span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="block text-xl font-bold font-mono text-amber-800">
                    {job?.entries_skipped_duplicate || 0}
                  </span>
                  <span className="text-[0.625rem] font-bold text-amber-700">مستبعد (مكرر)</span>
                </div>

                <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200">
                  <span className="block text-xl font-bold font-mono text-stone-700">
                    {job?.entries_discarded_low_quality || 0}
                  </span>
                  <span className="text-[0.625rem] font-bold text-stone-600">مستبعد (جودة/ثقة)</span>
                </div>
              </div>

              {jobError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {jobError}
                </p>
              )}

              <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-xs">
                <span className="text-stone-500">حالة المهمة: <code className="font-bold text-stone-800">{job?.status}</code></span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-stone-200 text-stone-800 font-bold hover:bg-stone-300 transition-colors"
                >
                  إغلاق (المتابعة في الخلفية)
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUMMARY */}
          {step === 'summary' && (
            <div className="space-y-6 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-stone-900">
                  {job?.status === 'completed' ? 'اكتملت عملية التوليد بنجاح!' : 'فشلت المهمة أو توقفت'}
                </h3>
                <p className="text-xs text-stone-600">
                  تم حفظ جميع العناصر المعتمدة في طابور المراجعة بحالة AI Generated
                </p>
              </div>

              {/* Final Summary Card */}
              <div className="p-4 rounded-2xl bg-white border border-stone-300 text-xs space-y-2 text-start">
                <div className="flex justify-between">
                  <span className="text-stone-500">العناصر الجديدة المعتمدة:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">{job?.entries_generated || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">المستبعدة بسبب التكرار:</span>
                  <span className="font-bold text-amber-700 font-mono">{job?.entries_skipped_duplicate || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">المستبعدة لضعف الثقة:</span>
                  <span className="font-bold text-stone-600 font-mono">{job?.entries_discarded_low_quality || 0}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-stone-200 text-stone-800 text-xs font-bold hover:bg-stone-300 transition-colors"
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/german-club/review');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#17324D] text-white text-xs font-bold hover:bg-[#12273d] transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>الانتقال لطابور المراجعة والاعتماد ←</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
