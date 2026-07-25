import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';

import type { DiwanGlossaryEntry } from '@/features/diwan/lib/types';
import { BookOpen, Quote,X } from '@/lib/icons';

interface Props {
  open: boolean;
  word: string | null;            // الكلمة الملموسة بالضبط (للعنوان)
  entries: DiwanGlossaryEntry[];  // المعاني المطابقة (قد تكون فارغة)
  versePreview?: string;          // نصّ البيت كاملاً (للسياق)
  onClose: () => void;
}

/**
 * Bottom-sheet يعرض شرح كلمة من معجم القصيدة.
 *
 * • يفتح عند long-press على كلمة في `LibraryPoem`.
 * • إن لم يُعثر على معنى، يُظهر حالة فارغة لطيفة (لا حاجة لتعطيل
 *   long-press على الكلمات غير المُفهرسة لأن المستخدم قد يكتشف).
 * • a11y: dialog مودال حقيقي مع focus trap بسيط، إغلاق بـ Escape،
 *   ورُجوع التركيز إلى العنصر الذي فتح الشيت بعد الإغلاق.
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-drawer bg-black/60"
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
            className="fixed inset-x-0 bottom-0 z-drawer max-h-[78vh] overflow-hidden rounded-t-3xl bg-card border-t border-border/40 "
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
              <span className="block w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-5 pt-1 pb-3 flex items-start gap-3 border-b border-border/30">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                  المعجم
                </p>
                <h3
                  className="text-[20px] font-bold text-foreground mt-0.5 leading-tight break-words"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {word ?? '—'}
                </h3>
              </div>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="إغلاق المعجم"
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(78vh - 120px)' }}>
              {/* Verse preview */}
              {versePreview && (
                <div className="mb-4 p-3 rounded-xl bg-muted/40 border border-border/30">
                  <div className="flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-1" aria-hidden="true" />
                    <p
                      className="text-[14px] text-foreground/85 leading-[2] flex-1"
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      {versePreview}
                    </p>
                  </div>
                </div>
              )}

              {/* Entries */}
              {entries.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[13px] text-muted-foreground">
                    لا يوجد شرح محفوظ لهذه الكلمة.
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed max-w-xs mx-auto">
                    سيُضاف الشرح تدريجياً مع إثراء المعجم. يمكنك تجربة الـ long-press
                    على كلمة أخرى داخل البيت.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {entries.map((g, i) => (
                    <li
                      key={`${g.word}-${i}`}
                      className="rounded-xl bg-card border border-border/30 p-3"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span
                          className="text-[15px] font-bold text-primary"
                          style={{ fontFamily: "'Amiri', serif" }}
                        >
                          {g.word}
                        </span>
                        {g.verse_position !== null && (
                          <span className="text-[10px] text-muted-foreground/80">
                            البيت {g.verse_position + 1}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-foreground/85 leading-relaxed">
                        {g.meaning}
                      </p>
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
