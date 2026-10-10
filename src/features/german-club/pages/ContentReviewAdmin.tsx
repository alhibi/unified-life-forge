import React, { useEffect } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { Check, ShieldAlert, Sparkles } from '@/lib/icons';

import { GenderDot } from '../components/GenderDot';
import { useGermanClubStore } from '../useGermanClubStore';

export const ContentReviewAdmin: React.FC = () => {
  const {
    unreviewedEntries,
    isLoadingUnreviewed,
    fetchUnreviewedEntries,
    promoteEntryStatus,
  } = useGermanClubStore();

  useEffect(() => {
    fetchUnreviewedEntries();
  }, [fetchUnreviewedEntries]);

  const handlePromote = async (entryId: string, status: 'reviewed' | 'verified') => {
    await promoteEntryStatus(entryId, status);
  };

  return (
    <PageShell centered={false} flush className="px-4 pt-4 sm:pt-6">
      <SEO
        title="مراجعة المحتوى والمهل — النادي الألماني"
        description="أداة مراجعة واعتماد المفردات الموّلدة بواسطة الذكاء الاصطناعي لحظر الهلوسة."
        path="/german-club/review"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-page">
        {/* App Bar */}
        <PageHeader
          title="مراجعة محتوى الذكاء الاصطناعي"
          subtitle={<span className="font-mono">CONTENT REVIEW & QUALITY GUARD</span>}
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/20 bg-signal/10 px-3 py-1 text-mini font-bold text-signal">
              <ShieldAlert className="h-3.5 w-3.5 text-signal" aria-hidden />
              <span>حظر الهلوسة 100%</span>
            </span>
          }
        />

        <div className="space-y-1 rounded-lg border border-signal/30 bg-signal/10 p-4 text-mini leading-relaxed text-foreground">
          <p className="flex items-center gap-1.5 text-body font-bold">
            <ShieldAlert className="h-4 w-4 text-signal" aria-hidden />
            مبدأ الحظر الصارم للمحتوى الموّلد:
          </p>
          <p>
            أي مفردة أو جملة تحمل حالة{' '}
            <code className="rounded bg-secondary px-1 font-mono">ai_generated</code> تبقى مخفية
            ومحجوبة تماماً عن المستخدمين بفضل سياسات الأمان على قاعدة البيانات (RLS)، ولا تظهر
            للمستخدم إلا بعد تغيير حالتها إلى{' '}
            <code className="rounded bg-secondary px-1 font-mono">reviewed</code> أو{' '}
            <code className="rounded bg-secondary px-1 font-mono">verified</code> من هذه الصفحة.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <h3 className="type-section text-foreground">
            العناصر بانتظار الاعتماد (
            <span className="tabular-nums">{unreviewedEntries.length}</span>)
          </h3>
          <Button variant="link" size="sm" onClick={() => fetchUnreviewedEntries()}>
            تحديث القائمة
          </Button>
        </div>

        {isLoadingUnreviewed ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : unreviewedEntries.length === 0 ? (
          <StateView
            kind="empty"
            title="لا توجد عناصر بانتظار المراجعة!"
            body="جميع المفردات والعبارات الموّلدة تمت مراجعتها واعتمادها بنجاح."
          />
        ) : (
          <div className="space-y-4">
            {unreviewedEntries.map((item) => (
              <AppCard key={item.id} as="article" className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <GenderDot gender={item.gender} size={11} className="mt-1" />
                    <span
                      className="font-mono text-title font-bold text-foreground"
                      dir="ltr"
                      style={{ unicodeBidi: 'isolate' }}
                    >
                      {item.german_text}
                    </span>
                    {item.ipa && (
                      <span className="font-mono text-mini text-muted-foreground">[{item.ipa}]</span>
                    )}
                  </div>

                  <span className="rounded bg-signal/15 px-2 py-0.5 text-micro font-bold text-signal">
                    Draft (مسودة)
                  </span>
                </div>

                <p className="text-body text-foreground">{item.arabic_translation}</p>

                {item.example_sentence_de && (
                  <div
                    className="rounded-md border border-track bg-secondary/40 p-2.5 font-mono text-mini text-foreground"
                    dir="ltr"
                  >
                    {item.example_sentence_de}
                    <div className="mt-1 font-sans text-micro text-muted-foreground" dir="rtl">
                      {item.example_sentence_ar}
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex items-center justify-end gap-2 border-t border-track pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    onClick={() => handlePromote(item.id, 'reviewed')}
                  >
                    <Check className="h-3.5 w-3.5 text-foreground" aria-hidden />
                    <span>اعتماد (Reviewed)</span>
                  </Button>

                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => handlePromote(item.id, 'verified')}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    <span>توثيق دقيق (Verified)</span>
                  </Button>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default ContentReviewAdmin;
