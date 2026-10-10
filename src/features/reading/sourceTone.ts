/** Stable source material shared by article cards and identity badges. */
export function sourceTone(name: string | null | undefined): 1 | 4 | 5 | 6 {
  const seed = Array.from(name ?? '').reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  return ([1, 5, 4, 6] as const)[seed % 4] ?? 1;
}
