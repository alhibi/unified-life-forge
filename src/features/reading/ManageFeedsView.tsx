import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Check, ChevronLeft, Database, Download, Plus,
  Rss, Settings2, Star, Trash2, Upload, X,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { FeedSource, FeedStatus } from './types';
import { CATEGORIES } from './feeds';
import { SourcePill } from './SourcePill';
import { downloadOpml } from './opml';
import { AddFeedDialog } from './AddFeedDialog';
import { OpmlImportDialog } from './OpmlImportDialog';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Lets the user add, remove, enable/disable feeds and shows per-feed
 * health (failures, 304-cached, last item count). The visual treatment
 * borrows from the home prayer slab: rounded rows, subtle dividers.
 */
export function ManageFeedsView({
  feedSources,
  statuses,
  totalInDB,
  isAr,
  sourceCounts,
  onBack,
  onSuggested,
  onAdd,
  onAddBulk,
  onRemove,
  onToggleEnabled,
}: {
  feedSources: FeedSource[];
  statuses: FeedStatus[];
  totalInDB: number;
  isAr: boolean;
  sourceCounts: Record<string, number>;
  onBack: () => void;
  onSuggested: () => void;
  onAdd: (url: string, name: string, category: string) => boolean;
  onAddBulk?: (
    feeds: ReadonlyArray<{ url: string; name: string; category: string; enabled?: boolean }>,
  ) => Promise<{ added: number; skipped: number }>;
  onRemove: (url: string) => void;
  onToggleEnabled: (url: string) => void;
}) {
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('news');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showOpmlDialog, setShowOpmlDialog] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<FeedSource | null>(null);

  const statusByUrl = new Map(statuses.map((s) => [s.url, s] as const));
  const existingUrls = new Set(feedSources.map((f) => f.url));

  const handleAdd = () => {
    const ok = onAdd(newUrl, newName, newCategory);
    if (ok) {
      setNewUrl('');
      setNewName('');
    }
  };

  const handleOpmlExport = () => {
    if (feedSources.length === 0) {
      toast.info(isAr ? 'لا توجد خلاصات للتصدير' : 'Nothing to export');
      return;
    }
    downloadOpml(feedSources, isAr ? 'ar' : 'en');
    toast.success(isAr ? 'تم تصدير OPML' : 'OPML exported');
  };

  return (
    <motion.div
      key="manage"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
        </button>
        <Settings2 className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold text-foreground flex-1">
          {isAr ? 'إدارة المصادر' : 'Manage Feeds'}
        </h3>
        <button
          type="button"
          onClick={() => setShowOpmlDialog(true)}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'استيراد OPML' : 'Import OPML'}
          title={isAr ? 'استيراد OPML' : 'Import OPML'}
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={handleOpmlExport}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'تصدير OPML' : 'Export OPML'}
          title={isAr ? 'تصدير OPML' : 'Export OPML'}
        >
          <Download className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onSuggested}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'مقترحات' : 'Suggestions'}
        >
          <Star className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Smart "Add Feed" button (opens discover dialog) */}
      <div className="px-4 pt-4 pb-2">
        <Button
          onClick={() => setShowAddDialog(true)}
          variant="outline"
          className="w-full h-12 rounded-2xl border-dashed border-2 hover:bg-accent/30 hover:border-primary/40 transition-all group"
        >
          <Plus className="h-4 w-4 me-2 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-sm">
            {isAr ? 'إضافة مصدر بالاكتشاف الذكي' : 'Add a feed (auto-discover)'}
          </span>
        </Button>
      </div>

      {/* New-feed form */}
      <div className="p-4 border-b border-border/30 space-y-2.5">
        <div className="flex gap-2">
          <Input
            placeholder={isAr ? 'رابط RSS أو الموقع...' : 'RSS URL...'}
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 text-sm h-10 rounded-xl"
            dir="ltr"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newUrl.trim()) handleAdd();
            }}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newUrl.trim()}
            className="shrink-0 h-10 w-10 p-0 rounded-xl"
            aria-label={isAr ? 'إضافة' : 'Add'}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {newUrl.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-2"
          >
            <Input
              placeholder={isAr ? 'اسم المصدر (اختياري)' : 'Feed name (optional)'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 text-sm h-10 rounded-xl"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {isAr ? c.ar : c.en}
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </div>

      {/* Feed list */}
      <div className="flex-1 p-4 overflow-y-auto">
        {feedSources.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Rss className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'لا توجد مصادر' : 'No feeds yet'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onSuggested}
                className="rounded-xl"
              >
                <Star className="h-3.5 w-3.5 me-1.5" />
                {isAr ? 'تصفح المقترحات' : 'Browse suggestions'}
              </Button>
            </div>
          )
          : (
            <div className="space-y-2">
              {feedSources.map((feed, i) => {
                const status = statusByUrl.get(feed.url);
                const failed = status?.status === 'error';
                const cached = status?.status === 'not_modified';
                return (
                  <motion.div
                    key={feed.url}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl transition-colors ${
                      feed.enabled ? 'bg-accent/20' : 'bg-accent/5 opacity-60'
                    }`}
                  >
                    <SourcePill name={feed.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {feed.name}
                        </p>
                        {failed && (
                          <span title={status?.error || ''}>
                            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          </span>
                        )}
                        {cached && !failed && (
                          <span
                            className="text-[9px] px-1.5 rounded bg-foreground/10 text-muted-foreground"
                            title={isAr ? 'مخبأ' : 'Cached (304)'}
                          >
                            304
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate" dir="ltr">
                        {feed.url}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold shrink-0 tabular-nums">
                      {sourceCounts[feed.name] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleEnabled(feed.url)}
                      className={`p-2 rounded-lg transition-colors ${
                        feed.enabled
                          ? 'text-primary hover:bg-primary/10'
                          : 'text-muted-foreground hover:bg-accent'
                      }`}
                      aria-label={feed.enabled
                        ? (isAr ? 'إيقاف' : 'Disable')
                        : (isAr ? 'تفعيل' : 'Enable')}
                      role="switch"
                      aria-checked={feed.enabled}
                    >
                      {feed.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingRemove(feed)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      aria-label={isAr ? 'حذف' : 'Remove'}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
      </div>

      <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Database className="h-3 w-3" />
          {isAr ? `${totalInDB} مقال في الأرشيف` : `${totalInDB} in archive`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs rounded-xl"
          onClick={onSuggested}
        >
          <Star className="h-3 w-3 me-1" />
          {isAr ? 'مقترحات' : 'Suggestions'}
        </Button>
      </div>

      <AddFeedDialog
        open={showAddDialog}
        isAr={isAr}
        existingUrls={existingUrls}
        onClose={() => setShowAddDialog(false)}
        onAdd={onAdd}
      />

      <OpmlImportDialog
        open={showOpmlDialog}
        isAr={isAr}
        existingUrls={existingUrls}
        onClose={() => setShowOpmlDialog(false)}
        onImport={async (feeds) => {
          if (onAddBulk) {
            return onAddBulk(feeds);
          }
          // Fallback for parents that didn't supply bulk-add: add
          // one-by-one. Preserves the user-visible counts.
          let added = 0;
          let skipped = 0;
          for (const f of feeds) {
            if (existingUrls.has(f.url)) {
              skipped++;
              continue;
            }
            const ok = onAdd(f.url, f.name, f.category);
            if (ok) added++;
            else skipped++;
          }
          return { added, skipped };
        }}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        isAr={isAr}
        title={{ ar: 'حذف هذا المصدر؟', en: 'Remove this feed?' }}
        description={pendingRemove
          ? {
              ar: `سيتم إزالة "${pendingRemove.name}" من قائمتك. المقالات الموجودة في الأرشيف لن تتأثر.`,
              en: `“${pendingRemove.name}” will be removed from your list. Already-archived articles are not affected.`,
            }
          : undefined}
        confirmLabel={{ ar: 'حذف', en: 'Remove' }}
        onConfirm={() => {
          if (pendingRemove) onRemove(pendingRemove.url);
          setPendingRemove(null);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
      />
    </motion.div>
  );
}
