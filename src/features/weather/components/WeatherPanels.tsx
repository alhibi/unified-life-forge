import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

/**
 * WeatherPanel — Standardized panel component for weather feature.
 * Backed by UnifiedCard (section variant). Kept for backward compatibility
 * with the older components — new code should reach for UnifiedCard directly.
 */
export interface WeatherPanelProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  accentLine?: boolean;
  padding?: 'default' | 'compact' | 'none';
  elevated?: boolean;
}

export function WeatherPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
  accentLine = true,
  padding = 'default',
  elevated = true,
}: WeatherPanelProps) {
  const paddingClasses: Record<'default' | 'compact' | 'none', string> = {
    default: 'p-4',
    compact: 'px-4 py-3',
    none: '',
  };

  return (
    <section className={`relative rounded-2xl ${elevated ? 'surface-depth' : 'bg-card/60'} overflow-hidden border border-border/40 ${className}`}>
      {accentLine && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
      )}
      {(title || subtitle || action) && (
        <header className="flex items-end justify-between gap-3 px-5 pt-5 pb-2">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="font-bold text-lead leading-tight text-foreground truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-mini text-foreground/65 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </section>
  );
}

/**
 * WeatherSection — Lightweight section with header.
 * Used to group related content without card chrome.
 */
export interface WeatherSectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export function WeatherSection({
  title,
  subtitle,
  children,
  className = '',
  gap = 'md',
}: WeatherSectionProps) {
  const gapClasses = {
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6',
  };

  return (
    <section className={`${gapClasses[gap]} ${className}`}>
      {(title || subtitle) && (
        <header className="flex items-end justify-between gap-3">
          {title && (
            <h3 className="font-bold text-lead leading-tight text-foreground">
              {title}
            </h3>
          )}
          {subtitle && (
            <span className="text-[0.625rem] tracking-[0.18em] uppercase text-foreground/55 font-bold tabular-nums">
              {subtitle}
            </span>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Metric — Standardized metric display for weather data.
 * Inline label + value + hint, with optional trend chip.
 */
export interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Metric({
  label,
  value,
  unit,
  hint,
  icon,
  trend,
  trendValue,
  className = '',
  size = 'md',
}: MetricProps) {
  const valueSizeClasses = {
    sm: 'text-meta',
    md: 'text-lead',
    lg: 'text-title',
  };

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-center gap-1.5 text-[0.625rem] tracking-[0.18em] uppercase text-foreground/60 font-bold truncate">
        {icon && (
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-primary shrink-0">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
        {trend && trendValue && (
          <span
            className={`shrink-0 text-[0.625rem] font-bold tabular-nums ${
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400'
                : trend === 'down' ? 'text-rose-600 dark:text-rose-400'
                : 'text-muted-foreground'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      <div className={`mt-1 flex items-baseline gap-1 tabular-nums ${valueSizeClasses[size]}`} dir="ltr">
        <span className="font-bold text-foreground">{value}</span>
        {unit && <span className="text-mini text-primary/85 font-bold">{unit}</span>}
      </div>
      {hint && (
        <p className="mt-1 text-mini text-foreground/65 font-medium truncate">{hint}</p>
      )}
    </div>
  );
}

/**
 * GaugeTile — Circular gauge with animated progress.
 * For percentage-based metrics (UV, humidity, cloud cover, etc.).
 *
 * New design: gradient stroke, larger dial, better typographic hierarchy.
 */
export interface GaugeTileProps {
  label: string;
  value: string | number;
  unit?: string;
  pctValue: number; // 0-1
  hint?: string;
  icon?: ReactNode;
  className?: string;
}

export function GaugeTile({
  label,
  value,
  unit,
  pctValue,
  hint,
  icon,
  className = '',
}: GaugeTileProps) {
  const clamped = Math.max(0, Math.min(1, pctValue));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className={`group relative rounded-2xl border border-border/40 surface-depth overflow-hidden p-4 min-w-0 h-full transition-all hover:-translate-y-0.5 hover:border-border/70 ${className}`}>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/65 truncate">
          {label}
        </span>
        {icon && (
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-primary/70 shrink-0 transition-colors group-hover:text-primary">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 88 88" className="w-16 h-16 shrink-0 -rotate-90">
          <defs>
            <linearGradient id={`gauge-tile-grad-${label}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="hsl(var(--foreground) / 0.10)"
            strokeWidth="6"
          />
          <motion.circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={`url(#gauge-tile-grad-${label})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
            <span className="font-bold text-[1.75rem] leading-none text-foreground tracking-tight">
              {value}
            </span>
            {unit && <span className="text-mini font-bold text-primary/75">{unit}</span>}
          </div>
          {hint && (
            <p className="mt-1.5 text-mini text-foreground/65 font-medium truncate">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}