import './testEnvironment';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import { Role } from '@prisma/client';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { DashboardService } from '../server/services/DashboardService';
import { BarangayService } from '../server/services/BarangayService';
import { GADPlanService } from '../server/services/GADPlanService';
import { AccomplishmentService } from '../server/services/AccomplishmentService';
import { GarReportService } from '../server/services/GarReportService';
import { BeneficiaryService } from '../server/services/BeneficiaryService';
import { getGPBExcel, getGARExcel } from '../server/controllers/reportController';
import dashboardRoutes from '../server/routes/dashboard';
import beneficiaryRoutes from '../server/routes/beneficiaries';
import adminBeneficiaryRoutes from '../server/routes/admin/beneficiaries';
import reportRoutes from '../server/routes/reports';
import publicRoutes from '../server/routes/public';
import { getBeneficiariesPDF } from '../server/controllers/reportController';
import { getDashboardStats } from '../server/controllers/admin/dashboardController';
import { requireAuth } from '../server/middleware/authMiddleware';
import { dashboardReadRateLimiter } from '../server/middleware/rateLimiter';
import { signAccessToken } from '../server/lib/jwt';

const restores: Array<() => void> = [];
const mock = {
  method(target: any, key: string, replacement: any) {
    const original = target[key]; target[key] = replacement;
    restores.push(() => { target[key] = original; });
  },
  restoreAll() { restores.splice(0).reverse().forEach(restore => restore()); },
};

