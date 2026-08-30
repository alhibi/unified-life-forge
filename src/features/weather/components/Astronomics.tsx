// ============================================================================
// Astronomics — sun position, solar radiation, lunar phase, golden hour.
// Compact card with six micro-metrics arranged in a 3×2 grid.
// ============================================================================

import { Moon, Sparkles, Sun } from '@/lib/icons';

import { timeLabel } from '../lib/utils';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { Metric } from './WeatherPanels';

interface AstronomicsProps {
  snapshot: WeatherSnapshot;
  locale: string;
  moonGlyph: string;
}

export function Astronomics({ snapshot, locale, moonGlyph }: AstronomicsProps) {
  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
            <Sun className="w-5 h-5 text-primary" aria-hidden />
            {'الفلك والقمر'}
          </h2>
          <p className="mt-1 text-mini text-foreground/65 leading-snug">
            {'مواقع الشمس والقمر والإشعاع والساعات الذهبية'}
          </p>
        </div>
        <Moon className="w-5 h-5 text-primary/55 shrink-0" aria-hidden />
      </header>
      <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
        <Metric
          label="طول النهار"
          hint="من الشروق للغروب"
          value={snapshot.astronomical.day_length_hours.toFixed(1)}
          unit="س"
        />
        <Metric
          label="ارتفاع الشمس"
          hint={`سمت ${snapshot.solar.solar_azimuth_deg.toFixed(0)}°`}
          value={Math.round(snapshot.solar.solar_elevation_deg).toString()}
          unit="°"
        />
        <Metric
          label="إشعاع شمسي"
          hint="Global Horizontal"
          value={Math.round(snapshot.solar.ghi_wm2).toString()}
          unit="W/m²"
        />
        <Metric
          label="إشعاع مباشر"
          hint="Direct Normal"
          value={
            snapshot.solar.dni_wm2 !== null
              ? Math.round(snapshot.solar.dni_wm2).toString()
              : '—'
          }
          unit={snapshot.solar.dni_wm2 !== null ? 'W/m²' : ''}
        />
        <Metric
          label="إضاءة القمر"
          hint={snapshot.astronomical.moon_phase_name.replace(/_/g, ' ')}
          value={`${moonGlyph} ${snapshot.astronomical.moon_illumination_percent.toFixed(0)}٪`}
        />
        <Metric
          label="الساعة الذهبية"
          hint="مساءً"
          icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
          value={timeLabel(snapshot.astronomical.golden_hour_evening_start, locale)}
        />
      </div>
    </section>
  );
}