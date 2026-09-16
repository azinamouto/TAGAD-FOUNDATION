import assert from 'node:assert/strict';
import { fork, ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { TokenRevocationService as Store } from '../server/services/TokenRevocationService';
import { signAccessToken, signRefreshToken, verifyAccessTokenAsync } from '../server/lib/jwt';

// Invoked only by run-qualification.mjs against its disposable PostgreSQL cluster.
if (!process.env.DATABASE_URL?.includes('/tagad_qualification')) throw new Error('Qualification database required');
process.env.DEMO_MODE = 'false';
setDatabaseConnected(true);

if (process.argv.includes('--worker')) {
  process.on('message', async (message: any) => {
    try {
      if (message.action === 'verify') await verifyAccessTokenAsync(message.token);
      if (message.action === 'revoke') await Store.revokeToken(message.token);
      if (message.action === 'consume') await Store.revokeToken(message.token, undefined, true);
      process.send?.({ ok: true });
    } catch (error: any) { process.send?.({ ok: false, name: error.name, code: error.code }); }
  });
  process.send?.({ ready: true });
} else {
  const children: ChildProcess[] = [];
  async function worker() {
    const child = fork(fileURLToPath(import.meta.url), ['--worker'], {
      execArgv: ['--import', 'tsx'], env: process.env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true,
    });
    children.push(child);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker startup timeout')), 30000);
      child.once('message', () => { clearTimeout(timeout); resolve(); });
      child.once('error', reject);
    });
    return child;
  }
  function call(child: ChildProcess, action: string, token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker operation timeout')), 30000);
      child.once('message', result => { clearTimeout(timeout); resolve(result); });
      child.send({ action, token });
    });
  }
  const user = await prisma.user.create({ data: {
    email: `revocation-${Date.now()}@example.test`, fullName: 'Revocation fixture', passwordHash: 'unused-fixture', role: 'ADMIN',
  } });
  try {
    const a = await worker(); const b = await worker();
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = signAccessToken(payload);
    assert.equal((await call(b, 'verify', token)).ok, true);
    assert.equal((await call(a, 'revoke', token)).ok, true);
    assert.equal((await call(b, 'verify', token)).name, 'TokenRevokedError');
    const restarted = await worker();
    assert.equal((await call(restarted, 'verify', token)).name, 'TokenRevokedError');
    const refresh = signRefreshToken(payload);
    const race = await Promise.all([call(a, 'consume', refresh), call(b, 'consume', refresh)]);
    assert.equal(race.filter(result => result.ok).length, 1);
    assert.equal(race.filter(result => result.name === 'TokenRevokedError').length, 1);
    console.log('Revocation PostgreSQL PASS: another running process, fresh process restart, and concurrent single-use refresh consumption.');
  } finally {
    for (const child of children) child.kill();
    await prisma.revokedToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}
