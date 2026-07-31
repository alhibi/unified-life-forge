/**
 * The route table. One entry per route, and the only place a route is declared.
 *
 * ── What this replaces ───────────────────────────────────────────────────────
 *
 * Every route used to be written out FOUR times in App.tsx:
 *
 *   1. `const loadX = () => import('./pages/X')`      — the loader factory
 *   2. `registerRoute('/x', loadX)`                   — the prefetch registry
 *   3. `const XPage = lazy(loadX)`                    — the lazy component
 *   4. `<Route path="/x" element={<ErrorBoundary><XPage /></ErrorBoundary>} />`
 *
 * Nothing checked that the four agreed, and they did not: `/.lovable/oauth/consent`
 * and the `*` catch-all were routed but never registered for prefetch, so no intent
 * surface could warm them. 62 routes × 4 declarations is also where the ~60
 * duplicated `<ErrorBoundary>` wrappers came from — none of which reset on
 * navigation, so a route that threw once stayed broken until the user pressed retry.
 *
 * ── Adding a route ───────────────────────────────────────────────────────────
 *
 * Add one entry here. App.tsx derives the lazy component, the prefetch
 * registration, the error boundary and the `<Route>` from it.
 *
 * `src/routes/__tests__/manifest.test.ts` checks the table for the mistakes a list
 * this long invites: duplicate paths, a module that does not exist, a private route
 * that forgot its guard.
 *
 * ── A note on order ──────────────────────────────────────────────────────────
 *
 * The old comments warned that `/chat/groups` had to precede `/chat/g/:chatId` and
 * that every literal travel-atlas segment had to precede `:countryId`. That is a
 * React Router v5 concern. v6 ranks matches by specificity, so a static segment wins
 * over a dynamic one regardless of declaration order — `manifest.test.ts` asserts
 * that the ranking actually resolves the two cases the comments were worried about,
 * rather than relying on the order below. The order is preserved anyway because it
 * reads well and costs nothing.
 */

import { type ComponentType, lazy, type LazyExoticComponent } from 'react';

export interface RouteDef {
  /** React Router path pattern. `*` is the catch-all. */
  path: string;
  /** Dynamic import of the page module. Also used as the prefetch loader. */
  load: () => Promise<{ default: ComponentType }>;
  /**
   * Wrap in `<AuthGuard>`.
   *
   * Before the manifest, AuthGuard was applied on exactly ONE page
   * (pages/Wellness.tsx) even though a dozen routes read per-user data. The others
   * relied entirely on RLS returning empty sets — which is safe server-side, but
   * presents a signed-out visitor with a broken empty screen instead of a login
   * prompt, and leaves device-local Dexie data (PKM notes, journal) readable by
   * whoever holds the phone.
   */
  requiresAuth?: boolean;
  /**
   * Tailored copy for the sign-in prompt, when the generic wording is too vague.
   *
   * `pages/Wellness.tsx` used to wrap itself in `<AuthGuard>` purely to pass these
   * two strings. Keeping them here means the guard can live in one place without
   * flattening every screen to the same message — and avoids the double-guard that
   * wrapping the page as well would cause: two nested AuthGuards mean two
   * `useAuth()` subscriptions and two `auth-session-expired` listeners, so the
   * session-expiry toast fires twice and `navigate('/auth')` runs twice.
   */
  authFallback?: { titleAr: string; descAr: string };
  /** Warm this chunk during idle time after boot. */
  prefetchOnIdle?: boolean;
}

