import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
test('backend-only production command honors PORT and denies readiness without database', { timeout: 20000 }, async () => {
  const socket = net.createServer();
  await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as any).port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/start-production.mjs'], {
    cwd: new URL('..', import.meta.url), windowsHide: true,
    env: { ...process.env, PORT: String(port), DATABASE_PROBE_DISABLED: 'true', SENTRY_DSN: '', DEMO_MODE: 'false',
      JWT_SECRET: 'synthetic-production-startup-access-key', JWT_REFRESH_SECRET: 'synthetic-production-startup-refresh-key' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = ''; child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; });
  const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).status === 200) { ready = true; break; } } catch {}
      if (child.exitCode !== null) break;
      await delay(100);
    }
    assert.ok(ready, output);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/ready`)).status, 503);
    assert.match(output, /production/);
  } finally { child.kill(); await exited; }
});
