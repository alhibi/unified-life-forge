import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookmarkCheck, BookOpen, Layers, Sparkles } from '@/lib/icons';

import { AlphabetNav } from '../components/dictionary/AlphabetNav';
import { DictionaryDetailModal } from '../components/dictionary/DictionaryDetailModal';
import { DictionarySearchFilters } from '../components/dictionary/DictionarySearchFilters';
import { DictionaryVirtualGrid } from '../components/dictionary/DictionaryVirtualGrid';
import { WortDesTagesCard } from '../components/dictionary/WortDesTagesCard';
import type { DictionaryEntry } from '../types';
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
  const bookmarkedEntries = filteredEntries.filter((e) => bookmarkedIds.includes(e.id));

  const renderList = (list: DictionaryEntry[]) =>
    list.length > 0 ? (
      <div className="space-y-4">
        <p className="font-mono text-mini text-muted-foreground">
          عرض <span className="tabular-nums">{list.length}</span> نتيجة
        </p>
        {/* Windowed: only on-screen rows are mounted, so the DOM stays
            flat across the full 5,000+ entry corpus. */}
        <DictionaryVirtualGrid entries={list} onSelect={setSelectedEntry} />
        <p className="text-center font-mono text-mini text-muted-foreground">
          {list.length.toLocaleString('en-US')} مفردة
        </p>
      </div>
    ) : (
      <StateView
        kind="search"
        title="لم يتم العثور على نتائج"
        body="جرب تغيير البحث أو إلغاء بعض الفلاتر لعرض قائمة أكبر من مفردات المعجم."
      />
    );

  return (
    <PageShell centered={false} flush className="px-4 pt-4 sm:pt-6">
      <SEO
        title="القاموس الألماني-العربي الشامل — النادي الألماني"
        description="معجم ضخم ودقيق للغة الألمانية يحتوي على الكلمات، العبارات، النطق، تصاريف الأفعال، وأدوات الأسماء بالألوان."
        path="/german-club/dictionary"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-page">
        {/* Masthead — the hub register, like the club home. */}
        <PageHeader
          variant="display"
          eyebrow="DEUTSCH-ARABISCHES WÖRTERBUCH"
          title="القاموس الألماني-العربي"
          subtitle={
            <>
              قاموس ومعجم <span className="font-semibold text-primary">الألمانية المعاصرة</span>
            </>
          }
          right={
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => navigate('/german-club')}
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden />
              المواقف اليومية
            </Button>
          }
        >
          <div className="flex w-full flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-mini font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden />
              <span>معجم المرجعية اللغوية الشاملة (A1 - C2)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-track bg-secondary px-3 py-1 text-mini font-bold text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>تصنيف أكاديمي ومعجمي مستقل عن المواقف اليومية</span>
            </span>
          </div>
        </PageHeader>

        {/* Hero paragraph */}
        <p className="text-mini leading-relaxed text-muted-foreground">
          معجم لغوي منظم أ أبجدياً وبحسب المجالات المعجمية المستقلة (وليس حسب السيناريوهات). يتيح
          الفرز بالترتيب الأبجدي، والمستوى التعليمي (A1-C2)، وطول الكلمة، والتجميع النحوي مع تصفية
          أفعال الانفصال وحالات حروف الجر.
        </p>

        {/* Wort des Tages Showcase */}
        <WortDesTagesCard entry={wortDesTages} onSelect={setSelectedEntry} />

        {/* Search & Filter Controls */}
        <DictionarySearchFilters />

        {/* Alphabet Index Bar */}
        <AlphabetNav />

        {/* Tab Selection: All Words vs Bookmarks */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'bookmarks')}>
          <TabsList aria-label="نطاق العرض">
            <TabsTrigger value="all">
              جميع الكلمات (<span className="tabular-nums">{filteredEntries.length}</span>)
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-1.5">
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
              المحفوظات (<span className="tabular-nums">{bookmarkedIds.length}</span>)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-2">
            {renderList(filteredEntries)}
          </TabsContent>
          <TabsContent value="bookmarks" className="mt-2">
            {renderList(bookmarkedEntries)}
          </TabsContent>
        </Tabs>

        {/* Dictionary Word Detail Modal */}
        <DictionaryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      </div>
    </PageShell>
  );
};

export default GermanDictionary;
