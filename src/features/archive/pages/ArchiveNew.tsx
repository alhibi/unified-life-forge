import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageShell, AppCard } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { Sparkles, X, Check, AlertCircle, ChevronDown } from '@/lib/icons';
import { archiveApi, type ModelConfig } from '../api';
import type { ArchiveDepth, ProgressEvent } from '../types';

const DEPTHS: { key: ArchiveDepth; title: string; subtitle: string; est: string }[] = [
  { key: 'standard', title: 'قياسي',     subtitle: '4 × 2 · ~4400 كلمة · بحث + هيكل + كتابة',                       est: '~3 دقائق' },
  { key: 'deep',     title: 'متعمّق',   subtitle: '5 × 3 · ~13500 كلمة · بحث + هيكل + نقد + كتابة + تلميع',        est: '~8 دقائق' },
  { key: 'deepest',  title: 'أقصى عمق', subtitle: '6 × 4 · ~31000 كلمة · بحث موسّع + نقد + بحث دقيق لكل فقرة + تلميع', est: '~20 دقيقة' },
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
  standard: { outline: 'gemini-2.5-flash', expansion: 'gemini-2.5-flash', synthesis: 'gemini-2.5-flash' },
  deep:     { outline: 'gemini-2.5-flash', expansion: 'gemini-2.5-flash', synthesis: 'gemini-2.5-pro'   },
  deepest:  { outline: 'gemini-2.5-pro',   expansion: 'gemini-2.5-pro',   synthesis: 'gemini-2.5-pro'   },
};

type StageKey = 'idle' | 'research' | 'outline' | 'critique' | 'expansion' | 'polish' | 'synthesis' | 'filed' | 'error';

type PipelineStage = Exclude<StageKey, 'idle' | 'error'>;
const STAGE_ORDER: PipelineStage[] = ['research', 'outline', 'critique', 'expansion', 'polish', 'synthesis', 'filed'];
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
      (Object.keys(models) as (keyof ModelConfig)[]).forEach(k => {
        if (models[k]) overrides[k] = models[k];
      });
      for await (const ev of archiveApi.generate(topic.trim(), depth, overrides, ctrl.signal)) {
        applyEvent(ev);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') { setStage('idle'); return; }
      console.error(e);
      setError(e?.message || 'حدث خطأ');
      setStage('error');
    }
  }

  function applyEvent(ev: ProgressEvent) {
    if (ev.stage === 'research' || ev.stage === 'outline' || ev.stage === 'critique' || ev.stage === 'synthesis') {
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
    if (stage === 'expansion' && progress.total > 0) return 20 + Math.round(60 * progress.current / progress.total);
    if (stage === 'polish' && progress.total > 0) return 80 + Math.round(12 * progress.current / progress.total);
    if (stage === 'synthesis') return 96;
    if (stage === 'filed') return 100;
    return 0;
  })();

  return (
    <PageShell>
      <SEO title="توليد جديد — الأرشيف المعرفي" description="اقترح موضوعاً ومستوى عمقاً لتوليد مونوغراف كامل ومفهرس." path="/archive/new" />
      <div className="flex items-center gap-3 mb-2">
        <BackButton />
        <h1 className="text-xl font-bold text-foreground">توليد جديد</h1>
      </div>

      <AppCard>
        <label className="block text-[13px] font-semibold text-foreground mb-2">الموضوع</label>
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
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
          {DEPTHS.map(d => (
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
          <ChevronDown className={`w-4 h-4 transition-transform ${showModels ? 'rotate-180' : ''}`} />
        </button>

        {showModels && (
          <div className="mt-3 space-y-3 pt-3 border-t border-border/20">
            {(['outline', 'expansion', 'synthesis'] as const).map(stage => (
              <div key={stage}>
                <label className="block text-[12px] font-semibold text-foreground mb-2 capitalize">
                  {stage === 'outline' && '📋 نموذج الهيكل'}
                  {stage === 'expansion' && '✍️ نموذج التوسيع والكتابة'}
                  {stage === 'synthesis' && '🏷️ نموذج التلخيص والوسوم'}
                </label>
                <select
                  value={models[stage] || ''}
                  onChange={e => setModels({ ...models, [stage]: e.target.value })}
                  disabled={running}
                  className="w-full bg-muted/40 border border-border/40 rounded-lg p-2 text-[12px] outline-none focus:border-primary/50"
                >
                  <option value="">تلقائي — {DEPTH_AUTO_MODELS[depth][stage]}</option>
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
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
        open={running || stage === 'filed'}
        stage={stage as PipelineStage}
        message={message}
        progress={progress}
        percent={stagePercent}
        topic={topic}
        onCancel={cancel}
      />

      {stage === 'error' && error && (
        <AppCard className="border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive mb-1">فشل التوليد</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{error}</p>
            </div>
          </div>
          <button onClick={() => setStage('idle')} className="text-[13px] font-semibold text-primary">
            المحاولة مرة أخرى
          </button>
        </AppCard>
      )}
    </PageShell>
  );
}
