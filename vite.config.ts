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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
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
