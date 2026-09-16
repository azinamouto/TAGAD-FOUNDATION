import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import adminRoutes from '../server/routes/admin';
import publicRoutes from '../server/routes/public';
import { signAccessToken } from '../server/lib/jwt';

test('feedback HTTP fails closed without storage and rejects non-admin reviewers', async () => {
  const app = express(); app.use(express.json()); app.use('/public', publicRoutes); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const response = await fetch(base + '/public/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Synthetic sender', email: 'sender@example.test', subject: 'A test message', message: 'Please review this test feedback.' }) });
    assert.equal(response.status, 503);
    for (const [id, role] of [['usr-encoder-01', 'ENCODER'], ['usr-viewer-01', 'VIEWER']]) {
      const token = signAccessToken({ id, role, email: 'fixture@example.test' });
      assert.equal((await fetch(base + '/admin/feedback', { headers: { authorization: `Bearer ${token}` } })).status, 403);
    }
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('feedback migration prevents direct public access to private messages', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE tagad_users(id uuid PRIMARY KEY);');
    await db.exec(readFileSync(new URL('../supabase/migrations/20260916041906_feedback_review.sql', import.meta.url), 'utf8'));
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(db.query('SELECT message FROM tagad_citizen_feedback'), /permission denied/);
      await db.exec('RESET ROLE');
      await db.exec(`GRANT ALL ON tagad_citizen_feedback TO ${role}; SET ROLE ${role}`);
      assert.equal((await db.query('SELECT message FROM tagad_citizen_feedback')).rows.length, 0);
      await assert.rejects(db.exec("INSERT INTO tagad_citizen_feedback(name,email,subject,message) VALUES('n','e','s','private message')"), /row-level security/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    await db.exec("INSERT INTO tagad_citizen_feedback(name,email,subject,message) VALUES('n','e','s','private message')");
    assert.equal((await db.query('SELECT * FROM tagad_citizen_feedback')).rows.length, 1);
  } finally { await db.close(); }
});
