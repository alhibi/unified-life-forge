import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, IconChip, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { Activity, House, LogIn, ShieldCheck, UserCircle } from '@/lib/icons';

/**
 * ProfileGate — the canonical signed-out composition for /profile.
 *
 * The route used to bounce a signed-out visitor to /auth the moment the auth
 * check resolved, which left the requested route itself with no identity (and
 * no h1) while the redirect was in flight. This surface keeps the page the
 * person asked for: its own header, the real state, what is behind the gate,
 * one primary sign-in step and a secondary escape back to the portal — the same
 * shape as every other gated route (see AuthGuard + StateView kind="auth").
 */
export function ProfileGate({ loading }: { loading: boolean }) {
  const navigate = useNavigate();
  const signIn = () => navigate(`/auth?next=${encodeURIComponent('/profile')}`);

  return (
    <PageShell
      header={
        <PageHeader
          title="الملف الشخصي"
          subtitle="الهوية والنبذة والخصوصية"
          backTo="/settings"
        />
      }
    >
      <SEO
        title="الملف الشخصي — amv.life"
        description="ملفك الشخصي في amv.life: الصورة والاسم والنبذة، وإعدادات الخصوصية، ومتابعة نشاطك."
        path="/profile"
      />

      <div className="app-stack">
        <p className="text-meta leading-relaxed text-muted-foreground">
          ملفك الشخصي مرتبط بحسابك: صورتك ونبذتك وسجلّك تبقى معك على أي جهاز.
        </p>

        <AppCard className="p-2">
          {loading ? (
            <div className="h-56 animate-pulse rounded-lg bg-muted/30" aria-busy="true" />
          ) : (
            <StateView
              bare
              kind="auth"
              title="سجّل الدخول إلى ملفك الشخصي"
              body="صورة الملف والنبذة والروابط وسجل النشاط تُحفظ في حسابك. سجّل الدخول لترى ملفك أو تعدّله."
              actions={
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={signIn}>
                    <LogIn className="h-4 w-4" aria-hidden />
                    تسجيل الدخول
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/')}>
                    <House className="h-4 w-4" aria-hidden />
                    العودة إلى البوابة
                  </Button>
                </div>
              }
            />
          )}
        </AppCard>

        <section aria-labelledby="profile-gate-behind" className="space-y-3">
          <h2 id="profile-gate-behind" className="text-meta font-semibold text-muted-foreground">
            ما الذي يظهر هنا بعد الدخول
          </h2>
          <AppList compact>
            <AppRow
              as="div"
              leading={<IconChip tone="plain" aria-hidden><UserCircle className="h-4 w-4" /></IconChip>}
              title="هويتك"
              subtitle="الصورة والاسم والنبذة والعنوان التعريفي"
            />
            <AppRow
              as="div"
              leading={<IconChip tone="plain" aria-hidden><Activity className="h-4 w-4" /></IconChip>}
              title="سجل نشاطك"
              subtitle="الصلوات والقراءة والألعاب ومؤشرات أسبوعك"
            />
            <AppRow
              as="div"
              leading={<IconChip tone="plain" aria-hidden><ShieldCheck className="h-4 w-4" /></IconChip>}
              title="الخصوصية والتصدير"
              subtitle="ما يظهر للآخرين، وتصدير إعداداتك أو حذفها"
            />
          </AppList>
        </section>
      </div>
    </PageShell>
  );
}

export default ProfileGate;
