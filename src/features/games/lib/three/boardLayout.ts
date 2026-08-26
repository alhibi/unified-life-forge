/**
 * boardLayout — رياضيات الرقعة واشتقاق النقلات من فروق اللوحات.
 *
 * طبقة صافية بالكامل: تأخذ لوحتين متتاليتين (قبل/بعد) وتستنتج ماذا حدث
 * (نقلة عادية / التقاط / تبييت / أخذ بالتجاوز / ترقية) دون أي معرفة
 * بمنطق القوانين نفسه — الصفحة مصدر الحقيقة، وهذه الوحدة تترجم أثرها البصري
 * إلى حركات مسرحية للقطع ثلاثية الأبعاد.
 */

export type Color2 = 'w' | 'b';
export type Type2 = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type Cell2 = { type: Type2; color: Color2 } | null;
export type Board2 = Cell2[][];

/** حجم المربع بوحدات العالم؛ كل مقاييس المشهد مشتقة منه. */
export const SQUARE = 1;

/**
 * إحداثيا مركز مربع في العالم.
 * اصطلاح الصفحة: r=0 صف الأسود الخلفي، c=0 الملف a.
 * العالم: x شرقاً مع +c، وz جنوباً (نحو الأبيض) مع +r.
 */
export function squareToWorld(r: number, c: number): [number, number] {
  return [(c - 3.5) * SQUARE, (r - 3.5) * SQUARE];
}

/** العكس: إحداثيات عالمية → مربع (صف، عمود)، بأقرب مربع. */
export function worldToSquare(x: number, z: number): [number, number] {
  return [Math.round(z / SQUARE + 3.5), Math.round(x / SQUARE + 3.5)];
}

/** مسافة تشيبشيف بين مربعين بوحدات المربع. */
export function squareDist(a: [number, number], b: [number, number]): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

// ────────────────────────────────────────────────────────────────
// اشتقاق النقلات
// ────────────────────────────────────────────────────────────────

export type DerivedKind = 'move' | 'capture' | 'castle' | 'enpassant' | 'promotion';

export interface DerivedMove {
  kind: DerivedKind;
  from: [number, number];
  to: [number, number];
  color: Color2;
  /** رتبة القطعة المتحركة قبل الوصول. */
  pieceType: Type2;
  /** للترقية: الرتبة الجديدة بعد الوصول. */
  promotedTo?: Type2;
  /** للتبييت: حركة الرخّ المرافقة. */
  rook?: { from: [number, number]; to: [number, number] };
  /** للأخذ بالتجاوز: مربع البيدق المأسور المختفي. */
  epVictim?: { square: [number, number] };
}

interface Diff {
  r: number;
  c: number;
  p: { type: Type2; color: Color2 };
}

function samePiece(a: Cell2, b: Cell2): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.color === b.color && a.type === b.type;
}

/**
 * يقارن لوحتين متتاليتين ويستنتج النقلة الواقعة بينهما.
 *
 * بصمات الحالات (بعد مقارنة المربعات مربعاً بمربع):
 *  - نقلة هادئة:        اختفاء 1 + ظهور 1 في مربعين مختلفين، نفس الرتبة.
 *  - ترقية بلا التقاط:  اختفاء 1 (بيدق) + ظهور 1 (رتبة جديدة) بمربعتين متجاورتين قطرياً/عمودياً.
 *  - التقاط عادي:       اختفاء 2 (المتحرك + الضحية) + ظهور 1 فوق مربع الضحية، بنفس رتبة المتحرك.
 *  - ترقية بالتقاط:     اختفاء 2 + ظهور 1 فوق مربع الضحية برتبة جديدة عن البيدق.
 *  - أخذ بالتجاوز:      اختفاء 2 (المتحرك + ضحية بجوار وجهته) + ظهور 1 ليس فوق أي منهما.
 *  - تبييت:             اختفاء 2 (ملك+رخ) + ظهور 2 (ملك+رخ) بمواضع قانونية.
 * أي بصمة أخرى → null (تراجع، إعادة ضبط…) وتعالَج بمزامنة فورية.
 */
