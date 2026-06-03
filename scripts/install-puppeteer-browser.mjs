import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const cliPath = require.resolve('puppeteer/lib/cjs/puppeteer/node/cli.js');

const getChromeBuildDirectory = (executablePath) => {
  const parts = executablePath.split(path.sep);
  const chromeIndex = parts.lastIndexOf('chrome');

  if (chromeIndex === -1 || chromeIndex + 1 >= parts.length) {
    return null;
  }

  return parts.slice(0, chromeIndex + 2).join(path.sep);
};

const ensureCleanChromeCache = async () => {
  const executablePath = puppeteer.executablePath();

  if (existsSync(executablePath)) {
    return executablePath;
  }

  const buildDirectory = getChromeBuildDirectory(executablePath);

  if (buildDirectory) {
    await rm(buildDirectory, { force: true, recursive: true });
  }

  return executablePath;
};

const expectedExecutablePath = await ensureCleanChromeCache();

if (!existsSync(expectedExecutablePath)) {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'browsers', 'install', 'chrome'],
    {
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const executablePath = puppeteer.executablePath();

if (!existsSync(executablePath)) {
  console.error(`Puppeteer Chrome executable was not found: ${executablePath}`);
  process.exit(1);
}

console.log(`Puppeteer Chrome executable: ${executablePath}`);
