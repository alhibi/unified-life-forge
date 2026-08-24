import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAdmin } from '../useAdmin';

// Mock useAuth
const mockUser = {
  id: 'admin-user-id-123',
  user_metadata: {},
  app_metadata: {},
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      }),
    }),
  },
}));

describe('useAdmin Hook', () => {
  it('identifies admin user correctly from user_roles table', async () => {
    const { result } = renderHook(() => useAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
  });
});
