import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard } from '@/components/ui/app-shell';
import { Pencil, Plus, Trash2 } from '@/lib/icons';
import { pageItem as item,pageStagger as stagger } from '@/lib/motion';

import BrainScene from '../components/BrainScene';
import EntryEditorSheet from '../components/EntryEditorSheet';
import { useJournalEntries, useJournalMutations } from '../hooks/useJournal';
import { computeBalance, type JournalEntry, type JournalMood } from '../types';

const MOOD_META: Record<JournalMood, { label: string; accent: string }> = {
  organic:    { label: 'عاطفي',   accent: '#C8A96E' },
  balanced:   { label: 'متوازن',  accent: '#F2E7C9' },
  analytical: { label: 'تحليلي',  accent: '#7EB8C9' },
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function excerpt(text: string, max = 180): string {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + '…';
}

/**
 * /journal — "مذكرتي"
 *
 * Obsidian-luxury journal. A living 3D brain hero (organic + mechanical
 * hemispheres) reflects the mood balance of the writer's entries, and a
 * quiet timeline below tracks every reflection.
 */
export default function JournalHome() {
  const reduced = useReducedMotion();
  const { data: entries = [], isLoading } = useJournalEntries();
  const { create, update, remove } = useJournalMutations();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  const balance = useMemo(() => computeBalance(entries), [entries]);
  const organicPct = Math.round(balance.organicRatio * 100);
  const analyticalPct = 100 - organicPct;

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (entry: JournalEntry) => { setEditing(entry); setEditorOpen(true); };

  const handleSubmit = async (v: { title: string; content: string; mood: JournalMood; tags: string[] }) => {
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: v });
    } else {
      await create.mutateAsync(v);
    }
    setEditorOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذه المدخلة نهائياً؟')) return;
    await remove.mutateAsync(id);
  };

  const saving = create.isPending || update.isPending;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground pb-16">
      <SEO
        title="مذكرتي — دفتر يومي يعكس توازنك"
        description="مذكرة شخصية تعكس التوازن بين الحدس والتحليل، مع مشهد ثلاثي الأبعاد ينمو مع كل مدخلة."
        path="/journal"
      />

      {/* Header */}
      <div className="z-sticky app-sticky-header border-b border-border/60">
        <div className="mx-auto max-w-lg px-5 py-3 flex items-center justify-between">
          <BackButton fallback="/" />
          <h1 className="text-[15px] tracking-[0.24em] text-muted-foreground uppercase">
            مذكرتي
          </h1>
          <button
            type="button"
            onClick={openNew}
            aria-label="مدخلة جديدة"
            className="h-10 w-10 rounded-2xl bg-card/70 border border-border flex items-center justify-center text-primary hover:bg-card active:scale-95 transition"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 pt-4 space-y-6">
        {/* Hero — the brain */}
        <motion.div
          variants={stagger}
          initial={reduced ? false : 'hidden'}
          animate="visible"
          className="space-y-4"
        >
          <motion.div variants={item}>
            <div className="relative rounded-[28px] overflow-hidden border border-border/70">
              <div className="aspect-[4/3] w-full">
                <BrainScene balance={balance} reducedMotion={!!reduced} />
              </div>
              {/* Overlay caption */}
              <div className="absolute inset-x-0 bottom-0 px-5 py-3 bg-background/85">
                <div className="text-[11px] tracking-[0.24em] uppercase text-white/70">
                  ذهنك اليوم
                </div>
                <div className="text-white/95 text-sm mt-0.5">
                  {balance.total === 0
                    ? 'ابدأ أول مدخلة لترى كيف يتشكّل.'
                    : `${balance.total} مدخلة · ${organicPct}٪ عاطفي · ${analyticalPct}٪ تحليلي`}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Numeric summary */}
          <motion.div variants={item}>
            <div className="grid grid-cols-3 gap-3">
              <StatCell label="المدخلات" value={String(balance.total)} accent="#F2E7C9" />
              <StatCell label="عاطفي" value={`${organicPct}٪`} accent="#C8A96E" />
              <StatCell label="تحليلي" value={`${analyticalPct}٪`} accent="#7EB8C9" />
            </div>
          </motion.div>
        </motion.div>

        {/* Timeline */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-foreground text-[17px]">التسلسل</h2>
            <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
              الأحدث أولاً
            </span>
          </div>

          {isLoading && entries.length === 0 && (
            <AppCard>
              <div className="text-muted-foreground text-sm text-center py-6">
                جارٍ التحميل…
              </div>
            </AppCard>
          )}

          {!isLoading && entries.length === 0 && (
            <AppCard>
              <div className="text-center py-8 space-y-3">
                <div className="text-foreground text-[15px]">
                  مذكرتك فارغة — بعدُ.
                </div>
                <div className="text-muted-foreground text-[13px] leading-relaxed">
                  كل مدخلة تُغذّي أحد نصفَي الذهن أعلاه. اكتب فكرة، مشاعر، أو ملاحظة.
                </div>
                <button
                  type="button"
                  onClick={openNew}
                  className="inline-flex items-center gap-2 mt-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  ابدأ الآن
                </button>
              </div>
            </AppCard>
          )}

          <motion.ul
            variants={stagger}
            initial={reduced ? false : 'hidden'}
            animate="visible"
            className="space-y-3"
          >
            {entries.map((e) => {
              const meta = MOOD_META[e.mood];
              return (
                <motion.li key={e.id} variants={item}>
                  <AppCard>
                    <div className="flex items-start gap-3">
                      {/* Mood bar */}
                      <div
                        aria-hidden
                        className="mt-1 h-14 w-[3px] rounded-full shrink-0"
                        style={{ background: meta.accent, opacity: 0.85 }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[15px] text-foreground truncate">
                            {e.title?.trim() || 'مدخلة بلا عنوان'}
                          </div>
                          <div className="text-[10px] tracking-wider uppercase text-muted-foreground shrink-0">
                            {meta.label}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {formatDate(e.createdAt)} · {e.wordCount} كلمة
                        </div>
                        <p className="text-[13px] leading-[1.85] text-foreground/85 mt-2 whitespace-pre-line">
                          {excerpt(e.content)}
                        </p>
                        {e.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {e.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-3">
                          <button
                            type="button"
                            onClick={() => openEdit(e)}
                            aria-label="تعديل"
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            aria-label="حذف"
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-accent/50 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </AppCard>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>
      </div>

      <EntryEditorSheet
        open={editorOpen}
        onOpenChange={(o) => { setEditorOpen(o); if (!o) setEditing(null); }}
        entry={editing}
        onSubmit={handleSubmit}
        saving={saving}
      />
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 px-3 py-3 text-center">
      <div
        className="mx-auto mb-2 h-1.5 w-6 rounded-full"
        style={{ background: accent, opacity: 0.8 }}
      />
      <div className="text-[18px] text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}