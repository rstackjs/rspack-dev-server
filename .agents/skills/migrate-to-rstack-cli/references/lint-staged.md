# Staged-File Migration

`rs staged` is powered by lint-staged and configured through `define.staged`, which supports lint-staged configuration options.

Read this reference when the project uses `lint-staged`, `nano-staged`, a staged-file config, or a staged-file Git hook.

If staged tasks invoke Prettier, also read [prettier.md](prettier.md).

## Steps

1. Replace staged-file script invocations with `rs staged`.
2. Move the staged-file config into `define.staged` in `rstack.config.*`.
3. Preserve previous behavior. Separate code tasks that lint and format from format-only tasks.
4. Remove the old manifest key or config file.
5. Remove the direct staged-file dependency only when no script, config, or programmatic API still uses it.

## Config pattern

```ts
import { define } from 'rstack';

define.staged({
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['rs lint', 'rs fmt'],
  '*.{json,jsonc,md,mdx,css,html,yml,yaml}': 'rs fmt',
});
```

Function configs are supported.

## CLI options

Run `rs staged -h` for supported options.
