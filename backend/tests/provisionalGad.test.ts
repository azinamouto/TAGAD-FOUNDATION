import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { COLUMNS, parseEntryFile, validateEntryRows, ProvisionalGadService } from '../server/services/ProvisionalGadService';

const row = { barangay_code: 'SYNTH', period: '2026', male: '1', female: '2', source_reference: 'Synthetic fixture' };
test('malformed confirmation signatures fail validation before database access', async () => {
  const service = new ProvisionalGadService({} as any);
  await assert.rejects(service.commit('synthetic', { confirmed: true, confirmationToken: (Date.now() + 60000) + '.' + '字'.repeat(64), rows: [row] }), /Preview expired or changed/);
});
test('strict shared count validation preserves zero and rejects missing and unsafe values', () => {
  assert.deepEqual(validateEntryRows([{ ...row, male: 0 }])[0].row, { ...row, male: 0, female: 2 });
  for (const value of ['', ' ', null, undefined, true, -1, 0.5, Infinity, '1e2', '0x10', '2,000', 2147483648]) {
    assert.ok(validateEntryRows([{ ...row, male: value }])[0].errors.length, String(value));
  }
  assert.equal(validateEntryRows([{ ...row, male: 2147483647, female: 2147483647 }])[0].errors.length, 0);
});
test('invalid periods, extra fields, unknown references and duplicate coordinates remain explicit', () => {
  assert.ok(validateEntryRows([{ ...row, period: '2026-Q5' }])[0].errors.length);
  assert.ok(validateEntryRows([{ ...row, total: 3 }])[0].errors.length);
  assert.ok(validateEntryRows([row, row]).every(r => r.errors.length));
  assert.throws(() => validateEntryRows([]));
  assert.throws(() => validateEntryRows(Array(1001).fill(row)));
});
test('CSV columns, malformed quoting, UTF8 and file limits are enforced', async () => {
  for (const text of ['wrong,columns\n1,2', COLUMNS.join(',') + '\n"unterminated', COLUMNS.join(',')]) {
    await assert.rejects(parseEntryFile({ originalname: 'test.csv', buffer: Buffer.from(text) }));
  }
  await assert.rejects(parseEntryFile({ originalname: 'test.csv', buffer: Buffer.from([0xff]) }));
  await assert.rejects(parseEntryFile({ originalname: 'test.xls', buffer: Buffer.from('a,b') }));
  await assert.rejects(parseEntryFile({ originalname: 'test.csv', buffer: Buffer.alloc(2097153) }));
  const parsed = await parseEntryFile({ originalname: 'test.csv', buffer: Buffer.from(COLUMNS.join(',') + '\nSYNTH,2026,1,2,"Source, page 1"') });
  assert.equal(parsed.rows[0].source_reference, 'Source, page 1');
  assert.deepEqual(parsed.rowNumbers, [2]);
});
test('XLSX rejects formulas, multiple sheets, corrupt ZIPs and excessive expansion', async () => {
  const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Test');
  sheet.addRow(COLUMNS); sheet.addRow(['SYNTH', '2026', { formula: '1+1', result: 2 }, 3, 'Synthetic']);
  await assert.rejects(parseEntryFile({ originalname: 'test.xlsx', buffer: Buffer.from(await book.xlsx.writeBuffer()) }), /Formulas/);
  sheet.getCell('C2').value = 2;
  book.addWorksheet('Second');
  await assert.rejects(parseEntryFile({ originalname: 'test.xlsx', buffer: Buffer.from(await book.xlsx.writeBuffer()) }), /one worksheet/);
  await assert.rejects(parseEntryFile({ originalname: 'bad.xlsx', buffer: Buffer.from('PKnotazip') }));
  const buffer = Buffer.from(await book.xlsx.writeBuffer());
  const central = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  buffer.writeUInt32LE(11 * 1024 * 1024, central + 24);
  await assert.rejects(parseEntryFile({ originalname: 'bomb.xlsx', buffer }), /10 MB/);
});