const actor = { id: 'encoder-a', role: Role.ENCODER, officeId: 'office-a' };
afterEach(() => { mock.restoreAll(); setDatabaseConnected(false); });
async function serve(app: express.Express, run: (url: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as any).port}`); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

function dashboardDatabase() {
  setDatabaseConnected(true);
  const rows = ['a', 'b'].map(key => ({ id: key, officeId: `office-${key}`, firstName: `Synthetic-${key}`, sex: 'FEMALE', isArchived: false, barangayId: 'brgy', barangay: { name: 'Fixture' }, office: { code: key }, createdAt: new Date() }));
  const scoped = (where: any) => rows.filter(row => !where.officeId || row.officeId === where.officeId);
  mock.method(prisma.beneficiary, 'count', async ({ where }: any) => scoped(where).filter(row => !where.sex || row.sex === where.sex).length);
  mock.method(prisma.beneficiary, 'findMany', async ({ where }: any) => scoped(where));
  mock.method(prisma.beneficiary, 'groupBy', async ({ where, by }: any) => {
    assert.equal(where.officeId, actor.officeId);
    return by.includes('sex') ? [{ barangayId: 'brgy', sex: 'FEMALE', _count: { id: scoped(where).length } }] : [];
  });
  mock.method(prisma.program, 'findMany', async ({ where }: any) => { assert.equal(where.officeId, actor.officeId); return [{ budgetTarget: 100 }]; });
  mock.method(prisma.gADPlan, 'groupBy', async ({ where }: any) => { assert.equal(where.officeId, actor.officeId); return []; });
  mock.method(prisma.gADAccomplishment, 'findMany', async ({ where }: any) => {
    assert.deepEqual(where.OR, [{ program: { officeId: actor.officeId } }, { gadPlanItem: { gadPlan: { officeId: actor.officeId } } }]);
    return [{ actualBudgetUsed: 25 }];
  });
  mock.method(prisma.auditLog, 'findMany', async () => { assert.fail('Encoder must not query global audit logs'); });
  mock.method(prisma.barangay, 'findMany', async () => [{ id: 'brgy', name: 'Fixture' }]);
}

test('dashboard scopes every aggregate and detail query and fails closed on errors', async () => {
  dashboardDatabase();
  const stats = await DashboardService.getAdminDashboardStats(2026, actor);
  assert.equal(stats.summary.totalBeneficiaries, 1);
  assert.equal(stats.summary.totalFemale, 1);
  assert.equal(stats.summary.totalMale, 0);
  assert.deepEqual(stats.recentBeneficiaries.map(row => row.id), ['a']);
  assert.deepEqual(stats.recentAuditLogs, []);
  assert.equal(stats.byBarangay[0].total, 1);
  await assert.rejects(DashboardService.getAdminDashboardStats(2026), /Authentication/);
  await assert.rejects(DashboardService.getAdminDashboardStats(2026, { ...actor, officeId: null }), /assigned office/);
  mock.method(prisma.beneficiary, 'count', async () => { throw new Error('Synthetic database outage'); });
  await assert.rejects(DashboardService.getAdminDashboardStats(2026, actor), (error: any) => error.statusCode === 503);
  await assert.rejects(DashboardService.getPublicDashboardStats(2026), (error: any) => error.statusCode === 503);
});

test('all dashboard HTTP aliases forward authenticated scope and reject anonymous reads', async () => {
  setDatabaseConnected(false);
  mock.method(DashboardService, 'getAdminDashboardStats', async (_year: any, user: any) => {
    assert.ok(user?.id); return { summary: { totalBeneficiaries: 0 } } as any;
  });
  const app = express();
  app.use('/api/dashboard', dashboardRoutes);
  app.get('/api/admin/dashboard', dashboardReadRateLimiter, requireAuth, getDashboardStats);
  const token = signAccessToken({ id: 'usr-superadmin-01', email: 'fixture@example.test', role: 'SUPER_ADMIN' });
  await serve(app, async url => {
    for (const path of ['/api/dashboard', '/api/dashboard/stats', '/api/admin/dashboard']) {
      assert.equal((await fetch(url + path)).status, 401);
      assert.equal((await fetch(url + path, { headers: { Authorization: `Bearer ${token}` } })).status, 200);
    }
  });
});

test('review: real dashboard service isolates encoder through every HTTP alias', async () => {
  dashboardDatabase();
  mock.method(prisma.revokedToken, 'findFirst', async () => null);
  mock.method(prisma.user, 'findUnique', async () => ({ ...actor, isActive: true, email: 'fixture@example.test' }));
  const app = express(); app.use('/api/dashboard', dashboardRoutes);
  app.get('/api/admin/dashboard', dashboardReadRateLimiter, requireAuth, getDashboardStats);
  const token = signAccessToken({ ...actor, email: 'fixture@example.test' });
  await serve(app, async url => {
    for (const path of ['/api/dashboard', '/api/dashboard/stats', '/api/admin/dashboard']) {
      const response = await fetch(url + path + '?officeId=office-b', { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200);
      const body = await response.json(); const stats = body.data || body;
      assert.equal(stats.summary.totalBeneficiaries, 1);
      assert.deepEqual(stats.recentBeneficiaries.map((row: any) => row.id), ['a']);
      assert.deepEqual(stats.recentAuditLogs, []);
    }
  });
});

test('legacy/admin writes have equal demographic validation and retain name-based clients', async () => {
  setDatabaseConnected(false);
  const saved: any[] = [];
  mock.method(BeneficiaryService, 'createBeneficiary', async (data: any) => { saved.push(data); return data; });
  mock.method(BeneficiaryService, 'updateBeneficiary', async (_id: any, data: any) => { saved.push(data); return data; });
  const app = express(); app.use(express.json());
  app.use('/api/beneficiaries', beneficiaryRoutes);
  app.use('/api/admin/beneficiaries', requireAuth, adminBeneficiaryRoutes);
  const token = signAccessToken({ id: 'usr-superadmin-01', email: 'fixture@example.test', role: 'SUPER_ADMIN' });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const valid = { firstName: 'Synthetic', lastName: 'Record', age: '0', sex: 'FEMALE', sector: 'Fixture', barangay: 'Fixture', office: 'A' };
  await serve(app, async url => {
    for (const path of ['/api/beneficiaries', '/api/admin/beneficiaries']) {
      for (const invalid of [{ age: undefined }, { age: null }, { age: '' }, { age: ' ' }, { age: true }, { age: -1 }, { age: '2.5' }, { sex: undefined }, { sex: 'invalid' }]) {
        assert.equal((await fetch(url + path, { method: 'POST', headers, body: JSON.stringify({ ...valid, ...invalid }) })).status, 422);
      }
      assert.equal((await fetch(url + path, { method: 'POST', headers, body: JSON.stringify(valid) })).status, 201);
      const detail = `${url}${path}/00000000-0000-4000-8000-000000000001`;
      assert.equal((await fetch(detail, { method: 'PUT', headers, body: JSON.stringify({ sex: 'invalid' }) })).status, 422);
      assert.equal((await fetch(detail, { method: 'PUT', headers, body: JSON.stringify({ firstName: 'Updated' }) })).status, 200);
    }
  });
  assert.equal(saved.length, 4);
  assert.equal(saved[0].age, 0);
  assert.equal(saved[0].barangay, 'Fixture');
  assert.equal(saved[0].office, 'A');
  assert.deepEqual(saved[1], { firstName: 'Updated' });
});

test('strict report reads cannot return fallback fixtures, even on a query failure', async () => {
  for (const connected of [false, true]) {
    setDatabaseConnected(connected);
    mock.method(prisma.gADPlan, 'findMany', async () => { throw new Error('Synthetic outage'); });
    mock.method(prisma.gADAccomplishment, 'findMany', async () => { throw new Error('Synthetic outage'); });
    for (const read of [
      () => GADPlanService.getGADPlans({}, actor, { strict: true }),
      () => AccomplishmentService.getAccomplishments({}, actor, { strict: true }),
      () => GarReportService.getQuarterlyGarVariance({}, actor, { strict: true }),
    ]) await assert.rejects(read(), (error: any) => error.statusCode === 503);
  }
});

test('report controllers propagate actor and export incomplete plans without invented content', async () => {
  mock.method(GADPlanService, 'getGADPlans', async (_params: any, user: any, options: any) => {
    assert.deepEqual(user, actor); assert.equal(options?.strict, true);
    return { plans: [{ items: [], totalBudget: 123, status: 'DRAFT', office: { name: 'Fixture Office' } }], items: [] } as any;
  });
  mock.method(AccomplishmentService, 'getAccomplishments', async (_params: any, user: any, options: any) => {
    assert.deepEqual(user, actor); assert.equal(options?.strict, true); return [];
  });
  const app = express();
  app.use((req: any, _res, next) => { if (req.headers['x-test-actor']) req.user = actor; next(); });
  app.get('/gpb', getGPBExcel); app.get('/gar', getGARExcel);
  await serve(app, async url => {
    for (const path of ['/gpb', '/gar']) {
      assert.equal((await fetch(url + path)).status, 403);
      const response = await fetch(url + path, { headers: { 'x-test-actor': 'yes' } });
      assert.equal(response.status, 200);
      const book = new ExcelJS.Workbook(); await book.xlsx.load(Buffer.from(await response.arrayBuffer()) as any);
      if (path === '/gpb') {
        assert.equal(book.worksheets[0].getRow(2).getCell(2).value, 'Gender Issue');
        const row = book.worksheets[0].getRow(3);
        for (const column of [2, 3, 5, 6, 7, 10]) assert.equal(row.getCell(column).value, null);
        assert.equal(row.getCell(4).value, 'No activity items recorded');
        assert.equal(row.getCell(9).value, 123);
        assert.equal(row.getCell(11).value, 'DRAFT');
      }
    }
  });
});

test('strict plan, accomplishment and variance queries use actor office despite other-office filters', async () => {
  setDatabaseConnected(true);
  mock.method(prisma.gADPlan, 'findMany', async ({ where }: any) => { assert.equal(where.officeId, actor.officeId); return []; });
  mock.method(prisma.gADAccomplishment, 'findMany', async ({ where }: any) => {
    assert.deepEqual(where.OR, [{ program: { officeId: actor.officeId } }, { gadPlanItem: { gadPlan: { officeId: actor.officeId } } }]); return [];
  });
  await GADPlanService.getGADPlans({ officeId: 'office-b' }, actor, { strict: true });
  await AccomplishmentService.getAccomplishments({ officeId: 'office-b' }, actor, { strict: true });
  await GarReportService.getQuarterlyGarVariance({ officeId: 'office-b' }, actor, { strict: true });
  for (const user of [undefined, { ...actor, officeId: null }]) {
    await assert.rejects(GADPlanService.getGADPlans({}, user, { strict: true }), (error: any) => error.statusCode === 403);
    await assert.rejects(AccomplishmentService.getAccomplishments({}, user, { strict: true }), (error: any) => error.statusCode === 403);
    await assert.rejects(GarReportService.getQuarterlyGarVariance({}, user, { strict: true }), (error: any) => error.statusCode === 403);
  }
});

test('empty plan summaries keep missing narratives explicit for existing page consumers', async () => {
  setDatabaseConnected(true);
  mock.method(prisma.gADPlan, 'findMany', async () => [{
    id: 'fixture', fiscalYear: 2026, officeId: actor.officeId, office: { code: 'A', name: 'Fixture' },
    items: [], totalBudget: 100, gadBudget: 5, mandatoryGADPercentage: 5, status: 'DRAFT',
  }]);
  const result = await GADPlanService.getGADPlans({}, actor, { strict: true });
  const item = result.items[0];
  assert.equal(item.activity, 'No activity items recorded');
  for (const field of ['genderIssue', 'gadResult', 'performanceIndicator', 'targetGroup', 'fundSource']) {
    assert.equal((item as any)[field], '');
  }
});

test('variance HTTP route requires auth and passes strict scoped actor', async () => {
  setDatabaseConnected(false);
  mock.method(GarReportService, 'getQuarterlyGarVariance', async (_params: any, user: any, options: any) => {
    assert.ok(user?.id); assert.equal(options?.strict, true); return { items: [] } as any;
  });
  const app = express(); app.use('/reports', reportRoutes);
  const token = signAccessToken({ id: 'usr-superadmin-01', email: 'fixture@example.test', role: 'SUPER_ADMIN' });
  await serve(app, async url => {
    assert.equal((await fetch(url + '/reports/gar-variance')).status, 401);
    assert.equal((await fetch(url + '/reports/gar-variance', { headers: { Authorization: `Bearer ${token}` } })).status, 200);
  });
});

test('production barangay outage never returns a fabricated roster or counts', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    setDatabaseConnected(false);
    await assert.rejects(BarangayService.getBarangays(), (error: any) => error.statusCode === 503);
    await assert.rejects(BarangayService.getBarangayById('fixture'), (error: any) => error.statusCode === 503);
    setDatabaseConnected(true);
    mock.method(prisma.barangay, 'findMany', async () => { throw new Error('Synthetic outage'); });
    mock.method(prisma.barangay, 'findUnique', async () => { throw new Error('Synthetic outage'); });
    await assert.rejects(BarangayService.getGeoData(), (error: any) => error.statusCode === 503);
    await assert.rejects(BarangayService.getBarangayById('fixture'), (error: any) => error.statusCode === 503);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('review: public demographics outage cannot produce sample statistical totals', async () => {
  const app = express(); app.use('/public', publicRoutes);
  await serve(app, async url => {
    for (const connected of [false, true]) {
      setDatabaseConnected(connected);
      mock.method(prisma.beneficiary, 'count', async () => { throw new Error('Synthetic outage'); });
      mock.method(prisma.beneficiary, 'groupBy', async () => []);
      mock.method(prisma.barangay, 'findMany', async () => []);
      const response = await fetch(url + '/public/demographics?year=2026');
      assert.equal(response.status, 503);
      assert.equal((await response.json()).data, undefined);
    }
  });
});

test('review: registry PDF rejects absent data source rather than exporting memory', async () => {
  const app = express();
  app.use((req: any, _res, next) => { req.user = actor; next(); });
  app.get('/pdf', getBeneficiariesPDF);
  await serve(app, async url => {
    for (const connected of [false, true]) {
      setDatabaseConnected(connected);
      mock.method(prisma.beneficiary, 'count', async () => { throw new Error('Synthetic outage'); });
      mock.method(prisma.beneficiary, 'findMany', async () => []);
      const response = await fetch(url + '/pdf');
      assert.equal(response.status, 503);
      assert.doesNotMatch(response.headers.get('content-type') || '', /pdf/);
    }
  });
});

test('review: all public statistical feeds report outages instead of sample narratives', async () => {
  const app = express(); app.use('/public', publicRoutes);
  await serve(app, async url => {
    for (const connected of [false, true]) {
      setDatabaseConnected(connected);
      for (const model of [prisma.program, prisma.gADPlan, prisma.gADAccomplishment]) {
        mock.method(model, 'findMany', async () => { throw new Error('Synthetic outage'); });
      }
      for (const path of ['/programs', '/gad-plans', '/accomplishments']) {
        const response = await fetch(url + '/public' + path);
        assert.equal(response.status, 503);
        assert.equal((await response.json()).data, undefined);
      }
    }
  });
});

test('review: dashboard aliases share a rate budget before authentication', async () => {
  setDatabaseConnected(false);
  dashboardReadRateLimiter.resetKey('127.0.0.1');
  const app = express(); app.use('/api/dashboard', dashboardRoutes);
  app.get('/api/admin/dashboard', dashboardReadRateLimiter, requireAuth, getDashboardStats);
  try {
    await serve(app, async url => {
      const paths = ['/api/dashboard', '/api/dashboard/stats', '/api/admin/dashboard'];
      for (let i = 0; i < 120; i++) assert.equal((await fetch(url + paths[i % 3])).status, 401);
      for (const path of paths) assert.equal((await fetch(url + path)).status, 429);
    });
  } finally { dashboardReadRateLimiter.resetKey('127.0.0.1'); }
});
