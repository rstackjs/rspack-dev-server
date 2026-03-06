const { rspack } = require('@rspack/core');
const { RspackDevServer: Server } = require('@rspack/dev-server');
const lazyCompilationSingleEntryConfig = require('../fixtures/lazy-compilation-single-entry/rspack.config');
const lazyCompilationMultipleEntriesConfig = require('../fixtures/lazy-compilation-multiple-entries/rspack.config');
const runBrowser = require('../helpers/run-browser');
const port = require('../helpers/ports-map')['lazy-compilation'];

describe('lazy compilation', () => {
  // TODO test run can freeze because webpack does not close `eventsource`;
  // uncomment after it is fixed on webpack side
  it.skip('should work with single entry', async () => {
    const compiler = rspack(lazyCompilationSingleEntryConfig);
    const server = new Server({ port }, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];
      const consoleMessages = [];

      page
        .on('console', (message) => {
          consoleMessages.push(message.text());
        })
        .on('pageerror', (error) => {
          pageErrors.push(error);
        });

      await page.goto(`http://127.0.0.1:${port}/test.html`, {
        waitUntil: 'domcontentloaded',
      });
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (consoleMessages.includes('Hey.')) {
            clearInterval(interval);

            resolve();
          }
        }, 100);
      });

      expect(consoleMessages).toMatchSnapshot('console messages');
      expect(pageErrors).toMatchSnapshot('page errors');
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it.skip('should work with multiple entries', async () => {
    const compiler = rspack(lazyCompilationMultipleEntriesConfig);
    const server = new Server({ port }, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];
      const consoleMessages = [];

      page
        .on('console', (message) => {
          consoleMessages.push(message.text());
        })
        .on('pageerror', (error) => {
          pageErrors.push(error);
        });

      await page.goto(`http://127.0.0.1:${port}/test-one.html`, {
        waitUntil: 'domcontentloaded',
      });
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          console.log(consoleMessages);
          if (consoleMessages.includes('One.')) {
            clearInterval(interval);

            resolve();
          }
        }, 100);
      });

      await page.goto(`http://127.0.0.1:${port}/test-two.html`, {
        waitUntil: 'domcontentloaded',
      });
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          console.log(consoleMessages);
          if (consoleMessages.includes('Two.')) {
            clearInterval(interval);

            resolve();
          }
        }, 100);
      });

      expect(consoleMessages).toMatchSnapshot('console messages');
      expect(pageErrors).toMatchSnapshot('page errors');
    } finally {
      await browser.close();
      await server.stop();
    }
  });
});
