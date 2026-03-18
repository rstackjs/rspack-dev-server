const path = require('node:path');
const fs = require('node:fs');
const { rspack } = require('@rspack/core');
const config = require('../fixtures/overlay-config/rspack.config');
const trustedTypesConfig = require('../fixtures/overlay-config/trusted-types.rspack.config');
const getPort = require('../helpers/get-port');
const runBrowser = require('../helpers/run-browser');
const basePort = require('../helpers/ports-map').overlay;
require('../helpers/normalize');

const { RspackDevServer: Server } = require('@rspack/dev-server');

class ErrorPlugin {
  constructor(message, skipCounter) {
    this.message =
      message || "Error from compilation. Can't find 'test' module.";
    this.skipCounter = skipCounter;
    this.counter = 0;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'errors-rspack-plugin',
      (compilation) => {
        if (
          typeof this.skipCounter !== 'undefined' &&
          this.counter !== this.skipCounter
        ) {
          this.counter += 1;

          return;
        }

        compilation.errors.push(new Error(this.message));
      },
    );
  }
}

class WarningPlugin {
  constructor(message, skipCounter) {
    this.message = message || 'Warning from compilation';
    this.skipCounter = skipCounter;
    this.counter = 0;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'warnings-rspack-plugin',
      (compilation) => {
        if (
          typeof this.skipCounter !== 'undefined' &&
          this.counter !== this.skipCounter
        ) {
          this.counter += 1;

          return;
        }

        compilation.warnings.push(new Error(this.message));
      },
    );
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let prettier;
let prettierHTML;
let prettierCSS;
let port;
const overlayFixturePath = path.resolve(
  __dirname,
  '../fixtures/overlay-config/foo.js',
);
const overlayFixtureCode = fs.readFileSync(overlayFixturePath);

const formatHtml = (html, normalize) =>
  prettier.format(normalize(html), {
    parser: 'html',
    plugins: [prettierHTML, prettierCSS],
  });

const formatPageHtml = (html) =>
  formatHtml(
    html,
    // Chromium serializes inserted iframes with slightly different empty text nodes across platforms.
    (value) => value.replace(/>\s+</g, '><'),
  );

const formatOverlayHtml = (html) => formatHtml(html, (value) => value);

describe('overlay', () => {
  beforeEach(async () => {
    port = await getPort(basePort);
  });

  afterEach(() => {
    fs.writeFileSync(overlayFixturePath, overlayFixtureCode);
  });

  beforeAll(async () => {
    // Due problems with ESM modules for Node.js@18
    // TODO replace it on import/require when Node.js@18 will be dropped
    prettier = require('../../node_modules/prettier/standalone');
    prettierHTML = require('../../node_modules/prettier/plugins/html');
    prettierCSS = require('../../node_modules/prettier/plugins/postcss');
  });

  it('should show a warning for initial compilation', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show an error for initial compilation', async () => {
    const compiler = rspack(config);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show a warning and error for initial compilation', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);
    new WarningPlugin().apply(compiler);
    new ErrorPlugin().apply(compiler);
    new ErrorPlugin().apply(compiler);
    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show an ansi formatted error for initial compilation', async () => {
    const compiler = rspack(config);

    new ErrorPlugin(
      '[0m [90m 18 |[39m           [33mRender[39m [33mansi formatted text[39m[0m',
    ).apply(compiler);

    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show a warning and error for initial compilation and protects against xss', async () => {
    const compiler = rspack(config);

    new WarningPlugin('<strong>strong</strong>').apply(compiler);
    new ErrorPlugin('<strong>strong</strong>').apply(compiler);

    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show initially, then show on an error, then hide on fix', async () => {
    const compiler = rspack(config);
    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    const pathToFile = path.resolve(
      __dirname,
      '../fixtures/overlay-config/foo.js',
    );
    const originalCode = fs.readFileSync(pathToFile);

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      let pageHtml = await page.evaluate(() => document.body.outerHTML);
      let overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html initial',
      );

      fs.writeFileSync(pathToFile, '`;');

      await page.waitForSelector('#rspack-dev-server-client-overlay');

      overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      pageHtml = await page.evaluate(() => document.body.outerHTML);

      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html with error',
      );
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );

