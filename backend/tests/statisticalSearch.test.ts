import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import adminRoutes from '../server/routes/admin';
import { signAccessToken } from '../server/lib/jwt';
import { StatisticalSearchService as Search } from '../server/services/StatisticalSearchService';

test('statistical search requires authentication and reports unavailable data honestly', async () => {
  await assert.rejects(Search.search('population', undefined as any), (e: any) => e.statusCode === 403);
  const app = express(); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as any).port}/admin/statistical-search`;
    assert.equal((await fetch(url)).status, 401);
    const token = signAccessToken({ id: 'usr-admin-01', email: 'fixture@example.test', role: 'ADMIN' });
    const headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(url + '?q=population', { headers })).status, 503);
    assert.equal((await fetch(url + '?q=' + 'x'.repeat(101), { headers })).status, 422);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
