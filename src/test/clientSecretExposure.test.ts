/**
 * Mechanical guard: nothing secret may be reachable from client code.
 *
 * The gitleaks job in CI covers git history and the generic secret shapes.
 * This test covers the failure mode gitleaks cannot see: a *legitimately
 * named* environment variable that happens to hold a server-only credential
 * and gets read through `import.meta.env`, which Vite inlines into the shipped
 * bundle as a plain string.
 *
 * The weather feature already declares seven provider API keys as
 * `VITE_*` names in its source registry. None of them is read today, and that
 * is the state this test freezes: the moment someone wires one up, the read
 * lands in the bundle and this fails, pushing the call to an Edge Function
 * where the key belongs.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

/**
 * Env vars that are publishable by design.
 *
 * - Supabase URL / publishable (anon) key / project id: designed for browsers,
 *   gated by RLS.
 * - Sentry DSN: an ingest endpoint, not a credential — it grants write-only
 *   event submission.
 * - App version: build metadata.
 */
const PUBLISHABLE_ENV = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
  'VITE_SENTRY_DSN',
  'VITE_APP_VERSION',
]);

/** Literal credentials that must never appear in a source file. */
const FORBIDDEN_LITERALS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'PEM private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: 'Supabase service_role JWT', pattern: /InJvbGUiOiJzZXJ2aWNlX3JvbGUi/ },
  { label: 'OpenAI-style secret key', pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { label: 'AWS access key id', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: 'Slack token', pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
];

/**
 * Reading a service-role key from client code is a different bug from
 * hardcoding one, and produces a different (worse) outcome: it works locally
 * and ships an admin credential.
 */
const FORBIDDEN_ENV_READS = /import\.meta\.env\.(VITE_)?SUPABASE_SERVICE_ROLE_KEY|process\.env\.SUPABASE_SERVICE_ROLE_KEY/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx|css)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('client bundle secret exposure', () => {
  const files = sourceFiles(SRC);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('reads no environment variable that is not publishable by design', () => {
    const violations: string[] = [];

    for (const file of files) {
      // This test necessarily contains the names it bans.
      if (file.endsWith('clientSecretExposure.test.ts')) continue;
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) {
        const name = match[1];
        if (!PUBLISHABLE_ENV.has(name)) {
          violations.push(`${relative(SRC, file)} reads ${name}`);
        }
      }
    }

    expect(
      violations,
      'A VITE_* variable read from client code is inlined into the shipped ' +
        'bundle. If it is a credential, move the call into an Edge Function ' +
        'and read the secret there. If it is genuinely publishable, add it to ' +
        'PUBLISHABLE_ENV with the reason.',
    ).toEqual([]);
  });

  it('contains no hardcoded credential literal', () => {
    const violations: string[] = [];

    for (const file of files) {
      if (file.endsWith('clientSecretExposure.test.ts')) continue;
      const text = readFileSync(file, 'utf8');
      for (const { label, pattern } of FORBIDDEN_LITERALS) {
        if (pattern.test(text)) violations.push(`${relative(SRC, file)}: ${label}`);
      }
      if (FORBIDDEN_ENV_READS.test(text)) {
        violations.push(`${relative(SRC, file)}: reads the service-role key`);
      }
    }

    expect(violations).toEqual([]);
  });
});