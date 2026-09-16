import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { TokenRevocationService as Store } from '../server/services/TokenRevocationService';
import { AuthService } from '../server/services/AuthService';
import { signAccessToken, signRefreshToken, verifyAccessTokenAsync } from '../server/lib/jwt';
import { requireAuth } from '../server/middleware/authMiddleware';

test('shared revocation reads fail closed and do not cache a negative result', async () => {
  const original = prisma.revokedToken.findFirst;
  const demo = process.env.DEMO_MODE;
  process.env.DEMO_MODE = 'false';
  Store.resetInMemoryTestState();
  setDatabaseConnected(true);
  const token = signAccessToken({ id: 'officer', email: 'fixture@example.test', role: 'ADMIN' });
  let revoked = false;
  prisma.revokedToken.findFirst = (async () => revoked ? { expiresAt: new Date(Date.now() + 60000) } : null) as any;
  try {
    await verifyAccessTokenAsync(token);
    revoked = true; // Represents a write committed by another running process.
    await assert.rejects(verifyAccessTokenAsync(token), { name: 'TokenRevokedError' });
    Store.resetInMemoryTestState();
    prisma.revokedToken.findFirst = (async () => { throw new Error('database unavailable'); }) as any;
    await assert.rejects(verifyAccessTokenAsync(token), (e: any) => e.statusCode === 503);
    setDatabaseConnected(false);
    await assert.rejects(verifyAccessTokenAsync(token), (e: any) => e.statusCode === 503);
  } finally {
    prisma.revokedToken.findFirst = original; process.env.DEMO_MODE = demo;
    setDatabaseConnected(false); Store.resetInMemoryTestState();
  }
});

test('logout and refresh cannot report success when durable writes fail', async () => {
  const originals = { upsert: prisma.revokedToken.upsert, create: prisma.revokedToken.create, findFirst: prisma.revokedToken.findFirst };
  setDatabaseConnected(true); Store.resetInMemoryTestState();
  prisma.revokedToken.findFirst = (async () => null) as any;
  prisma.revokedToken.upsert = prisma.revokedToken.create = (async () => { throw new Error('write failed'); }) as any;
  const payload = { id: 'officer', email: 'fixture@example.test', role: 'ADMIN' };
  try {
    const token = signAccessToken(payload);
    await assert.rejects(AuthService.logout(undefined, { headers: { authorization: `Bearer ${token}` } } as any), (e: any) => e.statusCode === 503);
    assert.equal(Store.isTokenRevoked(token), false, 'failed write is not advertised as a durable revocation');
    await assert.rejects(AuthService.refreshToken(signRefreshToken(payload)), (e: any) => e.statusCode === 503);
    prisma.revokedToken.create = (async () => { throw Object.assign(new Error('duplicate'), { code: 'P2002' }); }) as any;
    await assert.rejects(AuthService.refreshToken(signRefreshToken(payload)), (e: any) => e.statusCode === 401);
  } finally {
    Object.assign(prisma.revokedToken, originals); setDatabaseConnected(false); Store.resetInMemoryTestState();
  }
});

test('authenticated HTTP requests return 503 on an unavailable shared revocation store', async () => {
  const original = prisma.revokedToken.findFirst;
  setDatabaseConnected(true); Store.resetInMemoryTestState();
  prisma.revokedToken.findFirst = (async () => { throw new Error('private database connection detail'); }) as any;
  const app = express(); app.get('/protected', requireAuth, (_req, res) => res.json({ allowed: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const token = signAccessToken({ id: 'officer', email: 'fixture@example.test', role: 'ADMIN' });
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/protected`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(!body.includes('private database'));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    prisma.revokedToken.findFirst = original; setDatabaseConnected(false); Store.resetInMemoryTestState();
  }
});
