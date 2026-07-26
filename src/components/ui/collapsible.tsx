import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Collapsible — a single disclosure, for an inline "more detail" panel.
 *
 * Same motion contract as `accordion.tsx`: a tween to Radix's measured height,
 * never a spring, with the duration and curve inherited from the motion
 * platform. Use `<Accordion>` when several panels belong to one group and only
 * one should be open; use this when a panel stands alone.
 */

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    data-ui-surface="disclosure"
    className={cn(
      'overflow-hidden [--collapse-target-height:var(--radix-collapsible-content-height)]',
      'data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down',
    )}
    {...props}
  >
    <div className={className}>{children}</div>
  </CollapsiblePrimitive.CollapsibleContent>
));
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
