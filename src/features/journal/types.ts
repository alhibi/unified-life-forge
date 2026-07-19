// Domain types for the "مذكرتي" (My Journal) feature.

export type JournalMood = 'organic' | 'analytical' | 'balanced';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  mood: JournalMood;
  tags: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryInput {
  title?: string | null;
  content: string;
  mood: JournalMood;
  tags?: string[];
}

export interface JournalMoodBalance {
  total: number;
  organic: number;
  analytical: number;
  balanced: number;
  /** 0..1 — share of organic vs analytical (excluding balanced). 0.5 if neutral. */
  organicRatio: number;
}

export function computeWordCount(content: string): number {
  const trimmed = (content || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/u).length;
}

export function computeBalance(entries: JournalEntry[]): JournalMoodBalance {
  let organic = 0, analytical = 0, balanced = 0;
  for (const e of entries) {
    if (e.mood === 'organic') organic += 1;
    else if (e.mood === 'analytical') analytical += 1;
    else balanced += 1;
  }
  const total = entries.length;
  const sides = organic + analytical;
  const organicRatio = sides === 0 ? 0.5 : organic / sides;
  return { total, organic, analytical, balanced, organicRatio };
}