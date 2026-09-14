import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('canonical RLS blocks Data API roles, preserves policies and server access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE tagad_users (id int); CREATE TABLE tagad_beneficiaries (id int);
      CREATE TABLE unrelated (id int); INSERT INTO tagad_users VALUES (1);
      ALTER TABLE tagad_users ENABLE ROW LEVEL SECURITY;
      CREATE POLICY existing_allow ON tagad_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
      GRANT ALL ON tagad_users, tagad_beneficiaries TO anon, authenticated, service_role;`);
    const folder = new URL('../supabase/migrations/', import.meta.url);
    const migration = readFileSync(new URL(readdirSync(folder).find(f => f.endsWith('_deny_tagad_data_api_access.sql'))!, folder), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    const policies = await db.query<{ policyname: string }>("SELECT policyname FROM pg_policies WHERE tablename='tagad_users'");
    assert.ok(policies.rows.some(p => p.policyname === 'existing_allow'));
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(db.query('SELECT * FROM tagad_users'), /permission denied/);
      await db.exec('RESET ROLE');
      // Even an accidental re-grant cannot bypass the restrictive policy.
      await db.exec(`GRANT ALL ON tagad_users TO ${role}; SET ROLE ${role}`);
      assert.equal((await db.query('SELECT * FROM tagad_users')).rows.length, 0);
      await assert.rejects(db.exec('INSERT INTO tagad_users VALUES (2)'), /row-level security/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    assert.equal((await db.query('SELECT * FROM tagad_users')).rows.length, 1);
    await db.exec('RESET ROLE');
    assert.equal((await db.query<{ relrowsecurity: boolean }>("SELECT relrowsecurity FROM pg_class WHERE relname='unrelated'")).rows[0].relrowsecurity, false);
  } finally { await db.close(); }
});
