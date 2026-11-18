/**
 * Route guards — one place that decides who may reach a route.
 *
 * Before this file, access control lived in the UI: a screen simply wasn't
 * linked from anywhere, so nobody "normally" reached it. Typing the URL was
 * enough to open the German-Club content review console and the material
 * preview playground. Hiding a link is not a guard.
 *
 * Four levels, matching the product's actual audiences:
 *   PublicRoute        — anyone, signed in or not (documents intent).
 *   AuthenticatedRoute — requires a session; deep links remember where to
 *                        return after sign-in.
 *   AdminRoute         — requires the `admin` role (server-side `user_roles`).
 *   DevelopmentRoute   — build-time only surface; in production it 404s.
 *
 * Every guard renders the same three states so a slow role check never flashes
 * the protected screen: loading → decision → allowed/denied.
 */
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { SkeletonPage } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';

interface GuardProps {
  children: ReactNode;
}

/**
 * Centered, token-only notice used when access is refused but we stay in place.
 *
 * A refused route is still a route: it keeps one semantic h1 (the reason), a
 * real explanation and a way back. Without the heading the strict route audit
 * correctly reports h1-count: 0 for the signed-in-but-not-admin state, and a
 * keyboard/screen-reader user lands on an anonymous block of text.
 */
function Denied({ title, hint }: { title: string; hint: string }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lead font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{hint}</p>
      <Link
        to="/"
        className="app-focus-ring mt-2 inline-flex min-h-11 items-center rounded-md px-4 text-mini font-semibold text-primary underline underline-offset-4"
      >
        العودة إلى البوابة
      </Link>
    </main>
  );
}

/** Explicit "anyone may open this" marker. */
export function PublicRoute({ children }: GuardProps) {
  return <>{children}</>;
}

/**
 * Requires a signed-in session. The intended path travels in router state so
 * the sign-in screen (or any later restore logic) can return the user to the
 * page they actually asked for instead of dropping them on the portal.
 */
export function AuthenticatedRoute({ children }: GuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SkeletonPage />;
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/**
 * Requires the `admin` role. The role is read from the database (`user_roles`),
 * never from local storage, so it cannot be granted by editing the browser.
 */
export function AdminRoute({ children }: GuardProps) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const location = useLocation();

  if (loading || (user && isLoading)) return <SkeletonPage />;
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!isAdmin) {
    return (
      <Denied
        title="هذه الصفحة للمشرفين"
        hint="حسابك لا يملك صلاحية الإشراف على المحتوى. إن كنت تعتقد أن هذا خطأ، تحقق من الحساب الذي سجّلت الدخول به."
      />
    );
  }
  return <>{children}</>;
}

/**
 * Build-time surface. `import.meta.env.DEV` is statically replaced, so the
 * production bundle keeps the redirect branch only.
 */
export function DevelopmentRoute({ children }: GuardProps) {
  if (!import.meta.env.DEV) return <Navigate to="/" replace />;
  return <>{children}</>;
}
