import assert from 'node:assert/strict';
import express from 'express';
import prisma, { testDatabaseConnection } from '../server/lib/prisma';
import adminRoutes from '../server/routes/admin';
import { signAccessToken } from '../server/lib/jwt';

const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.pathname !== '/tagad_qualification') throw new Error('Disposable qualification database required');
if (!await testDatabaseConnection()) throw new Error('Qualification database unavailable');
const user = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
const table = await prisma.statisticalTableDefinition.findUniqueOrThrow({ where: { tableCode: 'TBL-QUAL-01' } });
const dataset = await prisma.statisticalDataset.findUniqueOrThrow({ where: { datasetCode: 'DS-MPDC-2024-DRAFT' } });
const app = express(); app.use(express.json()); app.use('/api/admin', adminRoutes);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const token = signAccessToken({ id: user.id, email: user.email, role: user.role, officeId: user.officeId });
const base = `http://127.0.0.1:${(server.address() as any).port}/api/admin/statistical-import`;
try {
  const body = {
    csvContent: 'LGU,CBMS register\nYear,Barangay,Count,Sex\n2091,Bagacay,12,MALE',
    csvLayout: { headerRow: 2, headerRowCount: 1 }, datasetId: dataset.id, tableId: table.id,
    ingestionMode: 'RECORD_PER_ROW', duplicateStrategy: 'REJECT',
    mapping: { period: { sourceColumn: 'Year' }, barangay: { sourceColumn: 'Barangay' },
      numericValueColumn: 'Count', dimensions: { DIM_SEX: { sourceColumn: 'Sex' } } },
  };
  for (const action of ['discover', 'preview', 'execute']) {
    const response = await fetch(`${base}/${action}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const result = await response.json();
    assert.equal(response.status, action === 'execute' ? 201 : 200, JSON.stringify(result));
    if (action === 'discover') assert.equal(result.data.csvLayout.headerRow, 2);
    if (action === 'preview') { assert.equal(result.data.valid, true); assert.equal(result.data.rows[0].rowNumber, 3); }
    if (action === 'execute') assert.equal(result.data.insertedCount, 1);
  }
  assert.equal(await prisma.statisticalObservation.count({ where: { datasetId: dataset.id, period: '2091', numericValue: 12 } }), 1);
  const indicator = await prisma.statisticalIndicator.findFirstOrThrow({ where: { tableDefinitionId: table.id } });
  const matrix = {
    csvContent: 'Talibon statistics,,\nBarangay,Population,\n,Male,Female\nBagacay,20,25',
    datasetId: dataset.id, tableId: table.id, ingestionMode: 'MEASURE_COLUMNS', duplicateStrategy: 'REJECT',
    mapping: { barangay: { sourceColumn: 'Barangay' }, measureColumns: [
      { columnName: 'Population / Male', indicatorId: indicator.id, period: '2092', dimensions: { DIM_SEX: 'MALE' } },
      { columnName: 'Population / Female', indicatorId: indicator.id, period: '2092', dimensions: { DIM_SEX: 'FEMALE' } },
    ] },
  };
  const request = async (action: string, body: any) => {
    const response = await fetch(`${base}/${action}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const preview = await request('preview', matrix);
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.data.valid, true, JSON.stringify(preview.body));
  assert.equal(preview.body.data.rows.length, 2);
  assert.notEqual(preview.body.data.rows[0].coordinate.dimensionsHash, preview.body.data.rows[1].coordinate.dimensionsHash);
  const imported = await request('execute', matrix);
  assert.equal(imported.status, 201, JSON.stringify(imported.body));
  assert.equal(imported.body.data.insertedCount, 2);
  assert.equal(await prisma.statisticalObservation.count({ where: { datasetId: dataset.id, period: '2092', indicatorId: indicator.id } }), 2);
  const bad = { ...matrix, csvContent: matrix.csvContent.replace('20,25', '20people,25') };
  assert.equal((await request('preview', bad)).body.data.valid, false);
  const before = await prisma.statisticalObservation.count();
  assert.ok((await request('execute', bad)).status >= 400);
  assert.equal(await prisma.statisticalObservation.count(), before);
  console.log('Matrix PostgreSQL/HTTP PASS: one indicator, two dimension coordinates, per-column period, and invalid-number atomic rejection.');
  console.log('Import layout PostgreSQL/HTTP PASS: discover, preview source record number, execute and persisted value.');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await prisma.$disconnect();
}
