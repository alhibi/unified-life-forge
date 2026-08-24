import React, { useEffect, useState } from 'react';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { Check, ShieldAlert, Sparkles } from '@/lib/icons';

import { GenderDot } from '../components/GenderDot';
import { GERMAN_CLUB_TOKENS } from '../types';
import { useGermanClubStore } from '../useGermanClubStore';

export const ContentReviewAdmin: React.FC = () => {
  const {
    unreviewedEntries,
    isLoadingUnreviewed,
    fetchUnreviewedEntries,
    promoteEntryStatus,
  } = useGermanClubStore();

  const [filterConfidence, setFilterConfidence] = useState<number>(0);

  useEffect(() => {
    fetchUnreviewedEntries();
  }, [fetchUnreviewedEntries]);

  const handlePromote = async (entryId: string, status: 'reviewed' | 'verified') => {
    await promoteEntryStatus(entryId, status);
  };

  return (
    <PageShell centered={false} flush>
      <SEO
        title="مراجعة المحتوى والمهل — النادي الألماني"
        description="أداة مراجعة واعتماد المفردات الموّلدة بواسطة الذكاء الاصطناعي لحظر الهلوسة."
        path="/german-club/review"
      />

      <div
        className="min-h-screen pb-20 transition-colors"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* Sticky App Bar Header */}
        <div className="app-sticky-header z-30 px-4 py-3 flex items-center justify-between border-b border-stone-300/60">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none">
                مراجعة محتوى الذكاء الاصطناعي
              </h1>
              <span className="text-[0.625rem] font-mono font-bold text-amber-900 tracking-widest uppercase">
                CONTENT REVIEW & QUALITY GUARD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/10 text-amber-900 text-xs font-bold border border-amber-800/20">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>حظر الهلوسة 100%</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              مبدأ الحظر الصارم للمحتوى الموّلد:
            </p>
            <p>
              أي مفردة أو جملة تحمل حالة <code className="bg-amber-100 px-1 rounded">ai_generated</code> تبقى مخفية ومحجوبة تماماً عن المستخدمين بفضل سياسات الأمان على قاعدة البيانات (RLS)، ولا تظهر للمستخدم إلا بعد تغيير حالتها إلى <code className="bg-amber-100 px-1 rounded">reviewed</code> أو <code className="bg-amber-100 px-1 rounded">verified</code> من هذه الصفحة.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-[#17181C]">
              العناصر بانتظار الاعتماد ({unreviewedEntries.length})
            </h3>
            <button
              type="button"
              onClick={() => fetchUnreviewedEntries()}
              className="text-xs font-semibold text-[#17324D] hover:underline"
            >
              تحديث القائمة
            </button>
          </div>

          {isLoadingUnreviewed ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-stone-200/60 animate-pulse" />
              ))}
            </div>
          ) : unreviewedEntries.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-2 border-2 border-dashed border-stone-300 rounded-2xl p-6">
              <Check className="w-8 h-8 mx-auto text-emerald-600" />
              <p className="text-sm font-bold text-stone-800">
                لا توجد عناصر بانتظار المراجعة!
              </p>
              <p className="text-xs text-stone-500">
                جميع المفردات والعبارات الموّلدة تمت مراجعتها واعتمادها بنجاح.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {unreviewedEntries.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border p-5 bg-white/80 border-stone-300/80 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <GenderDot gender={item.gender} size={11} className="mt-1" />
                      <span className="font-mono text-xl font-bold text-stone-900" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                        {item.german_text}
                      </span>
                      {item.ipa && (
                        <span className="text-xs font-mono text-stone-500">[{item.ipa}]</span>
                      )}
                    </div>

                    <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Draft (مسودة)
                    </span>
                  </div>

                  <p className="text-sm text-stone-800">{item.arabic_translation}</p>

                  {item.example_sentence_de && (
                    <div className="text-xs font-mono bg-stone-100 p-2.5 rounded-lg border border-stone-200/60 text-stone-700" dir="ltr">
                      {item.example_sentence_de}
                      <div className="mt-1 font-sans text-stone-600 text-[0.6875rem]" dir="rtl">
                        {item.example_sentence_ar}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => handlePromote(item.id, 'reviewed')}
                      className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-stone-700" />
                      <span>اعتماد (Reviewed)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePromote(item.id, 'verified')}
                      className="px-3 py-1.5 rounded-xl bg-[#17324D] hover:bg-[#12273d] text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>توثيق دقيق (Verified)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default ContentReviewAdmin;
