import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePlaceholders, extractPlaceholders } from '../../src/utils/placeholderUtils';

test('extractPlaceholders finds common placeholder forms', () => {
  const placeholders = extractPlaceholders('Hello {name}, you have {{count}} items and %s pending.');

  assert.deepEqual([...placeholders].sort(), ['%s', '{name}', '{{count}}']);
});

test('comparePlaceholders reports missing and extra placeholders', () => {
  const result = comparePlaceholders('You have {count} items', 'Tienes articulos {total}');

  assert.deepEqual(result.missing, ['{count}']);
  assert.deepEqual(result.extra, ['{total}']);
  assert.equal(result.matches, false);
});
