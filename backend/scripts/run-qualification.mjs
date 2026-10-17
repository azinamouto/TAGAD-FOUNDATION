// Runs the qualification against an isolated local PostgreSQL cluster.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '/usr/lib/postgresql/17/bin');
const scratch = mkdtempSync(join(root, '.qualification-'));
const data = join(scratch, 'data');
const socket = net.createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const env = { ...process.env, DATABASE_URL: `postgresql://postgres@127.0.0.1:${port}/tagad_qualification`, DIRECT_URL: `postgresql://postgres@127.0.0.1:${port}/tagad_qualification`, TSX_DISABLE_CACHE: '1', NODE_ENV: 'test' };
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit ${result.status}`);
}
function query(database, sql) {
  const result = spawnSync(join(bin, 'psql'), [
    '-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres',
    '-d', database, '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-c', sql,
  ], { cwd: root, env, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Local restore verification query failed');
  return result.stdout.trim();
}
function snapshot(database) {
  const tables = query(database, "SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname IN ('public', 'auth') ORDER BY schemaname, tablename").split(/\r?\n/).filter(Boolean);
  if (!tables.length) throw new Error('Restore verification requires application tables');
  return tables.map(table => {
    const identifier = table.split('.').map(s => '"' + s.replaceAll('"', '""') + '"').join('.');
    const fingerprint = query(database, `SELECT count(*)::text || ':' || md5(COALESCE(string_agg(row_to_json(r)::text, E'\\n' ORDER BY row_to_json(r)::text), '')) FROM ${identifier} r`);
    return { table, fingerprint };
  });
}
function catalog(database) {
  const rows = JSON.parse(query(database, `SELECT jsonb_agg(v ORDER BY v::text) FROM (
    SELECT jsonb_build_object('kind','column','value',to_jsonb(c)) v FROM information_schema.columns c WHERE table_schema IN ('public','auth')
    UNION ALL SELECT jsonb_build_object('kind','constraint','table',conrelid::regclass::text,'name',conname,'valid',convalidated,'definition',pg_get_constraintdef(oid)) FROM pg_constraint WHERE connamespace IN ('public'::regnamespace,'auth'::regnamespace)
    UNION ALL SELECT jsonb_build_object('kind','index','value',to_jsonb(i)) FROM pg_indexes i WHERE schemaname IN ('public','auth')
    UNION ALL SELECT jsonb_build_object('kind','policy','value',to_jsonb(p)) FROM pg_policies p WHERE schemaname IN ('public','auth')
    UNION ALL SELECT jsonb_build_object('kind','security','table',relname,'owner',pg_get_userbyid(relowner),'rls',relrowsecurity,'force',relforcerowsecurity,'acl',(SELECT jsonb_agg(a::text ORDER BY a::text) FROM unnest(COALESCE(relacl,acldefault('r',relowner))) a)) FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'auth'::regnamespace) AND relkind='r'
    UNION ALL SELECT jsonb_build_object('kind','function','definition',pg_get_functiondef(oid),'owner',pg_get_userbyid(proowner)) FROM pg_proc WHERE pronamespace IN ('public'::regnamespace,'auth'::regnamespace) AND prokind='f'
    UNION ALL SELECT jsonb_build_object('kind','enum','name',t.typname,'labels',(SELECT jsonb_agg(enumlabel ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid=t.oid)) FROM pg_type t WHERE typnamespace='public'::regnamespace AND typtype='e'
    UNION ALL SELECT jsonb_build_object('kind','trigger','definition',pg_get_triggerdef(oid)) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'auth'::regnamespace))
  ) objects`).replaceAll(database, 'QUALIFICATION_DATABASE'));
  for (const row of rows) {
    // pg_dump/reparse can distribute a varchar[] -> text[] cast to each literal.
    // Normalize only this lossless cast shape; retain every literal and operator.
    if (row.kind === 'constraint' && row.definition) row.definition = row.definition.replace(
      /\(\(ARRAY\[((?:'[^']*'::character varying(?:, )?)+)\]\)::text\[\]\)/g,
      (_, items) => '(ARRAY[' + items.split(', ').map(item => '(' + item + ')::text').join(', ') + '])');
  }
  return JSON.stringify(rows);
}
function evidence(name, value) {
  if (!process.env.WP03_EVIDENCE_DIR) return;
  mkdirSync(process.env.WP03_EVIDENCE_DIR, { recursive: true });
  writeFileSync(join(process.env.WP03_EVIDENCE_DIR, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
}
let started = false;
try {
  run(process.execPath, ['node_modules/prisma/build/index.js', 'validate']);
  run(join(bin, 'initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  run(join(bin, 'pg_ctl'), ['-D', data, '-l', join(scratch, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start']);
  started = true;
  run(join(bin, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'tagad_qualification']);
  run(join(bin, 'psql'), ['-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'tagad_qualification', '-v', 'ON_ERROR_STOP=1', '-f', 'scripts/qualification-platform.sql']);
  const migrations = readdirSync(join(root, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const file of migrations) {
    const beforeUpgrade = file === '20261017000001_revoked_tokens.sql' ? snapshot('tagad_qualification') : null;
    console.log(`REPLAY ${file} sha256=${createHash('sha256').update(readFileSync(join(root, 'supabase/migrations', file))).digest('hex')}`);
    run(join(bin, 'psql'), ['-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'tagad_qualification', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', join('supabase/migrations', file)]);
    if (beforeUpgrade) {
      const afterUpgrade = snapshot('tagad_qualification').filter(r => r.table !== 'public.tagad_revoked_tokens');
      if (JSON.stringify(beforeUpgrade) !== JSON.stringify(afterUpgrade)) throw new Error('Additive migration changed existing rows');
      console.log('Upgrade preservation PASS: all pre-existing tables unchanged.');
    }
  }
  evidence('catalog.json', JSON.parse(catalog('tagad_qualification')));
  evidence('migration-manifest.json', migrations.map(file => ({ file, sha256: createHash('sha256').update(readFileSync(join(root, 'supabase/migrations', file))).digest('hex') })));
  const exposed = query('tagad_qualification', "SELECT count(*) FROM pg_tables t CROSS JOIN (VALUES ('anon'), ('authenticated')) r(role) WHERE t.schemaname='public' AND left(t.tablename,6)='tagad_' AND (NOT t.rowsecurity OR has_table_privilege(r.role, quote_ident(t.tablename), 'SELECT,INSERT,UPDATE,DELETE'))");
  if (exposed !== '0') throw new Error('Canonical table Data API isolation failed');
  console.log('Data API isolation PASS: RLS enabled and anon/authenticated lack table DML privileges.');
  {
    const source = join(scratch, 'source.prisma');
    writeFileSync(source, 'generator client {\n provider = "prisma-client-js"\n previewFeatures = ["multiSchema"]\n}\ndatasource db {\n provider = "postgresql"\n url = env("DATABASE_URL")\n schemas = ["public", "auth"]\n}\n');
    const target = join(scratch, 'target.prisma');
    writeFileSync(target, readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')
      .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  previewFeatures = ["multiSchema"]')
      .replace('provider = "postgresql"', 'provider = "postgresql"\n  schemas = ["public", "auth"]')
      .replace(/((?:model|enum) \w+ \{[\s\S]*?)\n}/g, '$1\n  @@schema("public")\n}'));
    const diff = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-schema-datasource', source, '--to-schema-datamodel', target, '--script'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
    if (diff.status !== 0) throw new Error(diff.stderr || 'Prisma drift comparison failed');
    const baseline = readFileSync(join(root, '../docs/realignment/wp03/evidence/schema-diff.sql.txt'), 'utf8');
    if (baseline.replaceAll('\r\n', '\n').trimEnd() !== diff.stdout.replaceAll('\r\n', '\n').trimEnd()) throw new Error('Unreviewed SQL/Prisma drift: compare the migration chain with the committed WP03 baseline; never apply this diagnostic diff');
    console.log('Schema drift baseline PASS: exact match to reviewed SQL/Prisma differences.');
    evidence('schema-diff.sql.txt', diff.stdout.trimEnd() + '\n');
  }
  if (process.env.WP03_REPLAY_ONLY === '1') process.exitCode = 0;
  else {
  if (process.env.WP03_BACKUP_ONLY !== '1') {
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-cbms-catalog.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/e2e-qualification-issue16.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-import-layout.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-gad-workflow.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-audit-integrity.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-statistical-search.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-revocation.ts']);
  }
  run(process.execPath, ['--import', 'tsx', 'scripts/qualification-preservation.ts']);
  query('tagad_qualification', "INSERT INTO tagad_revoked_tokens (token_hash,jti,user_id,reason,expires_at) SELECT repeat('a',64),'wp03-synthetic-session',id,'Synthetic restore preservation','2099-01-01' FROM tagad_users WHERE email='wp03@synthetic.invalid'");
  // Restore only synthetic qualification data into a second disposable database.
  // A local logical restore does not certify deployed backups or Supabase PITR.
  const before = snapshot('tagad_qualification');
  const schemaBefore = catalog('tagad_qualification');
  if (!before.some(row => !row.fingerprint.startsWith('0:'))) throw new Error('Restore fixture unexpectedly empty');
  const dump = join(scratch, 'synthetic-backup.dump');
  run(join(bin, 'pg_dump'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres',
    '-d', 'tagad_qualification', '--format=custom', '--file', dump]);
  run(join(bin, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'tagad_restore_qualification']);
  const restoreStarted = Date.now();
  run(join(bin, 'pg_restore'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres',
    '-d', 'tagad_restore_qualification', '--exit-on-error', dump]);
  const after = snapshot('tagad_restore_qualification');
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Restored table counts/content differ from source');
  const schemaAfter = catalog('tagad_restore_qualification');
  if (schemaBefore !== schemaAfter) {
    evidence('restore-catalog-before.json', JSON.parse(schemaBefore));
    evidence('restore-catalog-after.json', JSON.parse(schemaAfter));
    throw new Error('Restored columns, relationships, constraints, indexes or security differ');
  }
  evidence('restore.json', { before, after, catalogEqual: true, restoreAndVerificationMs: Date.now() - restoreStarted });
  console.log(`Local synthetic backup/restore PASS: all ${before.length} public/auth tables match by count and row-content fingerprint; columns, constraints, indexes, policies, RLS, ACLs and triggers match; restore plus verification ${Date.now() - restoreStarted}ms.`);
  }
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  if (started) run(join(bin, 'pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']);
  // Only delete the directory created by mkdtemp inside this backend workspace.
  if (dirname(scratch) !== root || !scratch.startsWith(join(root, '.qualification-'))) throw new Error('Unsafe cleanup path');
  rmSync(scratch, { recursive: true, force: true });
}
