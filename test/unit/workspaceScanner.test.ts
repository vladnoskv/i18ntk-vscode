import test from 'node:test';
import assert from 'node:assert/strict';
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
