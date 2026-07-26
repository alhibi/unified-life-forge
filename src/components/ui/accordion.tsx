import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as React from 'react';

import { ChevronDown } from '@/lib/icons';
import { cn } from '@/lib/utils';

/**
 * Accordion — the canonical disclosure group.
 *
 * Motion contract
 * ───────────────
 * Expanding a panel is the one place in the app where a LAYOUT property has to
 * animate: the content below genuinely has to move down. Two rules make that
 * safe and smooth:
 *
 *   1. It is a tween, never a spring. A spring on a height overshoots, and an
 *      overshooting height makes every element below the panel visibly bounce
 *      — the exact rebound the motion brief rules out.
 *   2. The target height comes from Radix's own measurement
 *      (`--radix-accordion-content-height`), so there is no per-frame
 *      JavaScript measuring anything. The keyframe interpolates between two
 *      known numbers, which the browser can do without a layout pass per frame.
 *
 * Timing and easing are inherited from `animate-collapse-down` /
 * `animate-collapse-up` in `tailwind.config.ts`, both of which are multiplied
 * by `--motion-scale` and bound to the active easing family. So an accordion
 * follows /settings/motion without knowing that screen exists.
 */

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('app-divider-b last:border-b-0', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex min-h-[var(--ui-touch-min)] flex-1 items-center justify-between gap-3 py-3 text-start text-body font-medium text-foreground',
        '[&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        aria-hidden
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-normal ease-enter"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    data-ui-surface="disclosure"
    className={cn(
      'overflow-hidden [--collapse-target-height:var(--radix-accordion-content-height)]',
      'data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down',
    )}
    {...props}
  >
    <div className={cn('pb-3', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
