import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';

import { AppCard, IconButton } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';
import type { DiwanGlossaryEntry } from '@/features/diwan/lib/types';
import { BookOpen, Quote, X } from '@/lib/icons';

interface Props {
  open: boolean;
  word: string | null; // الكلمة الملموسة بالضبط (للعنوان)
  entries: DiwanGlossaryEntry[]; // المعاني المطابقة (قد تكون فارغة)
  versePreview?: string; // نصّ البيت كاملاً (للسياق)
  onClose: () => void;
}

/**
 * Bottom-sheet يعرض شرح كلمة من معجم القصيدة.
 *
 * • يفتح عند long-press على كلمة في `LibraryPoem`.
 * • إن لم يُعثر على معنى، تُعرض حالة فارغة قياسية (StateView).
 * • a11y: dialog مودال حقيقي مع focus trap بسيط، إغلاق بـ Escape،
 *   ورُجوع التركيز إلى العنصر الذي فتح الشيت بعد الإغلاق.
 *
 * السطح الآن من طبقة النظام: `.app-scrim` للتعتيم و`.app-overlay-surface`
 * لسطح المحتوى — لا تعتيم أسود خام ولا ظل ولا blur محلي.
 */
export default function GlossarySheet({ open, word, entries, versePreview, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  // نحفظ العنصر الذي كان يحمل التركيز قبل الفتح لإعادته بعد الإغلاق
  // (أساسي للقارئات الشاشية: لا يجب أن "يضيع" تركيز المستخدم).
  const lastActiveRef = useRef<HTMLElement | null>(null);

  // إدارة التركيز ومفتاح Escape
  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = (document.activeElement as HTMLElement) ?? null;
    // ركّز على زرّ الإغلاق كنقطة بداية آمنة
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      // focus trap بسيط: نلوّب التركيز داخل الشيت فقط
      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      // إعادة التركيز إلى مَن فتحه (إن كان لا يزال في الـ DOM)
      if (lastActiveRef.current && document.contains(lastActiveRef.current)) {
        lastActiveRef.current.focus();
      }
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — النظام: scrim الوحيد المعتمد */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="app-scrim z-drawer"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={word ? `شرح كلمة ${word}` : 'شرح المفردة'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="app-overlay-surface fixed inset-x-0 bottom-0 z-drawer max-h-[78vh] overflow-hidden rounded-t-xl rounded-b-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
              <span className="app-drawer-handle bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border/30 px-5 pt-1 pb-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                  المعجم
                </p>
                <h3 className="mt-0.5 break-words font-amiri text-title font-bold text-foreground">
                  {word ?? '—'}
                </h3>
              </div>
              <IconButton ref={closeBtnRef} onClick={onClose} aria-label="إغلاق المعجم">
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(78vh - 120px)' }}>
              {/* Verse preview */}
              {versePreview && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-border/30 bg-muted/40 p-3">
                  <Quote
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground-subtle"
                    aria-hidden="true"
                  />
                  <p className="flex-1 font-amiri text-meta leading-[2] text-foreground/85">
                    {versePreview}
                  </p>
                </div>
              )}

              {/* Entries */}
              {entries.length === 0 ? (
                <StateView
                  compact
                  kind="empty"
                  title="لا يوجد شرح محفوظ لهذه الكلمة"
                  body="سيُضاف الشرح تدريجياً مع إثراء المعجم. يمكنك تجربة الضغط المطوّل على كلمة أخرى داخل البيت."
                />
              ) : (
                <ul className="space-y-2.5">
                  {entries.map((g, i) => (
                    <li key={`${g.word}-${i}`}>
                      <AppCard flat className="p-3">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="font-amiri text-meta font-bold text-primary">
                            {g.word}
                          </span>
                          {g.verse_position !== null && (
                            <span className="text-micro text-muted-foreground-subtle">
                              البيت {g.verse_position + 1}
                            </span>
                          )}
                        </div>
                        <p className="text-mini leading-relaxed text-foreground/85">{g.meaning}</p>
                      </AppCard>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
