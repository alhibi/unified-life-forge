// ─────────────────────────────────────────────────────────────────────────
// ESLint reports CORRECTNESS problems. Prettier owns FORMATTING.
//
// Running formatting through `eslint-plugin-prettier` made `bun run lint`
// print 22,098 quote-style complaints on top of ~1,800 real findings, so the
// gate was unusable and every genuine bug hid in the noise. Formatting is now
// checked separately with `bun run format:check` (and fixed with
// `bun run format`), which is also an order of magnitude faster.
// ─────────────────────────────────────────────────────────────────────────
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "scripts/codemod-*.mjs"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Tightened rules to enforce "errors" (not warnings)

      // Enforce no explicit 'any'
      "@typescript-eslint/no-explicit-any": "error",

      // Unused variables and imports as errors.
      // `@typescript-eslint/no-unused-vars` is OFF on purpose: it and
      // `unused-imports/no-unused-vars` detect the same thing, so every
      // finding was reported twice (516 duplicated messages).
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // Consistent import/export ordering. Warn (not error) because
      // reordering side-effect imports can change CSS cascade order, so it
      // must never be auto-fixed blindly in a pre-commit hook.
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
    },
  },
  // Ensure prettier config disables formatting conflicts
  eslintConfigPrettier,
  // Node globals for build / config / supabase edge function files.
  {
    files: [
      "*.config.{js,ts,cjs,mjs}",
      "playwright-fixture.ts",
      "supabase/functions/**/*.ts",
    ],
    languageOptions: {
      globals: { ...globals.node, Deno: "readonly" },
    },
  },
);
