// Route-id encoding for the podcast detail page.
//
// `/podcasts/:id` accepts two shapes:
//   • An Apple Podcasts collection id (all digits) — used by the
//     discovery grid which only knows the Apple id.
//   • A `feed_<base64url>` token wrapping an RSS feed URL — used by
//     the library, which already has the canonical feed URL and
//     doesn't need to round-trip through Apple's lookup endpoint.
//
// Centralizing the encode/decode here keeps the two ends in sync
// without forcing the library page to import `PodcastDetail` (which
// it would otherwise have to do just for `encodeFeedUrl`, breaking
// React Refresh's "components-only file" rule).

export type DecodedRouteId =
  | { kind: 'apple-id'; id: string }
  | { kind: 'feed-url'; url: string };

const PREFIX = 'feed_';

export function decodeRouteId(raw: string): DecodedRouteId {
  if (raw.startsWith(PREFIX)) {
    try {
      const b64 = raw.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      return { kind: 'feed-url', url: atob(padded) };
    } catch {
      // fall through — bad encoding, treat as Apple id
    }
  }
  return { kind: 'apple-id', id: raw };
}

export function encodeFeedUrl(feedUrl: string): string {
  const b64 = btoa(feedUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${PREFIX}${b64}`;
}
