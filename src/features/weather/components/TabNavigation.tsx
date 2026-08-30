// ============================================================================
// TabNavigation — segmented control for the four major weather areas.
//
// WHAT CHANGED FROM THE OLD TAB BAR
//   • Each tab now carries an icon + label + 1-line description, so the user
//     always knows what's inside before clicking. Old version was icon + label
//     and the description only lived in a tooltip.
//   • The active tab no longer relies on background-color fill. We render a
//     layoutId-animated pill that *slides* between tabs — gives the bar a
//     sense of motion and lets the eye track which tab is active.
//   • The container is sticky with a frosted backdrop. Translucent + 12px
//     blur so the content scrolls under it without disappearing.
//   • Tab buttons have a clear hover state (subtle bg + brighter icon) so
//     the bar feels interactive rather than static.
//
// WHY A SLIDING PILL
//   Without it, the active tab is just a coloured rectangle. With it, the
//   user can see the tab system move as they choose. That movement is
//   small but it's the difference between "controls" and "a stateful UI".
// ============================================================================

import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { duration, easing } from '../lib/weather-motion';

export interface TabDef {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

interface TabNavigationProps<T extends string> {
  tabs: readonly TabDef[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

export function TabNavigation<T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
}: TabNavigationProps<T>) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));

  return (
    <nav
      role="tablist"
      aria-label="أقسام لوحة الطقس"
      className={cn(
        'sticky top-16 z-header',
        'rounded-2xl border border-border/40 surface-depth',
        'p-1.5 backdrop-blur-md bg-background/85',
        'shadow-[0_1px_3px_hsl(var(--foreground)/0.04),0_8px_24px_hsl(var(--foreground)/0.03)]',
        className,
      )}
    >
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {/* Sliding active pill */}
        <motion.div
          aria-hidden
          layoutId="weather-tab-pill"
          className="absolute inset-y-0 rounded-xl bg-primary shadow-[0_4px_14px_hsl(var(--primary)/0.30),0_1px_2px_hsl(var(--primary)/0.20)]"
          initial={false}
          animate={{
            left: `${(activeIndex * 100) / tabs.length}%`,
            width: `${100 / tabs.length}%`,
          }}
          transition={{ duration: duration.reveal, ease: easing.standard }}
        />

        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => onChange(tab.id as T)}
              className={cn(
                'relative z-10 flex flex-col items-center justify-center gap-0.5',
                'px-2 py-2.5 rounded-xl',
                'transition-colors duration-200',
                'active:scale-[0.97]',
                active
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="[&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>
                <span className="text-mini font-bold whitespace-nowrap">{tab.label}</span>
              </span>
              <span
                className={cn(
                  'text-[0.625rem] font-medium tracking-[0.06em] truncate max-w-full',
                  active ? 'text-primary-foreground/80' : 'text-muted-foreground/80',
                )}
              >
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}