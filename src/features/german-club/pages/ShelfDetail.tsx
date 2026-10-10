import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import { BookOpen, Sparkles } from '@/lib/icons';

import { EntryCard } from '../components/EntryCard';
import { FurnaceButton } from '../components/FurnaceButton';
import { GermanRegister } from '../types';
import { useGermanClubStore } from '../useGermanClubStore';

// The content furnace (generation tool) is an occasional admin-ish flow —
// keep it out of the initial club bundle.
const GenerationModal = lazy(() =>
  import('../components/GenerationModal').then((m) => ({ default: m.GenerationModal })),
);

export const ShelfDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [filterRegister, setFilterRegister] = useState<GermanRegister | 'all'>('all');
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState<boolean>(false);
  const [activeJobStatus, setActiveJobStatus] = useState<string | null>(null);

  const { currentShelf, entries, isLoadingEntries, fetchShelfEntries } = useGermanClubStore();

  useEffect(() => {
    if (slug) {
      fetchShelfEntries(slug);
    }
  }, [slug, fetchShelfEntries]);

  // Check if there is an active job running for this shelf
  useEffect(() => {
    if (!currentShelf?.id) return;

    const checkRunningJob = async () => {
      try {
        const { data, error } = await supabase
          .from('content_generation_jobs')
          .select('status')
          .eq('shelf_id', currentShelf.id)
          .in('status', ['queued', 'running'])
          .maybeSingle();

        if (!error && data) {
          setActiveJobStatus(data.status);
        } else {
          setActiveJobStatus(null);
        }
      } catch (err) {
        console.warn('Failed to check running job status:', err);
        setActiveJobStatus(null);
      }
    };

    void checkRunningJob();

    const channel = supabase
      .channel(`shelf_jobs_${currentShelf.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_generation_jobs',
          filter: `shelf_id=eq.${currentShelf.id}`,
        },
        () => {
          void checkRunningJob();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentShelf?.id]);

  const filteredEntries = entries.filter((e) => {
    if (filterRegister === 'all') return true;
    return e.register === filterRegister;
  });

  return (
    <PageShell centered={false} flush className="px-4 pt-4 sm:pt-6">
      <SEO
        title={`${currentShelf?.title_ar || 'تفاصيل الرف'} — النادي الألماني`}
        description={currentShelf?.description_ar || 'عبارات ومفردات الرف الألمانية'}
        path={`/german-club/shelf/${slug || ''}`}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-page">
        {/* App Bar */}
        <PageHeader
          title={currentShelf?.title_ar || 'مواقف الرف'}
          subtitle={
            currentShelf?.title_de ? (
              <span className="font-mono" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                {currentShelf.title_de}
              </span>
            ) : undefined
          }
          right={
            <>
              {/* Furnace 'D' Button — opens the AI generation modal */}
              {currentShelf && (
                <FurnaceButton
                  currentCount={entries.length}
                  targetCount={currentShelf.target_entry_count || 25}
                  isJobRunning={Boolean(activeJobStatus)}
                  onClick={() => setIsGenerationModalOpen(true)}
                />
              )}

              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={() => navigate('/german-club/grammar')}
              >
                <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden />
                زاوية القواعد
              </Button>
            </>
          }
        />

        {/* Header Info Block */}
        {currentShelf && (
          <section className="space-y-2 border-b border-track pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-mini font-bold text-primary">
                  مواقف حية
                </span>
                <span className="rounded-md bg-data-1/15 px-2.5 py-1 text-mini font-bold text-data-1">
                  محتوى متاح للجميع
                </span>
              </div>

              {activeJobStatus && (
                <div className="flex items-center gap-1.5 rounded-md border border-signal/20 bg-signal/10 px-2.5 py-1 text-mini font-bold text-signal">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  <span>الفرن يعمل في الخلفية...</span>
                </div>
              )}
            </div>
            <p className="text-body leading-relaxed text-muted-foreground">
              {currentShelf.description_ar}
            </p>
          </section>
        )}

        {/* Filter Bar (Registers) */}
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1 text-mini">
          <span className="shrink-0 font-bold text-muted-foreground">السجل اللغوي:</span>
          {[
            { id: 'all', label: 'الكل' },
            { id: 'neutral', label: 'محايد' },
            { id: 'informal', label: 'غير رسمي' },
            { id: 'formal', label: 'رسمي' },
            { id: 'slang', label: 'عامي / slang' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterRegister(tab.id as GermanRegister | 'all')}
              aria-pressed={filterRegister === tab.id}
              className={`shrink-0 rounded-md border px-3 py-1.5 font-medium transition-motion ${
                filterRegister === tab.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-track bg-secondary/40 text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Entries Feed */}
        {isLoadingEntries ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <StateView
            kind="empty"
            title="لا توجد عناصر مطابقة"
            body="لا توجد عناصر في هذا الرف تنطبق عليها تصفية السجل المحدد. جرّب «الكل» أو سجلاً لغوياً آخر."
            secondary={
              filterRegister !== 'all' ? (
                <Button variant="ghost" size="sm" onClick={() => setFilterRegister('all')}>
                  إظهار كل السجلات
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Furnace Generation Modal — mounted only while open, so a reopened
          dialog always starts from a clean wizard state. */}
      {isGenerationModalOpen && currentShelf && (
        <Suspense fallback={null}>
          <GenerationModal
            shelfId={currentShelf.id}
            shelfSlug={currentShelf.slug}
            shelfTitleAr={currentShelf.title_ar}
            shelfTitleDe={currentShelf.title_de}
            shelfDescriptionAr={currentShelf.description_ar}
            currentEntryCount={entries.length}
            targetCount={currentShelf.target_entry_count || 25}
            isOpen
            onClose={() => setIsGenerationModalOpen(false)}
          />
        </Suspense>
      )}
    </PageShell>
  );
};

export default ShelfDetail;
