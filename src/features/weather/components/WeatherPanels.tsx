import { type ReactNode } from 'react';

/**
 * WeatherPanel — Standardized panel component for weather feature
 * Provides consistent styling, header, and content spacing
 * Follows Zen Elite design system (no hardcoded colors)
 */
export interface WeatherPanelProps {
  /** Main panel title */
  title?: string;
  /** Subtitle/description (shown next to title) */
  subtitle?: string;
  /** Optional action element (button, link, etc.) in header */
  action?: ReactNode;
  /** Panel children */
  children: ReactNode;
  /** Additional className for panel wrapper */
  className?: string;
  /** Whether to show the top accent line */
  accentLine?: boolean;
  /** Padding variant */
  padding?: 'default' | 'compact' | 'none';
  /** Whether to use elevated surface depth */
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
  const paddingClasses = {
    default: 'p-4',
    compact: 'px-4 py-3',
    none: '',
  };

  const headerPaddingClasses = {
    default: 'px-4 pt-4 pb-3',
    compact: 'px-4 py-2.5',
    none: '',
  };

  return (
    <section
      className={`relative rounded-2xl ${elevated ? 'surface-depth' : 'bg-card'} overflow-hidden border border-border/40 ${className}`}
    >
      {accentLine && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40"
        />
      )}
      {(title || subtitle || action) && (
        <header className={`flex items-end justify-between gap-3 ${headerPaddingClasses[padding]}`}>
          <div className="flex items-end gap-3 min-w-0">
            {title && (
              <h2 className="font-semibold text-lead leading-none text-foreground truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <span className="text-micro tracking-[0.15em] uppercase text-foreground/90 font-bold tabular-nums text-end whitespace-nowrap shrink-0">
                {subtitle}
              </span>
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
 * WeatherSection — Lightweight section without panel chrome
 * For grouping related content with consistent spacing
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
    md: 'space-y-5',
    lg: 'space-y-7',
  };

  return (
    <section className={`${gapClasses[gap]} ${className}`}>
      {(title || subtitle) && (
        <header className="flex items-end justify-between gap-3">
          {title && (
            <h3 className="font-medium text-base leading-none text-foreground">
              {title}
            </h3>
          )}
          {subtitle && (
            <span className="text-micro tracking-[0.12em] uppercase text-muted-foreground font-medium tabular-nums">
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
 * Metric — Standardized metric display for weather data
 * Replaces inline Metric components with consistent styling
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
  const sizeClasses = {
    sm: 'text-micro gap-1',
    md: 'text-lead gap-1.5',
    lg: 'text-display gap-2',
  };

  const labelSizeClasses = {
    sm: 'text-micro tracking-[0.1em]',
    md: 'text-micro tracking-[0.12em]',
    lg: 'text-mini tracking-[0.15em]',
  };

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`flex items-center gap-1.5 ${labelSizeClasses[size]} uppercase text-foreground/90 font-semibold truncate`}>
        {icon && (
          <span className="[&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-primary shrink-0">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
        {trend && trendValue && (
          <span
            className={`shrink-0 text-micro font-bold ${
              trend === 'up' ? 'text-emerald' : trend === 'down' ? 'text-rose' : 'text-muted-foreground'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      <div className={`mt-1 flex items-baseline gap-1 tabular-nums ${sizeClasses[size]}`} dir="ltr">
        <span className="font-bold text-foreground">{value}</span>
        {unit && <span className="text-primary/90 font-bold">{unit}</span>}
      </div>
      {hint && (
        <p className="mt-0.5 text-micro text-foreground/80 font-medium truncate">{hint}</p>
      )}
    </div>
  );
}

/**
 * GaugeTile — Circular gauge with animated progress
 * For percentage-based metrics (UV, humidity, cloud cover, etc.)
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
  const circumference = 2 * Math.PI * 33;

  return (
    <div className={`rounded-2xl surface-depth p-3.5 min-w-0 h-full ${className}`}>
      <div className="flex items-center justify-between gap-2 text-foreground/90 font-semibold">
        <span className="text-micro tracking-[0.12em] uppercase truncate">{label}</span>
        {icon && (
          <span className="[&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-primary shrink-0">{icon}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <svg viewBox="0 0 80 80" className="w-14 h-14 shrink-0 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="33"
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeOpacity="0.09"
            strokeWidth="7"
          />
          <circle
            cx="40"
            cy="40"
            r="33"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
            <span className="font-bold text-display leading-none text-foreground">{value}</span>
            {unit && <span className="text-micro text-primary/90 font-bold">{unit}</span>}
          </div>
          {hint && <p className="mt-1 text-micro text-foreground/80 font-medium truncate">{hint}</p>}
        </div>
      </div>
    </div>
  );
}