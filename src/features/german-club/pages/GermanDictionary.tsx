import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { BookmarkCheck, BookOpen, Layers,SearchX, Sparkles } from '@/lib/icons';

import { AlphabetNav } from '../components/dictionary/AlphabetNav';
import { DictionaryDetailModal } from '../components/dictionary/DictionaryDetailModal';
import { DictionarySearchFilters } from '../components/dictionary/DictionarySearchFilters';
import { DictionaryVirtualGrid } from '../components/dictionary/DictionaryVirtualGrid';
import { WortDesTagesCard } from '../components/dictionary/WortDesTagesCard';
import {GERMAN_CLUB_TOKENS } from '../types';
import { useDictionaryStore } from '../useDictionaryStore';

export const GermanDictionary: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getFilteredEntries,
    getWortDesTages,
    selectedEntry,
    setSelectedEntry,
    bookmarkedIds,
    setSearchQuery,
  } = useDictionaryStore();

  const [activeTab, setActiveTab] = useState<'all' | 'bookmarks'>('all');

  // Honor ?q= and ?focus= URL parameters on mount.
  useEffect(() => {
    const q = searchParams.get('q');
    const focus = searchParams.get('focus');
    if (q) {
      setSearchQuery(q);
    }
    if (focus) {
      // Open the detail modal for the focused entry.
      const all = getFilteredEntries();
      const target = all.find((e) => e.id === focus);
      if (target) {
        setSelectedEntry(target);
      }
      // Strip the focus param so reload doesn't keep reopening the modal
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
    // We deliberately don't depend on getFilteredEntries — this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEntries = getFilteredEntries();
  const wortDesTages = getWortDesTages();

  const displayedEntries =
    activeTab === 'bookmarks'
      ? filteredEntries.filter((e) => bookmarkedIds.includes(e.id))
      : filteredEntries;


  return (
    <PageShell centered={false} flush>
      <SEO
        title="القاموس الألماني-العربي الشامل — النادي الألماني"
        description="معجم ضخم ودقيق للغة الألمانية يحتوي على الكلمات، العبارات، النطق، تصاريف الأفعال، وأدوات الأسماء بالألوان."
        path="/german-club/dictionary"
      />

      <div
        className="min-h-screen pb-16 transition-colors"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* Sticky App Bar Header */}
        <div className="app-sticky-header z-30 px-4 py-3 flex items-center justify-between border-b border-stone-300/60 bg-[#EFEEE7]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none">
                القاموس الألماني-العربي
              </h1>
              <span className="text-[0.625rem] font-mono font-bold text-[#17324D] tracking-widest uppercase">
                DEUTSCH-ARABISCHES WÖRTERBUCH
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/german-club')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-300/80 text-stone-700 hover:bg-stone-200/60 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#17324D]" />
              المواقف اليومية
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-stone-300/80 px-4 py-8 bg-gradient-to-b from-stone-200/80 via-stone-100 to-transparent">
          <div className="max-w-4xl mx-auto space-y-3 text-center sm:text-start">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17324D]/10 text-[#17324D] border border-[#17324D]/20 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>معجم المرجعية اللغوية الشاملة (A1 - C2)</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200 text-stone-700 border border-stone-300 text-xs font-bold">
                <Layers className="w-3.5 h-3.5 text-[#17324D]" />
                <span>تصنيف أكاديمي ومعجمي مستقل عن المواقف اليومية</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-[#17181C] tracking-tight leading-tight">
              قاموس ومعجم <span className="text-[#17324D]">الألمانية المعاصرة</span>
            </h2>

            <p className="text-xs sm:text-base text-stone-600 max-w-2xl leading-relaxed">
              معجم لغوي منظم أ أبجدياً وبحسب المجالات المعجمية المستقلة (وليس حسب السيناريوهات).
              يتيح الفرز بالترتيب الأبجدي، والمستوى التعليمي (A1-C2)، وطول الكلمة، والتجميع النحوي
              مع تصفية أفعال الانفصال وحالات حروف الجر.
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Wort des Tages Showcase */}
          <WortDesTagesCard entry={wortDesTages} onSelect={setSelectedEntry} />

          {/* Search & Filter Controls */}
          <DictionarySearchFilters />

          {/* Alphabet Index Bar */}
          <AlphabetNav />

          {/* Tab Selection: All Words vs Bookmarks */}
          <div className="flex items-center justify-between border-b border-stone-300/80 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#17324D] text-white shadow-xs'
                    : 'bg-stone-200/60 text-stone-700 hover:bg-stone-200'
                }`}
              >
                جميع الكلمات ({filteredEntries.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bookmarks')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'bookmarks'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-200/60 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                المحفوظات ({bookmarkedIds.length})
              </button>
            </div>

            <span className="text-[0.625rem] text-stone-500 font-mono">
              عرض {displayedEntries.length} نتيجة
            </span>
          </div>

          {/* Dictionary Grid */}
          {displayedEntries.length > 0 ? (
            <div className="space-y-4">
              {/* Windowed: only on-screen rows are mounted, so the DOM stays
                  flat across the full 5,000+ entry corpus. */}
              <DictionaryVirtualGrid entries={displayedEntries} onSelect={setSelectedEntry} />
              <p className="text-xs text-stone-500 font-mono text-center">
                {displayedEntries.length.toLocaleString('en-US')} مفردة
              </p>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl border border-dashed border-stone-300 bg-stone-100/50 space-y-3">
              <SearchX className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="text-base font-bold text-stone-800">لم يتم العثور على نتائج</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                جرب تغيير البحث أو إلغاء بعض الفلاتر لعرض قائمة أكبر من مفردات المعجم.
              </p>
            </div>
          )}
        </div>

        {/* Dictionary Word Detail Modal */}
        <DictionaryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      </div>
    </PageShell>
  );
};

export default GermanDictionary;
