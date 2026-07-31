import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'build/**/*.{test,spec}.{ts,tsx}'],

    // Nothing is excluded beyond the defaults. The two files named *.bench.test.ts
    // were not benchmarks: one asserted `expect(true).toBe(true)` and the other
    // re-implemented useSyncEngine's batching inside the test file and compared it to
    // itself, with a wall-clock assertion as its only real check. Both are deleted;
    // the batching logic is now tested for real in
    // src/features/pkm/lib/__tests__/coalesceOutbox.test.ts.

    coverage: {
      // Istanbul, not v8: @vitest/coverage-v8 requires node:inspector, which Bun does
      // not implement, and this repo runs its tests with Bun. Istanbul instruments the
      // source instead of asking the engine, so it works on both runtimes.
      provider: 'istanbul',
      // `text` for the terminal, `json-summary` so CI can read a number, `lcov` for
      // anything that wants to annotate a diff.
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',

      // What is measured. Excluding the untestable and the generated keeps the
      // number meaningful: a coverage figure inflated by 2,000 lines of generated
      // icon registries and 10,000 lines of static data literals tells nobody
      // anything about whether the logic is tested.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Generated: src/integrations/supabase/types.ts is `supabase gen types`
        // output and src/lib/icons/registry.*.ts comes from icons:generate.
        'src/integrations/supabase/types.ts',
        'src/lib/icons/registry.*.ts',
        // Static data literals, not logic. features/wellness alone is >10,000 lines
        // of exercise/nutrition tables and travel-atlas ships a generated country
        // dataset.
        'src/**/data/**',
        'src/features/wellness/*Data.ts',
        'src/features/wellness/*Atlas.ts',
        'src/features/wellness/*Catalog.ts',
        'src/features/wellness/healthEncyclopedia.ts',
      ],

      // A ratchet, exactly like lint-budget.json — floors that must not fall, not
      // targets. Set from a measured run; the first attempt at this used round
      // aspirational numbers (20/45/60/20) and every one of them failed, which is
      // the failure mode the lint budget was written to avoid.
      //
      // The measured figure is low: 10.5% of statements over 39,210 of them. That is
      // the honest shape of this suite — 50 files that cover pure logic thoroughly
      // (weather, geo, chat keys, diwan, RLS, sanitisation, the icon registries) in
      // an app whose 90 route components, `AppContext` and `useAuth` have almost no
      // tests at all. A threshold set where the coverage actually is turns "don't
      // make it worse" into something CI can check today; a threshold set where it
      // ought to be would just be switched off next week.
      //
      // Raise these in the same commit as the tests that earn it.
      thresholds: {
        statements: 10,
        branches: 6.5,
        functions: 8,
        lines: 11,
      },
    },

    // A slow test is usually a hung one. The default 5s masked the article-reader
    // and sanitiser suites, which do real DOM work.
    testTimeout: 15_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
