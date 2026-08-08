/**
 * Public-key directory.
 *
 * One active public key per account, stored in `chat_public_keys`. The private
 * half never leaves the device that generated it (see keys.ts), so the row is
 * only ever a lookup for "how do I encrypt to this person".
 *
 * MULTI-DEVICE, stated honestly. Because the private key is non-extractable,
 * two devices signed into the same account hold two different identities, and
 * only one of them can be the account's published key. The rule implemented here
 * is: the device you are actively using publishes its key if the directory does
 * not already hold that key. The consequence — messages that arrived while
 * another device was the key holder are not readable on this one — is surfaced in
 * the UI rather than hidden. Fixing it properly requires per-device fan-out
 * (encrypting each message once per recipient device), which needs a
 * message-key table and is the next step, not a silent pretence.
 */
import { isSupabaseConfigured, supabase as typedClient } from '@/integrations/supabase/client';

const TABLE = 'chat_public_keys';

const supabase = typedClient;

export interface DirectoryEntry {
  userId: string;
  publicKeyRaw: string;
  updatedAt: string;
}

/** Cache peer lookups for the session; keys change rarely. */
const peerCache = new Map<string, DirectoryEntry | null>();
let selfPublished: string | null = null;

/** True when the directory table is reachable. */
let directoryAvailable: boolean | null = null;

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    (error.message ?? '').includes('schema cache') ||
    (error.message ?? '').includes('supabase_not_configured')
  );
}

/**
 * Publish this device's public key as the account's active key, unless the
 * directory already holds exactly this key.
 * Returns true when the directory now holds this device's key.
 */
export async function publishPublicKey(userId: string, publicKeyRaw: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  if (selfPublished === publicKeyRaw) return true;

  const existing = await fetchPublicKey(userId, { bypassCache: true });
  if (existing?.publicKeyRaw === publicKeyRaw) {
    selfPublished = publicKeyRaw;
    return true;
  }

  const { error } = (await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, public_key: publicKeyRaw, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )) as { error: { code?: string; message?: string } | null };

  if (error) {
    if (isMissingTable(error)) directoryAvailable = false;
    return false;
  }

  directoryAvailable = true;
  selfPublished = publicKeyRaw;
  peerCache.set(userId, { userId, publicKeyRaw, updatedAt: new Date().toISOString() });
  return true;
}

export async function fetchPublicKey(
  userId: string,
  opts: { bypassCache?: boolean } = {},
): Promise<DirectoryEntry | null> {
  if (!isSupabaseConfigured) return null;
  if (!opts.bypassCache && peerCache.has(userId)) return peerCache.get(userId) ?? null;

  const { data, error } = (await supabase
    .from(TABLE)
    .select('user_id, public_key, updated_at')
    .eq('user_id', userId)
    .maybeSingle()) as {
    data: { user_id: string; public_key: string; updated_at: string } | null;
    error: { code?: string; message?: string } | null;
  };

  if (error) {
    if (isMissingTable(error)) directoryAvailable = false;
    // Do NOT cache a transient failure as "no key" — that would disable
    // encryption for the rest of the session after one flaky request.
    return null;
  }

  directoryAvailable = true;
  const entry: DirectoryEntry | null = data
    ? { userId: data.user_id, publicKeyRaw: data.public_key, updatedAt: data.updated_at }
    : null;
  peerCache.set(userId, entry);
  return entry;
}

/** null = not yet determined. */
export function isDirectoryAvailable(): boolean | null {
  return directoryAvailable;
}

/** Forget cached peer keys — call after a sign-out. */
export function resetDirectoryCache(): void {
  peerCache.clear();
  selfPublished = null;
  directoryAvailable = null;
}
