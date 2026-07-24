import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ScrollText, Quote, X, Filter, History, ChevronDown } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import SearchBar from '@/features/diwan/components/library/SearchBar';
import EraPills from '@/features/diwan/components/library/EraPills';
import PoemCard from '@/features/diwan/components/library/PoemCard';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import {
  useDiwanEras,
  useDiwanSearchPoems,
  useDiwanSearchVerses,
} from '@/features/diwan/lib/hooks';
import { KNOWN_METERS, KNOWN_KINDS, RHYME_LETTERS } from '@/features/diwan/lib/constants';
import type { DiwanPoemSearchResult, DiwanVerseSearchResult } from '@/features/diwan/lib/types';

type Mode = 'poems' | 'verses';

const PAGE = 30;

/**
 * صفحة البحث المتقدم في المكتبة — مصممة بالكامل بنمط "المخطوطة" (Manuscript).
 * تدعم البحث الدقيق في ملايين الأبيات وعشرات الآلاف من القصائد بجمالية عتيقة متجانسة.
 */
export default function LibrarySearchPage() {
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

  // sync URL with state
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (mode !== 'poems') next.set('mode', mode);
    if (q)     next.set('q', q);
    if (era)   next.set('era', era);
    if (meter) next.set('meter', meter);
    if (rhyme) next.set('rhyme', rhyme);
    if (kind)  next.set('kind', kind);
    setParams(next, { replace: true });
  }, [mode, q, era, meter, rhyme, kind]);

  const poemsQuery = useDiwanSearchPoems({
    q: q || null, era, meter, rhyme, kind, page, pageSize: PAGE,
  });
  const versesQuery = useDiwanSearchVerses({
    q: q ?? '', era, page, pageSize: PAGE,
  });

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
    <div className="min-h-screen bg-[#16130F] text-[#F2E9D8] pb-28 px-5 pt-14 font-tajawal selection:bg-[var(--wax-soft2)] selection:text-[#F2E9D8]">
      <SEO
        title="البحث المتقدّم — المكتبة الكبرى"
        description="ابحث في ملايين الأبيات وعشرات الآلاف من القصائد بمعايير مرنة."
        path="/diwan/library/search"
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="mt-1 shrink-0">
            <BackButton fallback="/mihrab" className="w-10 h-10 rounded-full border border-[var(--hairline-strong)] bg-[#1D1811] flex items-center justify-center text-[#B8AA8E] hover:text-[#F2E9D8] hover:border-[#B8AA8E] active:scale-95 transition-all" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold tracking-[0.1em] text-[var(--wax)] uppercase mb-1">
              محراب · الأدب
            </p>
            <h1 className="text-[26px] font-bold tracking-tight text-[#F2E9D8] leading-tight font-amiri flex items-center gap-2">
              <Search className="w-6 h-6 text-[var(--wax)] shrink-0" />
              البحث المتقدّم
            </h1>
            <div className="mt-1">
              <FallbackBadge />
            </div>
          </div>
        </div>

        {/* Mode switcher (Tab classic format) */}
        <div className="flex items-center gap-2 mb-4 p-1 rounded-[12px] bg-[#1D1811] border border-[var(--hairline-strong)] select-none">
          <ModeBtn active={mode === 'poems'}  onClick={() => setMode('poems')}  icon={<ScrollText className="w-3.5 h-3.5" />} label="دواوين وقصائد" />
          <ModeBtn active={mode === 'verses'} onClick={() => setMode('verses')} icon={<Quote       className="w-3.5 h-3.5" />} label="أبيات وفروع" />
        </div>

        {/* Search */}
        <div className="mb-4">
          <SearchBar
            value={q}
            placeholder={mode === 'poems' ? 'ابحث في كلمات وعناوين القصائد…' : 'ابحث عن عجز أو صدر بيت شعر سمعته…'}
            onChange={setQ}
            autoFocus
          />
        </div>

        {/* Filters bar */}
        <div className="flex items-center gap-4 mb-4 select-none">
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all border ${
              showFilters || activeFilters > 0
                ? 'bg-[var(--wax-soft)] text-[var(--wax)] border-[var(--wax-soft2)]'
                : 'bg-transparent text-[#7E7259] border-[var(--hairline-strong)] hover:text-[#B8AA8E]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>تصنيف وفلاتر</span>
            {activeFilters > 0 && (
              <span className="bg-[var(--wax)] text-[#F2E9D8] text-[9.5px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center font-sans">
                {activeFilters}
              </span>
            )}
          </button>
          {activeFilters > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-[11px] text-[#7E7259] hover:text-[#B8AA8E] transition-colors"
            >
              <X className="w-3 h-3" />
              <span>إلغاء التصنيف</span>
            </button>
          )}
        </div>

        {/* Era pills always visible */}
        {eras.data && (
          <div className="mb-4">
            <EraPills eras={eras.data} selected={era} onSelect={setEra} />
          </div>
        )}

        {/* Recent searches */}
        {history.length > 0 && !q && (
          <div className="mb-5 select-none">
            <div className="flex items-center justify-between mb-2">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#7E7259] uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-[var(--wax)]" />
                رقوق سابقة بحثت عنها
              </p>
              <button
                onClick={clearHistory}
                className="text-[10px] text-[#7E7259] hover:text-[#B8AA8E] transition-colors"
              >
                مسح السجل
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => setQ(h)}
                  className="px-3 py-1.5 rounded-full bg-[rgba(242,233,216,0.03)] border border-[var(--hairline)] text-[12px] text-[#B8AA8E] hover:text-[#F2E9D8] hover:bg-[rgba(242,233,216,0.06)] transition-all font-tajawal"
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
              <div className="rounded-[12px] bg-[#1D1811] border border-[var(--hairline-strong)] p-5 space-y-4 mb-5 select-none">
                <FilterRow label="البحر العروضي">
                  <div className="flex flex-wrap gap-1.5">
                    {KNOWN_METERS.map(m => (
                      <Chip key={m} active={meter === m} onClick={() => setMeter(meter === m ? null : m)}>
                        {m}
                      </Chip>
                    ))}
                  </div>
                </FilterRow>
                <FilterRow label="غرض المقطوعة">
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
                        <span style={{ fontFamily: "'Amiri', serif" }} className="text-[14px]">{r}</span>
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
          <div className="space-y-4 pt-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="py-4 border-b border-[var(--hairline)] animate-pulse">
                <div className="h-4 bg-[rgba(242,233,216,0.08)] rounded w-1/4 mb-2" />
                <div className="h-3 bg-[rgba(242,233,216,0.05)] rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : mode === 'poems' ? (
          poems.length === 0 ? (
            <NoResults />
          ) : (
            <>
              <ResultsCount total={poems.length} page={page} />
              <div className="flex flex-col">
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
              <div className="flex flex-col gap-1">
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
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[8px] text-[12.5px] font-bold transition-all ${
        active
          ? 'bg-[var(--ink-card)] text-[#F2E9D8] border border-[var(--hairline-strong)]'
          : 'text-[#7E7259] hover:text-[#B8AA8E]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-[#7E7259] mb-2 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-[5px] text-[11.5px] font-bold transition-all ${
        active
          ? 'bg-[var(--wax-soft)] text-[var(--wax)] border border-[var(--wax-soft2)]'
          : 'bg-transparent text-[#B8AA8E] border border-[var(--hairline-strong)] hover:text-[#F2E9D8] hover:border-[#B8AA8E]'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyHint({ mode }: { mode: Mode }) {
  return (
    <div className="text-center py-16 px-6 flex flex-col items-center justify-center">
      <span className="font-amiri text-[28px] text-[var(--wax)] mb-4 animate-pulse select-none">
        ✦
      </span>
      <p className="text-[15px] font-bold text-[#F2E9D8]">
        {mode === 'poems' ? 'البحث الأثري في القصائد والبحور' : 'البحث عن فرائد الأبيات'}
      </p>
      <p className="text-[12.5px] text-[#B8AA8E] mt-2 max-w-xs mx-auto leading-relaxed font-tajawal">
        {mode === 'poems'
          ? 'أدخل كلمة مفتاحية، أو عين أحد الفلاتر لتصفية القصائد بالعصور العتيقة أو القافية وبحور الشعر.'
          : 'اكتب شطراً أو كلمة من بيت حفظته وسيقوم الفاحص بالبحث في ملايين الأبيات وتحديد القصيدة وقائلها.'}
      </p>
    </div>
  );
}

function NoResults() {
  return (
    <div className="text-center py-16">
      <p className="text-[#7E7259] text-[13.5px] font-tajawal">لم نجد رقعة مطابقة لبحثك. جرّب تخفيف فلاتر التصفية أو تغيير الكلمات.</p>
    </div>
  );
}

function ResultsCount({ total, page }: { total: number; page: number }) {
  return (
    <p className="text-[11px] text-[#7E7259] mb-3 select-none font-tajawal">
      وجدنا {total} رقعة مطابقة {page > 0 ? ` · الصفحة ${page + 1}` : ''}
    </p>
  );
}

function LoadMore({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full mt-4 py-3 rounded-[12px] bg-[#1D1811] border border-[var(--hairline-strong)] text-[12.5px] font-semibold text-[#B8AA8E] hover:text-[#F2E9D8] hover:border-[#B8AA8E] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? (
        'جاري فض المزيد من الأختام…'
      ) : (
        <>إظهار المزيد من رقوق البحث <ChevronDown className="w-3.5 h-3.5 text-[var(--wax)]" /></>
      )}
    </button>
  );
}

function VerseRow({
  verse,
  index,
  highlight,
}: {
  verse: import('@/features/diwan/lib/types').DiwanVerseSearchResult;
  index: number;
  highlight: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.03 } }}
      className="border-b border-[var(--hairline)] last:border-b-0"
    >
      <Link
        to={`/diwan/library/poem/${verse.poem_slug}`}
        className="block py-4 px-1 hover:bg-[rgba(242,233,216,0.015)] active:scale-[0.99] transition-all select-none rounded-[8px]"
      >
        <div
          className="grid grid-cols-2 gap-4 mb-2 items-center"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          <p className="text-[15px] text-[#F2E9D8] leading-[1.9] text-right">
            {renderHighlighted(verse.hemistich1, highlight)}
          </p>
          <p className="text-[15px] text-[#F2E9D8] leading-[1.9] text-right pr-4 border-r border-dashed border-[var(--hairline)]">
            {renderHighlighted(verse.hemistich2 ?? '', highlight)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#7E7259] font-tajawal pr-1 mt-1.5">
          <span className="text-[var(--wax)] shrink-0">◆</span>
          <span className="text-[#B8AA8E] font-bold">{verse.poet_name}</span>
          <span className="opacity-40">·</span>
          <span className="truncate">{verse.poem_title}</span>
        </div>
      </Link>
    </motion.div>
  );
}

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
        className="bg-[var(--wax-soft2)] text-[#F2E9D8] font-bold rounded px-0.5"
      >
        {m[0]}
      </mark>,
    );
    lastIndex = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
