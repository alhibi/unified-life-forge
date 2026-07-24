import React, { useMemo, useRef } from 'react';
import { Check, Copy } from '@/lib/icons';
import { motion } from 'framer-motion';
import type { DiwanVerse } from '@/features/diwan/lib/types';

const LONG_PRESS_MS = 450;
const PRESS_MOVE_TOLERANCE = 8;

interface Props {
  verse: DiwanVerse;
  normalize: (s: string) => string;
  glossaryHas: Set<string>;
  copied: boolean;
  onCopy: (verse: DiwanVerse) => void;
  onLookup: (word: string, verse: DiwanVerse) => void;
}

/**
 * يرسم بيتاً مفرداً (صدر/عجز) مصمماً بالكامل بنمط صفحة من مخطوطة أصيلة.
 * يتميز بفاصل عمودي منقط (ثنية الورق)، وترقيم الأبيات بخط Amiri على الحافة،
 * وتلوين حرف الروي (آخر حرف من العجز) بلون شمع الختم (wax).
 */
function VerseLine({
  verse, normalize, glossaryHas, copied, onCopy, onLookup,
}: Props) {
  const h1 = verse.hemistich1 ?? '';
  const h2 = verse.hemistich2 ?? '';

  const pressTimer    = useRef<number | null>(null);
  const longPressed   = useRef(false);
  const targetWord    = useRef<string | null>(null);
  const startX        = useRef(0);
  const startY        = useRef(0);

  const cancelTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    longPressed.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;

    const wordEl = (e.target as HTMLElement).closest('[data-word]') as HTMLElement | null;
    targetWord.current = wordEl?.dataset.word ?? null;

    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      pressTimer.current = null;
      if (typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(8); } catch { /* ignore */ }
      }
      onLookup(targetWord.current ?? '', verse);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pressTimer.current === null) return;
    const dx = Math.abs(e.clientX - startX.current);
    const dy = Math.abs(e.clientY - startY.current);
    if (dx > PRESS_MOVE_TOLERANCE || dy > PRESS_MOVE_TOLERANCE) cancelTimer();
  };

  const onPointerUp = () => {
    cancelTimer();
    if (!longPressed.current) onCopy(verse);
  };

  const onPointerCancel = () => cancelTimer();

  // تلوين آخر حرف من شطر مع حماية التشكيل
  const renderHemistich = (text: string, isLastHemistich: boolean) => {
    if (!text) return null;
    const tokens = text.split(/(\s+)/);

    // إذا لم يكن الشطر الأخير أو لا نريد إبراز القافية، نستخدم المعالجة العادية للكلمات
    if (!isLastHemistich) {
      return tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <React.Fragment key={i}>{tok}</React.Fragment>;
        if (tok.length === 0) return null;
        const stripped = stripPunctuation(tok);
        const has = stripped.length > 0 && glossaryHas.has(normalize(stripped));
        return (
          <span
            key={i}
            data-word={stripped || tok}
            className={
              has
                ? 'underline decoration-dotted decoration-[var(--wax)]/50 underline-offset-[5px] decoration-1'
                : undefined
            }
          >
            {tok}
          </span>
        );
      });
    }

    // إيجاد الكلمة الأخيرة الفعالة لتلوين حرف الروي (القافية)
    let lastWordIndex = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i] && !/^\s+$/.test(tokens[i])) {
        lastWordIndex = i;
        break;
      }
    }

    return tokens.map((tok, i) => {
      if (/^\s+$/.test(tok)) return <React.Fragment key={i}>{tok}</React.Fragment>;
      if (tok.length === 0) return null;
      const stripped = stripPunctuation(tok);
      const has = stripped.length > 0 && glossaryHas.has(normalize(stripped));

      // إذا كانت هذه هي الكلمة الأخيرة، نلون حرفها الأخير
      if (i === lastWordIndex) {
        // البحث عن آخر حرف عربي أو لاتيني يليه تشكيل اختياري
        const match = tok.match(/([a-zA-Z\u0621-\u064A])([\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]*)$/);
        if (match && match.index !== undefined) {
          const prefix = tok.substring(0, match.index);
          const lastChar = match[1];
          const diacritics = match[2] || '';

          return (
            <span
              key={i}
              data-word={stripped || tok}
              className={
                has
                  ? 'underline decoration-dotted decoration-[var(--wax)]/50 underline-offset-[5px] decoration-1'
                  : undefined
              }
            >
              {prefix}
              <span className="text-[var(--wax)] font-bold transition-colors">
                {lastChar}{diacritics}
              </span>
            </span>
          );
        }
      }

      return (
        <span
          key={i}
          data-word={stripped || tok}
          className={
            has
              ? 'underline decoration-dotted decoration-[var(--wax)]/50 underline-offset-[5px] decoration-1'
              : undefined
          }
        >
          {tok}
        </span>
      );
    });
  };

  const renderedH1 = useMemo(
    () => renderHemistich(h1, !h2),
    [h1, h2, normalize, glossaryHas],
  );

  const renderedH2 = useMemo(
    () => renderHemistich(h2, true),
    [h2, normalize, glossaryHas],
  );

  return (
    <motion.button
      variants={{
        hidden: { opacity: 0, y: 4 },
        show:   { opacity: 1, y: 0 },
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      className="w-full relative py-3 px-1 hover:bg-[rgba(242,233,216,0.015)] active:bg-[rgba(242,233,216,0.03)] transition-colors text-center select-none border-b border-dashed border-[var(--hairline)] last:border-b-0 flex items-center gap-3"
      style={{ touchAction: 'pan-y' }}
      aria-label="نسخ البيت — أو اضغط مطوّلاً على كلمة لشرحها"
    >
      {/* رقم البيت الصغير بخط Amiri على أقصى الحافة */}
      <span className="w-6 shrink-0 text-right font-amiri text-[12.5px] text-[var(--ink-text-faint)] select-none">
        {verse.position + 1}
      </span>

      {h2 ? (
        /* صدر وعجز بفاصل منقط (ثنية الورق) */
        <div className="flex-1 grid grid-cols-2 gap-4 items-center">
          <p
            className="text-[17px] text-[#F2E9D8] leading-[1.9] text-right font-amiri"
          >
            {renderedH1}
          </p>

          <div className="flex items-center self-stretch">
            {/* فاصل عمودي منقط يمثل ثنية الصفحة */}
            <div
              className="w-[1.5px] h-full opacity-35 select-none shrink-0"
              style={{
                background: 'repeating-linear-gradient(to bottom, var(--hairline-strong), var(--hairline-strong) 2px, transparent 2px, transparent 6px)',
              }}
            />

            <p
              className="text-[17px] text-[#F2E9D8] leading-[1.9] text-right font-amiri flex-1 pr-4"
            >
              {renderedH2}
            </p>
          </div>
        </div>
      ) : (
        <p
          className="text-[17px] text-[#F2E9D8] leading-[1.9] text-right font-amiri flex-1"
        >
          {renderedH1}
        </p>
      )}

      {/* شارة النسخ اللطيفة */}
      <span
        className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${copied ? 'opacity-100' : ''}`}
        aria-hidden
      >
        {copied && (
          <span className="text-[11px] font-tajawal text-green-500 font-semibold px-1">تم النسخ</span>
        )}
      </span>
    </motion.button>
  );
}

export default React.memo(VerseLine);

// Helpers
const PUNCT_BOUNDARY = /^[\u060C\u061B\u061F\.,!?:;«»"'()[\]{}—\-]+|[\u060C\u061B\u061F\.,!?:;«»"'()[\]{}—\-]+$/g;
function stripPunctuation(s: string): string {
  return s.replace(PUNCT_BOUNDARY, '');
}
