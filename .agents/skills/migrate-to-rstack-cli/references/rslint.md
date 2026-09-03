# Rslint migration

Read this reference when the project uses `@rslint/core`, `rslint.config.*`, `rslint` commands, or Rslint config imports.

## Steps

1. Replace the `rslint` executable prefix with `rs lint`. For example, replace `rslint --fix` with `rs lint --fix`.
2. Move the old config into `define.lint`, replacing Rslint's `defineConfig()` wrapper and import. Receive `@rslint/core` exports from the factory parameter.
3. If the old config imports the `globals` package for environment maps such as `globals.browser`, receive `globals` from the factory parameter instead. Remove the direct `globals` dependency after confirming that no other file uses it.
4. Replace custom `--config` paths with the migrated `rstack.config.*` path.
5. Remove `@rslint/core` only when no uncovered direct runtime API remains. Delete `rslint.config.*`.
6. If tracked VS Code configuration recommends `rstack.rslint`, replace it with the unified `rstack.rstack` extension. Move relevant `rslint.*` settings to their current `rstack.rslint.*` equivalents according to the [Rstack extension documentation](https://github.com/rstackjs/rstack-editor/blob/main/packages/vscode/README.md). Keep `source.fixAll.rslint` unchanged.

## Config pattern

```ts
import { define } from 'rstack';

define.lint(({ js, ts }) => [
  js.configs.recommended,
  ts.configs.recommendedTypeChecked,
]);
```

Preserve existing presets and rules during migration.

The factory also provides Rslint's built-in globals catalog, so an external `globals` import is unnecessary:

```ts
define.lint(({ globals }) => [
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
]);
```

## Script pattern

For example:

```json
{
  "scripts": {
    "check": "rs check",
    "format": "rs fmt",
    "lint": "rs lint"
  }
}
```

Preserve existing script names unless renaming is requested. For scripts that also run Prettier, follow [prettier.md](prettier.md), then apply the [combined-check rules](../SKILL.md#combined-checks).

## Validate

Run lint without writes. If Rstack upgrades Rslint, preserve the pre-migration lint baseline: disable newly enabled rules instead of changing source code, unless code changes are requested.
