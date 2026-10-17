import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import ExcelJS from 'exceljs';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { ProvisionalGadService, parseEntryFile, COLUMNS, provisionalError } from '../server/services/ProvisionalGadService';
import routes from '../server/routes/provisionalGad';
import { signAccessToken } from '../server/lib/jwt';

if (process.env.GAD_ISOLATED_QUALIFICATION !== '1' || !/^postgresql:\/\/postgres@127\.0\.0\.1:\d+\/tagad_provisional_test$/.test(process.env.DATABASE_URL || '')) throw new Error('Only the disposable qualification runner may execute this script.');
const service = new ProvisionalGadService();
let checks = 0;
async function check(name: string, fn: () => Promise<void>) { await fn(); checks++; console.log('PASS ' + name); }
const office = await prisma.office.create({ data: { code: 'SYNTH-GAD', name: 'Synthetic office' } });
const otherOffice = await prisma.office.create({ data: { code: 'SYNTH-OTHER', name: 'Synthetic other office' } });
const actor = await prisma.user.create({ data: { email: 'encoder@synthetic.invalid', fullName: 'Synthetic encoder', passwordHash: 'not-a-login', role: 'ENCODER', officeId: office.id } });
const viewer = await prisma.user.create({ data: { email: 'viewer@synthetic.invalid', fullName: 'Synthetic viewer', passwordHash: 'not-a-login', role: 'VIEWER', officeId: office.id } });
const outsider = await prisma.user.create({ data: { email: 'other@synthetic.invalid', fullName: 'Synthetic other', passwordHash: 'not-a-login', role: 'ADMIN', officeId: otherOffice.id } });
const barangays = await Promise.all([1, 2, 3].map(n => prisma.barangay.create({ data: { code: 'SYNTH-' + n, name: 'Synthetic fixture ' + n } })));
await prisma.provisionalGadReference.createMany({ data: barangays.slice(0, 2).map(b => ({ barangayId: b.id, evidence: 'Isolated synthetic test evidence, not LGU approval', isSynthetic: true })) });
const series = await service.createSeries(actor.id, { code: 'SYNTH-SERIES', name: 'Synthetic aggregate count', sourceReference: 'Synthetic test source only' });
const row = { barangay_code: barangays[0].code, period: '2026', male: '3', female: '4', source_reference: 'Synthetic worksheet' };
async function save(rows: any[], seriesId = series.id) {
  const preview = await service.preview(actor.id, seriesId, rows);
  assert.ok(preview.confirmationToken);
  return service.commit(actor.id, { seriesId, ...preview, confirmed: true });
}
const app = express(); app.use(express.json()); app.use('/api/provisional-gad', routes);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(r => server.once('listening', r));
const base = 'http://127.0.0.1:' + (server.address() as any).port;
setDatabaseConnected(true);
try {
  await check('manual create persists counts, explicit owner, creator and atomic audit', async () => {
    await save([row]);
    const entry = await prisma.provisionalGadEntry.findFirstOrThrow();
    assert.equal(entry.owningOfficeId, office.id); assert.equal(entry.creatorId, actor.id);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: entry.id } });
    assert.equal((audit.afterState as any).male, 3); assert.equal((audit.afterState as any).sourceReference, row.source_reference);
  });
  await check('totals, missing barangays and empty periods never fabricate zeros', async () => {
    const stats = await service.statistics(actor.id, series.id, '2026');
    assert.deepEqual(stats.totals, { male: 3, female: 4, total: 7 }); assert.equal(stats.missing, 1);
    assert.equal(stats.rows.find(r => r.barangayId === barangays[1].id)?.total, null);
    assert.equal((await service.statistics(actor.id, series.id, '2025')).totals, null);
  });
  await check('CSV preview/commit preserves file provenance and source', async () => {
    const parsed = await parseEntryFile({ originalname: 'fixture.csv', buffer: Buffer.from(COLUMNS.join(',') + '\nSYNTH-1,2026-Q1,0,8,"Synthetic, source"') });
    const preview = await service.preview(actor.id, series.id, parsed.rows, 'fixture.csv');
    await service.commit(actor.id, { seriesId: series.id, ...preview, confirmed: true });
    const entry = await prisma.provisionalGadEntry.findFirstOrThrow({ where: { period: '2026-Q1' } });
    assert.equal(entry.male, 0); assert.equal(entry.sourceFileName, 'fixture.csv'); assert.equal(entry.sourceReference, 'Synthetic, source');
  });
  await check('XLSX preview/commit and row numbers', async () => {
    const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Counts');
    sheet.addRow(COLUMNS); sheet.addRow(['SYNTH-1', '2026-Q2', 10, 11, 'Synthetic XLSX']);
    const parsed = await parseEntryFile({ originalname: 'fixture.xlsx', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
    assert.deepEqual(parsed.rowNumbers, [2]); await save(parsed.rows);
  });
  await check('all invalid count types, empty values, overflow and invalid references rejected', async () => {
    for (const value of ['', ' ', -1, 1.2, '1e2', true, null, '2147483648']) {
      const result = await service.preview(actor.id, series.id, [{ ...row, period: '2027', male: value }]);
      assert.equal(result.confirmationToken, null, String(value));
    }
    const result = await service.preview(actor.id, series.id, [{ ...row, barangay_code: 'SYNTH-3' }]);
    assert.match(result.results[0].errors.join(), /roster/);
  });
  await check('persisted and within-file duplicates block all writes', async () => {
    assert.equal((await service.preview(actor.id, series.id, [row])).confirmationToken, null);
    const result = await service.preview(actor.id, series.id, [{ ...row, period: '2028' }, { ...row, period: '2028' }]);
    assert.equal(result.confirmationToken, null); assert.ok(result.results.every(r => r.errors.length));
  });
  await check('concurrent submissions yield one record and one audit', async () => {
    const preview = await service.preview(actor.id, series.id, [{ ...row, period: '2029' }]);
    const input = { seriesId: series.id, ...preview, confirmed: true };
    const outcomes = await Promise.allSettled([service.commit(actor.id, input), service.commit(actor.id, input)]);
    assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
    const entry = await prisma.provisionalGadEntry.findFirstOrThrow({ where: { period: '2029' } });
    assert.equal(await prisma.provisionalGadEntry.count({ where: { period: '2029' } }), 1);
    assert.equal(await prisma.auditLog.count({ where: { entityId: entry.id } }), 1);
  });
  await check('confirmation binding rejects tampering, other actors and absent confirmation', async () => {
    const preview = await service.preview(actor.id, series.id, [{ ...row, period: '2030' }]);
    await assert.rejects(service.commit(actor.id, { seriesId: series.id, ...preview, confirmed: false }));
    await assert.rejects(service.commit(actor.id, { seriesId: series.id, ...preview, rows: [{ ...row, period: '2031' }], confirmed: true }));
    await assert.rejects(service.commit(viewer.id, { seriesId: series.id, ...preview, confirmed: true }));
  });
  await check('viewer and cross-office write/read restrictions', async () => {
    await assert.rejects(service.preview(viewer.id, series.id, [row]), /role/);
    await assert.rejects(service.statistics(outsider.id, series.id, '2026'), /owning office/);
    await assert.rejects(service.createSeries(viewer.id, { code: 'BLOCKED', name: 'Blocked', sourceReference: 'x' }));
    await prisma.user.update({ where: { id: actor.id }, data: { barangayId: barangays[1].id } });
    assert.equal((await service.statistics(actor.id, series.id, '2026')).totals, null);
    assert.equal((await service.preview(actor.id, series.id, [{ ...row, period: '2030' }])).confirmationToken, null);
    await prisma.user.update({ where: { id: actor.id }, data: { barangayId: null } });
  });
  await check('ownership remains stable when creator changes office', async () => {
    await prisma.user.update({ where: { id: actor.id }, data: { officeId: otherOffice.id } });
    await assert.rejects(service.statistics(actor.id, series.id, '2026'), /owning office/);
    assert.equal((await prisma.provisionalGadSeries.findUniqueOrThrow({ where: { id: series.id } })).owningOfficeId, office.id);
    await prisma.user.update({ where: { id: actor.id }, data: { officeId: office.id } });
  });
  await check('audit failure rolls back the entire multi-row batch', async () => {
    await prisma.$executeRawUnsafe("CREATE FUNCTION synthetic_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'PROVISIONAL_GAD_ENTRY_CREATED' AND NEW.after_state->>'male' = '99' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$");
    await prisma.$executeRawUnsafe('CREATE TRIGGER synthetic_fail BEFORE INSERT ON tagad_audit_logs FOR EACH ROW EXECUTE FUNCTION synthetic_fail_audit()');
    const before = await prisma.provisionalGadEntry.count();
    const auditsBefore = await prisma.auditLog.count();
    await assert.rejects(save([{ ...row, period: '2032' }, { ...row, period: '2033', male: '99' }]));
    assert.equal(await prisma.provisionalGadEntry.count(), before);
    assert.equal(await prisma.auditLog.count(), auditsBefore);
    await prisma.$executeRawUnsafe('DROP TRIGGER synthetic_fail ON tagad_audit_logs');
    await prisma.$executeRawUnsafe('DROP FUNCTION synthetic_fail_audit()');
  });
  await check('database checks enforce counts and matching series ownership', async () => {
    const entry = await prisma.provisionalGadEntry.findFirstOrThrow();
    await assert.rejects(prisma.provisionalGadEntry.update({ where: { id: entry.id }, data: { male: -1 } }));
    await assert.rejects(prisma.provisionalGadEntry.update({ where: { id: entry.id }, data: { owningOfficeId: otherOffice.id } }));
  });
  await check('synthetic roster is excluded outside isolated test mode', async () => {
    process.env.NODE_ENV = 'development';
    assert.equal((await service.context(actor.id)).references.length, 0);
    assert.equal((await service.statistics(actor.id, series.id, '2026')).totals, null);
    process.env.NODE_ENV = 'test';
  });
  await check('anonymous routes rejected and no public route exists', async () => {
    assert.equal((await fetch(base + '/api/provisional-gad/context')).status, 401);
    assert.equal((await fetch(base + '/api/public/provisional-gad')).status, 404);
    assert.equal((await fetch(base + '/api/provisional-gad/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  });
  const token = signAccessToken({ id: actor.id, email: actor.email, role: actor.role, officeId: office.id } as any);
  await check('HTTP CSV and XLSX upload preview and confirmed atomic commit', async () => {
    for (const extension of ['csv', 'xlsx']) {
      const period = extension === 'csv' ? '2035' : '2036';
      let buffer: Buffer;
      if (extension === 'csv') buffer = Buffer.from(COLUMNS.join(',') + '\nSYNTH-1,' + period + ',5,6,Synthetic HTTP');
      else {
        const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Synthetic');
        sheet.addRow(COLUMNS); sheet.addRow(['SYNTH-1', period, 5, 6, 'Synthetic HTTP']);
        buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      }
      const data = new FormData(); data.append('seriesId', series.id); data.append('file', new Blob([buffer]), 'synthetic.' + extension);
      const response = await fetch(base + '/api/provisional-gad/preview', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: data });
      assert.equal(response.status, 200);
      const preview = (await response.json() as any).data; assert.equal(preview.results[0].rowNumber, 2);
      const saved = await fetch(base + '/api/provisional-gad/commit', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ seriesId: series.id, ...preview, confirmed: true }) });
      assert.equal(saved.status, 200);
      assert.equal((await prisma.provisionalGadEntry.findFirstOrThrow({ where: { period } })).sourceFileName, 'synthetic.' + extension);
    }
  });
  await check('distinct source series never combine and revoked references invalidate previews', async () => {
    const second = await service.createSeries(actor.id, { code: 'SYNTH-SECOND', name: 'Separate count', sourceReference: 'Different synthetic source' });
    await save([{ ...row, male: '99' }], second.id);
    assert.equal((await service.statistics(actor.id, series.id, '2026')).totals?.male, 3);
    assert.equal((await service.statistics(actor.id, second.id, '2026')).totals?.male, 99);
    const preview = await service.preview(actor.id, series.id, [{ ...row, period: '2037' }]);
    await prisma.provisionalGadReference.update({ where: { barangayId: barangays[0].id }, data: { isActive: false } });
    await assert.rejects(service.commit(actor.id, { seriesId: series.id, ...preview, confirmed: true }), /Preview again/);
    await prisma.provisionalGadReference.update({ where: { barangayId: barangays[0].id }, data: { isActive: true } });
  });
  await check('HTTP manual preview/commit and duplicate response', async () => {
    const post = (path: string, body: any) => fetch(base + '/api/provisional-gad/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const preview = await (await post('preview', { seriesId: series.id, rows: [{ ...row, period: '2034' }] })).json() as any;
    assert.ok(preview.data.confirmationToken);
    assert.equal((await post('commit', { seriesId: series.id, ...preview.data, confirmed: true })).status, 200);
    assert.equal((await post('commit', { seriesId: series.id, ...preview.data, confirmed: true })).status, 409);
    const statsResponse = await fetch(base + '/api/provisional-gad/statistics?seriesId=' + series.id + '&period=2034', { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(statsResponse.status, 200);
    const stats = (await statsResponse.json() as any).data;
    assert.deepEqual(stats.totals, { male: 3, female: 4, total: 7 });
    assert.equal(stats.missing, 1);
    const foreignToken = signAccessToken({ id: outsider.id, email: outsider.email, role: outsider.role, officeId: otherOffice.id } as any);
    assert.equal((await fetch(base + '/api/provisional-gad/statistics?seriesId=' + series.id + '&period=2034', { headers: { Authorization: 'Bearer ' + foreignToken } })).status, 403);
  });
  await check('HTTP malformed uploads return validation errors', async () => {
    const data = new FormData(); data.append('seriesId', series.id); data.append('file', new Blob(['not a workbook']), 'bad.xlsx');
    assert.equal((await fetch(base + '/api/provisional-gad/preview', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: data })).status, 422);
  });
  await check('Data API grants and RLS exclude every provisional table', async () => {
    const exposed = await prisma.$queryRawUnsafe<any[]>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'tagad_provisional_%' AND (NOT rowsecurity OR has_table_privilege('anon',tablename,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',tablename,'SELECT,INSERT,UPDATE,DELETE'))");
    assert.equal(exposed.length, 0);
  });
  await check('database outage is explicit and never substitutes fixtures', async () => {
    const failing = new ProvisionalGadService({ user: { findUnique: async () => { throw new Error('synthetic outage'); } } } as any);
    await assert.rejects(failing.context(randomUUID()), /outage/);
    assert.equal(provisionalError(new Error('synthetic outage')).statusCode, 503);
    setDatabaseConnected(false);
    assert.equal((await fetch(base + '/api/provisional-gad/context', { headers: { Authorization: 'Bearer ' + token } })).status, 503);
    setDatabaseConnected(true);
  });
  console.log('QUALIFICATION PASSED: ' + checks + ' scenarios, disposable PostgreSQL, synthetic data only.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  await prisma.$disconnect();
}
