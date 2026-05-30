import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ChevronDown, FileText, FolderOpen, Loader2, Plus, Upload, X,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { FeedSource } from './types';
import { CATEGORIES } from './feeds';
import { parseOpml } from './opml';
import { SourcePill } from './SourcePill';

/**
 * OpmlImportDialog — a polished, drag-and-drop OPML import flow.
 *
 * Three stages, navigated as a single slide-up sheet:
 *   1. **Drop zone**: large dashed area where the user can either
 *      drag-drop an .opml file or click to open the OS file picker.
 *      File-over-window detection switches the dashed border to a
 *      filled-primary state for visual confirmation.
 *   2. **Preview**: parsed feeds grouped by their auto-detected
 *      category. Per-row checkbox lets the user uncheck duplicates
 *      / unwanted feeds. A category dropdown lets them retag without
 *      reopening the file. An "Already subscribed" pill marks rows
 *      whose URL is in `existingUrls` so they're checked-off by
 *      default. A summary footer shows
 *      "X new + Y duplicates · Z unselected".
 *   3. **Importing**: progress bar driven by the parent's onImport
 *      callback (which returns a promise). The dialog refuses to
 *      close while a stage-3 operation is in flight.
 *
 * Accessibility:
 *   - The file input keeps tab focus when the user uses keyboard.
 *   - Each preview row is independently focusable.
 *   - Esc closes the dialog whenever it's safe (i.e. not stage 3).
 */

type Stage = 'drop' | 'preview' | 'importing' | 'done';

interface PreviewRow extends FeedSource {
  /** True if this URL is already in the parent's feed list. */
  duplicate: boolean;
  /** User can deselect to skip this row on import. */
  selected: boolean;
}

