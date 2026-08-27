/**
 * LayerToggleBar — Segmented control for toggling timeline layers.
 *
 * Shows each available layer with its icon, label, and entry count.
 * Supports select all / clear all actions.
 */

import { useMemo } from 'react';
import { Check, X, Filter } from '@/lib/icons';

import { AppCard } from '@/components/ui/app-shell';
import type { TimeLedgerLayerConfig, TimeLedgerSource } from '../types';

interface LayerToggleBarProps {
  layers: readonly TimeLedgerLayerConfig[];
  enabledLayers: TimeLedgerSource[];
  onToggleLayer: (layer: TimeLedgerSource) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export default function LayerToggleBar({
  layers,
  enabledLayers,
  onToggleLayer,
  onSelectAll,
  onClearAll,
}: LayerToggleBarProps) {
  // Get entry counts per layer (passed via data attribute or computed)
  const layerCounts = useMemo(() => {
    // This would ideally come from the parent, but for now we use a placeholder
    // The parent can pass counts via a context or we compute from visible entries
    return new Map<TimeLedgerSource, number>();
  }, []);

  const allEnabled = enabledLayers.length === layers.length;
  const noneEnabled = enabledLayers.length === 0;

  return (
    <div className="relative">
      <AppCard
        pressable
        onClick={() => {}}
        className="flex items-center gap-1.5 p-1.5 bg-background/80 backdrop-blur-md border border-border/30 rounded-2xl shadow-[0_1px_3px_hsl(var(--foreground)/0.04),0_8px_24px_hsl(var(--foreground)/0.03)]"
      >
        {/* Select All / Clear All */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allEnabled}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            aria-label="تحديد الكل"
            title="تحديد الكل"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={noneEnabled}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            aria-label="إلغاء التحديد"
            title="إلغاء التحديد"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Layer toggles */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1" role="group" aria-label="طبقات السجل الزمني">
          {layers.map((layer) => {
            const isEnabled = enabledLayers.includes(layer.source);
            const count = layerCounts.get(layer.source) ?? 0;

            return (
              <button
                key={layer.source}
                type="button"
                onClick={() => onToggleLayer(layer.source)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-micro transition-all duration-200 active:scale-95 whitespace-nowrap ${
                  isEnabled
                    ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.25),0_1px_2px_hsl(var(--primary)/0.15)]'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
                style={{
                  backgroundColor: isEnabled ? undefined : `${layer.color}10`,
                  borderColor: isEnabled ? 'transparent' : `${layer.color}30`,
                  color: isEnabled ? 'var(--primary-foreground)' : layer.color,
                }}
                aria-pressed={isEnabled}
                title={`${layer.labelAr}: ${count} إدخال`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                <span>{layer.labelAr}</span>
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-micro font-bold tabular-nums"
                    style={{
                      backgroundColor: isEnabled ? 'rgba(255,255,255,0.2)' : `${layer.color}20`,
                      color: isEnabled ? 'inherit' : layer.color,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </AppCard>
    </div>
  );
}