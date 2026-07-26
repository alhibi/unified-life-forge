// Single source of truth for the current Supabase user / session / profile.
//
// Before this refactor every call to `useAuth()` (10 sites: App, Chat,
// Index, Settings, ProfileEdit, useChat, useUnreadMessages,
// the Diwan library pages, plus AppContext's own internal copy) created
// an independent React state and an independent
// `supabase.auth.onAuthStateChange` subscription. Each subscription
// triggered its own `profiles` fetch on every state change. AppContext
// even ran a second, separate subscription specifically to know when to
// reset preferences on sign-out.
//
// All of that collapses here into:
//
//   • One module-level subscription, started lazily on first usage.
//   • One in-flight `profiles` fetch (with stale-response guard).
//   • A listener set so every hook consumer reflects the same value.
//   • Module-level action functions (signUp / signIn / signOut / …) that
//     read the current user from the shared state instead of capturing
//     it in a per-component closure.
//
// The exported `useAuth()` API is deliberately unchanged so existing
// call sites do not need any edits.

import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { localGetSession, localSignIn, localSignOut, localSignUp } from '@/lib/auth/localAuthStore';

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

// Username constraints. The app uses `<username>@smartapp.local` as a synthetic
// email so Supabase's email/password auth flow can be reused — that means
// usernames MUST always produce a valid email local-part. We constrain to a
// safe charset (letters, digits, underscore) and a sane length.
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;
const USERNAME_DOMAIN = 'smartapp.local';

function validateUsername(raw: string): string | null {
  const u = raw.trim();
  if (!u) return 'Username required';
  if (!USERNAME_REGEX.test(u)) {
    return 'Username must be 3–24 chars (letters, digits, underscore only)';
  }
  return null;
}

function usernameToEmail(raw: string): string {
  return `${raw.toLowerCase().trim()}@${USERNAME_DOMAIN}`;
}

// ── Singleton state ──────────────────────────────────────────────────────
interface AuthSnapshot {
  user: User | null;
  session: Session | null;
  loading: boolean;
  username: string | null;
  profile: Profile | null;
}

type Listener = (snapshot: AuthSnapshot) => void;

let currentUser: User | null = null;
let currentSession: Session | null = null;
let currentLoading = true;
let currentUsername: string | null = null;
let currentProfile: Profile | null = null;
let bootstrapped = false;

// Monotonic counter so a slow `profiles` fetch from a stale session can't
// stomp the values from a newer sign-in/sign-out.
let activeRequestId = 0;
const listeners = new Set<Listener>();

function snapshot(): AuthSnapshot {
  return {
    user: currentUser,
    session: currentSession,
    loading: currentLoading,
    username: currentUsername,
    profile: currentProfile,
  };
}

function emit() {
  const snap = snapshot();
  for (const l of listeners) l(snap);
}

async function applySession(nextSession: Session | null): Promise<void> {
  const requestId = ++activeRequestId;

  currentSession = nextSession;
  currentUser = nextSession?.user ?? null;

  if (!nextSession?.user) {
    currentUsername = null;
    currentProfile = null;
    emit();
    return;
  }

  // Optimistic username from JWT metadata so the UI doesn't blank out
  // while we wait for the profiles fetch.
  currentUsername = nextSession.user.user_metadata?.username ?? null;
  emit();

  // In local-only mode there is no `profiles` table — the user_metadata
  // username is the canonical source.
  if (!isSupabaseConfigured) {
    const username = nextSession.user.user_metadata?.username ?? null;
    currentProfile = username
      ? { username, display_name: username, avatar_url: null, bio: null }
      : null;
    currentUsername = username;
    emit();
    return;
  }

  const { data } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, bio')
    .eq('user_id', nextSession.user.id)
    .maybeSingle();

  // Drop the result if a newer sign-in/sign-out already raced past us.
  if (activeRequestId !== requestId) return;

  if (data) {
    currentProfile = data as Profile;
    currentUsername = data.username;
  } else {
    currentProfile = null;
  }
  emit();
}

async function syncAuthState(nextSession: Session | null): Promise<void> {
  currentLoading = true;
  emit();
  await applySession(nextSession);
  currentLoading = false;
  emit();
}

function bootstrap(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  // Local-only mode: no Supabase, no realtime auth changes — just rehydrate
  // the persisted session (if any) and we're done. Sign-in/out propagate
  // through `syncAuthState` directly from our local helpers below.
  if (!isSupabaseConfigured) {
    const session = localGetSession();
    void syncAuthState(session);
    return;
  }

  // The subscription stays alive for the lifetime of the page — there's
  // no point unsubscribing when the last hook consumer unmounts because
  // (a) the next consumer would re-bootstrap immediately, and (b) auth
  // changes need to propagate even when no React tree is currently
  // rendering this hook (e.g. background timers in AppContext).
  supabase.auth.onAuthStateChange((event, nextSession) => {
    if ((event as string) === 'TOKEN_REFRESH_FAILED') {
      window.dispatchEvent(new CustomEvent('auth-session-expired'));
    }
    void syncAuthState(nextSession);
  });

  void supabase.auth.getSession().then(({ data: { session } }) => {
    void syncAuthState(session);
  });
}

