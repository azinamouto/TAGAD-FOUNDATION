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
let started = false;
try {
  run(join(bin, 'initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  run(join(bin, 'pg_ctl'), ['-D', data, '-l', join(scratch, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start']);
  started = true;
  run(join(bin, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'tagad_qualification']);
  run(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate']);
  run(process.execPath, ['--import', 'tsx', 'scripts/qualify-cbms-catalog.ts']);
  run(process.execPath, ['--import', 'tsx', 'scripts/e2e-qualification-issue16.ts']);
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  if (started) run(join(bin, 'pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']);
  // Only delete the directory created by mkdtemp inside this backend workspace.
  if (dirname(scratch) !== root || !scratch.startsWith(join(root, '.qualification-'))) throw new Error('Unsafe cleanup path');
  rmSync(scratch, { recursive: true, force: true });
}
