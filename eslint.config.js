import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
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
      "prettier": prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Tightened rules to enforce "errors" (not warnings)

      // Enforce no explicit 'any'
      "@typescript-eslint/no-explicit-any": "error",

      // Unused variables and imports as errors
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
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

      // Consistent import/export ordering
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Prettier formatting as error
      "prettier/prettier": "error",
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
