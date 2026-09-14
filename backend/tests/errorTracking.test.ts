import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import * as Sentry from '@sentry/node';
import { initializeErrorTracking, sanitizeErrorEvent } from '../server/lib/errorTracking';
import { sendError } from '../server/lib/response';
import { ValidationError } from '../server/lib/errors';
test('Express 5xx reaches Sentry transport with sensitive data removed; 4xx does not', async () => {
  const events: any[] = [];
  await initializeErrorTracking({ dsn: 'https://test@example.invalid/1', integrations: [], transport: () => ({
    send: async envelope => { events.push(envelope); return { statusCode: 200 }; }, flush: async () => true,
  }) });
  const app = express();
  app.get('/failure', (req, res) => sendError(res, new Error('PRIVATE_MESSAGE firstname=PRIVATE_NAME')));
  app.get('/validation', (req, res) => sendError(res, new ValidationError('Invalid input')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(base + '/failure')).status, 500);
    assert.equal((await fetch(base + '/validation')).status, 422);
    await Sentry.flush(2000);
    assert.equal(events.length, 1);
    assert.ok(!JSON.stringify(events).includes('PRIVATE_'));
    const sanitized = sanitizeErrorEvent({ type: undefined, message: 'PRIVATE_MESSAGE', request: { data: 'PRIVATE_BODY' }, user: { email: 'PRIVATE_EMAIL' }, extra: { password: 'PRIVATE_PASSWORD' }, breadcrumbs: [{ message: 'PRIVATE_BREADCRUMB' }] });
    assert.ok(!JSON.stringify(sanitized).includes('PRIVATE_'));
  } finally {
    await Sentry.close(2000);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
