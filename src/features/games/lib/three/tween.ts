/**
 * tween — محرك توقيتات حركية صافٍ (بلا three ولا React).
 *
 * كل أنيميشن في المشهد يقودها دالة خالصة: (زمن منذ البدء) → حالة.
 * هذا يجعل الإيقاع قابلاً للاختبار عددياً وقابلاً للضبط مركزياً.
 */

/** منحنى تخفيف: إدخال 0..1 ← إخراج 0..1. */
export type Easing = (t: number) => number;

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutQuint: Easing = (t) => 1 - Math.pow(1 - t, 5);
/** نبضة تتضاءل — لهب الكش، اهتزاز الالتقاط. */
export const pulseDecay: Easing = (t) => Math.exp(-4.5 * t) * Math.sin(t * Math.PI * 5);

/** ارتداد كرة سقوط — لإسقاط الملك الخاسر. */
export const easeOutBounce: Easing = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/** تقدّم زمني مقيد [0,1] أو null إذا انتهى المدة. */
export function progress(elapsedMs: number, durationMs: number): number | null {
  if (durationMs <= 0) return null;
  const p = elapsedMs / durationMs;
  if (p >= 1) return null;
  return p;
}

/**
 * مسار قوسي بين نقطتين: خط مستقيم مع رفع جيبي في المنتصف.
 * `arcHeight` بوحدات العالم (نسبة من حجم المربع). القمم الأطول
 * للنقلات البعيدة تعطي إحساس «رمي» بدل انزلاق.
 */
export function arcY(distSquares: number, arcScale = 0.22): number {
  // مسافة 1 → ~0.16 وحدة؛ مسافة 7 → ~0.55. نمو جذري ليبقى متناسقاً.
  return arcScale * (0.75 + Math.sqrt(Math.max(0, distSquares - 1)) * 0.42);
}

/** ارتفاع القوس عند نسبة t من المسار (0..1). */
export function arcLift(t: number, height: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * height;
}

// ────────────────────────────────────────────────────────────────
// التوقيتات المرجعية للمشهد (ms)
// ────────────────────────────────────────────────────────────────

/** مدة انزلاق النقلة القريبة. */
export const DUR_SLIDE_SHORT = 260;
/** مدة الانزلاق الأطول (تناسب المسافة فعلياً في المشهد). */
export function slideDuration(distSquares: number): number {
  return DUR_SLIDE_SHORT + Math.min(240, distSquares * 38);
}
/** سقوط الالتقاط: ارتجاف الضحية ثم ذوبان. */
export const DUR_CAPTURE_SHUDDER = 130;
export const DUR_CAPTURE_SINK = 420;
/** هبوط القطعة بعد القوس. */
export const DUR_LAND_SETTLE = 180;
/** وميض مربع آخر نقلة. */
export const DUR_LASTMOVE_FLASH = 700;
/** حلقة نبض الكش (تتكرر). */
export const DUR_CHECK_PULSE = 1100;
/** ظهور نقاط النقلات القانونية. */
export const DUR_LEGAL_POP = 160;
/** موجة دخول القطع عند بناء الرقعة. */
export const DUR_STAGGER_STEP = 26;
/** سقوط الملك الخاسر. */
export const DUR_TOPPLE = 850;
/** عمر تأثير الغبار عند الهبوط. */
export const DUR_LAND_FX = 620;

/** اختيار منحنى النقلة حسب نوعها — مركزي لضبط الإحساس دفعة واحدة. */
export function moveEasing(kind: 'slide' | 'slideFar' | 'land'): Easing {
  switch (kind) {
    case 'slide':
      return easeInOutCubic;
    case 'slideFar':
      return easeInOutCubic;
    case 'land':
      return easeOutCubic;
  }
}
