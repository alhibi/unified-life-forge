import { useState } from 'react';
import { useOptimizer, type OptimizerMode } from '../hooks/useOptimizer';
import DiffViewer from './DiffViewer';
import { extractTags } from '../lib/tagParser';
import { extractWikiLinks } from '../lib/wikiLinks';
import { X, Sparkles } from '@/lib/icons';
import { cn } from '@/lib/utils';

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
  isAr,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  onAccept: (next: string) => void;
  isAr: boolean;
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
    if (status === 'rate_limited') return isAr ? 'كثير من الطلبات، حاول بعد قليل.' : 'Zu viele Anfragen, bitte später erneut.';
    if (status === 'credits_exhausted') return isAr ? 'انتهى الرصيد المتاح.' : 'Guthaben aufgebraucht.';
    if (status === 'error') return isAr ? 'حدث خطأ، حاول مجدّدًا.' : 'Ein Fehler ist aufgetreten.';
    if (status === 'aborted') return isAr ? 'أُلغيت العملية.' : 'Abgebrochen.';
    return null;
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm flex items-end lg:items-center lg:justify-center">
      <div className="w-full lg:max-w-2xl bg-card rounded-t-3xl lg:rounded-3xl border border-border/60 shadow-2xl max-h-[90vh] flex flex-col">
        <header className="flex items-center gap-2 p-4 border-b border-border/40">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold flex-1">
            {isAr ? 'محسِّن النص' : 'Optimierer'}
          </h2>
          <button
            onClick={() => { cancel(); reset(); onClose(); }}
            className="h-8 w-8 rounded-full bg-background border border-border/60 flex items-center justify-center"
            aria-label={isAr ? 'إغلاق' : 'Schließen'}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex gap-2">
            {(['A', 'B'] as OptimizerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={busy}
                className={cn(
                  'flex-1 h-10 rounded-xl border text-xs font-semibold text-start px-3',
                  mode === m ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-background border-border/60',
                )}
              >
                {m === 'A'
                  ? (isAr ? 'الوضع أ — الهرم التحليلي' : 'Modus A — Analytische Pyramide')
                  : (isAr ? 'الوضع ب — الشبكة الدلالية' : 'Modus B — Semantisches Netzwerk')}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={start}
              disabled={busy || !body.trim()}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {busy
                ? (isAr ? 'جارٍ التوليد…' : 'Generiert…')
                : (isAr ? 'ابدأ' : 'Starten')}
            </button>
            {busy && (
              <button
                onClick={cancel}
                className="h-10 px-4 rounded-xl bg-background border border-border/60 text-sm"
              >
                {isAr ? 'إلغاء' : 'Abbrechen'}
              </button>
            )}
          </div>

          {statusMsg() && (
            <div className="text-xs text-destructive px-1">{statusMsg()}</div>
          )}

          <div className="flex-1 min-h-0 overflow-auto rounded-xl bg-background/50 border border-border/40 p-3">
            {output ? (
              <DiffViewer original={body} optimized={output} />
            ) : (
              <div className="text-xs text-muted-foreground text-center pt-10">
                {isAr
                  ? 'اختر الوضع ثم اضغط "ابدأ" لتوليد نسخة مُنظَّمة من ملاحظتك.'
                  : 'Wähle einen Modus und starte die Neustrukturierung deiner Notiz.'}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { reset(); }}
              disabled={!output || busy}
              className="h-10 px-4 rounded-xl bg-background border border-border/60 text-sm disabled:opacity-50"
            >
              {isAr ? 'تراجع' : 'Verwerfen'}
            </button>
            <button
              onClick={() => { onAccept(output); reset(); onClose(); }}
              disabled={!canAccept}
              className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {isAr ? 'قبول واستبدال' : 'Übernehmen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}