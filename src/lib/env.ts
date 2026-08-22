/**
 * Typed access to Vite env vars.
 *
 * tsconfig.app.json pulls vitest/node types but not `vite/client`, so
 * `import.meta.env` is untyped project-wide — which is why features resorted
 * to `(import.meta as any).env`. This module owns the declaration once.
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
  }

   
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export function getEnv(): ImportMetaEnv {
  return import.meta.env;
}
