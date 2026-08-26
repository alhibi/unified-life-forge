/**
 * entities — كيانات القطع ثلاثية الأبعاد ومطابقتها عبر النقلات.
 *
 * كل قطعة على الرقعة لها هوية مستقرة (id) تُحافَظ عليها عبر النقلات
 * حتى تتحرك meshes فعلياً بدل إعادة بنائها. المصفوفة الوصفية تُشتق
 * من لوحة اللعبة في كل تغيير، ثم يُطابق reconciler الكيانات القديمة
 * بالجديدة (نفس المربع = نفس الهوية؛ وإلا فهي القطعة المتحركة).
 */

import type { Color2, Type2 } from './boardLayout';

export type EntityId = string;

/** قطعة مجردة على اللوحة — بلا موضع عالمي بعد. */
export interface PieceEntity {
  id: EntityId;
  color: Color2;
  type: Type2;
  /** مربع حالي (صف r، عمود c) باصطلاح الصفحة. */
  r: number;
  c: number;
}

let counter = 0;
function nextId(): EntityId {
  counter += 1;
  return `p${counter}`;
}

/** يبني كيانات من لوحة. يُستدعى عند التهيئة أو المزامنة الصلبة فقط. */
export function buildEntities(board: ({ type: Type2; color: Color2 } | null)[][]): PieceEntity[] {
  const out: PieceEntity[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      out.push({ id: nextId(), color: cell.color, type: cell.type, r, c });
    }
  }
  return out;
}

/**
 * يطابق كيانات سابقة مع لوحة جديدة:
 *  - القطعة الباقية في نفس المربع تحتفظ بهويتها.
 *  - المتحركة/المرقّاة تأخذ هوية أقرب قطعة غائبة عن لوحتها القديمة.
 * يعيد قائمة جديدة؛ لا يعدّل المدخلات.
 */
export function reconcileEntities(
  prevEntities: PieceEntity[],
  board: ({ type: Type2; color: Color2 } | null)[][],
): PieceEntity[] {
  const prevByKey = new Map<string, PieceEntity>();
  for (const e of prevEntities) prevByKey.set(`${e.r}:${e.c}`, e);

  const usedIds = new Set<EntityId>();
  const result: PieceEntity[] = [];

  // المرحلة 1: المطابقة بالمربع الثابت.
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const key = `${r}:${c}`;
      const match = prevByKey.get(key);
      // نعيد استخدام الهوية فقط إذا طابقت اللون والرتبة (وإلا فالقطعة القديمة
      // كانت ضحية التقط هنا والجديدة كيان مختلف).
      if (
        match &&
        !usedIds.has(match.id) &&
        match.color === cell.color &&
        match.type === cell.type
      ) {
        usedIds.add(match.id);
        result.push({ ...match, r, c });
      } else {
        result.push({ id: nextId(), color: cell.color, type: cell.type, r, c });
      }
    }
  }

  // المرحلة 2: للكيانات الجديدة (المتحركة)، ورِّث هوية قطعة قديمة غير مستخدمة
  // بنفس اللون والرتبة الأقرب موقعاً — هذا يحافظ على mesh الفعل نفسه.
  for (const ent of result) {
    if (usedIds.has(ent.id)) continue;
    let best: PieceEntity | null = null;
    let bestDist = Infinity;
    for (const cand of prevEntities) {
      if (usedIds.has(cand.id)) continue;
      if (cand.color !== ent.color || cand.type !== ent.type) continue;
      const d = Math.abs(cand.r - ent.r) + Math.abs(cand.c - ent.c);
      if (d < bestDist) {
        bestDist = d;
        best = cand;
      }
    }
    if (best && bestDist <= 7 + 7) {
      usedIds.add(best.id);
      result[result.indexOf(ent)] = { ...ent, id: best.id };
    }
  }

  return result;
}

/** يجد كياناً بمربعه. */
export function entityAt(entities: PieceEntity[], r: number, c: number): PieceEntity | null {
  for (const e of entities) if (e.r === r && e.c === c) return e;
  return null;
}
