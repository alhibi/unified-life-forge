// ─────────────────────────────────────────────────────────────────────
// شرح مفردات صعبة في القصائد. مفتاح المعجم هو slug القصيدة
// (كما يبنيه local-fallback: `${poet-id}-${normalized-title}`).
// ─────────────────────────────────────────────────────────────────────

export interface LocalGlossaryEntry {
  word: string;            // الكلمة بصيغتها الأدبية
  meaning: string;         // الشرح
  verse_position?: number; // البيت الذي وردت فيه (اختياري)
}

// يُملأ تدريجياً من قصائد poetryData.ts. التطابق مع الـ slug ليس
// إلزامياً — إن لم يوجد مفتاح، لا تُعرض زرّ الشرح.
export const diwanLocalGlossary: Record<string, LocalGlossaryEntry[]> = {
  // أمثلة عامة لمفردات قد تتكرّر — تُكمَّل لاحقاً.
};