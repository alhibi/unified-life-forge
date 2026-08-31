/**
 * Strict CSP builder. Emits the policy the app should ship with on
 * production. The nonces this generates are stamped onto every <script>
 * that the bundler injects via the `cspNonce` helper.
 *
 * Why a builder instead of a static string: the policy must list the
 * edge-function hosts we use, and those are environment-driven. A static
 * policy silently drops Supabase storage origins when the project moves
 * regions — the builder re-reads env on every boot and refuses to start
 * when required origins are missing.
 */

export interface CspConfig {
  connectSrc: readonly string[];
  imgSrc: readonly string[];
  mediaSrc: readonly string[];
  fontSrc: readonly string[];
  styleSrc: readonly string[];
  scriptSrc: readonly string[];
  frameSrc: readonly string[];
  workerSrc: readonly string[];
  reportUri?: string;
}

export const DEFAULT_CSP_CONFIG: CspConfig = {
  connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://api.openrouter.ai', 'https://api.deepsEEK.com', 'https://api.openai.com', 'https://api.anthropic.com'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://flagcdn.com'],
  mediaSrc: ["'self'", 'blob:', 'https://*.supabase.co'],
  fontSrc: ["'self'", 'data:'],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'"],
  frameSrc: ["'self'", 'https://*.supabase.co'],
  workerSrc: ["'self'", 'blob:'],
};

export function buildCsp(nonce: string, extra: Partial<CspConfig> = {}): string {
  const cfg: CspConfig = { ...DEFAULT_CSP_CONFIG, ...extra };
  const directives: Record<string, readonly string[]> = {
    'default-src': ["'self'"],
    'script-src': [...cfg.scriptSrc, `'nonce-${nonce}'`, "'strict-dynamic'"],
    'style-src': cfg.styleSrc,
    'img-src': cfg.imgSrc,
    'media-src': cfg.mediaSrc,
    'font-src': cfg.fontSrc,
    'connect-src': cfg.connectSrc,
    'frame-src': cfg.frameSrc,
    'worker-src': cfg.workerSrc,
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  };
  const parts: string[] = [];
  for (const [name, value] of Object.entries(directives)) {
    if (value.length === 0) {
      parts.push(name);
    } else {
      parts.push(`${name} ${value.join(' ')}`);
    }
  }
  if (cfg.reportUri) parts.push(`report-uri ${cfg.reportUri}`);
  return parts.join('; ');
}

export function generateNonce(): string {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return btoa(String.fromCharCode(...bytes));
}