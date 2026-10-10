import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EraPills from '@/features/diwan/components/library/EraPills';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import PoemCard from '@/features/diwan/components/library/PoemCard';
import SearchBar from '@/features/diwan/components/library/SearchBar';
import { KNOWN_KINDS, KNOWN_METERS, RHYME_LETTERS } from '@/features/diwan/lib/constants';
import {
  useDiwanEras,
  useDiwanSearchPoems,
  useDiwanSearchVerses,
} from '@/features/diwan/lib/hooks';
import type { DiwanPoemSearchResult, DiwanVerseSearchResult } from '@/features/diwan/lib/types';
import { ChevronDown, Filter, History, Quote, ScrollText, Search, X } from '@/lib/icons';

type Mode = 'poems' | 'verses';

const PAGE = 30;

/** دمج صفحات الاستعلام في قائمة واحدة، مع منع التكرار (نفس دلالة الدمج اليدوي السابق). */
function flattenPages<T>(pages: T[][] | undefined, keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const page of pages ?? []) {
    for (const item of page) {
      const key = keyOf(item);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
  }
  return out;
}

/**
 * البحث المتقدّم في المكتبة — وضعان:
 *   - قصائد: q + era + meter + rhyme + kind
 *   - أبيات: q + era (للبحث عن بيت سمعته)
 *
 * التبديل بين الوضعين صار <Tabs> القياسي، والنتائج قائمة <AppList>
 * واحدة لكل وضع، والحالات الفارغة <StateView>. التراكم عبر الصفحات
 * من useInfiniteQuery بلا حالة تجميع محلية.
 */
