import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { sendError } from '../server/lib/response';
import { AppError, ValidationError } from '../server/lib/errors';

test('production HTTP errors hide unexpected messages, codes and private details', async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const privateText = 'private-database-user password fixture /home/private';
  const app = express();
  app.get('/unexpected', (_req, res) => sendError(res, Object.assign(new Error(privateText), { code: privateText }), 400));
  app.get('/internal', (_req, res) => sendError(res, new AppError(privateText, 500, privateText, { query: privateText })));
  app.get('/unavailable', (_req, res) => sendError(res, new AppError(privateText, 503, privateText)));
  app.get('/validation', (_req, res) => sendError(res, new ValidationError('Reporting period is required')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    for (const route of ['/unexpected', '/internal', '/unavailable']) {
      const response = await fetch(base + route);
      assert.equal(response.status, route === '/unavailable' ? 503 : 500);
      const body = await response.text();
      assert.ok(!body.includes(privateText));
      assert.ok(!body.includes('details'));
    }
    const validation = await fetch(base + '/validation');
    assert.equal(validation.status, 422);
    assert.equal((await validation.json()).error.message, 'Reporting period is required');
  } finally {
    if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
