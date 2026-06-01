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

test('WorkspaceScanner treats exact known translation string literals as used keys', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'i18ntk-workbench-'));
  await fs.mkdir(path.join(rootPath, 'locales', 'en'), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'src'), { recursive: true });
  await fs.writeFile(path.join(rootPath, 'locales', 'en', 'duels.json'), JSON.stringify({
    duel: {
      created: 'Duel created',
      accepted: 'Duel accepted',
      unused: 'Unused'
    }
  }, null, 2));
  await fs.writeFile(path.join(rootPath, 'src', 'events.ts'), [
    'const created = "duel.created";',
    'const accepted = `duel.accepted`;'
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

  assert.deepEqual(result.unusedKeys.map((item) => item.key), ['duel.unused']);
});

test('WorkspaceScanner records locale JSON key ranges for locale diagnostics', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'i18ntk-workbench-'));
  await fs.mkdir(path.join(rootPath, 'locales', 'en'), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'src'), { recursive: true });
  await fs.writeFile(path.join(rootPath, 'locales', 'en', 'duels.json'), [
    '{',
    '  "duels": {',
    '    "create": {',
    '      "open_duels": {',
    '        "selected_title": "Selected",',
    '        "selected_cta": "Continue"',
    '      }',
    '    }',
    '  }',
    '}'
  ].join('\n'));
  await fs.writeFile(path.join(rootPath, 'src', 'App.tsx'), 'export const App = () => null;');

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

  const selectedTitle = result.unusedKeys.find((item) => item.key === 'duels.create.open_duels.selected_title');
  assert.deepEqual(selectedTitle?.range, { startLine: 4, startCharacter: 9, endLine: 4, endCharacter: 23 });
});

test('WorkspaceScanner accepts dot paths with snake_case segments for invalid-key diagnostics', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'i18ntk-workbench-'));
  await fs.mkdir(path.join(rootPath, 'locales'), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'src'), { recursive: true });
  await fs.writeFile(path.join(rootPath, 'locales', 'en.json'), JSON.stringify({
    home: { header: { nav: { my_duels: 'My duels' } } },
    markets: { detail: { prediction_summary: { sign_in_prompt: 'Sign in' } } },
    coming_soon: { form: { full_name_placeholder: 'Full name' } },
    Bad: { Key: 'Bad' }
  }));
  await fs.writeFile(path.join(rootPath, 'src', 'App.tsx'), 'export const App = () => null;');

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

  assert.deepEqual(result.invalidKeyNames.map((item) => item.key), ['Bad.Key']);
});
