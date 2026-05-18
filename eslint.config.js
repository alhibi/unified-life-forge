import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Re-enabled as a warning (not error) so stale imports / dead vars
      // surface in PRs without breaking builds. Underscore-prefixed args/
      // vars are still allowed as an explicit "intentionally unused"
      // marker (e.g. `(_event, payload) => ...`).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
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
