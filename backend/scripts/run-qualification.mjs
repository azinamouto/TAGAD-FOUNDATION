// Runs the qualification against an isolated local PostgreSQL cluster.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
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
  const tables = query(database, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").split(/\r?\n/).filter(Boolean);
  if (!tables.length) throw new Error('Restore verification requires application tables');
  return tables.map(table => {
    const identifier = '"' + table.replaceAll('"', '""') + '"';
    const fingerprint = query(database, `SELECT count(*)::text || ':' || md5(COALESCE(string_agg(row_to_json(r)::text, E'\\n' ORDER BY row_to_json(r)::text), '')) FROM public.${identifier} r`);
    return { table, fingerprint };
  });
}
let started = false;
try {
  run(join(bin, 'initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  run(join(bin, 'pg_ctl'), ['-D', data, '-l', join(scratch, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start']);
  started = true;
  run(join(bin, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'tagad_qualification']);
  run(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-cbms-catalog.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/e2e-qualification-issue16.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-import-layout.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-revocation.ts']);
  // Restore only synthetic qualification data into a second disposable database.
  // A local logical restore does not certify deployed backups or Supabase PITR.
  const before = snapshot('tagad_qualification');
  if (!before.some(row => !row.fingerprint.startsWith('0:'))) throw new Error('Restore fixture unexpectedly empty');
  const dump = join(scratch, 'synthetic-backup.dump');
  run(join(bin, 'pg_dump'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres',
    '-d', 'tagad_qualification', '--format=custom', '--no-owner', '--no-acl', '--file', dump]);
  run(join(bin, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'tagad_restore_qualification']);
  const restoreStarted = Date.now();
  run(join(bin, 'pg_restore'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres',
    '-d', 'tagad_restore_qualification', '--exit-on-error', '--no-owner', '--no-acl', dump]);
  const after = snapshot('tagad_restore_qualification');
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Restored table counts/content differ from source');
  console.log(`Local synthetic backup/restore PASS: all ${before.length} public tables match by count and row-content fingerprint; restore plus verification ${Date.now() - restoreStarted}ms.`);
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  if (started) run(join(bin, 'pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']);
  // Only delete the directory created by mkdtemp inside this backend workspace.
  if (dirname(scratch) !== root || !scratch.startsWith(join(root, '.qualification-'))) throw new Error('Unsafe cleanup path');
  rmSync(scratch, { recursive: true, force: true });
}
