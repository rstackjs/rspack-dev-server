# Git hook migration

Migrate [Husky](https://typicode.github.io/husky/), [Lefthook](https://lefthook.dev/), or [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks#readme) to [`rs hooks`](https://rstack.rs/guide/cli/hooks). If a hook works with staged files, also read [lint-staged.md](lint-staged.md).

## Shared steps

1. Inspect the hook manager configuration, hook scripts, lifecycle scripts, custom paths, environment overrides, and `git config --show-scope --get core.hooksPath`.
2. Inventory every active hook before editing. Confirm each hook is [supported by `rs hooks`](https://rstack.rs/guide/cli/hooks#supported-hooks); stop or design an explicit alternative for unsupported hooks.
3. Create each migrated hook in the selected hooks directory, `.rstack/hooks` by default, before running `rs hooks`, because the command changes the repository's `core.hooksPath`. Preserve commands and any explicit directory changes.
4. Ensure the `prepare` script in the root `package.json` runs `rs hooks`, adding it if necessary. Remove the old installer invocation from any lifecycle script while preserving other commands. Use `--hooks-dir` consistently when choosing a custom directory.
5. If the previous manager's hooks or `core.hooksPath` block installation, run `rs hooks --force` once after migrating every required hook. The command preserves the previous files but makes them inactive. Do not add `--force` to the lifecycle script.
6. Exercise the migrated hooks, then remove the old dependency, configuration, and generated hook files only after behavior matches and their ownership and paths are confirmed.

`rs hooks` creates `.rstack/hooks/_/.gitignore`. Do not list `.rstack/hooks/_` in the root `.gitignore`.

## Husky

1. Locate the source hooks:
   - Husky v5 and newer: files such as `.husky/pre-commit`; exclude the generated `.husky/_` directory.
   - Husky v4: `package.json#husky.hooks` or `.huskyrc*` configuration.
2. Move each hook body to the corresponding file in the selected hooks directory. Remove lines that source `.husky/_/husky.sh`; keep the reusable POSIX shell commands.
3. Replace Husky lifecycle invocations such as `husky`, `husky install`, or a custom Husky directory command with `rs hooks` or `rs hooks --hooks-dir <path>`.
4. Replace `HUSKY=0`, `HUSKY_SKIP_HOOKS`, and `HUSKY_SKIP_INSTALL` usage with `RSTACK_HOOKS=0`. Replace `HUSKY_GIT_PARAMS` with the positional arguments expected by each hook. For example, change `commitlint -E HUSKY_GIT_PARAMS` to `commitlint --edit "$1"`.
5. Tell users who rely on `$XDG_CONFIG_HOME/husky/init.sh`, `~/.config/husky/init.sh`, or the deprecated `~/.huskyrc` to move the required shell setup to `$XDG_CONFIG_HOME/rstack/hooks-init.sh` or `~/.config/rstack/hooks-init.sh`. Do not edit user-level files without permission.
6. After validation, remove the Husky dependency and old hook directory.

For example, migrate:

```sh title=".husky/pre-commit"
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm test
```

to:

```sh title=".rstack/hooks/pre-commit"
pnpm test
```

## Lefthook

1. Resolve the merged configuration, including main and local files, `LEFTHOOK_CONFIG`, `extends` or remote configs, lifecycle scripts, and direct `lefthook run` calls. Treat ignored local configs as user-owned.
2. Create one Rstack file per Git hook. Rstack runs it with POSIX `sh -e` and forwards arguments and standard input. Replace templates such as `{1}` with `"$1"`; move custom Lefthook groups to project scripts.
3. Move `pre-commit` tasks using `{staged_files}`, `stage_fixed`, `glob`, or `exclude` to `define.staged`, and run `rs staged` from `.rstack/hooks/pre-commit`; it passes matched files and stages successful fixes. Recreate the intended file set instead of copying globs: Lefthook's default `**` semantics differ from lint-staged. Preserve exclusions such as unsupported symlinks.
4. For `{push_files}`, `{all_files}`, custom `{files}`, or orchestration such as `parallel` and `piped`, call a project helper from the hook. It should consume all `pre-push` ref updates, apply the original conditions, preserve concurrency or ordering, and aggregate failures. For a configuration like Rstest's, run the format/spell check always, skip type checking only for Markdown-only pushes, and run the dependency check only for pushed package manifests. Do not substitute a fixed `HEAD^` diff.
5. Replace `lefthook install` with `rs hooks` and `LEFTHOOK=0` with `RSTACK_HOOKS=0`. After validation, remove Lefthook configs, dependencies, generated hooks, and its entries from pnpm build metadata such as `allowBuilds`, `onlyBuiltDependencies`, or `ignoredBuiltDependencies`. Preserve unrelated entries, and remove a setting only if it becomes empty. Remove local-config ignore rules only when no longer needed.

## simple-git-hooks

1. Load the active configuration from `package.json#simple-git-hooks`, a `.simple-git-hooks.{js,cjs,mjs,json}` or `simple-git-hooks.{js,cjs,mjs,json}` file, or the custom path passed to its CLI. Use the configuration values instead of copying generated files from the Git hooks directory.
2. Create one file in the selected hooks directory for each configured command, using the hook name as the file name. Ignore `preserveUnused` as a command, but inspect and migrate any existing hooks that it preserves.
3. Replace the simple-git-hooks lifecycle command with `rs hooks`, preserving other chained commands.
4. Replace `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` and `SKIP_SIMPLE_GIT_HOOKS=1` usage with `RSTACK_HOOKS=0`. Move required commands from the file referenced by `SIMPLE_GIT_HOOKS_RC` to the Rstack user initialization file, with user permission.
5. Do not run the simple-git-hooks uninstall script after `rs hooks`; it follows the current `core.hooksPath` and can delete Rstack's generated hook shims.
6. After validation, remove the simple-git-hooks dependency, config, installer, old generated hook files, and stale package-manager metadata such as pnpm `allowBuilds`. Confirm the generated files' ownership and paths before removing them.

For example, migrate:

```json title="package.json"
{
  "scripts": {
    "prepare": "existing-command && simple-git-hooks"
  },
  "simple-git-hooks": {
    "pre-commit": "pnpm lint",
    "pre-push": "pnpm test"
  }
}
```

to `"prepare": "existing-command && rs hooks"` and these hook files:

```sh title=".rstack/hooks/pre-commit"
pnpm lint
```

```sh title=".rstack/hooks/pre-push"
pnpm test
```

## Validate

- Confirm `git config --show-scope --get core.hooksPath` reports the expected Rstack-generated directory and whether it is configured in the local or worktree scope.
- Test each migrated hook and confirm that its commands run as expected.
- Remove previous generated hooks after validation so they cannot become active again if `core.hooksPath` is later unset or changed.
- Search for old manager commands, configuration, environment variables, and user instructions before removing dependencies.
