# ESLint Config Workspace Package Design

## Context

The repository currently stores reusable ESLint rules in `config/eslint/base.ts`. Although the
file is consumed only by the root `eslint.config.ts`, its responsibility is cross-package policy:
it owns the approved JavaScript, TypeScript, Unicorn, and Import rules and the helper that rewrites
plugin aliases.

Keeping that policy in a root-only path hides the intended package boundary and makes future
workspace consumers depend on a repository-relative implementation file.

## Decision

Create a private workspace package named `@kunlun/eslint-config` at
`packages/eslint-config`. The package owns the reusable base configuration, while the root
`eslint.config.ts` remains the repository-specific composition entry.

The root config will consume the package through the workspace protocol:

```json
{
  "devDependencies": {
    "@kunlun/eslint-config": "workspace:*"
  }
}
```

It will import from the package name rather than a relative filesystem path.

## Package Boundary

`@kunlun/eslint-config` owns:

- the user-approved base rules without weakening or renaming them;
- plugin implementations for `@typescript-eslint`, `import`, and `unicorn`;
- `createBaseRulesConfig`, including plugin alias and rule-ID rewriting;
- the default `@eslint/js` and `typescript-eslint` recommended flat-config composition;
- its own package manifest and strict TypeScript configuration.

The root `eslint.config.ts` continues to own:

- repository ignore paths;
- type-aware strict and stylistic TypeScript rules;
- Vue flat recommended configuration and `vue-eslint-parser`;
- `projectService`, `tsconfigRootDir`, and repository project globs;
- the TypeScript import resolver settings;
- repository-specific Vue overrides.

This keeps the shared package independent of the Personal Lab directory layout and Vue app
structure.

## Exports and Dependencies

The package exposes one root entry with these stable exports:

- default: approved base flat-config array;
- `baseRules`;
- `createBaseRulesConfig`;
- `js`;
- `tseslint`.

Runtime plugin implementations move from the root manifest into the package's exact-version
dependencies: `@eslint/js`, `eslint-plugin-import`, `eslint-plugin-unicorn`, and
`typescript-eslint`. ESLint remains the root command-line dependency and is declared by the config
package as a peer dependency for its public types and runtime contract.

All external versions remain exact. The root manifest removes dependencies that it no longer
imports directly.

## Migration

1. Add a repository test that imports `@kunlun/eslint-config` through the workspace package name
   and exercises a real base rule plus plugin alias rewriting.
2. Observe the test fail while the package is absent.
3. Create `packages/eslint-config`, move the existing base implementation into its entry, and add
   its package and TypeScript configuration.
4. Update the root manifest, lockfile, TypeScript project references or includes as needed, and the
   root ESLint import.
5. Remove `config/eslint/base.ts` and the empty `config/eslint` path.
6. Update the V1 implementation plan's planned file map and Task 1 file references so the approved
   architecture is not documented incorrectly.

The rule settings and linted file behavior must remain unchanged.

## Verification

The migration is complete only when:

- the package-boundary test passes through `@kunlun/eslint-config`;
- the old root-relative base module no longer exists or has consumers;
- `pnpm install --frozen-lockfile` accepts the updated workspace lockfile;
- version and text policies pass;
- Prettier reports no differences;
- ESLint passes with `--max-warnings 0`;
- strict TypeScript checks pass for the root and all workspace packages;
- the full test suite and Nuxt production build pass.

## Non-goals

- Publishing the package to npm.
- Moving Vue-specific rules into the shared base package.
- Creating separate presets for React, Node.js, or other unused environments.
- Changing, relaxing, or expanding the user-approved base rule set.
- Adding per-package ESLint entry files before a real consumer needs them.
