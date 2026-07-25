/**
 * DeviceKeyCard — this device's encryption identity, in the settings screen.
 *
 * Purpose is transparency, not configuration: there is nothing to toggle,
 * because encryption is applied automatically whenever the other party has a
 * published key. What the user needs to know is (a) that it is on, (b) that the
 * private key is bound to this device and cannot be exported, and (c) exactly
 * what is and is not covered.
 */
import { useEffect, useState } from 'react';

import { getIdentity, isCryptoAvailable, isDirectoryAvailable, publishPublicKey } from '@/lib/chat/crypto';
import { Info, Lock, ShieldCheck, ShieldOff } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface State {
  ready: boolean;
  published: boolean;
  /** Short fingerprint of this device's own public key. */
  keyDigest: string | null;
  createdAt: number | null;
}

export default function DeviceKeyCard({ userId }: { userId: string | undefined }) {
  const [state, setState] = useState<State>({
    ready: false,
    published: false,
    keyDigest: null,
    createdAt: null,
  });

  useEffect(() => {
    if (!userId || !isCryptoAvailable()) return;
    let alive = true;
    void (async () => {
      try {
        const identity = await getIdentity();
        const published = await publishPublicKey(userId, identity.publicKeyRaw);
        if (!alive) return;
        setState({
          ready: true,
          published,
          // First and last six characters of the raw key: enough to tell two
          // devices apart at a glance without printing the whole point.
          keyDigest: `${identity.publicKeyRaw.slice(0, 6)}…${identity.publicKeyRaw.slice(-6)}`,
          createdAt: identity.createdAt,
        });
      } catch {
        if (alive) setState((s) => ({ ...s, ready: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const supported = isCryptoAvailable();
  const active = supported && state.ready && state.published;
  const directory = isDirectoryAvailable();

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border',
            active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground',
          )}
          aria-hidden
        >
          {active ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold text-foreground">
            {!supported
              ? 'المتصفح لا يدعم التشفير'
              : active
                ? 'مفتاح هذا الجهاز نشِط'
                : directory === false
                  ? 'دليل المفاتيح غير متاح'
                  : 'يجري تحضير مفتاح الجهاز…'}
          </p>
          <p className="mt-0.5 text-mini text-muted-foreground">
            المفتاح الخاص يُنشأ داخل هذا الجهاز بصيغة غير قابلة للاستخراج، ولا يُرسل إلى أي خادم — ولا
            إلينا.
          </p>
          {state.keyDigest && (
            <p className="mt-2 flex items-center gap-1.5 text-mini tabular-nums text-muted-foreground" dir="ltr">
              <Lock className="h-3 w-3" aria-hidden />
              {state.keyDigest}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-mini text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          التشفير يُفعَّل تلقائياً في المحادثات الثنائية عندما ينشر الطرف الآخر مفتاحه، ويشمل نصوص
          الرسائل فقط. لأن المفتاح مربوط بالجهاز، فالدخول من جهاز آخر يُنشئ مفتاحاً جديداً ولا يقرأ
          الرسائل التي وصلت إلى الجهاز الأول.
        </span>
      </p>
    </div>
  );
}
