/**
 * Honest outcome copy for scout runs.
 *
 * The engine reports exactly what happened (filed / duplicates / failed);
 * this module turns those numbers into one truthful Arabic sentence per
 * situation — including the awkward ones ("everything was already in your
 * log"), which a naive "اكتمل البحث!" would paper over.
 */

export interface ScoutOutcomeStats {
  filed: number;
  total: number;
  failed: number;
  duplicates: number;
}

export type OutcomeTone = 'success' | 'info';

export interface DescribedOutcome {
  tone: OutcomeTone;
  text: string;
}

export function describeOutcome(o: ScoutOutcomeStats): DescribedOutcome {
  if (o.filed > 0 && o.duplicates === 0 && o.failed === 0) {
    return { tone: 'success', text: `اكتمل الاستكشاف — ${o.filed} مكاناً جديداً بانتظارك` };
  }
  if (o.filed > 0 && o.duplicates > 0 && o.failed === 0) {
    return { tone: 'success', text: `أضفنا ${o.filed} مكاناً جديداً، وتجاوزنا ${o.duplicates} لديك مسبقاً` };
  }
  if (o.filed > 0 && o.failed > 0) {
    return { tone: 'info', text: `دوّنا ${o.filed} مكاناً، وتعذر إكمال ${o.failed}` };
  }
  if (o.filed === 0 && o.duplicates > 0) {
    return { tone: 'info', text: `كل النتائج (${o.duplicates}) موجودة في سجلك مسبقاً — لم نضف مكررات` };
  }
  return { tone: 'info', text: 'انتهى البحث دون نتائج قابلة للتوثيق — جرّب عمقاً أعلى أو صياغة أخرى' };
}
