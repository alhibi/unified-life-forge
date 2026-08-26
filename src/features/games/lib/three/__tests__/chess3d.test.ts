import { describe, expect, it } from 'vitest';

import {
  type Board2,
  deriveMove,
  needsSnapSync,
  squareToWorld,
  worldToSquare,
} from '../boardLayout';
import { buildEntities, entityAt, type PieceEntity,reconcileEntities } from '../entities';

// ── أدوات بناء لوحات للاختبار ──────────────────────────────────────
function emptyBoard(): Board2 {
  return Array.from({ length: 8 }, () => Array<Cell2>(8).fill(null));
}
type Cell2 = Board2[number][number];

function put(b: Board2, r: number, c: number, type: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P', color: 'w' | 'b'): void {
  b[r][c] = { type, color };
}

describe('boardLayout — الإحداثيات', () => {
  it('المربع d1 في مركز العالم تقريباً', () => {
    const [x, z] = squareToWorld(7, 3);
    expect(x).toBeCloseTo(-0.5);
    expect(z).toBeCloseTo(3.5);
    expect(worldToSquare(-0.5, 3.5)).toEqual([7, 3]);
  });

  it('التحويل ذهاب-عودة دقيق لكل المربعات', () => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const [x, z] = squareToWorld(r, c);
        expect(worldToSquare(x, z)).toEqual([r, c]);
      }
    }
  });
});

describe('boardLayout — اشتقاق النقلات', () => {
  it('نقلة هادئة: e2e4', () => {
    const a = emptyBoard();
    put(a, 6, 4, 'P', 'w'); // e2
    put(a, 7, 4, 'K', 'w');
    a[0][4] = { type: 'K', color: 'b' };
    const b = emptyBoard();
    put(b, 4, 4, 'P', 'w'); // e4
    put(b, 7, 4, 'K', 'w');
    b[0][4] = { type: 'K', color: 'b' };

    const mv = deriveMove(a, b);
    expect(mv).not.toBeNull();
    expect(mv!.kind).toBe('move');
    expect(mv!.from).toEqual([6, 4]);
    expect(mv!.to).toEqual([4, 4]);
    expect(mv!.pieceType).toBe('P');
  });

  it('التقاط عادي: بيدق يأكل حصاناً', () => {
    const a = emptyBoard();
    put(a, 6, 4, 'P', 'w');
    put(a, 5, 5, 'N', 'b');
    const b = emptyBoard();
    put(b, 5, 5, 'P', 'w');

    const mv = deriveMove(a, b);
    expect(mv?.kind).toBe('capture');
    expect(mv?.from).toEqual([6, 4]);
    expect(mv?.to).toEqual([5, 5]);
  });

  it('التبييت القصير للأبيض', () => {
    const a = emptyBoard();
    put(a, 7, 4, 'K', 'w');
    put(a, 7, 7, 'R', 'w');
    const b = emptyBoard();
    put(b, 7, 6, 'K', 'w');
    put(b, 7, 5, 'R', 'w');

    const mv = deriveMove(a, b);
    expect(mv?.kind).toBe('castle');
    expect(mv?.from).toEqual([7, 4]);
    expect(mv?.to).toEqual([7, 6]);
    expect(mv?.rook?.from).toEqual([7, 7]);
    expect(mv?.rook?.to).toEqual([7, 5]);
  });

  it('الأخذ بالتجاوز: الضحية بجوار الوجهة لا فوقها', () => {
    const a = emptyBoard();
    put(a, 3, 4, 'P', 'w'); // e5
    put(a, 3, 3, 'P', 'b'); // d5
    const b = emptyBoard();
    put(b, 2, 3, 'P', 'w'); // exd6
    // ضحية البيدق الأسود اختفت تماماً

    const mv = deriveMove(a, b);
    expect(mv?.kind).toBe('enpassant');
    expect(mv?.to).toEqual([2, 3]);
    expect(mv?.epVictim?.square).toEqual([3, 3]);
  });

  it('الترقية إلى وزير', () => {
    const a = emptyBoard();
    put(a, 1, 0, 'P', 'w');
    const b = emptyBoard();
    put(b, 0, 0, 'Q', 'w');

    const mv = deriveMove(a, b);
    expect(mv?.kind).toBe('promotion');
    expect(mv?.promotedTo).toBe('Q');
  });

  it('الترقية بالتقاط', () => {
    const a = emptyBoard();
    put(a, 1, 1, 'P', 'w');
    put(a, 0, 2, 'B', 'b');
    const b = emptyBoard();
    put(b, 0, 2, 'N', 'w');

    const mv = deriveMove(a, b);
    expect(mv?.kind).toBe('promotion');
    expect(mv?.promotedTo).toBe('N');
    expect(mv?.from).toEqual([1, 1]);
    expect(mv?.to).toEqual([0, 2]);
  });

  it('فرق غير نقطية (تراجع مضاعف / إعادة ضبط) تعيد null', () => {
    const a = emptyBoard();
    put(a, 6, 0, 'P', 'w');
    const b = emptyBoard();
    put(b, 4, 0, 'P', 'w'); // قفزتان — غير ممكنة كنقلة واحدة قانونية
    put(b, 6, 7, 'P', 'w'); // ظهور إضافي

    expect(deriveMove(a, b)).toBeNull();
    expect(needsSnapSync(a, b)).toBe(true);
  });

  it('لوحات متطابقة تعيد null (لا شيء تحرك)', () => {
    const a = emptyBoard();
    put(a, 7, 4, 'K', 'w');
    expect(deriveMove(a, a)).toBeNull();
    expect(needsSnapSync(a, a)).toBe(false);
  });
});

