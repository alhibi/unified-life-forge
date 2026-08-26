/**
 * pieceGeometry — مواصفات هندسية صافية لقطع الشطرنج (طراز Staunton منمّق).
 *
 * هذا الملف لا يلمس DOM ولا ينشئ خامات: هو بيانات نقاط وأجزاء بحتة،
 * تستهلكها طبقة المشهد لبناء geometries، ويختبرها vitest مباشرة.
 *
 * الوحدات: مربع الرقعة = 1.0 وحدة عالمية. ارتفاع القطع بنِسَب Staunton
 * تقريبية (الملك الأطول ~1.12، البيدق الأقصر ~0.62).
 */

export type PieceColor3D = 'w' | 'b';
export type PieceType3D = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

/** نقطة ملف جانبي: نصف قطر + ارتفاع (لدوران الدولاب). */
export interface ProfilePt {
  r: number;
  y: number;
}

/** جزء إضافي غير دوّار (أبراج القلعة، كرة تاج الوزير، صليب الملك…). */
export type ExtraPart =
  | { kind: 'box'; size: [number, number, number]; pos: [number, number, number]; rotY?: number }
  | { kind: 'sphere'; r: number; pos: [number, number, number] }
  | {
      kind: 'extrude';
      /** صورة ظلية للرأس في مستوى XY (x للأمام، y للأعلى)، مغلقة. */
      outline: [number, number][];
      depth: number;
      pos: [number, number, number];
      rotY?: number;
    };

export interface PieceSpec {
  /** نقاط الملف الثوري من الأسفل (y=0) إلى الأعلى. */
  profile: ProfilePt[];
  /** أجزاء ملحقة تُجمَع حول المحور. */
  extras: ExtraPart[];
  /** الارتفاع الكلي الاسمي (للاختبارات والكاميرا). */
  height: number;
}

/** أقصى نصف قطر لكل قطعة — يستخدم لتوزيع الظلال وحجم نقاط التفاعل. */
export const PIECE_RADII: Record<PieceType3D, number> = {
  K: 0.34,
  Q: 0.32,
  R: 0.30,
  B: 0.30,
  N: 0.32,
  P: 0.26,
};

/** ارتفاعات القطع — توقيع بصري سريع يميّز الرتبة من الحدة alone. */
export const PIECE_HEIGHTS: Record<PieceType3D, number> = {
  K: 1.12,
  Q: 1.02,
  R: 0.74,
  B: 0.9,
  N: 0.8,
  P: 0.6,
};

// ────────────────────────────────────────────────────────────────
// أدوات بناء الملفات
// ────────────────────────────────────────────────────────────────

/** قاعدة مخروطية مشطوفة (plinth) بارتفاع h ونصف قطر R. */
function foot(R: number, h: number): ProfilePt[] {
  return [
    { r: 0.001, y: 0 },
    { r: R * 0.86, y: 0 },
    { r: R, y: h * 0.42 },
    { r: R * 0.94, y: h * 0.72 },
    { r: R * 0.78, y: h },
  ];
}

/** حلقة طوق زخرفية عند ارتفاع y بنصف قطري داخلي/خارجي. */
function collar(y: number, rIn: number, rOut: number, hh = 0.045): ProfilePt[] {
  return [
    { r: rIn, y },
    { r: rOut, y: y + hh * 0.4 },
    { r: rOut, y: y + hh },
    { r: rIn * 0.96, y: y + hh * 1.25 },
  ];
}

/** قبة كروية تقريبية بين ارتفاعين (قمة الفيل / رأس البيدق). */
function dome(cx: number, cy: number, R: number, steps = 7): ProfilePt[] {
  const pts: ProfilePt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI; // 0..π
    pts.push({ r: Math.max(0.001, Math.sin(t) * R), y: cy - Math.cos(t) * R * 0.92 });
  }
  void cx;
  return pts;
}

// ────────────────────────────────────────────────────────────────
// المواصفات
// ────────────────────────────────────────────────────────────────

/** البيدق: قاعدة، ساق ممتلئة، رأس كروي. */
export function pawnSpec(): PieceSpec {
  return {
    height: PIECE_HEIGHTS.P,
    profile: [
      ...foot(PIECE_RADII.P, 0.16),
      { r: 0.115, y: 0.3 },
      ...collar(0.3, 0.105, 0.155),
      ...dome(0, 0.462, 0.138),
      { r: 0.001, y: PIECE_HEIGHTS.P },
    ],
    extras: [],
  };
}

/** الرخّ: قاعدة، برج مستدق، تاج بأبراج (merlons). */
export function rookSpec(): PieceSpec {
  const merlons: ExtraPart[] = [];
  const M = 5;
  for (let i = 0; i < M; i++) {
    const a = (i / M) * Math.PI * 2;
    merlons.push({
      kind: 'box',
      size: [0.085, 0.085, 0.05],
      pos: [Math.sin(a) * 0.185, 0.665, Math.cos(a) * 0.185],
      rotY: a,
    });
  }
  return {
    height: PIECE_HEIGHTS.R,
    profile: [
      ...foot(PIECE_RADII.R, 0.17),
      { r: 0.165, y: 0.3 },
      { r: 0.15, y: 0.5 },
      ...collar(0.5, 0.145, 0.205, 0.06),
      { r: 0.195, y: 0.6 },
      { r: 0.195, y: 0.625 },
      { r: 0.13, y: 0.625 },
      { r: 0.13, y: PIECE_HEIGHTS.R - 0.002 },
      { r: 0.001, y: PIECE_HEIGHTS.R },
    ],
    extras: merlons,
  };
}

