/**
 * CelestialRealmsLayout — Groups the portal applications beautifully into
 * four majestic, philosophically integrated realms representing Spirit, Mind, Body, and Play,
 * while still respecting search query filtering, sorting, and display preferences.
 */
import { AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

import { PORTAL_APPS, type PortalApp } from '@/components/portal/apps';
import AppTile from '@/components/portal/AppTile';
import { usePortalPrefs } from '@/components/portal/usePortalPrefs';
import { BookOpen, Brain, Dumbbell, Gamepad2 } from '@/lib/icons';

interface CelestialRealmsLayoutProps {
  visibleApps: readonly PortalApp[];
  query: string;
  list: boolean;
  focusedKey: string;
  unreadCount: number;
  onOpen: (app: PortalApp) => void;
  onInspect: (app: PortalApp) => void;
  onFocusApp: (app: PortalApp) => void;
  registerRef: (index: number, el: HTMLButtonElement | null) => void;
}

interface RealmDefinition {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const REALMS: RealmDefinition[] = [
  {
    key: 'spirit',
    title: 'محراب الروح',
    subtitle: 'Realm of Spirit',
    description: 'للقرآن والسنة وأذكار اليوم والسكينة',
    icon: BookOpen,
    color: 'text-amber-500',
  },
  {
    key: 'mind',
    title: 'ديوان الفكر',
    subtitle: 'Realm of Mind',
    description: 'لتدبر المعرفة والذاكرة الرقمية والرحلات والأدب',
    icon: Brain,
    color: 'text-blue-500',
  },
  {
    key: 'body',
    title: 'ميدان الجسد',
    subtitle: 'Realm of Body',
    description: 'للعافية وتتبع اللياقة وجداول التمارين ويومياتك',
    icon: Dumbbell,
    color: 'text-emerald-500',
  },
  {
    key: 'play',
    title: 'فسحة الروح',
    subtitle: 'Realm of Play',
    description: 'ألعاب شطرنج وسودوكو وتحديات بصرية ممتعة',
    icon: Gamepad2,
    color: 'text-rose-500',
  },
];

export default function CelestialRealmsLayout({
  visibleApps,
  query,
  list,
  focusedKey,
  unreadCount,
  onOpen,
  onInspect,
  onFocusApp,
  registerRef,
}: CelestialRealmsLayoutProps) {
  const { isPinned } = usePortalPrefs();

  /**
   * Grid sizing is driven by the *container* width, not the viewport, so the
   * same classes work whether the grid sits full-bleed on a phone or next to
   * the 300–340px desktop side panel. Card look is untouched — only how many
   * fit per row changes.
   */
  const gridClass = list
    ? 'grid grid-cols-1 gap-2'
    : 'grid grid-cols-1 gap-3 @[22rem]:grid-cols-2 @[40rem]:grid-cols-3 @[40rem]:gap-4 @[64rem]:grid-cols-4';

  // If there's an active query/filter, render flat matching applications for speed and clarity
  const isSearching = query.length > 0;

  // Group applications per realm
  const realmGroups = useMemo(() => {
    const groups: Record<string, PortalApp[]> = { spirit: [], mind: [], body: [], play: [] };
    for (const app of visibleApps) {
      if (groups[app.cat]) {
        groups[app.cat].push(app);
      }
    }
    return groups;
  }, [visibleApps]);

  if (isSearching) {
    return (
      <div className="@container space-y-4">
        <h3 className="app-section-label">نتائج البحث المطابقة</h3>
        <div className={gridClass}>
          <AnimatePresence initial={false} mode="popLayout">
            {visibleApps.map((app, index) => (
              <AppTile
                key={app.key}
                app={app}
                index={index}
                list={list}
                active={focusedKey === app.key}
                pinned={isPinned(app.key)}
                badge={app.key === 'chat' ? unreadCount : undefined}
                onOpen={onOpen}
                onInspect={onInspect}
                onFocusApp={onFocusApp}
                registerRef={registerRef}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Grouped Visual Layout when not active searching
  return (
    <div className="@container space-y-8 sm:space-y-10">
      {REALMS.map((realm) => {
        const appsInRealm = realmGroups[realm.key] || [];
        if (appsInRealm.length === 0) return null;

        const Icon = realm.icon;

        return (
          <section key={realm.key} className="space-y-4">
            {/* Philosophical Realm Header */}
            <div className="flex items-center gap-3 border-b border-border/40 pb-2">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/45 ${realm.color}`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h3 className="font-amiri text-title font-extrabold text-foreground">
                    {realm.title}
                  </h3>
                  <span className="hidden text-micro font-mono uppercase tracking-widest text-muted-foreground opacity-60 @[26rem]:inline">
                    {realm.subtitle}
                  </span>
                </div>
                <p className="mt-0.5 text-micro leading-normal text-muted-foreground">
                  {realm.description}
                </p>
              </div>
            </div>

            {/* Realm Apps Grid */}
            <div className={gridClass}>
              <AnimatePresence initial={false} mode="popLayout">
                {appsInRealm.map((app) => {
                  // Find raw index in the master registry to keep stagger calculations correct
                  const registryIndex = PORTAL_APPS.findIndex((a) => a.key === app.key);
                  return (
                    <AppTile
                      key={app.key}
                      app={app}
                      index={registryIndex !== -1 ? registryIndex : 0}
                      list={list}
                      active={focusedKey === app.key}
                      pinned={isPinned(app.key)}
                      badge={app.key === 'chat' ? unreadCount : undefined}
                      onOpen={onOpen}
                      onInspect={onInspect}
                      onFocusApp={onFocusApp}
                      registerRef={registerRef}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        );
      })}
    </div>
  );
}
