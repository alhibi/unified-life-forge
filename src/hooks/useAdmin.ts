import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';

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
            // Only the server-side role table grants admin; user metadata is
            // editable by the user and must never be trusted.
            setIsAdmin(false);
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
