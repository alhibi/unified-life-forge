// =============================================================================
// Sudoku Logical Solver — finds the "next move" by applying real human
// solving techniques in increasing order of difficulty. Returns not just
// the digit/cell to place, but also which technique was used and which
// peer cells form the evidence — so the UI can highlight them and
// explain the reasoning.
//
// Techniques implemented (easiest → hardest):
//   1. Naked Single   — a cell has only one candidate
//   2. Hidden Single  — a digit has only one possible cell in a unit
//   3. Locked Candidate (Pointing) — within a box, a digit confined to a
//      single row/col can be eliminated from the rest of that line
//   4. Locked Candidate (Claiming) — within a row/col, a digit confined
//      to a single box can be eliminated from the rest of that box
//   5. Naked Pair     — two cells in a unit share exactly two candidates
//   6. Hidden Pair    — two cells in a unit are the only ones holding
//      two specific candidates
//   7. X-Wing         — a digit forms a rectangle in two rows/cols
//
// Each elimination/placement returned by step() is an atomic move the
// hint UI can present and the auto-solver can apply.
// =============================================================================

export type Cell = number | null;
export type Board = Cell[][];

export type TechniqueId =
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'pointingPair'
  | 'claimingPair'
  | 'nakedPair'
  | 'hiddenPair'
  | 'xWing'
  | 'guess';

export const TECHNIQUE_LABELS: Record<TechniqueId, { ar: string; difficulty: number }> = {
  nakedSingle:  { ar: 'مرشح وحيد',     difficulty: 1 },
  hiddenSingle: { ar: 'وحيد مخفي', difficulty: 2 },
  pointingPair: { ar: 'زوج مُشير',        difficulty: 3 },
  claimingPair: { ar: 'زوج مُطالب',        difficulty: 3 },
  nakedPair:    { ar: 'زوج مكشوف',       difficulty: 4 },
  hiddenPair:   { ar: 'زوج مخفي',   difficulty: 5 },
  xWing:        { ar: 'الجناح-X',             difficulty: 6 },
  guess:        { ar: 'تخمين',          difficulty: 9 },
};

export interface SolverHint {
  technique: TechniqueId;
  /** Cells that get a value placed (most techniques return one). */
  placements: { r: number; c: number; value: number }[];
  /** Cells whose candidates get pruned. */
  eliminations: { r: number; c: number; value: number }[];
  /** Cells the user should look at to *see* why this move works. */
  highlights: { r: number; c: number }[];
  /** Localized explanation strings for the Smart Hint dialog. */
  explanationAr: string;
}

// =============================================================================
// Candidate grid: 9x9 of Set<number>. Pencil marks computed from the board.
// =============================================================================
type Candidates = Set<number>[][];

function buildCandidates(board: Board): Candidates {
  const cands: Candidates = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  );
  // Remove all already-placed digits from peers.
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const v = board[r][c];
    if (v !== null) {
      cands[r][c] = new Set();
      eliminateFromPeers(cands, r, c, v);
    }
  }
  return cands;
}

function eliminateFromPeers(cands: Candidates, r: number, c: number, v: number) {
  for (let i = 0; i < 9; i++) { cands[r][i].delete(v); cands[i][c].delete(v); }
  const sr = Math.floor(r / 3) * 3, sc = Math.floor(c / 3) * 3;
  for (let i = sr; i < sr + 3; i++) for (let j = sc; j < sc + 3; j++) cands[i][j].delete(v);
}

// =============================================================================
// Unit iterators
// =============================================================================
function rowCells(r: number): [number, number][] {
  return Array.from({ length: 9 }, (_, c) => [r, c] as [number, number]);
}
function colCells(c: number): [number, number][] {
  return Array.from({ length: 9 }, (_, r) => [r, c] as [number, number]);
}
function boxCells(b: number): [number, number][] {
  const sr = Math.floor(b / 3) * 3, sc = (b % 3) * 3;
  const out: [number, number][] = [];
  for (let r = sr; r < sr + 3; r++) for (let c = sc; c < sc + 3; c++) out.push([r, c]);
  return out;
}
function boxIndex(r: number, c: number): number { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }

// =============================================================================
// Technique 1: Naked Single
// =============================================================================
function findNakedSingle(cands: Candidates): SolverHint | null {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (cands[r][c].size === 1) {
      const [v] = cands[r][c];
      return {
        technique: 'nakedSingle',
        placements: [{ r, c, value: v }],
        eliminations: [],
        highlights: [{ r, c }],
        explanationAr: `الخلية (${r + 1}, ${c + 1}) لا يبقى لها سوى الرقم ${v}.`,
      };
    }
  }
  return null;
}

