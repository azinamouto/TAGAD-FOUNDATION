import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../server/lib/csvParser';

test('banner and merged parent headers preserve distinct measure columns and source records', () => {
  const result = parseCsv('\uFEFFTalibon CBMS,,,\n\nBarangay,Population,\n,Male,Female\nBagacay,12,15');
  assert.deepEqual(result.headers, ['Barangay', 'Population / Male', 'Population / Female']);
  assert.deepEqual(result.rawRecords, [{ Barangay: 'Bagacay', 'Population / Male': '12', 'Population / Female': '15' }]);
  assert.deepEqual(result.rowNumbers, [5]);
  assert.deepEqual(result.layout, { headerRow: 3, headerRowCount: 2, skippedBannerRows: 2 });
});

test('explicit header layout handles nonstandard titles and preserves quoted commas/newlines', () => {
  const parsed = parseCsv('LGU,Title\nArea,Value\n"A, B\nC",10', { headerRow: 2, headerRowCount: 1 });
  assert.equal(parsed.rawRecords[0].Area, 'A, B\nC');
  assert.deepEqual(parsed.rowNumbers, [3]);
});

test('ambiguous headers and malformed CSV fail rather than overwrite or discard values', () => {
  for (const csv of ['Area,Value,Value\nA,1,2', 'Area,Value\nA,1,2', 'Area,Value\n"A,1']) {
    assert.throws(() => parseCsv(csv), (error: any) => error.statusCode === 422);
  }
  for (const layout of [null, [], { headerRow: 0 }, { headerRowCount: 6 }, { headerRow: 99 }]) {
    assert.throws(() => parseCsv('Area,Value\nA,1', layout as any), (error: any) => error.statusCode === 422);
  }
});
