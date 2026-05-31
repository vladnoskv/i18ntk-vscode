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
