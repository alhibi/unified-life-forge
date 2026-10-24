import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription,DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { computeWordCount, type JournalEntry, type JournalMood } from '../types';

const MOODS: { id: JournalMood; label: string; hint: string; accent: string }[] = [
  { id: 'organic', label: 'عاطفي', hint: 'مشاعر، حدس، دفء', accent: 'hsl(var(--data-2))' },
  { id: 'balanced', label: 'متوازن', hint: 'بين القلب والعقل', accent: 'hsl(var(--data-3))' },
  { id: 'analytical', label: 'تحليلي', hint: 'أفكار، منطق، ترتيب', accent: 'hsl(var(--data-4))' },
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
      {/*
        The keyboard is a separate portal above the drawer. index.css lifts
        every bottom sheet above it while `data-soft-keyboard-open` is set, so
        this content is the form that scrolls — not the sheet under the keys.
      */}
      <DrawerContent dir="rtl" className="max-h-[90vh] border-t border-border bg-background">
        <VisuallyHidden>
          <DrawerTitle>محرر المذكرة</DrawerTitle>
          <DrawerDescription>إضافة أو تعديل مدخلة في مذكرتي</DrawerDescription>
        </VisuallyHidden>

        {/* The scroller owns the remaining height (flex-1 + min-h-0) so the
            action row is reachable at the end of the form on short screens. */}
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-5 overflow-y-auto px-5 pb-8 pt-5 overscroll-contain">
          <div className="flex items-center justify-between">
            <h2 className="text-lead text-foreground">{entry ? 'تعديل مدخلة' : 'مدخلة جديدة'}</h2>
            <span className="text-micro text-muted-foreground tracking-wider">{words} كلمة</span>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (اختياري)"
            maxLength={120}
            className="w-full bg-transparent border-0 border-b border-border/60 pb-2 text-body text-foreground placeholder:text-muted-foreground-subtle focus:outline-none focus:border-primary/60 transition-colors"
          />

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="اكتب ما يدور في ذهنك…"
            rows={9}
            className="resize-none leading-relaxed"
          />

          <div>
            <div className="text-micro uppercase tracking-[0.18em] text-muted-foreground mb-2">
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
                    className={`rounded-2xl border px-3 py-3 text-center transition-motion ${
                      active
                        ? 'border-primary/60 bg-background'
                        : 'border-border bg-background/40 hover:bg-background/70'
                    }`}
                  >
                    <div
                      className="mx-auto mb-2 h-2 w-2 rounded-full"
                      style={{ background: m.accent, opacity: active ? 1 : 0.5 }}
                    />
                    <div className="text-meta text-foreground">{m.label}</div>
                    <div className="text-micro text-muted-foreground mt-1">{m.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-micro uppercase tracking-[0.18em] text-muted-foreground mb-2">
              وسوم
            </div>
            <Input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="مثلاً: تأمل، عمل، عائلة"
              className="py-2.5 text-meta"
            />
          </div>

          {/* Sticky action row: on a 390×844 screen the form is taller than the
              sheet whether the keyboard is open or closed. Saving must not
              depend on discovering that the sheet scrolls. */}
          <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-end gap-3 border-t border-border/60 bg-background px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
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
              className="px-6"
            >
              {saving ? 'جارٍ الحفظ…' : entry ? 'حفظ التعديلات' : 'حفظ المدخلة'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
