import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { CommandPalette } from "@/components/CommandPalette";
import EdgeSwipeBack from "@/components/EdgeSwipeBack";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageTransition, { NavModeContext } from "@/components/PageTransition";
import PortalBackButton from "@/components/portal/PortalBackButton";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
// One toast system. The Radix-based <Toaster/> used to be mounted next to
// Sonner even though a single call site (AddPlaceSheet) used it, so the app
// shipped two snackbar implementations with two different looks.
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { ImageUploadProvider } from "@/contexts/ImageUploadContext";
import { SystemEngineProvider, useSystemEngine } from "@/contexts/SystemEngineContext";
import { VoicePlayerProvider } from "@/contexts/VoicePlayerContext";
import PodcastMiniPlayer from "@/features/podcasts/components/PodcastMiniPlayer";
import { PodcastPlayerProvider } from "@/features/podcasts/contexts/PodcastPlayerContext";
import { useAuth } from "@/hooks/useAuth";
import { useAutoPrayerTheme } from "@/hooks/useAutoPrayerTheme";
import { useNavDirection } from "@/hooks/useNavDirection";
import { usePredictivePrefetch } from "@/hooks/usePredictivePrefetch";
import { usePresence } from "@/hooks/usePresence";
import { IconProvider } from "@/lib/icons";
import {
  buildTabLayerVariants,
  type NavMode,
  REDUCED_MOTION_TAB_LAYER_VARIANTS,
} from "@/lib/motion";
import { navStart } from "@/lib/navPerf";
import { registerRoute } from "@/lib/routePrefetch";
import {
  ROUTE_COMPONENTS,
  ROUTE_REDIRECTS,
  ROUTES,
} from "@/routes/manifest";
// Opt-in dual-pane workspace. Lazy so react-resizable-panels stays out of
// the entry chunk for the 99% of sessions that never enable it.
const SplitWorkspace = lazy(() => import("@/components/SplitWorkspace"));

// Eager load the portal (new home) — tiny, no heavy data fetch.
import Portal from "./pages/Portal";
// The other two persistent tabs (Games, Chat) are LAZY but still
// persistent: <PersistentTabs/> keeps each slot mounted once it has been
// visited, so switching back is instant — but their code no longer ships
// in the entry chunk. Chat alone (ChatDrawer + useChat + the whole realtime
// stack) was ~165 kB gzip of JavaScript that every visitor downloaded and
// parsed before the home screen could paint, even though most sessions
// never open it. Both are prefetched on idle below, so the first tap still
// feels immediate.
//
// These two stay here rather than in src/routes/manifest.ts because they are not
// routed pages: <PersistentTabs/> mounts them once and toggles visibility, so the
// manifest's `<Route>`/AuthGuard/error-boundary machinery does not apply to them.
const loadGames = () => import("@/features/games/pages/Games");
const loadChatTab = () => import("@/features/chat/pages/Chat");
const GamesPage = lazy(loadGames);
const ChatPage = lazy(loadChatTab);

function AutoPrayerThemeRunner() {
  useAutoPrayerTheme();
  return null;
}

function PresenceRunner() {
  const { user } = useAuth();
  usePresence(user?.id);
  return null;
}

