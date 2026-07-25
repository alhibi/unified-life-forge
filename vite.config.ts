import { mcpPlugin } from '@lovable.dev/mcp-js/stacks/supabase/vite';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig } from 'vite';

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
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          // The icon barrel (src/lib/icons.tsx) re-exports ~210 Phosphor
          // glyphs, and every Phosphor glyph def ships all six weights.
          // Because nearly every route imports at least one icon, Rollup
          // hoisted the whole set into the ENTRY chunk: 671 kB of the
          // 802 kB entry was icon path data, so the app shell could not
          // start executing until all of it had been parsed.
          //
          // Splitting it out does not reduce total bytes, but it does:
          //   • let the browser download it in parallel with the shell,
          //   • shrink the entry chunk to the code that actually boots,
          //   • and keep it in cache across deploys (it changes rarely).
          // The deeper fix is to stop shipping five unused weights per
          // glyph — tracked separately.
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
  plugins: [react(), mcpPlugin(), mode === 'development' && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      // Centralized path alias configuration: maps '@/*' directly to './src/*'
      // to avoid deeply nested relative imports (../../../) throughout the codebase.
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
}));
