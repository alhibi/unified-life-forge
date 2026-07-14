/**
 * Word-level LCS diff for the OptimizerPanel's DiffViewer.
 *
 * Returns a flat sequence of segments — each is either `equal`,
 * `removed` (present only in a), or `added` (present only in b).
 * O(N*M) but bounded by note size (< a few KB), so cheap in practice.
 */

export type DiffSegment = { type: 'equal' | 'added' | 'removed'; text: string };

function tokenize(s: string): string[] {
  // Preserve whitespace runs as their own tokens so re-assembly is exact.
  return s.split(/(\s+)/).filter((x) => x !== '');
}

export function wordDiff(a: string, b: string): DiffSegment[] {
  const A = tokenize(a);
  const B = tokenize(b);
  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffSegment[] = [];
  const push = (type: DiffSegment['type'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { push('equal', A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('removed', A[i]); i++; }
    else { push('added', B[j]); j++; }
  }
  while (i < n) { push('removed', A[i++]); }
  while (j < m) { push('added', B[j++]); }
  return out;
}