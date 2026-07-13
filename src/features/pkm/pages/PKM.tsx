import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { useNotes, type LocalNote, type NoteStatus } from '../hooks/useNotes';
import { extractTags, buildTagTree, type TagNode } from '../lib/tagParser';
import { Plus, Trash, Hash, FileText, Eye, Pencil, Search, CaretRight, CaretDown } from '@/lib/icons';
import { cn } from '@/lib/utils';

/**
 * PKM — local-first personal knowledge base (MVP).
 *
 * Mobile-first single-pane layout: a sliding notes-list sheet + an
 * editor pane. On lg screens both are visible side-by-side. Everything
 * persists to Dexie/IndexedDB; no network calls. AI, wiki-links, and
 * cloud sync will layer on top in later phases.
 */

type StatusFilter = NoteStatus | 'all';

const STATUS_LABEL_AR: Record<StatusFilter, string> = {
  all: 'الكل', draft: 'مسودات', active: 'نشِطة', archived: 'مؤرشفة',
};
const STATUS_LABEL_DE: Record<StatusFilter, string> = {
  all: 'Alle', draft: 'Entwürfe', active: 'Aktiv', archived: 'Archiviert',
};

function titleOf(n: LocalNote, isAr: boolean): string {
  if (n.title.trim()) return n.title;
  const firstLine = n.contentMd.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '').trim();
  return firstLine || (isAr ? 'بدون عنوان' : 'Ohne Titel');
}

