import { useEffect,useState } from 'react';

import { ChevronDown } from '@/lib/icons';

import { snapshotAllSources, type SourceHealth } from '../engine/SourceHealthMonitor';
import { WeatherPanel } from './WeatherPanels';

export function SourceHealthPanel() {
  const [rows, setRows] = useState<SourceHealth[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const tick = () => setRows(snapshotAllSources());
    tick();
    const id = window.setInterval(tick, 5_000);
    window.addEventListener('weather:refreshed', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('weather:refreshed', tick);
    };
  }, []);

  return (
    <WeatherPanel
      title="إدارة مصادر الرصد والأوزان (12 مصدر)"
      subtitle={`${rows.filter((r) => r.state === 'closed').length}/${rows.length}`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-mini text-muted-foreground bg-secondary/20 p-2.5 rounded-lg border border-border/30">
          <span className="leading-relaxed">
            {'تعتمد هذه اللوحة على نموذج إجماع متكامل (Consensus Ensemble) يدمج 12 مصدراً عالمياً ومحلياً لتقليل نسب الخطأ والانحراف المناخي.'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card text-primary shrink-0 transition-transform active:scale-95"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-2 overflow-hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-micro border-b border-border/20 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.state === 'closed' ? 'bg-primary' : r.state === 'half_open' ? 'bg-warning' : 'bg-destructive'}`}
                  />
                  <span className="truncate text-foreground font-medium">{r.label}</span>
                </div>
                <span className="text-muted-foreground tabular-nums">
                  وزن {r.effectiveWeight.toFixed(2)}
                </span>
                <span className="text-muted-foreground tabular-nums">{r.avgResponseMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </WeatherPanel>
  );
}