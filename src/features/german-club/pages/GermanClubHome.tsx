import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, IconButton, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { BookOpen, ShieldAlert, Sparkles, Wand2 } from '@/lib/icons';

import { HeuteImClub } from '../components/Daily/HeuteImClub';
import { DiscoveryCard } from '../components/DiscoveryCard';
import { QuickLookup } from '../components/QuickLookup';
import { ShelfCard } from '../components/ShelfCard';
import { WortschatzSpiegel } from '../components/WortschatzSpiegel';
import { Wortspaziergang } from '../components/Wortspaziergang';
import { GermanShelf } from '../types';
import { useGermanClubStore } from '../useGermanClubStore';

// The content furnace (generation tool) is an occasional admin-ish flow —
// keep it out of the initial club bundle.
const GenerationModal = lazy(() =>
  import('../components/GenerationModal').then((m) => ({ default: m.GenerationModal })),
);

export const GermanClubHome: React.FC = () => {
  const navigate = useNavigate();
  const { shelves, isLoadingShelves, fetchShelves } = useGermanClubStore();

  const [selectedFurnaceShelf, setSelectedFurnaceShelf] = useState<GermanShelf | null>(null);
  const [spaziergangOpen, setSpaziergangOpen] = useState(false);

  useEffect(() => {
    fetchShelves();
  }, [fetchShelves]);

  return (
    <PageShell centered={false} flush className="px-4 pt-4 sm:pt-6">
      <SEO
        title="النادي الألماني (Der Club) — مرجع المواقف الواقعية"
        description="مرجع لغوي ألماني/عربي مرتب حسب المواقف اليومية بألوان الأجناس وتفسير الأفعال المنفصلة."
        path="/german-club"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-page">
        {/* Masthead — the hub register: back rail, centred serif title, and
            the club's two secondary destinations as a chip rail. */}
        <PageHeader
          variant="display"
          eyebrow="DER CLUB — AMV"
          title="النادي الألماني"
          subtitle="الألمانية بالمواقف الحية — مرجع مجاني للقراءة والاستخدام"
          right={
            <IconButton
              onClick={() => navigate('/german-club/review')}
              title="مراجعة المحتوى"
              aria-label="مراجعة المحتوى"
            >
              <ShieldAlert className="h-5 w-5 text-signal" aria-hidden />
            </IconButton>
          }
        >
          <div className="flex w-full flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => navigate('/german-club/dictionary')}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              القاموس الشامل
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => navigate('/german-club/grammar')}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              زاوية القواعد
            </Button>
          </div>
        </PageHeader>

        {/* Hero paragraph + the word-walk CTA */}
        <section className="flex flex-col items-center gap-3 text-center">
          <p className="max-w-md text-mini leading-relaxed text-muted-foreground">
            رفوف مرتبة بالحالات اليومية — من طلب القهوة إلى مواقف العمل والقطارات. مع توضيح أجناس
            الأسماء بالألوان وتفكيك الأفعال المنفصلة حركةً.
          </p>
          <Button
            size="lg"
            className="gap-2.5"
            onClick={() => setSpaziergangOpen(true)}
          >
            <Wand2 className="h-4 w-4" aria-hidden />
            <span>ابدأ جولة لغوية</span>
            <span className="rounded-md border border-signal/40 px-1.5 py-0.5 font-mono text-micro font-bold uppercase tracking-widest text-signal">
              7 خطوات
            </span>
          </Button>

          <WortschatzSpiegel />
        </section>

        {/* Gender colour code legend — the swatches follow GENDER_COLORS, the
            same keys the entry dots use, so the legend cannot drift from the
            cards it explains. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-track px-3.5 py-3 text-mini">
          <span className="flex items-center gap-1.5 font-bold text-foreground">
            <span>رمزية ألوان أجناس الأسماء:</span>
          </span>
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-data-4" aria-hidden />
              <span>Der (مذكر)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-data-5" aria-hidden />
              <span>Die (مؤنث)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-data-6" aria-hidden />
              <span>Das (محايد)</span>
            </div>
          </div>
        </div>

        {/* Quick Lookup — live multi-language search */}
        <QuickLookup />

        {/* Discovery — random word with reason */}
        <DiscoveryCard />

        {/* Heute im Club — daily content */}
        <HeuteImClub />

        {/* Main Shelf Wall */}
        <section aria-label="رفوف المواقف اليومية">
          <header className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <h2 className="type-section text-foreground">
              رفوف المواقف اليومية (<span className="tabular-nums">{shelves.length}</span>)
            </h2>
            <p className="text-mini text-muted-foreground">اختر الرف لتصفح محتواه</p>
          </header>

          {isLoadingShelves ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
              ))}
            </div>
          ) : shelves.length === 0 ? (
            <StateView
              kind="empty"
              title="لا توجد رفوف بعد"
              body="لم تُحمَّل رفوف المواقف من الخادم. تحقق من اتصالك ثم أعد المحاولة."
              action={{ label: 'إعادة المحاولة', onClick: () => fetchShelves() }}
              compact
            />
          ) : (
            <AppList>
              {shelves.map((shelf) => (
                <ShelfCard
                  key={shelf.id}
                  shelf={shelf}
                  onOpenFurnace={(s, e) => {
                    e.stopPropagation();
                    setSelectedFurnaceShelf(s);
                  }}
                  onClick={() => navigate(`/german-club/shelf/${shelf.slug}`)}
                />
              ))}
            </AppList>
          )}
        </section>

        {/* Furnace Generation Modal when triggered from home shelf rows */}
        {selectedFurnaceShelf && (
          <Suspense fallback={null}>
            <GenerationModal
              shelfId={selectedFurnaceShelf.id}
              shelfSlug={selectedFurnaceShelf.slug}
              shelfTitleAr={selectedFurnaceShelf.title_ar}
              shelfTitleDe={selectedFurnaceShelf.title_de}
              shelfDescriptionAr={selectedFurnaceShelf.description_ar}
              currentEntryCount={0}
              targetCount={selectedFurnaceShelf.target_entry_count || 25}
              isOpen={Boolean(selectedFurnaceShelf)}
              onClose={() => setSelectedFurnaceShelf(null)}
            />
          </Suspense>
        )}

        {/* Wortspaziergang Modal */}
        <Wortspaziergang open={spaziergangOpen} onClose={() => setSpaziergangOpen(false)} />
      </div>
    </PageShell>
  );
};

export default GermanClubHome;
