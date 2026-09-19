/**
 * Back-navigation fallback: one level up from a path.
 *
 * Used when there is no in-app history to pop (deep link, refresh, external
 * link). Landing on the Portal from four levels deep loses the user's place;
 * climbing one segment keeps them inside the app they entered.
 *
 *   /pkm/mind/42 → /pkm/mind
 *   /pkm         → /
 *   /            → /
 *
 * Trailing slashes and query/hash fragments are not part of a router pathname,
 * so this only splits segments.
 */
export function parentPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}
