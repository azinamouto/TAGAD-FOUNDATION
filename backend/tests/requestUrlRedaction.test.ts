import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { requestLogger } from '../server/middleware/requestLogger';
import { logger } from '../server/lib/logger';

test('request logs redact query PII in URL and parsed query at every severity', async () => {
  const output: string[] = [];
  const originals = { log: console.log, warn: console.warn, error: console.error };
  for (const key of ['log', 'warn', 'error'] as const) console[key] = (...args) => { output.push(args.join(' ')); };
  const app = express();
  app.use(requestLogger);
  app.get('/probe', (req, res) => res.status(Number(req.query.status)).end());
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const query = 'name=Juan+Dela+Cruz&firstName=PRIVATE_FIRST&name=PRIVATE_REPEAT&person%5BlastName%5D=PRIVATE_LAST&token=PRIVATE_TOKEN&year=2026';
  try {
    for (const status of [200, 400, 500]) {
      const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/probe?${query}&status=${status}`);
      assert.equal(response.status, status);
      await response.text();
    }
    // Rate-limit warnings use the same shared logger with a raw URL in details.
    logger.warn('RATE_LIMIT_EXCEEDED_LOGIN', { path: `/probe?${query}` });
    assert.equal(output.length, 4);
    const captured = output.join('\n');
    assert.doesNotMatch(captured, /Juan|Dela|Cruz|PRIVATE_/);
    for (const line of output) {
      const event = JSON.parse(line);
      const url = new URL(event.path || event.details.path, 'http://localhost');
      assert.equal(url.searchParams.get('year'), '2026');
      assert.deepEqual(url.searchParams.getAll('name'), ['[REDACTED]', '[REDACTED]']);
    }
  } finally {
    Object.assign(console, originals);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