// =============================================================================
// Technique 2: Hidden Single (in any unit)
// =============================================================================
function findHiddenSingle(cands: Candidates): SolverHint | null {
  const units: { name: 'row' | 'col' | 'box'; idx: number; cells: [number, number][] }[] = [];
  for (let i = 0; i < 9; i++) {
    units.push({ name: 'row', idx: i, cells: rowCells(i) });
    units.push({ name: 'col', idx: i, cells: colCells(i) });
    units.push({ name: 'box', idx: i, cells: boxCells(i) });
  }
  for (const u of units) {
    for (let v = 1; v <= 9; v++) {
      const places = u.cells.filter(([r, c]) => cands[r][c].has(v));
      if (places.length === 1) {
        const [r, c] = places[0];
        const unitName = u.name === 'row' ? `الصف ${u.idx + 1}` : u.name === 'col' ? `العمود ${u.idx + 1}` : `المربع ${u.idx + 1}`;
        const unitNameDe = u.name === 'row' ? `Reihe ${u.idx + 1}` : u.name === 'col' ? `Spalte ${u.idx + 1}` : `Block ${u.idx + 1}`;
        return {
          technique: 'hiddenSingle',
          placements: [{ r, c, value: v }],
          eliminations: [],
          highlights: u.cells.map(([rr, cc]) => ({ r: rr, c: cc })),
          explanationAr: `الرقم ${v} لا يمكن وضعه إلا في الخلية (${r + 1}, ${c + 1}) داخل ${unitName}.`,
        };
      }
    }
  }
  return null;
}

// =============================================================================
// Technique 3: Locked Candidates - Pointing (within a box)
// If digit v in box B can only go in cells that share a row/col, eliminate v
// from the rest of that row/col outside the box.
// =============================================================================
function findPointing(cands: Candidates): SolverHint | null {
  for (let b = 0; b < 9; b++) {
    const cells = boxCells(b);
    for (let v = 1; v <= 9; v++) {
      const places = cells.filter(([r, c]) => cands[r][c].has(v));
      if (places.length < 2 || places.length > 3) continue;
      const allSameRow = places.every(([r]) => r === places[0][0]);
      const allSameCol = places.every(([, c]) => c === places[0][1]);
      if (allSameRow) {
        const r = places[0][0];
        const elims: { r: number; c: number; value: number }[] = [];
        for (let c = 0; c < 9; c++) {
          if (boxIndex(r, c) === b) continue;
          if (cands[r][c].has(v)) elims.push({ r, c, value: v });
        }
        if (elims.length > 0) return {
          technique: 'pointingPair',
          placements: [],
          eliminations: elims,
          highlights: [...places.map(([rr, cc]) => ({ r: rr, c: cc })), ...elims.map(e => ({ r: e.r, c: e.c }))],
          explanationAr: `داخل المربع، الرقم ${v} مقيّد على الصف ${r + 1}، فيُحذف من بقية الصف.`,
        };
      }
      if (allSameCol) {
        const c = places[0][1];
        const elims: { r: number; c: number; value: number }[] = [];
        for (let r = 0; r < 9; r++) {
          if (boxIndex(r, c) === b) continue;
          if (cands[r][c].has(v)) elims.push({ r, c, value: v });
        }
        if (elims.length > 0) return {
          technique: 'pointingPair',
          placements: [],
          eliminations: elims,
          highlights: [...places.map(([rr, cc]) => ({ r: rr, c: cc })), ...elims.map(e => ({ r: e.r, c: e.c }))],
          explanationAr: `داخل المربع، الرقم ${v} مقيّد على العمود ${c + 1}، فيُحذف من بقية العمود.`,
        };
      }
    }
  }
  return null;
}

// =============================================================================
// Technique 4: Locked Candidates - Claiming (within a row/col)
// If digit v in row R can only go in cells of one box, eliminate v from the
// rest of that box.
// =============================================================================
function findClaiming(cands: Candidates): SolverHint | null {
  for (let i = 0; i < 9; i++) {
    for (const which of ['row', 'col'] as const) {
      const cells = which === 'row' ? rowCells(i) : colCells(i);
      for (let v = 1; v <= 9; v++) {
        const places = cells.filter(([r, c]) => cands[r][c].has(v));
        if (places.length < 2 || places.length > 3) continue;
        const boxes = new Set(places.map(([r, c]) => boxIndex(r, c)));
        if (boxes.size !== 1) continue;
        const b = [...boxes][0];
        const elims: { r: number; c: number; value: number }[] = [];
        for (const [r, c] of boxCells(b)) {
          if (which === 'row' && r === i) continue;
          if (which === 'col' && c === i) continue;
          if (cands[r][c].has(v)) elims.push({ r, c, value: v });
        }
        if (elims.length > 0) return {
          technique: 'claimingPair',
          placements: [],
          eliminations: elims,
          highlights: [...places.map(([rr, cc]) => ({ r: rr, c: cc })), ...elims.map(e => ({ r: e.r, c: e.c }))],
          explanationAr: `${which === 'row' ? 'في الصف' : 'في العمود'} ${i + 1}، الرقم ${v} محصور في مربع واحد، فيُحذف من باقيه.`,
        };
      }
    }
  }
  return null;
}

