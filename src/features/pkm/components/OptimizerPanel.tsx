import { useState } from 'react';

import { IconButton } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Sparkles,X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { type OptimizerMode,useOptimizer } from '../hooks/useOptimizer';
import { extractTags } from '../lib/tagParser';
import { extractWikiLinks } from '../lib/wikiLinks';
import DiffViewer from './DiffViewer';

/**
 * Slide-in panel that runs the note optimizer edge function and lets
 * the user accept or discard the streamed result. Labelled neutrally
 * ("محسِّن النص" / "Optimierer") to match SmartHub's app identity.
 */
export default function OptimizerPanel({
  open,
  onClose,
  title,
  body,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  onAccept: (next: string) => void;
}) {
  const [mode, setMode] = useState<OptimizerMode>('A');
  const { output, status, run, cancel, reset } = useOptimizer();

  if (!open) return null;

  const start = () =>
    run({
      content: body,
      title,
      tags: extractTags(body),
      linkedNotes: extractWikiLinks(body),
      mode,
    });

  const busy = status === 'streaming';
  const canAccept = status === 'done' && output.trim().length > 0;

  const statusMsg = () => {
    if (status === 'rate_limited') return 'كثير من الطلبات، حاول بعد قليل.';
    if (status === 'credits_exhausted') return 'انتهى الرصيد المتاح.';
    if (status === 'error') return 'حدث خطأ، حاول مجدّدًا.';
    if (status === 'aborted') return 'أُلغيت العملية.';
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-float flex items-end lg:items-center lg:justify-center"
      style={{ background: 'hsl(var(--scrim) / 0.6)' }}
    >
      <div className="app-card app-card-bare w-full lg:max-w-2xl rounded-t-3xl lg:rounded-3xl max-h-[90vh] flex flex-col">
        <header className="flex items-center gap-2 p-4 border-b border-border/40">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-meta font-bold flex-1">
            {'محسِّن النص'}
          </h2>
          <IconButton
            onClick={() => { cancel(); reset(); onClose(); }}
            aria-label={'إغلاق'}
          >
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex gap-2">
            {(['A', 'B'] as OptimizerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={busy}
                className={cn(
                  'flex-1 h-10 rounded-xl border text-mini font-semibold text-start px-3',
                  mode === m ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-background border-border/60',
                )}
              >
                {m === 'A'
                  ? ('الوضع أ — الهرم التحليلي')
                  : ('الوضع ب — الشبكة الدلالية')}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={start}
              disabled={busy || !body.trim()}
              className="flex-1"
            >
              {busy
                ? ('جارٍ التوليد…')
                : ('ابدأ')}
            </Button>
            {busy && (
              <Button variant="outline" onClick={cancel}>
                {'إلغاء'}
              </Button>
            )}
          </div>

          {statusMsg() && (
            <div className="text-mini text-destructive px-1">{statusMsg()}</div>
          )}

          <div className="flex-1 min-h-0 overflow-auto rounded-xl bg-background/50 border border-border/40 p-3">
            {output ? (
              <DiffViewer original={body} optimized={output} />
            ) : (
              <div className="text-mini text-muted-foreground text-center pt-10">
                {'اختر الوضع ثم اضغط "ابدأ" لتوليد نسخة مُنظَّمة من ملاحظتك.'}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { reset(); }}
              disabled={!output || busy}
            >
              {'تراجع'}
            </Button>
            <Button
              onClick={() => { onAccept(output); reset(); onClose(); }}
              disabled={!canAccept}
              className="flex-1"
            >
              {'قبول واستبدال'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}