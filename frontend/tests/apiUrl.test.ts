import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiUrl } from '../src/api/apiUrl';

test('same-origin development retains the /api prefix', () => {
  assert.equal(apiUrl('/auth/login'), '/api/auth/login');
});

test('split hosting sends auth and report paths to the configured backend', () => {
  const base = 'https://tagad-api.example.test/api/';
  for (const path of ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/me', '/reports/gpb-excel?year=2026']) {
    const result = new URL(apiUrl(path, base));
    assert.equal(result.origin, 'https://tagad-api.example.test');
    assert.equal(result.pathname + result.search, `/api${path}`);
  }
  assert.equal(apiUrl('', base), 'https://tagad-api.example.test/api');
});
