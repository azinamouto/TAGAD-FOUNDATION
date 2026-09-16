import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { AuthService } from '../server/services/AuthService';
import { TokenRevocationService as Store } from '../server/services/TokenRevocationService';
import { getJwtRefreshSecret, verifyAccessTokenAsync, verifyRefreshTokenAsync } from '../server/lib/jwt';

test('bearer-only logout invalidates the login pair and all its refresh rotations', async () => {
  Store.resetInMemoryTestState();
  const login = await AuthService.login('admin@talibon.gov.ph', process.env.DEMO_ADMIN_PASSWORD!);
  const access = jwt.decode(login.accessToken) as any;
  const refresh = jwt.decode(login.refreshToken) as any;
  assert.equal(access.sessionId, refresh.sessionId);
  assert.notEqual(access.jti, refresh.jti);
  const rotated = await AuthService.refreshToken(login.refreshToken);
  assert.equal((jwt.decode(rotated.refreshToken) as any).sessionId, access.sessionId);
  await AuthService.logout(undefined, { headers: { authorization: `Bearer ${login.accessToken}` }, body: {} } as any);
  for (const token of [login.accessToken, rotated.accessToken]) {
    await assert.rejects(verifyAccessTokenAsync(token), { name: 'TokenRevokedError' });
  }
  await assert.rejects(verifyRefreshTokenAsync(rotated.refreshToken), { name: 'TokenRevokedError' });
  const newLogin = await AuthService.login('admin@talibon.gov.ph', process.env.DEMO_ADMIN_PASSWORD!);
  await verifyAccessTokenAsync(newLogin.accessToken);
  await verifyRefreshTokenAsync(newLogin.refreshToken);
  Store.resetInMemoryTestState();
});

test('logout refuses another login session refresh token before revoking anything', async () => {
  Store.resetInMemoryTestState();
  const a = await AuthService.login('admin@talibon.gov.ph', process.env.DEMO_ADMIN_PASSWORD!);
  const b = await AuthService.login('admin@talibon.gov.ph', process.env.DEMO_ADMIN_PASSWORD!);
  await assert.rejects(AuthService.logout(undefined, {
    headers: { authorization: `Bearer ${a.accessToken}` }, body: { refreshToken: b.refreshToken },
  } as any), (error: any) => error.statusCode === 401);
  await verifyAccessTokenAsync(a.accessToken); await verifyRefreshTokenAsync(b.refreshToken);
  Store.resetInMemoryTestState();
});

test('legacy refresh tokens with unpaired session IDs require fresh login', async () => {
  const legacy = jwt.sign({ id: 'legacy', jti: 'legacy-jti', sessionId: 'unpaired' }, getJwtRefreshSecret(), { expiresIn: '1h' });
  await assert.rejects(AuthService.refreshToken(legacy), (error: any) => error.statusCode === 401);
});
