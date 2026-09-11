import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import dashboardRoutes from '../server/routes/dashboard';
import { signAccessToken } from '../server/lib/jwt';

test('dashboard routes require authentication and return stats for authenticated users', async () => {
  const app = express();
  app.use('/api/dashboard', dashboardRoutes);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api/dashboard`;

  try {
    const unauthenticated = await fetch(baseUrl);
    assert.equal(unauthenticated.status, 401);

    const token = signAccessToken({
      id: 'usr-superadmin-01',
      email: 'superadmin@talibon.gov.ph',
      role: 'SUPER_ADMIN',
    });
    const authenticated = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(authenticated.status, 200);
    const stats = await authenticated.json();
    assert.ok(stats.summary);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});