function excerptOf(n: LocalNote): string {
  const body = n.contentMd
    .replace(/^#.*$/gm, '')
    .replace(/[#*_`>[\]()]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
  return body.slice(0, 120);
}

export default function PKM() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(false);
  const [listOpen, setListOpen] = useState(true);

  // Auto-select the most recent note the first time the list arrives.
  useEffect(() => {
    if (activeId || loading) return;
    if (notes.length > 0) setActiveId(notes[0].id);
  }, [notes, activeId, loading]);

  const active = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  // Derived tag tree — recomputed whenever any note body changes.
  const tagTree = useMemo<TagNode[]>(() => {
    const pairs: { path: string; noteId: string }[] = [];
    for (const n of notes) {
      for (const p of extractTags(n.contentMd)) pairs.push({ path: p, noteId: n.id });
    }
    return buildTagTree(pairs);
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (statusFilter !== 'all' && n.status !== statusFilter) return false;
      if (tagFilter) {
        const tags = extractTags(n.contentMd);
        const ok = tags.some((t) => t === tagFilter || t.startsWith(tagFilter + '/'));
        if (!ok) return false;
      }
      if (q) {
        const hay = (n.title + '\n' + n.contentMd).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notes, statusFilter, tagFilter, query]);

  const handleCreate = async () => {
    const id = await createNote();
    setActiveId(id);
    setPreview(false);
    // On mobile, jump to the editor after creating.
    setListOpen(false);
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm(isAr ? 'حذف الملاحظة؟' : 'Notiz löschen?');
    if (!ok) return;
    await deleteNote(id);
    if (activeId === id) setActiveId(null);
  };

  const L = isAr ? STATUS_LABEL_AR : STATUS_LABEL_DE;

  return (
    <PageShell>
      <SEO
        title={isAr ? 'مذكّرتي — دفتر ملاحظات ذكي' : 'Mein Wissen — Persönliche Notizen'}
        description={isAr
          ? 'دفتر ملاحظات محلي بوسم متداخل، بحث فوري، وحفظ آمن على جهازك.'
          : 'Lokales, verschlüsselungsfreundliches Notizbuch mit verschachtelten Tags und Sofortsuche.'}
        path="/pkm"
      />
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-bold flex-1 truncate">
          {isAr ? 'مذكّرتي' : 'Mein Wissen'}
        </h1>
        <button
          onClick={() => setListOpen((v) => !v)}
          className="lg:hidden h-9 px-3 rounded-full bg-card border border-border/60 text-xs font-medium active:scale-95 transition-transform"
          aria-label={isAr ? 'القائمة' : 'Liste'}
        >
          {listOpen ? (isAr ? 'المحرر' : 'Editor') : (isAr ? 'القائمة' : 'Liste')}
        </button>
        <button
          onClick={handleCreate}
          className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAr ? 'جديد' : 'Neu'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* SIDEBAR */}
        <aside
          className={cn(
            'flex flex-col gap-3',
            !listOpen && 'hidden lg:flex',
          )}
        >
          {/* search */}
          <label className="relative block">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في ملاحظاتك…' : 'Notizen durchsuchen…'}
              className="w-full h-10 rounded-xl bg-card border border-border/60 ps-9 pe-3 text-sm outline-none focus:border-primary/60"
              style={{ fontSize: 16 }}
            />
          </label>

          {/* status pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'draft', 'active', 'archived'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'h-8 px-3 rounded-full text-xs font-medium border transition-colors',
                  statusFilter === s
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-card border-border/50 text-muted-foreground hover:text-foreground',
                )}
              >
                {L[s]}
              </button>
            ))}
          </div>

          {/* tag tree */}
          {tagTree.length > 0 && (
            <div className="rounded-xl bg-card border border-border/50 p-2">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {isAr ? 'الوسوم' : 'Tags'}
              </div>
              <button
                onClick={() => setTagFilter(null)}
                className={cn(
                  'w-full text-start px-2 py-1.5 rounded-lg text-xs font-medium',
                  !tagFilter ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/40',
                )}
              >
                {isAr ? 'كل الوسوم' : 'Alle Tags'}
              </button>
              <TagTree
                nodes={tagTree}
                active={tagFilter}
                onSelect={(p) => setTagFilter(p === tagFilter ? null : p)}
                depth={0}
              />
            </div>
          )}

          {/* notes list */}
          <div className="flex flex-col gap-1.5">
            {loading ? (
              <div className="text-xs text-muted-foreground p-4 text-center">
                {isAr ? 'جارٍ التحميل…' : 'Lädt…'}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground p-6 text-center rounded-xl bg-card/50 border border-dashed border-border/50">
                {isAr ? 'لا توجد ملاحظات هنا بعد.' : 'Noch keine Notizen hier.'}
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setActiveId(n.id); setPreview(false); setListOpen(false); }}
                  className={cn(
                    'text-start rounded-xl border p-3 transition-colors active:scale-[0.99]',
                    activeId === n.id
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-card border-border/50 hover:border-border',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold truncate flex-1">
                      {titleOf(n, isAr)}
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">
                      {new Date(n.updatedAt).toLocaleDateString(isAr ? 'ar' : 'de')}
                    </span>
                  </div>
                  {excerptOf(n) && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {excerptOf(n)}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* EDITOR */}
        <section className={cn('min-h-[60vh]', listOpen && 'hidden lg:block')}>
          {active ? (
            <Editor
              note={active}
              preview={preview}
              onTogglePreview={() => setPreview((p) => !p)}
              onChange={(patch) => updateNote(active.id, patch)}
              onDelete={() => handleDelete(active.id)}
              isAr={isAr}
            />
          ) : (
            <div className="rounded-2xl bg-card border border-dashed border-border/50 p-10 text-center flex flex-col items-center gap-3">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'اختر ملاحظة أو أنشئ واحدة جديدة.' : 'Wähle eine Notiz oder erstelle eine neue.'}
              </p>
              <button
                onClick={handleCreate}
                className="mt-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isAr ? 'ملاحظة جديدة' : 'Neue Notiz'}
              </button>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function TagTree({
  nodes,
  active,
  onSelect,
  depth,
}: {
  nodes: TagNode[];
  active: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((n) => (
        <TagRow key={n.path} node={n} active={active} onSelect={onSelect} depth={depth} />
      ))}
    </ul>
  );
}

function TagRow({
  node,
  active,
  onSelect,
  depth,
}: {
  node: TagNode;
  active: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isActive = active === node.path;
  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg px-1',
          isActive && 'bg-primary/10',
        )}
        style={{ paddingInlineStart: 4 + depth * 12 }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-5 h-5 flex items-center justify-center text-muted-foreground/60 hover:text-foreground"
            aria-label={open ? 'collapse' : 'expand'}
          >
            {open ? <CaretDown className="w-3 h-3" /> : <CaretRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-5 h-5 flex items-center justify-center">
            <Hash className="w-3 h-3 text-muted-foreground/50" />
          </span>
        )}
        <button
          onClick={() => onSelect(node.path)}
          className={cn(
            'flex-1 text-start py-1 text-xs font-medium truncate',
            isActive ? 'text-primary' : 'text-foreground/80 hover:text-foreground',
          )}
        >
          {node.name}
        </button>
        <span className="text-[10px] text-muted-foreground/60 px-1">{node.count}</span>
      </div>
      {hasChildren && open && (
        <TagTree nodes={node.children} active={active} onSelect={onSelect} depth={depth + 1} />
      )}
    </li>
  );
}

function Editor({
  note,
  preview,
  onTogglePreview,
  onChange,
  onDelete,
  isAr,
}: {
  note: LocalNote;
  preview: boolean;
  onTogglePreview: () => void;
  onChange: (p: Partial<Pick<LocalNote, 'title' | 'contentMd' | 'status'>>) => void;
  onDelete: () => void;
  isAr: boolean;
}) {
  // Local buffer for smooth typing; debounced flush to Dexie.
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.contentMd);

  // Reset buffers whenever the active note changes.
  useEffect(() => { setTitle(note.title); setBody(note.contentMd); }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced persist.
  useEffect(() => {
    if (title === note.title && body === note.contentMd) return;
    const t = setTimeout(() => {
      const patch: Partial<Pick<LocalNote, 'title' | 'contentMd'>> = {};
      if (title !== note.title) patch.title = title;
      if (body !== note.contentMd) patch.contentMd = body;
      if (Object.keys(patch).length) onChange(patch);
    }, 400);
    return () => clearTimeout(t);
  }, [title, body, note.title, note.contentMd, onChange]);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 flex flex-col gap-3 min-h-[60vh]">
      {/* toolbar */}
      <div className="flex items-center gap-2">
        <select
          value={note.status}
          onChange={(e) => onChange({ status: e.target.value as NoteStatus })}
          className="h-8 rounded-full bg-background border border-border/60 px-2 text-xs"
        >
          <option value="draft">{isAr ? 'مسودة' : 'Entwurf'}</option>
          <option value="active">{isAr ? 'نشِطة' : 'Aktiv'}</option>
          <option value="archived">{isAr ? 'مؤرشفة' : 'Archiviert'}</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={onTogglePreview}
          className="h-8 px-3 rounded-full bg-background border border-border/60 text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label={preview ? (isAr ? 'تحرير' : 'Bearbeiten') : (isAr ? 'معاينة' : 'Vorschau')}
        >
          {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {preview ? (isAr ? 'تحرير' : 'Bearbeiten') : (isAr ? 'معاينة' : 'Vorschau')}
        </button>
        <button
          onClick={onDelete}
          className="h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
          aria-label={isAr ? 'حذف' : 'Löschen'}
        >
          <Trash className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={isAr ? 'عنوان الملاحظة…' : 'Notiztitel…'}
        className="w-full bg-transparent outline-none text-xl font-bold placeholder:text-muted-foreground/40"
        style={{ fontSize: 22 }}
      />

      {preview ? (
        <div className="prose prose-sm dark:prose-invert max-w-none flex-1 min-h-[40vh]">
          {body.trim() ? (
            <ReactMarkdown>{body}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground text-sm">
              {isAr ? 'لا يوجد محتوى للمعاينة.' : 'Kein Inhalt zum Anzeigen.'}
            </p>
          )}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isAr
            ? 'ابدأ الكتابة… يمكنك استخدام Markdown و#وسوم/متداخلة.'
            : 'Schreib los… Markdown und #verschachtelte/tags werden unterstützt.'}
          className="w-full flex-1 min-h-[40vh] bg-transparent outline-none text-sm leading-relaxed resize-none placeholder:text-muted-foreground/40 font-mono"
          style={{ fontSize: 16 }}
          spellCheck={false}
        />
      )}

      {/* tags footer */}
      <TagsFooter body={body} isAr={isAr} />
    </div>
  );
}

function TagsFooter({ body, isAr }: { body: string; isAr: boolean }) {
  const tags = useMemo(() => extractTags(body), [body]);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {isAr ? 'الوسوم' : 'Tags'}
      </span>
      {tags.map((t) => (
        <span
          key={t}
          className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
        >
          #{t}
        </span>
      ))}
    </div>
  );
}