// ── Module-level actions ─────────────────────────────────────────────────
// These mirror what used to be `useCallback`-wrapped methods. Splitting
// them out of the hook means callers don't have to capture them in
// dependency arrays and they stay referentially stable forever.

async function refreshProfile(): Promise<void> {
  if (!currentUser || !currentSession) return;
  currentLoading = true;
  emit();
  await applySession(currentSession);
  currentLoading = false;
  emit();
}

async function signUp(username: string, password: string) {
  const validation = validateUsername(username);
  if (validation) {
    return {
      data: null,
      error: { name: 'ValidationError', message: validation } as Error,
    };
  }
  if (!isSupabaseConfigured) {
    const result = await localSignUp(username, password);
    if (result.error) {
      return { data: null, error: result.error as Error };
    }
    // Push the freshly-minted local session through the same pipeline
    // Supabase would have used so listeners update in lock-step.
    void syncAuthState(result.data?.session ?? null);
    return { data: result.data, error: null };
  }
  const email = usernameToEmail(username);
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.trim() } },
  });
}

async function signIn(username: string, password: string) {
  const validation = validateUsername(username);
  if (validation) {
    return {
      data: null,
      error: { name: 'ValidationError', message: validation } as Error,
    };
  }
  if (!isSupabaseConfigured) {
    const result = await localSignIn(username, password);
    if (result.error) {
      return { data: null, error: result.error as Error };
    }
    void syncAuthState(result.data?.session ?? null);
    return { data: result.data, error: null };
  }
  const email = usernameToEmail(username);
  return supabase.auth.signInWithPassword({ email, password });
}

async function signOut(): Promise<void> {
  // Purge any sensitive user draft, cached states or profile details before signing out
  if (currentUser) {
    const userId = currentUser.id;
    try {
      localStorage.removeItem(`profile:draft:${userId}`);
    } catch (e) {
      console.warn('Failed to remove profile draft during signout:', e);
    }
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('profile:draft:') ||
          key.startsWith('chat:draft:') ||
          key.startsWith('pkm:draft:'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Failed to clear cached drafts during signout:', e);
  }

  // The travel atlas mirrors the signed-in user's places, trips and country
  // stamps into IndexedDB so the map works on a plane. That store is NOT
  // user-scoped, so without this the next person to use the device — or the
  // same person signed out — would be served the previous account's saved
  // places from the cache. Every other local purge above is a localStorage
  // key; this is the only IndexedDB one, and it is the only cache in the app
  // holding another account's content.
  //
  // Imported dynamically on purpose: a global auth hook must not pull Dexie
  // and a feature's data layer into its chunk for every visitor.
  try {
    const { clearAtlasCache } = await import('@/features/travel-atlas/offlineCache');
    await clearAtlasCache();
  } catch (e) {
    // Never block sign-out on a cache that refuses to open.
    console.warn('Failed to clear the travel atlas cache during signout:', e);
  }

  if (!isSupabaseConfigured) {
    await localSignOut();
    void syncAuthState(null);
    return;
  }
  await supabase.auth.signOut();
}

async function saveSettings(settings: Record<string, unknown>) {
  if (!currentUser) return;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: currentUser.id, settings: settings as any }, { onConflict: 'user_id' });
  return error;
}

async function loadSettings(): Promise<Record<string, unknown> | null> {
  if (!currentUser) return null;
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) return null;
  return (data?.settings as Record<string, unknown> | null) ?? null;
}

/**
 * Imperative read of the current auth state. Useful for non-React code
 * paths (e.g. event handlers in legacy modules). React components should
 * always prefer `useAuth()` so they re-render on changes.
 */
export function getCurrentAuthSnapshot(): AuthSnapshot {
  bootstrap();
  return snapshot();
}

// ── React hook ───────────────────────────────────────────────────────────
export interface UseAuthResult extends AuthSnapshot {
  refreshProfile: typeof refreshProfile;
  signUp: typeof signUp;
  signIn: typeof signIn;
  signOut: typeof signOut;
  saveSettings: typeof saveSettings;
  loadSettings: typeof loadSettings;
}

export function useAuth(): UseAuthResult {
  // Bootstrap synchronously inside the initializer so the first render
  // already has any state the singleton has accumulated.
  const [snap, setSnap] = useState<AuthSnapshot>(() => {
    bootstrap();
    return snapshot();
  });

  useEffect(() => {
    const listener: Listener = (next) => setSnap(next);
    listeners.add(listener);
    // Catch any updates that landed between render and effect commit.
    setSnap(snapshot());
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...snap,
    refreshProfile,
    signUp,
    signIn,
    signOut,
    saveSettings,
    loadSettings,
  };
}
