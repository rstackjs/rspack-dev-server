const { rspack } = require('@rspack/core');
const { RspackDevServer: Server } = require('@rspack/dev-server');
const config = require('../fixtures/client-config/rspack.config');
const HTMLGeneratorPlugin = require('../helpers/html-generator-plugin');
const runBrowser = require('../helpers/run-browser');
const port = require('../helpers/ports-map').stats;

global.console.log = rs.fn();

describe('stats', () => {
  const cases = [
    {
      title: 'should work when "stats" is not specified',
      rspackOptions: {},
    },
    {
      title: 'should work using "{}" value for the "stats" option',
      rspackOptions: {
        stats: {},
      },
    },
    {
      title: 'should work using "undefined" value for the "stats" option',
      rspackOptions: {
        // eslint-disable-next-line no-undefined
        stats: undefined,
      },
    },
    {
      title: 'should work using "false" value for the "stats" option',
      rspackOptions: {
        stats: false,
      },
    },
    {
      title: 'should work using "errors-only" value for the "stats" option',
      rspackOptions: {
        stats: 'errors-only',
      },
    },
    {
      title:
        'should work using "{ assets: false }" value for the "stats" option',
      rspackOptions: {
        stats: {
          assets: false,
        },
      },
    },
    // TODO: support object `config.stats.colors`
    // {
    //   title:
    //     'should work using "{ assets: false }" value for the "stats" option',
    //   rspackOptions: {
    //     stats: {
    //       colors: {
    //         green: "\u001b[32m",
    //       },
    //     },
    //   },
    // },
    // `config.stats.warningsFilter` is deprecated in favor of config.ignoreWarnings
    // {
    //   title:
    //     'should work using "{ warningsFilter: \'test\' }" value for the "stats" option',
    //   rspackOptions: {
    //     plugins: [
    //       {
    //         apply(compiler) {
    //           compiler.hooks.thisCompilation.tap(
    //             "warnings-rspack-plugin",
    //             (compilation) => {
    //               compilation.warnings.push(
    //                 new Error("Warning from compilation"),
    //               );
    //             },
    //           );
    //         },
    //       },
    //       new HTMLGeneratorPlugin(),
    //     ],
    //     stats: { warningsFilter: /Warning from compilation/ },
    //   },
    // },
  ];

  if (rspack.version.startsWith('5')) {
    cases.push({
      title: 'should work and respect the "ignoreWarnings" option',
      rspackOptions: {
        plugins: [
          {
            apply(compiler) {
              compiler.hooks.thisCompilation.tap(
                'warnings-rspack-plugin',
                (compilation) => {
                  compilation.warnings.push(
                    new Error('Warning from compilation'),
                  );
                },
              );
            },
          },
          new HTMLGeneratorPlugin(),
        ],
        ignoreWarnings: [/Warning from compilation/],
      },
    });
  }

  for (const testCase of cases) {
    it(testCase.title, async () => {
      const compiler = rspack({ ...config, ...testCase.rspackOptions });
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

        expect(
          consoleMessages.map((message) => message.text()),
        ).toMatchSnapshot();
      } finally {
        await browser.close();
        await server.stop();
      }
    });
  }
});
