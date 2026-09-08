/**
 * Wortliste insights — quiet, non-gamified statistics over saved words.
 */
import type { CEFRLevel, DictionaryEntry } from '../types';

export interface WortlisteCategoryCount {
  category: string;
  count: number;
}

export interface WortlisteInsights {
  total: number;
  cefrCounts: Record<CEFRLevel, number>;
  topCategories: WortlisteCategoryCount[];
  nounCount: number;
  verbCount: number;
}

const EMPTY_CEFR: Record<CEFRLevel, number> = {
  A1: 0,
  A2: 0,
  B1: 0,
  B2: 0,
  C1: 0,
  C2: 0,
};

export function deriveInsights(entries: DictionaryEntry[]): WortlisteInsights {
  const cefrCounts: Record<CEFRLevel, number> = { ...EMPTY_CEFR };
  const categoryMap = new Map<string, number>();
  let nounCount = 0;
  let verbCount = 0;

  for (const entry of entries) {
    if (entry.cefr && entry.cefr in cefrCounts) {
      cefrCounts[entry.cefr] += 1;
    }
    if (entry.category) {
      categoryMap.set(entry.category, (categoryMap.get(entry.category) ?? 0) + 1);
    }
    if (entry.word_type === 'noun') nounCount += 1;
    if (entry.word_type === 'verb') verbCount += 1;
  }

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, 'ar'));

  return {
    total: entries.length,
    cefrCounts,
    topCategories,
    nounCount,
    verbCount,
  };
}

export function summarizeInsights(insights: WortlisteInsights): string {
  if (insights.total === 0) {
    return 'لم تحفظ أي كلمة بعد. حين تجد كلمة تستحق البقاء، ستجدها هنا.';
  }

  const parts: string[] = [`حفظت ${insights.total} كلمة.`];

  const dominant = (Object.entries(insights.cefrCounts) as [CEFRLevel, number][])
    .sort((a, b) => b[1] - a[1])[0];
  if (dominant && dominant[1] > 0) {
    parts.push(`معظمها في المستوى ${dominant[0]}.`);
  }

  const top = insights.topCategories[0];
  if (top) {
    parts.push(`أكثر ما يشدّك: ${top.category}.`);
  }

  if (insights.nounCount > 0 || insights.verbCount > 0) {
    parts.push(`بينها ${insights.nounCount} اسم و${insights.verbCount} فعل.`);
  }

  return parts.join(' ');
}
