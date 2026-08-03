const { once } = require('node:events');
const http = require('node:http');
const path = require('node:path');
const { rspack } = require('@rspack/core');
const { RspackDevServer } = require('@rspack/dev-server');
const request = require('../helpers/http-request');

describe('proxy logging', () => {
  let backend;
  let devServer;

  afterEach(async () => {
    await devServer?.stop();

    if (backend?.listening) {
      const closed = once(backend, 'close');
      backend.close();
      await closed;
    }
  });

  it('uses the expected infrastructure log levels', async () => {
    backend = http.createServer((_req, res) => res.end('proxied'));
    backend.listen(0, '127.0.0.1');
    await once(backend, 'listening');

    const backendPort = backend.address().port;
    const logs = [];
    const compiler = rspack({
      entry: path.resolve(__dirname, '../placeholder.js'),
      stats: 'none',
    });

    compiler.hooks.infrastructureLog.tap(
      'proxy-logging-test',
      (name, type, args) => {
        const message = args.map(String).join(' ');

        if (name === 'rspack-dev-server' && message.includes('[HPM]')) {
          logs.push({ message, type });
        }

        return true;
      },
    );

    devServer = new RspackDevServer(
      {
        client: false,
        hot: false,
        host: '127.0.0.1',
        port: 0,
        proxy: [
          {
            context: ['/api'],
            target: `http://127.0.0.1:${backendPort}`,
          },
        ],
        static: false,
        webSocketServer: false,
      },
      compiler,
    );

    await devServer.start();
    const port = devServer.server.address().port;
    const proxyRequest = () =>
      request({ hostname: '127.0.0.1', path: '/api/users', port });

    expect((await proxyRequest()).status).toBe(200);
    expect(logs).toContainEqual({
      message: expect.stringContaining('[HPM] GET /api/users'),
      type: 'log',
    });

    const closed = once(backend, 'close');
    backend.close();
    await closed;

    expect((await proxyRequest()).status).toBe(504);
    expect(logs).toContainEqual({
      message: expect.stringContaining('[HPM] Error occurred'),
      type: 'error',
    });
  });
});
