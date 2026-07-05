import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageShell, AppCard } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { Sparkles, X, Check, AlertCircle } from '@/lib/icons';
import { archiveApi } from '../api';
import type { ArchiveDepth, ProgressEvent } from '../types';

const DEPTHS: { key: ArchiveDepth; title: string; subtitle: string; est: string }[] = [
  { key: 'standard', title: 'قياسي', subtitle: '4 × 2 · ~2800 كلمة', est: '~2 دقيقة' },
  { key: 'deep',     title: 'متعمّق', subtitle: '5 × 3 · ~8250 كلمة', est: '~5 دقائق' },
  { key: 'deepest',  title: 'أقصى عمق', subtitle: '6 × 4 · ~18000 كلمة', est: '~12 دقيقة' },
];

type StageKey = 'idle' | 'outline' | 'expansion' | 'synthesis' | 'filed' | 'error';

export default function ArchiveNew() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<ArchiveDepth>('standard');
  const [stage, setStage] = useState<StageKey>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
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
      for await (const ev of archiveApi.generate(topic.trim(), depth, ctrl.signal)) {
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
    if (ev.stage === 'outline' || ev.stage === 'synthesis') {
      setStage(ev.stage);
      setMessage(ev.message);
    } else if (ev.stage === 'outline_done') {
      // no-op; keep spinner
    } else if (ev.stage === 'expansion') {
      setStage('expansion');
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
    if (stage === 'outline') return 8;
    if (stage === 'expansion' && progress.total > 0) return 10 + Math.round(80 * progress.current / progress.total);
    if (stage === 'synthesis') return 95;
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

      {stage === 'idle' && (
        <button
          onClick={start}
          disabled={topic.trim().length < 3}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 text-[15px] font-bold disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-transform"
        >
          <Sparkles className="w-4 h-4" />
          ابدأ التوليد
        </button>
      )}

      {running && (
        <AppCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-foreground">جارٍ التوليد…</span>
            <button onClick={cancel} className="text-[12px] text-destructive flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> إلغاء
            </button>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${stagePercent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{message}</span>
            {progress.total > 0 && <span>{progress.current}/{progress.total}</span>}
          </div>
          <div className="mt-3 flex gap-1.5 text-[11px]">
            {(['outline','expansion','synthesis','filed'] as const).map((s, i) => {
              const done = ['outline','expansion','synthesis','filed'].indexOf(stage) >= i;
              const labels = { outline: 'مخطط', expansion: 'توسيع', synthesis: 'تجميع', filed: 'حُفظ' };
              return (
                <div key={s} className={`flex-1 py-1 rounded text-center ${done ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground'}`}>
                  {labels[s]}
                </div>
              );
            })}
          </div>
        </AppCard>
      )}

      {stage === 'filed' && (
        <AppCard className="flex items-center gap-3 bg-primary/5 border-primary/30">
          <Check className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground flex-1">{message}</span>
        </AppCard>
      )}

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