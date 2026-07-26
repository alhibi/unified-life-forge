/** Matches the `url ~* '^https?://.+'` CHECK on `place_links`. */
export function isValidUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}
