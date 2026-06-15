/**
 * اختبارات `isSupabaseReady()`. الدالة بسيطة لكنها مدخل جوهري لـ
 * `withFallback`، فأيّ خطأ هنا يُحوّل سلوك التطبيق كلّه إلى وضع تجريبي
 * عن طريق الخطأ. تستحق اختبارات صريحة تُوثّق متى نعتبر Supabase
 * "جاهزة".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// نُحدّث `import.meta.env` يدوياً قبل كل اختبار بدلاً من إعادة تحميل
// الموديول — لأن vitest يُسرّب نسخة واحدة من import.meta عبر الـ ESM
// graph، ومسحها يلزم vi.resetModules + dynamic import.
type Env = Record<string, string | undefined>;

async function loadIsSupabaseReady(env: Env) {
  vi.resetModules();
  // لا يمكن mock `import.meta.env` بسهولة في jsdom + vitest، فنُغطّيه
  // بـ stub. vitest يدعم `vi.stubEnv` للقيم الموجودة، لكنه يتطلّب
  // `defineConfig.test.env` أو نُحدّث القيم مباشرة.
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) {
      vi.unstubAllEnvs();
    } else {
      vi.stubEnv(k, v);
    }
  }
  // dynamic import بعد الـ stub
  const mod = await import('./env');
  return mod.isSupabaseReady;
}

describe('isSupabaseReady', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns false when both env vars are missing', async () => {
    const isReady = await loadIsSupabaseReady({
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    });
    expect(isReady()).toBe(false);
  });

  it('returns false when only URL is set', async () => {
    const isReady = await loadIsSupabaseReady({
      VITE_SUPABASE_URL: 'https://real.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    });
    expect(isReady()).toBe(false);
  });

  it('returns false when only key is set', async () => {
    const isReady = await loadIsSupabaseReady({
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJ.placeholder.signed',
    });
    expect(isReady()).toBe(false);
  });

  it('returns false when URL contains "placeholder"', async () => {
    // الـ supabase client يُولِّد URL يحوي "placeholder" حين تكون env
    // فارغة — راجع src/integrations/supabase/client.ts. نتعامل مع هذا
    // كحالة "غير مكوَّن" متعمَّد.
    const isReady = await loadIsSupabaseReady({
      VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJ.something',
    });
    expect(isReady()).toBe(false);
  });

  it('returns true when both env vars are set to non-placeholder values', async () => {
    const isReady = await loadIsSupabaseReady({
      VITE_SUPABASE_URL: 'https://abc123.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOi...real',
    });
    expect(isReady()).toBe(true);
  });
});
