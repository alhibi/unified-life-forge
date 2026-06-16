import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Curium button: 10px radius, mono, snappy press scale.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-mono text-[13px] font-medium tracking-wide ring-offset-background transition-[transform,background-color,color,border-color] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-[10px]",
        sm: "h-9 rounded-[10px] px-3",
        lg: "h-12 rounded-[10px] px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, onPointerDown, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // Linear-style fast tap: fire onClick on pointerdown (80–100ms faster).
    // Skip for submit/reset (forms need a real click) and when modifier
    // keys are held (so cmd+click on links still opens new tabs).
    const isFormAction = type === "submit" || type === "reset";
    const firedRef = React.useRef(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(e);
      if (isFormAction || asChild) return;
      if (e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (props.disabled) return;
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

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
