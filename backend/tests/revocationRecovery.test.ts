import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { TokenRevocationService as Service } from '../server/services/TokenRevocationService';
for (const initiallyConnected of [false, true]) {
  test(`hydration recovers automatically after ${initiallyConnected ? 'query failure' : 'late connection'}`, async () => {
    Service.resetInMemoryTestState();
    setDatabaseConnected(initiallyConnected);
    const original = prisma.revokedToken.findMany;
    let failed = initiallyConnected;
    let reads = 0;
    prisma.revokedToken.findMany = (async () => {
      reads++;
      if (failed) { failed = false; throw new Error('temporarily unavailable'); }
      return [{ jti: 'revoked-before-restart', tokenHash: null, expiresAt: new Date(Date.now() + 60000) }];
    }) as any;
    try {
      await Service.hydrateFromDatabase();
      assert.equal(Service.isReady(), false);
      setDatabaseConnected(true);
      await delay(1150);
      assert.equal(Service.isReady(), true);
      assert.equal(Service.isTokenRevoked('revoked-before-restart'), true);
      assert.equal(reads, initiallyConnected ? 2 : 1);
    } finally {
      prisma.revokedToken.findMany = original;
      Service.resetInMemoryTestState();
      setDatabaseConnected(false);
    }
  });
}
