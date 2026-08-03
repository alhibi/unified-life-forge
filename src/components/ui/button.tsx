import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-[var(--ui-touch-min)] items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium antialiased transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.98] shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground shadow-none',
        link: 'text-primary underline-offset-4 hover:underline shadow-none',
      },
      size: {
        default: 'h-[var(--ui-button-h)] px-4 py-2',
        xs: 'h-7 rounded-md px-2 text-xs',
        sm: 'h-[var(--ui-button-sm-h)] rounded-md px-3',
        lg: 'h-[var(--ui-button-lg-h)] rounded-md px-6',
        icon: 'h-[var(--ui-button-h)] w-[var(--ui-button-h)] min-w-[var(--ui-touch-min)]',
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
                className="animate-spin h-5 w-5"
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
