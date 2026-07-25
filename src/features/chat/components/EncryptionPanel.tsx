/**
 * EncryptionPanel — the honest account of how protected this conversation is.
 *
 * Two rules govern this component:
 *
 *  1. It never claims more than the implementation delivers. Attachments are not
 *    encrypted yet, and the design has no forward secrecy, so both facts are
 *    written on the screen rather than buried in a commit message.
 *  2. Key substitution is surfaced, not smoothed over. If the peer's published
 *    key changes, that is either a new device or an attack, and only the two
 *    humans comparing the safety number can tell which.
 */
import { memo } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Check, Info, Lock, ShieldAlert, ShieldCheck, ShieldOff } from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { EncryptionStatus } from './useEncryptionStatus';

interface Props {
  status: EncryptionStatus;
  peerName: string;
  /** Renders without the card chrome (inside an existing panel). */
  bare?: boolean;
}

const STATUS_COPY: Record<
  EncryptionStatus['status'],
  { title: string; detail: string; icon: typeof ShieldCheck }
> = {
  secure: {
    title: 'مشفّرة من الطرف إلى الطرف',
    detail: 'نصوص هذه المحادثة تُشفَّر على جهازك ولا يمكن للخادم قراءتها.',
    icon: ShieldCheck,
  },
  'peer-missing-key': {
    title: 'التشفير غير مفعّل بعد',
    detail: 'لم ينشر الطرف الآخر مفتاحه بعد. سيُفعّل التشفير تلقائياً عند أول فتح للتطبيق من جهازه.',
    icon: ShieldOff,
  },
  'directory-unavailable': {
    title: 'تعذّر الوصول إلى دليل المفاتيح',
    detail: 'الرسائل تُرسل بدون تشفير حتى يعود الاتصال بدليل المفاتيح.',
    icon: ShieldAlert,
  },
  unsupported: {
    title: 'المتصفح لا يدعم التشفير',
    detail: 'يحتاج التشفير إلى WebCrypto وIndexedDB، وهما غير متاحين هنا.',
    icon: ShieldOff,
  },
};

function EncryptionPanelImpl({ status, peerName, bare }: Props) {
  const copy = STATUS_COPY[status.status];
  const Icon = copy.icon;
  const secure = status.status === 'secure';

  const body = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border',
            secure ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground',
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-meta font-semibold text-foreground">{copy.title}</h3>
          <p className="mt-0.5 text-mini text-muted-foreground">{copy.detail}</p>
        </div>
      </div>

      {status.peerKeyChanged && (
        <div className="mt-3 rounded-md border border-destructive/60 p-3">
          <p className="flex items-center gap-2 text-meta font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
            تغيّر مفتاح {peerName}
          </p>
          <p className="mt-1 text-mini text-muted-foreground">
            قد يكون سجّل الدخول من جهاز جديد، وقد يكون شيئاً آخر. تحقّقا من رقم الأمان معاً قبل تبادل
            شيء حسّاس.
          </p>
          <button
            type="button"
            onClick={status.acknowledge}
            className="mt-3 flex h-11 items-center gap-1.5 rounded-button border border-border px-3 text-meta font-semibold text-foreground transition-colors duration-fast hover:bg-muted"
          >
            <Check className="h-4 w-4" aria-hidden />
            تحقّقت من الرقم
          </button>
        </div>
      )}

      {secure && status.safetyNumber && (
        <div className="mt-3">
          <p className="app-section-label mb-2">رقم الأمان</p>
          {/* Grouped digits, LTR and tabular so the two people reading it aloud
              see the identical layout on both devices. */}
          <p
            className="rounded-md border border-border p-3 text-center text-body font-semibold leading-relaxed tabular-nums tracking-[0.08em] text-foreground"
            dir="ltr"
          >
            {status.safetyNumber}
          </p>
          <p className="mt-2 text-mini text-muted-foreground">
            اقرأه مع {peerName} صوتياً أو وجهاً لوجه. تطابُقه يعني أن لا أحد يتوسّط بينكما.
          </p>
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <p className="flex items-start gap-2 text-mini text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            التشفير يشمل نصوص الرسائل فقط في الوقت الحالي؛ الصور والملفات والرسائل الصوتية لا تزال غير
            مشفّرة. كما أن المفاتيح ثابتة لكل جهاز، أي أن كشف مفتاح الجهاز يكشف رسائله السابقة.
          </span>
        </p>
      </div>
    </>
  );

  if (bare) return <div>{body}</div>;

  return (
    <AppCard as="section" aria-label="حالة التشفير">
      {body}
    </AppCard>
  );
}

export const EncryptionPanel = memo(EncryptionPanelImpl);
export default EncryptionPanel;

/** Compact lock badge for the conversation header. */
export const EncryptionBadge = memo(function EncryptionBadge({
  status,
  onClick,
}: {
  status: EncryptionStatus['status'];
  onClick?: () => void;
}) {
  if (status !== 'secure') return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="محادثة مشفّرة من الطرف إلى الطرف"
      className="flex h-7 items-center gap-1 rounded-sm border border-border px-1.5 text-micro text-muted-foreground transition-colors duration-fast hover:text-foreground"
    >
      <Lock className="h-3 w-3" aria-hidden />
      مشفّرة
    </button>
  );
});
