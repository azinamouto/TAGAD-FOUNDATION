import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
test('production startup enforces readiness, CORS allowlist, and Helmet response headers', { timeout: 60000 }, async () => {
  const socket = net.createServer();
  await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as any).port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/start-production.mjs'], {
    cwd: new URL('..', import.meta.url), windowsHide: true,
    env: { ...process.env, PORT: String(port), DATABASE_PROBE_DISABLED: 'true', SENTRY_DSN: '', DEMO_MODE: 'false',
      CORS_ORIGINS: 'https://allowed.example', APP_URL: '', CLIENT_URL: '',
      JWT_SECRET: 'synthetic-production-startup-access-key', JWT_REFRESH_SECRET: 'synthetic-production-startup-refresh-key' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = ''; child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; });
  const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
  try {
    let ready = false;
    for (let i = 0; i < 400; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) })).status === 200) { ready = true; break; } } catch {}
      if (child.exitCode !== null) break;
      await delay(100);
    }
    assert.ok(ready, output);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/ready`)).status, 503);
    const url = `http://127.0.0.1:${port}/api/health`;
    const allowed = await fetch(url, { headers: { Origin: 'https://allowed.example' } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allowed.example');
    assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
    assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(allowed.headers.get('x-dns-prefetch-control'), 'off');
    assert.equal(allowed.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(allowed.headers.get('x-powered-by'), null);
    for (const method of ['GET', 'OPTIONS']) {
      const denied = await fetch(url, { method, headers: { Origin: 'https://blocked.example', 'Access-Control-Request-Method': 'GET' } });
      assert.ok(denied.status >= 400, `unlisted origin must be rejected for ${method}`);
      assert.equal(denied.headers.get('access-control-allow-origin'), null);
      assert.doesNotMatch(await denied.text(), /TAGAD - Talibon Analytics/);
    }
    assert.match(output, /production/);
  } finally { child.kill(); await exited; }
});
