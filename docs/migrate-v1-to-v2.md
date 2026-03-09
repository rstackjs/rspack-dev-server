# @rspack/dev-server Migration Guide (v1 -> v2)

This guide covers breaking changes you need to handle when upgrading `@rspack/dev-server` from v1 to v2.

## Breaking Changes

### Drop Node 18 Support

Node.js 18 is no longer supported in v2.

The minimum supported Node.js version is now `^20.19.0 || >=22.12.0`.

### Drop Rspack v1 Support

`@rspack/dev-server` v2 is designed to work with Rspack v2. Rspack v1 is no longer supported in v2.

## Pure ESM package

`@rspack/dev-server` is now published as **pure ESM** package.

### Upgraded `http-proxy-middleware` to v3

`http-proxy-middleware` has been updated to v3, which has some breaking changes:

- `proxy[].path` is removed. Use `pathFilter` (or `context`) instead.

```diff
{
-  path: '/api',
+  pathFilter: '/api',
}
```

- `logLevel` / `logProvider` are replaced by `logger`.

```diff
- logLevel: 'warn',
+ logger: console,
```

- `onProxyReq` / `onProxyRes` / `onProxyReqWs` are moved to `on: { ... }`.

```diff
- onProxyReq(proxyReq) {
-   proxyReq.setHeader('x-from', 'dev-server');
- },
+ on: {
+   proxyReq(proxyReq) {
+     proxyReq.setHeader('x-from', 'dev-server');
+   },
+ },
```

- `proxy[].bypass` is removed, use `pathFilter` or `router` instead.
  - When `bypass` was used and that function returned a boolean, it would automatically result in a 404 request. This can’t be achieved in a similar way now, or, if it returned a string, you can do what was done in the example above.
  - `bypass` also allowed sending data; this can no longer be done. If you really need to do it, you’d have to create a new route in the proxy that sends the same data, or alternatively create a new route on the main server and, following the example above, send the data you wanted.

> Refer to the [http-proxy-middleware v3 migration guide](https://github.com/chimurai/http-proxy-middleware/blob/master/MIGRATION.md) for details.

### Upgraded Express to v5

`express` has been updated to v5, see [Introducing Express v5: A New Era for the Node.js Framework](https://expressjs.com/2024/10/15/v5-release.html) for details.

### Removed `spdy` support

- `server.type: "spdy"` is no longer supported.
- `server.options.spdy` is no longer supported.

You can switch to `server.type: "http2"` or `"https"` instead.

```js
// Before
export default {
  devServer: {
    server: {
      type: 'spdy',
      options: {
        spdy: { protocols: ['h2', 'http/1.1'] },
      },
    },
  },
};

// After
export default {
  devServer: {
    server: {
      type: 'http2', // or 'https'
      options: {},
    },
  },
};
```

### Optional `selfsigned` peer dependency

`selfsigned` is no longer bundled as a direct dependency of `@rspack/dev-server`.

If you use `server.type: "https"` or `"http2"` without providing your own
`server.options.key` and `server.options.cert`, the dev server needs
`selfsigned` to generate a local certificate.

Install it in your project when needed:

```bash
npm i -D selfsigned@^5.0.0
# or pnpm add -D selfsigned@^5.0.0
# or yarn add -D selfsigned@^5.0.0
# or bun add -D selfsigned@^5.0.0
```

### Removed SockJS support (`ws` only)

In v2, the following SockJS options are no longer available:

- `webSocketServer: "sockjs"`
- `webSocketServer: { type: "sockjs" }`
- `client.webSocketTransport: "sockjs"`
- `webSocketServer.options.prefix` (use `path`)

Also, SockJS bundle routes were removed.

```js
// Before
export default {
  devServer: {
    webSocketServer: 'sockjs',
    client: {
      webSocketTransport: 'sockjs',
    },
  },
};

// After
export default {
  devServer: {
    webSocketServer: 'ws',
    client: {
      webSocketTransport: 'ws',
    },
  },
};
```

If you need a non-default transport/server, you can provide a custom implementation path instead of `'sockjs'`.

### Removed `bonjour`

Built-in Bonjour support is removed in v2.

If Bonjour/ZeroConf broadcasting is still important for your workflow, consider integrating `bonjour-service` directly in your app code.

### Renamed `webpack-dev-server-*` to `rspack-dev-server-*`

If your setup still uses the legacy names, you can update them as follows:

- Environment variables
  - `WEBPACK_DEV_SERVER_BASE_PORT` -> `RSPACK_DEV_SERVER_BASE_PORT`
  - `WEBPACK_DEV_SERVER_PORT_RETRY` -> `RSPACK_DEV_SERVER_PORT_RETRY`
- URL query flags
  - `webpack-dev-server-hot=false` -> `rspack-dev-server-hot=false`
  - `webpack-dev-server-live-reload=false` -> `rspack-dev-server-live-reload=false`
- Built-in routes
  - `/webpack-dev-server/*` -> `/rspack-dev-server/*`

```txt
# Before
http://localhost:8080/?webpack-dev-server-hot=false&webpack-dev-server-live-reload=false
GET /webpack-dev-server/invalidate
GET /webpack-dev-server/open-editor?fileName=...

# After
http://localhost:8080/?rspack-dev-server-hot=false&rspack-dev-server-live-reload=false
GET /rspack-dev-server/invalidate
GET /rspack-dev-server/open-editor?fileName=...
```
