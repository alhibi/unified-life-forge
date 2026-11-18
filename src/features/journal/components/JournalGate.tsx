import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, IconChip, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { Brain, House, Lock, LogIn, PenLine } from '@/lib/icons';

/**
 * JournalGate — the canonical signed-out composition for /journal.
 *
 * The journal is account-backed (entries are scoped to the signed-in user by
 * RLS), so a signed-out visitor never sees the editor. That gate must still
 * explain the page it protects: identity first (the same display header the
 * journal uses when signed in), then the real explanation and one primary
 * action, then a short "what lives here" register. It deliberately is not a
 * lone grey slab floating in a void — a gated surface that hides its own
 * subject reads as a dead end.
 *
 * This component is page-local on purpose: App.tsx passes it to the shared
 * <AuthGuard fallback={<JournalGate />}> slot, so the canonical behaviour of
 * AuthGuard stays untouched for every other gated route.
 */
export function JournalGate() {
  const navigate = useNavigate();

  return (
    <PageShell
      header={
        <PageHeader
          variant="display"
          eyebrow="مذكرتي · دفتر يومي"
          title="مذكرتي"
          subtitle="مساحة هادئة لتدوين يومك، وتتبّع ما يغذّي ذهنك"
        />
      }
    >
      <SEO
        title="مذكرتي — دفتر يومي يعكس توازنك"
        description="مذكرة شخصية تعكس التوازن بين الحدس والتحليل، مع مشهد ثلاثي الأبعاد ينمو مع كل مدخلة."
        path="/journal"
      />

      <div className="app-stack">
        <p className="text-meta leading-relaxed text-muted-foreground">
          {'كل مدخلة تكتبها تعيش داخل حسابك: تُحفظ فيه، وتصلك من أي جهاز، ولا يراها غيرك.'}
        </p>

        <AppCard>
        <StateView
          kind="auth"
          bare
          title="سجّل الدخول إلى مذكرتك"
          body="مذكرتك خاصة بحسابك وتُحفظ فيه لتصل إليها من أي جهاز. سجّل الدخول لتبدأ الكتابة."
          actions={
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => navigate('/auth')}>
                <LogIn className="h-4 w-4" aria-hidden />
                {'تسجيل الدخول'}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/')}>
                <House className="h-4 w-4" aria-hidden />
                {'العودة إلى البوابة'}
              </Button>
            </div>
          }
        />
        </AppCard>

        <section aria-labelledby="journal-gate-behind" className="space-y-2">
          <h2
            id="journal-gate-behind"
            className="app-section-label text-start"
          >
            {'ما الذي يبقى هنا بعد الدخول'}
          </h2>
          <AppList compact>
            <AppRow
              as="div"
              leading={<IconChip tone="plain" aria-hidden><PenLine className="h-4 w-4" /></IconChip>}
              title="مدخلات مكتوبة"
              subtitle="نصّك مع عنوانه ووسومه، قابل للتعديل في أي وقت."
            />
            <AppRow
              as="div"
              leading={<IconChip tone="plain" aria-hidden><Brain className="h-4 w-4" /></IconChip>}
              title="مشهد ذهني يتشكّل"
              subtitle="نصفان يتفاعلان مع نبرة مدخلاتك، لا مع عددها."
            />
            <AppRow
              as="div"
              leading={<IconChip tone="plain" aria-hidden><Lock className="h-4 w-4" /></IconChip>}
              title="خصوصية بحسابك"
              subtitle="لا تظهر مدخلاتك لأي عضو آخر، ولا تُشارك تلقائياً."
            />
          </AppList>
        </section>
      </div>
    </PageShell>
  );
}

export default JournalGate;
