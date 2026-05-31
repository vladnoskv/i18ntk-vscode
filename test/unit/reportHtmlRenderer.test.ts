import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReportHtml } from '../../src/webview/reportHtmlRenderer';
import { I18nReport } from '../../src/types';

test('renderReportHtml escapes dynamic report content', () => {
  const report: I18nReport = {
    title: '<script>alert(1)</script>',
    markdown: '# Report',
    result: {
      rootPath: '/workspace',
      sourceLocale: 'en',
      localeDirectory: '/workspace/locales',
      scannedAt: '2026-05-31T00:00:00.000Z',
      locales: ['en'],
      totalKeys: 1,
      healthScore: 100,
      localeFiles: [],
      keyValues: {},
      sourceUsages: [],
      missingKeys: [{ key: '<img src=x onerror=alert(1)>', locale: 'fr' }],
      placeholderMismatches: [],
      unusedKeys: [],
      invalidKeyNames: [],
      riskyContent: [],
      expansionRisks: []
    }
  };

  const html = renderReportHtml(report, 'nonce-value');

  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
  assert.equal(html.includes("script-src 'nonce-nonce-value'"), true);
});

test('renderReportHtml exposes actionable webview controls and issue sections', () => {
  const report: I18nReport = {
    title: 'i18ntk Workbench Summary',
    markdown: '# Report',
    result: {
      rootPath: '/workspace',
      sourceLocale: 'en',
      localeDirectory: '/workspace/locales',
      scannedAt: '2026-05-31T00:00:00.000Z',
      locales: ['en', 'fr'],
      totalKeys: 2,
      healthScore: 72,
      localeFiles: [],
      keyValues: {},
      sourceUsages: [],
      missingKeys: [{ key: 'checkout.title', locale: 'fr', sourceFilePath: '/workspace/src/App.tsx' }],
      placeholderMismatches: [],
      unusedKeys: [],
      invalidKeyNames: [{ key: 'Checkout Title', expectedStyle: 'dot', filePath: '/workspace/locales/en/common.json' }],
      riskyContent: [],
      expansionRisks: []
    }
  };

  const html = renderReportHtml(report, 'nonce-value');

  assert.equal(html.includes('data-command="validateLocales"'), true);
  assert.equal(html.includes('data-command="analyzeUsage"'), true);
  assert.equal(html.includes('data-command="autoTranslate"'), true);
  assert.equal(html.includes('data-command="openSettings"'), true);
  assert.equal(html.includes('Invalid Key Names'), true);
  assert.equal(html.includes('Add Key'), true);
  assert.equal(html.includes('data-key="checkout.title"'), true);
});
