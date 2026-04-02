const HTMLContentForIndex = (styleTags = '') => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset='UTF-8'>
    <title>rspack-dev-server</title>
    ${styleTags}
  </head>
  <body>
    <h1>rspack-dev-server is running...</h1>
    <script type="text/javascript" charset="utf-8" src="/main.js"></script>
  </body>
</html>
`;

const HTMLContentForAssets = (assetName) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset='UTF-8'>
    <title>rspack-dev-server</title>
  </head>
  <body>
    <h1>(${assetName}>)rspack-dev-server is running...</h1>
    <script type="text/javascript" charset="utf-8" src=${assetName}></script>
  </body>
</html>
`;

const HTMLContentForTest = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset='UTF-8'>
    <title>test</title>
  </head>
  <body>
    <h1>Created via HTMLGeneratorPlugin</h1>
  </body>
</html>
`;

module.exports = class HTMLGeneratorPlugin {
  // eslint-disable-next-line class-methods-use-this
  apply(compiler) {
    const pluginName = 'html-generator-plugin';

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      const { RawSource } = compiler.rspack.sources;

      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: compiler.rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          const testSource = new RawSource(HTMLContentForTest);
          const assets = compilation.getAssets();
          const styleTags = assets
            .filter((asset) => asset.name.endsWith('.css'))
            .map((asset) => `<link rel="stylesheet" href="/${asset.name}" />`)
            .join('\n    ');
          const indexSource = new RawSource(HTMLContentForIndex(styleTags));

          compilation.emitAsset('index.html', indexSource);
          compilation.emitAsset('test.html', testSource);

          for (const asset of assets) {
            const assetName = asset.name;

            if (assetName !== 'main.js' && assetName.endsWith('.js')) {
              const assetSource = new RawSource(
                HTMLContentForAssets(assetName),
              );
              compilation.emitAsset(
                assetName.replace('.js', '.html'),
                assetSource,
              );
            }
          }
        },
      );
    });
  }
};
