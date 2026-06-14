import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { intentHandlers } from "@/lib/routePrefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    // Warm the route's lazy chunk the moment the user shows intent —
    // pointer hover, touchstart, or keyboard focus. The registry
    // de-dupes so this is free on a warm cache.
    const href = typeof to === 'string' ? to : (to && 'pathname' in to ? to.pathname ?? '' : '');
    const prefetch = href ? intentHandlers(href) : null;
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...(prefetch ?? {})}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
