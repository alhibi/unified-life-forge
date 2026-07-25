import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription,DrawerTitle } from '@/components/ui/drawer';

import { computeWordCount, type JournalEntry, type JournalMood } from '../types';

const MOODS: { id: JournalMood; label: string; hint: string; accent: string }[] = [
  { id: 'organic', label: 'عاطفي', hint: 'مشاعر، حدس، دفء', accent: '#C8A96E' },
  { id: 'balanced', label: 'متوازن', hint: 'بين القلب والعقل', accent: '#F2E7C9' },
  { id: 'analytical', label: 'تحليلي', hint: 'أفكار، منطق، ترتيب', accent: '#7EB8C9' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: JournalEntry | null;
  onSubmit: (v: {
    title: string;
    content: string;
    mood: JournalMood;
    tags: string[];
  }) => Promise<void> | void;
  saving?: boolean;
}

export default function EntryEditorSheet({ open, onOpenChange, entry, onSubmit, saving }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalMood>('balanced');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? '');
    setContent(entry?.content ?? '');
    setMood(entry?.mood ?? 'balanced');
    setTagsInput(entry?.tags?.join('، ') ?? '');
  }, [open, entry]);

  const words = computeWordCount(content);
  const canSubmit = content.trim().length > 0 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    const tags = tagsInput
      .split(/[،,]/)
      .map((t) => t.trim())
      .filter(Boolean);
    await onSubmit({ title, content, mood, tags });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent dir="rtl" className="max-h-[90vh] bg-background border-t border-border">
        <VisuallyHidden>
          <DrawerTitle>محرر المذكرة</DrawerTitle>
          <DrawerDescription>إضافة أو تعديل مدخلة في مذكرتي</DrawerDescription>
        </VisuallyHidden>

        <div className="mx-auto w-full max-w-lg px-5 pb-8 pt-5 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-foreground">{entry ? 'تعديل مدخلة' : 'مدخلة جديدة'}</h2>
            <span className="text-[0.6875rem] text-muted-foreground tracking-wider">{words} كلمة</span>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (اختياري)"
            maxLength={120}
            className="w-full bg-transparent border-0 border-b border-border/60 pb-2 text-[1.0625rem] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 transition-colors"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="اكتب ما يدور في ذهنك…"
            rows={9}
            className="w-full bg-card/40 border border-border rounded-2xl px-4 py-3 text-[1rem] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 resize-none transition-colors"
          />

          <div>
            <div className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              الطابع
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map((m) => {
                const active = mood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={`rounded-2xl border px-3 py-3 text-center transition-all ${
                      active
                        ? 'border-primary/60 bg-card'
                        : 'border-border bg-card/30 hover:bg-card/60'
                    }`}
                  >
                    <div
                      className="mx-auto mb-2 h-2 w-2 rounded-full"
                      style={{ background: m.accent, opacity: active ? 1 : 0.5 }}
                    />
                    <div className="text-sm text-foreground">{m.label}</div>
                    <div className="text-[0.625rem] text-muted-foreground mt-1">{m.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              وسوم
            </div>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="مثلاً: تأمل، عمل، عائلة"
              className="w-full bg-card/40 border border-border rounded-xl px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl px-6"
            >
              {saving ? 'جارٍ الحفظ…' : entry ? 'حفظ التعديلات' : 'حفظ المدخلة'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
