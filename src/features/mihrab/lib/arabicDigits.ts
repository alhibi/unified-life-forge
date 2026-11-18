const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Render a latin integer with Arabic-Indic digits (display only). */
export function arabicDigits(n: number): string {
  return String(Math.trunc(n))
    .split('')
    .map((c) => (c >= '0' && c <= '9' ? AR_DIGITS[Number(c)] : c))
    .join('');
}
