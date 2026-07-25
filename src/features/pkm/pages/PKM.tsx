import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useSearchParams } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard,PageShell } from '@/components/ui/app-shell';
import { useApp } from '@/contexts/AppContext';
import { Brain,ChevronDown, ChevronRight, Eye, FileText, Hash, Pencil, Plus, Search, Sparkles, Trash } from '@/lib/icons';
import { cn } from '@/lib/utils';

import BacklinksPanel from '../components/BacklinksPanel';
import OptimizerPanel from '../components/OptimizerPanel';
import { type LocalNote, type NoteStatus,useNotes } from '../hooks/useNotes';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { buildTagTree, extractTags, type TagNode } from '../lib/tagParser';

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

function titleOf(n: LocalNote): string {
  if (n.title.trim()) return n.title;
  const firstLine = n.contentMd.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '').trim();
  return firstLine || ('بدون عنوان');
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
  const { } = useApp();
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  useSyncEngine();

  const [optimizerOpen, setOptimizerOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL with fallbacks
  const activeId = searchParams.get('note') || null;
  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';
  const tagFilter = searchParams.get('tag') || null;
  const urlQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [preview, setPreview] = useState(false);
  const [listOpen, setListOpen] = useState(true);

  // Synchronize URL query change back into local inputs
  useEffect(() => {
    setQuery(urlQuery);
    setDebouncedQuery(urlQuery);
  }, [urlQuery]);

  // Debounce effect for local search query typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Push debounced query string to URL search parameter 'q'
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const queryVal = debouncedQuery.trim();
      if (queryVal) {
        next.set('q', queryVal);
      } else {
        next.delete('q');
      }
      return next;
    }, { replace: true });
  }, [debouncedQuery, setSearchParams]);

  const setActiveId = (id: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('note', id);
      else next.delete('note');
      return next;
    }, { replace: true });
  };

  const setStatusFilter = (s: StatusFilter) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (s && s !== 'all') next.set('status', s);
      else next.delete('status');
      return next;
    }, { replace: true });
  };

  const setTagFilter = (tag: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tag) next.set('tag', tag);
      else next.delete('tag');
      return next;
    }, { replace: true });
  };

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
    const q = debouncedQuery.trim().toLowerCase();
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
  }, [notes, statusFilter, tagFilter, debouncedQuery]);

  const handleCreate = async () => {
    const id = await createNote();
    setActiveId(id);
    setPreview(false);
    // On mobile, jump to the editor after creating.
    setListOpen(false);
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('حذف الملاحظة؟');
    if (!ok) return;
    await deleteNote(id);
    if (activeId === id) setActiveId(null);
  };

  const L = STATUS_LABEL_AR;

  return (
    <PageShell>
      <SEO
        title={'مذكّرتي — دفتر ملاحظات ذكي'}
        description={'دفتر ملاحظات محلي بوسم متداخل، بحث فوري، وحفظ آمن على جهازك.'}
        path="/pkm"
      />
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-bold flex-1 truncate">
          {'مذكّرتي'}
        </h1>
        <Link
          to="/pkm/mind"
          className="h-9 w-9 rounded-full bg-card border border-border/60 flex items-center justify-center active:scale-95 transition-transform"
          aria-label={'العقل الحيّ'}
          title={'العقل الحيّ'}
        >
          <Brain className="w-4 h-4 text-primary" />
        </Link>
        <button
          onClick={() => setListOpen((v) => !v)}
          className="lg:hidden h-9 px-3 rounded-full bg-card border border-border/60 text-xs font-medium active:scale-95 transition-transform"
          aria-label={'القائمة'}
        >
          {listOpen ? ('المحرر') : ('القائمة')}
        </button>
        <button
          onClick={handleCreate}
          className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          {'جديد'}
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
              placeholder={'ابحث في ملاحظاتك…'}
              className="w-full h-10 rounded-xl bg-card border border-border/60 ps-9 pe-3 text-sm outline-none focus:border-primary/60"
              style={{ fontSize: 16 }}
            />
          </label>

          {/* status pills */}
          <div className="flex gap-2 flex-wrap mb-1">
            {(['all', 'draft', 'active', 'archived'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'relative h-9 px-4 rounded-full text-xs font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[\'\']',
                  statusFilter === s
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border/80',
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
                {'الوسوم'}
              </div>
              <button
                onClick={() => setTagFilter(null)}
                className={cn(
                  'w-full text-start px-2 py-2.5 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-[\'\']',
                  !tagFilter ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/40',
                )}
                title={'عرض كل الوسوم'}
              >
                {'كل الوسوم'}
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
          <div className="flex flex-col gap-2">
            {loading ? (
              <div className="text-xs text-muted-foreground p-4 text-center">
                {'جارٍ التحميل…'}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground p-6 text-center rounded-xl bg-card/50 border border-dashed border-border/50">
                {'لا توجد ملاحظات هنا بعد.'}
              </div>
            ) : (
              filtered.map((n) => {
                const title = titleOf(n);
                const excerpt = excerptOf(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => { setActiveId(n.id); setPreview(false); setListOpen(false); }}
                    className={cn(
                      'text-start rounded-xl border p-3.5 transition-colors active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none',
                      activeId === n.id
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-card border-border/50 hover:border-border',
                    )}
                    title={title}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold truncate flex-1 leading-snug">
                        {title}
                      </div>
                      <span className="text-[10px] text-muted-foreground/70 shrink-0 mt-0.5">
                        {new Date(n.updatedAt).toLocaleDateString('ar')}
                      </span>
                    </div>
                    {excerpt && (
                      <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed" title={excerpt}>
                        {excerpt}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* EDITOR */}
        <section className={cn('min-h-[60vh]', listOpen && 'hidden lg:block')}>
          {active ? (
            <>
              <Editor
                note={active}
                preview={preview}
                onTogglePreview={() => setPreview((p) => !p)}
                onChange={(patch) => updateNote(active.id, patch)}
                onDelete={() => handleDelete(active.id)}
                onOptimize={() => setOptimizerOpen(true)}
              />
              <div className="mt-3">
                <BacklinksPanel
                  note={active}
                  notes={notes}
                  onOpen={(id) => { setActiveId(id); setPreview(false); }}
                />
              </div>
              <OptimizerPanel
                open={optimizerOpen}
                onClose={() => setOptimizerOpen(false)}
                title={active.title}
                body={active.contentMd}
                onAccept={(next) => updateNote(active.id, { contentMd: next })}
              />
            </>
          ) : (
            <AppCard className="p-10 text-center flex flex-col items-center gap-3 border-dashed">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {'اختر ملاحظة أو أنشئ واحدة جديدة.'}
              </p>
              <button
                onClick={handleCreate}
                className="mt-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {'ملاحظة جديدة'}
              </button>
            </AppCard>
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
          'group flex items-center gap-2.5 rounded-lg px-1 py-1',
          isActive && 'bg-primary/10',
        )}
        style={{ paddingInlineStart: 4 + depth * 12 }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative w-6 h-6 flex items-center justify-center text-muted-foreground/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded focus:outline-none before:absolute before:-inset-2 before:content-[\'\']"
            aria-label={open ? 'collapse' : 'expand'}
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-6 h-6 flex items-center justify-center shrink-0">
            <Hash className="w-3.5 h-3.5 text-muted-foreground/50" />
          </span>
        )}
        <button
          onClick={() => onSelect(node.path)}
          className={cn(
            'flex-1 text-start py-1.5 text-xs font-semibold truncate transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded focus:outline-none relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-[\'\']',
            isActive ? 'text-primary' : 'text-foreground/80 hover:text-foreground',
          )}
          title={node.name}
        >
          {node.name}
        </button>
        <span className="text-[10px] text-muted-foreground/60 px-1 shrink-0">{node.count}</span>
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
  onOptimize,
}: {
  note: LocalNote;
  preview: boolean;
  onTogglePreview: () => void;
  onChange: (p: Partial<Pick<LocalNote, 'title' | 'contentMd' | 'status'>>) => void;
  onDelete: () => void;
  onOptimize: () => void;
}) {
  // Local buffer for smooth typing; debounced flush to Dexie.
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.contentMd);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // ── Markdown edit helpers ─────────────────────────────────────────
  const applyEdit = (fn: (sel: { before: string; sel: string; after: string }) => { text: string; selStart: number; selEnd: number }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = body.slice(0, start);
    const sel = body.slice(start, end);
    const after = body.slice(end);
    const { text, selStart, selEnd } = fn({ before, sel, after });
    setBody(text);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  const wrap = (left: string, right = left, placeholder = '') =>
    applyEdit(({ before, sel, after }) => {
      const inner = sel || placeholder;
      const text = before + left + inner + right + after;
      const selStart = before.length + left.length;
      const selEnd = selStart + inner.length;
      return { text, selStart, selEnd };
    });

  const linePrefix = (prefix: string) =>
    applyEdit(({ before, sel, after }) => {
      // Expand selection to full lines
      const lineStart = before.lastIndexOf('\n') + 1;
      const trailing = after.indexOf('\n');
      const lineEnd = trailing === -1 ? body.length : before.length + sel.length + trailing;
      const fullBefore = body.slice(0, lineStart);
      const block = body.slice(lineStart, lineEnd);
      const fullAfter = body.slice(lineEnd);
      const lines = block.split('\n');
      const isNumbered = prefix === '1. ';
      const transformed = lines
        .map((l, i) => {
          if (!l && lines.length > 1) return l;
          const cleaned = l.replace(/^(\s*)([-*+]\s|\d+\.\s|>\s|#{1,6}\s|\[.\]\s)?/, '$1');
          const p = isNumbered ? `${i + 1}. ` : prefix;
          return p + cleaned;
        })
        .join('\n');
      const text = fullBefore + transformed + fullAfter;
      const selStart = fullBefore.length;
      const selEnd = selStart + transformed.length;
      return { text, selStart, selEnd };
    });

  const insertLink = () => {
    const url = window.prompt('الرابط:', 'https://');
    if (!url) return;
    applyEdit(({ before, sel, after }) => {
      const label = sel || ('رابط');
      const text = before + `[${label}](${url})` + after;
      const selStart = before.length + 1;
      const selEnd = selStart + label.length;
      return { text, selStart, selEnd };
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); wrap('**', '**', 'غامق'); return; }
    if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); wrap('*', '*', 'مائل'); return; }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); insertLink(); return; }
    if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); wrap('`', '`', 'code'); return; }

    // Tab → indent (or outdent with Shift)
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (e.shiftKey) {
        // remove up to 2 leading spaces from each selected line
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const block = body.slice(lineStart, end);
        const dedented = block.replace(/^ {1,2}/gm, '');
        const diff = block.length - dedented.length;
        const text = body.slice(0, lineStart) + dedented + body.slice(end);
        setBody(text);
        requestAnimationFrame(() => {
          ta.setSelectionRange(Math.max(lineStart, start - Math.min(2, diff)), end - diff);
        });
      } else {
        const text = body.slice(0, start) + '  ' + body.slice(end);
        setBody(text);
        requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
      }
      return;
    }

    // Enter → auto-continue list / checkbox / quote
    if (e.key === 'Enter' && !e.shiftKey) {
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const lineStart = body.lastIndexOf('\n', start - 1) + 1;
      const line = body.slice(lineStart, start);
      const m = line.match(/^(\s*)([-*+]\s\[[ x]\]\s|[-*+]\s|\d+\.\s|>\s)(.*)$/);
      if (m) {
        const [, indent, marker, rest] = m;
        // Empty item → break out of list
        if (rest.trim() === '') {
          e.preventDefault();
          const text = body.slice(0, lineStart) + '\n' + body.slice(start);
          setBody(text);
          const pos = lineStart + 1;
          requestAnimationFrame(() => ta.setSelectionRange(pos, pos));
          return;
        }
        e.preventDefault();
        let nextMarker = marker;
        // increment numbered list
        const num = marker.match(/^(\d+)\.\s$/);
        if (num) nextMarker = `${parseInt(num[1], 10) + 1}. `;
        // reset checkbox to unchecked
        nextMarker = nextMarker.replace(/\[x\]/i, '[ ]');
        const insert = '\n' + indent + nextMarker;
        const text = body.slice(0, start) + insert + body.slice(start);
        setBody(text);
        const pos = start + insert.length;
        requestAnimationFrame(() => ta.setSelectionRange(pos, pos));
      }
    }
  };

  // Word count + reading time
  const stats = useMemo(() => {
    const text = body.replace(/```[\s\S]*?```/g, '').replace(/[#*_`>[\]()\-]/g, ' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = body.length;
    const minutes = Math.max(1, Math.round(words / 200));
    return { words, chars, minutes };
  }, [body]);

  const toolbarBtn =
    'h-8 min-w-8 px-2 rounded-lg bg-background/60 hover:bg-accent border border-border/40 text-xs font-semibold text-foreground/80 hover:text-foreground active:scale-95 transition-all flex items-center justify-center';

  return (
    <AppCard className="flex flex-col gap-3 min-h-[60vh]">
      {/* toolbar */}
      <div className="flex items-center gap-2">
        <select
          value={note.status}
          onChange={(e) => onChange({ status: e.target.value as NoteStatus })}
          className="h-8 rounded-full bg-background border border-border/60 px-2 text-xs"
        >
          <option value="draft">{'مسودة'}</option>
          <option value="active">{'نشِطة'}</option>
          <option value="archived">{'مؤرشفة'}</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={onTogglePreview}
          className="h-8 px-3 rounded-full bg-background border border-border/60 text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label={preview ? ('تحرير') : ('معاينة')}
        >
          {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {preview ? ('تحرير') : ('معاينة')}
        </button>
        <button
          onClick={onOptimize}
          className="h-8 px-3 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label={'محسِّن النص'}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {'حسِّن'}
        </button>
        <button
          onClick={onDelete}
          className="h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
          aria-label={'حذف'}
        >
          <Trash className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={'عنوان الملاحظة…'}
        className="w-full bg-transparent outline-none text-xl font-bold placeholder:text-muted-foreground/40"
        style={{ fontSize: 22 }}
      />

      {/* Markdown formatting toolbar */}
      {!preview && (
        <div
          className="flex items-center gap-1 flex-wrap pb-2 border-b border-border/40"
          style={{ direction: 'ltr' }}
        >
          <button type="button" onClick={() => linePrefix('# ')} className={toolbarBtn} title="Heading 1">H1</button>
          <button type="button" onClick={() => linePrefix('## ')} className={toolbarBtn} title="Heading 2">H2</button>
          <button type="button" onClick={() => linePrefix('### ')} className={toolbarBtn} title="Heading 3">H3</button>
          <span className="w-px h-5 bg-border/60 mx-0.5" />
          <button type="button" onClick={() => wrap('**', '**', 'غامق')} className={cn(toolbarBtn, 'font-bold')} title="Bold ⌘B">B</button>
          <button type="button" onClick={() => wrap('*', '*', 'مائل')} className={cn(toolbarBtn, 'italic')} title="Italic ⌘I">I</button>
          <button type="button" onClick={() => wrap('~~', '~~', 'strike')} className={cn(toolbarBtn, 'line-through')} title="Strikethrough">S</button>
          <button type="button" onClick={() => wrap('`', '`', 'code')} className={cn(toolbarBtn, 'font-mono')} title="Inline code ⌘E">{'<>'}</button>
          <span className="w-px h-5 bg-border/60 mx-0.5" />
          <button type="button" onClick={() => linePrefix('- ')} className={toolbarBtn} title="Bullet list">•</button>
          <button type="button" onClick={() => linePrefix('1. ')} className={toolbarBtn} title="Numbered list">1.</button>
          <button type="button" onClick={() => linePrefix('- [ ] ')} className={toolbarBtn} title="Checklist">☐</button>
          <button type="button" onClick={() => linePrefix('> ')} className={toolbarBtn} title="Quote">”</button>
          <button type="button" onClick={() => wrap('\n```\n', '\n```\n', 'code')} className={cn(toolbarBtn, 'font-mono')} title="Code block">```</button>
          <span className="w-px h-5 bg-border/60 mx-0.5" />
          <button type="button" onClick={insertLink} className={toolbarBtn} title="Link ⌘K">🔗</button>
          <button type="button" onClick={() => applyEdit(({ before, sel, after }) => {
            const insert = '\n---\n';
            return { text: before + sel + insert + after, selStart: before.length + sel.length + insert.length, selEnd: before.length + sel.length + insert.length };
          })} className={toolbarBtn} title="Divider">—</button>
        </div>
      )}

      {preview ? (
        <div className="prose prose-sm dark:prose-invert max-w-none flex-1 min-h-[40vh]">
          {body.trim() ? (
            <ReactMarkdown>{DOMPurify.sanitize(body)}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground text-sm">
              {'لا يوجد محتوى للمعاينة.'}
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={'ابدأ الكتابة… يمكنك استخدام Markdown و#وسوم/متداخلة.'}
          className="w-full flex-1 min-h-[40vh] bg-transparent outline-none text-sm leading-relaxed resize-none placeholder:text-muted-foreground/40 font-mono"
          style={{ fontSize: 16 }}
          spellCheck={false}
        />
      )}

      {/* stats + tags footer */}
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground/60 pt-2 border-t border-border/40">
        <span>{stats.words} {'كلمة'}</span>
        <span className="opacity-50">•</span>
        <span>{stats.chars} {'حرف'}</span>
        <span className="opacity-50">•</span>
        <span>{stats.minutes} {'د قراءة'}</span>
        <span className="flex-1" />
        <span className="normal-case tracking-normal opacity-70">
          {new Date(note.updatedAt).toLocaleString('ar', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
        </span>
      </div>

      {/* tags footer */}
      <TagsFooter body={body} />
    </AppCard>
  );
}

function TagsFooter({ body, }: { body: string; }) {
  const tags = useMemo(() => extractTags(body), [body]);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {'الوسوم'}
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