import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTranslationKeysAt, findTranslationKeys } from '../../src/hover/keyDetector';

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
