/**
 * /tafsir — the Qur'an reader.
 *
 * The old page was a dashboard of scripture: every ayah sat inside its own
 * rounded card, the surah picker was a 114-button grid mixed with a stats bar,
 * a breadcrumb, a source dropdown and two search fields, and a failed network
 * fetch was silently rendered as "no ayahs match your search".
 *
 * This revision makes it a reading surface first:
 *   • Continuous ayah column — one measure (the shell's reading width), Amiri
 *     for the scripture, line-height 1.9, no per-ayah cards. The ayah number is
 *     an inline Arabic-Indic medallion that doubles as the tafsir affordance
 *     (44px hit area, keyboard reachable); the text itself stays selectable.
 *   • The tafsir opens inline under its ayah as a quiet surface-2 panel with
 *     its own toolbar, loading skeleton, real error state with retry, and an
 *     honest empty state. Bookmark/copy/prev-next are preserved unchanged.
 *   • The surah index opens as a sheet from the toolbar (the same searchable
 *     index /quran uses). The reader keeps the URL + localStorage contracts it
 *     already had: ?surah/&ayah/&tafsir, 'tafsir-state', 'tafsir-bookmarks'.
 *   • States are real: loading keeps the reading rhythm with skeleton lines;
 *     network failure is an error state with retry; a search with no match is
 *     a search state; no tafsir for an ayah is its own empty state.
 *
 * No business logic, data source or persistence key changed.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, AppRow, IconButton, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import SurahIndexList from '@/features/mihrab/components/SurahIndexList';
import { SURAH_INDEX, type SurahMeta } from '@/features/mihrab/data/surahIndex';
import { arabicDigits } from '@/features/mihrab/lib/arabicDigits';
import {
  Bookmark,
  BookmarkCheck,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Minus,
  Plus,
  Search,
  X,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

// ─── DATA ────────────────────────────────────────────────────────────────────

const TAFSIRS = [
  { id: 'ar.muyassar', name: 'التفسير الميسر' },
  { id: 'ar.jalalayn', name: 'تفسير الجلالين' },
  { id: 'ar.ibn-katheer', name: 'تفسير ابن كثير' },
  { id: 'ar.qurtubi', name: 'تفسير القرطبي' },
  { id: 'ar.tabari', name: 'تفسير الطبري' },
  { id: 'ar.baghawi', name: 'تفسير البغوي' },
  { id: 'ar.saddi', name: 'تفسير السعدي' },
  { id: 'ar.waseet', name: 'تفسير الوسيط' },
];

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
}

interface LastPosition {
  surah: number;
  ayah: number | null;
  tafsirId: string;
}

/** Reading sizes, relative to the root font size. 1.15 = ~18px. */
const AYAH_SIZES = [1.15, 1.3, 1.45, 1.6] as const;
const DEFAULT_SIZE_INDEX = 1;

// ─── PERSISTENCE (unchanged keys) ────────────────────────────────────────────

const STORAGE_KEY = 'tafsir-state';
function loadState(): LastPosition | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
function saveState(pos: LastPosition) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* quota or private mode */
  }
}

