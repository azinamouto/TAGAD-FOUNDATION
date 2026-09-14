import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../server/lib/logger';
import { SENSITIVE_KEYS } from '../server/lib/sensitiveKeys';
test('logger never emits values for any shared sensitive field, including nested arrays', () => {
  const fields = Object.fromEntries([...SENSITIVE_KEYS].map(key => [key, `PRIVATE_VALUE_${key}`]));
  const original = console.log;
  const output: string[] = [];
  console.log = (value: string) => { output.push(value); };
  try { logger.info('REDACTION_TEST', { ...fields, nested: [fields], safe: 'visible' }); }
  finally { console.log = original; }
  assert.equal(output.length, 1);
  for (const value of Object.values(fields)) assert.ok(!output[0].includes(value), value);
  assert.match(output[0], /visible/);
  assert.match(output[0], /REDACTED/);
});
