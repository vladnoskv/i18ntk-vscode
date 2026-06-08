import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSuspectedCopyFormatters, detectTranslationKeysAt, findClientBoundaryLocaleImports, findTranslationKeys } from '../../src/hover/keyDetector';

test('findTranslationKeys detects common i18n call patterns', () => {
  const source = [
    't("checkout.payment.title")',
    "i18n.t('auth.login.subtitle')",
    'translate("profile.name")',
    '$t("common.save")'
  ].join('\n');

  const keys = findTranslationKeys(source).map((item) => item.key);

  assert.deepEqual(keys, [
    'checkout.payment.title',
    'auth.login.subtitle',
    'profile.name',
    'common.save'
  ]);
});

test('detectTranslationKeysAt returns the key at a character offset', () => {
  const source = 'const label = t("checkout.payment.title");';
  const offset = source.indexOf('payment');

  const match = detectTranslationKeysAt(source, offset);

  assert.equal(match?.key, 'checkout.payment.title');
});

test('findTranslationKeys detects configured custom wrappers', () => {
  const source = 'const label = msg("dashboard.title");';

  const keys = findTranslationKeys(source, ['msg']).map((item) => item.key);

  assert.deepEqual(keys, ['dashboard.title']);
});

test('findTranslationKeys ignores non-translation function and method string arguments', () => {
  const source = [
    'const next = searchParams.get("next");',
    'window.localStorage.setItem("pending", "1");',
    'settingsRes.headers.get("etag");',
    'clearWaitlist("pending");',
    'clearWaitlist("admin.panel");',
    'response.headers.set("Clear-Site-Data", "\\"cache\\", \\"storage\\"");',
    'const title = t("checkout.payment.title");'
  ].join('\n');

  const keys = findTranslationKeys(source).map((item) => item.key);

  assert.deepEqual(keys, ['checkout.payment.title']);
});

test('findTranslationKeys detects imported locale object property reads', () => {
  const source = [
    'import common from "../locales/en/common.json";',
    'const save = common.save;',
    'const retry = common.actions.retry;'
  ].join('\n');

  const keys = findTranslationKeys(source).map((item) => item.key);

  assert.deepEqual(keys, ['common.save', 'common.actions.retry']);
});

test('findTranslationKeys detects dynamic template prefixes and resolved static values', () => {
  const source = [
    'const state = "created";',
    'const direct = t(`duel.${state}`);',
    'const topics = ["sports", "weather"];',
    'topics.map((topic) => tx(`news.page.topics.${topic}`));'
  ].join('\n');

  const matches = findTranslationKeys(source) as Array<{ key: string; dynamic?: boolean; resolvedKeys?: string[] }>;

  assert.deepEqual(matches.map((match) => [match.key, match.dynamic, match.resolvedKeys]), [
    ['duel.', true, ['duel.created']],
    ['news.page.topics.', true, ['news.page.topics.sports', 'news.page.topics.weather']]
  ]);
});

test('findTranslationKeys expands scoped namespace helpers', () => {
  const source = [
    'const txNews = useTranslations("news.page");',
    'const heading = txNews("heading");',
    'const topic = txNews(`topics.${item}`);',
    'const dynamicTopic = txNews(item);'
  ].join('\n');

  const matches = findTranslationKeys(source) as Array<{ key: string; dynamic?: boolean }>;

  assert.deepEqual(matches.map((match) => [match.key, match.dynamic]), [
    ['news.page.heading', false],
    ['news.page.topics.', true],
    ['news.page.', true]
  ]);
});

test('callBoundaryForName does not match i18n.t when preceded by a dot', () => {
  const source = 'obj.i18n.t("should.not.match");\ni18n.t("should.match");';
  const keys = findTranslationKeys(source).map((item) => item.key);
  assert.equal(keys.includes('should.match'), true);
  assert.equal(keys.includes('should.not.match'), false);
});

test('detectSuspectedCopyFormatters detects configured copy formatter names', () => {
  const source = 'const fmt = useCallback(() => "hello");\nconst copy = (x) => x && x;\nconst tx = useMemo(() => "bye");';
  const results = detectSuspectedCopyFormatters(source, ['fmt', 'copy']);
  const names = results.map((r) => r.name);
  assert.deepEqual(names, ['fmt', 'copy', 'tx']);
  for (const result of results) {
    assert.equal(result.type, 'suspectedCopyFormatter');
    assert.ok(result.message.includes(result.name));
  }
});

test('detectSuspectedCopyFormatters does not flag translation runtime calls', () => {
  const source = 'const fmt = t;\nconst tx = useCallback(() => t("hello"));';
  const results = detectSuspectedCopyFormatters(source, ['fmt']);
  assert.equal(results.length, 0);
});

test('findClientBoundaryLocaleImports detects default JSON imports with use client', () => {
  const source = `'use client';\nimport en from "./locales/en/common.json";`;
  const issues = findClientBoundaryLocaleImports(source);
  assert.equal(issues.length, 1);
  assert.ok(issues[0].message.includes('client bundle'));
});

test('findClientBoundaryLocaleImports detects import * as JSON imports', () => {
  const source = `"use client";\nimport * as en from "../../locales/en/common.json";`;
  const issues = findClientBoundaryLocaleImports(source);
  assert.equal(issues.length, 1);
});

test('findClientBoundaryLocaleImports does not flag non-client files', () => {
  const source = `import en from "./locales/en/common.json";`;
  const issues = findClientBoundaryLocaleImports(source);
  assert.equal(issues.length, 0);
});
