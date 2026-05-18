import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const requestRef = useRef(0);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const requestId = ++requestRef.current;

    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setUsername(null);
      setProfile(null);
      return;
    }

    setUsername(nextSession.user.user_metadata?.username ?? null);

    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, bio')
      .eq('user_id', nextSession.user.id)
      .maybeSingle();

    if (requestRef.current !== requestId) return;

    if (data) {
      setProfile(data as Profile);
      setUsername(data.username);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (nextSession: Session | null) => {
      if (!mounted) return;
      setLoading(true);
      await applySession(nextSession);
      if (mounted) {
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void syncAuthState(currentSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    if (!user || !session) return;
    setLoading(true);
    await applySession(session);
    setLoading(false);
  }, [applySession, session, user]);

  const signUp = useCallback(async (username: string, password: string) => {
    const validation = validateUsername(username);
    if (validation) return { data: null, error: { name: 'ValidationError', message: validation } as Error };
    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const validation = validateUsername(username);
    if (validation) return { data: null, error: { name: 'ValidationError', message: validation } as Error };
    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const saveSettings = useCallback(async (settings: Record<string, unknown>) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, settings: settings as any }, { onConflict: 'user_id' });
    return error;
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return null;
    return data?.settings as Record<string, unknown> | null;
  }, [user]);

  return { user, session, loading, username, profile, refreshProfile, signUp, signIn, signOut, saveSettings, loadSettings };
}
