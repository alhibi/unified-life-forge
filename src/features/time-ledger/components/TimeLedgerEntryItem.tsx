/**
 * TimeLedgerEntryItem — Individual timeline entry row.
 *
 * Renders a single entry with source-specific styling, icon, timestamp,
 * and action buttons. Uses discriminated union type guards for rendering.
 */

import { useMemo } from 'react';
import {
  Calendar,
  Flame,
  Activity,
  CloudSun,
  BookOpen,
  PlusCircle,
  Building,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit2,
  ExternalLink,
  PlayCircle,
  Bookmark,
  HelpCircle,
} from '@/lib/icons';

import { AppCard } from '@/components/ui/app-shell';
import type { TimeLedgerEntry, TimeLedgerLayerConfig } from '../types';
import {
  isCalendarEntry,
  isHabitEntry,
  isFitnessEntry,
  isWeatherEntry,
  isKnowledgeEntry,
  isQuickCaptureEntry,
  isPrayerEntry,
  isJournalEntry,
} from '../types';

interface TimeLedgerEntryItemProps {
  entry: TimeLedgerEntry;
  layerConfig: TimeLedgerLayerConfig;
}

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  habits: Flame,
  fitness: Activity,
  weather: CloudSun,
  knowledge: BookOpen,
  'quick-capture': PlusCircle,
  prayer: Building,
  journal: FileText,
};

