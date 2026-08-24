/**
 * BadgeTelemetryPanel — Real-time performance monitoring for badge system
 * ---------------------------------------------------------------------------
 * Shows cache hit rates, evaluation times, and system health metrics.
 */
import { motion } from 'framer-motion';
import React, { useEffect,useState } from 'react';

import { 
  Activity, 
  AlertCircle,
  CheckCircle,
  Database, 
  Gauge, 
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap, 
} from '@/lib/icons';

import { getBadgeTelemetry, resetBadgeTelemetry } from '../lib/badgeStore';

interface BadgeTelemetryPanelProps {
  className?: string;
  refreshInterval?: number;
}

export function BadgeTelemetryPanel({ 
  className = '', 
  refreshInterval = 5000 
}: BadgeTelemetryPanelProps) {
  const [telemetry, setTelemetry] = useState({
    evaluationCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageEvaluationMs: 0,
    lastEvaluationMs: 0,
    eventsEmitted: 0,
    subscribersCount: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateTelemetry = () => {
      setTelemetry(getBadgeTelemetry());
    };
    
    updateTelemetry();
    const interval = setInterval(updateTelemetry, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setTelemetry(getBadgeTelemetry());
      setIsRefreshing(false);
    }, 100);
  };

  const handleReset = () => {
    resetBadgeTelemetry();
    setTelemetry(getBadgeTelemetry());
  };

  const cacheHitRate = telemetry.evaluationCount > 0 
    ? (telemetry.cacheHits / telemetry.evaluationCount) * 100 
    : 0;

  const getHealthStatus = () => {
    if (telemetry.evaluationCount === 0) return 'idle';
    if (cacheHitRate >= 80) return 'healthy';
    if (cacheHitRate >= 50) return 'warning';
    return 'critical';
  };

  const health = getHealthStatus();
  const healthConfig = {
    healthy: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'ممتاز' },
    warning: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'تحتاج تحسين' },
    critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'حرجة' },
    idle: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/10', label: 'خامل' },
  };

  const config = healthConfig[health];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`surface-depth rounded-2xl p-5 ${className}`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-meta font-bold text-foreground">مراقبة الأداء</h3>
            <p className="text-micro text-muted-foreground">
              أداء نظام الأوسمة والذاكرة المؤقتة
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-muted/50 hover:bg-muted/70 text-muted-foreground transition-colors"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-muted/50 hover:bg-muted/70 text-muted-foreground transition-colors"
            title="إعادة تعيين"
          >
            <TrendingDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Health Status */}
      <div className={`${config.bg} ${config.color} rounded-xl p-3 mb-5 flex items-center gap-3`}>
        <config.icon className="w-5 h-5" />
        <div>
          <span className="text-sm font-bold">حالة النظام: {config.label}</span>
          <div className="text-micro opacity-80">
            {health === 'idle' 
              ? 'لم يتم تقييم أي أوسمة بعد'
              : `معدل إصابة الذاكرة: ${cacheHitRate.toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <MetricCard
          icon={Activity}
          iconColor="text-blue-400"
          label="إجمالي التقييمات"
          value={telemetry.evaluationCount.toLocaleString()}
          trend={telemetry.evaluationCount > 100 ? 'up' : 'neutral'}
        />
        <MetricCard
          icon={Database}
          iconColor="text-purple-400"
          label="إصابات الذاكرة"
          value={telemetry.cacheHits.toLocaleString()}
          subValue={`${cacheHitRate.toFixed(1)}% معدل`}
          trend={cacheHitRate >= 70 ? 'up' : cacheHitRate >= 40 ? 'neutral' : 'down'}
        />
        <MetricCard
          icon={Zap}
          iconColor="text-amber-400"
          label="متوسط وقت التقييم"
          value={`${telemetry.averageEvaluationMs.toFixed(2)}ms`}
          subValue={telemetry.lastEvaluationMs > 0 ? `الأخير: ${telemetry.lastEvaluationMs.toFixed(2)}ms` : undefined}
          trend={telemetry.averageEvaluationMs < 5 ? 'up' : telemetry.averageEvaluationMs < 20 ? 'neutral' : 'down'}
        />
        <MetricCard
          icon={Gauge}
          iconColor="text-emerald-400"
          label="المشتركون النشطون"
          value={telemetry.subscribersCount.toString()}
          trend={telemetry.subscribersCount > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="border-t border-border/30 pt-4">
        <h4 className="text-micro font-bold text-muted-foreground mb-3 uppercase tracking-wide">
          تفاصيل الذاكرة المؤقتة
        </h4>
        <div className="space-y-2">
          <CacheMetricRow 
            label="إصابات (Cache Hits)" 
            value={telemetry.cacheHits} 
            total={telemetry.evaluationCount}
            color="text-emerald-400"
          />
          <CacheMetricRow 
            label="إخفاقات (Cache Misses)" 
            value={telemetry.cacheMisses} 
            total={telemetry.evaluationCount}
            color="text-amber-400"
          />
          <CacheMetricRow 
            label="أحداث منبثقة" 
            value={telemetry.eventsEmitted} 
            total={telemetry.evaluationCount}
            color="text-blue-400"
          />
        </div>
      </div>

      {/* Recommendations */}
      {telemetry.evaluationCount > 0 && cacheHitRate < 70 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-micro text-amber-400">
              <span className="font-bold">توصية:</span> معدل إصابة الذاكرة منخفض ({cacheHitRate.toFixed(1)}%). 
              فكر في زيادة TTL للذاكرة المؤقتة أو تقليل تكرار التقييم.
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function MetricCard({ 
  icon: Icon, 
  iconColor, 
  label, 
  value, 
  subValue, 
  trend 
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  const trendIcons = {
    up: <TrendingUp className="w-3 h-3 text-emerald-400" />,
    down: <TrendingDown className="w-3 h-3 text-red-400" />,
    neutral: <Minus className="w-3 h-3 text-muted-foreground" />,
  };

  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {trendIcons[trend]}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-micro text-muted-foreground">{label}</p>
      {subValue && <p className="text-[0.625rem] text-muted-foreground/70 mt-0.5">{subValue}</p>}
    </div>
  );
}

function CacheMetricRow({ 
  label, 
  value, 
  total, 
  color 
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-micro text-muted-foreground w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: `var(--${color.replace('text-', '').replace('-400', '-400')})` }}
        />
      </div>
      <span className="text-micro font-mono tabular-nums text-foreground shrink-0">
        {value} / {total} ({percentage.toFixed(1)}%)
      </span>
    </div>
  );
}