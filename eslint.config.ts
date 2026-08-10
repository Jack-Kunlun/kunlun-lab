import type { Linter } from "eslint";
import { defineConfig } from "eslint/config";
import eslintPluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import approvedBaseConfig, {
  baseRules,
  createBaseRulesConfig,
  tseslint,
} from "./config/eslint/base.ts";

const ignoredPaths = [
  "**/.nuxt/**",
  "**/.output/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
  "**/playwright-report/**",
  "**/test-results/**",
  "**/*.d.ts",
  "**/*.min.js",
];

const typeAwareRules: Linter.RulesRecord = {
  "@typescript-eslint/ban-ts-comment": [
    "error",
    {
      "ts-check": false,
      "ts-expect-error": "allow-with-description",
      "ts-ignore": true,
      "ts-nocheck": true,
      minimumDescriptionLength: 10,
    },
  ],
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/switch-exhaustiveness-check": "error",
};

export default defineConfig(
  { ignores: ignoredPaths },
  ...approvedBaseConfig,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...eslintPluginVue.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx,vue}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/**/tsconfig.json"],
        },
      },
    },
    rules: typeAwareRules,
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        extraFileExtensions: [".vue"],
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  createBaseRulesConfig({
    ruleOverrides: {
      ...baseRules,
      ...typeAwareRules,
    },
  }),
);
