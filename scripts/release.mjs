import path from 'node:path';
import * as url from 'node:url';
import { $ } from 'execa';
import fs from 'fs-extra';
import { inc } from 'semver';

const RELEASE_TAG = process.env.TAG || 'beta';
const RELEASE_DRY_RUN = process.env.DRY_RUN || 'true';
const RELEASE_VERSION_TYPE = process.env.VERSION || 'prerelease';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const PKG_PATH = path.resolve(__dirname, '../package.json');
const pkg = fs.readJsonSync(PKG_PATH);
const currentVersion = pkg.version;
const nextVersion = inc(currentVersion, RELEASE_VERSION_TYPE);
if (!nextVersion) {
  throw new Error(
    `Failed to generate next version from "${currentVersion}" with type "${RELEASE_VERSION_TYPE}"`,
  );
}

console.info(`Release ${RELEASE_TAG} version ${nextVersion}`);

// Update pkg version
console.info(`Updating version from ${currentVersion} to ${nextVersion}`);
pkg.version = nextVersion;
fs.writeJsonSync(PKG_PATH, pkg, { spaces: 2 });

// Publish to npm
console.info(`Publishing to npm with tag ${RELEASE_TAG}`);
const dryRun = RELEASE_DRY_RUN === 'true' ? ['--dry-run'] : [];
try {
  await $`pnpm publish ${dryRun} --tag ${RELEASE_TAG} --no-git-checks --provenance`;
  console.info('Published successfully');
} catch (e) {
  console.error(`Publish failed: ${e.message}`);
  process.exit(1);
} finally {
}

// Push tag to github
if (RELEASE_DRY_RUN !== 'true') {
  console.info('Pushing tag to github');
  const tagName = `v${nextVersion}`;
  try {
    await $`git config --global --add safe.directory /github/workspace`;
    await $`git config --global user.name "github-actions[bot]"`;
    await $`git config --global user.email "github-actions[bot]@users.noreply.github.com"`;
    await $`git status`;
    await $`git tag ${tagName}`;
    await $`git push origin ${tagName}`;
    console.info('Pushed tag successfully');
  } catch (e) {
    console.error(`Push tag failed: ${e.message}`);
    process.exit(1);
  }

  try {
    await $`git add --all`;
    const commitMsg = `release ${tagName}`;
    await $`git commit -m ${commitMsg}`;
    await $`git push`;
    console.info('Pushed branch successfully');
  } catch (e) {
    console.error(`Update branch failed: ${e.message}`);
    process.exit(1);
  }
}

console.info('Release completed');
