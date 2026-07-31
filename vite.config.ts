import { mcpPlugin } from '@lovable.dev/mcp-js/stacks/supabase/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

import { appShellServiceWorker } from './build/appShellServiceWorker';
import { phosphorPruneWeights } from './build/phosphorPruneWeights';

// Sentry source-map upload runs only when CI supplies all three values. Without
// them the build is unchanged, so a local `bun run build` needs no Sentry account.
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;
const uploadSourcemaps = Boolean(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT);

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    hmr: { overlay: false },
  },
  build: {
    // `'hidden'` emits full source maps but writes no `//# sourceMappingURL`
    // comment into the bundles.
    //
    // This was `false`, which meant Sentry was effectively write-only: every
    // stack frame it received pointed into minified `index-a1b2c3.js` at column
    // 48219, so the drain that lib/telemetry.ts was built to feed produced
    // reports nobody could act on. Maps are what make a stack an address.
    //
    // "hidden" rather than "true" because the comment is what makes devtools —
    // and anyone poking at the deployed site — fetch the map. Sentry does not
    // need the comment: it matches maps by debug id at upload time.
    //
    // The `.map` files still land in `dist/`. Two things keep them from being
    // served: `sourcemapsUploadOptions.filesToDeleteAfterUpload` removes them
    // once CI has uploaded them, and nginx.conf denies `.map` outright as the
    // backstop for builds where the upload did not run.
    sourcemap: 'hidden',
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          // The icon barrel (src/lib/icons.tsx) re-exports ~210 Phosphor
          // glyphs. Because nearly every route imports at least one icon,
          // Rollup hoisted the whole set into the ENTRY chunk: 671 kB of the
          // 802 kB entry was icon path data, so the app shell could not start
          // executing until all of it had been parsed.
          //
          // Keeping it in its own chunk lets the browser fetch it in parallel
          // with the shell and keep it cached across deploys. The byte count
          // itself is handled by phosphorPruneWeights() below, which drops the
          // three weights the app never renders.
          icons: ['@phosphor-icons/react'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    // The Lovable MCP plugin generates supabase/functions/mcp/index.ts and is a
    // development tool, but it ran in every mode — including production builds,
    // where it has nothing to contribute.
    mode === 'development' && mcpPlugin(),
    phosphorPruneWeights(),
    appShellServiceWorker(),
    mode === 'development' && componentTagger(),
    // `ANALYZE=1 bun run build` writes dist/stats.html.
    //
    // There was no way to see inside a chunk before this, which is how a 11 MB
    // entry chunk shipped: the build printed the number every time and nothing
    // could answer "made of what?".
    process.env.ANALYZE &&
      visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
    // Must come last: it reads the emitted bundles and their maps.
    uploadSourcemaps &&
      sentryVitePlugin({
        authToken: SENTRY_AUTH_TOKEN,
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
        release: { name: process.env.VITE_APP_VERSION },
        sourcemaps: {
          // Delete the maps from dist/ once they are safely in Sentry, so the
          // deployed artefact never contains them at all.
          filesToDeleteAfterUpload: ['dist/**/*.map'],
        },
        // The plugin otherwise prints a banner on every build.
        telemetry: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      // Centralized path alias configuration: maps '@/*' directly to './src/*'
      // to avoid deeply nested relative imports (../../../) throughout the codebase.
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
}));
