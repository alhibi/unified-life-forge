// useBlockedUsers — backs the block-list section of /chat/settings.

import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import * as api from '../api';
import { chatKeys } from '../queryKeys';

export interface UseBlockedUsersResult {
  blocked: Awaited<ReturnType<typeof api.listBlockedUsers>>;
  isLoading: boolean;
  isError: boolean;
}

export function useBlockedUsers(): UseBlockedUsersResult {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: chatKeys.blockedUsers(),
    enabled: !!user?.id && isSupabaseConfigured,
    staleTime: 60_000,
    queryFn: () => api.listBlockedUsers(),
  });
  return {
    blocked:   query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
  };
}
