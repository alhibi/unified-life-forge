import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.getSession }, from: mocks.from } }));
import * as api from './api';
beforeEach(() => { vi.clearAllMocks(); mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'b' } } }, error: null }); });
it('rejects an account-bound read when the session changed', async () => {
  await expect(api.listFeeds('a')).rejects.toThrow('account changed');
  expect(mocks.from).not.toHaveBeenCalled();
});