export const ROUTES: readonly RouteDef[] = [
  { path: "/chat/groups", load: () => import("@/features/chat/pages/GroupsIndex"), prefetchOnIdle: true },
  { path: "/chat/settings", load: () => import("@/features/chat/pages/ChatSettings"), prefetchOnIdle: true },
  { path: "/chat/g/:chatId", load: () => import("@/features/chat/pages/GroupChat") },
  { path: "/settings", load: () => import("@/pages/Settings"), prefetchOnIdle: true },
  { path: "/duas", load: () => import("@/features/duas/pages/Duas") },
  { path: "/quran", load: () => import("@/pages/Quran"), prefetchOnIdle: true },
  { path: "/dhikr", load: () => import("@/pages/Dhikr"), prefetchOnIdle: true },
  { path: "/sunnah", load: () => import("@/pages/Sunnah"), prefetchOnIdle: true },
  {
    path: "/wellness",
    load: () => import("@/pages/Wellness"),
    requiresAuth: true,
    prefetchOnIdle: true,
    authFallback: {
      titleAr: 'قسم الصحة والعافية',
      descAr:
        'يرجى تسجيل الدخول للوصول إلى برامج التمرين والتحليلات الصحية ومزامنتها سحابياً.',
    },
  },
  { path: "/diwan", load: () => import("@/features/diwan/pages/Diwan"), prefetchOnIdle: true },
  { path: "/browse", load: () => import("@/pages/Browse"), prefetchOnIdle: true },
  { path: "/mihrab", load: () => import("@/pages/Mihrab"), prefetchOnIdle: true },
  { path: "/mihrab/prayer-guide", load: () => import("@/pages/PrayerGuide") },
  { path: "/weather", load: () => import("@/features/weather/pages/Weather"), prefetchOnIdle: true },
  { path: "/knowledge", load: () => import("@/features/knowledge/pages/Knowledge"), prefetchOnIdle: true },
  { path: "/journal", load: () => import("@/features/journal/pages/JournalHome") },
  { path: "/travel-atlas", load: () => import("@/features/travel-atlas/pages/TravelAtlasPage") },
  { path: "/travel-atlas/explore", load: () => import("@/features/travel-atlas/pages/ExploreMapPage") },
  { path: "/travel-atlas/countries", load: () => import("@/features/travel-atlas/pages/CountryStampsPage") },
  { path: "/travel-atlas/place/:placeId", load: () => import("@/features/travel-atlas/pages/PlaceDetailPage") },
  { path: "/travel-atlas/trips", load: () => import("@/features/travel-atlas/pages/TripsPage") },
  { path: "/travel-atlas/trips/:tripId", load: () => import("@/features/travel-atlas/pages/TripDetailPage") },
  { path: "/travel-atlas/:countryId", load: () => import("@/features/travel-atlas/pages/CountryMapPage") },
  { path: "/games/sudoku", load: () => import("@/features/games/pages/Sudoku") },
  { path: "/games/chess", load: () => import("@/features/games/pages/Chess") },
  { path: "/games/chess/puzzles", load: () => import("@/features/games/pages/ChessPuzzle") },
  { path: "/games/chess/career", load: () => import("@/features/games/pages/ChessCareer") },
  { path: "/games/memory", load: () => import("@/features/games/pages/MemoryGame") },
  { path: "/games/memory/adventure", load: () => import("@/features/games/pages/MemoryAdventure") },
  { path: "/occasions", load: () => import("@/features/calendar/pages/AllOccasions") },
  { path: "/reading", load: () => import("@/pages/Reading"), prefetchOnIdle: true },
  { path: "/settings/appearance", load: () => import("@/pages/AppearanceSettings"), prefetchOnIdle: true },
  { path: "/settings/interface", load: () => import("@/pages/InterfaceSettings") },
  { path: "/auth", load: () => import("@/pages/Auth") },
  { path: "/settings/profile", load: () => import("@/pages/ProfileEdit"), prefetchOnIdle: true },
  { path: "/profile", load: () => import("@/pages/ProfileEdit") },
  { path: "/settings/motion", load: () => import("@/pages/MotionSettings") },
  { path: "/settings/prayer", load: () => import("@/pages/PrayerSettings"), prefetchOnIdle: true },
  { path: "/section/timed-sunnah", load: () => import("@/pages/TimedSunnah") },
  { path: "/section/timed-sunnah/:categoryId", load: () => import("@/pages/SunnahDetail") },
  { path: "/section/untimed-sunnah", load: () => import("@/pages/UntimedSunnah") },
  { path: "/section/prophetic-day", load: () => import("@/pages/PropheticDay") },
  { path: "/section/quran-virtues", load: () => import("@/pages/QuranVirtues") },
  { path: "/tafsir", load: () => import("@/pages/Tafsir") },
  { path: "/podcasts", load: () => import("@/features/podcasts/pages/Podcasts") },
  { path: "/podcasts/library", load: () => import("@/features/podcasts/pages/PodcastLibrary") },
  { path: "/podcasts/history", load: () => import("@/features/podcasts/pages/History") },
  { path: "/podcasts/:id", load: () => import("@/features/podcasts/pages/PodcastDetail") },
  { path: "/diwan/library", load: () => import("@/features/diwan/pages/Library") },
  { path: "/diwan/library/search", load: () => import("@/features/diwan/pages/LibrarySearch") },
  { path: "/diwan/library/poets", load: () => import("@/features/diwan/pages/LibraryPoets") },
  { path: "/diwan/library/poet/:slug", load: () => import("@/features/diwan/pages/LibraryPoet") },
  { path: "/diwan/library/poem/:slug", load: () => import("@/features/diwan/pages/LibraryPoem") },
  { path: "/diwan/library/favorites", load: () => import("@/features/diwan/pages/LibraryFavorites") },
  { path: "/archive", load: () => import("@/features/archive/pages/ArchiveHome") },
  { path: "/archive/new", load: () => import("@/features/archive/pages/ArchiveNew") },
  { path: "/archive/:id", load: () => import("@/features/archive/pages/ArchiveReader") },
  { path: "/pkm", load: () => import("@/features/pkm/pages/PKM") },
  { path: "/pkm/mind", load: () => import("@/features/mind/pages/Mind") },
  { path: "/now", load: () => import("@/features/now/pages/Now") },
  { path: "/.lovable/oauth/consent", load: () => import("@/pages/OAuthConsent") },
  { path: "*", load: () => import("@/pages/NotFound") },
];

/**
 * Paths that are redirects rather than pages.
 *
 * `/index` predates the portal becoming the home route; `/settings/theme` and
 * `/settings/font` were merged into one Appearance screen. Kept so existing
 * bookmarks and any links in the wild still land somewhere sensible.
 */
export const ROUTE_REDIRECTS: readonly { from: string; to: string }[] = [
  { from: '/index', to: '/' },
  { from: '/settings/theme', to: '/settings/appearance' },
  { from: '/settings/font', to: '/settings/appearance' },
];

/**
 * path → lazy component, built once at module scope.
 *
 * `lazy()` must not be called during render: a new component identity on every
 * render remounts the subtree and throws away the page's state on each parent
 * update. Building the map here is what guarantees one call per route for the
 * lifetime of the module.
 */
export const ROUTE_COMPONENTS: ReadonlyMap<string, LazyExoticComponent<ComponentType>> =
  new Map(ROUTES.map((route) => [route.path, lazy(route.load)]));
