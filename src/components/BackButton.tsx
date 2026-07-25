import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/ui/app-shell';
import { ChevronLeft } from '@/lib/icons';

interface BackButtonProps {
  /**
   * Hard destination — when set, the button always navigates here
   * regardless of history. Use only when "back" should mean a specific
   * page (e.g. close-on-cancel into a parent settings page).
   */
  to?: string;
  /**
   * Custom click handler — overrides every other behaviour. Useful for
   * embedded back-stacks (e.g. Reading's view-state machine) where
   * "back" is not a router-level concept.
   */
  onClick?: () => void;
  /**
   * Where to land when there is no usable browser history (deep-link
   * entry). Defaults to '/'. Has no effect when `to` or `onClick` is
   * supplied.
   */
  fallback?: string;
  /** Optional extra classes (rare — most callers should not need this). */
  className?: string;
  /** Override the default localized aria-label. */
  ariaLabel?: string;
}

/**
 * Unified back button.
 *
 * One small, theme-adaptive ghost glyph instead of a heavy filled chip.
 * The visual footprint is intentionally tiny so it never competes with
 * the page title — it reads as an affordance, not a button "tile".
 *
 * Behaviour, in priority order:
 *   1. `onClick`  → call the handler (custom back-stacks)
 *   2. `to`       → `navigate(to)` (hard destination)
 *   3. otherwise  → `navigate(-1)` if there is in-app history
 *      (`location.key !== 'default'`), else `navigate(fallback,
 *      {replace:true})`. We deliberately do NOT use
 *      `window.history.length > 1` because that counts cross-origin
 *      entries too — pressing back would then leave the app entirely
 *      when the user reached us from another website.
 *
 * RTL: a single ChevronLeft is mirrored via `rtl:rotate-180`, so we
 * don't ship two icons or branch on context.
 */
export default function BackButton({
  to,
  onClick,
  fallback = '/',
  className,
  ariaLabel,
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const label = ariaLabel ?? 'رجوع';

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    // `location.key === 'default'` means this is the very first entry
    // in the browser tab's session for this app — i.e. the user
    // landed here via deep-link / refresh / external link and has no
    // in-app history. In that case `navigate(-1)` would leave the app,
    // so we replace with the safe in-app fallback instead.
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [onClick, to, fallback, navigate, location.key]);

  return (
    <IconButton onClick={handleClick} aria-label={label} className={className}>
      <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
    </IconButton>
  );
}
