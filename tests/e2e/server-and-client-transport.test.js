const { rspack } = require('@rspack/core');
const { RspackDevServer: Server } = require('@rspack/dev-server');
const WebsocketServer = require('../../src/servers/WebsocketServer').default;
const defaultConfig = require('../fixtures/provide-plugin-default/webpack.config');
const wsConfig = require('../fixtures/provide-plugin-ws-config/webpack.config');
const getPort = require('../helpers/get-port');
const runBrowser = require('../helpers/run-browser');
const basePort = require('../helpers/ports-map')['server-and-client-transport'];
const customWebSocketServerPath =
  require.resolve('../fixtures/custom-websocket-server.cjs');

async function getTestPort() {
  return getPort(basePort);
}

describe('server and client transport', () => {
  it('should use default web socket server ("ws")', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should use "ws" web socket server when specify "ws" value', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      webSocketServer: 'ws',
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should use "ws" web socket server when specify "ws" value using object', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      webSocketServer: {
        type: 'ws',
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should use custom web socket server when specify class', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'ws',
      },
      webSocketServer: WebsocketServer,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should use custom web socket server when specify class using object', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'ws',
      },
      webSocketServer: {
        type: WebsocketServer,
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should use custom web socket server when specify path to class', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'ws',
      },
      webSocketServer: customWebSocketServerPath,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should use custom web socket server when specify path to class using object', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'ws',
      },
      webSocketServer: {
        type: customWebSocketServerPath,
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should throw an error on wrong path', async () => {
    expect.assertions(1);

    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      webSocketServer: {
        type: '/bad/path/to/implementation',
      },
    };
    const server = new Server(devServerOptions, compiler);

    try {
      await server.start();
    } catch (error) {
      expect(error.message).toMatchSnapshot();
    } finally {
      await server.stop();
    }
  });

  it('should use "ws" transport, when web socket server is not specify', async () => {
    const port = await getTestPort();
    const compiler = rspack(wsConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'ws',
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should use "ws" transport and "ws" web socket server', async () => {
    const port = await getTestPort();
    const compiler = rspack(wsConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'ws',
      },
      webSocketServer: 'ws',
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message);
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      const isCorrectTransport = await page.evaluate(
        () => window.injectedClient === window.expectedClient,
      );

      expect(isCorrectTransport).toBe(true);
      expect(
        consoleMessages.map((message) => message.text()),
      ).toMatchSnapshot();
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should throw an error on invalid path to server transport', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      webSocketServer: {
        type: 'invalid/path',
      },
    };
    const server = new Server(devServerOptions, compiler);
    await expect(async () => {
      await server.start();
    }).rejects.toThrowErrorMatchingSnapshot();

    await server.stop();
  });

  it('should throw an explicit error when using removed "sockjs" server transport', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      webSocketServer: 'sockjs',
    };
    const server = new Server(devServerOptions, compiler);

    await expect(async () => {
      await server.start();
    }).rejects.toThrowError(/SockJS support has been removed/);

    await server.stop();
  });

  it('should throw an error on invalid path to client transport', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'invalid/path',
      },
    };
    const server = new Server(devServerOptions, compiler);
    await expect(async () => {
      await server.start();
    }).rejects.toThrowErrorMatchingSnapshot();

    await server.stop();
  });

  it('should throw an explicit error when using removed "sockjs" client transport', async () => {
    const port = await getTestPort();
    const compiler = rspack(defaultConfig);
    const devServerOptions = {
      port,
      client: {
        webSocketTransport: 'sockjs',
      },
    };
    const server = new Server(devServerOptions, compiler);

    await expect(async () => {
      await server.start();
    }).rejects.toThrowError(/SockJS support has been removed/);

    await server.stop();
  });
});
