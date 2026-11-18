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
import { widgetSpans } from '@/components/portal/widgetSpans';
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
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone: 1 | 2 | 4 | 6;
}

const REALMS: RealmDefinition[] = [
  {
    key: 'spirit',
    title: 'محراب الروح',
    description: 'للقرآن والسنة وأذكار اليوم والسكينة',
    icon: BookOpen,
    tone: 1,
  },
  {
    key: 'mind',
    title: 'ديوان الفكر',
    description: 'لتدبر المعرفة والذاكرة الرقمية والرحلات والأدب',
    icon: Brain,
    tone: 4,
  },
  {
    key: 'body',
    title: 'ميدان الجسد',
    description: 'للعافية وتتبع اللياقة وجداول التمارين ويومياتك',
    icon: Dumbbell,
    tone: 2,
  },
  {
    key: 'play',
    title: 'فسحة الروح',
    description: 'ألعاب شطرنج وسودوكو وتحديات بصرية ممتعة',
    icon: Gamepad2,
    tone: 6,
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
    : 'portal-widget-grid grid grid-cols-2 gap-3 @[40rem]:grid-cols-3 @[40rem]:gap-4 @[64rem]:grid-cols-4';

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

  const searchSpans = useMemo(() => widgetSpans(visibleApps.length), [visibleApps.length]);

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
                wide={searchSpans[index]}
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
    <div className="@container app-stack">
      {REALMS.map((realm) => {
        const appsInRealm = realmGroups[realm.key] || [];
        if (appsInRealm.length === 0) return null;

        const Icon = realm.icon;
        const spans = widgetSpans(appsInRealm.length);

        return (
          <section key={realm.key} className="space-y-4" data-tile-tone={realm.tone}>
            {/* Section header: a quiet realm label, one line of purpose and the
                count. The realm is a *grouping*, not a title competing with the
                page: its label sits one step below the launcher headline so the
                app faces below stay the primary content. The English realm
                subtitle is gone — Arabic is the only interface language (D3). */}
            <div className="flex items-center gap-2.5 pb-1">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tile-container text-tile-container-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <h3 className="text-meta font-semibold text-foreground">{realm.title}</h3>
                <p className="min-w-0 truncate text-mini text-muted-foreground">
                  {realm.description}
                </p>
              </div>
              <span className="shrink-0 text-mini tabular-nums text-muted-foreground">
                {appsInRealm.length}
              </span>
            </div>

            {/* Realm Apps Grid */}
            <div className={gridClass}>
              <AnimatePresence initial={false} mode="popLayout">
                {appsInRealm.map((app, position) => {
                  // Find raw index in the master registry to keep stagger calculations correct
                  const registryIndex = PORTAL_APPS.findIndex((a) => a.key === app.key);
                  return (
                    <AppTile
                      key={app.key}
                      app={app}
                      index={registryIndex !== -1 ? registryIndex : 0}
                      list={list}
                      wide={spans[position]}
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
