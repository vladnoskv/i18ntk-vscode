import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildAutoTranslateArgs, buildReportArgs, findI18ntkScript, getDirectoryLocaleLayout } from '../../src/services/i18ntkCliService';
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

test('findI18ntkScript recommends local npm install when the CLI is missing', () => {
  const missingRoot = path.resolve(process.cwd(), 'test/fixtures/does-not-exist');

  assert.equal(findI18ntkScript(missingRoot, 'i18ntk-translate.js'), undefined);
  assert.match(
    findI18ntkScript.installMessage,
    /npm install i18ntk/
  );
});

test('buildReportArgs requests stable report formats with locale config', () => {
  const rootPath = path.resolve(process.cwd(), 'test/fixtures/basic-react-i18n');
  const cfg = config(rootPath);
  const outDir = path.join(rootPath, 'i18ntk-reports');

  const args = buildReportArgs('C:/tools/i18ntk-report.js', cfg, {
    outDir,
    formats: ['json', 'markdown', 'html']
  });

  assert.deepEqual(args.slice(0, 4), ['C:/tools/i18ntk-report.js', '--json', '--markdown', '--html']);
  assert.equal(args.includes(`--source-dir=${rootPath}`), true);
  assert.equal(args.includes(`--i18n-dir=${cfg.localeDirectory}`), true);
  assert.equal(args.includes('--source-language=en'), true);
  assert.equal(args.includes(`--out=${outDir}`), true);
});
