/**
 * graveyard — هندسة مقبرة القطع المأسورة.
 *
 * كل قطعة تُلتقط ترقد مصغّرة ومائلة على سكة الإطار الخشبي لجهة
 * **آسرها** (غنائم الحرب عند الملك المنتصر): ما أسره الأبيض يرقد
 * على السكة الجنوبية وما أسره الأسود على الشمالية.
 * المواضع حتمية بحسب نوع القطعة ورقم تسلسلها، فتبقى الرقدة ثابتة
 * مهما تكرر الالتقاط والتراجع.
 */

import type { Color2, PieceType3D as Type2 } from './chessTypes';

/** ارتفاع سطح سكة الإطار الخشبي حيث ترقد القطع المأسورة. */
export const TERRACE_Y = 0.22;

/** مقياس التصغير للقطع المأسورة. */
export const GRAVE_SCALE = 0.62;

export interface GraveSpec {
  /** لون القطعة نفسها (يحدد مادتها: عاج/أوبسيديان). */
  pieceColor: Color2;
  /** جهة الآسر (تحدد السكة: الأبيض جنوباً والأسود شمالاً). */
  capturer: Color2;
  type: Type2;
  /** رقم التسلسل ضمن (نوع القطعة، الآسر). */
  seq: number;
}

/**
 * الموضع العالمي الكامل لمأسور: مركز + ميلان جانبي راقد.
 */
export function graveTransform(spec: GraveSpec): {
  pos: [number, number, number];
  rotZ: number;
} {
  const dir = spec.capturer === 'w' ? 1 : -1;
  const perRow = 8;
  const row = Math.floor(spec.seq / perRow);
  const col = spec.seq % perRow;
  const x = (col - (perRow - 1) / 2) * 0.5;
  const z = dir * (4.24 + row * 0.26);
  return {
    pos: [x, TERRACE_Y, z],
    rotZ: dir * (Math.PI / 2),
  };
}