describe('entities — المطابقة عبر النقلات', () => {
  it('الكيان يحتفظ بهويته بعد النقلة', () => {
    const boardA = emptyBoard() as unknown as ({ type: 'K'; color: 'w' } | null)[][];
    put(boardA, 7, 4, 'K', 'w');
    put(boardA, 6, 4, 'P', 'w');
    const entsA = buildEntities(boardA as never);
    const pawnA = entityAt(entsA, 6, 4)!;
    expect(pawnA.id).toBeTruthy();

    const boardB = emptyBoard();
    put(boardB, 4, 4, 'P', 'w');
    put(boardB, 7, 4, 'K', 'w');
    const entsB = reconcileEntities(entsA, boardB as never);
    const pawnB = entityAt(entsB, 4, 4)!;
    expect(pawnB.id).toBe(pawnA.id); // نفس الهوية → نفس mesh يتحرك
  });

  it('المتحرك يورّث هوية الأقرب بنفس اللون والرتبة', () => {
    const boardA = emptyBoard();
    put(boardA, 6, 0, 'N', 'w');
    put(boardA, 6, 7, 'N', 'w'); // حصانان متطابقان بعيدان
    const entsA = buildEntities(boardA as never);

    const boardB = emptyBoard();
    put(boardB, 5, 2, 'N', 'w'); // أقرب للحصان الأول
    const entsB = reconcileEntities(entsA, boardB as never);
    const moved = entityAt(entsB, 5, 2)!;
    const leftKnight = entsA.find((e) => e.c === 0)!;
    expect(moved.id).toBe(leftKnight.id);
  });

  it('الالتقاط يبقي هوية الآكل ويُسقط هوية الضحية', () => {
    const boardA = emptyBoard();
    put(boardA, 6, 4, 'P', 'w');
    put(boardA, 5, 5, 'N', 'b');
    const entsA = buildEntities(boardA as never);
    const eater = entityAt(entsA, 6, 4)!;

    const boardB = emptyBoard();
    put(boardB, 5, 5, 'P', 'w');
    const entsB = reconcileEntities(entsA, boardB as never);
    expect(entityAt(entsB, 5, 5)!.id).toBe(eater.id);
    expect(entsB.filter((e: PieceEntity) => e.color === 'b')).toHaveLength(0);
  });
});
