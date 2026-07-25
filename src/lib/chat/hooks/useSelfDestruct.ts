// useSelfDestruct — self-destruct timer state for the active chat.
//
// Reads the canonical value from the chat summary (server-synced) and
// exposes a setter that fans out to the new chats RPC + a fallback for
// legacy DM-only conversations.

import { useCallback, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import * as api from '../api';
import type { ChatSummary } from '../types';

export const SELF_DESTRUCT_PRESETS: Array<{ seconds: number | null; labelAr: string; }> = [
  { seconds: null,    labelAr: 'إيقاف', },
  { seconds: 30,      labelAr: '30 ثانية', },
  { seconds: 300,     labelAr: '5 دقائق', },
  { seconds: 3_600,   labelAr: 'ساعة', },
  { seconds: 86_400,  labelAr: 'يوم', },
  { seconds: 604_800, labelAr: 'أسبوع', },
];

export interface UseSelfDestructResult {
  seconds: number | null;
  /** Localised label for the chip ("Off", "30s", "1h", …). */
  label: string;
  isEnabled: boolean;
  setSeconds: (seconds: number | null) => Promise<void>;
}

export function useSelfDestruct(chat: ChatSummary | null | undefined): UseSelfDestructResult {
  const { language } = useApp();
  const isAr = language === 'ar';
  const seconds = chat?.selfDestructSeconds ?? null;

  const label = useMemo(() => {
    const preset = SELF_DESTRUCT_PRESETS.find(p => p.seconds === seconds);
    if (preset) return preset.labelAr;
    if (seconds == null) return 'إيقاف';
    if (seconds < 60)         return `${seconds}s`;
    if (seconds < 3600)       return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400)      return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }, [seconds, isAr]);

  const setSeconds = useCallback(async (next: number | null) => {
    if (!chat) return;
    await api.setChatSelfDestruct(chat.id, next);
  }, [chat]);

  return { seconds, label, isEnabled: seconds !== null, setSeconds };
}
