/**
 * TimeLedgerView — Main timeline view component.
 *
 * Renders a virtualized vertical timeline grouped by day, with each day
 * expandable/collapsible. Uses content-visibility for performance on long timelines.
 */

import { AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import { IconButton } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';
import { Filter, Search, Settings } from '@/lib/icons';

import { useTimeLedger, useTimeLedgerLayers } from '../hooks/useTimeLedger';
import DayCard from './DayCard';
import LayerToggleBar from './LayerToggleBar';
import QuickCaptureFab from './QuickCaptureFab';

export default function TimeLedgerView() {
  const {
    dayGroups,
    status,
    isLoading,
    isFetching,
    error,
    enabledLayers,
    toggleLayer,
    setEnabledLayers,
    filters,
    clearFilters,
    refetch,
  } = useTimeLedger();

  const { layers, getLayerConfig } = useTimeLedgerLayers();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Filter day groups by search text
  const filteredDayGroups = useMemo(() => {
    if (!searchText.trim()) return dayGroups;

    const query = searchText.toLowerCase().trim();
    return dayGroups.filter(group =>
      group.entries.some(entry =>
        entry.title.toLowerCase().includes(query) ||
        entry.description?.toLowerCase().includes(query) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query))
      )
    );
  }, [dayGroups, searchText]);

  // Toggle day expansion
  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // Header actions
  const handleSelectAllLayers = () => setEnabledLayers(layers.map(l => l.source));
  const handleClearAllLayers = () => setEnabledLayers([]);

  // Page identity is owned by one PageHeader for every state — loading,
  // error and empty must still read as "سِجل الزمن", not as a bare slab.
  const header = (
    <PageHeader
      title="سِجل الزمن"
      subtitle="كل ما فعلته، مرتّباً على محور يومك"
      hideBack
    />
  );

  // Loading skeleton — reserves the shape of the loaded timeline.
  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div role="status" aria-label="جاري تحميل السجل الزمني" className="space-y-3 pt-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-6 w-28 rounded bg-muted/40" />
              <div className="h-16 w-full rounded-xl border border-border/10 bg-muted/20" />
              <div className="h-16 w-full rounded-xl border border-border/10 bg-muted/15" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="space-y-4">
        {header}
        <StateView
          kind="error"
          compact
          title="تعذّر تحميل السجل الزمني"
          body={error.message || 'لم تستجب خدمة السجل. أعد المحاولة بعد قليل.'}
          action={{ label: 'إعادة المحاولة', onClick: refetch }}
          secondary="لا شيء يضيع: السجل يُبنى من أنشطة مجالاتك المحفوظة."
        />
      </div>
    );
  }

  // Empty / no-search-results state
  if (filteredDayGroups.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        {searchText ? (
          <StateView
            kind="search"
            compact
            title="لا نتائج لهذا البحث"
            body="لا يطابق هذا النص أي إدخال في السجل. جرّب كلمة أقصر أو امسح البحث لعرض كل الأيام."
            action={{ label: 'مسح البحث', onClick: () => setSearchText('') }}
          />
        ) : (
          <StateView
            kind="empty"
            compact
            title="السجل الزمني فارغ"
            body="سيُبنى هذا السجل تلقائياً من نشاطك: التقويم، العادات، اللياقة، الطقس، والقراءة. ابدأ من البوابة وسيظهر هنا."
            action={{ label: 'ابدأ من البوابة', onClick: () => navigate('/') }}
            secondary="الإدخالات قابلة للبحث وتجميعها بالفلاتر أعلاه."
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {/* Toolbar — count + search + layer filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-mini font-semibold text-muted-foreground tabular-nums">
          {dayGroups.reduce((sum, g) => sum + g.summary.total, 0)} إدخال في السجل
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute inset-y-0 rtl:inset-inline-end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="ابحث في السجل…"
              className="app-control"
              aria-label="البحث في السجل الزمني"
            />
          </div>

          {/* Layer Toggle */}
          <LayerToggleBar
            layers={layers}
            enabledLayers={enabledLayers}
            onToggleLayer={toggleLayer}
            onSelectAll={handleSelectAllLayers}
            onClearAll={handleClearAllLayers}
          />

          {/* Refresh */}
          <IconButton
            onClick={refetch}
            disabled={isFetching}
            className="h-10 w-10"
            title="تحديث"
            aria-label="تحديث السجل الزمني"
          >
            <Settings className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          </IconButton>

          {/* Clear Filters */}
          {(filters.sources && filters.sources.length < layers.length) || searchText ? (
            <IconButton
              onClick={clearFilters}
              className="h-10 gap-2 px-3"
              title="مسح الفلاتر"
            >
              <Filter className="h-4 w-4" />
              <span className="text-mini">مسح</span>
            </IconButton>
          ) : null}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4" role="list" aria-label="الأيام">
        <AnimatePresence initial={false}>
          {filteredDayGroups.map((dayGroup, index) => (
            <DayCard
              key={dayGroup.date}
              dayGroup={dayGroup}
              isExpanded={expandedDays.has(dayGroup.date)}
              onToggle={() => toggleDay(dayGroup.date)}
              getLayerConfig={getLayerConfig}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Capture FAB */}
      <QuickCaptureFab />
    </div>
  );
}