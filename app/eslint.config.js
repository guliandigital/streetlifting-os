import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Files that belong to a tsconfig project (type-aware rules apply).
const SOURCE_FILES = ["src/**/*.{ts,tsx}", "tests/**/*.ts"];

export default [
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      "dist/**",
      "src-tauri/target/**",
      "node_modules/**",
      "coverage/**",
      // Config/build-tool files are NOT in any tsconfig project.
      // Excluding them avoids "parserOptions.project" resolution failures.
      "eslint.config.js",
      "postcss.config.cjs",
      "scripts/**",
      "vite.config.ts",
    ],
  },

  // ── Type-aware rules scoped to source + tests ──────────────────────────────
  // FlatCompat returns legacy-style config objects; add `files` via .map() to
  // limit the type-aware @typescript-eslint rules to files in a tsconfig project.
  ...compat
    .config({
      env: {
        browser: true,
        es2022: true,
        node: true,
      },
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:react-hooks/recommended",
      ],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: __dirname,
      },
      plugins: ["@typescript-eslint", "react-refresh"],
      rules: {
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/consistent-type-imports": [
          "error",
          { prefer: "type-imports", fixStyle: "separate-type-imports" },
        ],
      },
    })
    .map((cfg) => ({ ...cfg, files: SOURCE_FILES })),
];
