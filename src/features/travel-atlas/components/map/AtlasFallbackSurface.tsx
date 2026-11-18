import type { CSSProperties } from 'react';

import { AppList, AppRow, IconButton } from '@/components/ui/app-shell';
import {
  ChevronLeft,
  Compass,
  Globe,
  Luggage,
  MapPinned,
  RefreshCcw,
  WifiOff,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { CountrySummary } from '../../lib/stats';
import type { CountryStamp, TravelPlace } from '../../types';
import CountryStampMap from '../CountryStampMap';
import type { MapSurfaceState } from './MapSurface';

interface AtlasFallbackSurfaceProps {
  /** Copy register: the atlas overview or the street-level explore map. */
  variant: 'world' | 'explore';
  /** Whether the live map is still loading or already known to be unavailable. */
  state: MapSurfaceState;
  stamps?: CountryStamp[];
  summaries?: CountrySummary[];
  places?: TravelPlace[];
  onSelectCountry?: (isoCode: string) => void;
  onSelectPlace?: (place: TravelPlace) => void;
  onAddPlace?: () => void;
  /** Routes that keep working while the map is in its simplified state. */
  onBrowseCountries?: () => void;
  onBrowseTrips?: () => void;
  onRetry?: () => void;
  className?: string;
}

/** Legend rows: the four stamp states the dot poster can paint. */
const LEGEND = [
  { swatch: 'bg-[hsl(var(--live))]', label: 'زرتها' },
  { swatch: 'bg-foreground', label: 'عشت فيها' },
  { swatch: 'bg-muted-foreground', label: 'في القائمة' },
  { swatch: 'border border-border', label: 'لم تُسجّل' },
] as const;

/**
 * The atlas when the live map cannot paint.
 *
 * A tile failure used to leave the feature's centrepiece as a grey rectangle
 * with floating toolbar buttons over it: the user could not tell whether the
 * map was loading, broken or empty. This surface answers that in one glance —
 * the same dotted world the passport uses (real geography, real stamp colours),
 * a plain statement of the state, the legend, the countries that actually have
 * places, and one retry action. It is a designed *state* of the map, not a
 * replacement page: the toolbar, tabs and place sheet stay where they are.
 */
export default function AtlasFallbackSurface({
  variant,
  state,
  stamps = [],
  summaries = [],
  places = [],
  onSelectCountry,
  onSelectPlace,
  onAddPlace,
  onBrowseCountries,
  onBrowseTrips,
  onRetry,
  className,
}: AtlasFallbackSurfaceProps) {
  const isExplore = variant === 'explore';
  const openCountry = (isoCode: string) => onSelectCountry?.(isoCode);

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="وضع الخريطة المبسّط"
      className={cn(
        'flex h-full flex-col gap-3 overflow-y-auto bg-background px-[var(--ui-gutter)] pb-4',
        isExplore && 'pt-20',
        className,
      )}
    >
      <div className="flex items-start gap-3 rounded-card border border-border bg-surface-2 p-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-background text-[hsl(var(--live))]">
          {state === 'loading' ? (
            <Compass className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <WifiOff className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-foreground">
            {state === 'loading' ? 'نجهّز خريطتك…' : 'الخريطة في وضع مبسّط'}
          </p>
          <p className="mt-1 text-mini leading-6 text-muted-foreground">
            {state === 'loading'
              ? 'البلاطات قيد التحميل. حتى تصل، هذه صورة أطلسك كاملة.'
              : isExplore
                ? 'خريطة الشارع التفصيلية تحتاج اتصالًا. أطلسك يبقى متاحًا، وكل دولة تفتح خريطتها المحفوظة.'
                : 'بلاطات الخريطة المباشرة لم تصل. نعرض أطلسك من الذاكرة: كل نقطة دولة، وكل دولة تفتح تفاصيلها.'}
          </p>
        </div>
        {state === 'offline' && onRetry && (
          <IconButton aria-label="أعد المحاولة" onClick={onRetry} className="shrink-0">
            <RefreshCcw className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        )}
      </div>

      <div
        className="travel-dot-map relative aspect-[240/93] w-full shrink-0 overflow-hidden rounded-card border border-border bg-surface-1"
        style={
          {
            // Map artwork key (X4): the poster is a data drawing, so its dot
            // tones are set here rather than as chrome colours.
            '--dot-blank': 'hsl(var(--muted-foreground))',
            '--dot-visited': 'hsl(var(--live))',
            '--dot-lived': 'hsl(var(--foreground))',
            '--dot-wishlist': 'hsl(var(--muted-foreground))',
          } as CSSProperties
        }
      >
        <Graticule />
        <CountryStampMap
          stamps={stamps}
          onSelectCountry={(country) => openCountry(country.iso)}
          className="absolute inset-0"
        />
        <p className="pointer-events-none absolute inset-x-2 bottom-2 text-center text-micro text-muted-foreground">
          انقر على دولة لتفتحها
        </p>
      </div>

      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 text-micro text-muted-foreground">
        {LEGEND.map((entry) => (
          <li key={entry.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', entry.swatch)} />
            {entry.label}
          </li>
        ))}
      </ul>

      {!isExplore && summaries.length > 0 && (
        <section aria-label="دول فيها أماكن">
          <p className="mb-1.5 px-1 text-micro text-muted-foreground">دول فيها أماكنك</p>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {summaries.map((summary) => (
              <li key={summary.country.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => openCountry(summary.country.isoCode)}
                  className="flex h-11 min-w-11 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-mini font-semibold text-foreground"
                >
                  <span className="max-w-32 truncate">{summary.country.nameAr}</span>
                  <span className="tabular-nums text-muted-foreground" dir="ltr">
                    {summary.total}
                  </span>
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isExplore && summaries.length === 0 && state === 'offline' && (
        <div className="flex items-center gap-3 rounded-card border border-dashed border-border px-3 py-2.5">
          <MapPinned className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-mini text-muted-foreground">
            لم تُسجّل دولة بعد — أضف مكانًا واحدًا ليظهر على الخريطة.
          </p>
          {onAddPlace && (
            <button
              type="button"
              onClick={onAddPlace}
              className="inline-flex h-11 shrink-0 items-center rounded-button bg-primary px-3 text-mini font-semibold text-primary-foreground"
            >
              أضف مكانًا
            </button>
          )}
        </div>
      )}

      {isExplore && places.length > 0 && (
        <section aria-label="أماكنك المحفوظة">
          <p className="mb-1.5 px-1 text-micro text-muted-foreground">
            أماكنك المحفوظة — تُفتح من هنا حتى دون خريطة
          </p>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {places.map((place) => (
              <li key={place.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectPlace?.(place)}
                  className="flex h-11 min-w-11 max-w-56 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-mini font-semibold text-foreground"
                >
                  <MapPinned className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{place.nameAr}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isExplore && (onBrowseCountries || onBrowseTrips) && (
        <AppList compact aria-label="يعمل دون خريطة مباشرة">
          {onBrowseCountries && (
            <AppRow
              onClick={onBrowseCountries}
              leading={<Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              title="خريطة البلدان"
              subtitle="سجلّ الدول يعمل دون خريطة شارع"
              chevron
            />
          )}
          {onBrowseTrips && (
            <AppRow
              onClick={onBrowseTrips}
              leading={<Luggage className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              title="رحلاتي"
              subtitle="قوائم الرحلة والمسارات المحفوظة"
              chevron
            />
          )}
        </AppList>
      )}

      {state === 'offline' && (
        <p className="mt-auto px-1 text-center text-micro text-muted-foreground">
          {isExplore
            ? 'تُفتح خريطة الشارع تلقائيًا عند عودة الاتصال.'
            : 'الخريطة المباشرة تعود تلقائيًا عند عودة الاتصال.'}
        </p>
      )}
    </div>
  );
}

/** Graticule behind the dot poster: latitude/longitude, not decoration. */
function Graticule() {
  const meridians = Array.from({ length: 11 }, (_, index) => ((index + 1) / 12) * 100);
  const parallels = Array.from({ length: 5 }, (_, index) => ((index + 1) / 6) * 100);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full text-border"
    >
      <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.55" vectorEffect="non-scaling-stroke">
        {meridians.map((x) => (
          <line key={`m-${x}`} x1={x} y1={0} x2={x} y2={100} />
        ))}
        {parallels.map((y) => (
          <line key={`p-${y}`} x1={0} y1={y} x2={100} y2={y} />
        ))}
        <line x1={0} y1={50} x2={100} y2={50} strokeOpacity="0.9" strokeDasharray="3 3" />
      </g>
    </svg>
  );
}