const BOOKMARKS_KEY = 'tafsir-bookmarks';
function loadBookmarks(): string[] {
  try {
    const s = localStorage.getItem(BOOKMARKS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
function saveBookmarks(b: string[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(b));
  } catch {
    /* quota or private mode */
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.reducedMotion === 'true'
  );
}

/** Amiri is the editorial face for scripture (X2); UI stays on the system font. */
const SCRIPTURE_STYLE: React.CSSProperties = {
  fontFamily: "'Amiri', 'Noto Sans Arabic', serif",
};

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function TafsirPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSurah = searchParams.get('surah');
  const urlAyah = searchParams.get('ayah');
  const urlTafsir = searchParams.get('tafsir');

  const savedPos = useMemo(() => loadState(), []);

  const initialSurah = useMemo(() => {
    if (urlSurah !== null) {
      const parsed = parseInt(urlSurah, 10);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed < SURAH_INDEX.length) return parsed;
    }
    return savedPos?.surah ?? null;
  }, [urlSurah, savedPos]);

  const initialAyah = useMemo(() => {
    if (urlAyah !== null) {
      const parsed = parseInt(urlAyah, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return savedPos?.ayah ?? null;
  }, [urlAyah, savedPos]);

  const initialTafsir = useMemo(() => {
    if (urlTafsir !== null) {
      const found = TAFSIRS.find((t) => t.id === urlTafsir);
      if (found) return found;
    }
    return TAFSIRS.find((t) => t.id === savedPos?.tafsirId) || TAFSIRS[0];
  }, [urlTafsir, savedPos]);

  // ── Reader state ──────────────────────────────────────────────────────────
  const [selectedSurah, setSelectedSurah] = useState<number | null>(initialSurah);
  const [ayahs, setAyahs] = useState<AyahData[]>([]);
  const [ayahStatus, setAyahStatus] = useState<'loading' | 'ready' | 'error'>('ready');
  const [ayahRetry, setAyahRetry] = useState(0);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(initialAyah);
  const [selectedTafsir, setSelectedTafsir] = useState(initialTafsir);
  const [tafsirText, setTafsirText] = useState('');
  const [tafsirStatus, setTafsirStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  const [tafsirRetry, setTafsirRetry] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(DEFAULT_SIZE_INDEX);
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks);
  const [copied, setCopied] = useState<string | null>(null);
  const [copiedTimer, setCopiedTimer] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [localAyahSearch, setLocalAyahSearch] = useState('');
  const [ayahSearch, setAyahSearch] = useState('');
  const tafsirRef = useRef<HTMLElement>(null);
  const scrollOnSelectRef = useRef(false);

  const ayahFontSize = AYAH_SIZES[sizeIndex];
  const surah: SurahMeta | null =
    selectedSurah === null ? null : (SURAH_INDEX[selectedSurah] ?? null);

  // ── Persist position + URL (same contract as before) ─────────────────────
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (selectedSurah !== null) {
      saveState({ surah: selectedSurah, ayah: selectedAyah, tafsirId: selectedTafsir.id });
      nextParams.set('surah', String(selectedSurah));
      if (selectedAyah !== null) nextParams.set('ayah', String(selectedAyah));
      else nextParams.delete('ayah');
      nextParams.set('tafsir', selectedTafsir.id);
    } else {
      nextParams.delete('surah');
      nextParams.delete('ayah');
      nextParams.delete('tafsir');
    }
    // Same guard as /mihrab: an identical write from inside an effect
    // re-renders and re-runs the effect, chasing itself forever.
    if (nextParams.toString() === searchParams.toString()) return;
    setSearchParams(nextParams, { replace: true });
  }, [selectedSurah, selectedAyah, selectedTafsir, searchParams, setSearchParams]);

  // ── Ayah search debounce ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => setAyahSearch(localAyahSearch), 300);
    return () => clearTimeout(handler);
  }, [localAyahSearch]);

  // ── Fetch the surah's ayahs ───────────────────────────────────────────────
  useEffect(() => {
    if (selectedSurah === null) {
      setAyahs([]);
      setAyahStatus('ready');
      return;
    }
    const controller = new AbortController();
    setAyahStatus('loading');
    setAyahs([]);

    fetch('https://api.alquran.cloud/v1/surah/' + String(selectedSurah + 1), {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.code === 200 && Array.isArray(data?.data?.ayahs)) {
          setAyahs(
            data.data.ayahs.map(
              (a: { number: number; text: string; numberInSurah: number }) => ({
                number: a.number,
                text: a.text,
                numberInSurah: a.numberInSurah,
              }),
            ),
          );
          setAyahStatus('ready');
        } else {
          setAyahStatus('error');
        }
      })
      .catch((err: { name?: string }) => {
        if (err?.name !== 'AbortError') setAyahStatus('error');
      });

    return () => controller.abort();
  }, [selectedSurah, ayahRetry]);

  // ── Fetch the selected ayah's tafsir ──────────────────────────────────────
  const fetchTafsir = useCallback(
    async (surahIdx: number, ayahNum: number, tafsirId: string, signal: AbortSignal) => {
      const key = String(surahIdx + 1) + ':' + String(ayahNum);
      const url = 'https://api.alquran.cloud/v1/ayah/' + key + '/' + tafsirId;
      const res = await fetch(url, { signal });
      const data = await res.json();
      if (data?.code === 200 && data?.data?.text) return data.data.text as string;
      // Fallback to the Muyassar tafsir, as before.
      const fb = await fetch('https://api.alquran.cloud/v1/ayah/' + key + '/ar.muyassar', { signal });
      const fbd = await fb.json();
      if (fbd?.code === 200 && fbd?.data?.text) return fbd.data.text as string;
      return null;
    },
    [],
  );

  useEffect(() => {
    if (selectedSurah === null || selectedAyah === null) {
      setTafsirStatus('idle');
      setTafsirText('');
      return;
    }
    const controller = new AbortController();
    let alive = true;
    setTafsirStatus('loading');
    setTafsirText('');

    fetchTafsir(selectedSurah, selectedAyah, selectedTafsir.id, controller.signal)
      .then((text) => {
        if (!alive) return;
        if (text) {
          setTafsirText(text.replace(/<[^>]*>/g, ''));
          setTafsirStatus('ready');
        } else {
          setTafsirStatus('empty');
        }
      })
      .catch((err: { name?: string }) => {
        if (alive && err?.name !== 'AbortError') setTafsirStatus('error');
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [selectedSurah, selectedAyah, selectedTafsir, tafsirRetry, fetchTafsir]);

  // Scroll the opened tafsir into view — only when the user selected an ayah,
  // and never with motion when the user asked for reduced motion.
  useEffect(() => {
    if (!scrollOnSelectRef.current || selectedAyah === null) return;
    scrollOnSelectRef.current = false;
    const id = window.setTimeout(() => {
      tafsirRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }, 140);
    return () => window.clearTimeout(id);
  }, [selectedAyah]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredAyahs = useMemo(
    () =>
      ayahSearch
        ? ayahs.filter(
            (a) => a.text.includes(ayahSearch) || String(a.numberInSurah) === ayahSearch,
          )
        : ayahs,
    [ayahs, ayahSearch],
  );

  const canPrevAyah = selectedAyah !== null && selectedAyah > 1;
  const canNextAyah = selectedAyah !== null && surah !== null && selectedAyah < surah.ayahs;

  // ── Actions ───────────────────────────────────────────────────────────────
  const selectSurah = (surahIndex: number) => {
    setSelectedSurah(surahIndex);
    setSelectedAyah(null);
    setTafsirStatus('idle');
    setTafsirText('');
    setLocalAyahSearch('');
    setAyahSearch('');
    setPickerOpen(false);
  };

  const selectAyah = (numberInSurah: number) => {
    scrollOnSelectRef.current = true;
    setSelectedAyah((prev) => (prev === numberInSurah ? null : numberInSurah));
  };

  const copyText = (text: string, id: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      if (copiedTimer !== null) window.clearTimeout(copiedTimer);
      const timer = window.setTimeout(() => setCopied(null), 1600);
      setCopiedTimer(timer);
    });
  };

  const toggleBookmark = (key: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      saveBookmarks(next);
      return next;
    });
  };

  const goToPrevAyah = () => {
    if (selectedAyah !== null && selectedAyah > 1) setSelectedAyah(selectedAyah - 1);
  };
  const goToNextAyah = () => {
    if (selectedAyah !== null && surah !== null && selectedAyah < surah.ayahs) {
      setSelectedAyah(selectedAyah + 1);
    }
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const readerHeader =
    surah !== null ? (
      <PageHeader
        sticky
        backFallback="/quran"
        title={surah.name}
        subtitle={
          (surah.place === 'makkah' ? 'مكية' : 'مدنية') +
          ' · ' +
          arabicDigits(surah.ayahs) +
          ' آية'
        }
        right={
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="تصغير حجم النص"
              disabled={sizeIndex === 0}
              onClick={() => setSizeIndex((i) => Math.max(0, i - 1))}
            >
              <Minus className="h-4 w-4" aria-hidden />
            </IconButton>
            <span className="text-micro tabular-nums text-muted-foreground" dir="ltr">
              {Math.round((AYAH_SIZES[sizeIndex] / AYAH_SIZES[0]) * 100)}%
            </span>
            <IconButton
              aria-label="تكبير حجم النص"
              disabled={sizeIndex === AYAH_SIZES.length - 1}
              onClick={() => setSizeIndex((i) => Math.min(AYAH_SIZES.length - 1, i + 1))}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
        }
      />
    ) : (
      <PageHeader
        variant="display"
        hideBack
        backFallback="/quran"
        title="التفسير"
        subtitle="اختر سورة لقراءة آياتها مع تفسيرها"
      />
    );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell header={readerHeader}>
      <SEO
        title="التفسير — SmartHub"
        description="تفسير القرآن الكريم باللغة العربية: استكشف معاني الآيات والسور مع تفسير ميسر وشامل لكل أجزاء المصحف الشريف."
        path="/tafsir"
      />

      {surah === null ? (
        <section aria-label="فهرس سور القرآن">
          <SurahIndexList onSelect={(surahNumber) => selectSurah(surahNumber - 1)} showTotal />
        </section>
      ) : (
        <>
          {/* Reader toolbar — the quiet tools of a reading surface. */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setPickerOpen(true)}>
              <BookOpen className="h-4 w-4" aria-hidden />
              فهرس السور
            </Button>
            <Button variant="ghost" onClick={() => setSourceOpen(true)}>
              <BookMarked className="h-4 w-4" aria-hidden />
              <span className="max-w-[10rem] truncate">{selectedTafsir.name}</span>
            </Button>
            <div className="relative w-full min-w-0 sm:w-auto sm:flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={localAyahSearch}
                onChange={(event) => setLocalAyahSearch(event.target.value)}
                placeholder="ابحث في آيات السورة"
                aria-label="ابحث في آيات السورة"
                className="ps-10 pe-12"
              />
              {localAyahSearch.length > 0 && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => {
                    setLocalAyahSearch('');
                    setAyahSearch('');
                  }}
                  className="absolute top-1/2 end-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </div>

          <p className="text-micro text-muted-foreground">
            اضغط رقم الآية في نهاية كل آية لعرض تفسيرها.
          </p>

          {/* The reading column. */}
          {ayahStatus === 'loading' ? (
            <div className="space-y-3" aria-busy="true" aria-label="جارٍ تحميل الآيات">
              {[96, 88, 100, 74, 92, 60].map((width, index) => (
                <div
                  key={index}
                  className="skeleton h-6"
                  style={{ width: String(width) + '%' }}
                />
              ))}
            </div>
          ) : ayahStatus === 'error' ? (
            <StateView
              kind="error"
              title="تعذّر تحميل الآيات"
              body="لم نتمكن من الوصول إلى نص السورة الآن. تحقّق من اتصالك ثم أعد المحاولة."
              action={{ label: 'إعادة المحاولة', onClick: () => setAyahRetry((n) => n + 1) }}
            />
          ) : filteredAyahs.length === 0 ? (
            ayahSearch ? (
              <StateView
                kind="search"
                title="لا آيات تطابق بحثك"
                body="لم يطابق أي نص أو رقم آية ما كتبته في هذه السورة. جرّب كلمة أقصر أو ابحث برقم الآية."
                action={{
                  label: 'مسح البحث',
                  onClick: () => {
                    setLocalAyahSearch('');
                    setAyahSearch('');
                  },
                }}
              />
            ) : (
              <StateView
                kind="empty"
                title="لا توجد آيات في هذه السورة"
                body="لم يصل نصّ لهذه السورة. افتح فهرس السور واختر سورة أخرى."
                action={{ label: 'فهرس السور', onClick: () => setPickerOpen(true) }}
              />
            )
          ) : (
            <section aria-label={'سورة ' + surah.name}>
              {filteredAyahs.map((ayah) => {
                const isSelected = selectedAyah === ayah.numberInSurah;
                const bookmarkKey = String(selectedSurah) + ':' + String(ayah.numberInSurah);
                const isBookmarked = bookmarks.includes(bookmarkKey);
                return (
                  <article key={ayah.number} className="py-4">
                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-foreground"
                      style={{
                        ...SCRIPTURE_STYLE,
                        fontSize: ayahFontSize + 'rem',
                        lineHeight: 1.9,
                      }}
                    >
                      {ayah.text}
                      <button
                        type="button"
                        onClick={() => selectAyah(ayah.numberInSurah)}
                        aria-label={
                          'تفسير الآية ' + arabicDigits(ayah.numberInSurah)
                        }
                        aria-expanded={isSelected}
                        className={cn(
                          'mx-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full align-middle',
                          'app-focus-ring transition-colors duration-fast',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-mini font-semibold tabular-nums',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground',
                          )}
                          style={{ fontFamily: 'inherit' }}
                        >
                          {arabicDigits(ayah.numberInSurah)}
                        </span>
                      </button>
                    </p>

                    {isSelected && (
                      <section
                        ref={tafsirRef}
                        aria-label={'تفسير الآية ' + arabicDigits(ayah.numberInSurah)}
                        className="mt-3 rounded-md bg-surface-2 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          <BookMarked className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span className="me-auto min-w-0 truncate text-mini font-semibold text-foreground">
                            {selectedTafsir.name}
                          </span>
                          <IconButton
                            aria-label={isBookmarked ? 'إزالة العلامة' : 'حفظ علامة'}
                            onClick={() => toggleBookmark(bookmarkKey)}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="h-4 w-4 text-primary" aria-hidden />
                            ) : (
                              <Bookmark className="h-4 w-4" aria-hidden />
                            )}
                          </IconButton>
                          <IconButton
                            aria-label="نسخ الآية"
                            onClick={() =>
                              copyText(ayah.text, 'ayah-' + String(ayah.number))
                            }
                          >
                            {copied === 'ayah-' + String(ayah.number) ? (
                              <Check className="h-4 w-4 text-success" aria-hidden />
                            ) : (
                              <Copy className="h-4 w-4" aria-hidden />
                            )}
                          </IconButton>
                          <IconButton
                            aria-label="الآية السابقة"
                            disabled={!canPrevAyah}
                            onClick={goToPrevAyah}
                          >
                            <ChevronUp className="h-4 w-4" aria-hidden />
                          </IconButton>
                          <IconButton
                            aria-label="الآية التالية"
                            disabled={!canNextAyah}
                            onClick={goToNextAyah}
                          >
                            <ChevronDown className="h-4 w-4" aria-hidden />
                          </IconButton>
                        </div>

                        <div className="mt-2" aria-live="polite">
                          {tafsirStatus === 'loading' ? (
                            <div className="space-y-2" aria-busy="true" aria-label="جارٍ تحميل التفسير">
                              <div className="skeleton h-4 w-full" />
                              <div className="skeleton h-4 w-11/12" />
                              <div className="skeleton h-4 w-3/4" />
                            </div>
                          ) : tafsirStatus === 'error' ? (
                            <div className="flex flex-col items-start gap-2">
                              <p className="text-meta text-foreground">
                                تعذّر تحميل التفسير لهذه الآية. قد تكون المشكلة في الاتصال.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTafsirRetry((n) => n + 1)}
                              >
                                إعادة المحاولة
                              </Button>
                            </div>
                          ) : tafsirStatus === 'empty' ? (
                            <p className="text-meta text-muted-foreground">
                              لم يتوفر تفسير لهذه الآية في هذا المصدر.
                            </p>
                          ) : (
                            <p className="whitespace-pre-wrap text-body leading-loose text-foreground">
                              {tafsirText}
                            </p>
                          )}
                        </div>

                        <p className="mt-2 text-micro text-muted-foreground-subtle">
                          {'المصدر: alquran.cloud — ' +
                            surah.name +
                            ' : ' +
                            arabicDigits(ayah.numberInSurah)}
                        </p>
                      </section>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {/* Chapter foot: quiet next/previous surah, the reading grammar's
              "next chapter" step. */}
          <nav
            aria-label="التنقل بين السور"
            className="mt-2 flex items-center justify-between gap-3 border-t border-track pt-4"
          >
            <Button
              variant="ghost"
              disabled={selectedSurah === 0}
              onClick={() => selectedSurah !== null && selectSurah(selectedSurah - 1)}
              className="min-w-0"
            >
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">
                {selectedSurah !== null && selectedSurah > 0
                  ? SURAH_INDEX[selectedSurah - 1].name
                  : 'السورة السابقة'}
              </span>
            </Button>
            <Button
              variant="ghost"
              disabled={selectedSurah === null || selectedSurah >= SURAH_INDEX.length - 1}
              onClick={() => selectedSurah !== null && selectSurah(selectedSurah + 1)}
              className="min-w-0"
            >
              <span className="truncate">
                {selectedSurah !== null && selectedSurah < SURAH_INDEX.length - 1
                  ? SURAH_INDEX[selectedSurah + 1].name
                  : 'السورة التالية'}
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </nav>
        </>
      )}

      {/* Surah picker — the same index /quran uses, in a sheet. */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>فهرس السور</DialogTitle>
            <DialogDescription>
              {arabicDigits(SURAH_INDEX.length)} سورة · اختر سورة للقراءة
            </DialogDescription>
          </DialogHeader>
          <SurahIndexList
            onSelect={(surahNumber) => selectSurah(surahNumber - 1)}
            autoFocus
          />
        </DialogContent>
      </Dialog>

      {/* Tafsir source picker. */}
      <Dialog open={sourceOpen} onOpenChange={setSourceOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مصدر التفسير</DialogTitle>
            <DialogDescription>اختر التفسير الذي تقرأه لهذه الآية.</DialogDescription>
          </DialogHeader>
          <AppList>
            {TAFSIRS.map((tafsir) => (
              <AppRow
                key={tafsir.id}
                onClick={() => {
                  setSelectedTafsir(tafsir);
                  setSourceOpen(false);
                }}
                title={tafsir.name}
                chevron={tafsir.id !== selectedTafsir.id}
              >
                {tafsir.id === selectedTafsir.id && (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                )}
              </AppRow>
            ))}
          </AppList>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
