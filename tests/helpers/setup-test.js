process.env.CHOKIDAR_USEPOLLING = true;
const path = require('node:path');
const Module = require('node:module');

try {
  process.binding('http_parser');
} catch (_) {
  const httpCommon = require('node:_http_common');
  const originalBinding = process.binding;

  process.binding = function patchedBinding(name) {
    if (name === 'http_parser') {
      return {
        HTTPParser: httpCommon.HTTPParser,
        methods: httpCommon.methods,
      };
    }

    return originalBinding(name);
  };
}

const originalResolveFilename = Module._resolveFilename;
const moduleAliasMap = new Map([
  [
    '../client/clients/SockJSClient',
    path.resolve(process.cwd(), 'client/clients/SockJSClient.js'),
  ],
  [
    '../client/clients/WebSocketClient',
    path.resolve(process.cwd(), 'client/clients/WebSocketClient.js'),
  ],
]);

Module._resolveFilename = function patchedResolveFilename(request, ...rest) {
  const mapped = moduleAliasMap.get(request);

  if (mapped) {
    return originalResolveFilename.call(this, mapped, ...rest);
  }

  return originalResolveFilename.call(this, request, ...rest);
};
