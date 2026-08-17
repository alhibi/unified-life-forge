import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function checkAdminRole() {
      try {
        // Query user_roles table for 'admin' role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user!.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (isMounted) {
          if (!error && data) {
            setIsAdmin(true);
          } else {
            // Also check app user metadata if admin flag is set
            const isMetaAdmin = user!.user_metadata?.role === 'admin' || user!.app_metadata?.role === 'admin';
            setIsAdmin(Boolean(isMetaAdmin));
          }
          setIsLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    }

    void checkAdminRole();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  return { isAdmin, isLoading };
}
