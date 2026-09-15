import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import authRoutes from '../server/routes/auth';
import publicRoutes from '../server/routes/public';

test('real login and feedback routes reject requests exceeding their IP limits', async () => {
  const originalLogin = process.env.RATE_LIMIT_LOGIN_MAX;
  const originalFeedback = process.env.RATE_LIMIT_FEEDBACK_MAX;
  process.env.RATE_LIMIT_LOGIN_MAX = '2';
  process.env.RATE_LIMIT_FEEDBACK_MAX = '2';
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    for (const route of ['/api/auth/login', '/api/public/feedback']) {
      const url = `http://127.0.0.1:${(server.address() as any).port}${route}`;
      for (let i = 0; i < 3; i++) {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (i < 2) {
          assert.notEqual(response.status, 429);
          assert.ok(response.status >= 400 && response.status < 500, 'invalid fixture body must not create data');
        } else {
          assert.equal(response.status, 429);
          assert.equal((await response.json()).error.code, 'RATE_LIMIT_EXCEEDED');
          assert.ok(Number(response.headers.get('retry-after')) > 0);
        }
      }
    }
  } finally {
    if (originalLogin === undefined) delete process.env.RATE_LIMIT_LOGIN_MAX; else process.env.RATE_LIMIT_LOGIN_MAX = originalLogin;
    if (originalFeedback === undefined) delete process.env.RATE_LIMIT_FEEDBACK_MAX; else process.env.RATE_LIMIT_FEEDBACK_MAX = originalFeedback;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
