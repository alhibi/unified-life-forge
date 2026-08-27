/**
 * TimeLedgerView — Main timeline view component.
 *
 * Renders a virtualized vertical timeline grouped by day, with each day
 * expandable/collapsible. Uses content-visibility for performance on long timelines.
 */

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Filter, Search, Settings } from '@/lib/icons';

import { AppCard, Section, IconButton } from '@/components/ui/app-shell';
import { useTimeLedger, useTimeLedgerLayers } from '../hooks/useTimeLedger';
import type { TimeLedgerEntry, TimeLedgerDayGroup, TimeLedgerSource } from '../types';

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
    setFilters,
    clearFilters,
    refetch,
  } = useTimeLedger();

  const { layers, getLayerConfig } = useTimeLedgerLayers();
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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="جاري تحميل السجل الزمني">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-3">
            <div className="h-8 w-32 bg-muted/40 rounded" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-16 w-full bg-muted/20 rounded-xl border border-border/10" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
        <p className="text-meta font-semibold text-destructive mb-2">تعذر تحميل السجل الزمني</p>
        <p className="text-mini text-muted-foreground mb-4">{error.message}</p>
        <button
          type="button"
          onClick={refetch}
          className="px-4 py-2 text-mini font-bold rounded-md bg-primary text-primary-foreground"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // Empty state
  if (filteredDayGroups.length === 0) {
    return (
      <div className="empty-state-surface flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-border/40 text-center" role="status">
        <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <p className="text-meta font-bold text-foreground mb-1">
          {searchText ? 'لا توجد نتائج للبحث' : 'السجل الزمني فارغ'}
        </p>
        <p className="text-mini text-muted-foreground max-w-[280px] leading-relaxed mb-6">
          {searchText
            ? 'جرب كلمات بحث مختلفة أو امسح الفلتر لعرض كل السجلات.'
            : 'ابدأ يومك وستظهر أنشطتك هنا تلقائياً — من التقويم، العادات، اللياقة، الطقس، والمزيد.'}
        </p>
        {searchText && (
          <button
            type="button"
            onClick={() => setSearchText('')}
            className="px-4 py-2 text-mini font-bold rounded-md bg-primary text-primary-foreground"
          >
            مسح البحث
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-title font-bold text-foreground tracking-tight">سِجل الزمن</h1>
          <span className="text-micro uppercase tracking-[0.15em] text-primary/90 font-bold tabular-nums" dir="ltr">
            {dayGroups.reduce((sum, g) => sum + g.summary.total, 0)} إدخال
          </span>
        </div>

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