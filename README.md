# @rspack/dev-server

<p>
  <a href="https://npmjs.com/package/@rspack/dev-server?activeTab=readme"><img src="https://img.shields.io/npm/v/@rspack/dev-server?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@rspack/dev-server?minimal=true"><img src="https://img.shields.io/npm/dm/@rspack/dev-server.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@rspack/dev-server.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="node version"></a>
  <a href="https://github.com/rstackjs/rspack-dev-server/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

Use Rspack with a development server that provides live reloading. This should be used for development only.

## Versions

- `2.x`: For Rspack v2, see [v1 -> v2](./docs/migrate-v1-to-v2.md) for migration guide.
- `1.x`: For Rspack v1, see [v1.x - README](https://github.com/rstackjs/rspack-dev-server/tree/v1.x#rspackdev-server) for usage guide.

## Installation

First of all, install `@rspack/dev-server` and `@rspack/core` by your favorite package manager:

```bash
# npm
$ npm install -D @rspack/dev-server @rspack/core

# yarn
$ yarn add -D @rspack/dev-server @rspack/core

# pnpm
$ pnpm add -D @rspack/dev-server @rspack/core

# bun
$ bun add -D @rspack/dev-server @rspack/core
```

## Usage

There are two recommended ways to use `@rspack/dev-server`:

### With the CLI

The easiest way to use it is with the [`@rspack/cli`](https://www.npmjs.com/package/@rspack/cli).

You can install it in your project by:

```bash
# npm
$ npm install -D @rspack/cli

# yarn
$ yarn add -D @rspack/cli

# pnpm
$ pnpm add -D @rspack/cli

# bun
$ bun add -D @rspack/cli
```

And then start the development server by:

```bash
# with rspack.config.js
$ rspack serve

# with custom config file
$ rspack serve -c ./your.config.js
```

> See [CLI](https://rspack.rs/api/cli) for more details.

While starting the development server, you can specify the configuration by the `devServer` field of your Rspack config file:

```js
// rspack.config.mjs
export default {
  devServer: {
    // the configuration of the development server
    port: 8080,
  },
};
```

> See [Rspack - devServer](https://rspack.rs/config/dev-server) for all configuration options.

### With the API

While it's recommended to run `@rspack/dev-server` via the CLI, you may also choose to start a server via the API.

```js
import { RspackDevServer } from '@rspack/dev-server';
import { rspack } from '@rspack/core';
import config from './rspack.config.mjs';

const compiler = rspack(config);
const devServerOptions = {
  ...config.devServer,
  // override
  port: 8888,
};

const server = new RspackDevServer(devServerOptions, compiler);

server.startCallback(() => {
  console.log('Successfully started server on http://localhost:8888');
});
```

## Credits

This repository is forked from [webpack-dev-server](https://github.com/webpack/webpack-dev-server). It adapts the original implementation for the Rspack ecosystem, bridging behavioral differences with webpack while adding Rspack-specific capabilities.

> Thanks to the [webpack-dev-server](https://github.com/webpack/webpack-dev-server) maintainers and its original creator, [@sokra](https://github.com/sokra).

## License

[MIT licensed](https://github.com/rstackjs/rspack-dev-server/blob/main/LICENSE).
