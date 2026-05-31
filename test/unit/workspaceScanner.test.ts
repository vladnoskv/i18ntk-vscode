import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WorkspaceScanner } from '../../src/services/workspaceScanner';
import { ConsoleLogger } from '../../src/services/logger';

test('WorkspaceScanner detects locales, usages, missing keys, and placeholder mismatch', async () => {
  const rootPath = path.resolve(process.cwd(), 'test/fixtures/basic-react-i18n');
  const scanner = new WorkspaceScanner(new ConsoleLogger());

  const result = await scanner.scan(rootPath, {
    rootPath,
    localeDirectory: path.join(rootPath, 'locales'),
    sourceLocale: 'en',
    keyStyle: 'dot',
    autoScanOnSave: false,
    showInlineDiagnostics: true,
    showHoverTranslations: true,
    reportFormat: 'webview',
    maxScanFiles: 5000,
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
    customWrappers: [],
    autoTranslateProvider: 'google',
    autoTranslateTargets: [],
    autoTranslateMode: 'onlyMissing'
  });

  assert.deepEqual(result.locales.sort(), ['en', 'fr']);
  assert.equal(result.missingKeys.some((item) => item.key === 'checkout.payment.title' && item.locale === 'fr'), true);
  assert.equal(result.placeholderMismatches.some((item) => item.key === 'cart.items'), true);
  assert.equal(result.sourceUsages.some((item) => item.key === 'common.save'), true);
});

test('WorkspaceScanner treats imported namespace object property reads as used keys', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'i18ntk-workbench-'));
  await fs.mkdir(path.join(rootPath, 'locales', 'en'), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'locales', 'fr'), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'src'), { recursive: true });
  await fs.writeFile(path.join(rootPath, 'locales', 'en', 'common.json'), JSON.stringify({
    save: 'Save',
    actions: { retry: 'Retry' },
    unused: 'Unused'
  }));
  await fs.writeFile(path.join(rootPath, 'locales', 'fr', 'common.json'), JSON.stringify({
    save: 'Enregistrer',
    actions: { retry: 'Reessayer' }
  }));
  await fs.writeFile(path.join(rootPath, 'src', 'App.tsx'), [
    'import common from "../locales/en/common.json";',
    'const save = common.save;',
    'const retry = common.actions.retry;'
  ].join('\n'));

  const scanner = new WorkspaceScanner(new ConsoleLogger());
  const result = await scanner.scan(rootPath, {
    rootPath,
    localeDirectory: path.join(rootPath, 'locales'),
    sourceLocale: 'en',
    keyStyle: 'dot',
    autoScanOnSave: false,
    showInlineDiagnostics: true,
    showHoverTranslations: true,
    reportFormat: 'webview',
    maxScanFiles: 5000,
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
    customWrappers: [],
    autoTranslateProvider: 'google',
    autoTranslateTargets: [],
    autoTranslateMode: 'onlyMissing'
  });

  assert.deepEqual(result.missingKeys, []);
  assert.deepEqual(result.unusedKeys.map((item) => item.key), ['unused']);
});
