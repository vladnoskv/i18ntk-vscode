import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildAutoTranslateArgs, getDirectoryLocaleLayout } from '../../src/services/i18ntkCliService';
import { ResolvedI18ntkConfig } from '../../src/types';

function config(rootPath: string): ResolvedI18ntkConfig {
  return {
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
    autoTranslateTargets: ['fr'],
    autoTranslateMode: 'onlyMissing'
  };
}

test('buildAutoTranslateArgs uses i18ntk translate in non-interactive placeholder-safe mode', () => {
  const rootPath = path.resolve(process.cwd(), 'test/fixtures/basic-react-i18n');
  const cfg = config(rootPath);
  const layout = getDirectoryLocaleLayout(cfg);
  assert.notEqual(layout, undefined);

  const args = buildAutoTranslateArgs('C:/tools/i18ntk-translate.js', layout!, 'fr', {
    provider: 'google',
    mode: 'onlyMissing',
    dryRun: false
  });

  assert.equal(args[0], 'C:/tools/i18ntk-translate.js');
  assert.equal(args.includes('fr'), true);
  assert.equal(args.includes('--source-dir'), true);
  assert.equal(args.includes(path.join(rootPath, 'locales', 'en')), true);
  assert.equal(args.includes('--output-dir'), true);
  assert.equal(args.includes(path.join(rootPath, 'locales', 'fr')), true);
  assert.equal(args.includes('--no-confirm'), true);
  assert.equal(args.includes('--preserve-placeholders'), true);
  assert.equal(args.includes('--only-missing'), true);
  assert.equal(args.includes('--report-stdout'), true);
});

test('buildAutoTranslateArgs can request dry-run translate-all mode', () => {
  const rootPath = path.resolve(process.cwd(), 'test/fixtures/basic-react-i18n');
  const layout = getDirectoryLocaleLayout(config(rootPath));
  assert.notEqual(layout, undefined);

  const args = buildAutoTranslateArgs('C:/tools/i18ntk-translate.js', layout!, 'es', {
    provider: 'deepl',
    mode: 'translateAll',
    dryRun: true
  });

  assert.equal(args.includes('--provider'), true);
  assert.equal(args.includes('deepl'), true);
  assert.equal(args.includes('--translate-all'), true);
  assert.equal(args.includes('--dry-run'), true);
});
