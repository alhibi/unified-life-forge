/**
 * Redacts secrets and infrastructure identifiers from strings that are about
 * to be displayed or transmitted.
 *
 * This lived in `components/ErrorBoundary.tsx`, which made it awkward to reach:
 * `lib/telemetry.ts` needs it, but `ErrorBoundary` needs telemetry, so the two
 * formed an import cycle that forced a dynamic import and a Rollup warning.
 * It is a pure string function with no React in it, so `lib/` is where it
 * belongs. `ErrorBoundary` re-exports it for existing callers.
 */
export function scrubVerboseDetails(input: string): string {
  if (!input) return '';
  let clean = input;
  // Mask JWT / API keys
  clean = clean.replace(
    /ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g,
    '[MASKED_API_KEY]',
  );
  clean = clean.replace(/anon_key=[^&\s]+/gi, 'anon_key=[MASKED]');
  clean = clean.replace(/apikey=[^&\s]+/gi, 'apikey=[MASKED]');
  clean = clean.replace(/sb_[a-zA-Z0-9_]+/gi, '[REDACTED_IDENTIFIER]');
  // Mask DB hostnames / Supabase URLs
  clean = clean.replace(
    /https:\/\/[a-z0-9-]+\.supabase\.(co|net)/gi,
    'https://[REDACTED_DB_HOST].supabase.co',
  );
  return clean;
}
