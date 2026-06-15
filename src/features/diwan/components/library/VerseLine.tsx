import React, { useMemo, useRef } from 'react';
import { Check, Copy } from '@/lib/icons';
import { motion } from 'framer-motion';
import type { DiwanVerse } from '@/lib/diwan/types';

// طول الضغطة المطوّلة بالملي-ثانية. اخترنا 450ms كتسوية بين السرعة
// والإحساس المتعمَّد. أقل من ذلك يصبح اكتشاف خاطئ، أكثر يبدو بطيئاً.
const LONG_PRESS_MS = 450;

// انحراف مسموح به أثناء الضغط قبل اعتباره سحباً (بالبكسل). أكبر من
// ذلك نلغي مؤقّت الضغطة المطوّلة لأن المستخدم يمرّر الصفحة.
const PRESS_MOVE_TOLERANCE = 8;

interface Props {
  /**
   * البيت كما يجب أن يُعرض — الأب يُحضّر النصّ وفق حالة التشكيل، فلا
   * نُعيد الاختيار هنا. نقبل DiwanVerse كاملاً للحفاظ على `position`
   * وغيره (للنسخ والتحديد).
   */
  verse: DiwanVerse;
  /** تطبيع عربي قياسي — يُمرّر من الأعلى لتحاشي إعادة البناء */
  normalize: (s: string) => string;
  /** المفاتيح الموجودة في المعجم — تظليل الكلمات المُفهرسة */
  glossaryHas: Set<string>;
  copied: boolean;
  onCopy: (verse: DiwanVerse) => void;
  onLookup: (word: string, verse: DiwanVerse) => void;
}

/**
 * يرسم بيتاً مفرداً (صدر/عجز) مع دعم:
 *   • ضغطة قصيرة → نسخ البيت كاملاً.
 *   • ضغطة مطوّلة على كلمة → فتح شرحها من المعجم.
 *   • تظليل خفيف للكلمات التي لها شرح متاح (decoration: dotted).
 *
 * نستخدم Pointer Events الموحّدة فتعمل بنفس السلوك على
 * اللمس وعلى الفأرة.
 *
 * مُحاط بـ React.memo لأنّ صفحة القصيدة تُعيد render-ها كل مرة يتغيّر
 * فيها copiedIdx (حالة في الأب)، وقصائد المعلّقات قد تحوي 80 بيتاً —
 * بدون memo نُعيد تركيب جميع الـ <span data-word> 80 مرّة لكل ضغطة.
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

  // التوكنة عملية صرفة على (text, glossaryHas) — نحفظها بـ useMemo
  // لتجنّب إعادة بناء عشرات/مئات الـ spans في كل re-render.
  // Set يُعرَّف كجزء من المفتاح بمرجعه؛ يضمن الأب استقراره (Set مبنيّ بـ useMemo).
  const renderedH1 = useMemo(
    () => renderWords(h1, normalize, glossaryHas),
    [h1, normalize, glossaryHas],
  );
  const renderedH2 = useMemo(
    () => renderWords(h2, normalize, glossaryHas),
    [h2, normalize, glossaryHas],
  );

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
    // نلتقط الكلمة المستهدفة وقت الضغط — لا وقت الإفلات — لأن المستخدم
    // قد يحرّك إصبعه قليلاً أثناء التثبيت.
    const wordEl = (e.target as HTMLElement).closest('[data-word]') as HTMLElement | null;
    targetWord.current = wordEl?.dataset.word ?? null;

    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      pressTimer.current = null;
      // لمسة هابتيك لطيفة على الموبايل
      if (typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(8); } catch { /* ignore */ }
      }
      // إن لم نعثر على كلمة، نمرّر سلسلة فارغة فيظهر BottomSheet
      // بحالة فارغة (لكنه يبقى مفيداً لاكتشاف الميزة).
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
      className="w-full group relative py-2 px-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors text-center select-none"
      style={{ touchAction: 'pan-y' }}
      aria-label="نسخ البيت — أو اضغط مطوّلاً على كلمة لشرحها"
    >
      {h2 ? (
        <div className="grid grid-cols-2 gap-4 items-baseline">
          <p
            className="text-[15px] sm:text-[16px] text-foreground leading-[2] text-end"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {renderedH1}
          </p>
          <p
            className="text-[15px] sm:text-[16px] text-foreground leading-[2] text-start"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {renderedH2}
          </p>
        </div>
      ) : (
        <p
          className="text-[15px] text-foreground leading-[2]"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          {renderedH1}
        </p>
      )}

      <span
        className={`absolute top-1/2 -translate-y-1/2 start-1 opacity-0 group-hover:opacity-100 transition-opacity ${copied ? 'opacity-100' : ''}`}
        aria-hidden
      >
        {copied
          ? <Check className="w-3.5 h-3.5 text-green-500" />
          : <Copy  className="w-3.5 h-3.5 text-muted-foreground" />}
      </span>
    </motion.button>
  );
}

// React.memo — props مرجعيّاً مستقرّة (verse عبر slug، normalize/glossaryHas
// عبر useMemo في الأب، وonCopy/onLookup عبر useCallback اختياريّاً).
// نستخدم المقارنة الافتراضية (Object.is) لأن جميع props بسيطة أو مذكّرة.
export default React.memo(VerseLine);

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * يقسّم النص إلى كلمات ومسافات ويُغلّف كل كلمة في span لها
 * `data-word`. الكلمات التي لها شرح في المعجم تُزخرف بخطّ منقّط
 * خفيف للإيحاء بإمكانية التفاعل.
 */
function renderWords(
  text: string,
  normalize: (s: string) => string,
  glossaryHas: Set<string>,
): React.ReactNode {
  if (!text) return null;
  // نحافظ على المسافات داخل الـ tokens حتى يبقى تخطيط الـ RTL طبيعياً.
  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) {
      return <React.Fragment key={i}>{tok}</React.Fragment>;
    }
    if (tok.length === 0) return null;
    const stripped = stripPunctuation(tok);
    const has = stripped.length > 0 && glossaryHas.has(normalize(stripped));
    return (
      <span
        key={i}
        data-word={stripped || tok}
        className={
          has
            ? 'underline decoration-dotted decoration-primary/50 underline-offset-[5px] decoration-1'
            : undefined
        }
      >
        {tok}
      </span>
    );
  });
}

// نَزَع علامات الترقيم من بداية ونهاية الكلمة قبل البحث في المعجم.
const PUNCT_BOUNDARY = /^[\u060C\u061B\u061F\.,!?:;«»"'()[\]{}—\-]+|[\u060C\u061B\u061F\.,!?:;«»"'()[\]{}—\-]+$/g;
function stripPunctuation(s: string): string {
  return s.replace(PUNCT_BOUNDARY, '');
}
