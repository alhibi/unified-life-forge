import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageShell, AppCard } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { Loader2, Clock, BookOpen, ALargeSmall, List, Copy, Check, Sun, Moon, SunDim, Minus, Plus, SlidersHorizontal, X } from '@/lib/icons';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { archiveApi } from '../api';
import type { ArchiveDocument } from '../types';

function readingTime(w: number) { return Math.max(1, Math.round(w / 220)); }

type ReadTheme = 'default' | 'sepia' | 'night';
type ReadFont = 'serif' | 'sans' | 'amiri';

interface ReadPrefs {
  theme: ReadTheme;
  font: ReadFont;
  size: number;      // px
  lineHeight: number; // multiplier
  width: number;      // max-width px
}

const DEFAULT_PREFS: ReadPrefs = { theme: 'default', font: 'serif', size: 17, lineHeight: 1.9, width: 720 };
const PREFS_KEY = 'archive.reader.prefs.v1';

function loadPrefs(): ReadPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[\s\u200f\u200e]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 80) || 'section';
}

function extractText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (typeof children === 'object' && 'props' in children) return extractText((children as any).props?.children);
  return '';
}

function buildToc(md: string): { level: 2 | 3; text: string; id: string }[] {
  const out: { level: 2 | 3; text: string; id: string }[] = [];
  const seen = new Map<string, number>();
  const lines = md.split('\n');
  for (const line of lines) {
    const m = /^(##|###)\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 2 | 3;
    const text = m[2].replace(/[*_`]/g, '').trim();
    let id = slugify(text);
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    out.push({ level, text, id });
  }
  return out;
}

const THEME_STYLES: Record<ReadTheme, React.CSSProperties> = {
  default: {},
  sepia:   { background: '#f4ecd8', color: '#3b2f1f' },
  night:   { background: '#0f0f10', color: '#e8e6e1' },
};

const FONT_STACKS: Record<ReadFont, string> = {
  serif: 'var(--font-serif, ui-serif, Georgia, "Times New Roman", serif)',
  sans:  'var(--font-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif)',
  amiri: '"Amiri", "Scheherazade New", "Traditional Arabic", serif',
};

export default function ArchiveReader() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ArchiveDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<ReadPrefs>(() => loadPrefs());
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    archiveApi.get(id)
      .then(d => { if (alive) setDoc(d); })
      .catch(e => alive && setErr(e.message || 'خطأ'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  // Reading progress
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (h.scrollTop / total) * 100)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [doc?.id]);

  const toc = useMemo(() => (doc ? buildToc(doc.content) : []), [doc]);
  const idCounter = useRef(new Map<string, number>());

  const makeHeadingId = useCallback((text: string) => {
    let base = slugify(text);
    const n = (idCounter.current.get(base) ?? 0) + 1;
    idCounter.current.set(base, n);
    return n > 1 ? `${base}-${n}` : base;
  }, []);

  // reset id counter each render pass
  idCounter.current = new Map();

  const jumpTo = (hid: string) => {
    setTocOpen(false);
    requestAnimationFrame(() => {
      const el = document.getElementById(hid);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const copyAll = async () => {
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(`${doc.title}\n\n${doc.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (loading) return (
    <PageShell>
      <div className="flex items-center gap-3"><BackButton /></div>
      <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    </PageShell>
  );

  if (err || !doc) return (
    <PageShell>
      <div className="flex items-center gap-3"><BackButton /></div>
      <AppCard className="text-center py-10">
        <p className="text-sm text-muted-foreground">{err || 'المستند غير موجود'}</p>
      </AppCard>
    </PageShell>
  );

  const themeStyle = THEME_STYLES[prefs.theme];
  const fontFamily = FONT_STACKS[prefs.font];
  const isThemed = prefs.theme !== 'default';
  const mutedColor = prefs.theme === 'sepia' ? '#7a6a4f' : prefs.theme === 'night' ? '#9a9894' : undefined;
  const borderColor = prefs.theme === 'sepia' ? 'rgba(120,90,40,0.25)' : prefs.theme === 'night' ? 'rgba(255,255,255,0.12)' : undefined;
  const accentColor = prefs.theme === 'sepia' ? '#8a5a1a' : prefs.theme === 'night' ? '#d4b483' : undefined;

  return (
    <div
      style={{
        ...themeStyle,
        minHeight: '100dvh',
        transition: 'background-color 400ms ease, background 400ms ease, color 400ms ease',
      }}
      className="pt-14 pb-28 px-5"
    >
      {/* Reading progress bar */}
      <div className="fixed top-0 inset-x-0 h-[2px] z-40 bg-transparent">
        <div
          className="h-full transition-[width] duration-150"
          style={{ width: `${progress}%`, background: accentColor ?? 'hsl(var(--live, var(--primary)))' }}
        />
      </div>

      <div className="mx-auto" style={{ maxWidth: Math.max(prefs.width, 520) }}>
        <SEO title={`${doc.title} — الأرشيف`} description={doc.abstract || doc.topic} path={`/archive/${doc.id}`} />

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <BackButton />
            <span className="font-mono text-[10px] tracking-wider" style={{ color: accentColor ?? 'hsl(var(--primary) / 0.7)' }}>
              № {String(doc.accession_number).padStart(6, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className="w-9 h-9 rounded-xl"
              onClick={copyAll}
              aria-label="نسخ المحتوى"
              style={isThemed ? { color: 'inherit' } : undefined}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Sheet open={tocOpen} onOpenChange={setTocOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl" aria-label="الفهرس"
                  style={isThemed ? { color: 'inherit' } : undefined}>
                  <List className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>الفهرس</SheetTitle>
                </SheetHeader>
                {toc.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-6">لا توجد عناوين فرعية.</p>
                ) : (
                  <nav className="mt-4 space-y-1">
                    {toc.map((t) => (
                      <button
                        key={`${t.id}-${t.text}`}
                        onClick={() => jumpTo(t.id)}
                        className={`w-full text-right text-sm rounded-lg px-3 py-2 hover:bg-muted transition-colors ${t.level === 3 ? 'pr-6 text-muted-foreground text-[13px]' : 'font-medium text-foreground'}`}
                      >
                        {t.text}
                      </button>
                    ))}
                  </nav>
                )}
              </SheetContent>
            </Sheet>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl" aria-label="خيارات القراءة"
                  style={isThemed ? { color: 'inherit' } : undefined}>
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-3xl max-h-[85dvh] p-0 flex flex-col"
              >
                {/* Drag handle — visual affordance that this can be swiped/tapped away */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="إغلاق"
                  className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-foreground/25 hover:bg-foreground/40 transition-colors"
                />
                <SheetHeader className="px-5 pt-2 pb-3 flex-row items-center justify-between space-y-0 border-b border-border/40">
                  <SheetTitle className="text-right text-base">خيارات القراءة</SheetTitle>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    aria-label="إغلاق"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 hover:bg-muted active:scale-95 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </SheetHeader>
                <div className="space-y-6 px-5 pt-4 pb-6 overflow-y-auto flex-1">
                  {/* Theme */}
                  <div>
                    <div className="text-[12px] text-muted-foreground mb-2">السمة</div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { k: 'default' as const, label: 'افتراضي', icon: Sun,   bg: 'hsl(var(--background))', fg: 'hsl(var(--foreground))' },
                        { k: 'sepia'   as const, label: 'ورقي',    icon: SunDim, bg: '#f4ecd8',              fg: '#3b2f1f' },
                        { k: 'night'   as const, label: 'ليلي',    icon: Moon,  bg: '#0f0f10',              fg: '#e8e6e1' },
                      ]).map(({ k, label, icon: Icon, bg, fg }) => (
                        <button
                          key={k}
                          onClick={() => setPrefs(p => ({ ...p, theme: k }))}
                          className={`rounded-2xl border py-3 px-2 flex flex-col items-center gap-1 transition-all ${prefs.theme === k ? 'border-primary ring-2 ring-primary/30' : 'border-border/50'}`}
                          style={{ background: bg, color: fg }}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[11px]">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Font family */}
                  <div>
                    <div className="text-[12px] text-muted-foreground mb-2">الخط</div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { k: 'serif' as const, label: 'كلاسيكي' },
                        { k: 'sans'  as const, label: 'حديث' },
                        { k: 'amiri' as const, label: 'أميري' },
                      ]).map(({ k, label }) => (
                        <button
                          key={k}
                          onClick={() => setPrefs(p => ({ ...p, font: k }))}
                          className={`rounded-2xl border py-3 text-sm transition-all ${prefs.font === k ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 text-foreground/80'}`}
                          style={{ fontFamily: FONT_STACKS[k] }}
                        >
                          {label} — أبجد
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Font size */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] text-muted-foreground flex items-center gap-1"><ALargeSmall className="w-3.5 h-3.5" /> حجم الخط</div>
                      <div className="text-[11px] tabular-nums text-muted-foreground">{prefs.size}px</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="w-9 h-9 rounded-xl" onClick={() => setPrefs(p => ({ ...p, size: Math.max(13, p.size - 1) }))}><Minus className="w-4 h-4" /></Button>
                      <Slider min={13} max={26} step={1} value={[prefs.size]} onValueChange={([v]) => setPrefs(p => ({ ...p, size: v }))} className="flex-1" />
                      <Button variant="outline" size="icon" className="w-9 h-9 rounded-xl" onClick={() => setPrefs(p => ({ ...p, size: Math.min(26, p.size + 1) }))}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {/* Line height */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] text-muted-foreground">تباعد الأسطر</div>
                      <div className="text-[11px] tabular-nums text-muted-foreground">{prefs.lineHeight.toFixed(2)}</div>
                    </div>
                    <Slider min={1.4} max={2.4} step={0.05} value={[prefs.lineHeight]} onValueChange={([v]) => setPrefs(p => ({ ...p, lineHeight: v }))} />
                  </div>
                  {/* Width */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] text-muted-foreground">عرض النص</div>
                      <div className="text-[11px] tabular-nums text-muted-foreground">{prefs.width}px</div>
                    </div>
                    <Slider min={520} max={960} step={20} value={[prefs.width]} onValueChange={([v]) => setPrefs(p => ({ ...p, width: v }))} />
                  </div>
                  <div className="flex items-center gap-3 pt-2 sticky bottom-0 -mx-5 px-5 py-3 bg-background/95 backdrop-blur border-t border-border/40">
                    <Button variant="ghost" size="sm" onClick={() => setPrefs(DEFAULT_PREFS)}>إعادة ضبط</Button>
                    <Button className="flex-1 h-10 rounded-xl" onClick={() => setSettingsOpen(false)}>تم القراءة</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div>
          <header className="py-4 mb-3 border-b" style={{ borderColor: borderColor ?? 'hsl(var(--border) / 0.3)' }}>
            <h1
              className="text-3xl font-bold leading-tight mb-3 tracking-tight"
              style={{ fontFamily, color: 'inherit' }}
            >
              {doc.title}
            </h1>
            {doc.abstract && (
              <p
                className="leading-relaxed mb-3 italic"
                style={{ fontFamily, fontSize: Math.max(13, prefs.size - 3), color: mutedColor ?? 'hsl(var(--muted-foreground))' }}
              >
                {doc.abstract}
              </p>
            )}
            <div className="flex items-center gap-3 text-[11px] flex-wrap" style={{ color: mutedColor ?? 'hsl(var(--muted-foreground))' }}>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readingTime(doc.word_count)} د قراءة</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {doc.word_count.toLocaleString('ar-EG')} كلمة</span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: isThemed ? 'rgba(127,127,127,0.15)' : 'hsl(var(--muted) / 0.5)' }}>{doc.complexity}</span>
            </div>
            {doc.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {doc.tags.map(t => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: isThemed ? 'rgba(127,127,127,0.15)' : 'hsl(var(--primary) / 0.1)',
                      color: accentColor ?? 'hsl(var(--primary))',
                    }}
                  >{t}</span>
                ))}
              </div>
            )}
          </header>

          <article
            ref={articleRef}
            className="archive-prose pb-24"
            style={{ fontFamily, fontSize: prefs.size, lineHeight: prefs.lineHeight, color: 'inherit' }}
          >
            <ReactMarkdown
              components={{
                h1: () => null,
                h2: ({ node, children, ...props }) => {
                  const text = extractText(children);
                  const hid = makeHeadingId(text);
                  return (
                    <h2
                      id={hid}
                      className="font-bold mt-10 mb-3 pb-2 border-b scroll-mt-24"
                      style={{ fontSize: prefs.size + 6, borderColor: borderColor ?? 'hsl(var(--border) / 0.3)' }}
                      {...props}
                    >{children}</h2>
                  );
                },
                h3: ({ node, children, ...props }) => {
                  const text = extractText(children);
                  const hid = makeHeadingId(text);
                  return (
                    <h3
                      id={hid}
                      className="font-semibold mt-7 mb-2 scroll-mt-24"
                      style={{ fontSize: prefs.size + 3 }}
                      {...props}
                    >{children}</h3>
                  );
                },
                p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pr-6 mb-4 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pr-6 mb-4 space-y-1" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="pr-3 my-4 italic"
                    style={{
                      borderRight: `3px solid ${accentColor ?? 'hsl(var(--primary) / 0.5)'}`,
                      color: mutedColor ?? 'hsl(var(--muted-foreground))',
                    }}
                    {...props}
                  />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="px-1 py-0.5 rounded text-[0.9em]"
                    style={{ background: isThemed ? 'rgba(127,127,127,0.2)' : 'hsl(var(--muted))' }}
                    {...props}
                  />
                ),
                hr: () => <hr className="my-8" style={{ borderColor: borderColor ?? 'hsl(var(--border) / 0.4)' }} />,
                a: ({ node, ...props }) => (
                  <a {...props} className="underline underline-offset-2" style={{ color: accentColor ?? 'hsl(var(--primary))' }} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {doc.content}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}