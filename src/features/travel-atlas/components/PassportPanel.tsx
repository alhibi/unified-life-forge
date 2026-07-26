import { AppCard } from '@/components/ui/app-shell';
import { Globe, Heart, Image as ImageIcon, MapPinned, Star, Trees } from '@/lib/icons';

import { categoryMeta, MONTH_SHORT } from '../data/categories';
import { formatDistance } from '../lib/geo';
import type { CountrySummary, PassportStats } from '../lib/stats';

interface PassportPanelProps {
  passport: PassportStats;
  summaries: CountrySummary[];
  /** Countries stamped on the country map, with or without a saved place. */
  stampCount?: number;
}

/**
 * The traveller's own record.
 *
 * Not gamification — no badges, no points. These are the facts a frequent
 * traveller actually likes to see about themselves: how much ground the atlas
 * covers, what kind of places they keep choosing, and which months they
 * habitually travel in. All derived from data already on screen elsewhere, so
 * nothing here can disagree with the map.
 */
export default function PassportPanel({ passport, summaries, stampCount = 0 }: PassportPanelProps) {
  const peakMonth = Math.max(...passport.monthHistogram, 1);
  const topCategories = passport.categoryBreakdown.slice(0, 6);
  const maxCategory = topCategories[0]?.count ?? 1;

  // A record can consist of stamped countries alone — someone who marked twenty
  // countries on the poster and has not pinned a single café still has a record.
  if (passport.totalPlaces === 0 && stampCount === 0) {
    return (
      <div className="empty-state empty-state-surface min-h-[40dvh]">
        <MapPinned data-empty-icon aria-hidden="true" />
        <strong>لا سجل بعد</strong>
        <span>أضف أماكن إلى أطلسك وسيتكوّن سجلّك تلقائيًا.</span>
      </div>
    );
  }

  return (
    <div className="app-stack">
      <section>
        <h3 className="app-section-label">الحصيلة</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={MapPinned} value={passport.totalPlaces} label="مكانًا" />
          <StatTile icon={Globe} value={passport.countriesTouched} label="دولة" />
          <StatTile icon={Trees} value={passport.citiesTouched} label="مدينة" />
          <StatTile icon={ImageIcon} value={passport.photosCount} label="صورة" />
        </ul>
      </section>

      <section>
        <h3 className="app-section-label">مسار الزيارات</h3>
        <AppCard className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-body text-foreground">زرتها فعلًا</span>
              <span className="font-mono text-mini tabular-nums text-muted-foreground">
                {passport.visitedPlaces} / {passport.totalPlaces}
              </span>
            </div>
            {/* Width encodes the visited ratio — a quantity, not decoration. */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full bg-[hsl(var(--success))]"
                style={{ width: `${Math.round(passport.completion * 100)}%` }}
              />
            </div>
          </div>

          <ul className="grid grid-cols-3 gap-3 text-center">
            <SplitStat value={passport.visitedPlaces} label="زرته" />
            <SplitStat value={passport.plannedPlaces} label="مخطَّط" />
            <SplitStat value={passport.wishlistPlaces} label="أمنية" />
          </ul>
        </AppCard>
      </section>

      <section>
        <h3 className="app-section-label">شهور سفرك</h3>
        <AppCard>
          {/* Twelve bars, height proportional to visits recorded in that month. */}
          <ul className="flex h-24 items-end gap-1.5" aria-label="عدد الزيارات لكل شهر">
            {passport.monthHistogram.map((count, index) => (
              <li
                key={MONTH_SHORT[index]}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <span
                  className="w-full rounded-sm bg-[hsl(var(--live)/0.35)]"
                  style={{ height: `${Math.max(2, Math.round((count / peakMonth) * 68))}px` }}
                  aria-hidden="true"
                />
                <span className="truncate text-micro text-muted-foreground">
                  {MONTH_SHORT[index]}
                </span>
              </li>
            ))}
          </ul>
          {passport.firstVisitOn && passport.lastVisitOn && (
            <p className="mt-3 text-micro text-muted-foreground" dir="ltr">
              {passport.firstVisitOn} — {passport.lastVisitOn}
            </p>
          )}
        </AppCard>
      </section>

      <section>
        <h3 className="app-section-label">ما تختاره عادةً</h3>
        <AppCard className="space-y-2.5">
          {topCategories.map((entry) => {
            const meta = categoryMeta(entry.category);
            const Icon = meta.icon;
            return (
              <div key={entry.category} className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="w-24 shrink-0 truncate text-mini text-foreground">
                  {meta.label}
                </span>
                {/* Bar length encodes the count relative to the top category. */}
                <span
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full bg-[hsl(var(--live))]"
                    style={{ width: `${Math.round((entry.count / maxCategory) * 100)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-end font-mono text-micro tabular-nums text-muted-foreground">
                  {entry.count}
                </span>
              </div>
            );
          })}
        </AppCard>
      </section>

      <section>
        <h3 className="app-section-label">أرقام لافتة</h3>
        <AppCard className="p-0">
          <ul className="divide-y divide-border">
            <FactLine label="اتساع الأطلس" value={formatDistance(passport.spanMeters)} />
            <FactLine label="قارات لمستها" value={String(passport.continentsTouched)} />
            <FactLine
              label="دول زرتها فعلًا"
              value={`${passport.countriesVisited} من ${passport.countriesTouched}`}
            />
            {passport.averageRating !== null && (
              <FactLine label="متوسط تقييمك" value={passport.averageRating.toFixed(1)} />
            )}
            {passport.northernmost && (
              <FactLine label="أقصى نقطة شمالًا" value={passport.northernmost.nameAr} />
            )}
            {passport.southernmost && (
              <FactLine label="أقصى نقطة جنوبًا" value={passport.southernmost.nameAr} />
            )}
          </ul>
        </AppCard>
      </section>

      {summaries.length > 0 && (
        <section>
          <h3 className="app-section-label">أكثر الدول حضورًا</h3>
          <AppCard className="p-0">
            <ul className="divide-y divide-border">
              {summaries.slice(0, 5).map((summary) => (
                <li key={summary.country.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-body text-foreground">
                    {summary.country.nameAr}
                  </span>
                  {summary.favorites > 0 && (
                    <span className="inline-flex items-center gap-1 text-micro text-muted-foreground">
                      <Heart className="h-3 w-3 text-[hsl(var(--live))]" fill="currentColor" />
                      {summary.favorites}
                    </span>
                  )}
                  <span className="font-mono text-mini tabular-nums text-muted-foreground">
                    {summary.visited}/{summary.total}
                  </span>
                </li>
              ))}
            </ul>
          </AppCard>
        </section>
      )}

      {passport.favoritePlaces > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-micro text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-[hsl(var(--live))]" fill="currentColor" />
          {passport.favoritePlaces} مكانًا في مفضّلتك
        </p>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Globe;
  value: number;
  label: string;
}) {
  return (
    <li className="app-card app-card-compact text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <p className="mt-1.5 font-mono text-title tabular-nums text-foreground">{value}</p>
      <p className="text-micro text-muted-foreground">{label}</p>
    </li>
  );
}

function SplitStat({ value, label }: { value: number; label: string }) {
  return (
    <li>
      <p className="font-mono text-lead tabular-nums text-foreground">{value}</p>
      <p className="text-micro text-muted-foreground">{label}</p>
    </li>
  );
}

function FactLine({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-mini text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-body text-foreground">{value}</span>
    </li>
  );
}
