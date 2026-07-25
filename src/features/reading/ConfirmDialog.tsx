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
import { cn } from '@/lib/utils';

/**
 * Tiny wrapper around the shadcn AlertDialog primitives so destructive
 * actions in the Reading feature can prompt for confirmation with a
 * single hook-free, controlled component.
 *
 * Why this exists at the feature level:
 *  - The reading surface has half a dozen one-tap destructive actions
 *    (remove feed, clear archive, clear image cache, delete alert,
 *    clear reader history). They all want the same look + same
 *    Arabic/English copy + same red destructive button.
 *  - A shared component avoids each call-site copy-pasting the
 *    six-prop AlertDialog scaffold and drifting in tone.
 */
export function ConfirmDialog({
  open,
  isAr,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  isAr: boolean;
  /** Bilingual pair for the dialog title */
  title: { ar: string; en: string };
  description?: { ar: string; en: string };
  confirmLabel?: { ar: string; en: string };
  cancelLabel?: { ar: string; en: string };
  /** When true (default), confirm button is rendered in destructive red. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const pick = (p: { ar: string; en: string }) => (p.ar);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pick(title)}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>
              {pick(description)}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {pick(cancelLabel ?? { ar: 'إلغاء', en: 'Cancel' })}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { void onConfirm(); }}
            className={cn(
              destructive
                && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
          >
            {pick(confirmLabel ?? { ar: 'متابعة', en: 'Confirm' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
