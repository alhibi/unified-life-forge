// ============================================================================
// CitySearch — the deep rewrite.
//
// WHAT THIS REPLACES
//   The previous component did three things in one place: search,
//   favourites, history. It rendered the same list three times with
//   slightly different chrome. Keyboard navigation didn't exist. The
//   geocoder only knew Open-Meteo.
//
// WHAT THIS DOES
//   • Multi-source search via CityGeocoder (Open-Meteo + Nominatim +
//     local fuzzy match).
//   • Keyboard navigation (↑/↓/Enter/Esc/Tab). The input keeps focus;
//     results are highlighted via aria-activedescendant.
//   • Three distinct empty states: favourites, recent, nearby (when the
//     user's location is available and they have history).
//   • Clear states for: loading, error, no-results.
//   • Accessibility: role="combobox", aria-autocomplete="list", proper
//     labelled listbox semantics.
// ============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Compass,
  History,
  Loader,
  Search as SearchIcon,
  Star,
  X,
} from '@/lib/icons';

import { cityGeocoder } from '../engine/CityGeocoder';
import type { CityCandidate, StoredCity } from '../types/CitySearch';
import { CitySearchResult } from './CitySearchResult';

// Re-export the old name for backward compatibility with callers that
// imported `SearchedCity` from this module. The new canonical type lives
// in `../types/CitySearch` as `StoredCity`.
export type SearchedCity = StoredCity;

interface CitySearchProps {
  onSelectCity: (lat: number, lng: number, name: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

const HISTORY_KEY = 'weather-search-history';
const FAV_KEY = 'weather-favorites';
const HISTORY_LIMIT = 8;
const FAV_LIMIT = 12;

function flagEmoji(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  try { return String.fromCodePoint(...codePoints); } catch { return ''; }
}

function toCandidate(city: StoredCity, source: CityCandidate['source']): CityCandidate {
  return {
    id: String(city.id),
    name: city.name,
    nameAr: city.nameAr ?? city.name,
    country: city.country,
    countryCode: city.countryCode,
    admin1: city.admin1,
    latitude: city.latitude,
    longitude: city.longitude,
    elevation: city.elevation,
    timezone: city.timezone,
    population: undefined,
    source,
    matchScore: 0,
    distanceKm: null,
  };
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silent */ }
}

export default function CitySearch({ onSelectCity, userLocation }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);

  const [history, setHistory] = useState<StoredCity[]>(() => readStored<StoredCity[]>(HISTORY_KEY, []));
  const [favourites, setFavourites] = useState<StoredCity[]>(() => readStored<StoredCity[]>(FAV_KEY, []));

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  useEffect(() => writeStored(HISTORY_KEY, history), [history]);
  useEffect(() => writeStored(FAV_KEY, favourites), [favourites]);

