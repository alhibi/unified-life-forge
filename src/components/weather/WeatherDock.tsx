/**
 * WeatherDock — bottom navigation dock that lives ONLY inside the
 * `/weather` hub. While any /weather route is mounted, the app-level
 * `BottomNav` is hidden (see `src/components/BottomNav.tsx`) and this
 * dock takes over with the four hub-specific tabs:
 *
 *   Today  •  Radar  •  Forecast  •  Places
 *
 * The hub is single-route — tabs are controlled by parent state and
 * the dock is purely presentational. Active tab gets the copper
 * `--live` accent + a soft pill background, matching the reference.
 */
import { CalendarDots, Map, MapPin, MoonStar, type LucideIcon } from '@/lib/icons';

export type WeatherTab = 'today' | 'radar' | 'forecast' | 'places';

interface TabDef {
  key: WeatherTab;
  icon: LucideIcon;
  label: { ar: string; de: string };
}

const TABS: TabDef[] = [
  { key: 'today',    icon: MoonStar,     label: { ar: 'اليوم',   de: 'Today'    } },
  { key: 'radar',    icon: Map,          label: { ar: 'الرادار', de: 'Radar'    } },
  { key: 'forecast', icon: CalendarDots, label: { ar: 'التوقّع',  de: 'Forecast' } },
  { key: 'places',   icon: MapPin,       label: { ar: 'الأماكن', de: 'Places'   } },
];

export default function WeatherDock({
  active, onChange, isAr,
}: {
  active: WeatherTab; onChange: (t: WeatherTab) => void; isAr: boolean;
}) {
  return (
    <nav
      aria-label={isAr ? 'تنقّل قسم الطقس' : 'Weather navigation'}
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        left: 10,
        right: 10,
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        // Force LTR layout so 'Today' is always leftmost regardless of
        // app direction — matches the reference exactly.
        dir="ltr"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 62,
          width: '100%',
          maxWidth: 520,
          background: 'hsl(var(--card) / 0.82)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          backdropFilter:       'blur(28px) saturate(180%)',
          border: '1px solid hsl(var(--border) / 0.45)',
          borderRadius: 999,
          boxShadow:
            '0 12px 32px -12px rgba(0,0,0,0.55), 0 2px 8px -2px rgba(0,0,0,0.35), inset 0 1px 0 hsl(var(--foreground) / 0.04)',
          pointerEvents: 'auto',
          padding: '0 6px',
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label[isAr ? 'ar' : 'de']}
              className="weather-dock-tab"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: 'transparent',
                border: 'none',
                padding: '6px 0',
                cursor: 'pointer',
                position: 'relative',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'hsl(var(--live) / 0.18)' : 'transparent',
                  transition: 'background 0.22s ease',
                }}
              >
                <Icon
                  size={18}
                  weight={isActive ? 'fill' : 'regular'}
                  style={{
                    color: isActive
                      ? 'hsl(var(--live))'
                      : 'hsl(var(--muted-foreground) / 0.78)',
                    transform: isActive ? 'scale(1.04)' : 'scale(1)',
                    transition: 'color 0.25s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? 'hsl(var(--live))'
                    : 'hsl(var(--muted-foreground) / 0.8)',
                  letterSpacing: 0.1,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label[isAr ? 'ar' : 'de']}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Padding the hub reserves at the bottom so content never hides
 *  behind the floating dock. */
export const WEATHER_DOCK_RESERVE = 104;