import { AppCard } from '@/components/ui/app-shell';
import {
  Bus,
  Calendar,
  Info,
  Languages,
  PiggyBank,
  ShieldAlert,
  Smartphone,
  Zap,
} from '@/lib/icons';

import { formatMonths, MONTH_SHORT } from '../data/categories';
import { BLOC_LABELS, BLOC_NOTES, countryFacts } from '../data/countryFacts';
import { bestMonthsAcross } from '../lib/stats';
import type { TravelCountry, TravelPlace } from '../types';

interface CountryFactsPanelProps {
  country: TravelCountry;
  /** The user's own places here — drives the personal season strip. */
  places: TravelPlace[];
}

/**
 * The country briefing.
 *
 * These are the six things a traveller looks up on the taxi ride from the
 * airport: what the money is called, which plug fits, what number to dial, which
 * side they drive on, whether to tip, and when the country is actually pleasant.
 * Entry rules are deliberately NOT asserted — they depend on the reader's own
 * passport and change constantly, so the card names the travel bloc and points
 * at checking rather than pretending to know.
 */
export default function CountryFactsPanel({ country, places }: CountryFactsPanelProps) {
  const facts = countryFacts(country.isoCode);
  const personalMonths = bestMonthsAcross(places);

  if (!facts) {
    return (
      <AppCard className="text-center">
        <Info className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-body text-muted-foreground">
          لم تُضف بطاقة معلومات لـ{country.nameAr} بعد.
        </p>
      </AppCard>
    );
  }

  const rows = [
    { icon: PiggyBank, label: 'العملة', value: `${facts.currencyAr} · ${facts.currencyCode}` },
    { icon: Languages, label: 'اللغة', value: facts.languagesAr },
    {
      icon: Zap,
      label: 'الكهرباء',
      value: `${facts.voltage} · قابس ${facts.plugs.join('/')}`,
    },
    { icon: ShieldAlert, label: 'رقم الطوارئ', value: facts.emergency },
    { icon: Smartphone, label: 'مفتاح الاتصال', value: facts.callingCode },
    {
      icon: Bus,
      label: 'اتجاه السير',
      value: facts.driveSide === 'right' ? 'يمين الطريق' : 'يسار الطريق',
    },
    { icon: PiggyBank, label: 'البقشيش', value: facts.tipping },
  ];

  return (
    <div className="app-stack">
      <AppCard>
        <p className="text-body leading-7 text-foreground/90">{facts.note}</p>
      </AppCard>

      <section>
        <h3 className="app-section-label">أساسيات</h3>
        <AppCard className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.label} className="flex items-start gap-3 px-4 py-3">
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-micro uppercase tracking-[0.08em] text-muted-foreground">
                      {row.label}
                    </span>
                    <span className="mt-0.5 block text-body text-foreground">{row.value}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </AppCard>
      </section>

      <section>
        <h3 className="app-section-label">موسم السفر</h3>
        <AppCard className="space-y-4">
          <SeasonStrip
            title="الأشهر المعتادة للزيارة"
            months={facts.bestMonths}
            caption={formatMonths(facts.bestMonths) ?? '—'}
          />
          {personalMonths.length > 0 && (
            <SeasonStrip
              title="حسب أماكنك المسجّلة"
              months={personalMonths}
              caption={formatMonths(personalMonths) ?? '—'}
            />
          )}
        </AppCard>
      </section>

      {facts.bloc && (
        <section>
          <h3 className="app-section-label">الدخول</h3>
          <AppCard className="flex items-start gap-3">
            <Calendar
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-body font-semibold text-foreground">{BLOC_LABELS[facts.bloc]}</p>
              <p className="mt-1 text-mini text-muted-foreground">{BLOC_NOTES[facts.bloc]}</p>
            </div>
          </AppCard>
        </section>
      )}
    </div>
  );
}

function SeasonStrip({
  title,
  months,
  caption,
}: {
  title: string;
  months: number[];
  caption: string;
}) {
  const selected = new Set(months);
  return (
    <div>
      <p className="mb-2 text-micro text-muted-foreground">{title}</p>
      {/* Twelve cells encoding a real boolean per month, not decoration. */}
      <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-12" aria-label={title}>
        {MONTH_SHORT.map((short, index) => (
          <li
            key={short}
            className="travel-month-cell"
            data-selected={selected.has(index + 1)}
            aria-current={selected.has(index + 1) ? 'true' : undefined}
          >
            {short}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-mini text-foreground">{caption}</p>
    </div>
  );
}
