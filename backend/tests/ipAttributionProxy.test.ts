import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { AuditService } from '../server/services/AuditService';
import { parseTrustProxy } from '../server/lib/trustProxy';
import { createCustomRateLimiter } from '../server/middleware/rateLimiter';

for (const [name, setting, forwarded, expected] of [
  ['default direct connection ignores forged headers', '', '203.0.113.1', '127.0.0.1'],
  ['explicit untrusted peer ignores forged chain', 'false', '203.0.113.1, 198.51.100.9', '127.0.0.1'],
  ['trusted hop ignores forged prefix', '1', '203.0.113.1, 198.51.100.9', '198.51.100.9'],
  ['trusted CIDR resolves nearest untrusted address', 'loopback', '203.0.113.1, 198.51.100.9', '198.51.100.9'],
  ['untrusted CIDR peer cannot supply client IP', '10.0.0.0/8', '203.0.113.1', '127.0.0.1'],
  ['multiple trusted proxies stop at client', 'loopback, 10.0.0.0/8', '203.0.113.1, 198.51.100.9, 10.0.0.4', '198.51.100.9'],
]) {
  test(name, async () => {
    const app = express();
    app.set('trust proxy', parseTrustProxy(setting));
    app.get('/', async (req, res, next) => {
      try {
        let recorded: any;
        await AuditService.logActionTx({ auditLog: { create: async ({ data }: any) => { recorded = data; } } }, {
          action: 'PROXY_TEST', entityType: 'Test', req,
        });
        res.json({ ip: req.ip, auditIp: recorded.ipAddress });
      } catch (error) { next(error); }
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}`, {
        headers: { 'x-forwarded-for': forwarded },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ip: expected, auditIp: expected });
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
}

test('unsafe unrestricted trust and invalid hop counts fail configuration', () => {
  for (const config of ['true', '-1', '1.5', 'Infinity', 'loopback,']) {
    assert.throws(() => parseTrustProxy(config));
  }
});

test('rotating forged headers cannot bypass direct-connection rate limit', async () => {
  const app = express();
  app.set('trust proxy', parseTrustProxy('false'));
  app.use(createCustomRateLimiter({ windowMs: 60000, max: 2 }));
  app.get('/', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const statuses = [];
    for (let i = 1; i <= 3; i++) {
      const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}`, {
        headers: { 'x-forwarded-for': `203.0.113.${i}` },
      });
      statuses.push(response.status);
      await response.text();
    }
    assert.deepEqual(statuses, [200, 200, 429]);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
