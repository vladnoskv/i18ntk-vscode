import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenJson, insertKeyValue, readJsonWithFormatting } from '../../src/utils/jsonUtils';

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

test('flattenJson preserves boolean values as strings', () => {
  const result = flattenJson({ enabled: true, disabled: false });
  assert.deepEqual(result, { enabled: 'true', disabled: 'false' });
});

test('flattenJson preserves number values as strings', () => {
  const result = flattenJson({ count: 42, price: 9.99 });
  assert.deepEqual(result, { count: '42', price: '9.99' });
});

test('flattenJson preserves null value as string', () => {
  const result = flattenJson({ empty: null });
  assert.deepEqual(result, { empty: 'null' });
});

test('flattenJson preserves nested non-string values', () => {
  const result = flattenJson({ section: { enabled: true, count: 5, label: 'hello' } });
  assert.deepEqual(result, { 'section.enabled': 'true', 'section.count': '5', 'section.label': 'hello' });
});

test('flattenJson handles empty objects and arrays gracefully', () => {
  assert.deepEqual(flattenJson(null), {});
  assert.deepEqual(flattenJson(undefined), {});
  assert.deepEqual(flattenJson([]), {});
  assert.deepEqual(flattenJson({}), {});
});

test('flattenJson converts primitive root values', () => {
  assert.deepEqual(flattenJson(42), { value: '42' });
  assert.deepEqual(flattenJson(true), { value: 'true' });
  assert.deepEqual(flattenJson('hello'), { value: 'hello' });
});
