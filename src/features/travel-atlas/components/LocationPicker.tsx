import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Copy, Loader2, MapPin, Search, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { catalogCountryAt } from '../data/countriesCatalog';
import type { MapStyleId } from '../data/mapStyles';
import { formatCoordinates } from '../lib/geo';
import { type GeocodeResult, reverseGeocode, searchPlaces } from '../lib/geocoding';
import { readMapStyleId, writeMapStyleId } from '../lib/mapPreferences';
import type { Coordinates, CountryBounds } from '../types';
import MapControls from './map/MapControls';
import MapSurface from './map/MapSurface';
import { useMapController } from './map/useMapController';

export interface PickedLocationMeta {
  city: string | null;
  address: string | null;
  isoCode: string | null;
}

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (coordinates: Coordinates, meta?: PickedLocationMeta) => void;
  /** Frames the picker on the country already chosen in the form. */
  initialBounds?: CountryBounds | null;
  /** Warn when the pin leaves this country. */
  expectedIsoCode?: string | null;
  /** Reverse-geocode result for the settled pin — the form fills blanks with it. */
  onResolved?: (meta: PickedLocationMeta) => void;
  className?: string;
}

/** Nominatim asks for at most one request per second; this stays well inside it. */
const SEARCH_DEBOUNCE_MS = 550;
const REVERSE_DEBOUNCE_MS = 900;

/**
 * Pick a point precisely.
 *
 * The pin is fixed to the centre of the viewport and the MAP moves underneath it.
 * Dragging a small pin with a fingertip that completely covers it is the classic
 * failure of location pickers — this way the target is never obscured, and the
 * crosshair sits exactly where the coordinate will be recorded.
 *
 * Typing is offered too, because "الحرم المكي" is easier to enter than 21.4225,
 * 39.8262 — and searching then adjusting by hand is the fastest path to an exact
 * point.
 */
