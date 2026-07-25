import type { LocalNote } from '../lib/db';
import { findBacklinks } from '../lib/wikiLinks';

export default function BacklinksPanel({
  note,
  notes,
  onOpen,
}: {
  note: LocalNote;
  notes: LocalNote[];
  onOpen: (id: string) => void;
}) {
  const title = note.title || note.contentMd.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '').trim() || '';
  if (!title) return null;
  const links = findBacklinks(title, notes.filter((n) => n.id !== note.id));
  if (links.length === 0) return null;
  return (
    <div className="pt-3 mt-2 border-t border-border/40">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
        {'روابط واردة'} · {links.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <button
            key={l.id}
            onClick={() => onOpen(l.id)}
            className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition"
          >
            {l.title || ('بدون عنوان')}
          </button>
        ))}
      </div>
    </div>
  );
}