// =============================================================================
// Technique 5: Naked Pair
// Two cells in the same unit have identical 2-candidate sets.
// =============================================================================
function findNakedPair(cands: Candidates): SolverHint | null {
  const units = buildAllUnits();
  for (const u of units) {
    const twos = u.filter(([r, c]) => cands[r][c].size === 2);
    for (let i = 0; i < twos.length; i++) {
      for (let j = i + 1; j < twos.length; j++) {
        const [r1, c1] = twos[i]; const [r2, c2] = twos[j];
        const a = [...cands[r1][c1]].sort().join(',');
        const b = [...cands[r2][c2]].sort().join(',');
        if (a !== b) continue;
        const [v1, v2] = [...cands[r1][c1]];
        const elims: { r: number; c: number; value: number }[] = [];
        for (const [r, c] of u) {
          if ((r === r1 && c === c1) || (r === r2 && c === c2)) continue;
          if (cands[r][c].has(v1)) elims.push({ r, c, value: v1 });
          if (cands[r][c].has(v2)) elims.push({ r, c, value: v2 });
        }
        if (elims.length > 0) return {
          technique: 'nakedPair',
          placements: [],
          eliminations: elims,
          highlights: [{ r: r1, c: c1 }, { r: r2, c: c2 }, ...elims.map(e => ({ r: e.r, c: e.c }))],
          explanationAr: `الخليتان (${r1 + 1},${c1 + 1}) و (${r2 + 1},${c2 + 1}) تحتويان فقط ${v1} و${v2}، فهما تحجزانهما عن بقية الوحدة.`,
        };
      }
    }
  }
  return null;
}

// =============================================================================
// Technique 6: Hidden Pair
// Two digits appear in exactly the same two cells within a unit.
// =============================================================================
function findHiddenPair(cands: Candidates): SolverHint | null {
  const units = buildAllUnits();
  for (const u of units) {
    // Map digit -> positions in this unit
    const places: Record<number, [number, number][]> = {};
    for (let v = 1; v <= 9; v++) places[v] = [];
    for (const [r, c] of u) for (const v of cands[r][c]) places[v].push([r, c]);

    const twoPlaceDigits = Object.entries(places).filter(([, p]) => p.length === 2);
    for (let i = 0; i < twoPlaceDigits.length; i++) {
      for (let j = i + 1; j < twoPlaceDigits.length; j++) {
        const [v1, p1] = twoPlaceDigits[i];
        const [v2, p2] = twoPlaceDigits[j];
        // Same two cells?
        const k1 = p1.map(([r, c]) => `${r},${c}`).sort().join('|');
        const k2 = p2.map(([r, c]) => `${r},${c}`).sort().join('|');
        if (k1 !== k2) continue;
        // Pair found — eliminate other candidates from the two cells.
        const elims: { r: number; c: number; value: number }[] = [];
        for (const [r, c] of p1) {
          for (const w of cands[r][c]) {
            if (w !== Number(v1) && w !== Number(v2)) elims.push({ r, c, value: w });
          }
        }
        if (elims.length > 0) return {
          technique: 'hiddenPair',
          placements: [],
          eliminations: elims,
          highlights: p1.map(([rr, cc]) => ({ r: rr, c: cc })),
          explanationAr: `الرقمان ${v1} و${v2} لا يظهران إلا في خليتين، فيُحذف ما عداهما من تلك الخليتين.`,
        };
      }
    }
  }
  return null;
}