export default function LibrarySearchPage() {
  const [params, setParams] = useSearchParams();

  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) ?? 'poems');
  const [q, setQ] = useState<string>(params.get('q') ?? '');
  const [era, setEra] = useState<string | null>(params.get('era'));
  const [meter, setMeter] = useState<string | null>(params.get('meter'));
  const [rhyme, setRhyme] = useState<string | null>(params.get('rhyme'));
  const [kind, setKind] = useState<string | null>(params.get('kind'));
  const [showFilters, setShowFilters] = useState(false);

  const eras = useDiwanEras();

  // ─── سجل البحث المحلي (آخر 8) ──────────────────────────────────────
  const HIST_KEY = 'diwan:search:history';
  const [history, setHistory] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  React.useEffect(() => {
    const term = q.trim();
    if (!term || term.length < 2) return;
    const t = setTimeout(() => {
      setHistory((prev) => {
        const next = [term, ...prev.filter((x) => x !== term)].slice(0, 8);
        try {
          localStorage.setItem(HIST_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [q]);
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HIST_KEY);
    } catch {
      /* ignore */
    }
  };

  // sync URL with state
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (mode !== 'poems') next.set('mode', mode);
    if (q) next.set('q', q);
    if (era) next.set('era', era);
    if (meter) next.set('meter', meter);
    if (rhyme) next.set('rhyme', rhyme);
    if (kind) next.set('kind', kind);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, q, era, meter, rhyme, kind]);

  const poemsQuery = useDiwanSearchPoems({
    q: q || null,
    era,
    meter,
    rhyme,
    kind,
    pageSize: PAGE,
  });
  const versesQuery = useDiwanSearchVerses({
    q: q ?? '',
    era,
    pageSize: PAGE,
  });

  // قوائم مُجمَّعة عبر الصفحات (نفس نمط LibraryPoets)
  const poems = useMemo(
    () => flattenPages<DiwanPoemSearchResult>(poemsQuery.data?.pages, (p) => p.slug),
    [poemsQuery.data],
  );
  const verses = useMemo(
    () =>
      flattenPages<DiwanVerseSearchResult>(
        versesQuery.data?.pages,
        (v) => `${v.poem_slug}-${v.position}`,
      ),
    [versesQuery.data],
  );

  const isFetching = mode === 'poems' ? poemsQuery.isFetching : versesQuery.isFetching;
  const isLoading = mode === 'poems' ? poemsQuery.isLoading : versesQuery.isLoading;
  const hasMore =
    mode === 'poems'
      ? poemsQuery.hasNextPage === true && poems.length > 0
      : versesQuery.hasNextPage === true && verses.length > 0;
  const poemsPage = Math.max(0, (poemsQuery.data?.pages.length ?? 1) - 1);
  const versesPage = Math.max(0, (versesQuery.data?.pages.length ?? 1) - 1);

  const activeFilters = useMemo(() => {
    const f = [era, meter, rhyme, kind].filter(Boolean);
    return f.length;
  }, [era, meter, rhyme, kind]);

  const resetFilters = () => {
    setEra(null);
    setMeter(null);
    setRhyme(null);
    setKind(null);
  };

  return (
    <PageShell>
      <SEO
        title="البحث المتقدّم — المكتبة الكبرى"
        description="ابحث في ملايين الأبيات وعشرات الآلاف من القصائد بمعايير مرنة."
        path="/diwan/library/search"
      />

      <PageHeader
        title="البحث المتقدّم"
        icon={<Search className="h-5 w-5 text-primary" aria-hidden />}
        right={<FallbackBadge />}
        backFallback="/mihrab"
      />

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        {/* Mode switcher */}
        <TabsList>
          <TabsTrigger value="poems">
            <span className="flex items-center gap-2">
              <ScrollText className="h-3.5 w-3.5" aria-hidden />
              قصائد
            </span>
          </TabsTrigger>
          <TabsTrigger value="verses">
            <span className="flex items-center gap-2">
              <Quote className="h-3.5 w-3.5" aria-hidden />
              أبيات
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="mt-3">
          <SearchBar
            value={q}
            placeholder={mode === 'poems' ? 'ابحث في القصائد…' : 'ابحث عن بيت سمعته…'}
            onChange={setQ}
            autoFocus
          />
        </div>

        {/* Filters bar */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant={showFilters || activeFilters > 0 ? 'default' : 'secondary'}
            size="sm"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((s) => !s)}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            فلاتر
            {activeFilters > 0 && (
              <span className="rounded-full bg-current/20 px-1.5 text-micro font-bold tabular-nums">
                {activeFilters}
              </span>
            )}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-3 w-3" aria-hidden />
              إعادة ضبط
            </Button>
          )}
        </div>

        {/* Era pills always visible (most-used filter) */}
        {eras.data && (
          <div className="mt-3">
            <EraPills eras={eras.data} selected={era} onSelect={setEra} />
          </div>
        )}

        {/* Recent searches */}
        {history.length > 0 && !q && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="flex items-center gap-1 text-micro font-bold text-muted-foreground">
                <History className="h-3 w-3" aria-hidden />
                عمليات بحث سابقة
              </p>
              <button
                type="button"
                onClick={clearHistory}
                className="text-micro text-muted-foreground transition-colors hover:text-foreground"
              >
                مسح
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setQ(h)}
                  className="rounded-full bg-muted/60 px-2.5 py-1 text-micro text-foreground transition-colors hover:bg-interactive-hover"
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
              <AppCard flat className="mt-3 space-y-3 p-4">
                <FilterRow label="البحر">
                  <div className="flex flex-wrap gap-1.5">
                    {KNOWN_METERS.map((m) => (
                      <Chip
                        key={m}
                        active={meter === m}
                        onClick={() => setMeter(meter === m ? null : m)}
                      >
                        {m}
                      </Chip>
                    ))}
                  </div>
                </FilterRow>
                <FilterRow label="الغرض">
                  <div className="flex flex-wrap gap-1.5">
                    {KNOWN_KINDS.map((k) => (
                      <Chip
                        key={k}
                        active={kind === k}
                        onClick={() => setKind(kind === k ? null : k)}
                      >
                        {k}
                      </Chip>
                    ))}
                  </div>
                </FilterRow>
                <FilterRow label="حرف الروي">
                  <div className="flex flex-wrap gap-1.5">
                    {RHYME_LETTERS.map((r) => (
                      <Chip
                        key={r}
                        active={rhyme === r}
                        onClick={() => setRhyme(rhyme === r ? null : r)}
                      >
                        <span style={{ fontFamily: 'var(--font-amiri)' }}>{r}</span>
                      </Chip>
                    ))}
                  </div>
                </FilterRow>
              </AppCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {!q && activeFilters === 0 ? (
          <EmptyHint mode={mode} />
        ) : (
          <>
            <TabsContent value="poems" className="mt-4">
              {isLoading ? (
                <div className="space-y-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-20 rounded-lg" />
                  ))}
                </div>
              ) : poems.length === 0 ? (
                <NoResults />
              ) : (
                <>
                  <ResultsCount total={poems.length} page={poemsPage} />
                  <AppList>
                    {poems.map((p) => (
                      <PoemCard key={p.slug} poem={p} showPoet />
                    ))}
                  </AppList>
                  {hasMore && (
                    <LoadMore
                      loading={isFetching}
                      onClick={() => void poemsQuery.fetchNextPage()}
                    />
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="verses" className="mt-4">
              {isLoading ? (
                <div className="space-y-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-20 rounded-lg" />
                  ))}
                </div>
              ) : verses.length === 0 ? (
                <NoResults />
              ) : (
                <>
                  <ResultsCount total={verses.length} page={versesPage} />
                  <AppList>
                    {verses.map((v) => (
                      <VerseRow key={`${v.poem_slug}-${v.position}`} verse={v} highlight={q} />
                    ))}
                  </AppList>
                  {hasMore && (
                    <LoadMore
                      loading={isFetching}
                      onClick={() => void versesQuery.fetchNextPage()}
                    />
                  )}
                </>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageShell>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-micro font-bold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-micro font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/60 text-muted-foreground hover:bg-interactive-hover hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyHint({ mode }: { mode: Mode }) {
  return (
    <div className="mt-4">
      <StateView
        kind="empty"
        title={mode === 'poems' ? 'ابدأ البحث في القصائد' : 'ابحث عن بيت سمعته'}
        body={
          mode === 'poems'
            ? 'أدخل كلمة أو موضوعاً، أو استخدم الفلاتر لتصفية القصائد بالعصر والبحر والقافية.'
            : 'اكتب أيّ جزء من البيت، يبحث في ملايين الأبيات ويُظهر القصيدة وصاحبها.'
        }
      />
    </div>
  );
}

function NoResults() {
  return (
    <StateView
      compact
      kind="search"
      title="لا نتائج"
      body="لم نطابق ما بحثت عنه. جرّب صياغة أخرى أو خفّف الفلاتر."
    />
  );
}

function ResultsCount({ total, page }: { total: number; page: number }) {
  return (
    <p className="mb-2 text-micro tabular-nums text-muted-foreground">
      {total} نتيجة{page > 0 ? ` · صفحة ${page + 1}` : ''}
    </p>
  );
}

function LoadMore({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button variant="secondary" className="mt-2 w-full" disabled={loading} onClick={onClick}>
      {loading ? (
        'يحمّل…'
      ) : (
        <>
          تحميل المزيد <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </>
      )}
    </Button>
  );
}

function VerseRow({
  verse,
  highlight,
}: {
  verse: DiwanVerseSearchResult;
  highlight: string;
}) {
  const navigate = useNavigate();
  return (
    <AppRow
      onClick={() => navigate(`/diwan/library/poem/${verse.poem_slug}`)}
      chevron
      leading={<Quote className="h-5 w-5 text-primary" aria-hidden />}
      title={<span className="font-amiri">{renderHighlighted(verse.hemistich1, highlight)}</span>}
      subtitle={
        <>
          {verse.hemistich2 && (
            <span className="block truncate font-amiri">
              {renderHighlighted(verse.hemistich2, highlight)}
            </span>
          )}
          <span className="block truncate">
            <span className="font-semibold text-primary">{verse.poet_name}</span>
            {' — '}
            <span>{verse.poem_title}</span>
          </span>
        </>
      }
    />
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
      <mark key={key++} className="rounded bg-signal/60 px-0.5 text-foreground dark:bg-signal/40">
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
