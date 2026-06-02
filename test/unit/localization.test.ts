import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { t, formatTemplate, getAvailableExtensionLanguages, getExtensionLanguage, setExtensionLanguage } from '../../src/i18ntk/localization';

test('Workbench localization uses i18ntk runtime locale files', () => {
  setExtensionLanguage('en');
  assert.equal(t('workbench.messages.workspaceRequired'), 'i18ntk Workbench requires an open workspace.');
});

test('Workbench localization interpolates parameters', () => {
  setExtensionLanguage('en');
  assert.equal(
    t('workbench.messages.scanComplete', {
      locales: 2,
      missing: 3,
      placeholders: 1,
      unused: 4
    }),
    'i18ntk scan complete: 2 locales, 3 missing keys, 1 placeholder issues, 4 unused keys.'
  );
});

test('Workbench localization falls back to explicit default text for missing keys', () => {
  setExtensionLanguage('en');
  assert.equal(t('missing.key', {}, 'fallback text'), 'fallback text');
});

test('formatTemplate mirrors i18ntk runtime interpolation tokens', () => {
  assert.equal(formatTemplate('Saved to {path}', { path: path.normalize('tmp/report.md') }), `Saved to ${path.normalize('tmp/report.md')}`);
});

test('Workbench localization can switch extension UI language', () => {
  setExtensionLanguage('es');
  assert.equal(getExtensionLanguage(), 'es');
  assert.equal(t('workbench.messages.workspaceRequired'), 'i18ntk Workbench requiere un espacio de trabajo abierto.');

  setExtensionLanguage('fr');
  assert.equal(t('workbench.titles.scanProgress'), 'Analyse de l’espace de travail avec i18ntk Workbench');
});

test('Workbench localization exposes supported extension UI languages', () => {
  assert.deepEqual(getAvailableExtensionLanguages().sort(), ['de', 'en', 'es', 'fr']);
});

test('Workbench extension locale files cover every English key', () => {
  assertLocalesCoverEnglish(path.resolve(process.cwd(), 'src/i18ntk/locales'));
});

function assertLocalesCoverEnglish(localeDir: string): void {
  const english = JSON.parse(fs.readFileSync(path.join(localeDir, 'en.json'), 'utf8'));
  const englishKeys = flattenKeys(english);
  const englishPlaceholders = flattenPlaceholders(english);

  for (const language of getAvailableExtensionLanguages().filter((item: string) => item !== 'en')) {
    const localized = JSON.parse(fs.readFileSync(path.join(localeDir, `${language}.json`), 'utf8'));
    assert.deepEqual(flattenKeys(localized), englishKeys, `${language}.json must cover the same keys as en.json`);
    assert.deepEqual(flattenPlaceholders(localized), englishPlaceholders, `${language}.json must preserve placeholders from en.json`);
  }
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

function flattenPlaceholders(value: unknown, prefix = ''): Record<string, string[]> {
  if (typeof value === 'string') {
    return { [prefix]: [...value.matchAll(/\{\{?\w+\}?\}/g)].map((match) => match[0]).sort() };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      Object.entries(flattenPlaceholders(child, prefix ? `${prefix}.${key}` : key))
    )
  );
}
