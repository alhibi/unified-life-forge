import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Search, Trash2, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import CountryStampMap from '../components/CountryStampMap';
import SegmentedChoice from '../components/form/SegmentedChoice';
import { STAMP_STATUS_META, stampStatusMeta } from '../data/categories';
import { type DotCountry, loadWorldDots, type WorldDots } from '../data/worldDots';
import { useCountryStamps, useRemoveCountryStamp, useSetCountryStamp } from '../hooks';
import { normalizeArabic } from '../lib/filtering';
import type { CountryStamp, StampStatus } from '../types';

/**
 * The country map — the second of the atlas's two maps, and deliberately not a
 * map at all in the slippy sense.
 *
 * Places answer "where exactly"; countries answer "where have I been". Those are
 * different questions and they want different surfaces: this one is a poster of
 * the whole world where a tap stamps a country, with no tiles to load, nothing
 * to pan, and no detail to get lost in.
 */
export default function CountryStampsPage() {
  const { data: stamps = [], isLoading } = useCountryStamps();
  const setStamp = useSetCountryStamp();
  const removeStamp = useRemoveCountryStamp();

  const [world, setWorld] = useState<WorldDots | null>(null);
  const [selected, setSelected] = useState<DotCountry | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadWorldDots().then(
      (data) => {
        if (!cancelled) setWorld(data);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const stampByIso = useMemo(() => {
    const map = new Map<string, CountryStamp>();
    for (const stamp of stamps) map.set(stamp.isoCode, stamp);
    return map;
  }, [stamps]);

  const totals = useMemo(() => {
    const visited = stamps.filter((stamp) => stamp.status === 'visited').length;
    const lived = stamps.filter((stamp) => stamp.status === 'lived').length;
    const wishlist = stamps.filter((stamp) => stamp.status === 'wishlist').length;
    const total = world?.countries.length ?? 0;
    // "Been there" counts living somewhere too — you have unquestionably been.
    const been = visited + lived;
    return { visited, lived, wishlist, been, total, share: total > 0 ? been / total : 0 };
  }, [stamps, world]);

  const matches = useMemo(() => {
    if (!world) return [];
    const tokens = normalizeArabic(query).split(/\s+/).filter(Boolean);
    const list = tokens.length
      ? world.countries.filter((country) => {
          const haystack = normalizeArabic(`${country.ar} ${country.en} ${country.cont}`);
          return tokens.every((token) => haystack.includes(token));
        })
      : world.countries.filter((country) => stampByIso.has(country.iso));
    return [...list].sort((a, b) => a.ar.localeCompare(b.ar, 'ar'));
  }, [query, stampByIso, world]);

  return (
    <div className="page-shell page-shell-flush">
      <SEO
        title="خريطة البلدان — أطلس الرحلات"
        description="سجّل الدول التي زرتها على خريطة منقّطة، وشاهد نصيبك من العالم."
        path="/travel-atlas/countries"
      />
      <PageHeader
        title="خريطة البلدان"
        subtitle={
          totals.total > 0 ? `${totals.been} من ${totals.total} دولة` : 'سجّل الدول التي زرتها'
        }
        icon={<Globe className="h-5 w-5 text-[hsl(var(--live))]" aria-hidden="true" />}
        backTo="/travel-atlas"
        sticky
      />

      <main className="mx-auto w-full max-w-lg pb-page pt-4">
        <div className="app-stack">
          <AppCard className="p-0">
            <CountryStampMap
              stamps={stamps}
              selectedIso={selected?.iso ?? null}
              onSelectCountry={setSelected}
              className="h-56 px-3 pt-3 sm:h-72"
            />

            <div className="p-4">
              {/* Width encodes the share of the world's countries stamped. */}
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full bg-[hsl(var(--live))]"
                  style={{ width: `${Math.round(totals.share * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-micro text-muted-foreground">
                {totals.total > 0
                  ? `${Math.round(totals.share * 100)}% من دول العالم`
                  : 'نحمّل الخريطة…'}
              </p>

              <ul className="mt-4 grid grid-cols-3 gap-3 text-center">
                {STAMP_STATUS_META.map((meta) => (
                  <li key={meta.value}>
                    <p className="font-mono text-lead tabular-nums text-foreground">
                      {meta.value === 'visited'
                        ? totals.visited
                        : meta.value === 'lived'
                          ? totals.lived
                          : totals.wishlist}
                    </p>
                    <p className="text-micro text-muted-foreground">{meta.label}</p>
                  </li>
                ))}
              </ul>
            </div>
          </AppCard>

          <section>
            <h2 className="app-section-label">{query ? 'نتائج البحث' : 'الدول المسجّلة'}</h2>

            <div className="relative mb-3">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن دولة لتسجيلها…"
                className="ps-10 pe-10"
                aria-label="البحث عن دولة"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="إفراغ البحث"
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {isLoading && stamps.length === 0 ? (
              <div className="skeleton h-24 w-full" aria-hidden="true" />
            ) : matches.length === 0 ? (
              <p className="rounded-card border border-border px-4 py-6 text-center text-body text-muted-foreground">
                {query
                  ? 'لا دولة بهذا الاسم.'
                  : 'لم تسجّل أي دولة بعد — انقر على الخريطة أو ابحث عن دولة.'}
              </p>
            ) : (
              <AppCard className="p-0">
                <ul className="divide-y divide-border">
                  {matches.slice(0, 60).map((country) => {
                    const stamp = stampByIso.get(country.iso);
                    return (
                      <li key={country.iso}>
                        <button
                          type="button"
                          onClick={() => setSelected(country)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-accent"
                        >
                          <span
                            className={cn(
                              'h-2.5 w-2.5 shrink-0 rounded-full border',
                              stamp ? 'border-transparent' : 'border-border',
                            )}
                            style={
                              stamp ? { backgroundColor: stampColor(stamp.status) } : undefined
                            }
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body text-foreground">
                              {country.ar}
                            </span>
                            <span className="block truncate text-micro text-muted-foreground">
                              {country.cont}
                              {stamp?.firstYear ? ` · ${stamp.firstYear}` : ''}
                            </span>
                          </span>
                          {stamp && (
                            <span className="shrink-0 text-micro text-muted-foreground">
                              {stampStatusMeta(stamp.status).label}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </AppCard>
            )}
          </section>
        </div>
      </main>

      {selected && (
        <StampSheet
          key={selected.iso}
          country={selected}
          stamp={stampByIso.get(selected.iso) ?? null}
          onClose={() => setSelected(null)}
          onSave={(fields) => {
            setStamp.mutate(
              { isoCode: selected.iso, fields },
              {
                onError: (error) =>
                  toast.error('تعذّر الحفظ', {
                    description:
                      (error as Error)?.message === 'not_authenticated'
                        ? 'سجّل الدخول أولًا.'
                        : (error as Error)?.message,
                  }),
              },
            );
            setSelected(null);
          }}
          onRemove={() => {
            removeStamp.mutate(selected.iso);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function stampColor(status: StampStatus): string {
  if (status === 'visited') return 'hsl(var(--live))';
  if (status === 'lived') return 'hsl(var(--foreground))';
  return 'hsl(var(--muted-foreground))';
}

function StampSheet({
  country,
  stamp,
  onClose,
  onSave,
  onRemove,
}: {
  country: DotCountry;
  stamp: CountryStamp | null;
  onClose: () => void;
  onSave: (fields: {
    status: StampStatus;
    firstYear: number | null;
    visitCount: number;
    noteAr: string | null;
  }) => void;
  onRemove: () => void;
}) {
  const [status, setStatus] = useState<StampStatus>(stamp?.status ?? 'visited');
  const [year, setYear] = useState(stamp?.firstYear ? String(stamp.firstYear) : '');
  const [visits, setVisits] = useState(String(stamp?.visitCount ?? 1));
  const [note, setNote] = useState(stamp?.noteAr ?? '');

  const thisYear = new Date().getFullYear();

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-start">
          <SheetTitle>{country.ar}</SheetTitle>
          <SheetDescription>
            {country.cont} · {country.en}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>الحالة</Label>
            <SegmentedChoice
              ariaLabel="حالة الدولة"
              value={status}
              options={STAMP_STATUS_META.map((meta) => ({
                value: meta.value,
                label: meta.action,
                icon: meta.icon,
              }))}
              onChange={setStatus}
            />
          </div>

          {status !== 'wishlist' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stamp-year">أول مرة (سنة)</Label>
                <Input
                  id="stamp-year"
                  inputMode="numeric"
                  value={year}
                  placeholder={String(thisYear)}
                  onChange={(event) =>
                    setYear(event.target.value.replace(/[^\d]/g, '').slice(0, 4))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stamp-visits">عدد الزيارات</Label>
                <Input
                  id="stamp-visits"
                  inputMode="numeric"
                  value={visits}
                  onChange={(event) =>
                    setVisits(event.target.value.replace(/[^\d]/g, '').slice(0, 3))
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stamp-note">ملاحظة</Label>
            <Textarea
              id="stamp-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="ما الذي تذكره عن هذه الدولة؟"
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row gap-2">
          {stamp && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              أزل
            </Button>
          )}
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              const parsedYear = Number(year);
              onSave({
                status,
                firstYear:
                  status !== 'wishlist' &&
                  Number.isInteger(parsedYear) &&
                  parsedYear >= 1900 &&
                  parsedYear <= thisYear
                    ? parsedYear
                    : null,
                visitCount: status === 'wishlist' ? 0 : Math.max(1, Number(visits) || 1),
                noteAr: note.trim() || null,
              });
            }}
          >
            {stamp ? 'حدّث' : 'سجّل'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
