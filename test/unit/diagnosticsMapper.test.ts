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
        filePath: '/workspace/locales/fr/common.json'
      }
    ],
    unusedKeys: [],
    invalidKeyNames: [],
    riskyContent: [],
    expansionRisks: []
  };

  const diagnostics = mapScanResultToDiagnostics(result);

  assert.equal(diagnostics.length, 2);
  assert.equal(diagnostics[0].message, 'Missing translation for key "checkout.payment.title" in: fr');
  assert.equal(diagnostics[1].severity, 'error');
});