  /** Local index: favourites first, then history. */
  const localIndex = useMemo(() => {
    const seen = new Set<string>();
    const out: CityCandidate[] = [];
    for (const f of favourites) {
      const id = `fav-${f.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(toCandidate(f, 'manual'));
    }
    for (const h of history) {
      const id = `hist-${h.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(toCandidate(h, 'manual'));
    }
    return out;
  }, [favourites, history]);

  /** Nearby suggestions when input is empty + location is known. */
  const nearbySuggestions = useMemo(() => {
    if (!userLocation) return [];
    return cityGeocoder
      .suggestNearby({ lat: userLocation.lat, lng: userLocation.lng, radiusKm: 200, limit: 5 }, localIndex)
      .filter((c) => c.distanceKm !== null);
  }, [userLocation, localIndex]);

  // ── Debounced network search ────────────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const candidates = await cityGeocoder.search(trimmed, {
          local: localIndex,
          userLocation: userLocation ?? null,
          signal: ac.signal,
        });
        setResults(candidates);
        setHighlighted(0);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError('تعذر الاتصال بخدمة البحث. تحقق من الإنترنت.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query, localIndex, userLocation]);

  // ── Selection + history + favourites ───────────────────────────────
  const handleSelect = useCallback(
    (city: CityCandidate) => {
      const stored: StoredCity = {
        id: city.id,
        name: city.name,
        nameAr: city.nameAr,
        country: city.country,
        countryCode: city.countryCode,
        admin1: city.admin1,
        latitude: city.latitude,
        longitude: city.longitude,
        elevation: city.elevation,
        timezone: city.timezone,
      };
      setHistory((prev) => {
        const filtered = prev.filter((c) => String(c.id) !== stored.id);
        return [stored, ...filtered].slice(0, HISTORY_LIMIT);
      });
      onSelectCity(city.latitude, city.longitude, city.nameAr ?? city.name);
      setQuery('');
      setResults([]);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onSelectCity],
  );

  const toggleFavourite = useCallback((city: CityCandidate, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const stored: StoredCity = {
      id: city.id,
      name: city.name,
      nameAr: city.nameAr,
      country: city.country,
      countryCode: city.countryCode,
      admin1: city.admin1,
      latitude: city.latitude,
      longitude: city.longitude,
      elevation: city.elevation,
      timezone: city.timezone,
    };
    setFavourites((prev) => {
      const isFav = prev.some((f) => String(f.id) === stored.id);
      if (isFav) return prev.filter((f) => String(f.id) !== stored.id);
      return [stored, ...prev].slice(0, FAV_LIMIT);
    });
  }, []);

  const isFavourite = useCallback(
    (id: string) => favourites.some((f) => String(f.id) === id),
    [favourites],
  );

  // ── Keyboard navigation ────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const trimmed = query.trim();
      const list = trimmed.length >= 2 ? results : [];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => Math.min(list.length - 1, h + 1));
        setOpen(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => Math.max(0, h - 1));
      } else if (e.key === 'Enter') {
        if (list.length > 0 && highlighted < list.length) {
          e.preventDefault();
          handleSelect(list[highlighted]);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setResults([]);
      }
    },
    [query, results, highlighted, handleSelect],
  );

  // ── Decide what to show in the panel ───────────────────────────────
  const trimmed = query.trim();
  const isSearching = trimmed.length >= 2;
  const showPanel = open && (
    isSearching ||
    favourites.length > 0 ||
    history.length > 0 ||
    nearbySuggestions.length > 0
  );

  return (
    <div className="relative w-full z-header" dir="rtl">
      {/* Hero input */}
      <div className="relative flex items-center group">
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/8 via-primary/3 to-primary/8 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
        />
        <SearchIcon className="absolute ms-3.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={showPanel && isSearching && results[highlighted] ? `${listboxId}-opt-${highlighted}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            // Delay so click events on results still fire.
            setTimeout(() => {
              if (!e.currentTarget.contains(document.activeElement)) setOpen(false);
            }, 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder={'ابحث عن مدينة، حي، أو موقع…'}
          className="relative w-full ps-10 pe-10 py-3 rounded-2xl bg-card border border-border/60 text-foreground placeholder:text-muted-foreground text-meta outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-all shadow-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            aria-label="مسح البحث"
            className="absolute me-3.5 w-5 h-5 grid place-items-center rounded-full bg-foreground/10 text-foreground/60 hover:bg-foreground/20 hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Results panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label="نتائج البحث عن المدن"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute start-0 end-0 mt-2 bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-2xl overflow-hidden max-h-[420px] overflow-y-auto no-scrollbar"
          >
            <div className="p-2.5 space-y-3">
              {/* ── Searching state ──────────────────────────────────── */}
              {isSearching && (
                <Section title={loading ? 'جاري البحث في مصادر متعددة…' : 'نتائج البحث'}>
                  {loading && (
                    <div className="flex items-center justify-center gap-2 py-6 text-meta text-muted-foreground">
                      <Loader className="w-4 h-4 animate-spin text-primary" />
                      <span>{'جاري البحث في Open-Meteo و Nominatim'}</span>
                    </div>
                  )}
                  {!loading && error && (
                    <p className="text-meta text-rose-500 py-4 px-2 text-center">{error}</p>
                  )}
                  {!loading && !error && results.length === 0 && (
                    <p className="text-meta text-muted-foreground py-4 px-2 text-center">
                      {'لا توجد نتائج مطابقة.'}
                    </p>
                  )}
                  {!loading && results.length > 0 && (
                    <div className="space-y-0.5">
                      {results.map((c, i) => (
                        <div key={`${c.source}-${c.id}`} id={`${listboxId}-opt-${i}`}>
                          <CitySearchResult
                            candidate={c}
                            highlighted={i === highlighted}
                            isFavourite={isFavourite(c.id)}
                            onSelect={() => handleSelect(c)}
                            onToggleFavourite={(e) => toggleFavourite(c, e)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* ── Empty state: nearby / favourites / history ─────── */}
              {!isSearching && (
                <>
                  {favourites.length > 0 && (
                    <Section title="المدن المفضلة" icon={<Star className="w-3.5 h-3.5 text-primary fill-primary" />}>
                      <div className="space-y-0.5">
                        {favourites.map((c) => {
                          const cand = toCandidate(c, 'manual');
                          return (
                            <CitySearchResult
                              key={`fav-${c.id}`}
                              candidate={cand}
                              highlighted={false}
                              isFavourite
                              onSelect={() => handleSelect(cand)}
                              onToggleFavourite={(e) => toggleFavourite(cand, e)}
                            />
                          );
                        })}
                      </div>
                    </Section>
                  )}

                  {nearbySuggestions.length > 0 && (
                    <Section title="الأقرب إليك" icon={<Compass className="w-3.5 h-3.5 text-primary" />}>
                      <div className="space-y-0.5">
                        {nearbySuggestions.map((c) => (
                          <CitySearchResult
                            key={`near-${c.id}`}
                            candidate={c}
                            highlighted={false}
                            isFavourite={isFavourite(c.id)}
                            onSelect={() => handleSelect(c)}
                            onToggleFavourite={(e) => toggleFavourite(c, e)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {history.length > 0 && (
                    <Section
                      title="عمليات البحث الأخيرة"
                      icon={<History className="w-3.5 h-3.5 text-muted-foreground" />}
                      action={
                        <button
                          onClick={() => setHistory([])}
                          className="text-[0.625rem] font-bold tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {'مسح السجل'}
                        </button>
                      }
                    >
                      <div className="space-y-0.5">
                        {history.map((c) => {
                          const cand = toCandidate(c, 'manual');
                          return (
                            <CitySearchResult
                              key={`hist-${c.id}`}
                              candidate={cand}
                              highlighted={false}
                              isFavourite={isFavourite(String(c.id))}
                              onSelect={() => handleSelect(cand)}
                              onToggleFavourite={(e) => toggleFavourite(cand, e)}
                            />
                          );
                        })}
                      </div>
                    </Section>
                  )}

                  {favourites.length === 0 && history.length === 0 && nearbySuggestions.length === 0 && (
                    <EmptyHint />
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-center justify-between gap-2 px-2 pb-2 mb-1 border-b border-foreground/8">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55">
            {title}
          </span>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function EmptyHint() {
  return (
    <div className="px-4 py-8 text-center space-y-2">
      <Compass className="w-7 h-7 mx-auto text-foreground/30" />
      <p className="text-meta text-foreground/65 font-bold leading-snug">
        {'ابحث عن أي مدينة في العالم.'}
      </p>
      <p className="text-mini text-foreground/50 leading-relaxed">
        {'حاول "بغداد"، "الرياض"، "Berlin"، أو "القاهرة".'}
      </p>
    </div>
  );
}