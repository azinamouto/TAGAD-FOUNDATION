import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import router from '../server/routes/admin/tableBuilder';
import { TableBuilderService as T } from '../server/services/TableBuilderService';
import { StatisticalDatasetService as D } from '../server/services/StatisticalDatasetService';
import { ForbiddenError } from '../server/lib/errors';
test('documented export streams 1201 rows in CSV and XLSX and rejects unauthorized data', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id: String(id), period: '2026', numericValue: id, dimensions: {} }));
  const original = [T.getTableById, D.getDatasetById, prisma.statisticalObservation.count, prisma.statisticalObservation.findMany];
  T.getTableById = (async () => ({ id: 'table', tableCode: 'TEST' })) as any;
  D.getDatasetById = (async () => ({ id: 'dataset', datasetCode: 'TEST' })) as any;
  prisma.statisticalObservation.count = (async () => rows.length) as any;
  const offsets: number[] = [];
  prisma.statisticalObservation.findMany = (async ({ skip, take, where }: any) => {
    assert.equal(where.period, '2026'); offsets.push(skip); return rows.slice(skip, skip + take);
  }) as any;
  setDatabaseConnected(true);
  const app = express();
  app.use((req: any, res, next) => { req.user = { id: 'admin', role: 'ADMIN' }; next(); });
  app.use(router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    for (const format of ['csv', 'xlsx']) {
      offsets.length = 0;
      const response = await fetch(`${base}/tables/table/observations/export?datasetId=dataset&period=2026&format=${format}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-disposition')!, /attachment/);
      if (format === 'csv') {
        const lines = (await response.text()).trim().split('\r\n');
        assert.equal(lines.length, 1202); assert.match(lines.at(-1)!, /1200$/);
      } else {
        const book = new ExcelJS.Workbook();
        await book.xlsx.load(Buffer.from(await response.arrayBuffer()) as any);
        assert.equal(book.worksheets[0].rowCount, 1202);
        assert.equal(book.worksheets[0].getRow(1202).getCell(8).value, '1200');
      }
      assert.deepEqual(offsets, [0, 500, 1000]);
    }
    D.getDatasetById = async () => { throw new ForbiddenError('Other office'); };
    const denied = await fetch(`${base}/tables/table/observations/export?datasetId=dataset`);
    assert.equal(denied.status, 403); assert.equal(denied.headers.get('content-disposition'), null);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    [T.getTableById, D.getDatasetById, prisma.statisticalObservation.count, prisma.statisticalObservation.findMany] = original as any;
    setDatabaseConnected(false);
  }
});
