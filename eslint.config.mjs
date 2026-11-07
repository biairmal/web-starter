import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import prettier from "eslint-config-prettier";

const rootDir = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({ baseDirectory: rootDir });

// Features may not import each other (TRD 3, FE rule in IMPLEMENTATION_PLAN 0).
// One zone per feature folder that exists at lint time, so a new feature is
// covered without editing this file.
const featuresDir = join(rootDir, "src", "features");
const featureNames = existsSync(featuresDir)
  ? readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

const featureZones = featureNames.map((name) => ({
  target: `./src/features/${name}`,
  from: "./src/features",
  except: [`./${name}`],
}));

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx,mts,cts}"],
  })),
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
      react,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // All user-facing text goes through next-intl (FE F2.1). Checks JSX text
      // only; attribute strings such as className are not text.
      "react/jsx-no-literals": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
        node: true,
      },
    },
    // import/no-restricted-paths needs at least one zone, so the rule is only
    // switched on once a feature folder exists (the first one is F2.3).
    rules: {
      ...(featureZones.length > 0
        ? {
            "import/no-restricted-paths": [
              "error",
              { zones: featureZones, basePath: rootDir },
            ],
          }
        : {}),
      "import/no-default-export": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    // Next.js requires default exports for these files only.
    files: [
      "**/page.tsx",
      "**/layout.tsx",
      "**/route.ts",
      "**/middleware.ts",
      "**/loading.tsx",
      "**/error.tsx",
      "**/not-found.tsx",
      "**/global-error.tsx",
      "**/template.tsx",
      "**/default.tsx",
      "**/forbidden/**/*.tsx",
      "next.config.ts",
      "vitest.config.ts",
      "postcss.config.mjs",
      "eslint.config.mjs",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
  {
    // shadcn/ui primitives are copied source (components.json). Their built-in
    // labels, such as the dialog "Close" text, are overridden through props in
    // F2.4 rather than rewritten here.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": "off",
    },
  },
  // Turns off stylistic rules that clash with Prettier. Keep last.
  prettier,
];

export default eslintConfig;
