import assert from 'node:assert/strict';
import express from 'express';
import prisma, { testDatabaseConnection } from '../server/lib/prisma';
import adminRoutes from '../server/routes/admin';
import gadRoutes from '../server/routes/gadPlans';
import { signAccessToken } from '../server/lib/jwt';

const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.pathname !== '/tagad_qualification') throw new Error('Disposable qualification database required');
await testDatabaseConnection();
const user = await prisma.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' } });
const office = await prisma.office.findFirstOrThrow();
const plan = await prisma.gADPlan.create({ data: { fiscalYear: 2094, officeId: office.id, totalBudget: 100000, gadBudget: 100, createdById: user.id } });
const app = express(); app.use(express.json()); app.use('/api/admin', adminRoutes); app.use('/api/gad-plans', gadRoutes);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
const base = `http://127.0.0.1:${(server.address() as any).port}`;
async function request(path: string, body: any, method = 'POST') {
  const res = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
try {
  const direct = `/api/gad-plans/${plan.id}`;
  const legacy = `/api/admin/gad-plans/${plan.id}`;
  assert.equal((await request(legacy + '/status', { status: 'APPROVED' }, 'PATCH')).status, 422);
  assert.equal((await request(legacy, { status: 'APPROVED' }, 'PUT')).status, 403);
  assert.equal((await request(direct + '/submit', {})).status, 200);
  assert.equal((await request(legacy + '/status', { status: 'APPROVED' }, 'PATCH')).status, 422);
  assert.equal((await request(direct + '/approve', { forceApproval: 'false', reason: 'Wrong input type' })).status, 422);
  assert.equal((await request(direct + '/approve', { forceApproval: true, reason: 'Synthetic exception rationale' })).status, 200);
  assert.equal((await request(legacy, { gadBudget: 0 }, 'PUT')).status, 403);
  assert.equal((await request(legacy, {}, 'DELETE')).status, 403);
  assert.equal((await request('/api/gad-plans', { fiscalYear: plan.fiscalYear, officeId: office.id, budget: 20 })).status, 403);
  const history = await prisma.auditLog.findMany({ where: { entityType: 'GADPlan', entityId: plan.id }, orderBy: { createdAt: 'asc' } });
  assert.equal(history.length, 2);
  assert.equal((history[0].beforeState as any).status, 'DRAFT');
  assert.equal((history[1].afterState as any).overrideReason, 'Synthetic exception rationale');
  await prisma.gADPlan.update({ where: { id: plan.id }, data: { status: 'DRAFT' } });
  await prisma.$executeRawUnsafe(`CREATE FUNCTION qualification_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER qualification_audit_failure BEFORE INSERT ON tagad_audit_logs FOR EACH ROW EXECUTE FUNCTION qualification_audit_failure()');
  try {
    assert.equal((await request(direct + '/submit', {})).status, 500);
    assert.equal((await prisma.gADPlan.findUniqueOrThrow({ where: { id: plan.id } })).status, 'DRAFT');
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER qualification_audit_failure ON tagad_audit_logs');
    await prisma.$executeRawUnsafe('DROP FUNCTION qualification_audit_failure()');
  }
  console.log('GAD PostgreSQL/HTTP PASS: legacy-route bypass denied, budget enforced, override reason persisted, audit failure rolls back status.');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await prisma.$disconnect();
}
