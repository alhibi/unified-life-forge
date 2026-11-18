import type * as React from 'react';

import { IconButton } from '@/components/ui/app-shell';
import { Keyboard } from '@/lib/icons';

/**
 * Explicit opt-in affordance for the in-app keyboard.
 *
 * The keyboard never opens on focus (see KeyboardProvider). A surface that
 * wants the app keyboard places this 44x44 control next to its field: it opens
 * the panel for the field the user was editing, and closes it again. It is
 * rendered only while the in-app keyboard is the selected preference, so a
 * user who chose the system keyboard never sees a dead control.
 */
import {
  requestCloseSoftKeyboard,
  requestSoftKeyboard,
  useSoftKeyboardState,
} from './softKeyboardControl';

interface SoftKeyboardToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** The field this toggle types into. Falls back to the last focused field. */
  target?: React.RefObject<HTMLElement | null> | null;
  /** Accessible label when the panel is closed. */
  label?: string;
  className?: string;
}

export function SoftKeyboardToggle({
  target,
  label = 'لوحة المفاتيح الذكية',
  className,
  ...rest
}: SoftKeyboardToggleProps) {
  const { open, preference } = useSoftKeyboardState();

  // Read the live flag as well: a click can arrive in the same frame as the
  // provider's release, when this component's last render still said "open".
  // Deciding from the DOM keeps the control's action and the panel's state in
  // agreement (QA-SL-1: close click re-opened the panel).
  const isOpen = () => document.documentElement.hasAttribute('data-soft-keyboard-open');

  if (preference !== 'app') return null;

  const close = () => requestCloseSoftKeyboard();

  return (
    <IconButton
      type="button"
      aria-label={open ? 'إغلاق لوحة المفاتيح' : label}
      title={open ? 'إغلاق لوحة المفاتيح' : label}
      aria-pressed={open}
      // While the panel is open the in-flow seat would sit underneath it, so
      // the same control docks just above the panel: visible, reachable and
      // still the same toggle.
      className={
        open
          ? 'fixed z-lightbox elevation-2 ' + (className ?? '')
          : className
      }
      style={
        open
          ? {
              bottom: 'calc(var(--soft-keyboard-height, 0px) + 12px)',
              insetInlineEnd: 'var(--ui-gutter)',
            }
          : undefined
      }
      onClick={() => {
        if (isOpen()) {
          close();
          return;
        }
        const el = target?.current ?? null;
        if (el) el.focus();
        requestSoftKeyboard(el);
      }}
      {...rest}
    >
      <Keyboard className="h-5 w-5" aria-hidden />
    </IconButton>
  );
}

export default SoftKeyboardToggle;