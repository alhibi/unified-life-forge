import { AnimatePresence, motion } from 'framer-motion';
import React, { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, IconChip, PageShell } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import { useDiwanStats } from '@/features/diwan/lib/hooks';
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Library as LibraryIcon,
  Loader2,
  Network,
  Search,
  Sparkles,
  Users,
} from '@/lib/icons';

// LiteraryGraph بكسلًا فقط عند توسيع القسم.
const LiteraryGraph = lazy(() => import('@/features/diwan/components/LiteraryGraph'));

interface Props {
  /**
   * عند تركيبها كصفحة الـ tab الرئيسية لقسم الديوان أو محتوًى مدمج
   * داخل تبويب أكبر (مثل تبويب "الأدب" داخل /mihrab)، نخفي زرّ
   * الرجوع وكذلك الإطار الخارجي لأنّ الصفحة الأم هي مَن يُوفّرها.
   * الافتراضي عبر الراوتر هو page-mode.
   */
  tab?: boolean;
  /**
   * `hub` is the /diwan gateway (identity + entry points), `index` is
   * /diwan/library (the catalog itself). They share one data wiring and one
   * set of primitives; only the register of the header and the first entry
   * differ, so the two routes stop rendering the identical screen.
   */
  variant?: 'hub' | 'index';
}

const QUICK_ACTIONS = [
  { to: '/diwan/library/search', icon: Search, label: 'البحث المتقدّم', sub: 'ابحث في 3 ملايين بيت' },
  { to: '/diwan/library/poets', icon: Users, label: 'شجرة الشعراء', sub: 'مرتّبون بالعصور' },
  { to: '/diwan/library/favorites', icon: Heart, label: 'مفضلتي الخاصة', sub: 'المحفوظ من القصائد' },
  { to: '/diwan/bayan', icon: Sparkles, label: 'البيان الإعرابي والبلاغي', sub: 'محلل عروضي وصرفي عميق' },
] as const;

/**
 * صفحة المكتبة الكبرى الرئيسية (Hub). كانت ترويسة مخصصة بعنوان كبير
 * وبطاقة إحصاءات بزخارف (◆/تدرجات سابقة)، وقائمة بطاقات لكل صف؛
 * الآن: <PageHeader variant="display"> للترويسة، و<AppList>/<AppRow>
 * للوصول السريع، و<StatGrid> للإحصاءات — والنصوص والمسارات كما هي.
 */
