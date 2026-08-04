// @vitest-environment jsdom
import { beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'test_user_123' } } }),
        getSession: async () => ({ data: { session: null } }),
      },
      from: () => ({
        select: () => ({
          limit: async () => ({ error: new Error('no table'), data: null }),
        }),
      }),
    },
  };
});

import { buildLearningSession } from '../../api';

describe('German Learning Session Builder', () => {
  beforeAll(() => {
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
  });

  test('successfully builds an interleaved learning session', async () => {
    const session = await buildLearningSession(5);

    expect(session.session_id).toBeDefined();
    expect(session.items).toBeInstanceOf(Array);
    expect(session.items.length).toBeGreaterThanOrEqual(1);

    // Verify properties of picked items
    const item = session.items[0];
    expect(item.exercise_id).toBeDefined();
    expect(item.type).toBeDefined();
    expect(item.payload).toBeDefined();
  });
});
