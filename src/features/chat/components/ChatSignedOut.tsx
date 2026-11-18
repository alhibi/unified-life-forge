import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import { AppCard, AppList, AppRow, IconChip, PageShell } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';

export interface ChatSignedOutPoint {
  icon: ReactNode;
  title: string;
  body: string;
}

interface ChatSignedOutSurfaceProps {
  /** Page identity — the single h1. */
  title: string;
  subtitle?: string;
  backFallback?: string;
  /** What this gated surface is, in the product's own terms. */
  heroTitle: string;
  heroBody: string;
  /** What an account actually unlocks here (real behaviours only). */
  points: ChatSignedOutPoint[];
  /** One short line under the actions — what stays available without an account. */
  footnote: string;
  signInLabel?: string;
  guestLabel?: string;
  guestTo?: string;
}

/**
 * The signed-out page of every communication route.
 *
 * Consumes the shared gated-surface contract: PageShell + PageHeader identity,
 * a bounded AppCard holding the shared StateView kind="auth", a 2-3 row context
 * strip of capabilities that exist in this feature, and one quiet guest escape.
 * No auto-redirect; the sign-in action is the same canonical destination the
 * rest of the app uses.
 */
export default function ChatSignedOutSurface({
  title,
  subtitle,
  backFallback = '/',
  heroTitle,
  heroBody,
  points,
  footnote,
  signInLabel = 'تسجيل الدخول',
  guestLabel,
  guestTo = '/',
}: ChatSignedOutSurfaceProps) {
  const navigate = useNavigate();

  return (
    <PageShell
      header={<PageHeader title={title} subtitle={subtitle} backFallback={backFallback} />}
    >
      <div className="app-stack">
        <AppCard>
          <StateView
            kind="auth"
            title={heroTitle}
            body={heroBody}
            action={{ label: signInLabel, onClick: () => navigate('/auth') }}
            secondary={
              guestLabel ? (
                <button
                  type="button"
                  onClick={() => navigate(guestTo)}
                  className="app-focus-ring text-mini font-semibold text-secondary-muted underline underline-offset-4 hover:text-foreground"
                >
                  {guestLabel}
                </button>
              ) : undefined
            }
          />
        </AppCard>

        <AppList aria-label={'ما يتيحه الحساب هنا'}>
          {points.slice(0, 3).map((point) => (
            <AppRow
              key={point.title}
              as="div"
              leading={<IconChip>{point.icon}</IconChip>}
              title={point.title}
              subtitle={point.body}
            />
          ))}
        </AppList>

        <p className="text-micro leading-relaxed text-muted-foreground-subtle">{footnote}</p>
      </div>
    </PageShell>
  );
}