export default function DiwanLibraryPage({ tab = false, variant = 'index' }: Props) {
  const navigate = useNavigate();
  const stats = useDiwanStats();
  const [showGraph, setShowGraph] = useState(false);
  const isHub = variant === 'hub';

  const numFmt = (n: number | undefined) =>
    typeof n === 'number' ? n.toLocaleString('ar-EG') : '—';

  const actions = isHub
    ? [
        {
          to: '/diwan/library',
          icon: LibraryIcon,
          label: 'المكتبة الكبرى',
          sub: 'فهرس الشعر والشعراء والعصور',
        },
        ...QUICK_ACTIONS,
      ]
    : QUICK_ACTIONS;

  const content = (
    <>
      <PageHeader
        variant="display"
        eyebrow={isHub ? 'الأدب · الديوان' : 'الديوان · المكتبة'}
        icon={<LibraryIcon className="h-6 w-6 text-primary" aria-hidden />}
        title={isHub ? 'الديوان العربي' : 'المكتبة الكبرى'}
        subtitle={
          isHub
            ? 'بوابة الشعر العربي الخالد: اقرأ، وابحث، وتتبّع أثر الشعراء'
            : 'فهرس الشعر والشعراء والعصور'
        }
        hideBack={tab}
        backFallback="/"
      >
        <FallbackBadge />
      </PageHeader>

      {isHub && (
        <p className="text-meta leading-relaxed text-muted-foreground">
          {'المكتبة ليست شبكة بطاقات: هنا يُحفظ البيت، ويُقرأ الشاعر، ويُتتبّع العصر. اختر مدخلك من الفهرس أدناه.'}
        </p>
      )}

      {/* Register — الرقوق المحفوظة. Editorial line, not a KPI deck: three
          numbers read as one sentence so the poetry stays the loudest thing. */}
      <section aria-labelledby="diwan-register" className="border-y border-border/60 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="diwan-register" className="app-section-label">
            {'الرقوق المحفوظة'}
          </h2>
          <span className="text-micro text-muted-foreground">
            {stats.isLoading ? 'جارٍ الإحصاء…' : 'نسخة محلية'}
          </span>
        </div>
        {stats.isError ? (
          <StateView
            compact
            kind="error"
            className="my-2"
            title={'تعذّر جمع إحصاءات المكتبة'}
            body={'القراءة والبحث يعملان من النسخة المحلية؛ الأرقام وحدها لم تصل.'}
            action={{ label: 'إعادة المحاسبة', onClick: () => void stats.refetch() }}
          />
        ) : (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-meta text-muted-foreground">
            <span className="text-title font-bold tabular-nums text-foreground">{numFmt(stats.data?.verses_count)}</span>
            <span>{'بيتاً'}</span>
            <span aria-hidden className="text-border">{'·'}</span>
            <span className="text-title font-bold tabular-nums text-foreground">{numFmt(stats.data?.poems_count)}</span>
            <span>{'قصيدة'}</span>
            <span aria-hidden className="text-border">{'·'}</span>
            <span className="text-title font-bold tabular-nums text-foreground">{numFmt(stats.data?.poets_count)}</span>
            <span>{'شاعراً'}</span>
          </p>
        )}
      </section>

      {/* Entry points */}
      <AppList>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <AppRow
              key={action.to}
              onClick={() => navigate(action.to)}
              chevron
              leading={
                <IconChip tone="plain" aria-hidden>
                  <Icon className="h-5 w-5" />
                </IconChip>
              }
              title={action.label}
              subtitle={action.sub}
            />
          );
        })}
      </AppList>

      {/* الشجرة الأدبية */}
      <section>
        <AppCard
          as="button"
          compact
          aria-expanded={showGraph}
          onClick={() => setShowGraph((s) => !s)}
          className="w-full text-start"
        >
          <span className="flex items-center gap-3">
            <IconChip tone={showGraph ? 'accent' : 'plain'} aria-hidden>
              <Network className="h-4 w-4" />
            </IconChip>
            <span className="min-w-0 flex-1 text-start">
              <span className="block text-mini font-bold leading-tight text-foreground">
                الشجرة الأدبية للتواصل
              </span>
              <span className="mt-0.5 block text-micro text-muted-foreground">
                صلات الشعراء وتأثيراتهم عبر القرون
              </span>
            </span>
            {showGraph ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </span>
        </AppCard>

        <AnimatePresence initial={false}>
          {showGraph && (
            <motion.div
              key="graph-wrap"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <Suspense
                  fallback={
                    <AppCard className="flex h-[65vh] min-h-[380px] items-center justify-center">
                      <span className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                        <span className="text-micro">جاري بسط الشجرة الأدبية…</span>
                      </span>
                    </AppCard>
                  }
                >
                  <LiteraryGraph onSelectPoet={(id) => navigate(`/diwan/library/poet/${id}`)} />
                </Suspense>
                <p className="mx-auto mt-3 max-w-sm select-none text-center text-micro leading-relaxed text-muted-foreground">
                  اضغط على أي شاعر لرؤية علاقاته الأدبية، أو انقر على "قصائده" لزيارة ديوانه الخاص.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );

  if (tab) {
    return <div className="space-y-5">{content}</div>;
  }

  return (
    <PageShell>
      <SEO
        title={
          isHub
            ? 'الديوان العربي — بوابة الشعر الكلاسيكي'
            : 'المكتبة الكبرى — الديوان العربي الكلاسيكي'
        }
        description="آلاف الشعراء وعشرات الآلاف من القصائد عبر العصور: الجاهلي، الأموي، العباسي، الأندلسي وما بعدها."
        path="/diwan/library"
      />
      <div className="space-y-5">{content}</div>
    </PageShell>
  );
}
