import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import { configureCors } from '../server/lib/cors';

test('same-origin requests and allowlisted cross-origin bearer preflights are supported', async () => {
  const previous = { mode: process.env.NODE_ENV, origins: process.env.CORS_ORIGINS };
  process.env.NODE_ENV = 'production';
  process.env.CORS_ORIGINS = 'https://frontend.example.test';
  const app = express(); app.use(cors(configureCors()));
  app.get('/api/auth/me', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as any).port}/api/auth/me`;
    assert.equal((await fetch(url)).status, 200);
    const response = await fetch(url, { method: 'OPTIONS', headers: {
      Origin: 'https://frontend.example.test', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization',
    } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://frontend.example.test');
    assert.match(response.headers.get('access-control-allow-headers') || '', /Authorization/i);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (previous.mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.mode;
    if (previous.origins === undefined) delete process.env.CORS_ORIGINS; else process.env.CORS_ORIGINS = previous.origins;
  }
});
