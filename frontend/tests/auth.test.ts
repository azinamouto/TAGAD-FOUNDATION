import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { authService } from '../src/modules/auth/authService';
import { validateLoginInput, validateProgramInput } from '../src/lib/validation/auth';

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } });
});
afterEach(() => { mock.restoreAll(); Reflect.deleteProperty(globalThis, 'localStorage'); });

test('login normalizes email, maps backend profile and persists session', async () => {
  const post = mock.method(axios, 'post', async () => ({ data: { data: {
    user: { id: 'user-1', fullName: 'Test Encoder', email: 'encoder@example.test', role: 'ENCODER', officeId: 'office-1' },
    accessToken: 'access-fixture', refreshToken: 'refresh-fixture',
  } } }));
  const result = await authService.login(' Encoder@Example.Test ', 'test-password');
  assert.deepEqual(post.mock.calls[0].arguments, ['/api/auth/login', { email: 'encoder@example.test', password: 'test-password' }]);
  assert.equal(result.user.full_name, 'Test Encoder');
  assert.equal(result.user.office_id, 'office-1');
  assert.deepEqual(result.roles, ['ENCODER']);
  assert.equal(localStorage.getItem('tagad_token'), 'access-fixture');
  assert.equal(localStorage.getItem('tagad_refresh_token'), 'refresh-fixture');
});

test('invalid login response cannot establish a session', async () => {
  mock.method(axios, 'post', async () => ({ data: { data: { user: { id: 'user-1' } } } }));
  await assert.rejects(authService.login('encoder@example.test', 'test-password'), /invalid/);
  assert.equal(localStorage.getItem('tagad_token'), null);
});

test('backend login rejection is reported to the caller', async () => {
  mock.method(axios, 'post', async () => { throw { response: { data: { error: { message: 'Account inactive' } } } }; });
  await assert.rejects(authService.login('encoder@example.test', 'test-password'), /Account inactive/);
});

test('logout sends bearer token and clears all session keys even when network fails', async () => {
  for (const key of ['tagad_token', 'tagad_refresh_token', 'tagad_user', 'tagad_roles']) localStorage.setItem(key, 'fixture');
  const post = mock.method(axios, 'post', async () => { throw new Error('Network unavailable'); });
  await authService.logout();
  assert.deepEqual(post.mock.calls[0].arguments, ['/api/auth/logout', {}, { headers: { Authorization: 'Bearer fixture' } }]);
  for (const key of ['tagad_token', 'tagad_refresh_token', 'tagad_user', 'tagad_roles']) assert.equal(localStorage.getItem(key), null);
});

test('session restoration without a token does not call backend', async () => {
  const get = mock.method(axios, 'get', async () => { throw new Error('Unexpected request'); });
  assert.equal(await authService.getCurrentUser(), null);
  assert.equal(get.mock.callCount(), 0);
});

test('login form rejects missing or malformed credentials', () => {
  assert.deepEqual(Object.keys(validateLoginInput('', '').errors), ['email', 'password']);
  assert.equal(validateLoginInput('invalid-email', '12345').isValid, false);
  assert.equal(validateLoginInput(' encoder@example.test ', '123456').isValid, true);
});

test('program form requires title, supported fiscal year and implementing office', () => {
  const year = new Date().getFullYear();
  assert.equal(validateProgramInput('Livelihood', year, 'office-1').isValid, true);
  assert.deepEqual(Object.keys(validateProgramInput('a', year + 6, '').errors), ['title', 'fiscalYear', 'officeId']);
});
