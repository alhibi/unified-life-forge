import { useEffect,useState } from 'react';

import { AppList, AppRow } from '@/components/ui/app-shell';
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
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-secondary text-primary shrink-0"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isExpanded && (
          <AppList compact>
            {rows.map((r) => (
              <AppRow
                key={r.id}
                as="div"
                leading={
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${r.state === 'closed' ? 'bg-primary' : r.state === 'half_open' ? 'bg-warning' : 'bg-destructive'}`}
                  />
                }
                title={r.label}
                value={`وزن ${r.effectiveWeight.toFixed(2)}`}
              >
                <span className="text-micro text-muted-foreground tabular-nums">{r.avgResponseMs}ms</span>
              </AppRow>
            ))}
          </AppList>
        )}
      </div>
    </WeatherPanel>
  );
}