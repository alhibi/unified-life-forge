/**
 * PortalContinue — the "متابعة" row: the apps this device opened most
 * recently, newest first.
 *
 * Why it exists: the twenty-tile grid is scannable but flat, and in practice a
 * person returns to the same two or three apps many times a day. The recents
 * list was already being recorded by `usePortalPrefs` (`recordAppOpen`) and
 * never rendered anywhere — this row is the surface it was written for.
 *
 * Contract:
 *   • Renders nothing at all when there are no recents. A brand-new user sees
 *     no empty shelf and no zero state above the apps — the grid stays the
 *     first thing under "today".
 *   • One horizontal rail, scrolled not wrapped, so it can never grow taller
 *     than a single 44px-safe row and push the grid below the fold.
 *   • Each chip is a real button ≥44px tall, carries the app's own accent from
 *     `getTileIdentity`, and warms its route on pointer/focus intent.
 */
import { memo, useCallback } from 'react';

import { prefetchRoute } from '@/lib/routePrefetch';

import type { PortalApp } from './apps';
import { getTileIdentity } from './AppTileVisuals';

export interface PortalContinueProps {
  /** Recent apps, newest first, already resolved and de-duplicated. */
  apps: PortalApp[];
  onOpen: (app: PortalApp) => void;
}

function ContinueChip({ app, onOpen }: { app: PortalApp; onOpen: (app: PortalApp) => void }) {
  const identity = getTileIdentity(app.key);
  const Icon = app.icon;

  const warm = useCallback(() => {
    prefetchRoute(app.path);
  }, [app.path]);

  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      onPointerEnter={warm}
      onPointerDown={warm}
      onFocus={warm}
      style={{ '--tile': identity.accent } as React.CSSProperties}
      className="type-label group flex h-11 shrink-0 items-center gap-2 rounded-full bg-secondary px-3.5 text-foreground shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.05)] transition-[background-color,transform] duration-fast hover:bg-[hsl(var(--interactive-hover))] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden className="flex items-center justify-center text-[hsl(var(--tile))]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="whitespace-nowrap">{app.label}</span>
    </button>
  );
}

function PortalContinueImpl({ apps, onOpen }: PortalContinueProps) {
  if (apps.length === 0) return null;

  return (
    <section aria-labelledby="portal-continue-h" className="relative z-10">
      <h2
        id="portal-continue-h"
        className="mb-2 text-micro font-semibold tracking-[0.14em] text-muted-foreground/80"
      >
        متابعة
      </h2>
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {apps.map((app) => (
          <div role="listitem" key={app.key} className="contents">
            <ContinueChip app={app} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </section>
  );
}

const PortalContinue = memo(PortalContinueImpl);
export default PortalContinue;
