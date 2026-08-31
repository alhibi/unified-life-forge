import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as React from 'react';

import { ChevronDown } from '@/lib/icons';
import { cn } from '@/lib/utils';


const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ ...props }, ref) => (
  // @ts-expect-error — Radix's polymorphic props clash with React 19's stricter ref forwarding; the
  // runtime contract is correct. Re-evaluate after upgrading @radix-ui/react-accordion.
  <AccordionPrimitive.Root ref={ref} {...props} />
));
Accordion.displayName = 'Accordion';


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
