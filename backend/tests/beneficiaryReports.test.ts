import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import { getBeneficiariesExcel, getBeneficiariesPDF } from '../server/controllers/reportController';
import { BeneficiaryService as B, MEMORY_BENEFICIARIES as rows } from '../server/services/BeneficiaryService';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
test('beneficiary XLSX/PDF reports preserve encoder office scope', async () => {
  setDatabaseConnected(true);
  rows.length = 0;
  rows.push({ id: 'a', firstName: 'OfficeA', lastName: 'Record', officeId: 'office-a' }, { id: 'b', firstName: 'OfficeB', lastName: 'Record', officeId: 'office-b' });
  const originalCount = prisma.beneficiary.count;
  const originalFind = prisma.beneficiary.findMany;
  prisma.beneficiary.count = (async () => 1) as any;
  prisma.beneficiary.findMany = (async ({ where }: any) => rows.filter(row => row.officeId === where.officeId).map(row => ({ ...row, barangay: { name: 'Fixture' }, office: { code: 'A' } }))) as any;
  const original = B.getBeneficiaries;
  let scopedCalls = 0;
  B.getBeneficiaries = async (params, actor, options) => {
    assert.equal(options?.strict, true);
    assert.equal(actor?.officeId, 'office-a'); scopedCalls++;
    return original.call(B, params, actor, options);
  };
  const app = express();
  app.use((req: any, res, next) => { req.user = { id: 'encoder', role: 'ENCODER', officeId: 'office-a' }; next(); });
  app.get('/excel', getBeneficiariesExcel); app.get('/pdf', getBeneficiariesPDF);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const response = await fetch(base + '/excel'); assert.equal(response.status, 200);
    const book = new ExcelJS.Workbook(); await book.xlsx.load(Buffer.from(await response.arrayBuffer()) as any);
    assert.equal(book.worksheets[0].rowCount, 2);
    assert.equal(book.worksheets[0].getRow(2).getCell(2).value, 'OfficeA');
    const pdf = await fetch(base + '/pdf'); assert.equal(pdf.status, 200);
    assert.match(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), /%PDF-/);
    assert.equal(scopedCalls, 2);
  } finally {
    B.getBeneficiaries = original; rows.length = 0;
    prisma.beneficiary.count = originalCount; prisma.beneficiary.findMany = originalFind; setDatabaseConnected(false);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