/** الفيل: جسم نحيل وقبعة دمعية بكرة نهائية. */
export function bishopSpec(): PieceSpec {
  return {
    height: PIECE_HEIGHTS.B,
    profile: [
      ...foot(PIECE_RADII.B, 0.18),
      { r: 0.125, y: 0.36 },
      ...collar(0.36, 0.115, 0.17),
      { r: 0.1, y: 0.47 },
      // القبعة الدمعية: انتفاخ ثم انغلاق
      { r: 0.155, y: 0.56 },
      { r: 0.165, y: 0.63 },
      { r: 0.12, y: 0.73 },
      { r: 0.055, y: 0.8 },
      ...collar(0.8, 0.045, 0.075, 0.03),
      ...dome(0, 0.855, 0.048, 5),
      { r: 0.001, y: PIECE_HEIGHTS.B },
    ],
    extras: [],
  };
}

/**
 * الحصان: جسم دوّار قصير + رأس حصان بروفيّ مبثوق.
 * الصورة الظلية بواجهة +x (الأمام)، والمشهد يدوّر كل حصان نحو الخصم.
 */
export function knightSpec(): PieceSpec {
  const outline: [number, number][] = [
    [-0.17, 0.0], // أسفل الرقبة خلفاً
    [-0.145, 0.16], // عرف العُنُف الخلفي
    [-0.105, 0.3],
    [-0.06, 0.385], // خلف الأذن
    [-0.015, 0.43], // طرف الأذن الخلفية
    [0.025, 0.365], // ما بين الأذنين
    [0.09, 0.335], // الجبهة
    [0.15, 0.27], // الحاجب
    [0.225, 0.19], // جسر الأنف
    [0.255, 0.13], // سنم الخطم
    [0.25, 0.075], // مقدمة المنخر
    [0.19, 0.045], // الشفة
    [0.115, 0.015], // الفك
    [0.03, 0.0], // الحلق
  ];
  return {
    height: PIECE_HEIGHTS.N,
    profile: [
      ...foot(PIECE_RADII.N, 0.17),
      { r: 0.17, y: 0.26 },
      ...collar(0.26, 0.15, 0.21),
      { r: 0.145, y: 0.31 },
      { r: 0.1, y: 0.345 },
      { r: 0.001, y: 0.36 },
    ],
    extras: [{ kind: 'extrude', outline, depth: 0.15, pos: [0, 0.335, 0] }],
  };
}

/** الوزير: طويل أنيق بتاج مسنن وكرة علوية. */
export function queenSpec(): PieceSpec {
  const beads: ExtraPart[] = [];
  const B = 8;
  for (let i = 0; i < B; i++) {
    const a = (i / B) * Math.PI * 2;
    beads.push({
      kind: 'sphere',
      r: 0.032,
      pos: [Math.sin(a) * 0.185, 0.855, Math.cos(a) * 0.185],
    });
  }
  return {
    height: PIECE_HEIGHTS.Q,
    profile: [
      ...foot(PIECE_RADII.Q, 0.19),
      { r: 0.14, y: 0.4 },
      ...collar(0.4, 0.125, 0.185),
      { r: 0.105, y: 0.55 },
      ...collar(0.55, 0.1, 0.15, 0.035),
      { r: 0.095, y: 0.64 },
      // الإناء الملكي
      { r: 0.15, y: 0.74 },
      { r: 0.185, y: 0.8 },
      { r: 0.16, y: 0.845 },
      { r: 0.075, y: 0.875 },
      ...dome(0, 0.91, 0.055, 5),
      { r: 0.001, y: PIECE_HEIGHTS.Q },
    ],
    extras: beads,
  };
}

/** الملك: الأطول، بقمة صليبية أيقونية. */
export function kingSpec(): PieceSpec {
  return {
    height: PIECE_HEIGHTS.K,
    profile: [
      ...foot(PIECE_RADII.K, 0.2),
      { r: 0.155, y: 0.44 },
      ...collar(0.44, 0.14, 0.2),
      { r: 0.12, y: 0.6 },
      ...collar(0.6, 0.11, 0.165, 0.04),
      { r: 0.105, y: 0.7 },
      { r: 0.16, y: 0.8 },
      { r: 0.19, y: 0.87 },
      { r: 0.15, y: 0.92 },
      { r: 0.07, y: 0.945 },
      ...dome(0, 0.97, 0.06, 5),
      { r: 0.001, y: 0.99 },
    ],
    extras: [
      { kind: 'box', size: [0.05, 0.17, 0.032], pos: [0, 1.055, 0] }, // الصليب العمودي
      { kind: 'box', size: [0.13, 0.032, 0.032], pos: [0, 1.075, 0] }, // الصليب الأفقي
    ],
  };
}

const SPEC_BUILDERS: Record<PieceType3D, () => PieceSpec> = {
  P: pawnSpec,
  R: rookSpec,
  B: bishopSpec,
  N: knightSpec,
  Q: queenSpec,
  K: kingSpec,
};

/** يعيد مواصفة قطعة (نسخة جديدة كل استدعاء — آمنة للتعديل). */
export function getPieceSpec(type: PieceType3D): PieceSpec {
  return SPEC_BUILDERS[type]();
}

/** كل الأنواع — مفيد للاختبارات ومعاينة المعرض. */
export function getAllPieceTypes(): PieceType3D[] {
  return ['K', 'Q', 'R', 'B', 'N', 'P'];
}
