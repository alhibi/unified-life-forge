/**
 * Portal — the first screen of amv.life: the app launcher.
 *
 * Reading order, top to bottom: who you are and what day it is (PortalGreeting),
 * today's live widgets, then the apps themselves under a category rail that
 * sticks to the header while you scroll. There is no search field and no
 * "recently opened" row: fourteen tiles are scannable, and both surfaces added
 * chrome without shortening the path to any app.
 * Each app carries its own accent and motif — see AppTileVisuals — so the grid
 * reads as fourteen distinct places rather than one repeated card.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppDetailPanel from '@/components/portal/AppDetailPanel';
import { findApp, PORTAL_APPS, type PortalApp, type PortalCategory } from '@/components/portal/apps';
import PortalBackgroundCanvas from '@/components/portal/PortalBackgroundCanvas';
import PortalFilterBar from '@/components/portal/PortalFilterBar';
import PortalGreeting from '@/components/portal/PortalGreeting';
import PortalHeader from '@/components/portal/PortalHeader';
import { PortalRealmsSkeleton } from '@/components/portal/PortalSkeletons';
import { usePortalPrefs } from '@/components/portal/usePortalPrefs';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ChevronLeft } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';

/**
 * The realms grid is the heaviest part of the launcher (fourteen tiles, each
 * with its own motif). Loading it in its own chunk lets the greeting and the
 * pulse bar paint first, with a geometry-matched skeleton holding its place.
 */
const CelestialRealmsLayout = lazy(() => import('@/components/portal/CelestialRealmsLayout'));

/**
 * The "today" widgets (prayer times, sunnah, weather, qibla compass) moved out
 * of the retired `/now` app and onto this page. Lazy so the launcher's own
 * chrome paints first.
 */
const PortalTodayWidgets = lazy(() => import('@/components/portal/PortalTodayWidgets'));

/**
 * Columns are decided by container queries in CSS, so arrow-key arithmetic
 * measures the rendered grid instead of guessing from the viewport: count how
 * many focusable tiles share the first row's offsetTop.
 */
function measureColumns(tiles: (HTMLButtonElement | null)[], list: boolean): number {
  if (list) return 1;
  const rendered = tiles.filter((el): el is HTMLButtonElement => Boolean(el?.isConnected));
  if (rendered.length === 0) return 1;
  const firstTop = rendered[0].getBoundingClientRect().top;
  let columns = 0;
  for (const el of rendered) {
    if (Math.abs(el.getBoundingClientRect().top - firstTop) > 4) break;
    columns += 1;
  }
  return Math.max(1, columns);
}