export default function TimeLedgerEntryItem({
  entry,
  layerConfig,
}: TimeLedgerEntryItemProps) {
  const SourceIcon = useMemo(() => SOURCE_ICONS[entry.source] ?? HelpCircle, [entry.source]);

  const timeString = useMemo(() => {
    const date = new Date(entry.timestamp);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [entry.timestamp]);

  const endTimeString = useMemo(() => {
    if (!entry.endTimestamp) return null;
    const date = new Date(entry.endTimestamp);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [entry.endTimestamp]);

  // Source-specific content rendering
  const renderSourceContent = () => {
    if (isCalendarEntry(entry)) {
      return (
        <>
          {entry.meta.location && (
            <span className="flex items-center gap-1 text-micro text-muted-foreground">
              <span className="h-3 w-3" aria-hidden>📍</span>
              {entry.meta.location}
            </span>
          )}
          {entry.meta.isAllDay && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-primary/10 text-primary border border-primary/20">
              طوال اليوم
            </span>
          )}
          {entry.meta.status === 'tentative' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-warning/10 text-warning border border-warning/20">
              مبدئي
            </span>
          )}
        </>
      );
    }

    if (isHabitEntry(entry)) {
      const statusColors = {
        completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        partial: 'bg-warning/10 text-warning border-warning/20',
        missed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      };
      const statusLabels = {
        completed: 'مكتمل',
        partial: 'جزئي',
        missed: 'فائت',
      };

      return (
        <>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium border ${statusColors[entry.meta.completionStatus]}`}
          >
            {statusLabels[entry.meta.completionStatus]}
          </span>
          {entry.meta.targetCount && entry.meta.targetCount > 1 && (
            <span className="text-micro text-muted-foreground font-plex-mono tabular-nums">
              {entry.meta.completedCount ?? 0}/{entry.meta.targetCount} {entry.meta.unit ?? ''}
            </span>
          )}
          {entry.meta.currentStreak !== undefined && entry.meta.currentStreak > 0 && (
            <span className="flex items-center gap-1 text-micro text-primary font-medium">
              <Flame className="h-3 w-3" aria-hidden />
              {entry.meta.currentStreak} يوم
            </span>
          )}
        </>
      );
    }

    if (isFitnessEntry(entry)) {
      return (
        <>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-primary/10 text-primary border border-primary/20">
            {entry.meta.workoutType}
          </span>
          <span className="text-micro text-muted-foreground font-plex-mono tabular-nums flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {Math.round((entry.meta.durationSeconds ?? 0) / 60)} د
          </span>
          {entry.meta.distanceKm && (
            <span className="text-micro text-muted-foreground font-plex-mono tabular-nums flex items-center gap-1">
              <Activity className="h-3 w-3" aria-hidden />
              {entry.meta.distanceKm.toFixed(1)} كم
            </span>
          )}
          {entry.meta.caloriesKcal && (
            <span className="text-micro text-muted-foreground font-plex-mono tabular-nums flex items-center gap-1">
              🔥 {entry.meta.caloriesKcal} ك.س
            </span>
          )}
          {entry.meta.feeling && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro bg-muted/50 text-muted-foreground border border-border/30">
              {entry.meta.feeling}
            </span>
          )}
        </>
      );
    }

    if (isWeatherEntry(entry)) {
      return (
        <>
          <span className="text-meta font-bold font-plex-mono tabular-nums text-foreground">
            {entry.meta.temperatureC.toFixed(1)}°م
          </span>
          <span className="text-micro text-muted-foreground">{entry.meta.conditionLabel}</span>
          <span className="text-micro text-muted-foreground font-plex-mono tabular-nums flex items-center gap-1">
            <span className="h-3 w-3" aria-hidden>💧</span>
            {entry.meta.humidityPercent}%
          </span>
          <span className="text-micro text-muted-foreground font-plex-mono tabular-nums flex items-center gap-1">
            <span className="h-3 w-3" aria-hidden>💨</span>
            {entry.meta.windKph} كم/س
          </span>
          {entry.meta.uvIndex > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro bg-warning/10 text-warning border border-warning/20">
              UV {entry.meta.uvIndex.toFixed(1)}
            </span>
          )}
        </>
      );
    }

    if (isKnowledgeEntry(entry)) {
      const typeLabels: Record<string, string> = {
        article: 'مقالة',
        podcast: 'بودكاست',
        monograph: 'أرشيف',
        note: 'ملاحظة',
        poem: 'قصيدة',
      };

      return (
        <>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-purple/10 text-purple border border-purple/20">
            {typeLabels[entry.meta.contentType] ?? entry.meta.contentType}
          </span>
          {entry.meta.sourceName && (
            <span className="text-micro text-muted-foreground truncate max-w-[150px]">{entry.meta.sourceName}</span>
          )}
          {entry.meta.durationMinutes && (
            <span className="text-micro text-muted-foreground font-plex-mono tabular-nums flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {entry.meta.durationMinutes} د
            </span>
          )}
          {entry.meta.progressPercent !== undefined && entry.meta.progressPercent < 100 && (
            <span className="text-micro text-muted-foreground font-plex-mono tabular-nums">
              {entry.meta.progressPercent}%
            </span>
          )}
          {entry.meta.isFavorite && (
            <Bookmark className="h-3 w-3 text-warning" aria-label="مفضل" />
          )}
        </>
      );
    }

    if (isQuickCaptureEntry(entry)) {
      const typeLabels: Record<string, string> = {
        note: 'ملاحظة',
        task: 'مهمة',
        idea: 'فكرة',
        reminder: 'تذكير',
        observation: 'ملاحظة',
      };

      return (
        <>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-orange/10 text-orange border border-orange/20">
            {typeLabels[entry.meta.captureType] ?? entry.meta.captureType}
          </span>
          {entry.meta.isTask && (
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded border transition-colors"
              style={{
                borderColor: entry.meta.taskCompleted ? 'var(--emerald-500)' : 'var(--border)',
                backgroundColor: entry.meta.taskCompleted ? 'var(--emerald-500/10)' : 'transparent',
              }}
              aria-label={entry.meta.taskCompleted ? 'إلغاء الإنجاز' : 'وضع كمكتمل'}
            >
              {entry.meta.taskCompleted ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
          {entry.meta.taskDueAt && (
            <span className="text-micro text-warning font-plex-mono tabular-nums flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {new Date(entry.meta.taskDueAt).toLocaleDateString('ar-SA')}
            </span>
          )}
          {entry.pendingSync && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro bg-warning/10 text-warning border border-warning/20">
              ⏳ مزامنة
            </span>
          )}
        </>
      );
    }

    if (isPrayerEntry(entry)) {
      return (
        <>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-green/10 text-green border border-green/20">
            {entry.meta.prayerLabelAr}
          </span>
          {entry.meta.isCompleted ? (
            <span className="flex items-center gap-1 text-micro text-emerald-500 font-medium">
              <CheckCircle className="h-3 w-3" aria-hidden />
              مكتملة
              {entry.meta.completionTime && (
                <span className="font-plex-mono tabular-nums">
                  {new Date(entry.meta.completionTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-micro text-rose-500 font-medium">
              <AlertCircle className="h-3 w-3" aria-hidden />
              فائتة
            </span>
          )}
        </>
      );
    }

    if (isJournalEntry(entry)) {
      return (
        <>
          {entry.meta.mood && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-rose/10 text-rose border border-rose/20">
              {entry.meta.mood}
            </span>
          )}
          {entry.meta.energyLevel && (
            <span className="text-micro text-muted-foreground font-plex-mono tabular-nums flex items-center gap-1">
              <span className="h-3 w-3" aria-hidden>⚡</span>
              {entry.meta.energyLevel}/5
            </span>
          )}
          <span className="text-micro text-muted-foreground font-plex-mono tabular-nums">
            {entry.meta.wordCount} كلمة
          </span>
          {entry.meta.hasVoiceNote && (
            <PlayCircle className="h-3 w-3 text-primary" aria-label="يحتوي على ملاحظة صوتية" />
          )}
        </>
      );
    }

    return null;
  };

  return (
    <AppCard
      pressable
      className="group flex items-start gap-3 p-3 relative overflow-hidden"
      style={{
        borderLeftColor: layerConfig.color,
        borderLeftWidth: '3px',
      }}
    >
      {/* Leading timestamp */}
      <div className="flex flex-col items-end shrink-0 min-w-[70px] text-start">
        <time className="text-micro font-bold font-plex-mono tabular-nums text-foreground" dateTime={entry.timestamp}>
          {timeString}
        </time>
        {endTimeString && (
          <span className="text-micro text-muted-foreground/60 font-plex-mono tabular-nums">
            → {endTimeString}
          </span>
        )}
        {/* Source indicator dot */}
        <div
          className="mt-2 w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: layerConfig.color }}
          title={layerConfig.labelAr}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-meta font-semibold text-foreground truncate">{entry.title}</p>
            {entry.description && (
              <p className="text-micro text-muted-foreground line-clamp-2 mt-0.5">{entry.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {renderSourceContent()}
              {entry.tags.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {entry.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-micro text-muted-foreground bg-muted/50 border border-border/30"
                    >
                      #{tag}
                    </span>
                  ))}
                  {entry.tags.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded text-micro text-muted-foreground/60">
                      +{entry.tags.length - 4}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {('url' in entry.meta && entry.meta.url) && (
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="فتح الرابط"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            {entry.source === 'quick-capture' && (
              <>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="تعديل"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </AppCard>
  );
}