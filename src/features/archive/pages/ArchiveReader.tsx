import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { newId, pkmDb } from '@/features/pkm/lib/db';
import { supabase } from '@/integrations/supabase/client';
import {
  ALargeSmall,
  ArrowLeftRight,
  BookOpen,
  Brain,
  Check,
  Clock,
  Copy,
  List,
  Loader2,
  Lock,
  MessageCircle,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Unlock,
  Waves,
  Wifi,
  WifiOff,
  X,
} from '@/lib/icons';

import { archiveApi } from '../api';
import ArchiveCompanion from '../components/ArchiveCompanion';
import ArchiveFlashcards from '../components/ArchiveFlashcards';
import type { ArchiveDocument } from '../types';

function readingTime(w: number) {
  return Math.max(1, Math.round(w / 220));
}

type ReadTheme = 'default' | 'sepia' | 'night' | 'custom';
type ReadFont = 'georgia' | 'sf' | 'iowan' | 'avenir' | 'amiri' | 'tajawal';
type ReadAlignment = 'default' | 'justify';
type TransitionStyle = 'fade' | 'slide' | 'none';

interface ReadPrefs {
  theme: ReadTheme;
  customBg: string;
  customFg: string;
  font: ReadFont;
  size: number; // px
  weight: number; // 400, 500, 600, 700
  ligatures: boolean;
  alignment: ReadAlignment;
  lineHeight: number; // multiplier
  width: number; // max-width px
  cinematic: boolean;
  transitions: TransitionStyle;
  offline: boolean;
  lock: boolean;
  brightness: number; // 0.1 to 1.0 (opacity overlay dimming)
}

const DEFAULT_PREFS: ReadPrefs = {
  theme: 'default',
  customBg: '#E8F5E9', // Elegant light sage/mint green
  customFg: '#1B5E20', // Forest green text
  font: 'georgia',
  size: 17,
  weight: 400,
  ligatures: true,
  alignment: 'default',
  lineHeight: 1.9,
  width: 720,
  cinematic: true,
  transitions: 'fade',
  offline: false,
  lock: false,
  brightness: 1.0,
};

const PREFS_KEY = 'archive.reader.prefs.v2';

function loadPrefs(): ReadPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[\s\u200f\u200e]+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '')
      .slice(0, 80) || 'section'
  );
}

function extractText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (typeof children === 'object' && 'props' in children)
    return extractText((children as any).props?.children);
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
  sepia: { background: '#f4ecd8', color: '#3b2f1f' },
  night: { background: '#0f0f10', color: '#e8e6e1' },
  custom: {}, // Evaluated dynamically using customBg/customFg
};

const FONT_STACKS: Record<ReadFont, string> = {
  georgia: 'Georgia, ui-serif, serif',
  sf: 'system-ui, -apple-system, sans-serif',
  iowan: '"Iowan Old Style", Iowan, Georgia, serif',
  avenir: '"Avenir Next", Avenir, sans-serif',
  amiri: '"Amiri", serif',
  tajawal: '"Tajawal", sans-serif',
};

// Custom tactile cylinder slider
interface VerticalCylinderSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  icon?: React.ReactNode;
}

function VerticalCylinderSlider({ value, min, max, onChange, icon }: VerticalCylinderSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const pct = 1 - y; // Invert so top is maximum
    const nextVal = min + pct * (max - min);
    onChange(Math.round(nextVal * 100) / 100);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    handlePointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      handlePointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  const fillPct = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-12 h-36 bg-muted/60 dark:bg-muted/30 rounded-full overflow-hidden cursor-pointer active:scale-x-[1.03] transition-all touch-none border border-border/40 shadow-inner flex flex-col justify-end"
    >
      <div
        className="w-full bg-primary/20 dark:bg-primary/30 transition-all duration-75 flex items-center justify-center relative"
        style={{ height: `${fillPct}%` }}
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-primary/40 shadow-glow" />
      </div>
      <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none text-foreground/50 select-none">
        {icon}
      </div>
    </div>
  );
}

