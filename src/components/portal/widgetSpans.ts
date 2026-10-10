/**
 * Decides which launcher widgets become two-column feature widgets in the
 * two-column phone grid. Every fifth widget leads a group (1 wide + 4 square),
 * and when the trailing run of square widgets is odd its last member widens,
 * so a realm never ends with an empty half row.
 */
export function widgetSpans(count: number): boolean[] {
  const wide = Array.from({ length: count }, (_, index) => index % 5 === 0);
  const lastLead = count === 0 ? 0 : Math.floor((count - 1) / 5) * 5;
  const trailingSquares = count - lastLead - 1;
  if (trailingSquares > 0 && trailingSquares % 2 === 1) wide[count - 1] = true;
  return wide;
}
