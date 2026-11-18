import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Read the breakpoint on the first render, not only in the effect: a layer
  // that mounts already open on a phone (e.g. a detail sheet opened by a click)
  // would otherwise render the desktop branch for one commit and swap, which
  // reads as a jump. The effect below keeps it live on resize.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() =>
    typeof window === "undefined" ? undefined : window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // No initial setState: the lazy state initializer above already read the
    // current width, so the effect only has to stay subscribed.
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
