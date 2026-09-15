import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { STATISTICAL_69_TABLE_CATALOG as catalog } from '../server/services/StatisticalCatalogService';
import { CBMS_SOURCE_ROWS } from '../server/data/cbmsSourceRows';

test('all 69 catalog identities match the preserved LGU CSV, including its numbering gap', async () => {
  const bytes = await readFile(new URL('../prisma/data/talibon-2024-cbms-table-register.csv', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '2581f42ddbac4e1258ace935231dda90a3b870caa2ef6c2ff99a7cfb1e565d95');
  const sheet = await new ExcelJS.Workbook().csv.read(Readable.from([bytes]));
  const source: any[] = [];
  sheet.eachRow((row, index) => {
    if (index <= 3) return;
    const tabName = String(row.getCell(1).value);
    source.push({
      tableNumber: Number(String(row.getCell(2).value).replace('Table ', '')),
      tableCode: tabName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
      tabName, title: String(row.getCell(3).value),
    });
  });
  assert.equal(source.length, 69);
  assert.deepEqual(CBMS_SOURCE_ROWS, source);
  assert.deepEqual(catalog.map(({ tableNumber, tableCode, title }) => ({ tableNumber, tableCode, title })),
    source.map(({ tableNumber, tableCode, title }) => ({ tableNumber, tableCode, title })));
  assert.equal(catalog.some(row => row.tableNumber === 68), false);
  assert.equal(catalog.at(-1)?.tableNumber, 70);
});
