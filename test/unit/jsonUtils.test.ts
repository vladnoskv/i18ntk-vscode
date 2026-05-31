import test from 'node:test';
import assert from 'node:assert/strict';
import { insertKeyValue, readJsonWithFormatting } from '../../src/utils/jsonUtils';

test('insertKeyValue inserts flat keys without changing existing values', () => {
  const next = insertKeyValue({ existing: 'ok' }, 'checkout.payment.title', 'TODO', false);

  assert.deepEqual(next, {
    existing: 'ok',
    'checkout.payment.title': 'TODO'
  });
});

test('insertKeyValue inserts nested keys', () => {
  const next = insertKeyValue({ checkout: { existing: 'ok' } }, 'checkout.payment.title', 'TODO', true);

  assert.deepEqual(next, {
    checkout: {
      existing: 'ok',
      payment: {
        title: 'TODO'
      }
    }
  });
});

test('readJsonWithFormatting detects indentation and newline style', () => {
  const parsed = readJsonWithFormatting('{\r\n    "hello": "world"\r\n}\r\n');

  assert.equal(parsed.indent, 4);
  assert.equal(parsed.eol, '\r\n');
  assert.deepEqual(parsed.data, { hello: 'world' });
});
