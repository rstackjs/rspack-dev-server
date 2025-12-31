const path = require('node:path');
const webpack = require('@rspack/core');
const { RspackDevServer: Server } = require('@rspack/dev-server');
const config = require('../fixtures/client-config/webpack.config');
const runBrowser = require('../helpers/run-browser');
const port = require('../helpers/ports-map').target;
const workerConfig = require('../fixtures/worker-config/webpack.config');
const workerConfigDevServerFalse = require('../fixtures/worker-config-dev-server-false/webpack.config');

const sortByTerm = (data, term) =>
  data.sort((a, b) => (a.indexOf(term) < b.indexOf(term) ? -1 : 1));

describe('target', () => {
  const targets = [
    false,
    'browserslist:defaults',
    'web',
    'webworker',
    'node',
    'async-node',
    'electron-main',
    'electron-preload',
    'electron-renderer',
    'nwjs',
    'node-webkit',
    'es5',
    ['web', 'es5'],
  ];

  for (const target of targets) {
    it(`should work using "${target}" target`, async () => {
      const compiler = webpack({
        ...config,
        target,
        ...(target === false || target === 'es5'
          ? {
              output: { chunkFormat: 'array-push', path: '/' },
            }
          : {}),
      });
      const server = new Server({ port }, compiler);

      await server.start();

      const { page, browser } = await runBrowser();

      try {
        const pageErrors = [];
        const consoleMessages = [];

        page
          .on('console', (message) => {
            consoleMessages.push(message);
          })
          .on('pageerror', (error) => {
            pageErrors.push(error);
          });

        await page.goto(`http://127.0.0.1:${port}/`, {
          waitUntil: 'networkidle0',
        });

        expect(
          consoleMessages.map((message) => message.text()),
        ).toMatchSnapshot('console messages');

        // TODO: check why require is defined in theses target
        // if (
        //   target === "node" ||
        //   target === "async-node" ||
        //   target === "electron-main" ||
        //   target === "electron-preload" ||
        //   target === "electron-renderer" ||
        //   target === "nwjs" ||
        //   target === "node-webkit"
        // ) {
        //   console.log(pageErrors);
        //   const hasRequireOrGlobalError =
        //     pageErrors.filter((pageError) =>
        //       /require is not defined|global is not defined/.test(pageError),
        //     ).length === 1;

        //   expect(hasRequireOrGlobalError).toBe(true);
        // } else {
        //   expect(pageErrors).toMatchSnapshot("page errors");
        // }
      } finally {
        await browser.close();
        await server.stop();
      }
    });
  }

  it('should work using multi compiler mode with `web` and `webworker` targets', async () => {
    const compiler = webpack(workerConfig);
    const server = new Server({ port }, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];
      const consoleMessages = [];

      page
        .on('console', (message) => {
          consoleMessages.push(message);
        })
        .on('pageerror', (error) => {
          pageErrors.push(error);
        });

      await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: 'networkidle0',
      });

      expect(
        sortByTerm(
          consoleMessages.map((message) => message.text()),
          'Worker said:',
        ),
      ).toMatchSnapshot('console messages');

      expect(pageErrors).toMatchSnapshot('page errors');
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should work using multi compiler mode with `web` and `webworker` targets with `devServer: false`', async () => {
    const compiler = webpack(workerConfigDevServerFalse);
    const server = new Server(
      {
        port,
        static: {
          directory: path.resolve(
            __dirname,
            '../fixtures/worker-config-dev-server-false/public/',
          ),
        },
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];
      const consoleMessages = [];

      page
        .on('console', (message) => {
          consoleMessages.push(message);
        })
        .on('pageerror', (error) => {
          pageErrors.push(error);
        });

      await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: 'networkidle0',
      });

      expect(
        sortByTerm(
          consoleMessages.map((message) => message.text()),
          'Worker said:',
        ),
      ).toMatchSnapshot('console messages');

      expect(pageErrors).toMatchSnapshot('page errors');
    } finally {
      await browser.close();
      await server.stop();
    }
  });
});
