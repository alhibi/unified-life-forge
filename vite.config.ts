import { mcpPlugin } from '@lovable.dev/mcp-js/stacks/supabase/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig } from 'vite';

import { appShellServiceWorker } from './build/appShellServiceWorker.ts';
import { phosphorPruneWeights } from './build/phosphorPruneWeights.ts';

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    hmr: { overlay: false },
  },
  build: {
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    // The alternate icon libraries are only fetched when the user actually
    // selects one. Preloading them would download ~8 MB on first paint, which
    // is exactly what used to blank the app on mobile.
    modulePreload: {
      resolveDependencies: (_url, deps) => deps.filter((dep) => !dep.includes('icons-alt')),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Match package roots, not any path that happens to contain
            // "react/" — `@phosphor-icons/react/...` used to land here and
            // dragged whole icon libraries into the entry chunk.
            if (
              /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
            ) {
              return 'vendor';
            }
            if (
              id.includes('lucide-react') ||
              id.includes('@tabler/icons-react') ||
              id.includes('hugeicons-react')
            ) {
              // One chunk per alternate icon library, loaded on demand.
              return 'icons-alt';
            }
            if (id.includes('framer-motion')) {
              return 'motion';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase';
            }
            if (id.includes('@phosphor-icons/react')) {
              return 'icons';
            }
            if (id.includes('@radix-ui')) {
              return 'ui';
            }
          }
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    mcpPlugin(),
    phosphorPruneWeights(),
    appShellServiceWorker(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
}));
