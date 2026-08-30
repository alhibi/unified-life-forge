// ============================================================================
// VerificationPanel — the screen that says "here is exactly how right or
// wrong each source was, measured against ground truth".
//
// This is the opposite of a forecast UI that just shows a single number.
// Every row in the panel is a (source, field) pair with three honest stats:
//
//   • samples   — how many predictions we have evidence for
//   • mae       — mean absolute error of those predictions against actuals
//   • bias      — signed average error (positive = the source runs hot)
//
// A coloured verdict (verified / partial / unverified) tells the user at a
// glance which sources have enough evidence to be trusted for THIS location.
// The whole point: trust is earned per place, not assumed.
// ============================================================================

import { memo, useEffect, useMemo, useState } from 'react';

import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldQuestion } from '@/lib/icons';

import { skillReport } from '../engine/ConsensusSkillTracker';
import {
  buildVerificationReport,
  type FieldTrust,
  type SourceTrust,
  trustLabel,
  type TrustLevel,
} from '../engine/VerificationReport';
import { ALL_SOURCE_IDS } from '../types/SourceRegistry';

interface Props {
  lat: number;
  lng: number;
}

const FIELD_LABEL_AR: Record<string, string> = {
  temperature: 'الحرارة',
  humidity: 'الرطوبة',
  pressure: 'الضغط',
  wind: 'الرياح',
  cloud: 'الغيوم',
};

const TRUST_RING: Record<TrustLevel, string> = {
  verified:   'ring-success/40 text-success',
  partial:    'ring-warning/40 text-warning',
  unverified: 'ring-muted/30 text-muted-foreground',
};

const TRUST_BG: Record<TrustLevel, string> = {
  verified:   'bg-success/10',
  partial:    'bg-warning/10',
  unverified: 'bg-muted/15',
};

const TRUST_ICON: Record<TrustLevel, typeof CheckCircle2> = {
  verified: ShieldCheck,
  partial: ShieldAlert,
  unverified: ShieldQuestion,
};

function FieldRow({ field }: { field: FieldTrust }) {
  const Icon = TRUST_ICON[field.trust];
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${TRUST_BG[field.trust]} border border-border/30`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 shrink-0 ${TRUST_RING[field.trust].split(' ')[1] ?? ''}`} aria-hidden />
        <span className="text-mini font-medium">{FIELD_LABEL_AR[field.field] ?? field.field}</span>
      </div>
      <div className="flex items-center gap-3 text-mini text-muted-foreground tabular-nums">
        <span>{field.samples} عينة</span>
        <span>انحراف {field.bias.toFixed(1)}</span>
        <span>MAE {field.mae.toFixed(2)}</span>
      </div>
    </div>
  );
}

function SourceRow({ trust }: { trust: SourceTrust }) {
  const Icon = TRUST_ICON[trust.trust];
  const ringClass = TRUST_RING[trust.trust];
  return (
    <div className={`rounded-xl border border-border/40 ${TRUST_BG[trust.trust]} p-3 space-y-2`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${ringClass.split(' ')[1] ?? ''}`} aria-hidden />
          <span className="text-body font-semibold truncate">{trust.label}</span>
          <span className="text-mini text-muted-foreground">{trust.domain}</span>
        </div>
        <span className={`text-mini font-semibold tabular-nums ${ringClass.split(' ')[1] ?? ''}`}>
          {trustLabel(trust.trust)}
        </span>
      </header>
      <p className="text-mini text-muted-foreground">{trust.reason}</p>
      <div className="space-y-1.5">
        {trust.fields.map((f) => (
          <FieldRow key={f.field} field={f} />
        ))}
      </div>
    </div>
  );
}

function VerificationPanelImpl({ lat, lng }: Props) {
  const [report, setReport] = useState<SourceTrust[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const tick = () => {
      const rows = skillReport(lat, lng);
      const full = buildVerificationReport(lat, lng, ALL_SOURCE_IDS, rows);
      setReport(full);
    };
    tick();
    const id = window.setInterval(tick, 5000);
    window.addEventListener('weather:refreshed', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('weather:refreshed', tick);
    };
  }, [lat, lng]);

  const summary = useMemo(() => {
    let verified = 0, partial = 0, unverified = 0;
    for (const t of report) {
      if (t.trust === 'verified') verified += 1;
      else if (t.trust === 'partial') partial += 1;
      else unverified += 1;
    }
    return { verified, partial, unverified, total: report.length };
  }, [report]);

  if (summary.total === 0) return null;

  const visible = isExpanded ? report : report.slice(0, 3);

  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden p-4 space-y-3">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-title leading-none text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {'لوحة التحقق الفعلي (Verification Console)'}
          </h2>
          <p className="text-mini text-muted-foreground mt-1.5">
            {'كل صف يبيّن متوسط الخطأ الفعلي لكل مصدر في موقعك، مقاساً بقراءات لاحقة.'}
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-mini px-3 py-1.5 rounded-lg border border-border bg-card text-primary shrink-0 transition-transform active:scale-95"
        >
          {isExpanded ? 'طي الكل' : `اعرض ${summary.total}`}
        </button>
      </header>
      <div className="flex items-center gap-2 text-mini">
        <span className="px-2 py-1 rounded-md bg-success/15 text-success tabular-nums">{summary.verified} موثّق</span>
        <span className="px-2 py-1 rounded-md bg-warning/15 text-warning tabular-nums">{summary.partial} جزئي</span>
        <span className="px-2 py-1 rounded-md bg-muted/30 text-muted-foreground tabular-nums">{summary.unverified} رصيد غير كافٍ</span>
      </div>
      <div className="space-y-2.5">
        {visible.map((t) => (
          <SourceRow key={t.sourceId} trust={t} />
        ))}
      </div>
    </section>
  );
}

export const VerificationPanel = memo(VerificationPanelImpl);