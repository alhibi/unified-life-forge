// ============================================================================
// CitySearchResult — single candidate row.
//
// Three visual states:
//   • highlighted (keyboard focus) — gradient accent strip + bright bg
//   • favourited (★ filled in primary)
//   • nearby (shows distance chip + a small "near" badge)
//
// The row is keyboard-focusable. The parent component manages
// selection via Enter / Space and arrow-key navigation.
// ============================================================================

import { Building2, MapPin, Star } from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { CityCandidate } from '../types/CitySearch';

interface CitySearchResultProps {
  candidate: CityCandidate;
  highlighted: boolean;
  isFavourite: boolean;
  onSelect: () => void;
  onToggleFavourite: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

function flagEmoji(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  try { return String.fromCodePoint(...codePoints); } catch { return ''; }
}

function formatDistance(km: number | null): string {
  if (km === null) return '';
  if (km < 1) return `${Math.round(km * 1000)} م`;
  if (km < 10) return `${km.toFixed(1)} كم`;
  return `${Math.round(km)} كم`;
}

function qualityBadge(score: number): { label: string; tint: string } | null {
  if (score >= 0.85) return { label: 'مطابقة تامة', tint: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  if (score >= 0.6) return { label: 'مطابقة قوية', tint: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' };
  if (score >= 0.3) return { label: 'مطابقة تقريبية', tint: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
  return null;
}

export function CitySearchResult({
  candidate,
  highlighted,
  isFavourite,
  onSelect,
  onToggleFavourite,
}: CitySearchResultProps) {
  const flag = flagEmoji(candidate.countryCode);
  const badge = qualityBadge(candidate.matchScore);
  const distance = formatDistance(candidate.distanceKm);
  const subtitleParts: string[] = [];
  if (candidate.admin1) subtitleParts.push(candidate.admin1);
  if (candidate.country) subtitleParts.push(candidate.country);

  return (
    <div
      role="option"
      aria-selected={highlighted}
      data-highlighted={highlighted || undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={highlighted ? 0 : -1}
      className={cn(
        'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer',
        'transition-all duration-150 outline-none',
        highlighted
          ? 'bg-primary/8 ring-1 ring-primary/30 shadow-[0_2px_8px_hsl(var(--primary)/0.10)]'
          : 'hover:bg-foreground/5 focus-visible:bg-foreground/5',
      )}
      dir="rtl"
    >
      {highlighted && (
        <span
          aria-hidden
          className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-gradient-to-b from-primary to-primary/40"
        />
      )}

      {/* Icon */}
      <span
        className={cn(
          'shrink-0 grid place-items-center w-9 h-9 rounded-lg',
          isFavourite ? 'bg-primary/15 text-primary' : 'bg-foreground/8 text-foreground/55',
        )}
        aria-hidden
      >
        {isFavourite ? <Star className="w-4 h-4 fill-primary" /> : <MapPin className="w-4 h-4" />}
      </span>

      {/* Name + subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-bold text-meta text-foreground truncate">
            {candidate.nameAr ?? candidate.name}
          </span>
          {flag && (
            <span className="text-base shrink-0" title={candidate.country}>
              {flag}
            </span>
          )}
          {candidate.population !== undefined && candidate.population > 50000 && (
            <Building2 className="w-3 h-3 text-muted-foreground/55 shrink-0" aria-hidden />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[0.6875rem] text-foreground/65 truncate">
          {subtitleParts.length > 0 && (
            <span className="truncate">{subtitleParts.join(' · ')}</span>
          )}
          {candidate.elevation !== undefined && (
            <span className="tabular-nums shrink-0 text-primary/75 font-bold">
              {`${Math.round(candidate.elevation)}م`}
            </span>
          )}
        </div>
      </div>

      {/* Right side: distance + badge + favourite toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <span
            className={cn(
              'hidden sm:inline-block text-[0.625rem] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md',
              badge.tint,
            )}
          >
            {badge.label}
          </span>
        )}
        {distance && (
          <span className="text-[0.625rem] font-bold tracking-wide tabular-nums text-foreground/55">
            {distance}
          </span>
        )}
        <button
          onClick={onToggleFavourite}
          aria-label={isFavourite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          aria-pressed={isFavourite}
          className={cn(
            'shrink-0 w-8 h-8 grid place-items-center rounded-lg transition-colors',
            isFavourite
              ? 'text-primary hover:bg-primary/15'
              : 'text-foreground/30 hover:text-primary hover:bg-foreground/8',
          )}
        >
          <Star className={cn('w-4 h-4', isFavourite && 'fill-primary')} />
        </button>
      </div>
    </div>
  );
}