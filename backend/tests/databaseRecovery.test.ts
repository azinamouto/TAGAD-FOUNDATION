import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { DatabaseConnectionMonitor } from '../server/lib/databaseConnectionMonitor';
test('database probe retries failure, coalesces callers, and recovers without restart', async () => {
  let calls = 0;
  const monitor = new DatabaseConnectionMonitor(async () => {
    calls++; await delay(2); if (calls < 3) throw new Error('starting');
  }, 10, 20, 10000);
  try {
    assert.deepEqual(await Promise.all([monitor.check(), monitor.check()]), [false, false]);
    assert.equal(calls, 1);
    for (let attempt = 0; attempt < 30 && !monitor.connected; attempt++) await delay(10);
    assert.equal(monitor.connected, true); assert.equal(calls, 3);
  } finally { monitor.stop(); }
});
test('stopping a pending monitor prevents late probe results overriding fixture state', async () => {
  let release!: () => void;
  const monitor = new DatabaseConnectionMonitor(() => new Promise<void>(resolve => { release = resolve; }));
  const pending = monitor.check(); monitor.stop(); release();
  await pending; assert.equal(monitor.connected, false);
});
