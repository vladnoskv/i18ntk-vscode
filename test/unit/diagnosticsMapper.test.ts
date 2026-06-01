import test from 'node:test';
import assert from 'node:assert/strict';
import { mapScanResultToDiagnostics } from '../../src/diagnostics/diagnosticsMapper';
import { I18nScanResult } from '../../src/types';

test('mapScanResultToDiagnostics maps missing keys and placeholder mismatches', () => {
  const result: I18nScanResult = {
    rootPath: '/workspace',
    sourceLocale: 'en',
    localeDirectory: '/workspace/locales',
    scannedAt: '2026-05-31T00:00:00.000Z',
    locales: ['en', 'fr'],
    totalKeys: 1,
    healthScore: 50,
    localeFiles: [],
    keyValues: {},
    sourceUsages: [
      {
        key: 'checkout.payment.title',
        filePath: '/workspace/src/app.ts',
        range: { startLine: 0, startCharacter: 16, endLine: 0, endCharacter: 38 }
      }
    ],
    missingKeys: [
      {
        key: 'checkout.payment.title',
        locale: 'fr',
        sourceFilePath: '/workspace/src/app.ts',
        sourceRange: { startLine: 0, startCharacter: 16, endLine: 0, endCharacter: 38 }
      }
    ],
    placeholderMismatches: [
      {
        key: 'cart.items',
        locale: 'fr',
        sourceValue: 'You have {count} items',
        targetValue: 'Articles',
        missing: ['{count}'],
        extra: [],
        filePath: '/workspace/locales/fr/common.json',
        range: { startLine: 4, startCharacter: 6, endLine: 4, endCharacter: 11 }
      }
    ],
    unusedKeys: [
      {
        key: 'history.filters.symbol_placeholder',
        locale: 'en',
        confidence: 0.8,
        filePath: '/workspace/locales/en/history.json',
        range: { startLine: 10, startCharacter: 7, endLine: 10, endCharacter: 25 }
      }
    ],
    invalidKeyNames: [
      {
        key: 'Bad.Key',
        expectedStyle: 'dot',
        filePath: '/workspace/locales/en/common.json',
        range: { startLine: 2, startCharacter: 5, endLine: 2, endCharacter: 8 }
      }
    ],
    riskyContent: [
      {
        key: 'history.hero.tooltip',
        locale: 'fr',
        filePath: '/workspace/locales/fr/history.json',
        range: { startLine: 7, startCharacter: 7, endLine: 7, endCharacter: 14 },
        message: 'Value contains URL or email content that should be reviewed.',
        severity: 'info'
      }
    ],
    expansionRisks: [
      {
        key: 'history.hero.subtitle',
        locale: 'fr',
        sourceLength: 10,
        targetLength: 20,
        expansionPercent: 100,
        filePath: '/workspace/locales/fr/history.json',
        range: { startLine: 6, startCharacter: 7, endLine: 6, endCharacter: 15 }
      }
    ]
  };

  const diagnostics = mapScanResultToDiagnostics(result);

  assert.equal(diagnostics.length, 6);
  assert.equal(diagnostics[0].message, 'Missing translation for key "checkout.payment.title" in: fr');
  assert.equal(diagnostics[1].severity, 'error');
  assert.deepEqual(diagnostics[1].range, { startLine: 4, startCharacter: 6, endLine: 4, endCharacter: 11 });
  assert.equal(diagnostics[2].code, 'i18ntk.invalidKeyName');
  assert.deepEqual(diagnostics[2].range, { startLine: 2, startCharacter: 5, endLine: 2, endCharacter: 8 });
  assert.equal(diagnostics[3].code, 'i18ntk.unusedKey');
  assert.deepEqual(diagnostics[3].range, { startLine: 10, startCharacter: 7, endLine: 10, endCharacter: 25 });
  assert.equal(diagnostics[4].code, 'i18ntk.riskyContent');
  assert.deepEqual(diagnostics[4].range, { startLine: 7, startCharacter: 7, endLine: 7, endCharacter: 14 });
  assert.equal(diagnostics[5].code, 'i18ntk.expansionRisk');
  assert.deepEqual(diagnostics[5].range, { startLine: 6, startCharacter: 7, endLine: 6, endCharacter: 15 });
});
