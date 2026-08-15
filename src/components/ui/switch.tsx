import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-7 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted p-1 transition-colors duration-fast after:absolute after:left-1/2 after:top-1/2 after:h-[var(--ui-touch-min)] after:w-[var(--ui-touch-min)] after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] data-[state=checked]:border-primary data-[state=checked]:bg-primary app-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // thumb = track 28 − 2×border 1 − 2×padding 4 = 18px; travel = 44 − 28 = 16px.
        'pointer-events-none block size-[18px] rounded-full bg-primary-foreground transition-transform duration-fast data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:-translate-x-4',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
