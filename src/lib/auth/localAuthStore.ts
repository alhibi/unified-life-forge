// Local-only authentication fallback.
//
// Activated by `useAuth.tsx` when `isSupabaseConfigured` is false (i.e. the
// app is running without VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
// in `.env`). Lets the user sign up and sign in entirely on-device so the
// app is usable for local/offline testing without a backend.
//
// Security model
// ──────────────
// Passwords are hashed with PBKDF2-SHA256 (200k iterations) via the Web
// Crypto API and stored alongside a per-user random salt in localStorage.
// We never store the raw password. This is *not* a substitute for
// server-side auth — it only protects the credential at rest on this
// device. Anyone with filesystem-level access to the browser profile can
// still copy the hash and brute-force it offline.
//
// Shape compatibility
// ───────────────────
// We mint plausible Supabase-like `User` and `Session` objects so the
// existing `useAuth` consumers (which type against `@supabase/supabase-js`)
// keep working unchanged. The `access_token` is opaque and never sent to
// any server in this mode.

import type { Session, User } from '@supabase/supabase-js';

const ACCOUNTS_KEY = 'local-auth:accounts:v1';
const SESSION_KEY = 'local-auth:session:v1';
const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = 'SHA-256';
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

interface LocalAccount {
  id: string;          // stable UUID minted at signup
  username: string;    // canonical (lowercased, trimmed)
  displayName: string; // original-cased trimmed input from signup
  saltB64: string;
  hashB64: string;
  createdAt: number;
}

interface PersistedSession {
  userId: string;
  expiresAt: number;
  token: string;
}

// ── Crypto helpers ──────────────────────────────────────────────────────

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', enc, { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

// Constant-time comparison so the time taken to fail does not reveal where
// the mismatch was. Not strictly necessary for a local-only store but cheap
// and removes a class of bugs.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bytesToB64(bytes);
}

function newId(): string {
  // crypto.randomUUID is available in all browsers we target (and node >=19),
  // but fall back to a manual generator for older environments just in case.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ── Storage layer ───────────────────────────────────────────────────────

function readAccounts(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: LocalAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function readPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.userId || !parsed?.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedSession(s: PersistedSession | null): void {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

// ── Supabase shape adapters ─────────────────────────────────────────────

function accountToUser(account: LocalAccount): User {
  // Cast through `unknown` because the real Supabase `User` carries many
  // server-side fields we never populate (factors, identities, app_metadata
  // app-specific keys, …). The consumers of `useAuth` only read `id` and
  // `user_metadata.username`, so providing those is sufficient.
  return {
    id: account.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${account.username}@smartapp.local`,
    email_confirmed_at: new Date(account.createdAt).toISOString(),
    phone: '',
    confirmed_at: new Date(account.createdAt).toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'local', providers: ['local'] },
    user_metadata: { username: account.displayName },
    identities: [],
    created_at: new Date(account.createdAt).toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as User;
}

function buildSession(account: LocalAccount, token: string, expiresAt: number): Session {
  const expiresIn = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return {
    access_token: token,
    refresh_token: token, // not actually refreshable in this mode
    expires_in: expiresIn,
    expires_at: Math.floor(expiresAt / 1000),
    token_type: 'bearer',
    user: accountToUser(account),
  } as unknown as Session;
}

// ── Public API ──────────────────────────────────────────────────────────

export interface LocalAuthError {
  name: string;
  message: string;
}

export interface LocalAuthResult {
  data: { session: Session | null; user: User | null } | null;
  error: LocalAuthError | null;
}

function findByUsername(username: string): LocalAccount | undefined {
  const canonical = username.toLowerCase().trim();
  return readAccounts().find((a) => a.username === canonical);
}

export async function localSignUp(username: string, password: string): Promise<LocalAuthResult> {
  const canonical = username.toLowerCase().trim();
  const accounts = readAccounts();
  if (accounts.some((a) => a.username === canonical)) {
    return {
      data: null,
      error: { name: 'AuthError', message: 'User already registered' },
    };
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveHash(password, salt);

  const account: LocalAccount = {
    id: newId(),
    username: canonical,
    displayName: username.trim(),
    saltB64: bytesToB64(salt),
    hashB64: bytesToB64(hash),
    createdAt: Date.now(),
  };
  accounts.push(account);
  writeAccounts(accounts);

  // Auto-sign-in to mirror Supabase's signUp behaviour (which returns a
  // session immediately when email confirmation is disabled).
  const token = randomToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  writePersistedSession({ userId: account.id, expiresAt, token });
  const session = buildSession(account, token, expiresAt);
  return { data: { session, user: session.user }, error: null };
}

export async function localSignIn(username: string, password: string): Promise<LocalAuthResult> {
  const account = findByUsername(username);
  if (!account) {
    // In local-only mode there's no global namespace to enumerate and
    // anyone with localStorage access can already list usernames, so the
    // usual "don't reveal which side mismatched" rule doesn't apply.
    // Distinguishing the two cases is *necessary* for the UI to nudge
    // first-time users toward Sign Up instead of giving them the same
    // dead-end "wrong credentials" they'd see for a real password typo.
    return {
      data: null,
      error: { name: 'AuthError', message: 'User not found' },
    };
  }

  const salt = b64ToBytes(account.saltB64);
  const expected = b64ToBytes(account.hashB64);
  const got = await deriveHash(password, salt);
  if (!timingSafeEqual(got, expected)) {
    return {
      data: null,
      error: { name: 'AuthError', message: 'Invalid login credentials' },
    };
  }

  const token = randomToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  writePersistedSession({ userId: account.id, expiresAt, token });
  const session = buildSession(account, token, expiresAt);
  return { data: { session, user: session.user }, error: null };
}

export async function localSignOut(): Promise<void> {
  writePersistedSession(null);
}

/**
 * `true` if at least one account has been created on this device.
 * Used by the auth page to default to "Sign Up" mode for first-time
 * users instead of leaving them on a login form they cannot satisfy.
 */
export function localHasAnyAccount(): boolean {
  return readAccounts().length > 0;
}

/**
 * Restore a session that was persisted across page reloads. Returns null
 * if there is no valid session or the underlying account has been deleted.
 */
export function localGetSession(): Session | null {
  const persisted = readPersistedSession();
  if (!persisted) return null;
  const account = readAccounts().find((a) => a.id === persisted.userId);
  if (!account) {
    writePersistedSession(null);
    return null;
  }
  return buildSession(account, persisted.token, persisted.expiresAt);
}