export default function ArchiveReader() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ArchiveDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<ReadPrefs>(() => loadPrefs());
  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);

  // Custom states matching the required flagship feature set
  const [activeTab, setActiveTab] = useState<'reader' | 'advanced'>('reader');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Custom Voice (TTS) engine states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [spokenParagraphIndex, setSpokenParagraphIndex] = useState<number | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  const articleRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  // Split markdown content into paragraphs to enable block-level voice highlighting
  const paragraphs = useMemo(() => {
    if (!doc) return [];
    return doc.content
      .split(/\n\n+/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);
  }, [doc?.content]);

  // Load browser SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoicesList = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
      const preferred = list.find((v) => v.lang.startsWith('ar') || v.lang.startsWith('en'))?.name || '';
      setSelectedVoiceName(preferred);
    };
    loadVoicesList();
    window.speechSynthesis.onvoiceschanged = loadVoicesList;
  }, []);

  // Screen Wake Lock implementation
  useEffect(() => {
    const toggleWakeLock = async () => {
      if (prefs.lock && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (e) {
          console.warn('Wake Lock request failed:', e);
        }
      } else {
        if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
          } catch { /* ignore */ }
          wakeLockRef.current = null;
        }
      }
    };
    toggleWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [prefs.lock]);

  // Speech player handlers
  const startSpeaking = useCallback((startIndex: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    let currentIndex = startIndex;
    const playParagraph = () => {
      if (currentIndex >= paragraphs.length) {
        setIsSpeaking(false);
        setIsPaused(false);
        setSpokenParagraphIndex(null);
        return;
      }

      setSpokenParagraphIndex(currentIndex);
      const text = paragraphs[currentIndex];
      // Clean text of basic markdown tokens for smoother spoken reading
      const cleanText = text.replace(/[#*`_[\]()\-+]/g, ' ').trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = voiceSpeed;
      if (selectedVoiceName) {
        const found = voices.find((v) => v.name === selectedVoiceName);
        if (found) utterance.voice = found;
      }

      utterance.onend = () => {
        currentIndex++;
        playParagraph();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setSpokenParagraphIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    playParagraph();
  }, [paragraphs, voices, selectedVoiceName, voiceSpeed]);

  const pauseSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resumeSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpokenParagraphIndex(null);
  }, []);

  // Safe client-side full text highlight renderer mapping segments into plain JSX tags
  const highlightSearch = useCallback((text: string, query: string): React.ReactNode => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-400/40 text-foreground px-0.5 rounded-sm font-semibold border-b border-amber-500">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  }, []);

  const exportToPKM = async () => {
    if (!doc) return;
    try {
      const noteId = newId();
      const now = Date.now();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      const noteContent =
        `# ${doc.title}\n\n` +
        `> 📌 **أرشيف معرفي رقمي**: مونوغراف كامل ومفصل\n` +
        `> 🔢 **الرقم الأرشيفي**: № ${String(doc.accession_number).padStart(6, '0')}\n` +
        `> ⏱ **زمن القراءة**: ${readingTime(doc.word_count)} دقيقة\n\n` +
        `## الخلاصة الدلالية\n${doc.abstract || doc.topic}\n\n` +
        `---\n\n` +
        `${doc.content}\n\n` +
        `---\n` +
        `*الارتباطات:* [[/archive/${doc.id}]] #أرشيف_معرفي ` +
        doc.tags.map((t: string) => `#${t.replace(/[\s-]+/g, '_')}`).join(' ');

      const newNote = {
        id: noteId,
        userId,
        title: doc.title,
        contentMd: noteContent,
        status: 'active' as const,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        dirty: !!userId,
      };

      await pkmDb.notes.put(newNote);

      if (userId) {
        const payload = {
          id: noteId,
          user_id: userId,
          title: doc.title,
          content_md: noteContent,
          status: 'active',
          is_deleted: false,
          updated_at: new Date(now).toISOString(),
          created_at: new Date(now).toISOString(),
        };
        await pkmDb.outbox.add({
          id: newId(),
          table: 'pkm_notes',
          op: 'upsert',
          rowId: noteId,
          payload,
          createdAt: now,
        });
        window.dispatchEvent(new Event('pkm-outbox-changed'));
      }

      window.dispatchEvent(new Event('pkm-notes-changed'));
      setExported(true);
      toast.success(
        'تمت أرشفة وتصدير المونوغراف كمسودة مفكرة في مذكرتك بنجاح! ستظهر أيضاً في شبكتك العصبية الثلاثية الأبعاد للذاكرة الذكية.',
      );
      setTimeout(() => setExported(false), 2000);
    } catch (e: any) {
      console.error(e);
      toast.error('حدث خطأ أثناء التصدير لمذكرتك المعرفية.');
    }
  };

  // Cinematic engine
  useEffect(() => {
    if (!prefs.cinematic) {
      stageRef.current?.style.setProperty('--reading-pulse', '0');
      return;
    }
    let lastY = window.scrollY;
    let lastT = performance.now();
    let pulse = 0;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const dy = Math.abs(window.scrollY - lastY);
      const dt = Math.max(16, now - lastT);
      const v = Math.min(1, dy / dt / 2);
      pulse = Math.max(v, pulse * 0.92);
      const focusY = ((window.innerHeight * 0.5) / window.innerHeight) * 100;
      stageRef.current?.style.setProperty('--reading-pulse', pulse.toFixed(3));
      stageRef.current?.style.setProperty('--reading-focus-y', `${focusY}%`);
      lastY = window.scrollY;
      lastT = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefs.cinematic, doc?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { /* quota or private mode */ }
  }, [prefs]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    archiveApi
      .get(id)
      .then((d: any) => {
        if (alive) setDoc(d);
      })
      .catch((e: any) => alive && setErr(e.message || 'خطأ'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  // Reading progress tracker
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const next = total > 0 ? Math.min(100, Math.max(0, (h.scrollTop / total) * 100)) : 0;
      if (progressBarRef.current) progressBarRef.current.style.width = `${next}%`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [doc?.id]);

  const toc = useMemo(() => (doc ? buildToc(doc.content) : []), [doc]);
  const idCounter = useRef(new Map<string, number>());

  const makeHeadingId = useCallback((text: string) => {
    const base = slugify(text);
    const n = (idCounter.current.get(base) ?? 0) + 1;
    idCounter.current.set(base, n);
    return n > 1 ? `${base}-${n}` : base;
  }, []);

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
    } catch { /* clipboard permission denied */ }
  };

  if (loading)
    return (
      <PageShell>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );

  if (err || !doc)
    return (
      <PageShell>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
        <AppCard className="text-center py-10">
          <p className="text-meta text-muted-foreground">{err || 'المستند غير موجود'}</p>
        </AppCard>
      </PageShell>
    );

  const themeStyle = THEME_STYLES[prefs.theme];
  const fontFamily = FONT_STACKS[prefs.font];
  const isThemed = prefs.theme !== 'default';
  const mutedColor =
    prefs.theme === 'sepia' ? '#7a6a4f' : prefs.theme === 'night' ? '#9a9894' : undefined;
  const borderColor =
    prefs.theme === 'sepia'
      ? 'rgba(120,90,40,0.25)'
      : prefs.theme === 'night'
        ? 'rgba(255,255,255,0.12)'
        : undefined;
  const accentColor =
    prefs.theme === 'sepia' ? '#8a5a1a' : prefs.theme === 'night' ? '#d4b483' : undefined;

  const activeBg =
    prefs.theme === 'custom' ? prefs.customBg : themeStyle.background || 'hsl(var(--background))';
  const activeFg =
    prefs.theme === 'custom' ? prefs.customFg : themeStyle.color || 'hsl(var(--foreground))';

  return (
    <div
      ref={stageRef}
      style={{
        backgroundColor: activeBg,
        color: activeFg,
        minHeight: '100dvh',
        transition: 'background-color 400ms ease, background 400ms ease, color 400ms ease',
        ['--ambient-glow' as any]:
          prefs.theme === 'sepia'
            ? 'rgba(138, 90, 26, 0.10)'
            : prefs.theme === 'night'
              ? 'rgba(212, 180, 131, 0.10)'
              : prefs.theme === 'custom'
                ? 'rgba(0,0,0,0.05)'
                : 'hsl(var(--live, var(--primary)) / 0.10)',
        ['--ambient-accent' as any]: accentColor ?? 'hsl(var(--live, var(--primary)))',
      } as React.CSSProperties}
      className={`pt-14 pb-page px-5 relative ${prefs.cinematic ? 'archive-cinematic' : ''} ${prefs.transitions === 'fade' ? 'animate-fade-in' : prefs.transitions === 'slide' ? 'animate-slide-up' : ''}`}
    >
      {/* Dynamic Brightness hardware-like overlay */}
      {prefs.brightness < 1 && (
        <div
          className="fixed inset-0 pointer-events-none z-[9999] bg-black"
          style={{ opacity: 1 - prefs.brightness }}
        />
      )}

      {prefs.cinematic && <div className="archive-ambient" aria-hidden="true" />}

      {/* Reading progress bar */}
      <div className="fixed top-0 inset-x-0 h-[2px] z-float bg-transparent">
        <div
          ref={progressBarRef}
          className="h-full transition-[width] duration-150"
          style={{ width: '0%', background: accentColor ?? 'hsl(var(--live, var(--primary)))' }}
        />
      </div>

      <div className="mx-auto relative z-raised" style={{ maxWidth: Math.max(prefs.width, 520) }}>
        <SEO
          title={`${doc.title} — الأرشيف`}
          description={doc.abstract || doc.topic}
          path={`/archive/${doc.id}`}
        />

        {/* Global Toolbar Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <BackButton />
            <span
              className="font-mono text-micro tracking-wider"
              style={{ color: accentColor ?? 'hsl(var(--primary) / 0.7)' }}
            >
              № {String(doc.accession_number).padStart(6, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-xl text-primary"
              onClick={exportToPKM}
              title="تصدير ذكي لمذكرتي"
              aria-label="تصدير ذكي لمذكرتي"
              style={isThemed ? { color: 'inherit' } : undefined}
            >
              {exported ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
            </Button>

            <Sheet open={flashcardsOpen} onOpenChange={setFlashcardsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-xl text-primary"
                  title="تثبيت الحفظ المعرفي"
                  aria-label="تثبيت الحفظ المعرفي"
                  style={isThemed ? { color: 'inherit' } : undefined}
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] p-0 flex flex-col">
                <button
                  type="button"
                  onClick={() => setFlashcardsOpen(false)}
                  aria-label="إغلاق"
                  className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-foreground/25 hover:bg-foreground/40 transition-colors"
                />
                <SheetHeader className="px-5 pt-2 pb-3 flex-row items-center justify-between space-y-0 border-b border-border/40">
                  <SheetTitle className="text-end text-body font-bold">
                    تثبيت الحفظ والاستذكار النشط
                  </SheetTitle>
                  <button
                    type="button"
                    onClick={() => setFlashcardsOpen(false)}
                    aria-label="إغلاق"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 hover:bg-muted active:scale-95 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </SheetHeader>
                <div className="p-5 overflow-y-auto flex-1 pb-10">
                  <ArchiveFlashcards
                    outline={doc.outline}
                    onClose={() => setFlashcardsOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={companionOpen} onOpenChange={setCompanionOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-xl text-primary"
                  title="مساعد القراءة الفوري"
                  aria-label="مساعد القراءة الفوري"
                  style={isThemed ? { color: 'inherit' } : undefined}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] p-0 flex flex-col">
                <button
                  type="button"
                  onClick={() => setCompanionOpen(false)}
                  aria-label="إغلاق"
                  className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-foreground/25 hover:bg-foreground/40 transition-colors"
                />
                <SheetHeader className="px-5 pt-2 pb-3 flex-row items-center justify-between space-y-0 border-b border-border/40">
                  <SheetTitle className="text-end text-body font-bold">
                    مساعد القراءة والمرافقة الفورية
                  </SheetTitle>
                  <button
                    type="button"
                    onClick={() => setCompanionOpen(false)}
                    aria-label="إغلاق"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 hover:bg-muted active:scale-95 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </SheetHeader>
                <div className="p-5 overflow-y-auto flex-1 pb-10">
                  <ArchiveCompanion document={doc} />
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-xl"
              onClick={copyAll}
              aria-label="نسخ المحتوى"
              style={isThemed ? { color: 'inherit' } : undefined}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>

            <Sheet open={tocOpen} onOpenChange={setTocOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-xl"
                  aria-label="الفهرس"
                  style={isThemed ? { color: 'inherit' } : undefined}
                >
                  <List className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>الفهرس</SheetTitle>
                </SheetHeader>
                {toc.length === 0 ? (
                  <p className="text-meta text-muted-foreground mt-6">لا توجد عناوين فرعية.</p>
                ) : (
                  <nav className="mt-4 space-y-1">
                    {toc.map((t: any) => (
                      <button
                        key={`${t.id}-${t.text}`}
                        onClick={() => jumpTo(t.id)}
                        className={`w-full text-end text-meta rounded-lg px-3 py-2 hover:bg-muted transition-colors ${t.level === 3 ? 'pe-6 text-muted-foreground text-mini' : 'font-medium text-foreground'}`}
                      >
                        {t.text}
                      </button>
                    ))}
                  </nav>
                )}
              </SheetContent>
            </Sheet>

            {/* UPGRADED READER OPTIONS DRAWER - THE FLAGSHIP CONTROL HUB */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-xl"
                  aria-label="خيارات القراءة"
                  style={isThemed ? { color: 'inherit' } : undefined}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[92dvh] p-0 flex flex-col overflow-hidden bg-background">
                {/* Visual drag indicator */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="إغلاق"
                  className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-foreground/20 hover:bg-foreground/30 transition-colors"
                />

                <SheetHeader className="px-5 pt-1 pb-2 flex-row items-center justify-between space-y-0 border-b border-border/40">
                  <SheetTitle className="text-end text-meta font-semibold">
                    {activeTab === 'reader' ? 'خيارات القراءة' : 'إعدادات متقدمة'}
                  </SheetTitle>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    aria-label="إغلاق"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 hover:bg-muted active:scale-95 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-8">
                  {activeTab === 'reader' ? (
                    /* ------------------------------------------------------------- */
                    /*  READER SETTINGS (PRIMARY VIEW)                                */
                    /* ------------------------------------------------------------- */
                    <div className="space-y-5">
                      {/* Active Preview */}
                      <div
                        className="p-4 rounded-2xl border transition-all shadow-sm"
                        style={{
                          backgroundColor: activeBg,
                          color: activeFg,
                          fontFamily,
                          borderColor: borderColor || 'hsl(var(--border) / 0.4)',
                        } as React.CSSProperties}
                      >
                        <div className="text-micro font-medium opacity-65 mb-1 text-center">المعاينة الحية</div>
                        <p
                          style={{
                            fontSize: `${prefs.size}px`,
                            fontWeight: prefs.weight,
                            textAlign: prefs.alignment === 'justify' ? 'justify' : 'start',
                            lineHeight: prefs.lineHeight,
                          }}
                          className="text-center"
                        >
                          إن الهدف من الملاحظة ليس البحث عن العيوب، بل الكشف عن الجمال الخفي في ثنايا الكلمات المعرفية الكلاسيكية.
                        </p>
                      </div>

                      {/* Theme Selector Section */}
                      <div>
                        <div className="text-mini font-medium text-muted-foreground mb-2 text-start">السمة</div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            {[
                              { k: 'default' as const, label: 'افتراضي', bg: '#ffffff', fg: '#1f2937' },
                              { k: 'sepia' as const, label: 'ورقي', bg: '#f4ecd8', fg: '#3b2f1f' },
                              { k: 'night' as const, label: 'ليلي', bg: '#0f0f10', fg: '#e8e6e1' },
                            ].map(({ k, label, bg, fg }) => (
                              <button
                                key={k}
                                onClick={() => setPrefs((p) => ({ ...p, theme: k }))}
                                className={`w-10 h-10 rounded-full border flex items-center justify-center relative transition-all active:scale-90 ${prefs.theme === k ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'border-border/60'}`}
                                style={{ backgroundColor: bg }}
                                title={label}
                              >
                                {prefs.theme === k && <Check className="w-4 h-4" style={{ color: fg }} />}
                              </button>
                            ))}
                            <button
                              onClick={() => setPrefs((p) => ({ ...p, theme: 'custom' }))}
                              className={`w-10 h-10 rounded-full border flex items-center justify-center relative transition-all active:scale-90 bg-gradient-to-tr from-pink-300 via-purple-300 to-indigo-300 ${prefs.theme === 'custom' ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'border-border/60'}`}
                              title="مخصصة"
                            >
                              <Pencil className="w-4 h-4 text-foreground/80" />
                            </button>
                          </div>

                          <div className="h-8 w-[1px] bg-border/40" />

                          {/* Voice Mode Toggle Trigger */}
                          <div className="flex flex-col items-center">
                            <button
                              onClick={() => {
                                if (isSpeaking) {
                                  stopSpeaking();
                                } else {
                                  startSpeaking(0);
                                }
                              }}
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${isSpeaking ? 'bg-primary/20 border-primary text-primary animate-pulse' : 'bg-muted/50 border-transparent text-muted-foreground'}`}
                              title="القارئ الصوتي الذكي"
                            >
                              <Waves className="w-5 h-5" />
                            </button>
                            <span className="text-micro text-muted-foreground mt-1">القارئ الصوتي</span>
                          </div>
                        </div>
                      </div>

                      {/* Custom Palette Builder - Revealed when Custom Theme active */}
                      {prefs.theme === 'custom' && (
                        <div className="p-3 rounded-2xl bg-muted/30 border border-border/30 space-y-3 animate-fade-in text-start">
                          <div className="text-micro font-medium text-muted-foreground">صانع السمة المخصصة</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-micro text-muted-foreground block mb-1">لون الخلفية</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={prefs.customBg}
                                  onChange={(e) => setPrefs((p) => ({ ...p, customBg: e.target.value }))}
                                  className="w-7 h-7 rounded-md overflow-hidden border-0 cursor-pointer"
                                />
                                <span className="font-mono text-micro">{prefs.customBg}</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-micro text-muted-foreground block mb-1">لون النص</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={prefs.customFg}
                                  onChange={(e) => setPrefs((p) => ({ ...p, customFg: e.target.value }))}
                                  className="w-7 h-7 rounded-md overflow-hidden border-0 cursor-pointer"
                                />
                                <span className="font-mono text-micro">{prefs.customFg}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Speech Synthesis settings - Revealed when Speaking/Active */}
                      {isSpeaking && (
                        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 space-y-2 animate-fade-in text-start">
                          <div className="flex items-center justify-between">
                            <span className="text-micro font-semibold text-primary">التحكم بالصوت</span>
                            <div className="flex items-center gap-1.5">
                              {isPaused ? (
                                <button onClick={resumeSpeaking} className="p-1.5 bg-primary/10 rounded-md text-primary">
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button onClick={pauseSpeaking} className="p-1.5 bg-primary/10 rounded-md text-primary">
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={stopSpeaking} className="p-1.5 bg-rose-500/10 rounded-md text-rose-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-micro">
                            <div>
                              <label className="text-micro text-muted-foreground block mb-0.5">سرعة القراءة</label>
                              <select
                                value={voiceSpeed}
                                onChange={(e) => {
                                  const speed = parseFloat(e.target.value);
                                  setVoiceSpeed(speed);
                                  if (isSpeaking) startSpeaking(spokenParagraphIndex ?? 0);
                                }}
                                className="w-full bg-background border border-border/60 rounded-md py-1 px-1.5"
                              >
                                <option value="0.8">0.8x</option>
                                <option value="1.0">1.0x (طبيعي)</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="2.0">2.0x</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-micro text-muted-foreground block mb-0.5">الصوت</label>
                              <select
                                value={selectedVoiceName}
                                onChange={(e) => {
                                  setSelectedVoiceName(e.target.value);
                                  if (isSpeaking) {
                                    setTimeout(() => startSpeaking(spokenParagraphIndex ?? 0), 100);
                                  }
                                }}
                                className="w-full bg-background border border-border/60 rounded-md py-1 px-1.5 truncate"
                              >
                                {voices.map((v) => (
                                  <option key={v.name} value={v.name}>
                                    {v.name} ({v.lang})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Interactive Search Tool Input inside Settings overlay */}
                      {searchOpen && (
                        <div className="p-2 bg-muted/40 rounded-xl border border-border/40 animate-fade-in flex items-center gap-2">
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="ابحث عن كلمة أو فقرة بالمتن..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-0 outline-none text-mini flex-1 text-start placeholder:text-muted-foreground/60"
                            autoFocus
                          />
                          {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Controls Options Row Grid & Verticals Sliders */}
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Interactive Buttons Stack */}
                        <div className="col-span-6 grid grid-cols-2 gap-3">
                          {/* Text Customize / Go To Advanced */}
                          <button
                            onClick={() => setActiveTab('advanced')}
                            className="col-span-2 rounded-2xl bg-muted/40 dark:bg-muted/15 p-3 border border-border/40 flex flex-col items-center justify-center gap-1 hover:bg-muted/60 transition active:scale-95 text-center min-h-[5rem]"
                          >
                            <ALargeSmall className="w-5 h-5 text-primary" />
                            <div className="text-micro font-semibold text-foreground">تخصيص النص</div>
                            <div className="text-micro text-muted-foreground">خيارات متقدمة</div>
                          </button>

                          {/* Search Button */}
                          <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className={`rounded-full aspect-square border flex flex-col items-center justify-center p-2.5 transition active:scale-95 ${searchOpen ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/30 border-border/40 text-muted-foreground'}`}
                          >
                            <Search className="w-4 h-4" />
                            <span className="text-micro mt-0.5">بحث</span>
                          </button>

                          {/* Transitions Button */}
                          <button
                            onClick={() =>
                              setPrefs((p) => ({
                                ...p,
                                transitions: p.transitions === 'fade' ? 'slide' : p.transitions === 'slide' ? 'none' : 'fade',
                              }))
                            }
                            className={`rounded-full aspect-square border flex flex-col items-center justify-center p-2.5 transition active:scale-95 ${prefs.transitions !== 'none' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/30 border-border/40 text-muted-foreground'}`}
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                            <span className="text-micro mt-0.5">تنقل</span>
                          </button>
                        </div>

                        {/* Tactile Cylinder Vertical Sliders */}
                        <div className="col-span-6 flex items-center justify-around">
                          {/* Text Size Slider */}
                          <div className="flex flex-col items-center gap-1.5">
                            <VerticalCylinderSlider
                              value={prefs.size}
                              min={13}
                              max={26}
                              onChange={(v) => setPrefs((p) => ({ ...p, size: v }))}
                              icon={<ALargeSmall className="w-4 h-4" />}
                            />
                            <span className="text-micro font-medium text-muted-foreground">حجم الخط</span>
                          </div>

                          {/* Brightness Slider */}
                          <div className="flex flex-col items-center gap-1.5">
                            <VerticalCylinderSlider
                              value={prefs.brightness}
                              min={0.15}
                              max={1.0}
                              onChange={(v) => setPrefs((p) => ({ ...p, brightness: v }))}
                              icon={<Sun className="w-4 h-4" />}
                            />
                            <span className="text-micro font-medium text-muted-foreground">السطوع</span>
                          </div>
                        </div>
                      </div>

                      {/* Sub Bottom Action Triggers */}
                      <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4 text-start">
                        {/* Offline Caching Mode Toggle */}
                        <button
                          onClick={() => {
                            const next = !prefs.offline;
                            setPrefs((p) => ({ ...p, offline: next }));
                            if (next) {
                              toast.success('تم تمكين القراءة بدون اتصال. تم حفظ المقال محلياً بنجاح!');
                            } else {
                              toast.info('تم إيقاف وضع القراءة بدون اتصال.');
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition active:scale-[0.98] ${prefs.offline ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/30 border-border/30 text-muted-foreground'}`}
                        >
                          {prefs.offline ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
                          <div className="text-start">
                            <div className="text-micro font-semibold">قراءة دون اتصال</div>
                            <div className="text-micro text-muted-foreground">حفظ نسخة مؤقتة</div>
                          </div>
                        </button>

                        {/* Prevent Lock Mode Toggle */}
                        <button
                          onClick={() => {
                            const next = !prefs.lock;
                            setPrefs((p) => ({ ...p, lock: next }));
                            if (next) {
                              toast.success('تم تفعيل منع النوم التلقائي للشاشة أثناء القراءة.');
                            } else {
                              toast.info('تم إيقاف منع النوم التلقائي للشاشة.');
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition active:scale-[0.98] ${prefs.lock ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-muted/30 border-border/30 text-muted-foreground'}`}
                        >
                          {prefs.lock ? <Lock className="w-4 h-4 text-blue-500" /> : <Unlock className="w-4 h-4" />}
                          <div className="text-start">
                            <div className="text-micro font-semibold">تثبيت الشاشة</div>
                            <div className="text-micro text-muted-foreground">منع النوم التلقائي</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ------------------------------------------------------------- */
                    /*  ADVANCED SETTINGS (SECONDARY VIEW)                           */
                    /* ------------------------------------------------------------- */
                    <div className="space-y-4 text-start">
                      {/* Sub Preview Block */}
                      <div className="space-y-1">
                        <div className="text-micro font-semibold text-muted-foreground uppercase tracking-wider text-start">المعاينة المتقدمة</div>
                        <div
                          className="p-3 rounded-2xl border bg-muted/15"
                          style={{
                            fontFamily,
                            fontSize: `${prefs.size}px`,
                            fontWeight: prefs.weight,
                            textAlign: prefs.alignment === 'justify' ? 'justify' : 'start',
                            lineHeight: prefs.lineHeight,
                            fontVariantLigatures: prefs.ligatures ? 'common-ligatures' : 'none',
                          } as React.CSSProperties}
                        >
                          إن الحكمة هي ضالة المؤمن، فحيثما وجدها فهو أحق بها. المعرفة نور يستضاء به في دروب الحياة الوعرة...
                        </div>
                      </div>

                      {/* Select Font Carousel */}
                      <div>
                        <div className="text-mini font-semibold text-muted-foreground mb-1.5">اختر الخط</div>
                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                          {[
                            { k: 'georgia' as const, label: 'Georgia' },
                            { k: 'sf' as const, label: 'SF Pro' },
                            { k: 'iowan' as const, label: 'Iowan' },
                            { k: 'avenir' as const, label: 'Avenir' },
                            { k: 'amiri' as const, label: 'Amiri' },
                            { k: 'tajawal' as const, label: 'Tajawal' },
                          ].map(({ k, label }) => (
                            <button
                              key={k}
                              onClick={() => setPrefs((p) => ({ ...p, font: k }))}
                              className={`flex-none w-24 rounded-2xl border p-3 flex flex-col items-center justify-center gap-1.5 transition-all snap-start ${prefs.font === k ? 'border-primary ring-2 ring-primary/30 bg-primary/5 text-primary scale-105' : 'border-border/60 bg-muted/30 text-foreground/80'}`}
                            >
                              <span className="text-title font-semibold" style={{ fontFamily: FONT_STACKS[k] } as React.CSSProperties}>Aa</span>
                              <span className="text-micro font-medium">{label}</span>
                            </button>
                          ))}
                        </div>
                        {/* Carousel swipe dot pagination indicators */}
                        <div className="flex justify-center gap-1 mt-1">
                          {['georgia', 'iowan', 'amiri'].map((_group, idx) => (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${prefs.font === 'georgia' || prefs.font === 'sf' ? (idx === 0 ? 'bg-primary w-3' : 'bg-muted-foreground/30') : prefs.font === 'iowan' || prefs.font === 'avenir' ? (idx === 1 ? 'bg-primary w-3' : 'bg-muted-foreground/30') : idx === 2 ? 'bg-primary w-3' : 'bg-muted-foreground/30'}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Typography Settings Section */}
                      <div className="space-y-3.5 bg-muted/20 dark:bg-muted/10 p-3.5 rounded-2xl border border-border/40">
                        {/* Line Height slider control */}
                        <div className="flex items-center justify-between">
                          <span className="text-micro font-semibold">تباعد الأسطر</span>
                          <span className="text-micro font-mono text-muted-foreground">{prefs.lineHeight.toFixed(2)}</span>
                        </div>
                        <Slider
                          min={1.4}
                          max={2.4}
                          step={0.1}
                          value={[prefs.lineHeight]}
                          onValueChange={([v]) => setPrefs((p) => ({ ...p, lineHeight: v }))}
                        />

                        {/* Font Weight stepper selector */}
                        <div className="flex items-center justify-between border-t border-border/30 pt-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-micro font-semibold">سمك الخط</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-7 h-7 rounded-lg"
                              disabled={prefs.weight <= 400}
                              onClick={() => setPrefs((p) => ({ ...p, weight: Math.max(400, p.weight - 100) }))}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </Button>
                            <span className="text-micro font-mono font-medium w-10 text-center">{prefs.weight}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-7 h-7 rounded-lg"
                              disabled={prefs.weight >= 700}
                              onClick={() => setPrefs((p) => ({ ...p, weight: Math.min(700, p.weight + 100) }))}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Ligatures Toggle */}
                        <div className="flex items-center justify-between border-t border-border/30 pt-3 text-start">
                          <div className="space-y-0.5">
                            <span className="text-micro font-semibold">الروابط المطبعية (Ligatures)</span>
                            <p className="text-micro text-muted-foreground">تحسين ترابط الحروف العربية واللاتينية تلقائياً</p>
                          </div>
                          <Switch
                            checked={prefs.ligatures}
                            onCheckedChange={(checked) => setPrefs((p) => ({ ...p, ligatures: checked }))}
                          />
                        </div>
                      </div>

                      {/* Text Alignment Choice Section */}
                      <div>
                        <div className="text-mini font-semibold text-muted-foreground mb-2">محاذاة النص</div>
                        <div className="grid grid-cols-2 gap-3 text-start">
                          {/* Default/Start align */}
                          <button
                            onClick={() => setPrefs((p) => ({ ...p, alignment: 'default' }))}
                            className={`p-3 rounded-2xl border text-start space-y-1 transition active:scale-[0.98] ${prefs.alignment === 'default' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-micro font-semibold text-foreground">طبيعي (Default)</span>
                              <div className="h-4 w-4 rounded-full border border-primary flex items-center justify-center">
                                {prefs.alignment === 'default' && <div className="h-2 w-2 rounded-full bg-primary" />}
                              </div>
                            </div>
                            <p className="text-micro text-muted-foreground">تحاذى الأسطر لليمين بشكل انسيابي طبيعي.</p>
                          </button>

                          {/* Justify Align */}
                          <button
                            onClick={() => setPrefs((p) => ({ ...p, alignment: 'justify' }))}
                            className={`p-3 rounded-2xl border text-start space-y-1 transition active:scale-[0.98] ${prefs.alignment === 'justify' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-micro font-semibold text-foreground">ملء السطر (Justify)</span>
                              <div className="h-4 w-4 rounded-full border border-primary flex items-center justify-center">
                                {prefs.alignment === 'justify' && <div className="h-2 w-2 rounded-full bg-primary" />}
                              </div>
                            </div>
                            <p className="text-micro text-muted-foreground">تتمدد الكلمات لتملأ السطر بأكمله بانتظام.</p>
                          </button>
                        </div>
                      </div>

                      {/* Return/Back Button at bottom */}
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('reader')}
                          className="h-9 px-6 rounded-xl flex items-center gap-1.5 text-mini font-semibold"
                        >
                          <span>عد إلى الخيارات</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Article Metadata & Header */}
        <div>
          <header
            className="py-4 mb-3 border-b"
            style={{ borderColor: borderColor ?? 'hsl(var(--border) / 0.3)' }}
          >
            <h1
              className="text-hero font-bold leading-tight mb-3 tracking-tight"
              style={{ fontFamily, color: 'inherit' }}
            >
              {doc.title}
            </h1>
            {doc.abstract && (
              <p
                className="leading-relaxed mb-3 italic"
                style={{
                  fontFamily,
                  fontSize: Math.max(13, prefs.size - 3),
                  color: mutedColor ?? 'hsl(var(--muted-foreground))',
                }}
              >
                {doc.abstract}
              </p>
            )}
            <div
              className="flex items-center gap-3 text-micro flex-wrap"
              style={{ color: mutedColor ?? 'hsl(var(--muted-foreground))' }}
            >
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {readingTime(doc.word_count)} د قراءة
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> {doc.word_count.toLocaleString('ar-EG')} كلمة
              </span>
              <span
                className="px-2 py-0.5 rounded-full"
                style={{
                  background: isThemed ? 'rgba(127,127,127,0.15)' : 'hsl(var(--muted) / 0.5)',
                }}
              >
                {doc.complexity}
              </span>
            </div>
            {doc.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {doc.tags.map((t: string) => (
                  <span
                    key={t}
                    className="text-micro px-2 py-0.5 rounded-full"
                    style={{
                      background: isThemed ? 'rgba(127,127,127,0.15)' : 'hsl(var(--primary) / 0.1)',
                      color: accentColor ?? 'hsl(var(--primary))',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Core Markdown Article body text container */}
          <article
            ref={articleRef}
            className="archive-prose pb-page text-start"
            style={{
              fontFamily,
              fontSize: prefs.size,
              lineHeight: prefs.lineHeight,
              color: 'inherit',
              textAlign: prefs.alignment === 'justify' ? 'justify' : 'start',
              fontVariantLigatures: prefs.ligatures ? 'common-ligatures' : 'none',
            }}
          >
            <ReactMarkdown
              components={{
                h1: () => null,
                h2: ({ node: _node, children, ...props }) => {
                  const text = extractText(children);
                  const hid = makeHeadingId(text);
                  const isHighlighted = isSpeaking && spokenParagraphIndex !== null && text.trim() === paragraphs[spokenParagraphIndex]?.replace(/[#*`_[\]()\-+]/g, ' ').trim();
                  return (
                    <h2
                      id={hid}
                      className={`reveal font-bold mt-10 mb-3 pb-2 border-b scroll-mt-24 transition-all duration-300 ${isHighlighted ? 'bg-primary/10 text-primary px-2 rounded-lg' : ''}`}
                      style={{
                        fontSize: prefs.size + 6,
                        borderColor: borderColor ?? 'hsl(var(--border) / 0.3)',
                      }}
                      {...props}
                    >
                      {highlightSearch(text, searchQuery)}
                    </h2>
                  );
                },
                h3: ({ node: _node, children, ...props }) => {
                  const text = extractText(children);
                  const hid = makeHeadingId(text);
                  const isHighlighted = isSpeaking && spokenParagraphIndex !== null && text.trim() === paragraphs[spokenParagraphIndex]?.replace(/[#*`_[\]()\-+]/g, ' ').trim();
                  return (
                    <h3
                      id={hid}
                      className={`reveal font-semibold mt-7 mb-2 scroll-mt-24 transition-all duration-300 ${isHighlighted ? 'bg-primary/10 text-primary px-2 rounded-lg' : ''}`}
                      style={{ fontSize: prefs.size + 3 }}
                      {...props}
                    >
                      {highlightSearch(text, searchQuery)}
                    </h3>
                  );
                },
                p: ({ node: _node, children, ...props }) => {
                  const text = extractText(children);
                  const isHighlighted = isSpeaking && spokenParagraphIndex !== null && text.trim() === paragraphs[spokenParagraphIndex]?.replace(/[#*`_[\]()\-+]/g, ' ').trim();
                  return (
                    <p
                      className={`reveal mb-4 transition-all duration-300 ${isHighlighted ? 'bg-primary/15 text-primary p-2 rounded-xl scale-[1.01] border-s-2 border-primary shadow-sm' : ''}`}
                      {...props}
                    >
                      {highlightSearch(text, searchQuery)}
                    </p>
                  );
                },
                ul: ({ node: _node, ...props }) => (
                  <ul className="reveal list-disc pe-6 mb-4 space-y-1" {...props} />
                ),
                ol: ({ node: _node, ...props }) => (
                  <ol className="reveal list-decimal pe-6 mb-4 space-y-1" {...props} />
                ),
                blockquote: ({ node: _node, children, ...props }) => {
                  const text = extractText(children);
                  return (
                    <blockquote
                      className="reveal pe-3 my-4 italic"
                      style={{
                        borderRight: `3px solid ${accentColor ?? 'hsl(var(--primary) / 0.5)'}`,
                        color: mutedColor ?? 'hsl(var(--muted-foreground))',
                      }}
                      {...props}
                    >
                      {highlightSearch(text, searchQuery)}
                    </blockquote>
                  );
                },
                code: ({ node: _node, ...props }) => (
                  <code
                    className="px-1 py-0.5 rounded text-meta"
                    style={{ background: isThemed ? 'rgba(127,127,127,0.2)' : 'hsl(var(--muted))' }}
                    {...props}
                  />
                ),
                hr: () => (
                  <hr
                    className="reveal my-8"
                    style={{ borderColor: borderColor ?? 'hsl(var(--border) / 0.4)' }}
                  />
                ),
                a: ({ node: _node, ...props }) => (
                  <a
                    {...props}
                    className="underline underline-offset-2"
                    style={{ color: accentColor ?? 'hsl(var(--primary))' }}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
              }}
            >
              {doc.content}
            </ReactMarkdown>
            {prefs.cinematic && (
              <div className="end-ornament reveal" aria-hidden="true">
                <span />
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
