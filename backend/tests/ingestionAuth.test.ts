import './testEnvironment';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import adminRoutes from '../server/routes/admin/index';
import { signAccessToken } from '../server/lib/jwt';

test('VIEWER receives a middleware 403 on CSV ingestion execute', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const port = (server.address() as AddressInfo).port;
    const token = signAccessToken({
      id: 'usr-viewer-01',
      email: 'viewer@talibon.gov.ph',
      role: 'VIEWER',
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/ingestion/execute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});