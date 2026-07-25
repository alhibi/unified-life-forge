// useUserSearch — debounced username search used by:
//   • New-chat sheet ("Find someone to message")
//   • Group creator (member picker)
//   • Add-member sheet inside an existing group

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { isSupabaseConfigured } from '@/integrations/supabase/client';

import * as api from '../api';
import { chatKeys } from '../queryKeys';

export interface UserSearchResult {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface UseUserSearchResult {
  results: UserSearchResult[];
  isLoading: boolean;
  isError: boolean;
}

const DEBOUNCE_MS = 220;

export function useUserSearch(query: string, enabled = true): UseUserSearchResult {
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const q = useQuery({
    queryKey: chatKeys.searchUsers(debounced),
    enabled: enabled && debounced.length >= 2 && isSupabaseConfigured,
    staleTime: 60_000,
    queryFn: () => api.searchUsers(debounced),
  });

  return {
    results:   q.data ?? [],
    isLoading: q.isLoading || (query.trim().length >= 2 && debounced !== query.trim()),
    isError:   q.isError,
  };
}