export default function LocationPicker({
  value,
  onChange,
  initialBounds,
  expectedIsoCode,
  onResolved,
  className,
}: LocationPickerProps) {
  const [styleId, setStyleId] = useState<MapStyleId>(readMapStyleId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolved, setResolved] = useState<string | null>(null);

  const [initialCamera] = useState(() => ({
    initialBounds: value ? null : (initialBounds ?? null),
    initialCenter: value ?? ([39.8262, 21.4225] as Coordinates),
    initialZoom: value ? 14 : 4,
    padding: { top: 72, bottom: 56, left: 32, right: 32 },
  }));
  const { controller, snapshot } = useMapController({ ...initialCamera, styleId, globe: false });

  // Guards the two-way binding: the map reports its centre, and the prop flies
  // the map. Without remembering the last value we emitted, each would retrigger
  // the other forever.
  const lastEmittedRef = useRef<string>(value ? value.join(',') : '');

  // Callbacks live in refs so `emit` and the geocoding effects stay stable even
  // when the parent passes inline handlers — otherwise every parent render would
  // re-subscribe the map and re-fire the reverse lookup.
  const onChangeRef = useRef(onChange);
  const onResolvedRef = useRef(onResolved);
  useEffect(() => {
    onChangeRef.current = onChange;
    onResolvedRef.current = onResolved;
  }, [onChange, onResolved]);

  const emit = useCallback((coordinates: Coordinates, meta?: PickedLocationMeta) => {
    lastEmittedRef.current = coordinates.join(',');
    onChangeRef.current(coordinates, meta);
  }, []);

  // Map centre → form value.
  useEffect(() => {
    const map = snapshot.map;
    if (!map) return;
    const handleMoveEnd = () => {
      const center = map.getCenter();
      emit([Number(center.lng.toFixed(6)), Number(center.lat.toFixed(6))]);
    };
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [emit, snapshot.map]);

  // Form value → map centre (only when it did not come from the map).
  useEffect(() => {
    if (!value || !snapshot.isReady) return;
    const key = value.join(',');
    if (key === lastEmittedRef.current) return;
    lastEmittedRef.current = key;
    controller.flyTo(value, 14);
  }, [controller, snapshot.isReady, value]);

  // Reverse geocode the settled pin so the form can offer a city and address.
  useEffect(() => {
    if (!value) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setIsResolving(true);
      reverseGeocode(value, abort.signal)
        .then((result) => {
          setIsResolving(false);
          if (!result) {
            setResolved(null);
            return;
          }
          setResolved([result.title, result.subtitle].filter(Boolean).join(' · '));
          onResolvedRef.current?.({
            city: result.city,
            address: result.address,
            isoCode: result.isoCode,
          });
        })
        .catch(() => setIsResolving(false));
    }, REVERSE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [value]);

  // Search-as-you-type.
  useEffect(() => {
    const trimmed = query.trim();
    // Too short to search. The list is hidden by `visibleResults` below rather
    // than cleared here, so no state is written just to hide something.
    if (trimmed.length < 3) return;

    const abort = new AbortController();
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchPlaces(trimmed, { signal: abort.signal, isoCode: expectedIsoCode ?? undefined })
        .then((found) => {
          setIsSearching(false);
          setResults(found);
        })
        .catch((error: unknown) => {
          setIsSearching(false);
          if ((error as Error)?.name !== 'AbortError') setResults([]);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [expectedIsoCode, query]);

  const chooseResult = (result: GeocodeResult) => {
    setQuery('');
    setResults([]);
    setResolved([result.title, result.subtitle].filter(Boolean).join(' · '));
    controller.flyTo(result.coordinates, 15);
    emit(result.coordinates, {
      city: result.city,
      address: result.address,
      isoCode: result.isoCode,
    });
  };

  const copyCoordinates = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(formatCoordinates(value));
      toast.success('تم نسخ الإحداثيات');
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  // Results belong to the query that fetched them; a shorter query hides them.
  const visibleResults = query.trim().length >= 3 ? results : [];

  const mismatch = useMemo(() => {
    if (!value || !expectedIsoCode) return null;
    const detected = catalogCountryAt(value);
    if (!detected || detected.isoCode === expectedIsoCode) return null;
    return detected.nameAr;
  }, [expectedIsoCode, value]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث عن مكان أو عنوان…"
          className="ps-10 pe-10"
          aria-label="البحث عن موقع"
        />
        <span className="absolute end-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="إفراغ البحث"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>

      {visibleResults.length > 0 && (
        <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-card border border-border">
          {visibleResults.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => chooseResult(result)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-start hover:bg-accent"
              >
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-body text-foreground">{result.title}</span>
                  {result.subtitle && (
                    <span className="block truncate text-micro text-muted-foreground">
                      {result.subtitle}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative h-64 overflow-hidden rounded-card border border-border sm:h-72">
        <MapSurface
          controller={controller}
          snapshot={snapshot}
          unsupportedFallback={
            <div className="grid h-full place-items-center px-4 text-center text-mini text-muted-foreground">
              الخريطة غير مدعومة على هذا الجهاز — أدخل الإحداثيات يدويًا.
            </div>
          }
        >
          <MapPin className="travel-picker-pin h-9 w-9" fill="currentColor" aria-hidden="true" />
          <span className="travel-picker-crosshair" aria-hidden="true" />
          <MapControls
            controller={controller}
            styleId={styleId}
            onStyleChange={(next) => {
              setStyleId(next);
              writeMapStyleId(next);
            }}
            onLocated={(coordinates) => emit(coordinates)}
          />
        </MapSurface>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-micro text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          اسحب الخريطة ليقف الدبوس على المكان بالضبط
        </span>
        {value && (
          <button
            type="button"
            onClick={copyCoordinates}
            className="inline-flex items-center gap-1.5 font-mono tabular-nums hover:text-foreground"
            dir="ltr"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {formatCoordinates(value)}
          </button>
        )}
      </div>

      {(isResolving || resolved) && (
        <p className="text-micro text-muted-foreground">
          {isResolving ? 'نتعرّف على الموقع…' : resolved}
        </p>
      )}

      {mismatch && (
        <p
          className="rounded-card border border-border px-3 py-2 text-micro text-warning"
          role="status"
        >
          الدبوس يبدو داخل {mismatch}. تأكّد من اختيار الدولة الصحيحة.
        </p>
      )}
    </div>
  );
}
