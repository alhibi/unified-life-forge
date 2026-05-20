import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ScrollText, Quote, X, Filter, History, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import SearchBar from '@/components/diwan/library/SearchBar';
import EraPills from '@/components/diwan/library/EraPills';
import PoemCard from '@/components/diwan/library/PoemCard';
import FallbackBadge from '@/components/diwan/library/FallbackBadge';
import {
  useDiwanEras,
  useDiwanSearchPoems,
  useDiwanSearchVerses,
} from '@/lib/diwan/hooks';
import { KNOWN_METERS, KNOWN_KINDS, RHYME_LETTERS } from '@/lib/diwan/constants';
import type { DiwanPoemSearchResult, DiwanVerseSearchResult } from '@/lib/diwan/types';

type Mode = 'poems' | 'verses';

const PAGE = 30;

/**
 * البحث المتقدم في المكتبة — وضعان:
 *   - قصائد: q + era + meter + rhyme + kind
 *   - أبيات: q + era (للبحث عن بيت سمعته)
 */
export default function LibrarySearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [mode, setMode]   = useState<Mode>((params.get('mode') as Mode) ?? 'poems');
  const [q, setQ]         = useState<string>(params.get('q') ?? '');
  const [era, setEra]     = useState<string | null>(params.get('era'));
  const [meter, setMeter] = useState<string | null>(params.get('meter'));
  const [rhyme, setRhyme] = useState<string | null>(params.get('rhyme'));
  const [kind, setKind]   = useState<string | null>(params.get('kind'));
  const [page, setPage]   = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const eras = useDiwanEras();

  // ─── سجل البحث المحلي (آخر 8) ──────────────────────────────────────
  const HIST_KEY = 'diwan:search:history';
  const [history, setHistory] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]'); } catch { return []; }
  });
  React.useEffect(() => {
    const term = q.trim();
    if (!term || term.length < 2) return;
    const t = setTimeout(() => {
      setHistory(prev => {
        const next = [term, ...prev.filter(x => x !== term)].slice(0, 8);
        try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [q]);
  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HIST_KEY); } catch { /* ignore */ }
  };

  // sync URL with state (تصفير الصفحة يتم في effect منفصل أعلاه)
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (mode !== 'poems') next.set('mode', mode);
    if (q)     next.set('q', q);
    if (era)   next.set('era', era);
    if (meter) next.set('meter', meter);
    if (rhyme) next.set('rhyme', rhyme);
    if (kind)  next.set('kind', kind);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, q, era, meter, rhyme, kind]);

  const poemsQuery = useDiwanSearchPoems({
    q: q || null, era, meter, rhyme, kind, page, pageSize: PAGE,
  });
  const versesQuery = useDiwanSearchVerses({
    q: q ?? '', era, page, pageSize: PAGE,
  });

  // قوائم مُجمَّعة عبر الصفحات (نفس نمط LibraryPoets) — قبل هذا الإصلاح
  // كانت "تحميل المزيد" تستبدل الصفحة الحالية فيرى المستخدم 30 نتيجة
  // كحدّ أقصى رغم وجود المزيد.
  const [poemItems,  setPoemItems]  = useState<DiwanPoemSearchResult[]>([]);
  const [verseItems, setVerseItems] = useState<DiwanVerseSearchResult[]>([]);
  const [reachedEndPoems,  setReachedEndPoems]  = useState(false);
  const [reachedEndVerses, setReachedEndVerses] = useState(false);

  // إعادة تعيين عند تبدّل أيّ مدخل بحث
  React.useEffect(() => {
    setPage(0);
    setPoemItems([]);
    setVerseItems([]);
    setReachedEndPoems(false);
    setReachedEndVerses(false);
  }, [mode, q, era, meter, rhyme, kind]);

  // دمج صفحة poems الجديدة مع المُجمَّع
  React.useEffect(() => {
    if (mode !== 'poems') return;
    const data = poemsQuery.data;
    if (!data) return;
    setPoemItems(prev => {
      if (page === 0) return data;
      const seen = new Set(prev.map(p => p.slug));
      const merged = [...prev];
      for (const p of data) if (!seen.has(p.slug)) merged.push(p);
      return merged;
    });
    if (data.length < PAGE) setReachedEndPoems(true);
  }, [poemsQuery.data, page, mode]);

  // دمج صفحة verses الجديدة مع المُجمَّع
  React.useEffect(() => {
    if (mode !== 'verses') return;
    const data = versesQuery.data;
    if (!data) return;
    setVerseItems(prev => {
      if (page === 0) return data;
      const seenKey = (v: DiwanVerseSearchResult) => `${v.poem_slug}-${v.position}`;
      const seen = new Set(prev.map(seenKey));
      const merged = [...prev];
      for (const v of data) if (!seen.has(seenKey(v))) merged.push(v);
      return merged;
    });
    if (data.length < PAGE) setReachedEndVerses(true);
  }, [versesQuery.data, page, mode]);

  const poems  = poemItems;
  const verses = verseItems;
  const isFetching = mode === 'poems' ? poemsQuery.isFetching : versesQuery.isFetching;
  const reachedEnd = mode === 'poems' ? reachedEndPoems : reachedEndVerses;
  const hasMore = !reachedEnd && (mode === 'poems' ? poems.length > 0 : verses.length > 0);

  const activeFilters = useMemo(() => {
    const f = [era, meter, rhyme, kind].filter(Boolean);
    return f.length;
  }, [era, meter, rhyme, kind]);

  const resetFilters = () => {
    setEra(null); setMeter(null); setRhyme(null); setKind(null);
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title="البحث المتقدّم — المكتبة الكبرى"
        description="ابحث في ملايين الأبيات وعشرات الآلاف من القصائد بمعايير مرنة."
        path="/diwan/library/search"
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <BackButton onClick={() => navigate('/diwan')} />
          <div className="flex-1">
            <h1 className="text-[20px] font-bold tracking-tight text-foreground flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              البحث المتقدّم
            </h1>
            <div className="mt-0.5">
              <FallbackBadge />
            </div>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-2 mb-3 p-1 rounded-xl bg-muted/40 border border-border/30">
          <ModeBtn active={mode === 'poems'}  onClick={() => setMode('poems')}  icon={<ScrollText className="w-3.5 h-3.5" />} label="قصائد" />
          <ModeBtn active={mode === 'verses'} onClick={() => setMode('verses')} icon={<Quote       className="w-3.5 h-3.5" />} label="أبيات" />
        </div>

        {/* Search */}
        <div className="mb-3">
          <SearchBar
            value={q}
            placeholder={mode === 'poems' ? 'ابحث في القصائد…' : 'ابحث عن بيت سمعته…'}
            onChange={setQ}
            autoFocus
          />
        </div>

        {/* Filters bar */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition ${
              showFilters || activeFilters > 0
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted/50 text-muted-foreground border border-transparent'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            فلاتر
            {activeFilters > 0 && (
              <span className="bg-primary text-background text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          {activeFilters > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
              إعادة ضبط
            </button>
          )}
        </div>

        {/* Era pills always visible (most-used filter) */}
        {eras.data && (
          <div className="mb-3">
            <EraPills eras={eras.data} selected={era} onSelect={setEra} />
          </div>
        )}

        {/* Recent searches */}
        {history.length > 0 && !q && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <History className="w-3 h-3" />
                عمليات بحث سابقة
              </p>
              <button
                onClick={clearHistory}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                مسح
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => setQ(h)}
                  className="px-2.5 py-1 rounded-full bg-muted/50 text-[11px] text-foreground hover:bg-muted transition"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced filters */}
        <AnimatePresence>
          {showFilters && mode === 'poems' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3 mb-4">
                <FilterRow label="البحر">
                  <div className="flex flex-wrap gap-1.5">
                    {KNOWN_METERS.map(m => (
                      <Chip key={m} active={meter === m} onClick={() => setMeter(meter === m ? null : m)}>
                        {m}
                      </Chip>
                    ))}
                  </div>
                </FilterRow>
                <FilterRow label="الغرض">
                  <div className="flex flex-wrap gap-1.5">
                    {KNOWN_KINDS.map(k => (
                      <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)}>
                        {k}
                      </Chip>
                    ))}
                  </div>
                </FilterRow>
                <FilterRow label="حرف الروي">
                  <div className="flex flex-wrap gap-1.5">
                    {RHYME_LETTERS.map(r => (
                      <Chip key={r} active={rhyme === r} onClick={() => setRhyme(rhyme === r ? null : r)}>
                        <span style={{ fontFamily: "'Amiri', serif" }}>{r}</span>
                      </Chip>
                    ))}
                  </div>
                </FilterRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {!q && activeFilters === 0 ? (
          <EmptyHint mode={mode} />
        ) : isFetching && page === 0 ? (
          <div className="space-y-2.5">
            {[0,1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : mode === 'poems' ? (
          poems.length === 0 ? (
            <NoResults />
          ) : (
            <>
              <ResultsCount total={poems.length} page={page} />
              <div className="space-y-2.5">
                {poems.map((p, i) => (
                  <PoemCard key={p.slug} poem={p} showPoet index={i} />
                ))}
                {hasMore && <LoadMore loading={isFetching} onClick={() => setPage(p => p + 1)} />}
              </div>
            </>
          )
        ) : (
          verses.length === 0 ? (
            <NoResults />
          ) : (
            <>
              <ResultsCount total={verses.length} page={page} />
              <div className="space-y-2">
                {verses.map((v, i) => (
                  <VerseRow key={`${v.poem_slug}-${v.position}`} verse={v} index={i} highlight={q} />
                ))}
                {hasMore && <LoadMore loading={isFetching} onClick={() => setPage(p => p + 1)} />}
              </div>
            </>
          )
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────
function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
        active
          ? 'bg-card text-foreground shadow-sm border border-border/30'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
        active
          ? 'bg-primary text-background'
          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyHint({ mode }: { mode: Mode }) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        {mode === 'poems'
          ? <ScrollText className="w-6 h-6 text-primary" />
          : <Quote className="w-6 h-6 text-primary" />}
      </div>
      <p className="text-[14px] font-semibold text-foreground">
        {mode === 'poems' ? 'ابدأ البحث في القصائد' : 'ابحث عن بيت سمعته'}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
        {mode === 'poems'
          ? 'أدخل كلمة أو موضوعًا، أو استخدم الفلاتر لتصفية القصائد بالعصر والبحر والقافية.'
          : 'اكتب أيّ جزء من البيت، يبحث في ملايين الأبيات ويُظهر القصيدة وصاحبها.'}
      </p>
    </div>
  );
}

function NoResults() {
  return (
    <div className="text-center py-10">
      <p className="text-muted-foreground text-[13px]">لا نتائج. جرّب صياغة أخرى أو خفّف الفلاتر.</p>
    </div>
  );
}

function ResultsCount({ total, page }: { total: number; page: number }) {
  return (
    <p className="text-[10px] text-muted-foreground mb-2">
      {total} نتيجة{page > 0 ? ` · صفحة ${page + 1}` : ''}
    </p>
  );
}

function LoadMore({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full mt-2 py-3 rounded-2xl bg-card border border-border/40 text-[12px] font-semibold text-primary hover:bg-primary/5 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
    >
      {loading
        ? 'يحمّل…'
        : <>تحميل المزيد <ChevronDown className="w-3.5 h-3.5" /></>}
    </button>
  );
}

function VerseRow({
  verse,
  index,
  highlight,
}: {
  verse: import('@/lib/diwan/types').DiwanVerseSearchResult;
  index: number;
  highlight: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.03 } }}
    >
      <Link
        to={`/diwan/library/poem/${verse.poem_slug}`}
        className="block rounded-2xl bg-card border border-border/40 p-3.5 active:scale-[0.99] transition"
      >
        <div
          className="grid grid-cols-2 gap-3 mb-2"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          <p className="text-[14px] text-foreground leading-[1.9] text-end">
            {renderHighlighted(verse.hemistich1, highlight)}
          </p>
          <p className="text-[14px] text-foreground leading-[1.9] text-start">
            {renderHighlighted(verse.hemistich2 ?? '', highlight)}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          <span className="text-primary font-semibold">{verse.poet_name}</span>
          {' — '}
          <span>{verse.poem_title}</span>
        </p>
      </Link>
    </motion.div>
  );
}

/**
 * تظليل المطابقات بدون مكتبة وبدون dangerouslySetInnerHTML — نُقسم
 * النصّ حول الـ matches ونُعيد مصفوفة من React elements (نص + <mark>).
 *
 * مزايا مقابل النسخة السابقة (dangerouslySetInnerHTML + escapeHtml):
 *   • لا حاجة لـ HTML escaping يدوي (React يفعل ذلك تلقائياً).
 *   • diff طبيعي في React — المتصفح لا يُعيد بناء innerHTML بالكامل.
 *   • أكثر أماناً: لا يوجد سبيل أن ينفذ HTML من بيانات Supabase.
 *
 * المطابقة case-insensitive لتسهيل البحث (المستخدم قد يكتب لاتينياً
 * مع عربي، والنص قد يحوي أحرفاً بحالات مختلفة في القصائد الحديثة).
 */
function renderHighlighted(text: string, q: string): React.ReactNode {
  if (!q || !text) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let re: RegExp;
  try {
    re = new RegExp(escaped, 'gi');
  } catch {
    return text;
  }
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    parts.push(
      <mark
        key={key++}
        className="bg-amber-200/60 dark:bg-amber-900/40 text-foreground rounded px-0.5"
      >
        {m[0]}
      </mark>,
    );
    lastIndex = m.index + m[0].length;
    // حماية من loop لا نهائي على match فارغ (regex مرضيّة بسلسلة فارغة)
    if (m[0].length === 0) re.lastIndex++;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