// =============================================================================
// Technique 7: X-Wing (rows variant + cols variant)
// =============================================================================
function findXWing(cands: Candidates): SolverHint | null {
  for (let v = 1; v <= 9; v++) {
    // ----- Row-based X-Wing -----
    // For each pair of rows where v appears in exactly 2 cells, and those
    // cells share both columns, eliminate v from those columns elsewhere.
    const rowsWithTwo: { row: number; cols: [number, number] }[] = [];
    for (let r = 0; r < 9; r++) {
      const cs: number[] = [];
      for (let c = 0; c < 9; c++) if (cands[r][c].has(v)) cs.push(c);
      if (cs.length === 2) rowsWithTwo.push({ row: r, cols: [cs[0], cs[1]] });
    }
    for (let i = 0; i < rowsWithTwo.length; i++) {
      for (let j = i + 1; j < rowsWithTwo.length; j++) {
        const A = rowsWithTwo[i], B = rowsWithTwo[j];
        if (A.cols[0] !== B.cols[0] || A.cols[1] !== B.cols[1]) continue;
        const elims: { r: number; c: number; value: number }[] = [];
        for (const c of A.cols) {
          for (let r = 0; r < 9; r++) {
            if (r === A.row || r === B.row) continue;
            if (cands[r][c].has(v)) elims.push({ r, c, value: v });
          }
        }
        if (elims.length > 0) return {
          technique: 'xWing',
          placements: [],
          eliminations: elims,
          highlights: [
            { r: A.row, c: A.cols[0] }, { r: A.row, c: A.cols[1] },
            { r: B.row, c: B.cols[0] }, { r: B.row, c: B.cols[1] },
          ],
          explanationAr: `الرقم ${v} يشكل مستطيلاً عبر الصفين ${A.row + 1} و${B.row + 1} والعمودين ${A.cols[0] + 1} و${A.cols[1] + 1}.`,
        };
      }
    }
    // ----- Column-based X-Wing -----
    const colsWithTwo: { col: number; rows: [number, number] }[] = [];
    for (let c = 0; c < 9; c++) {
      const rs: number[] = [];
      for (let r = 0; r < 9; r++) if (cands[r][c].has(v)) rs.push(r);
      if (rs.length === 2) colsWithTwo.push({ col: c, rows: [rs[0], rs[1]] });
    }
    for (let i = 0; i < colsWithTwo.length; i++) {
      for (let j = i + 1; j < colsWithTwo.length; j++) {
        const A = colsWithTwo[i], B = colsWithTwo[j];
        if (A.rows[0] !== B.rows[0] || A.rows[1] !== B.rows[1]) continue;
        const elims: { r: number; c: number; value: number }[] = [];
        for (const r of A.rows) {
          for (let c = 0; c < 9; c++) {
            if (c === A.col || c === B.col) continue;
            if (cands[r][c].has(v)) elims.push({ r, c, value: v });
          }
        }
        if (elims.length > 0) return {
          technique: 'xWing',
          placements: [],
          eliminations: elims,
          highlights: [
            { r: A.rows[0], c: A.col }, { r: A.rows[1], c: A.col },
            { r: B.rows[0], c: B.col }, { r: B.rows[1], c: B.col },
          ],
          explanationAr: `الرقم ${v} يشكل X-Wing عبر العمودين ${A.col + 1} و${B.col + 1}.`,
        };
      }
    }
  }
  return null;
}

function buildAllUnits(): [number, number][][] {
  const units: [number, number][][] = [];
  for (let i = 0; i < 9; i++) {
    units.push(rowCells(i)); units.push(colCells(i)); units.push(boxCells(i));
  }
  return units;
}

// =============================================================================
// Public API: nextHint(board) — returns the easiest technique applicable.
// =============================================================================
export function nextHint(board: Board): SolverHint | null {
  const cands = buildCandidates(board);
  // Try techniques in order of human difficulty.
  const fns = [
    findNakedSingle,
    findHiddenSingle,
    findPointing,
    findClaiming,
    findNakedPair,
    findHiddenPair,
    findXWing,
  ];
  for (const fn of fns) {
    const hint = fn(cands);
    if (hint) return hint;
  }
  return null;
}

// =============================================================================
// Auto-solve via repeated technique application + fallback to backtracking.
// Used by the "show me how this puzzle solves" demo. Returns the chain of
// hints for narration plus the final solved board.
// =============================================================================
export function explainSolve(board: Board): { steps: SolverHint[]; solved: Board | null } {
  const work: Board = board.map(r => [...r]);
  const steps: SolverHint[] = [];
  let safety = 0;
  while (safety++ < 200) {
    const hint = nextHint(work);
    if (!hint) break;
    steps.push(hint);
    for (const p of hint.placements) work[p.r][p.c] = p.value;
    if (hint.eliminations.length === 0 && hint.placements.length === 0) break;
  }
  const complete = work.every(row => row.every(cell => cell !== null));
  return { steps, solved: complete ? work : null };
}
