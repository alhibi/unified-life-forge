// @vitest-environment jsdom
import { beforeAll,describe, expect, test, vi } from 'vitest';

// Must mock supabase BEFORE api import due to top-level evaluation
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test_user_123' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: new Error('no table') }),
        }),
      }),
    },
  };
});

import { buildLearningSession } from '../../api';

describe('German Learning Session Builder', () => {
  beforeAll(() => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
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