function NetworkConnectivityListener() {
  useEffect(() => {
    const handleOnline = () => {
      const message = 'تم استعادة الاتصال بالشبكة بنجاح.';
      import('sonner').then(({ toast }) => {
        toast.success(message, {
          id: 'network-status',
          duration: 4000,
        });
      });
    };

    const handleOffline = () => {
      const message = 'فقد الاتصال بالشبكة. التطبيق يعمل الآن في وضع عدم الاتصال.';
      import('sonner').then(({ toast }) => {
        toast.error(message, {
          id: 'network-status',
          duration: 5000,
        });
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}

// Lazy load all non-tab pages
// Lazy loaders are kept as named factories so we can prefetch them on idle.

// Wave-1 chat surface — three new lazy pages backed by the new
// data layer. Kept off the eager bundle since group/channel chats
// and chat settings are reachable only via deep-link or via the
// "Groups & Channels" entry in the legacy chat list.

// Appearance (colour + type) and Interface (geometry) replace the old split
// theme/font screens. `/settings/theme` and `/settings/font` still resolve —
// they redirect, since both paths are in the wild (deep links, the portal menu).

// Wellness and Diwan tabs are lazy because their static data files
// (~10k lines combined) make eager-loading them measurable on cold
// homepage paint. The bottom nav still highlights them and the tap
// switches the route normally — first visit pays a brief skeleton,
// subsequent visits hit React.lazy's module cache and are instant.

// Hubs introduced by the IA reorganisation: `/browse` ("اطلاع")
// groups Podcasts + Articles, `/mihrab` groups Quran/Dhikr/Sunnah/
// Literature. Both are lightweight landings on top of the existing
// deep pages, so they're lazy-loaded — they should not pay any
// cost on cold home paint.

// Weather hub — comprehensive 7-day forecast + details view reachable
// from the bottom nav. Lazy because the home page already shows a tiny
// `WeatherWidget` and most users won't drill into the full hub on every
// session; the prefetch on idle warms it up so the first tap is fast.

// Knowledge hub — "المعرفة": a self-contained luxury catalog (cars,
// perfumes, watches, fashion, sweets). Lazy because its rich static
// data set should not weigh on the cold home paint; it's prefetched on
// idle so the first tap from the bottom nav renders instantly.

// Long-form SEO guide to Islamic prayer (Salah). Lightweight static
// page reachable from /mihrab — kept lazy because it's only loaded
// when a user (or a crawler) drills in from the Mihrab hub.

// Diwan library — adab.com integration

// Universal Knowledge Archive — long-form AI-generated monographs, filed
// with an accession number, searchable, and rendered in a serif reader.

// PKM — local-first personal knowledge base (MVP).

// Living Mind — dedicated contemplative 3D destination for PKM.

// "مذكرتي" — journal with 3D brain hero.

// Travel Atlas — five surfaces: the world overview, one country's map, a place
// record, the trip list and one trip's itinerary. All lazy: the map engine
// (MapLibre) is the heaviest dependency in the app and must never reach a
// visitor who does not open the atlas.

// The atlas has two deliberately different maps: `explore` is a full-detail
// street map, `countries` is a tile-free dotted poster for stamping countries.

// "Now" (الرئيسي) — the former home page content, now a standalone
// app reached from the portal grid.

// Register every route in the central prefetch registry so any intent surface
// (NavLink hover, pointerdown, smart back) can warm the module ahead of the
// navigation. Driven by the manifest, so a route can no longer be routed but
// unregistered — which is what had happened to /.lovable/oauth/consent and the
// catch-all. Persistent tab paths are registered separately below: they are lazy
// but always mounted, so they are not in the page manifest.
for (const route of ROUTES) registerRoute(route.path, route.load);
registerRoute('/games', loadGames);
registerRoute('/chat', loadChatTab);

// Tab pages are now eager (always mounted), so the idle prefetch warms
// the next most-likely sub-routes instead of the tabs themselves.
// Wellness and Diwan are lazy now too, so we prefetch them on idle so the
// first tap doesn't pay the network/parse cost in the foreground.
function useIdlePrefetch() {
  useEffect(() => {
    // Only warm chunks when the connection and device can afford it. This used to
    // download ~20 chunks unconditionally on every cold session, which on a metered
    // or slow connection competes with the page the user is actually waiting for.
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof memory === 'number' && memory > 0 && memory < 2) return;

    const ric: (cb: () => void) => number =
      (window as Window & { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb) => window.setTimeout(cb, 1500));

    const id = ric(() => {
      // The set is declared in the manifest rather than as a hand-kept list of
      // loader calls, so warming a route cannot drift from routing it.
      for (const route of ROUTES) {
        if (route.prefetchOnIdle) void route.load();
      }
      // The Games and Chat tabs are lazy but always mounted, so they live outside
      // the page manifest and are warmed explicitly.
      void loadGames();
      void loadChatTab();
    });

    return () => {
      const cancel = (window as Window & { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback;
      if (cancel) cancel(id);
      else clearTimeout(id);
    };
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Skeleton fallback matching app layout
const PageSkeleton = () => (
  <div className="min-h-screen p-4 space-y-4">
    <div className="skeleton h-8 w-40 mx-auto" />
    <div className="skeleton h-24 w-full" />
    <div className="skeleton h-16 w-full" />
    <div className="skeleton h-16 w-full" />
    <div className="skeleton h-32 w-full" />
  </div>
);

// `ALL_NAV_PATHS` used to live here: an intentionally empty `Set<string>`, kept so
// that `navVisible` checks "cleanly resolve to false" after the bottom nav was
// retired in favour of the Portal launcher.
//
// An always-false condition is not a clean resolution, it is dead code that reads
// as live. It made `navVisible` permanently false, which made the
// `paddingBottom: calc(62px + safe-area)` branch unreachable, which in turn made the
// `useInChatConversation()` call that guarded it pointless — a hook subscribing to
// route state on every render to feed a branch that could never be taken. All three
// are gone.

// Tab routes that stay mounted across navigation. Their components are
// rendered once in <PersistentTabs/> and toggled with display:none — never
// unmounted. This makes bottom-nav switching feel native and instant.
//
// The IA reorganisation reduced this set to the three small, hot tabs
// the user touches all the time: Home, Games, Chat. Wellness, Browse,
// and Mihrab are top-level destinations too (they appear in the bottom
// nav) but are heavier; they are lazy non-persistent routes below so
// their cold-paint cost stays off the home page. Their `display:none`
// on first paint would have kept their data fetches running anyway,
// so making them route-rendered is the right trade-off.
const TAB_PATHS = ['/', '/games', '/chat'] as const;
type TabPath = typeof TAB_PATHS[number];

function PersistentTabs({ active, mode }: { active: TabPath | null; mode: NavMode }) {
  // ────────────────────────────────────────────────────────────────
  // Strict push/pop tab layer
  //
  // Previously we toggled the persistent tab layer with a manual
  // opacity transition while the incoming sub-page slid in from the
  // edge — that produced a visible "fade-while-slide" overlap which
  // breaks the strict L→R / R→L navigation rule.
  //
  // The new approach plugs the tab layer into AnimatePresence with
  // the same push/pop variants we use for any other page. When the
  // user pushes from a tab to a sub-page, the layer slides off at the
  // parallax ratio in the OPPOSITE direction of the incoming page —
  // exactly like a native UINavigationController push. When the user
  // pops back, the layer slides in from the same edge with the
  // appropriate parallax. Tab→tab swaps stay instant because the
  // AnimatePresence key never changes (only the inner slot toggles
  // via display:none).
  //
  // Key invariants:
  //   • the AnimatePresence key is the constant string "tab-layer".
  //     This is what keeps the wrapper alive across tab→tab swaps.
  //   • the inner slot for the currently-shown tab is rendered with
  //     display:block; siblings are display:none so they stay
  //     mounted (instant return on next visit).
  //   • the wrapper exits ONLY when active becomes null (i.e., the
  //     user navigated to a deep sub-page). On unmount it follows the
  //     push/pop slide rule via motion variants.
  //   • Tab→tab swaps trigger the `tab-zoom-in` keyframe on the
  //     newly-shown slot — a tiny 200 ms vertical fade-up so the
  //     change registers without a horizontal slide.
  // ────────────────────────────────────────────────────────────────
  const { dir, navStyle, reduceMotion } = useApp();
  const rtl = dir === 'rtl';
  // Either source of reduced motion wins. The OS preference can never be
  // overridden by the in-app switch — only reinforced.
  const prefersReducedMotion = useReducedMotion() || reduceMotion;
  // Track which tab to display while the layer is mounted. We keep a
  // ref-like memo of the last non-null `active` so during the exit
  // animation (active just became null) we still render the tab the
  // user came from instead of flashing empty content.
  //
  // `seen` rides along in the same state object: a lazy tab must not be
  // RENDERED before it is first visited, otherwise React.lazy would start
  // its dynamic import during the initial paint and we would be back to
  // eager-loading the whole chat stack on the home screen. Keeping both
  // fields in one atom means one state update per tab change instead of two.
  const [tabState, setTabState] = useState<{ last: TabPath | null; seen: Set<TabPath> }>(() => ({
    last: active,
    seen: new Set(active ? [active] : []),
  }));
  useEffect(() => {
    if (active === null) return;
    setTabState((prev) =>
      prev.last === active && prev.seen.has(active)
        ? prev
        : { last: active, seen: new Set(prev.seen).add(active) },
    );
  }, [active]);
  const { last: lastTab, seen } = tabState;

  // The tab layer follows the SAME navigation character as every other page,
  // otherwise the user sees two different transitions overlap when they leave a
  // tab for a deep sub-page.
  const variants = useMemo(
    () => (prefersReducedMotion
      ? REDUCED_MOTION_TAB_LAYER_VARIANTS
      : buildTabLayerVariants(rtl, navStyle)),
    [rtl, navStyle, prefersReducedMotion],
  );

  const showing: TabPath | null = active ?? lastTab;

  // A slot renders its tab lazily and never unmounts it once seen, so the
  // Suspense fallback is only ever paid on the very first visit.
  const slot = (path: TabPath, node: React.ReactNode) => {
    if (!seen.has(path)) return null;
    return (
    <div
      key={path}
      style={{ display: showing === path ? 'block' : 'none' }}
      aria-hidden={showing !== path}
    >
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          {showing === path && active !== null ? (
            // Tab→tab swap micro-motion. Skipped during the exit phase
            // (active === null) so we don't fight the wrapper's slide.
            <div key={`tab-anim-${path}`} className="tab-zoom-in">
              {node}
            </div>
          ) : (
            node
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
    );
  };

  return (
    <AnimatePresence initial={false} custom={mode}>
      {active !== null && (
        <motion.div
          key="tab-layer"
          data-tab-layer="true"
          custom={mode}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            // Layout: take normal flow while present so child content
            // drives <main>'s height. AnimatePresence handles unmount.
            position: 'relative',
            top: 0,
            left: 0,
            right: 0,
            // Same compositing contract as PageTransition: keep the layer's
            // rasterisation stable, but leave `will-change` to index.css so the
            // user's compositor-hints preference genuinely controls it.
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            zIndex: 0,
          }}
        >
          {slot('/',      <Portal />)}
          {slot('/games', <GamesPage />)}
          {slot('/chat',  <ChatPage />)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  useIdlePrefetch();
  usePredictivePrefetch(); // Global Pointer-Intent & Trajectory Predictive Prefetching Engine

  const { splitActive, splitUrl, splitSize, setSplitSize, splitLayout, setSplitActive } = useSystemEngine();
  const isSplitPane = new URLSearchParams(location.search).get('is_split_pane') === 'true';
  const effectiveSplitActive = splitActive && !isSplitPane;

  // Mark the navigation start timestamp synchronously ONCE per route change.
  // Calling navStart() in render fired on every re-render (theme tick,
  // presence flip, etc.) and reset the baseline mid-flight — paint timings
  // were polluted. useLayoutEffect runs exactly once per pathname change,
  // before paint, which is what the perf logger expects.
  useLayoutEffect(() => {
    navStart(location.pathname);
  }, [location.pathname]);
  // Classify the navigation as push / pop / tab / replace / initial so
  // PageTransition can pick the right slide direction (and so OUTGOING
  // pages know whether to leave to the left or right with parallax).
  const { mode } = useNavDirection();
  const activeTab = (TAB_PATHS as readonly string[]).includes(location.pathname)
    ? (location.pathname as TabPath)
    : null;

  const mainStyle = effectiveSplitActive
    ? {
        position: 'relative' as const,
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
      }
    : {
        // Provide a positioning context so the exiting PageTransition
        // (which sets `position: absolute` during exit) is pinned to
        // <main>'s box and never stacks above the incoming page.
        position: 'relative' as const,
        // Minimum height ensures content fills viewport even on short pages
        minHeight: '100dvh',
      };

  const primaryContent = (
    <div className={effectiveSplitActive ? "h-full overflow-y-auto pb-20 scrollbar-thin" : ""}>
      <PersistentTabs active={activeTab} mode={mode} />
      {/* Non-tab routes (sub-pages, settings details, games, etc.) */}
      {/* AnimatePresence must own PageTransition directly. Wrapping
          <Routes> itself breaks popLayout because Routes cannot receive
          the ref Framer needs to remove the outgoing screen from layout.
          Suspense lives INSIDE PageTransition so a lazy chunk's fallback
          renders within the animating layer instead of replacing it —
          otherwise the first visit to a lazy page skipped the transition
          entirely. */}
      <NavModeContext.Provider value={mode}>
        <AnimatePresence mode="popLayout" initial={false} custom={mode}>
          {activeTab === null && (
            <PageTransition key={location.pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Routes location={location}>
                  {/* Persistent tab paths render null here — <PersistentTabs/> owns
                      them and keeps each slot mounted so switching back is instant. */}
                  {TAB_PATHS.map((path) => (
                    <Route key={path} path={path} element={null} />
                  ))}

                  {ROUTE_REDIRECTS.map(({ from, to }) => (
                    <Route key={from} path={from} element={<Navigate to={to} replace />} />
                  ))}

                  {/* Every page route, derived from src/routes/manifest.ts.
                      This replaces ~62 hand-written lines, each of which repeated the
                      same <ErrorBoundary> wrapper — none of which reset on navigation.
                      <RouteErrorBoundary> keys itself on the router location, so
                      leaving a broken route and coming back clears the error. */}
                  {ROUTES.map(({ path, requiresAuth, authFallback }) => {
                    const Page = ROUTE_COMPONENTS.get(path)!;
                    return (
                      <Route
                        key={path}
                        path={path}
                        element={
                          <RouteErrorBoundary>
                            {requiresAuth ? (
                              <AuthGuard
                                fallbackTitleAr={authFallback?.titleAr}
                                fallbackDescAr={authFallback?.descAr}
                              >
                                <Page />
                              </AuthGuard>
                            ) : (
                              <Page />
                            )}
                          </RouteErrorBoundary>
                        }
                      />
                    );
                  })}
                </Routes>
              </Suspense>
            </PageTransition>
          )}
        </AnimatePresence>
      </NavModeContext.Provider>
    </div>
  );

  return (
    <main id="main-content" style={mainStyle}>
      <ScrollToTop />
      <CommandPalette />

      {effectiveSplitActive ? (
        <Suspense fallback={primaryContent}>
          <SplitWorkspace
            url={splitUrl}
            size={splitSize}
            onSizeChange={setSplitSize}
            layout={splitLayout}
            onClose={() => setSplitActive(false)}
          >
            {primaryContent}
          </SplitWorkspace>
        </Suspense>
      ) : (
        primaryContent
      )}
    </main>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <SystemEngineProvider>
        <IconProvider>
        <VoicePlayerProvider>
          <ImageUploadProvider>
          <PodcastPlayerProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Sonner />
              <BrowserRouter>
                <AutoPrayerThemeRunner />
                <PresenceRunner />
                <NetworkConnectivityListener />
                <EdgeSwipeBack />
                <AnimatedRoutes />
                <PortalBackButton />
                <PodcastMiniPlayer />
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
          </PodcastPlayerProvider>
          </ImageUploadProvider>
        </VoicePlayerProvider>
        </IconProvider>
      </SystemEngineProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
