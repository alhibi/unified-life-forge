import { useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { Keyboard } from '@/lib/icons';

import {
  readSoftKeyboardPreference,
  supportsSoftKeyboard,
  writeSoftKeyboardPreference,
} from '../lib/preference';

/**
 * Settings row for the app keyboard. Shown only on touch devices, because the
 * feature is meaningless where a hardware keyboard is present.
 */
export default function KeyboardSetting() {
  const [enabled, setEnabled] = useState(() => readSoftKeyboardPreference() === 'app');
  const [touch] = useState(() => supportsSoftKeyboard());

  if (!touch) return null;

  return (
    <div className="arch-plate flex items-center gap-3 rounded-[var(--r-lg)] p-4">
      <span className="row-icon">
        <Keyboard className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-meta text-foreground">لوحة مفاتيح التطبيق</p>
        <p className="text-micro text-muted-foreground">
          عربية أولاً، بصفحة تشكيل ولاتيني وأرقام — بنفس خامة التطبيق بدل لوحة النظام
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={(next) => {
          setEnabled(next);
          writeSoftKeyboardPreference(next ? 'app' : 'system');
        }}
        aria-label="لوحة مفاتيح التطبيق"
      />
    </div>
  );
}