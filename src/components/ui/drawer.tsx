import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/lib/utils';

// Escape key handler for drawers
function useEscapeKey(callback: () => void) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
}

const Drawer = ({
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn('app-scrim z-drawer', className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    onClose?: () => void;
    autoFocus?: boolean;
  }
>(({ className, children, onClose, autoFocus = true, ...props }, ref) => {
  const drawerContentRef = React.useRef<HTMLDivElement>(null);

  // Handle Escape key to close drawer
  useEscapeKey(() => {
    onClose?.();
  });

  // Auto-focus first focusable element when drawer opens
  React.useEffect(() => {
    if (autoFocus && drawerContentRef.current) {
      const focusableElements = drawerContentRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      } else {
        drawerContentRef.current.focus();
      }
    }
  }, [autoFocus]);

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        data-ui-surface="drawer"
        className={cn(
          'app-overlay-surface fixed inset-x-0 bottom-0 z-drawer flex h-auto flex-col rounded-b-none rounded-t-xl',
          className,
        )}
        onOpenAutoFocus={(e) => {
          if (!autoFocus) {
            e.preventDefault();
          }
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onClose?.();
        }}
        {...props}
      >
        <button
          type="button"
          className="mx-auto flex h-11 w-16 items-center justify-center"
          onClick={onClose}
          aria-label="إغلاق الدرج"
        >
          <span className="app-drawer-handle" />
        </button>
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-1 p-4 text-start', className)} {...props} />
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
);
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-title font-semibold', className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-body text-muted-foreground', className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
