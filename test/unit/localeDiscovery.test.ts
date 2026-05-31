import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectLocaleDirectory, inspectLocaleDirectory } from '../../src/config/localeDiscovery';

async function withTempWorkspace(run: (rootPath: string) => Promise<void>): Promise<void> {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'i18ntk-vscode-'));
  try {
    await run(rootPath);
  } finally {
    await fs.rm(rootPath, { recursive: true, force: true });
  }
}

test('detectLocaleDirectory chooses a common locale root that contains locale json files', async () => {
  await withTempWorkspace(async (rootPath) => {
    await fs.mkdir(path.join(rootPath, 'locales', 'en'), { recursive: true });
    await fs.writeFile(path.join(rootPath, 'locales', 'en', 'common.json'), '{"hello":"Hello"}\n', 'utf8');

    const detected = await detectLocaleDirectory(rootPath);

    assert.equal(detected.found, true);
    assert.equal(detected.source, 'auto-detected');
    assert.equal(detected.localeDirectory, path.join(rootPath, 'locales'));
    assert.equal(detected.relativeLocaleDirectory, 'locales');
    assert.equal(detected.localeFileCount, 1);
  });
});

test('detectLocaleDirectory searches nested project folders for locale roots', async () => {
  await withTempWorkspace(async (rootPath) => {
    await fs.mkdir(path.join(rootPath, 'apps', 'web', 'public', 'locales', 'fr'), { recursive: true });
    await fs.writeFile(path.join(rootPath, 'apps', 'web', 'public', 'locales', 'fr', 'common.json'), '{"hello":"Bonjour"}\n', 'utf8');

    const detected = await detectLocaleDirectory(rootPath);

    assert.equal(detected.found, true);
    assert.equal(detected.localeDirectory, path.join(rootPath, 'apps', 'web', 'public', 'locales'));
    assert.equal(detected.relativeLocaleDirectory, 'apps/web/public/locales');
  });
});

test('detectLocaleDirectory reports unfound instead of treating a missing fallback as detected', async () => {
  await withTempWorkspace(async (rootPath) => {
    const detected = await detectLocaleDirectory(rootPath);

    assert.equal(detected.found, false);
    assert.equal(detected.source, 'fallback');
    assert.equal(detected.localeDirectory, path.join(rootPath, 'locales'));
    assert.equal(detected.localeFileCount, 0);
  });
});

test('inspectLocaleDirectory recognizes flat and directory-per-locale layouts', async () => {
  await withTempWorkspace(async (rootPath) => {
    const localeDirectory = path.join(rootPath, 'i18n');
    await fs.mkdir(path.join(localeDirectory, 'de'), { recursive: true });
    await fs.writeFile(path.join(localeDirectory, 'en.json'), '{"hello":"Hello"}\n', 'utf8');
    await fs.writeFile(path.join(localeDirectory, 'de', 'common.json'), '{"hello":"Hallo"}\n', 'utf8');

    const inspected = await inspectLocaleDirectory(localeDirectory);

    assert.equal(inspected.exists, true);
    assert.equal(inspected.localeFileCount, 2);
    assert.deepEqual(inspected.locales.sort(), ['de', 'en']);
  });
});
