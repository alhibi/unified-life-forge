import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // One chrome for every button: the shared press feedback (`.app-pressable`),
  // the shared focus ring, and the control radius rung (`--r-md`). A size only
  // changes height, inline padding, icon size and the type rung — never the
  // shape language.
  'app-pressable inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium antialiased focus-visible:outline focus-visible:outline-[var(--ui-focus-width)] focus-visible:outline-offset-[var(--ui-focus-offset)] focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[var(--ui-button-h)] px-4 text-body [&_svg]:size-5',
        xs: 'h-[var(--ui-button-xs-h)] rounded-sm px-2 text-mini [&_svg]:size-4',
        sm: 'h-[var(--ui-button-sm-h)] px-3 text-meta [&_svg]:size-4',
        lg: 'h-[var(--ui-button-lg-h)] px-6 text-lead [&_svg]:size-5',
        icon: 'h-[var(--ui-button-h)] w-[var(--ui-button-h)] [&_svg]:size-5',
        'icon-sm': 'h-[var(--ui-button-sm-h)] w-[var(--ui-button-sm-h)] rounded-sm [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      onClick,
      onPointerDown,
      type,
      isLoading,
      loadingText,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || isLoading;

    // Linear-style fast tap: fire onClick on pointerdown (80–100ms faster).
    // Skip for submit/reset (forms need a real click) and when modifier
    // keys are held (so cmd+click on links still opens new tabs).
    const isFormAction = type === 'submit' || type === 'reset';
    const firedRef = React.useRef(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(e);
      if (isFormAction || asChild) return;
      if (e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (isDisabled) return;
      if (e.defaultPrevented) return;
      firedRef.current = true;
      onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (firedRef.current) {
        firedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    };

    if (isLoading) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          type={type}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          disabled={isDisabled}
          aria-busy={isLoading || undefined}
          {...props}
        >
          {loadingText ? (
            loadingText
          ) : (
            <>
              <svg
                className="animate-spin size-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="ms-2">{'جاري التحميل...'}</span>
            </>
          )}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        disabled={isDisabled}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
