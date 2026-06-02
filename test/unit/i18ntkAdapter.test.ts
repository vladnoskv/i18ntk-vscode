import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { LocalI18ntkAdapter } from '../../src/services/i18ntkAdapter';
import { WorkspaceScanner } from '../../src/services/workspaceScanner';
import { ConsoleLogger } from '../../src/services/logger';
import { ResolvedI18ntkConfig } from '../../src/types';

test('LocalI18ntkAdapter returns normalized scan and report data', async () => {
  const rootPath = path.resolve(process.cwd(), 'test/fixtures/basic-react-i18n');
  const adapter = new LocalI18ntkAdapter(new WorkspaceScanner(new ConsoleLogger()), new ConsoleLogger());
  const config: ResolvedI18ntkConfig = {
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
  };

  const result = await adapter.scanWorkspace(rootPath, config);
  const report = await adapter.generateReport(result);

  assert.equal(result.sourceLocale, 'en');
  assert.equal(report.title, 'i18ntk Workbench Summary');
  assert.equal(report.markdown.includes('Missing Keys'), true);
});

test('LocalI18ntkAdapter does not run background CLI validation by default', async () => {
  const rootPath = path.resolve(process.cwd(), 'test/fixtures/basic-react-i18n');
  let cliRuns = 0;
  const adapter = new LocalI18ntkAdapter(new WorkspaceScanner(new ConsoleLogger()), new ConsoleLogger(), () => {
    cliRuns += 1;
  });
  const config: ResolvedI18ntkConfig = {
    rootPath,
    localeDirectory: path.join(rootPath, 'locales'),
    sourceLocale: 'en',
    keyStyle: 'dot',
    autoScanOnSave: false,
    autoScanOnFileChange: false,
    scanOnStartup: false,
    runCliValidationOnScan: false,
    showInlineDiagnostics: true,
    showHoverTranslations: true,
    reportFormat: 'webview',
    maxScanFiles: 5000,
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
    customWrappers: [],
    autoTranslateProvider: 'google',
    autoTranslateTargets: [],
    autoTranslateMode: 'onlyMissing'
  };

  await adapter.scanWorkspace(rootPath, config);

  assert.equal(cliRuns, 0);
});
