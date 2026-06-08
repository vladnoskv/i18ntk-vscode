import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as {
  contributes?: {
    configuration?: {
      properties?: Record<string, unknown>;
    };
    viewsContainers?: {
      activitybar?: Array<{ id: string; icon: string }>;
    };
    views?: Record<string, Array<{ id: string }>>;
    walkthroughs?: Array<{
      steps: Array<{
        media?: { markdown?: string };
        description?: string;
        completionEvents?: string[];
      }>;
    }>;
  };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

test('manifest keeps Workbench as the single i18ntk Activity Bar owner', () => {
  assert.deepEqual(manifest.contributes?.viewsContainers?.activitybar, [
    {
      id: 'i18ntkWorkbench',
      title: 'i18ntk Workbench',
      icon: 'media/icon.svg'
    }
  ]);
  assert.deepEqual(manifest.contributes?.views?.i18ntkWorkbench, [
    {
      id: 'i18ntk.localeHealth',
      name: 'Locale Health'
    }
  ]);
});

test('manifest exposes diagnostic severity and ignore settings', () => {
  const properties = manifest.contributes?.configuration?.properties as Record<string, any>;
  assert.equal(properties?.['i18ntk.diagnosticSeverities']?.default?.['i18ntk.expansionRisk'], 'off');
  assert.deepEqual(properties?.['i18ntk.diagnosticSeverities']?.additionalProperties?.enum, ['error', 'warning', 'off', 'ignore']);
  assert.deepEqual(properties?.['i18ntk.ignoredDiagnostics']?.default, []);
});

test('manifest exposes extension UI language setting', () => {
  const properties = manifest.contributes?.configuration?.properties as Record<string, any>;
  assert.equal(properties?.['i18ntk.extensionLanguage']?.default, 'auto');
  assert.deepEqual(properties?.['i18ntk.extensionLanguage']?.enum, ['auto', 'en', 'es', 'fr', 'de']);
});

test('manifest keeps automatic scans and extra CLI validation disabled by default', () => {
  const properties = manifest.contributes?.configuration?.properties as Record<string, any>;
  assert.equal(properties?.['i18ntk.scanOnStartup']?.default, false);
  assert.equal(properties?.['i18ntk.autoScanOnSave']?.default, false);
  assert.equal(properties?.['i18ntk.autoScanOnFileChange']?.default, false);
  assert.equal(properties?.['i18ntk.runCliValidationOnScan']?.default, false);
});

test('package scripts separate compile, locale asset copy, unit tests, aggregate tests, verify, and package', () => {
  assert.equal(manifest.scripts?.compile, 'tsc -p . && node scripts/copy-i18ntk-locales.js');
  assert.equal(manifest.scripts?.['test:compile'], 'tsc -p . && node scripts/copy-i18ntk-locales.js');
  assert.equal(manifest.scripts?.['test:unit'], 'node --test out/test/unit/*.test.js');
  assert.equal(manifest.scripts?.test, 'npm run test:compile && npm run test:unit');
  assert.equal(manifest.scripts?.verify, 'npm test && npm run package');
  assert.equal(manifest.scripts?.package, 'vsce package --out ../i18ntk-workbench-1.2.3.vsix');
  assert.ok(manifest.dependencies?.i18ntk);
  assert.ok(manifest.devDependencies?.['@vscode/vsce']);
  assert.equal(manifest.devDependencies?.vsce, undefined);
});

test('manifest includes extension locale assets in the package', () => {
  assert.equal(manifest.dependencies?.i18ntk, 'file:../i18ntk-4.4.5.tgz');
});

test('walkthrough markdown media uses package files without heading fragments', () => {
  const walkthroughs = manifest.contributes?.walkthroughs ?? [];
  assert.equal(walkthroughs.length, 1);
  const steps = walkthroughs[0]?.steps ?? [];
  assert.equal(steps.length, 5);

  for (const step of steps) {
    const markdownPath = step.media?.markdown;
    if (typeof markdownPath !== 'string') {
      throw new Error('walkthrough step should reference markdown media');
    }
    assert.equal(markdownPath.includes('#'), false, `${markdownPath} should not include a heading fragment`);
    assert.equal(fs.existsSync(path.resolve(process.cwd(), markdownPath)), true, `${markdownPath} should exist`);
    assert.ok(step.description?.includes('command:'), 'walkthrough step should expose an action button');
    assert.ok(step.completionEvents?.length, 'walkthrough step should define completion events');
  }
});
