import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Themed, RTL-aware replacement for `window.confirm`.
 *
 * `window.confirm` is forbidden in this project: it ignores the design
 * system, can't be styled for RTL, and modern browsers may suppress it.
 * This helper mounts a shadcn AlertDialog into a transient portal and
 * resolves a Promise<boolean> once the user picks.
 *
 * Usage:
 *   if (await confirmDialog({ message: 'Delete?' })) { … }
 */
export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    const cleanup = (value: boolean) => {
      // Defer unmount one tick so Radix's close animation can play.
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 200);
      resolve(value);
    };

    function Mount() {
      const [open, setOpen] = useState(false);
      // Open on next frame so the enter animation runs.
      useEffect(() => { setOpen(true); }, []);
      return (
        <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); cleanup(false); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              {opts.title && <AlertDialogTitle>{opts.title}</AlertDialogTitle>}
              <AlertDialogDescription>{opts.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setOpen(false); cleanup(false); }}>
                {opts.cancelLabel ?? 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { setOpen(false); cleanup(true); }}
                className={opts.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
              >
                {opts.confirmLabel ?? 'OK'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    root.render(<Mount />);
  });
}