export function deriveMove(prev: Board2, next: Board2): DerivedMove | null {
  if (prev.length !== 8 || next.length !== 8) return null;

  const vanished: Diff[] = [];
  const appeared: Diff[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const a = prev[r][c];
      const b = next[r][c];
      if (samePiece(a, b)) continue;
      if (a && !b) vanished.push({ r, c, p: a });
      else if (!a && b) appeared.push({ r, c, p: b });
      else if (a && b) {
        // تبادل لونين في نفس المربع: الضحية اختفت والمتحرك حلّ مكانها.
        vanished.push({ r, c, p: a });
        appeared.push({ r, c, p: b });
      }
    }
  }

  // ── اختفاء 1 + ظهور 1: نقلة هادئة أو ترقية بلا التقاط ──
  if (vanished.length === 1 && appeared.length === 1) {
    const v = vanished[0];
    const ap = appeared[0];
    if (v.r === ap.r && v.c === ap.c) return null;
    const dist = squareDist([v.r, v.c], [ap.r, ap.c]);
    if (dist < 1 || dist > 7) return null;
    if (v.p.color !== ap.p.color) return null;

    // ترقية: بيدق غادر ورتبة أخرى حلّت على الصف الأخير.
    if (v.p.type === 'P' && ap.p.type !== 'P' && (ap.r === 0 || ap.r === 7)) {
      return {
        kind: 'promotion',
        from: [v.r, v.c],
        to: [ap.r, ap.c],
        color: v.p.color,
        pieceType: 'P',
        promotedTo: ap.p.type,
      };
    }
    if (v.p.type !== ap.p.type) return null;
    return {
      kind: 'move',
      from: [v.r, v.c],
      to: [ap.r, ap.c],
      color: v.p.color,
      pieceType: v.p.type,
    };
  }

  // ── اختفاء 2 + ظهور 1: التقاط / ترقية بالتقاط / أخذ بالتجاوز ──
  if (vanished.length === 2 && appeared.length === 1) {
    const ap = appeared[0];
    const onArrival = vanished.find((v) => v.r === ap.r && v.c === ap.c);
    const others = vanished.filter((v) => v !== onArrival);

    if (onArrival) {
      // تقاط: المتحرك هو الاختفاء الآخر (نفس لون الظاهر).
      const mover = others[0];
      if (!mover || mover.p.color !== ap.p.color) return null;
      const dist = squareDist([mover.r, mover.c], [ap.r, ap.c]);
      if (dist < 1 || dist > 7) return null;

      if (mover.p.type === ap.p.type) {
        return {
          kind: 'capture',
          from: [mover.r, mover.c],
          to: [ap.r, ap.c],
          color: ap.p.color,
          pieceType: ap.p.type,
        };
      }
      // ترقية بالتقاط: بيدق غادر ورتبة جديدة حلّت فوق الضحية.
      if (
        mover.p.type === 'P' &&
        (ap.r === 0 || ap.r === 7) &&
        squareDist([mover.r, mover.c], [ap.r, ap.c]) === 1
      ) {
        return {
          kind: 'promotion',
          from: [mover.r, mover.c],
          to: [ap.r, ap.c],
          color: ap.p.color,
          pieceType: 'P',
          promotedTo: ap.p.type,
        };
      }
      return null;
    }

    // أخذ بالتجاوز: الظهور ليس فوق أي اختفاء.
    const moverV = others.find(
      (v) => v.p.color === ap.p.color && v.p.type === 'P' && (v.r !== ap.r || v.c !== ap.c),
    );
    const victim = others.find((v) => v !== moverV);
    if (!moverV || !victim) return null;
    const diagStep =
      Math.abs(ap.r - moverV.r) === 1 && Math.abs(ap.c - moverV.c) === 1;
    const victimBeside =
      victim.p.type === 'P' &&
      victim.p.color !== ap.p.color &&
      victim.r === moverV.r &&
      Math.abs(victim.c - moverV.c) === 1;
    if (diagStep && victimBeside) {
      return {
        kind: 'enpassant',
        from: [moverV.r, moverV.c],
        to: [ap.r, ap.c],
        color: ap.p.color,
        pieceType: 'P',
        epVictim: { square: [victim.r, victim.c] },
      };
    }
    return null;
  }

  // ── اختفاء 2 + ظهور 2: تبييت ──
  if (vanished.length === 2 && appeared.length === 2) {
    const kingV = vanished.find((v) => v.p.type === 'K');
    const rookV = vanished.find((v) => v.p.type === 'R');
    const kingA = appeared.find((a) => a.p.type === 'K');
    const rookA = appeared.find((a) => a.p.type === 'R');
    if (kingV && kingA && rookV && rookA && kingV.p.color === kingA.p.color) {
      const dFiles = Math.abs(kingA.c - kingV.c);
      if (kingV.r === kingA.r && dFiles === 2 && rookV.r === rookA.r) {
        return {
          kind: 'castle',
          from: [kingV.r, kingV.c],
          to: [kingA.r, kingA.c],
          color: kingV.p.color,
          pieceType: 'K',
          rook: { from: [rookV.r, rookV.c], to: [rookA.r, rookA.c] },
        };
      }
    }
    return null;
  }

  return null;
}

/** عدد المربعات المختلفة فعلاً بين لوحتين. */
function countDiffs(prev: Board2, next: Board2): number {
  let diffs = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!samePiece(prev[r][c], next[r][c])) diffs++;
    }
  }
  return diffs;
}

/**
 * هل يجب مزامنة فورية بلا مسرحية؟
 * القاعدة الدقيقة: أي فرق تعذَّر تفسيره كنقلة واحدة قانونية الشكل
 * (تراجع، إعادة ضبط، حفظ/استعادة قديمة…) يستوجب مزامنة صامتة.
 */
export function needsSnapSync(prev: Board2, next: Board2): boolean {
  if (countDiffs(prev, next) === 0) return false;
  return deriveMove(prev, next) === null;
}
