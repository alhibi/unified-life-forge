/**
 * Portal — the first screen of amv.life: the app launcher.
 *
 * This screen used to ship its own parallel design system (`modkeys.css`, a
 * ~1.3k-line stylesheet with its own `--mk-*` palette, type ramp, radii and
 * icon family). That is now gone: the launcher is built from the product's own
 * primitives — `AppCard`, `IconButton`, `DropdownMenu`, the canonical type
 * scale, the `z-*` ladder and the `@/lib/motion` tokens — so it reads as part
 * of the app rather than as a template pasted into it.
 *
 * What the launcher does beyond listing seven links:
 *
 *   • A live band (next prayer with an elapsed-window ring, current weather,
 *     dual Gregorian/Hijri date with a rolling clock) — three real navigation
 *     targets, not decoration.
 *   • Search across app names, captions, descriptions and deep-link labels,
 *     Arabic-normalised so "المحراب" matches "محراب".
 *   • Category filter with a spring `layoutId` indicator; tiles FLIP into
 *     their new positions instead of snapping.
 *   • Pinned apps (sorted first, device-local) and a recents rail.
 *   • Full keyboard control: `/` focuses search, arrows walk the grid in
 *     visual RTL order, Enter opens, Escape clears.
 *   • Deep links per app: a sticky side panel on desktop, a drawer on touch —
 *     one component, so the two can never drift.
 *
 * Performance notes: hover and press states are CSS transitions (hovering a
 * tile does not re-render the grid); the weather cell mounts on idle; every
 * animation is transform/opacity only and collapses under
 * `prefers-reduced-motion`.
 */
import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppDetailPanel from '@/components/portal/AppDetailPanel';
import { findApp, matchesQuery, PORTAL_APPS,type PortalApp, type PortalCategory } from '@/components/portal/apps';
import AppTile from '@/components/portal/AppTile';
import PortalFilterBar from '@/components/portal/PortalFilterBar';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalLiveBand from '@/components/portal/PortalLiveBand';
import { usePortalPrefs } from '@/components/portal/usePortalPrefs';
import PrayerTimes from '@/components/PrayerTimes';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ChevronLeft } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';

/** Grid columns per breakpoint — mirrors the Tailwind classes on the grid. */
function columnsFor(width: number, list: boolean): number {
  if (list) return 1;
  if (width >= 700) return 3;
  return 2;
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'ليلة مباركة';
  if (hour < 12) return 'صباح الخير';
  if (hour < 15) return 'نهارك سعيد';
  if (hour < 19) return 'مساء الخير';
  return 'طاب مساؤك';
}

interface Verse {
  text: string;
  author: string;
}

const VERSES_BY_TIME: Record<'morning' | 'afternoon' | 'evening' | 'night', Verse> = {
  morning: {
    text: "أَعَزُّ مَكَانٍ فِي الدُّنَى سَرْجُ سَابِحٍ ... وَخَيْرُ جَلِيسٍ فِي الزَّمَانِ كِتَابُ",
    author: "أبو الطيب المتنبي"
  },
  afternoon: {
    text: "الْجِدُّ يُقَرِّبُ كُلَّ أَمْرٍ شَاسِعٍ ... وَالْجِدُّ يَفْتَحُ كُلَّ بَابٍ مُغْلَقِ",
    author: "الإمام الشافعي"
  },
  evening: {
    text: "عَلَى قَدْرِ أَهْلِ الْعَزْمِ تَأْتِي الْعَزَائِمُ ... وَتَأْتِي عَلَى قَدْرِ الْكِرَامِ الْمَكَارِمُ",
    author: "أبو الطيب المتنبي"
  },
  night: {
    text: "إِذَا سَجَا اللَّيْلُ وَاسْتَعْرَتْ كَوَاكِبُهُ ... فَابْسُطْ يَدَيْكَ إِلَى الرَّحْمَنِ تَبْتَهِلُ",
    author: "أدب عام"
  }
};

function getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 15) return 'afternoon';
  if (hour >= 15 && hour < 19) return 'evening';
  return 'night';
}

