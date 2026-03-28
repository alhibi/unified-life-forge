import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setUsername(session.user.user_metadata?.username ?? null);
      } else {
        setUsername(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setUsername(session.user.user_metadata?.username ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      .upsert({ user_id: user.id, settings }, { onConflict: 'user_id' });
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

  return { user, session, loading, username, signUp, signIn, signOut, saveSettings, loadSettings };
}
