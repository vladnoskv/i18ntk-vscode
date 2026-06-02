import test from 'node:test';
import assert from 'node:assert/strict';
import { runSingleFlightScan } from '../../src/services/scanCoordinator';

test('runSingleFlightScan reuses an in-flight scan instead of starting another one', async () => {
  let runs = 0;
  let reused = 0;
  let release!: () => void;
  const state = {};

  const first = runSingleFlightScan(state, async () => {
    runs += 1;
    await new Promise<void>((resolve) => { release = resolve; });
  }, () => { reused += 1; });
  const second = runSingleFlightScan(state, async () => {
    runs += 1;
  }, () => { reused += 1; });

  assert.equal(runs, 1);
  assert.equal(reused, 1);
  release();
  await Promise.all([first, second]);

  await runSingleFlightScan(state, async () => {
    runs += 1;
  });
  assert.equal(runs, 2);
});
