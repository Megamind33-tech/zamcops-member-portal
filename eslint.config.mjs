// Flat ESLint config. eslint-config-next 15.x still ships only the legacy
// eslintrc format (whose @rushstack/eslint-patch breaks under ESLint 9), so
// we compose the same essentials directly: the Next.js plugin's
// core-web-vitals rules plus the React hooks rules, parsed with the
// TypeScript parser (all of these ship as dependencies of eslint-config-next).
import { defineConfig } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "*.tsbuildinfo"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  nextPlugin.flatConfig.coreWebVitals,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@typescript-eslint": tsPlugin },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