export default function Portal() {
  const navigate = useNavigate();
  const { username } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { pinned, view, isPinned, togglePin, recordOpen, setView } = usePortalPrefs();

  /* The widgets below need coordinates; ask once, exactly like /now used to. */
  const { status: locationStatus, requestLocation } = useDeviceLocation();
  useEffect(() => {
    if (locationStatus === 'idle') void requestLocation();
  }, [locationStatus, requestLocation]);

  const [category, setCategory] = useState<PortalCategory | 'all'>('all');
  const [focusedKey, setFocusedKey] = useState<string>(PORTAL_APPS[0].key);
  const [inspectedKey, setInspectedKey] = useState<string | null>(null);

  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = view === 'list';

  /* ── filtering + pinned-first ordering ── */
  const counts = useMemo(() => {
    const byCat: Record<string, number> = { all: 0, spirit: 0, body: 0, mind: 0, play: 0 };
    for (const app of PORTAL_APPS) {
      byCat.all += 1;
      byCat[app.cat] += 1;
    }
    return byCat;
  }, []);

  const visible = useMemo(() => {
    const filtered = PORTAL_APPS.filter((app) => category === 'all' || app.cat === category);
    const pinnedRank = (key: string) => {
      const i = pinned.indexOf(key);
      return i === -1 ? Number.POSITIVE_INFINITY : i;
    };
    return [...filtered].sort((a, b) => {
      const ra = pinnedRank(a.key);
      const rb = pinnedRank(b.key);
      if (ra !== rb) return ra - rb;
      return PORTAL_APPS.indexOf(a) - PORTAL_APPS.indexOf(b);
    });
  }, [category, pinned]);

  const focusedApp = useMemo(() => {
    const inView = visible.find((app) => app.key === focusedKey);
    return inView ?? visible[0] ?? findApp(focusedKey) ?? PORTAL_APPS[0];
  }, [visible, focusedKey]);
  const inspectedApp = inspectedKey ? findApp(inspectedKey) : null;

  /* ── actions ── */
  const openPath = useCallback(
    (path: string) => {
      const owner = PORTAL_APPS.find((app) => path === app.path || path.startsWith(`${app.path}/`));
      if (owner) recordOpen(owner.key);
      setInspectedKey(null);
      navigate(path);
    },
    [navigate, recordOpen],
  );

  const openApp = useCallback(
    (app: PortalApp) => {
      recordOpen(app.key);
      navigate(app.path);
    },
    [navigate, recordOpen],
  );

  const inspectApp = useCallback((app: PortalApp) => {
    setFocusedKey(app.key);
    if (window.innerWidth < 1024) setInspectedKey(app.key);
  }, []);

  const focusApp = useCallback((app: PortalApp) => {
    setFocusedKey(app.key);
    prefetchRoute(app.path);
  }, []);

  const registerRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    tileRefs.current[index] = el;
  }, []);

  /* Arrow-key navigation across the grid, mirrored for RTL. */
  const onGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tileRefs.current.findIndex((el) => el === document.activeElement);
      if (currentIndex === -1) return;
      const columns = measureColumns(tileRefs.current, list);
      let nextIndex: number;

      switch (event.key) {
        case 'ArrowLeft':
          nextIndex = currentIndex + 1;
          break;
        case 'ArrowRight':
          nextIndex = currentIndex - 1;
          break;
        case 'ArrowDown':
          nextIndex = currentIndex + columns;
          break;
        case 'ArrowUp':
          nextIndex = currentIndex - columns;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = visible.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex < 0 || nextIndex >= visible.length) return;
      event.preventDefault();
      tileRefs.current[nextIndex]?.focus();
    },
    [list, visible.length],
  );

  return (
    <PageShell centered={false} flush className="min-h-[100dvh] bg-background pb-page relative">
      <SEO
        title="amv.life — بوابتك الشخصية"
        description="بوابة amv.life الشخصية: الرئيسي، المحراب، العافية، الدردشة، اطلاع، المعرفة، والألعاب — تطبيقات متكاملة في مكان واحد."
        path="/"
      />

      {/* GPU-accelerated Background Canvas */}
      <PortalBackgroundCanvas />

      <PortalHeader unreadCount={unreadCount} />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-[max(1rem,env(safe-area-inset-inline-start))] pt-4 pb-page sm:px-6 lg:px-8 2xl:max-w-[88rem]">
        <h1 className="sr-only">amv.life — بوابتك الشخصية</h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_clamp(17rem,26vw,21.25rem)] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-5 sm:space-y-6">

            <PortalGreeting username={username} />

            <Suspense fallback={null}>
              <PortalTodayWidgets />
            </Suspense>

            {/* Sticky under the 56px header so the category rail never scrolls away. */}
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <PortalFilterBar
                category={category}
                onCategoryChange={setCategory}
                view={view}
                onViewChange={setView}
                counts={counts}
              />
            </div>

            {visible.length === 0 ? (
              <div className="empty-state-surface" role="status">
                <strong>لا نتائج</strong>
                <span className="text-mini text-muted-foreground">
                  لا يوجد تطبيق في هذا التصنيف. أعد الضبط لعرض الكل.
                </span>
                <button
                  type="button"
                  onClick={() => setCategory('all')}
                  className="mt-3 h-11 rounded-button border border-border px-4 text-meta font-semibold text-foreground transition-colors duration-fast hover:bg-muted"
                >
                  إعادة الضبط
                </button>
              </div>
            ) : (
              <div onKeyDown={onGridKeyDown} className="relative z-10">
                <Suspense fallback={<PortalRealmsSkeleton list={list} />}>
                  <CelestialRealmsLayout
                  visibleApps={visible}
                  query=""
                  list={list}
                  focusedKey={focusedApp.key}
                  unreadCount={unreadCount}
                  onOpen={openApp}
                  onInspect={inspectApp}
                  onFocusApp={focusApp}
                  registerRef={registerRef}
                  />
                </Suspense>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 pb-[env(safe-area-inset-bottom)]">
              <span className="h-px flex-1 bg-border/40" aria-hidden />
              <span className="text-micro font-semibold tracking-[0.14em] text-muted-foreground/80 font-tajawal">
                صُنِعَ بحب — عامر وأمولة
              </span>
              <span className="h-px flex-1 bg-border/40" aria-hidden />
            </div>
          </div>

          {/* Desktop side panel — sticky under the 56px header. */}
          <aside
            className="hidden lg:sticky lg:top-[calc(4.5rem+env(safe-area-inset-top))] lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain"
            aria-label={`اختصارات ${focusedApp.label}`}
          >
            <AppDetailPanel
              app={focusedApp}
              pinned={isPinned(focusedApp.key)}
              onOpenPath={openPath}
              onTogglePin={togglePin}
            />
            <p className="mt-3 flex items-center gap-1.5 text-micro text-muted-foreground">
              <ChevronLeft className="h-3 w-3 rtl:rotate-180" aria-hidden />
              اضغط <kbd className="rounded-sm border border-border px-1">/</kbd> للبحث، والأسهم للتنقل
            </p>
          </aside>
        </div>
      </main>

      {/* Touch: deep links in a drawer. Same component as the side panel. */}
      <ResponsiveDrawer
        open={inspectedApp !== null}
        onOpenChange={(open) => !open && setInspectedKey(null)}
        title={inspectedApp?.label ?? ''}
        description={inspectedApp?.description}
      >
        {inspectedApp && (
          <AppDetailPanel
            bare
            app={inspectedApp}
            pinned={isPinned(inspectedApp.key)}
            onOpenPath={openPath}
            onTogglePin={togglePin}
          />
        )}
      </ResponsiveDrawer>
    </PageShell>
  );
}
