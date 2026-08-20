import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { BookOpen, Sparkles } from '@/lib/icons';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import { useGermanClubStore } from '../useGermanClubStore';
import { GERMAN_CLUB_TOKENS, GermanRegister } from '../types';
import { EntryCard } from '../components/EntryCard';
import { FurnaceButton } from '../components/FurnaceButton';
import { GenerationModal } from '../components/GenerationModal';
import { SessionMomentumLine } from '../components/SessionMomentumLine';
import { BewaehrungsprobeStamp } from '../components/BewaehrungsprobeStamp';

export const ShelfDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [filterRegister, setFilterRegister] = useState<GermanRegister | 'all'>('all');
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState<boolean>(false);
  const [activeJobStatus, setActiveJobStatus] = useState<string | null>(null);
  const [stampStatus, setStampStatus] = useState<'passed' | null>(null);

  const {
    currentShelf,
    entries,
    isLoadingEntries,
    fetchShelfEntries,
    toggleEntryMastered,
    masteredEntryIds,
  } = useGermanClubStore();

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
    <PageShell centered={false} flush>
      <SessionMomentumLine />
      <SEO
        title={`${currentShelf?.title_ar || 'تفاصيل الرف'} — النادي الألماني`}
        description={currentShelf?.description_ar || 'عبارات ومفردات الرف الألمانية'}
        path={`/german-club/shelf/${slug || ''}`}
      />

      <div
        className="min-h-screen pb-20 transition-colors"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* Sticky App Bar */}
        <div className="app-sticky-header z-30 px-4 py-3 flex items-center justify-between border-b border-stone-300/60">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none truncate">
                {currentShelf?.title_ar || 'مواقف الرف'}
              </h1>
              {currentShelf?.title_de && (
                <span
                  className="text-[0.625rem] font-mono font-bold text-[#17324D] tracking-wider uppercase block truncate"
                  dir="ltr"
                  style={{ unicodeBidi: 'isolate' }}
                >
                  {currentShelf.title_de}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Burning Ember "D" Furnace Button for All Users */}
            {currentShelf && (
              <FurnaceButton
                currentCount={entries.length}
                targetCount={currentShelf.target_entry_count || 25}
                isJobRunning={Boolean(activeJobStatus)}
                onClick={() => setIsGenerationModalOpen(true)}
              />
            )}

            <button
              type="button"
              onClick={() => setStampStatus('passed')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#17324D] text-white hover:bg-[#12273d] transition-colors flex items-center gap-1 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              اختبار Bewährungsprobe
            </button>

            <button
              type="button"
              onClick={() => navigate('/german-club/grammar')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-300/80 text-stone-700 hover:bg-stone-200/60 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#17324D]" />
              زاوية القواعد
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Header Info Block */}
          {currentShelf && (
            <div className="space-y-2 border-b border-stone-300/60 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#17324D] bg-[#17324D]/10 px-2.5 py-1 rounded-md">
                    مواقف حية
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                    محتوى متاح للجميع
                  </span>
                </div>

                {activeJobStatus && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#C9703B] bg-[#C9703B]/10 px-2.5 py-1 rounded-md border border-[#C9703B]/20">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>الفرن يعمل في الخلفية...</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                {currentShelf.description_ar}
              </p>
            </div>
          )}

          {/* Filter Bar (Registers) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="font-bold text-stone-500 shrink-0">السجل اللغوي:</span>
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
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 font-medium ${
                  filterRegister === tab.id
                    ? 'bg-[#17324D] text-white shadow-xs'
                    : 'bg-stone-200/60 text-stone-700 hover:bg-stone-300/60'
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
                <div key={i} className="h-28 rounded-2xl bg-stone-200/60 animate-pulse" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-stone-400 opacity-60" />
              <p className="text-sm">لا توجد عناصر في هذا الرف تنطبق عليها تصفية السجل المحدد.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  initialMastered={masteredEntryIds.has(entry.id)}
                  onToggleMastered={toggleEntryMastered}
                />
              ))}
            </div>
          )}
        </div>

        {/* Furnace Generation Console v2 Modal */}
        {currentShelf && (
          <GenerationModal
            shelfId={currentShelf.id}
            shelfTitleAr={currentShelf.title_ar}
            shelfTitleDe={currentShelf.title_de}
            currentEntryCount={entries.length}
            targetCount={currentShelf.target_entry_count || 25}
            isOpen={isGenerationModalOpen}
            onClose={() => setIsGenerationModalOpen(false)}
          />
        )}

        {/* Bewährungsprobe Surge Stamp Moment */}
        <BewaehrungsprobeStamp
          status={stampStatus}
          shelfTitleAr={currentShelf?.title_ar}
          onComplete={() => setStampStatus(null)}
        />
      </div>
    </PageShell>
  );
};

export default ShelfDetail;
