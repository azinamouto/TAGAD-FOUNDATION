// Disposable loopback PostgreSQL only. Never consumes configured database URLs.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '/usr/lib/postgresql/17/bin');
const scratch = mkdtempSync(join(root, '.qualification-gad-'));
const data = join(scratch, 'data');
const listener = net.createServer();
await new Promise(r => listener.listen(0, '127.0.0.1', r));
const port = listener.address().port;
await new Promise(r => listener.close(r));
const url = `postgresql://postgres@127.0.0.1:${port}/tagad_provisional_test`;
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, DATABASE_PROBE_DISABLED: 'true', NODE_ENV: 'test', DEMO_MODE: 'false', GAD_ISOLATED_QUALIFICATION: '1' };
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw result.error || new Error('Command failed: ' + command);
}
const connection = ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'tagad_provisional_test', '-v', 'ON_ERROR_STOP=1'];
let started = false;
try {
  run(join(bin, 'initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  run(join(bin, 'pg_ctl'), ['-D', data, '-l', join(scratch, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start']);
  started = true;
  run(join(bin, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'tagad_provisional_test']);
  run(join(bin, 'psql'), ['-X', ...connection, '-f', 'scripts/qualification-platform.sql']);
  for (const file of readdirSync(join(root, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) {
    console.log('REPLAY ' + file);
    run(join(bin, 'psql'), ['-X', ...connection, '--single-transaction', '-f', join('supabase/migrations', file)]);
  }
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-provisional-gad.ts']);
} catch (error) {
  console.error(error); process.exitCode = 1;
} finally {
  if (started) run(join(bin, 'pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']);
  if (dirname(scratch) !== root || !scratch.startsWith(join(root, '.qualification-gad-'))) throw new Error('Unsafe cleanup path');
  rmSync(scratch, { recursive: true, force: true });
}
