/**
 * Portal — the first screen of amv.life.
 *
 * Reading order is the product's answer to "keep your prayers and keep your day
 * organised": a masthead (date, greeting, next-prayer status), then today's
 * console — the prayer card as the primary zone with the weather plate and the
 * four day tools in the end rail — then what you were last in ("متابعة"), then
 * the launcher itself under its own headline, with the selected app's deep
 * links as a sticky rail beside the realms on wide screens.
 *
 * The launcher grid is untouched in identity: every app keeps its own face and
 * accent (visual exception X1). What changed is the page around it. The app
 * detail panel used to sit above the launcher in the first viewport, where it
 * competed with the day for attention; it now belongs to the launcher it
 * describes. Each app still carries its own accent and motif — see
 * AppTileVisuals — so the grid reads as distinct places rather than one card.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppDetailPanel from '@/components/portal/AppDetailPanel';
import { findApp, PORTAL_APPS, type PortalApp, type PortalCategory } from '@/components/portal/apps';
import PortalContinue from '@/components/portal/PortalContinue';
import PortalFilterBar from '@/components/portal/PortalFilterBar';
import PortalGreeting from '@/components/portal/PortalGreeting';
import PortalHeader from '@/components/portal/PortalHeader';
import { PortalRealmsSkeleton, PortalTodayWidgetsSkeleton } from '@/components/portal/PortalSkeletons';
import { usePortalPrefs } from '@/components/portal/usePortalPrefs';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { StateView } from '@/components/ui/state-view';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ChevronLeft } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';

/**
 * The realms grid is the heaviest part of the launcher (twenty tiles, each
 * with its own motif). Loading it in its own chunk lets the masthead and the
 * today console paint first, with a geometry-matched skeleton holding its place.
 */
const CelestialRealmsLayout = lazy(() => import('@/components/portal/CelestialRealmsLayout'));

/**
 * Today's console (prayer card, weather plate, day tools). Lazy so the
 * launcher's own chrome paints first.
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
  const { pinned, recents, view, isPinned, togglePin, recordOpen, setView } = usePortalPrefs();

  /* Recents are stored as keys; resolve them here and drop any that no longer
     map to a live app so a removed app can never render a dead chip. */
  const recentApps = useMemo(
    () => recents.map((key) => findApp(key)).filter((app): app is PortalApp => Boolean(app)),
    [recents],
  );

  /* The widgets below need coordinates; ask once. The shared hook coalesces
     concurrent requests, so the prayer card and the weather plate do not each
     fire their own prompt. */
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
        description="بوابة amv.life الشخصية: أوقات الصلاة والطقس، ثم كل التطبيقات — القرآن والمحراب والعافية والدردشة والمعرفة والألعاب — في مكان واحد."
        path="/"
      />

      <PortalHeader unreadCount={unreadCount} />

      <div className="relative z-raised mx-auto w-full max-w-[var(--ui-workspace-max)] pt-4 pb-page">
        <h1 className="sr-only">amv.life — بوابتك الشخصية</h1>

        {/* ── اليوم ─────────────────────────────────────────────────────
            Masthead first, then the console. The first viewport answers
            "what is today" before it offers a single destination. */}
        <section aria-label="اليوم" className="app-stack">
          <PortalGreeting username={username} />

          {/* Reserve the console's geometry while it loads so the launcher
              below never jumps. */}
          <Suspense fallback={<PortalTodayWidgetsSkeleton />}>
            <PortalTodayWidgets />
          </Suspense>
        </section>

        {/* ── متابعة: recents recorded by usePortalPrefs. Renders nothing for
            a first-time user, so no empty shelf appears above the launcher. */}
        <div className="pt-6">
          <PortalContinue apps={recentApps} onOpen={openApp} />
        </div>

        {/* ── التطبيقات ──────────────────────────────────────────────── */}
        <section aria-labelledby="portal-apps-h" className="pt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <h2 id="portal-apps-h" className="text-title font-bold text-foreground">
                التطبيقات
              </h2>
              <p className="mt-1 text-meta text-muted-foreground">
                عشرون مجالاً في أربعة عوالم — كل تطبيق بوجهه واختصاراته
              </p>
            </div>
            <span className="text-mini tabular-nums text-muted-foreground">
              {visible.length} ظاهراً من {PORTAL_APPS.length}
            </span>
          </div>

          {/* Sticky under the header so the category rail never scrolls away. */}
          <div className="sticky top-[calc(var(--ui-header-h)+env(safe-area-inset-top))] z-sticky -mx-[var(--ui-gutter)] bg-background px-[var(--ui-gutter)] py-2">
            <PortalFilterBar
              category={category}
              onCategoryChange={setCategory}
              view={view}
              onViewChange={setView}
              counts={counts}
            />
          </div>

          {visible.length === 0 ? (
            <StateView
              kind="search"
              title="لا تطبيقات في هذا التصنيف"
              body="كل تطبيقات هذا التصنيف مخفية أو غير متاحة الآن. أعد ضبط التصنيف لعرض كل التطبيقات."
              action={{ label: 'عرض كل التطبيقات', onClick: () => setCategory('all') }}
              compact
            />
          ) : (
            <div className="grid gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_clamp(17rem,22vw,20rem)] lg:items-start">
              <div onKeyDown={onGridKeyDown} className="relative z-raised min-w-0">
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

              {/* The app detail rail belongs to the launcher it describes.
                  Sticky under the header, hidden below the wide breakpoint
                  (the drawer carries the same component on touch). */}
              <aside
                className="hidden lg:sticky lg:top-[calc(var(--ui-header-h)+1rem+env(safe-area-inset-top))] lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain"
                aria-label={`اختصارات ${focusedApp.label}`}
              >
                <p className="mb-3 text-meta font-semibold text-muted-foreground">
                  اختصارات التطبيق
                </p>
                <AppDetailPanel
                  app={focusedApp}
                  pinned={isPinned(focusedApp.key)}
                  onOpenPath={openPath}
                  onTogglePin={togglePin}
                />
                <p className="mt-3 flex items-center gap-1.5 text-micro text-muted-foreground">
                  <ChevronLeft className="h-3 w-3" aria-hidden />
                  مرّر على تطبيق لعرض اختصاراته — استخدم الأسهم للتنقل بالشبكة
                </p>
              </aside>
            </div>
          )}

          <div className="flex items-center gap-3 pt-10 pb-[env(safe-area-inset-bottom)]">
            <span className="h-px flex-1 bg-track" aria-hidden />
            <span className="text-micro font-semibold text-muted-foreground-subtle font-tajawal">
              صُنِعَ بحب — عامر وأمولة
            </span>
            <span className="h-px flex-1 bg-track" aria-hidden />
          </div>
        </section>
      </div>

      {/* Touch: deep links in a drawer. Same component as the side rail. */}
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