export default function Portal() {
  const navigate = useNavigate();
  const { username } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { pinned, recents, view, isPinned, togglePin, recordOpen, setView } = usePortalPrefs();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PortalCategory | 'all'>('all');
  const [focusedKey, setFocusedKey] = useState<string>(PORTAL_APPS[0].key);
  const [inspectedKey, setInspectedKey] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = view === 'list';

  /* ── viewport width, for arrow-key grid arithmetic ── */
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      // Coalesce resize bursts into one state write per frame.
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setViewportWidth(window.innerWidth);
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* ── filtering + pinned-first ordering ── */
  const counts = useMemo(() => {
    const byCat: Record<string, number> = { all: 0, spirit: 0, body: 0, mind: 0, play: 0 };
    for (const app of PORTAL_APPS) {
      if (!matchesQuery(app, query)) continue;
      byCat.all += 1;
      byCat[app.cat] += 1;
    }
    return byCat;
  }, [query]);

  const visible = useMemo(() => {
    const filtered = PORTAL_APPS.filter(
      (app) => (category === 'all' || app.cat === category) && matchesQuery(app, query),
    );
    // Pins are an explicit user ordering signal, so they lead. Within each
    // bucket the registry order is preserved (it is curated, not alphabetical).
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
  }, [category, query, pinned]);

  /* The detail panel always points at something that is actually on screen.
     Derived, not synced through an effect: filtering to a category the focused
     app is not part of must not cost an extra render pass. */
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
    // ≥1024px already shows the panel in the side column; opening a drawer on
    // top of it would be redundant chrome.
    if (window.innerWidth < 1024) setInspectedKey(app.key);
  }, []);

  const focusApp = useCallback((app: PortalApp) => {
    setFocusedKey(app.key);
    prefetchRoute(app.path);
  }, []);

  const registerRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    tileRefs.current[index] = el;
  }, []);

  /* ── global keyboard shortcuts ── */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable === true;
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === 'Escape' && typing && searchRef.current === target) {
        setQuery('');
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* Arrow-key navigation across the grid, mirrored for RTL. */
  const onGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tileRefs.current.findIndex((el) => el === document.activeElement);
      if (currentIndex === -1) return;
      const columns = columnsFor(viewportWidth, list);
      let nextIndex = currentIndex;

      switch (event.key) {
        // The document is RTL, so "ArrowLeft" walks forward through the list.
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
    [list, viewportWidth, visible.length],
  );

  const recentApps = useMemo(
    () => recents.map((key) => findApp(key)).filter((app): app is PortalApp => Boolean(app)),
    [recents],
  );

  return (
    <PageShell centered={false} flush className="min-h-[100dvh] bg-background pb-page">
      <SEO
        title="amv.life — بوابتك الشخصية"
        description="بوابة amv.life الشخصية: الرئيسي، المحراب، العافية، الدردشة، اطلاع، المعرفة، والألعاب — تطبيقات متكاملة في مكان واحد."
        path="/"
      />

      <PortalHeader unreadCount={unreadCount} />

      <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-page">
        <h1 className="sr-only">amv.life — بوابتك الشخصية</h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-6">
            {/* Elegant Editorial Welcome Hero */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 md:p-8 transition-colors duration-normal">
              {/* Dynamic decorative line with copper accent on hover */}
              <div className="absolute top-0 start-0 h-1 w-24 bg-[hsl(var(--live))]" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--live))] animate-pulse" />
                    <p className="text-mini font-semibold tracking-[0.14em] uppercase text-[hsl(var(--live))]">
                      مرحبًا بك في فضاء السكينة والعمل
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2.5">
                    <h2 className="text-display font-bold text-foreground">
                      {greetingFor(new Date())}
                    </h2>
                    {username && (
                      <span className="text-title font-medium text-muted-foreground">
                        ، {username}
                      </span>
                    )}
                  </div>
                </div>

                {/* Decorative luxury brand mark / seal */}
                <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50 text-[hsl(var(--live))]">
                  <span className="font-amiri text-title font-bold">ع</span>
                </div>
              </div>

              {/* Soulful Classical Arabic Verse Card */}
              <div className="mt-6 border-t border-border/60 pt-5">
                <div className="relative">
                  {/* Elegant quotation mark or ornament */}
                  <span className="absolute -top-3 start-1 select-none font-amiri text-[2.5rem] leading-none text-[hsl(var(--live))]/15">
                    «
                  </span>
                  <p className="font-amiri text-[1.2rem] font-medium leading-[2.1] text-foreground/90 ps-6 text-start md:text-center select-all">
                    {(() => {
                      const timeOfDay = getTimeOfDay(new Date());
                      const verse = VERSES_BY_TIME[timeOfDay];
                      // Highlight the separator "..." elegantly using the live copper accent
                      const parts = verse.text.split("...");
                      if (parts.length === 2) {
                        return (
                          <>
                            <span>{parts[0]}</span>
                            <span className="mx-3 text-[hsl(var(--live))] font-sans font-light text-meta">◆</span>
                            <span>{parts[1]}</span>
                          </>
                        );
                      }
                      return verse.text;
                    })()}
                  </p>
                  <span className="absolute -bottom-3 end-1 select-none font-amiri text-[2.5rem] leading-none text-[hsl(var(--live))]/15">
                    »
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="rounded-full bg-secondary/80 px-3 py-1 text-micro font-medium text-muted-foreground border border-border/40">
                    {VERSES_BY_TIME[getTimeOfDay(new Date())].author}
                  </span>
                </div>
              </div>
            </div>

            {/* Prayer Times widget rendered as a normal widget on the first page */}
            <div className="space-y-4">
              <h2 className="sr-only">مواقيت الصلاة</h2>
              <PrayerTimes />
            </div>

            <PortalLiveBand />

            {recentApps.length > 0 && (
              <section aria-label="آخر ما فتحته">
                <p className="app-section-label mb-2">الأخيرة</p>
                <div className="flex flex-wrap gap-2">
                  {recentApps.map((app) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.key}
                        type="button"
                        onClick={() => openApp(app)}
                        onMouseEnter={() => prefetchRoute(app.path)}
                        className="flex h-11 items-center gap-2 rounded-md border border-border px-3 text-meta font-medium text-foreground transition-[transform,background-color] duration-normal ease-out-expo hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {app.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <PortalFilterBar
              query={query}
              onQueryChange={setQuery}
              category={category}
              onCategoryChange={setCategory}
              view={view}
              onViewChange={setView}
              counts={counts}
              searchRef={searchRef}
            />

            {visible.length === 0 ? (
              <div className="empty-state-surface" role="status">
                <strong>لا نتائج</strong>
                <span className="text-mini text-muted-foreground">
                  لا يوجد تطبيق يطابق «{query}». جرّب كلمة أخرى أو أعد ضبط التصنيف.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                  }}
                  className="mt-3 h-11 rounded-button border border-border px-4 text-meta font-semibold text-foreground transition-colors duration-fast hover:bg-muted"
                >
                  إعادة الضبط
                </button>
              </div>
            ) : (
              <div
                role="grid"
                aria-label="التطبيقات"
                onKeyDown={onGridKeyDown}
                className={
                  list ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-3 min-[700px]:grid-cols-3 min-[700px]:gap-4'
                }
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map((app, index) => (
                    <AppTile
                      key={app.key}
                      app={app}
                      index={index}
                      list={list}
                      active={focusedApp.key === app.key}
                      pinned={isPinned(app.key)}
                      badge={app.key === 'chat' ? unreadCount : undefined}
                      onOpen={openApp}
                      onInspect={inspectApp}
                      onFocusApp={focusApp}
                      registerRef={registerRef}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span className="text-micro font-semibold tracking-[0.14em] text-muted-foreground">
                صنع بحب — عامر و امولة
              </span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
          </div>

          {/* Desktop side panel — sticky under the 56px header. */}
          <aside className="hidden lg:sticky lg:top-[72px] lg:block" aria-label={`اختصارات ${focusedApp.label}`}>
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
