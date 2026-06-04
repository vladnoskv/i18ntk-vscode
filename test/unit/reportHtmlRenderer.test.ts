import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReportHtml } from '../../src/webview/reportHtmlRenderer';
import { I18ntkReport } from '../../src/types';

function report(): I18ntkReport {
  return {
    schemaVersion: 1,
    generatedAt: '2026-05-31T00:00:00.000Z',
    projectRoot: '/workspace/<script>alert(1)</script>',
    config: {
      sourceLocale: 'en',
      localesDir: '/workspace/locales',
      namespaces: ['common']
    },
    summary: {
      totalKeys: 2,
      localeCount: 2,
      averageCompletenessPct: 75,
      issueCount: 2,
      missingKeyCount: 1,
      unusedKeyCount: 0,
      placeholderMismatchCount: 0,
      likelyUntranslatedCount: 0,
      expansionRiskCount: 0,
      hardcodedTextCount: 1
    },
    locales: [
      {
        locale: 'en',
        totalKeys: 2,
        translatedKeys: 2,
        missingKeys: 0,
        completenessPct: 100,
        placeholderMismatchCount: 0,
        likelyUntranslatedCount: 0,
        expansionRiskCount: 0
      },
      {
        locale: 'fr',
        totalKeys: 2,
        translatedKeys: 1,
        missingKeys: 1,
        completenessPct: 50,
        placeholderMismatchCount: 0,
        likelyUntranslatedCount: 0,
        expansionRiskCount: 0
      }
    ],
    issues: [
      {
        id: 'missing_key-1',
        type: 'missing_key',
        severity: 'warning',
        locale: 'fr',
        key: '<img src=x onerror=alert(1)>',
        file: 'src/App.tsx',
        line: 12,
        column: 5,
        confidence: 0.9,
        message: 'fr is missing a key',
        suggestion: 'Add it'
      },
      {
        id: 'hardcoded_text-2',
        type: 'hardcoded_text',
        severity: 'warning',
        file: 'src/App.tsx',
        line: 20,
        message: 'Hardcoded user-facing text'
      }
    ]
  };
}

test('renderReportHtml escapes dynamic report content and uses nonce scripts', () => {
  const html = renderReportHtml(report(), 'nonce-value');

  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.equal(html.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
  assert.equal(html.includes("script-src 'nonce-nonce-value'"), true);
});

test('renderReportHtml exposes dashboard tabs, filters, issue opening, refresh, and exports', () => {
  const html = renderReportHtml(report(), 'nonce-value');

  assert.equal(html.includes('Total Keys'), true);
  assert.equal(html.includes('Translation Completeness'), true);
  assert.equal(html.includes('Missing Keys'), true);
  assert.equal(html.includes('Hardcoded Text'), true);
  assert.equal(html.includes('data-export="json"'), true);
  assert.equal(html.includes('data-export="markdown"'), true);
  assert.equal(html.includes('data-export="html"'), true);
  assert.equal(html.includes('data-action="refresh"'), true);
  assert.equal(html.includes('data-issue-id="missing_key-1"'), true);
  assert.equal(html.includes('filter-confidence'), true);
  assert.equal(html.includes("vscode.postMessage({ type: 'refreshReport' })"), true);
});
