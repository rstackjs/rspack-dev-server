const { rspack } = require('@rspack/core');
const { RspackDevServer: Server } = require('@rspack/dev-server');
const config = require('../fixtures/simple-config/rspack.config');
const runBrowser = require('../helpers/run-browser');
const port = require('../helpers/ports-map')['client-reconnect-option'];

const DISCONNECTED_MESSAGE = 'Disconnected!';
const RECONNECT_MESSAGE = 'Trying to reconnect...';
const FAST_RECONNECT_DELAY = 100;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForMessages = async (
  consoleMessages,
  predicate,
  errorMessage,
  timeout = 10000,
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const texts = consoleMessages.map((message) => message.text());

    if (predicate(texts)) {
      return;
    }

    await delay(50);
  }

  throw new Error(errorMessage);
};

const waitForReconnectMessages = (consoleMessages, expectedCount) =>
  waitForMessages(
    consoleMessages,
    (texts) =>
      texts.filter((text) => text.includes(RECONNECT_MESSAGE)).length >=
      expectedCount,
    `Expected ${expectedCount} reconnect messages.`,
    15000,
  );

const waitForDisconnectMessage = (consoleMessages) =>
  waitForMessages(
    consoleMessages,
    (texts) => texts.some((text) => text.includes(DISCONNECTED_MESSAGE)),
    `Expected "${DISCONNECTED_MESSAGE}" message.`,
  );

const waitForConsoleMessages = (consoleMessages, expectedCount) =>
  waitForMessages(
    consoleMessages,
    (texts) => texts.length >= expectedCount,
    `Expected ${expectedCount} console messages.`,
  );

const useFastPageReconnectTimers = async (page) => {
  await page.evaluateOnNewDocument((fastReconnectDelay) => {
    const originalSetTimeout = window.setTimeout.bind(window);

    window.setTimeout = (handler, timeout, ...args) =>
      originalSetTimeout(
        handler,
        typeof timeout === 'number' && timeout >= 1000
          ? fastReconnectDelay
          : timeout,
        ...args,
      );
  }, FAST_RECONNECT_DELAY);
};

describe('client.reconnect option', () => {
  describe('specified as true', () => {
    let compiler;
    let server;
    let page;
    let browser;
    let pageErrors;
    let consoleMessages;

    beforeEach(async () => {
      compiler = rspack(config);

      server = new Server({ port, client: { reconnect: true } }, compiler);

      await server.start();

      ({ page, browser } = await runBrowser());
      await useFastPageReconnectTimers(page);

      pageErrors = [];
      consoleMessages = [];
    });

    afterEach(async () => {
      await browser.close();
    });

    it('should try to reconnect unlimited times', async () => {
      page
        .on('console', (message) => {
          consoleMessages.push(message);
        })
        .on('pageerror', (error) => {
          pageErrors.push(error);
        });

      const response = await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: 'networkidle0',
      });

      try {
        expect(response.status()).toMatchSnapshot('response status');
      } finally {
        await server.stop();
      }

      await waitForReconnectMessages(consoleMessages, 5);

      expect(pageErrors).toMatchSnapshot('page errors');
    });
  });

  describe('specified as false', () => {
    let compiler;
    let server;
    let page;
    let browser;
    let pageErrors;
    let consoleMessages;

    beforeEach(async () => {
      compiler = rspack(config);

      server = new Server({ port, client: { reconnect: false } }, compiler);

      await server.start();

      ({ page, browser } = await runBrowser());
      await useFastPageReconnectTimers(page);

      pageErrors = [];
      consoleMessages = [];
    });

    afterEach(async () => {
      await browser.close();
    });

    it('should not try to reconnect', async () => {
      page
        .on('console', (message) => {
          consoleMessages.push(message);
        })
        .on('pageerror', (error) => {
          pageErrors.push(error);
        });

      const response = await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: 'networkidle0',
      });

      try {
        expect(response.status()).toMatchSnapshot('response status');
      } finally {
        await server.stop();
      }

      await waitForDisconnectMessage(consoleMessages);

      expect(consoleMessages.map((message) => message.text())).toMatchSnapshot(
        'console messages',
      );

      expect(pageErrors).toMatchSnapshot('page errors');
    });
  });

  describe('specified as number', () => {
    let compiler;
    let server;
    let page;
    let browser;
    let pageErrors;
    let consoleMessages;

    beforeEach(async () => {
      compiler = rspack(config);

      server = new Server({ port, client: { reconnect: 2 } }, compiler);

      await server.start();

      ({ page, browser } = await runBrowser());
      await useFastPageReconnectTimers(page);

      pageErrors = [];
      consoleMessages = [];
    });

    afterEach(async () => {
      await browser.close();
    });

    it('should try to reconnect 2 times', async () => {
      page
        .on('console', (message) => {
          consoleMessages.push(message);
        })
        .on('pageerror', (error) => {
          pageErrors.push(error);
        });

      const response = await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: 'networkidle0',
      });

      try {
        expect(response.status()).toMatchSnapshot('response status');
      } finally {
        await server.stop();
      }

      await waitForReconnectMessages(consoleMessages, 2);
      await waitForConsoleMessages(consoleMessages, 10);

      expect(consoleMessages.map((message) => message.text())).toMatchSnapshot(
        'console messages',
      );

      expect(pageErrors).toMatchSnapshot('page errors');
    });
  });
});
