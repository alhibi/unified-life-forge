import { MapPinned, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';

import AddPlaceSheet from '../components/AddPlaceSheet';
import { useTravelCountries } from '../hooks';
import type { TravelCountry } from '../types';

export default function TravelAtlasPage() {
  const { } = useApp();
  const navigate = useNavigate();
  const { data: countries = [], isLoading, error } = useTravelCountries();
  const [addOpen, setAddOpen] = useState(false);
  const totalPlaces = useMemo(
    () => countries.reduce((total, country) => total + country.placesCount, 0),
    [countries],
  );
  const maxCount = Math.max(...countries.map((country) => country.placesCount), 1);

  const openCountry = (country: TravelCountry) => {
    navigate(`/travel-atlas/${country.id}`, { state: { country } });
  };

  return (
    <div className="page-shell page-shell-flush">
      <SEO
        title={'أطلس الرحلات — amv.life'}
        description={
          'دليل شخصي للأماكن التي تستحق الرحلة.'
        }
        path="/travel-atlas"
      />
      <PageHeader
        title={'أطلس الرحلات'}
        subtitle={
          totalPlaces > 0
            ? `${totalPlaces} مكانًا محفوظًا`
            : 'دليلك الشخصي للأماكن'
        }
        icon={<MapPinned className="h-5 w-5 text-[hsl(var(--live))]" aria-hidden="true" />}
        sticky
        right={
          totalPlaces > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {'إضافة'}
            </Button>
          ) : null
        }
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {isLoading ? (
          <CountryGridSkeleton />
        ) : error ? (
          <div className="empty-state empty-state-surface min-h-[45dvh]" role="alert">
            <strong>{'تعذّر تحميل الأطلس'}</strong>
            <span>
              {'تحقق من الاتصال ثم حاول مجددًا.'}
            </span>
          </div>
        ) : totalPlaces === 0 ? (
          <div className="empty-state empty-state-surface min-h-[55dvh]">
            <MapPinned data-empty-icon aria-hidden="true" />
            <strong>
              {'أضف مكانك الأول، ولتبدأ الخريطة.'}
            </strong>
            <Button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-6 gap-2"
              size="lg"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {'إضافة مكان'}
            </Button>
          </div>
        ) : (
          <section
            className="grid grid-cols-12 gap-x-4 gap-y-7"
            aria-label={'الدول حسب كثافة الأماكن'}
          >
            {countries.map((country, index) => (
              <CountryTile
                key={country.id}
                country={country}
                maxCount={maxCount}
                rank={index}
                onOpen={() => openCountry(country)}
              />
            ))}
          </section>
        )}
      </main>

      <AddPlaceSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function CountryTile({
  country,
  maxCount,
  rank,
  onOpen,
}: {
  country: TravelCountry;
  maxCount: number;
  rank: number;
  onOpen: () => void;
}) {
  const density = Math.max(country.placesCount / maxCount, 0.08);
  const tier = density >= 0.66 ? 'hero' : density >= 0.3 ? 'large' : 'compact';
  const spanClass =
    tier === 'hero'
      ? 'col-span-12 sm:col-span-8'
      : tier === 'large'
        ? 'col-span-12 sm:col-span-6 lg:col-span-4'
        : 'col-span-6 sm:col-span-4 lg:col-span-3';
  const titleClass =
    tier === 'hero'
      ? 'text-[clamp(1.75rem,5vw,3.5rem)]'
      : tier === 'large'
        ? 'text-[clamp(1.35rem,3vw,2.25rem)]'
        : 'text-title';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${spanClass} group min-h-28 border-b border-border px-1 py-3 text-start transition-colors hover:border-[hsl(var(--live))] focus-visible:border-[hsl(var(--live))]`}
      style={{ animationDelay: `${Math.min(rank * 35, 210)}ms` }}
      aria-label={`${country.nameAr}, ${country.placesCount}`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span
            className={`${titleClass} block font-semibold leading-[1.1] tracking-tight text-foreground`}
          >
            {country.nameAr}
          </span>
          <span className="mt-1 block text-micro uppercase tracking-[0.14em] text-muted-foreground">
            {country.nameEn}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-micro tabular-nums text-muted-foreground">
          {country.placesCount}
        </span>
      </span>
      <span className="mt-5 block h-px bg-border" aria-hidden="true">
        <span
          className="block h-px origin-start bg-[hsl(var(--live))] transition-[width] duration-normal ease-out-expo group-hover:w-full"
          style={{ width: `${Math.round(18 + density * 82)}%` }}
        />
      </span>
    </button>
  );
}

function CountryGridSkeleton() {
  const spans = [
    'col-span-12 sm:col-span-8',
    'col-span-12 sm:col-span-4',
    'col-span-6 sm:col-span-5',
    'col-span-6 sm:col-span-3',
    'col-span-6 sm:col-span-4',
    'col-span-6 sm:col-span-4',
  ];

  return (
    <div className="grid grid-cols-12 gap-x-4 gap-y-7" aria-label="Loading">
      {spans.map((spanClass, index) => (
        <div key={index} className={`${spanClass} min-h-28 border-b border-border py-3`}>
          <div className="skeleton h-7 w-2/3" />
          <div className="skeleton mt-2 h-3 w-1/3" />
          <div className="skeleton mt-8 h-px w-full" />
        </div>
      ))}
    </div>
  );
}
