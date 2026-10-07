import react from "@vitejs/plugin-react-swc";
import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "build/**/*.{test,spec}.{ts,tsx}"],
    // The route-smoke net mounts all ~81 routes in one process and, under the
    // current jsdom/act environment, a multi-mount run can enter a render
    // cascade that never settles: React's own "Maximum update depth exceeded"
    // was thrown out of @tanstack/react-virtual's measureElement for one
    // route, and an unbroken AnimatedRoutes re-render cascade was CPU-
    // profiled for another. Until that test-environment issue is fixed, the
    // net is driven by its dedicated process-per-shard runner instead of
    // `bun run test`:
    //   bun run test:smoke  ·  SMOKE_SHARD=3/12 bun run test:smoke
    exclude: [...configDefaults.exclude, "src/test/routes.smoke.test.tsx"],
    // On Node 22+ the runtime ships a process-wide `localStorage` backed by a
    // single on-disk store, and it is installed as a global. Concurrent test
    // FILES therefore reach the same store: one file's still-pending async work
    // reads or clears a key another file just wrote.
    // Symptom: `localAuthStore` "cap active sessions" reads `null` and
    // `reading/storage` sees a fixture feed it had already removed. Both pass
    // in isolation and in 5 repeated solo runs; both fail in a full run, in
    // either file order. Neither `isolate: true` nor `pool: "forks"` was
    // enough — only a real per-file process boundary stopped it.
    //
    // Cost: 1736 specs run in ~47s instead of ~10s. Kept as a config default
    // rather than a CLI flag so `bun run verify` is green for everyone and in
    // CI, instead of passing locally and failing on a full run.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