      fs.writeFileSync(pathToFile, originalCode);

      await page.waitForSelector('#rspack-dev-server-client-overlay', {
        hidden: true,
      });

      await expect
        .poll(async () => {
          pageHtml = await page.evaluate(() => document.body.outerHTML);
          return pageHtml;
        })
        .toBeTypeOf('string');
      overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html after fix error',
      );
    } finally {
      fs.writeFileSync(pathToFile, originalCode);
      await browser.close();
      await server.stop();
    }
  });

  it('should not show initially, then show on an error, then show other error, then hide on fix', async () => {
    const compiler = rspack(config);
    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      let pageHtml = await page.evaluate(() => document.body.outerHTML);
      let overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html initial',
      );

      const pathToFile = path.resolve(
        __dirname,
        '../fixtures/overlay-config/foo.js',
      );
      const originalCode = fs.readFileSync(pathToFile);

      fs.writeFileSync(pathToFile, '`;');

      await page.waitForSelector('#rspack-dev-server-client-overlay');

      overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      pageHtml = await page.evaluate(() => document.body.outerHTML);

      let overlayFrame = await overlayHandle.contentFrame();
      let overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html with error',
      );
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );

      fs.writeFileSync(pathToFile, '`;a');

      await page.waitForSelector('#rspack-dev-server-client-overlay', {
        hidden: true,
      });
      await page.waitForSelector('#rspack-dev-server-client-overlay');

      overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      pageHtml = await page.evaluate(() => document.body.outerHTML);

      overlayFrame = await overlayHandle.contentFrame();
      overlayHtml = await overlayFrame.evaluate(() => document.body.outerHTML);

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html with other error',
      );
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );

      fs.writeFileSync(pathToFile, originalCode);

      await page.waitForSelector('#rspack-dev-server-client-overlay', {
        hidden: true,
      });

      pageHtml = await page.evaluate(() => document.body.outerHTML);
      overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html after fix error',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show initially, then show on an error and allow to close', async () => {
    const compiler = rspack(config);
    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      let pageHtml = await page.evaluate(() => document.body.outerHTML);
      let overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html initial',
      );

      const pathToFile = path.resolve(
        __dirname,
        '../fixtures/overlay-config/foo.js',
      );
      const originalCode = fs.readFileSync(pathToFile);

      fs.writeFileSync(pathToFile, '`;');

      await page.waitForSelector('#rspack-dev-server-client-overlay');

      overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      pageHtml = await page.evaluate(() => document.body.outerHTML);

      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html with error',
      );
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );

      const frame = await page
        .frames()
        .find((item) => item.name() === 'rspack-dev-server-client-overlay');

      const buttonHandle = await frame.$('button');

      await buttonHandle.click();

      await page.waitForSelector('#rspack-dev-server-client-overlay', {
        hidden: true,
      });

      pageHtml = await page.evaluate(() => document.body.outerHTML);
      overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot(
        'page html after close',
      );

      fs.writeFileSync(pathToFile, originalCode);
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should open editor when error with file info is clicked', async () => {
    const compiler = rspack(config);
    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    const pathToFile = path.resolve(
      __dirname,
      '../fixtures/overlay-config/foo.js',
    );
    const originalCode = fs.readFileSync(pathToFile);

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      fs.writeFileSync(pathToFile, '`;');

      await page.waitForSelector('#rspack-dev-server-client-overlay');

      const frame = page
        .frames()
        .find((item) => item.name() === 'rspack-dev-server-client-overlay');

      const openEditorResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/rspack-dev-server/open-editor?fileName='),
      );

      await frame.click('[data-can-open]');

      const openEditorResponse = await openEditorResponsePromise;

      expect(openEditorResponse.status()).toBe(200);
    } finally {
      fs.writeFileSync(pathToFile, originalCode);
      await browser.close();
      await server.stop();
    }
  });

  it('should not show a warning when "client.overlay" is "false"', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: false,
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show a warning when "client.overlay.warnings" is "false"', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          warnings: false,
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show warning when it is filtered', async () => {
    const compiler = rspack(config);

    new WarningPlugin('My special warning').apply(compiler);

    const server = new Server(
      {
        port,
        client: {
          overlay: {
            warnings: (error) => {
              return !error.message.includes('My special warning');
            },
          },
        },
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show warning when it is not filtered', async () => {
    const compiler = rspack(config);

    new WarningPlugin('Unfiltered warning').apply(compiler);

    const server = new Server(
      {
        port,
        client: {
          overlay: {
            warnings: () => true,
          },
        },
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show a warning when "client.overlay" is "true"', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: true,
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show a warning when "client.overlay.warnings" is "true"', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          warnings: true,
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show a warning when "client.overlay.errors" is "true"', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          errors: true,
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show an error when "client.overlay" is "false"', async () => {
    const compiler = rspack(config);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: false,
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show an error when "client.overlay.errors" is "false"', async () => {
    const compiler = rspack(config);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          errors: false,
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show error when it is filtered', async () => {
    const compiler = rspack(config);

    new ErrorPlugin('My special error').apply(compiler);

    const server = new Server(
      {
        port,
        client: {
          overlay: {
            errors: (error) => {
              return !error.message.includes('My special error');
            },
          },
        },
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show error when it is not filtered', async () => {
    const compiler = rspack(config);

    new ErrorPlugin('Unfiltered error').apply(compiler);

    const server = new Server(
      {
        port,
        client: {
          overlay: {
            errors: () => true,
          },
        },
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show an error when "client.overlay" is "true"', async () => {
    const compiler = rspack(config);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: true,
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show overlay when Trusted Types are enabled', async () => {
    const compiler = rspack(trustedTypesConfig);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          trustedTypesPolicyName: 'rspack#dev-overlay',
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message.text());
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(
        consoleMessages.filter((item) =>
          /requires 'TrustedHTML' assignment/.test(item),
        ),
      ).toHaveLength(0);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show overlay when Trusted Types are enabled and the "require-trusted-types-for \'script\'" header was used', async () => {
    const compiler = rspack(trustedTypesConfig);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "require-trusted-types-for 'script'",
        },
      ],
      client: {
        overlay: {
          trustedTypesPolicyName: 'rspack#dev-overlay',
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message.text());
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      expect(
        consoleMessages.filter((item) =>
          /requires 'TrustedHTML' assignment/.test(item),
        ),
      ).toHaveLength(0);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show overlay when Trusted Types are enabled, but policy is not allowed', async () => {
    const compiler = rspack(trustedTypesConfig);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          trustedTypesPolicyName: 'disallowed-policy',
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      expect(overlayHandle).toBe(null);
      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show an error when "client.overlay.errors" is "true"', async () => {
    const compiler = rspack(config);

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          errors: true,
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show an error when "client.overlay.warnings" is "true"', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = {
      port,
      client: {
        overlay: {
          warnings: true,
        },
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show a warning and hide them after closing connection', async () => {
    const compiler = rspack(config);

    new WarningPlugin().apply(compiler);

    const devServerOptions = { port };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message.text());
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );

      await server.stop();

      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (consoleMessages.includes('[rspack-dev-server] Disconnected!')) {
            clearInterval(interval);

            resolve();
          }
        }, 100);
      });

      const pageHtmlAfterClose = await page.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtmlAfterClose)).toMatchSnapshot(
        'page html',
      );
    } finally {
      await browser.close();
    }
  });

  it('should show an error after invalidation', async () => {
    const compiler = rspack(config);

    new ErrorPlugin('Error from compilation', 1).apply(compiler);

    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      await new Promise((resolve) => {
        server.middleware.invalidate(() => {
          resolve();
        });
      });

      await new Promise((resolve) => {
        server.middleware.waitUntilValid(() => {
          resolve();
        });
      });

      // Delay for the overlay to appear
      await delay(1000);

      await page.waitForSelector('#rspack-dev-server-client-overlay');

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show a warning after invalidation', async () => {
    const compiler = rspack(config);

    new WarningPlugin('Warning from compilation', 1).apply(compiler);

    const devServerOptions = {
      port,
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      await new Promise((resolve) => {
        server.middleware.invalidate(() => {
          resolve();
        });
      });

      await new Promise((resolve) => {
        server.middleware.waitUntilValid(() => {
          resolve();
        });
      });

      // Delay for the overlay to appear
      await delay(1000);

      await page.waitForSelector('#rspack-dev-server-client-overlay');

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show error for uncaught runtime error', async () => {
    const compiler = rspack(config);

    const server = new Server(
      {
        port,
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      await page.addScriptTag({
        content: `(function throwError() {
        throw new Error('Injected error');
      })();`,
      });

      // Delay for the overlay to appear
      await delay(1000);

      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show filtered runtime error', async () => {
    const compiler = rspack(config);

    const server = new Server(
      {
        port,
        client: {
          overlay: {
            runtimeErrors: (error) => error && !/Injected/.test(error.message),
          },
        },
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      await page.addScriptTag({
        content: `(function throwError() {
        throw new Error('Injected error');
      })();`,
      });

      // Delay for the overlay to appear
      await delay(1000);

      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show error for uncaught promise rejection', async () => {
    const compiler = rspack(config);

    const server = new Server(
      {
        port,
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      await page.addScriptTag({
        content: `(function throwError() {
        setTimeout(function () {
          Promise.reject(new Error('Async error'));
        }, 0);
      })();`,
      });

      // Delay for the overlay to appear
      await delay(1000);

      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should not show filtered promise rejection', async () => {
    const compiler = rspack(config);

    const server = new Server(
      {
        port,
        client: {
          overlay: {
            runtimeErrors: (error) => !/Injected/.test(error.message),
          },
        },
      },
      compiler,
    );

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      await page.addScriptTag({
        content: `(function throwError() {
        setTimeout(function () {
          Promise.reject(new Error('Injected async error'));
        }, 0);
      })();`,
      });

      // Delay for the overlay to appear
      await delay(1000);

      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');

      expect(overlayHandle).toBe(null);
    } finally {
      await browser.close();
      await server.stop();
    }
  });

  it('should show overlay when "Content-Security-Policy" is "default-src \'self\'" was used', async () => {
    const compiler = rspack({ ...config, devtool: false });

    new ErrorPlugin().apply(compiler);

    const devServerOptions = {
      port,
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'",
        },
      ],
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    const { page, browser } = await runBrowser();

    try {
      const consoleMessages = [];

      page.on('console', (message) => {
        consoleMessages.push(message.text());
      });

      await page.goto(`http://localhost:${port}/`, {
        waitUntil: 'networkidle0',
      });

      // Delay for the overlay to appear
      await delay(1000);

      const pageHtml = await page.evaluate(() => document.body.outerHTML);
      const overlayHandle = await page.$('#rspack-dev-server-client-overlay');
      const overlayFrame = await overlayHandle.contentFrame();
      const overlayHtml = await overlayFrame.evaluate(
        () => document.body.outerHTML,
      );

      expect(await formatPageHtml(pageHtml)).toMatchSnapshot('page html');
      expect(await formatOverlayHtml(overlayHtml)).toMatchSnapshot(
        'overlay html',
      );
    } finally {
      await browser.close();
      await server.stop();
    }
  });
});