export function OpmlImportDialog({
  open,
  isAr,
  existingUrls,
  onClose,
  onImport,
}: {
  open: boolean;
  isAr: boolean;
  existingUrls: Set<string>;
  onClose: () => void;
  /** Called when the user confirms. Returns the {added, skipped} stats
   *  so we can render them in the final stage. */
  onImport: (
    feeds: ReadonlyArray<{ url: string; name: string; category: string; enabled?: boolean }>,
  ) => Promise<{ added: number; skipped: number }>;
}) {
  const [stage, setStage] = useState<Stage>('drop');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset whenever the dialog re-opens
  useEffect(() => {
    if (!open) return;
    setStage('drop');
    setRows([]);
    setParseError('');
    setDragActive(false);
    setProgress(0);
    setResult(null);
    setFileName('');
  }, [open]);

  // Esc to close (when safe)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (stage === 'importing') return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, stage, onClose]);

  // Window-level drag listeners so the user can drop anywhere over
  // the dialog. We only flip the highlight when the drag enters the
  // window AND the dialog is in the drop stage.
  useEffect(() => {
    if (!open || stage !== 'drop') return;
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        setDragActive(true);
      }
    };
    const onLeave = (e: DragEvent) => {
      // Only un-highlight when leaving the window entirely.
      if ((e.relatedTarget as Node | null) === null) setDragActive(false);
    };
    const onDrop = () => setDragActive(false);
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [open, stage]);

  async function processFile(file: File) {
    if (!file) return;
    setParseError('');
    setFileName(file.name);
    if (file.size > 10 * 1024 * 1024) {
      setParseError(isAr ? 'الملف أكبر من 10MB' : 'File larger than 10MB');
      return;
    }
    let text = '';
    try {
      text = await file.text();
    } catch {
      setParseError(isAr ? 'تعذّر قراءة الملف' : 'Could not read file');
      return;
    }
    const parsed = parseOpml(text);
    if (parsed.length === 0) {
      setParseError(isAr ? 'لم يتم العثور على خلاصات صالحة' : 'No valid feeds found');
      return;
    }
    const previewRows: PreviewRow[] = parsed.map((p) => {
      const dup = existingUrls.has(p.url);
      return { ...p, duplicate: dup, selected: !dup };
    });
    setRows(previewRows);
    setStage('preview');
  }

  function patchRow(url: string, patch: Partial<PreviewRow>) {
    setRows((prev) => prev.map((r) => (r.url === url ? { ...r, ...patch } : r)));
  }

  async function confirmImport() {
    const toImport = rows.filter((r) => r.selected && !r.duplicate);
    if (toImport.length === 0) {
      toast.info(isAr ? 'لا توجد عناصر للاستيراد' : 'Nothing selected to import');
      return;
    }
    setStage('importing');
    setProgress(0);
    // The onImport call may take many seconds (50+ feeds chunk into
    // multiple fetch-rss calls). We can't get true progress without
    // changing the parent contract, so animate a smooth heuristic
    // that asymptotically approaches 95 %, then snap to 100 on
    // completion. This still gives the user the "something's
    // happening" feedback the loading bar is for.
    const start = Date.now();
    const expectedMs = Math.min(20_000, Math.max(2_000, toImport.length * 150));
    const interval = setInterval(() => {
      const t = Math.min(0.95, (Date.now() - start) / expectedMs);
      // Ease-out: faster at the start, slower as we approach 95 %.
      setProgress(Math.round(100 * (1 - Math.pow(1 - t, 3)) * 0.95));
    }, 100);

    try {
      const stats = await onImport(toImport);
      setResult(stats);
      setProgress(100);
      setStage('done');
    } catch (e: any) {
      toast.error(
        e?.message || (isAr ? 'تعذّر الاستيراد' : 'Import failed'),
      );
      setStage('preview');
    } finally {
      clearInterval(interval);
    }
  }

  if (!open) return null;

  const newCount = rows.filter((r) => r.selected && !r.duplicate).length;
  const dupCount = rows.filter((r) => r.duplicate).length;
  const unselectedCount = rows.filter((r) => !r.selected && !r.duplicate).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div
          className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          onClick={() => stage !== 'importing' && onClose()}
        />
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full sm:max-w-xl bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold">
                {isAr ? 'استيراد OPML' : 'Import OPML'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stage === 'drop'
                  ? (isAr
                    ? 'انقل ملف OPML من Feedly أو Inoreader'
                    : 'Drop an OPML file from Feedly or Inoreader')
                  : stage === 'preview'
                    ? (isAr
                      ? `${rows.length} خلاصة من ${fileName}`
                      : `${rows.length} feeds from ${fileName}`)
                    : stage === 'importing'
                      ? (isAr ? 'جاري الاستيراد...' : 'Importing...')
                      : (isAr ? 'تم الاستيراد' : 'Imported')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={stage === 'importing'}
              className="p-2 rounded-xl hover:bg-accent/50 disabled:opacity-50"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stage 1 — drop zone */}
          {stage === 'drop' && (
            <div className="flex-1 overflow-y-auto p-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex flex-col items-center justify-center text-center gap-3 py-14 px-6 rounded-2xl border-2 border-dashed transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 hover:border-primary/40 hover:bg-accent/15'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    dragActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold mb-1">
                    {dragActive
                      ? (isAr ? 'أفلت الملف هنا' : 'Drop the file')
                      : (isAr ? 'اسحب ملف OPML' : 'Drag an OPML file')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr
                      ? 'أو انقر لاختيار الملف من جهازك'
                      : 'Or tap to pick from your device'}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  .opml · .xml · ≤ 10 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".opml,.xml,application/xml,text/xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void processFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
              {parseError && (
                <p className="text-[12px] text-destructive text-center mt-4">
                  {parseError}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground text-center mt-5 max-w-prose mx-auto">
                {isAr
                  ? 'متوافق مع OPML 2.0 — يدعم تصدير Feedly، Inoreader، NetNewsWire، The Old Reader، وغيرها.'
                  : 'OPML 2.0 compatible — works with Feedly, Inoreader, NetNewsWire, The Old Reader, and more.'}
              </p>
            </div>
          )}

          {/* Stage 2 — preview */}
          {stage === 'preview' && (
            <PreviewStage
              rows={rows}
              isAr={isAr}
              onPatchRow={patchRow}
              onSelectAll={(v) => {
                setRows((prev) => prev.map((r) => (
                  r.duplicate ? r : { ...r, selected: v }
                )));
              }}
            />
          )}

          {/* Stage 3 — importing */}
          {stage === 'importing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-10">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div className="w-full max-w-xs space-y-2">
                <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center tabular-nums">
                  {progress}% — {isAr ? 'لا تُغلق النافذة' : 'Keep this open'}
                </p>
              </div>
              <p className="text-[12px] text-muted-foreground text-center max-w-xs">
                {isAr
                  ? 'يجلب آخر مقالات كل خلاصة جديدة دفعة واحدة، بدون إثقال الخادم.'
                  : 'Fetching the latest articles for each new feed in a single batched request.'}
              </p>
            </div>
          )}

          {/* Stage 4 — done */}
          {stage === 'done' && result && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Check className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold">
                  {isAr
                    ? `أُضيف ${result.added} مصدر`
                    : `Added ${result.added} feed${result.added === 1 ? '' : 's'}`}
                </p>
                {result.skipped > 0 && (
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {isAr
                      ? `تم تخطّي ${result.skipped} (مكرّر)`
                      : `Skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}`}
                  </p>
                )}
              </div>
              <Button onClick={onClose} className="rounded-xl mt-2">
                {isAr ? 'تم' : 'Done'}
              </Button>
            </div>
          )}

          {/* Sticky footer for stage 2 */}
          {stage === 'preview' && (
            <div className="border-t border-border/40 px-5 py-3.5 flex items-center gap-3">
              <p className="flex-1 text-[11px] text-muted-foreground tabular-nums">
                {isAr
                  ? `${newCount} جديدة · ${dupCount} مكرّرة${unselectedCount > 0 ? ` · ${unselectedCount} غير محدّدة` : ''}`
                  : `${newCount} new · ${dupCount} duplicate${dupCount === 1 ? '' : 's'}${unselectedCount > 0 ? ` · ${unselectedCount} unselected` : ''}`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStage('drop');
                  setRows([]);
                }}
                className="rounded-xl"
              >
                {isAr ? 'ملف آخر' : 'Different file'}
              </Button>
              <Button
                size="sm"
                onClick={confirmImport}
                disabled={newCount === 0}
                className="rounded-xl"
              >
                <Plus className="h-3.5 w-3.5 me-1.5" />
                {isAr
                  ? `استيراد ${newCount}`
                  : `Import ${newCount}`}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Preview stage ────────────────────────────────────────────────────

function PreviewStage({
  rows,
  isAr,
  onPatchRow,
  onSelectAll,
}: {
  rows: PreviewRow[];
  isAr: boolean;
  onPatchRow: (url: string, patch: Partial<PreviewRow>) => void;
  onSelectAll: (v: boolean) => void;
}) {
  // Group rows by category for readability.
  const groups = new Map<string, PreviewRow[]>();
  for (const r of rows) {
    const cat = r.category || 'other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(r);
  }
  const totalSelectable = rows.filter((r) => !r.duplicate).length;
  const totalSelected = rows.filter((r) => r.selected && !r.duplicate).length;
  const allSelected = totalSelected === totalSelectable && totalSelectable > 0;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          {isAr ? 'اختر الخلاصات' : 'Pick which feeds to import'}
        </p>
        <button
          type="button"
          onClick={() => onSelectAll(!allSelected)}
          className="text-[11px] text-primary font-semibold"
        >
          {allSelected
            ? (isAr ? 'إلغاء التحديد' : 'Deselect all')
            : (isAr ? 'تحديد الكل' : 'Select all')}
        </button>
      </div>
      <div className="space-y-4">
        {Array.from(groups).map(([cat, items]) => {
          const catLabel = CATEGORIES.find((c) => c.id === cat);
          return (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 ps-1">
                {catLabel ? (isAr ? catLabel.ar : catLabel.en) : cat}
              </p>
              <div className="rounded-2xl border border-border/40 divide-y divide-border/30 overflow-hidden">
                {items.map((row) => (
                  <PreviewRowItem
                    key={row.url}
                    row={row}
                    isAr={isAr}
                    onPatch={onPatchRow}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewRowItem({
  row,
  isAr,
  onPatch,
}: {
  row: PreviewRow;
  isAr: boolean;
  onPatch: (url: string, patch: Partial<PreviewRow>) => void;
}) {
  const [catOpen, setCatOpen] = useState(false);
  const catLabel = CATEGORIES.find((c) => c.id === row.category);
  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2.5 ${
        row.duplicate ? 'opacity-60' : ''
      }`}
    >
      <Checkbox
        checked={row.selected || row.duplicate}
        disabled={row.duplicate}
        onChange={(v) => onPatch(row.url, { selected: v })}
      />
      <SourcePill name={row.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{row.name}</p>
        <p className="text-[10px] text-muted-foreground truncate" dir="ltr">
          {row.url}
        </p>
      </div>
      {row.duplicate
        ? (
          <span className="px-2 py-1 rounded-lg bg-foreground/8 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0 inline-flex items-center gap-1">
            <Check className="h-3 w-3" />
            {isAr ? 'مضافة' : 'Added'}
          </span>
        )
        : (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-accent/30 text-muted-foreground hover:bg-accent/50 inline-flex items-center gap-1"
            >
              {catLabel ? (isAr ? catLabel.ar : catLabel.en) : row.category}
              <ChevronDown className="h-3 w-3" />
            </button>
            {catOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setCatOpen(false)}
                />
                <div className="absolute end-0 top-full mt-1 z-40 bg-card border border-border/60 rounded-xl shadow-lg overflow-hidden min-w-[8rem]">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onPatch(row.url, { category: c.id });
                        setCatOpen(false);
                      }}
                      className={`w-full text-start text-[12px] px-3 py-1.5 hover:bg-accent/30 transition-colors ${
                        c.id === row.category ? 'text-primary font-bold' : ''
                      }`}
                    >
                      {isAr ? c.ar : c.en}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
    </div>
  );
}

function Checkbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-foreground/30 bg-transparent'
      } ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer hover:border-primary/60'}`}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}
