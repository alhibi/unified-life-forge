import { motion } from 'framer-motion';
import React, { useCallback, useMemo, useRef } from 'react';

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

/** صنفا تظليل الكلمة المفهرسة في المعجم — واحد للاستخدام المزدوج. */
const GLOSSARY_WORD_CLASS =
  'underline decoration-dotted decoration-primary/50 decoration-1 underline-offset-[5px]';

/**
 * يرسم بيتاً مفرداً (صدر/عجز) داخل ورقة القصيدة: ترقيم بخط Amiri على
 * الحافة، فاصل منقط بين الشطرين، وتلوين آخر حرف (الروي) بلون الإبراز.
 * صفّ تفاعلي داخل المحتوى (نسخ بالنقر، ومعجم بالضغط المطوّل)، لا صفّ
 * تنقّل — لذا يحتفظ بسلوكه ويأخذ ألوان التفاعل من التوكنز الموحّدة.
 */
function VerseLine({ verse, normalize, glossaryHas, copied, onCopy, onLookup }: Props) {
  const h1 = verse.hemistich1 ?? '';
  const h2 = verse.hemistich2 ?? '';

  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const targetWord = useRef<string | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);

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
        try {
          navigator.vibrate(8);
        } catch {
          /* ignore */
        }
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
  const renderHemistich = useCallback(
    (text: string, isLastHemistich: boolean) => {
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
            <span key={i} data-word={stripped || tok} className={has ? GLOSSARY_WORD_CLASS : undefined}>
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
              <span key={i} data-word={stripped || tok} className={has ? GLOSSARY_WORD_CLASS : undefined}>
                {prefix}
                <span className="font-bold text-primary transition-colors">
                  {lastChar}
                  {diacritics}
                </span>
              </span>
            );
          }
        }

        return (
          <span key={i} data-word={stripped || tok} className={has ? GLOSSARY_WORD_CLASS : undefined}>
            {tok}
          </span>
        );
      });
    },
    [glossaryHas, normalize],
  );

  const renderedH1 = useMemo(() => renderHemistich(h1, !h2), [h1, h2, renderHemistich]);

  const renderedH2 = useMemo(() => renderHemistich(h2, true), [h2, renderHemistich]);

  return (
    <motion.button
      type="button"
      variants={{
        hidden: { opacity: 0, y: 4 },
        show: { opacity: 1, y: 0 },
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      className="relative flex w-full items-center gap-3 border-b border-dashed border-border/50 px-1 py-3 text-center transition-colors hover:bg-interactive-hover last:border-b-0"
      style={{ touchAction: 'pan-y' }}
      aria-label="نسخ البيت — أو اضغط مطوّلاً على كلمة لشرحها"
    >
      {/* رقم البيت الصغير بخط Amiri على أقصى الحافة */}
      <span className="w-6 shrink-0 select-none text-end font-amiri text-mini text-muted-foreground">
        {verse.position + 1}
      </span>

      {h2 ? (
        /* صدر وعجز بفاصل منقط (ثنية الورق) */
        <div className="grid flex-1 grid-cols-2 items-center gap-4">
          <p className="text-end font-amiri text-body leading-[1.9] text-foreground">{renderedH1}</p>

          <div className="flex items-center self-stretch">
            {/* فاصل عمودي منقط يمثل ثنية الصفحة */}
            <div className="h-full w-[1.5px] shrink-0 select-none bg-border opacity-35" />

            <p className="flex-1 pe-4 text-end font-amiri text-body leading-[1.9] text-foreground">
              {renderedH2}
            </p>
          </div>
        </div>
      ) : (
        <p className="flex-1 text-end font-amiri text-body leading-[1.9] text-foreground">
          {renderedH1}
        </p>
      )}

      {/* شارة النسخ اللطيفة */}
      <span
        className={`shrink-0 transition-opacity ${copied ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      >
        {copied && (
          <span className="px-1 font-tajawal text-micro font-semibold text-data-1">تم النسخ</span>
        )}
      </span>
    </motion.button>
  );
}

export default React.memo(VerseLine);

// Helpers
const PUNCT_BOUNDARY = /^[\u060C\u061B\u061F.,!?:;«»"'()[\]{}—-]+|[\u060C\u061B\u061F.,!?:;«»"'()[\]{}—-]+$/g;
function stripPunctuation(s: string): string {
  return s.replace(PUNCT_BOUNDARY, '');
}
