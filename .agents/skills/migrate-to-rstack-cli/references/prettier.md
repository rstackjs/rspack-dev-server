# Prettier migration

`rs fmt` is Rstack's faster, Prettier-based formatter. See the [formatting guide](https://rstack.rs/guide/formatting) for supported options, file discovery, overrides, plugins, and Rstack-specific capabilities.

Read this reference when the project uses the `prettier` CLI or API, `package.json#prettier`, Prettier configuration files, `.prettierignore`, `.editorconfig`, `sort-package-json`, Prettier plugins, or formatting scripts.

## Steps

1. Inventory formatting commands and inputs, Prettier options and overrides, ignore rules, `.editorconfig`, plugins, package.json sorting, programmatic API calls, and tracked VS Code settings.
2. Move Prettier options and overrides into `define.fmt` in `rstack.config.*`.
3. Move `.prettierignore` or custom `--ignore-path` rules into `ignorePatterns`. Rebase patterns from each ignore file's directory to the Rstack configuration directory when they differ, preserving rule order and negations. Translate relevant `.editorconfig` values into explicit formatting options.
4. Replace Prettier CLI commands with the matching `rs fmt` commands and preserve their file or glob arguments.
5. Reference plugins by package name, file path, or URL. Do not pass imported plugin objects, and keep each plugin package as a direct dependency.
6. When replacing `prettier-plugin-packagejson`, enable `sortPackageJson` and preserve the original manifest paths.
7. If tracked VS Code configuration recommends `esbenp.prettier-vscode` or selects it with `editor.defaultFormatter`, replace it with `rstack.rstack` for scopes migrated to `rs fmt`, and move supported `prettier.*` formatting options into `define.fmt`. Preserve `editor.formatOnSave`, remove `source.fixAll.prettier` when no remaining scope uses it, and keep the Prettier extension for any scope that still does.
8. Delete old config and ignore files only after their behavior is represented in `define.fmt`.
9. Remove direct dependencies only when no script, config, API call, plugin peer requirement, or other tool still needs them.

Rstack creates `.rstack/cache/.gitignore` by default. Do not list `.rstack/cache` in the root `.gitignore`; add explicit rules only for custom cache paths.

`rs fmt` does not read Prettier configuration files, `.prettierignore`, or `.editorconfig`.

Keep `.editorconfig` when editors or other tools use it. Keep Prettier when application code uses APIs such as `prettier.format()`; `rs fmt` is not a drop-in replacement for the programmatic API.

## Command mapping

| Prettier                      | Rstack CLI                |
| ----------------------------- | ------------------------- |
| `prettier --write .`          | `rs fmt`                  |
| `prettier --check .`          | `rs fmt --check`          |
| `prettier --list-different .` | `rs fmt --list-different` |

`rs fmt` writes by default. Move formatting flags such as `--single-quote` into `define.fmt` instead of passing them to `rs fmt`. Keep Prettier or redesign commands that rely on stdin or other unsupported CLI behavior.

## Validate

1. Run the migrated write command and review the changed files, especially files handled by plugins or `sortPackageJson`.
2. Run `rs fmt --check` and confirm it exits successfully.
3. Compare the selected file set with the old command. Directory and glob discovery follows `.gitignore`, while explicitly named files do not; use `ignorePatterns` for unconditional exclusions.
