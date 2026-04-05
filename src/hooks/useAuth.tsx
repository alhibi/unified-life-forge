import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, bio')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      setUsername(data.username);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setUsername(session.user.user_metadata?.username ?? null);
        fetchProfile(session.user.id);
      } else {
        setUsername(null);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setUsername(session.user.user_metadata?.username ?? null);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const signUp = useCallback(async (username: string, password: string) => {
    const email = `${username.toLowerCase().trim()}@smartapp.local`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const email = `${username.toLowerCase().trim()}@smartapp.local`;
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
