import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as {
  contributes?: {
    viewsContainers?: {
      activitybar?: Array<{ id: string; icon: string }>;
    };
    views?: Record<string, Array<{ id: string }>>;
  };
  scripts?: Record<string, string>;
};

test('manifest keeps Workbench as the single i18ntk Activity Bar owner', () => {
  assert.deepEqual(manifest.contributes?.viewsContainers?.activitybar, [
    {
      id: 'i18ntkWorkbench',
      title: 'i18ntk Workbench',
      icon: 'media/icon.png'
    }
  ]);
  assert.deepEqual(manifest.contributes?.views?.i18ntkWorkbench, [
    {
      id: 'i18ntk.localeHealth',
      name: 'Locale Health'
    }
  ]);
});

test('package scripts separate compile, unit tests, aggregate tests, verify, and package', () => {
  assert.equal(manifest.scripts?.compile, 'tsc -p .');
  assert.equal(manifest.scripts?.['test:compile'], 'tsc -p .');
  assert.equal(manifest.scripts?.['test:unit'], 'node --test out/test/unit/*.test.js');
  assert.equal(manifest.scripts?.test, 'npm run test:compile && npm run test:unit');
  assert.equal(manifest.scripts?.verify, 'npm test && npm run package');
  assert.equal(manifest.scripts?.package, 'vsce package');
});
