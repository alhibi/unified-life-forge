/**
 * Signal-style asymmetric bubble radius based on grouping + orientation.
 *
 * Consecutive messages from the same sender tuck into each other: the corner
 * facing the neighbouring bubble tightens to 4px while the outer corners stay
 * at 18px, so a run reads as one block rather than three separate cards.
 *
 * Extracted verbatim from ChatDrawer.tsx.
 */
export function getBubbleRadius(isMine: boolean, samePrev: boolean, sameNext: boolean) {
  const big = '18px';
  const small = '4px';
  if (isMine) {
    const topRight = samePrev ? small : big;
    const bottomRight = sameNext ? small : big;
    return { borderRadius: `${big} ${topRight} ${bottomRight} ${big}` };
  } else {
    const topLeft = samePrev ? small : big;
    const bottomLeft = sameNext ? small : big;
    return { borderRadius: `${topLeft} ${big} ${big} ${bottomLeft}` };
  }
}
