const http = require('node:http');
const path = require('node:path');
const { rspack } = require('@rspack/core');
const { RspackDevServer } = require('@rspack/dev-server');
const {
  getRandomPorts,
  releaseRandomPorts,
} = require('../helpers/get-random-port');
const request = require('../helpers/http-request');

describe('proxy logging', () => {
  let backend;
  let devServer;
  let ports;

  beforeEach(async () => {
    ports = await getRandomPorts(2, '127.0.0.1');
  });

  afterEach(async () => {
    if (devServer) {
      await devServer.stop();
      devServer = undefined;
    }

    if (backend) {
      await new Promise((resolve, reject) => {
        backend.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      backend = undefined;
    }

    releaseRandomPorts(ports);
  });

  const createInfrastructureConsole = () => {
    const infrastructureConsole = Object.create(console);

    infrastructureConsole.debug = rs.fn();
    infrastructureConsole.log = rs.fn();
    infrastructureConsole.info = rs.fn();
    infrastructureConsole.warn = rs.fn();
    infrastructureConsole.error = rs.fn();

    return infrastructureConsole;
  };

  const containsLog = (mock, text) =>
    mock.mock.calls.some((args) =>
      args.some((argument) => String(argument).includes(text)),
    );

  const startBackend = async () => {
    backend = http.createServer((_request, response) => {
      response.end('proxied');
    });

    await new Promise((resolve, reject) => {
      backend.once('error', reject);
      backend.listen(ports[0], '127.0.0.1', resolve);
    });
  };

  const startDevServer = async ({ level = 'info', logger } = {}) => {
    const infrastructureConsole = createInfrastructureConsole();
    const compiler = rspack({
      entry: path.resolve(__dirname, '../placeholder.js'),
      infrastructureLogging: {
        appendOnly: true,
        colors: false,
        console: infrastructureConsole,
        level,
      },
      stats: 'none',
    });

    devServer = new RspackDevServer(
      {
        client: false,
        hot: false,
        liveReload: false,
        host: '127.0.0.1',
        port: ports[1],
        proxy: [
          {
            context: ['/api'],
            target: `http://127.0.0.1:${ports[0]}`,
            ...(logger ? { logger } : {}),
          },
        ],
        static: false,
        webSocketServer: false,
      },
      compiler,
    );

    await devServer.start();

    return infrastructureConsole;
  };

  it('does not print successful requests at the default level', async () => {
    await startBackend();
    const infrastructureConsole = await startDevServer();

    const response = await request({
      hostname: '127.0.0.1',
      path: '/api/users',
      port: ports[1],
    });

    expect(response.status).toBe(200);
    expect(containsLog(infrastructureConsole.info, '[HPM]')).toBe(false);
    expect(containsLog(infrastructureConsole.log, '[HPM]')).toBe(false);
  });

  it('prints successful requests at the log level', async () => {
    await startBackend();
    const infrastructureConsole = await startDevServer({ level: 'log' });

    const response = await request({
      hostname: '127.0.0.1',
      path: '/api/users',
      port: ports[1],
    });

    expect(response.status).toBe(200);
    expect(containsLog(infrastructureConsole.log, '[HPM] GET /api/users')).toBe(
      true,
    );
  });

  it('still prints proxy errors at the default level', async () => {
    const infrastructureConsole = await startDevServer();

    const response = await request({
      hostname: '127.0.0.1',
      path: '/api/users',
      port: ports[1],
    });

    expect(response.status).toBe(504);
    expect(
      containsLog(infrastructureConsole.error, '[HPM] Error occurred'),
    ).toBe(true);
  });

  it('preserves a custom proxy logger', async () => {
    await startBackend();
    const logger = {
      error: rs.fn(),
      info: rs.fn(),
      warn: rs.fn(),
    };

    await startDevServer({ logger });
    const response = await request({
      hostname: '127.0.0.1',
      path: '/api/users',
      port: ports[1],
    });

    expect(response.status).toBe(200);
    expect(containsLog(logger.info, '[HPM] GET /api/users')).toBe(true);
  });
});
