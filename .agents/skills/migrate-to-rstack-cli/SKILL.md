---
name: migrate-to-rstack-cli
description: Use when migrating projects from standalone Rsbuild, Rslib, Rstest, Rslint, Rspress, Prettier, sort-package-json, lint-staged, husky, lefthook, or simple-git-hooks tooling to the unified `rstack` package, `rs` commands, and `rstack.config.*`.
---

# Migrate to Rstack CLI

Rstack CLI is the `rstack` package, exposed through the `rs` binaries. It provides one CLI, one config file, and a consistent workflow for the Rstack JavaScript toolchain.

## Tool references

Read every matching reference before editing. Load only the tools present in the project.

- `@rsbuild/core`, `rsbuild.config.*`, `rsbuild` commands, or Rsbuild types: [rsbuild.md](references/rsbuild.md)
- `@rslib/core`, `rslib.config.*`, `rslib` commands, or Rslib types: [rslib.md](references/rslib.md)
- `@rstest/core`, `@rstest/adapter-*`, `rstest.config.*`, `rstest` commands, or test imports: [rstest.md](references/rstest.md)
- `@rslint/core`, `rslint.config.*`, `rslint` commands, or lint imports: [rslint.md](references/rslint.md)
- `prettier`, `package.json#prettier`, `.prettierrc*`, `prettier.config.*`, `.prettierignore`, `.editorconfig`, `sort-package-json`, Prettier plugins, or formatting scripts: [prettier.md](references/prettier.md)
- `@rspress/core`, `rspress.config.*`, `rspress` commands, themes, or plugins: [rspress.md](references/rspress.md)
- `lint-staged`, `nano-staged`, their configs: [lint-staged.md](references/lint-staged.md)
- `husky`, `.husky/`, `package.json#husky`, `lefthook`, `simple-git-hooks`, `.simple-git-hooks.*`, or Git hook installer scripts: [git-hooks.md](references/git-hooks.md)

## Workflow

1. Inspect manifests, workspace catalogs, lock files, scripts, standalone configs, ignore files, Git hooks, TypeScript `types`, and source imports.
2. Read the matching references and inventory behavior that must survive: config functions, CLI arguments, plugins, presets, adapters, custom config paths, and chained commands.
3. Check the latest `rstack` release, Node.js engine, underlying tool versions, and relevant peer ranges. Upgrade incompatible plugins or adapters; stop if no compatible version exists. Ensure development and CI use supported Node.js versions, but do not narrow a published package's runtime `engines` solely to satisfy Rstack. Add `rstack` as a development dependency with the existing package manager.
4. If a matching reference uses a `define.*` registration, create `rstack.config.ts` and move the standalone configuration into it.
5. Rewrite commands and imports as directed by the references.
6. Search again for old imports, binaries, config paths, manifest entries, package-manager metadata, and type references. Remove an item only after ruling out direct or runtime use and unresolved peer constraints.
7. Delete a standalone config only after its behavior is represented in `rstack.config.*`.
8. Refresh the lockfile with the repository's package manager. Confirm the expected tool version changes and resolve peer dependency warnings.
9. Run migrated scripts and required repository checks. Compare generated artifacts or runtime behavior where relevant. After any follow-up changes, rerun the relevant checks against the final code.

Rsbuild, Rslib, Rstest, Rslint, and Prettier remain transitive `rstack` dependencies. Remove obsolete direct dependencies and imports from the migrated scope; do not expect their names to disappear from the lockfile.

### Ignore cleanup

After migrating lint or formatting, remove exclusions from lint `ignores` and fmt `ignorePatterns` when the same paths are already covered by effective `.gitignore` rules; both commands read `.gitignore` automatically. For fmt, also remove `package-lock.json` and `pnpm-lock.yaml` from `ignorePatterns`; `rs fmt` ignores them by default.

Keep negations and fmt exclusions that must apply to explicitly passed files, which bypass `.gitignore`.

### Combined checks

After migrating lint and formatting commands, prefer the shorter combined command when behavior is equivalent:

| Separate commands                        | Preferred command       |
| ---------------------------------------- | ----------------------- |
| `rs lint && rs fmt --check`              | `rs check`              |
| `rs lint --type-check && rs fmt --check` | `rs check --type-check` |

`rs check` preserves the order and short-circuit behavior of these `&&` chains.

Combine only commands that share the same working directory, config, scope, and execution behavior and have no extra inputs or command-specific options. Pass a shared `-c` or `--config` to `rs check`.

## Configuration

### Config files

Treat each workspace or config root independently. A monorepo may need multiple Rstack config files when commands run from different package directories; validate config discovery from each directory.

Use one of the default names: `rstack.config.ts`, `.js`, `.mts`, or `.mjs`.

Use `rs -c <path>` or `rs --config <path>` only for a custom path.

```ts
// Configuration guide: https://rstack.rs/config
import { define } from 'rstack';

define.app({
  // Rsbuild config
});

define.test({
  // Rstest config
});
```

### Modules and imports

Rstack loads every top-level import when it reads `rstack.config.*`. Prefer static imports when a config is only for an application and its tests, a library and its tests, or a documentation site.

If the same config also includes lint, formatting, or staged-file checks, dynamically import dependencies inside the relevant async config function to avoid loading them during checks. Keep type-only and Node.js built-in imports at the top level.

```ts
define.app(async () => {
  const { pluginReact } = await import('@rsbuild/plugin-react');

  return {
    plugins: [pluginReact()],
  };
});

define.lint(({ js }) => [js.configs.recommended]);
```

`define.lint` provides `@rslint/core` APIs to its config factory, so no manual import is needed.

Rstack loads TypeScript configs as native ESM. Preserve runtime-resolvable file extensions, replace CommonJS globals such as `__dirname`.
