import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { ObservationService as O } from '../server/services/ObservationService';
import { TableBuilderService as T } from '../server/services/TableBuilderService';
import { BarangayService as B } from '../server/services/BarangayService';
import { StatisticalObservationIngestionService as Import } from '../server/services/StatisticalObservationIngestionService';

test('both import modes reject numeric prefixes, invalid grouping, blanks and nonfinite values', async () => {
  const original = { table: T.getTableById, dataset: O.validateDataset, observations: prisma.statisticalObservation.findMany, barangays: B.getBarangays };
  B.getBarangays = async () => [];
  setDatabaseConnected(true);
  T.getTableById = (async () => ({ id: 'table', rowGrain: 'MUNICIPALITY', indicators: [{ id: 'indicator' }], dimensionBindings: [] })) as any;
  O.validateDataset = (async () => ({ id: 'dataset', publicationStatus: 'DRAFT' })) as any;
  prisma.statisticalObservation.findMany = (async () => []) as any;
  try {
    for (const mode of ['RECORD_PER_ROW', 'MEASURE_COLUMNS'] as const) {
      for (const value of ['12people', '1,2', 'NaN', 'Infinity', '1e999', '']) {
        const result = await Import.preview({ csvContent: `Period,Count\n2024,"${value}"`, datasetId: 'dataset', tableId: 'table', ingestionMode: mode,
          mapping: { period: { sourceColumn: 'Period' }, indicator: { constantIndicatorId: 'indicator' }, barangay: { constantValue: 'Talibon' }, numericValueColumn: 'Count', measureColumns: [{ columnName: 'Count', indicatorId: 'indicator' }] }, duplicateStrategy: 'REJECT',
        }, { id: 'admin', role: 'ADMIN' });
        assert.equal(result.valid, false, `${mode}: ${value}`);
        assert.equal(result.rows[0].numericValue, null);
      }
      const result = await Import.preview({ csvContent: 'Period,Count\n2024,"1,234.5"', datasetId: 'dataset', tableId: 'table', ingestionMode: mode,
        mapping: { period: { sourceColumn: 'Period' }, indicator: { constantIndicatorId: 'indicator' }, barangay: { constantValue: 'Talibon' }, numericValueColumn: 'Count', measureColumns: [{ columnName: 'Count', indicatorId: 'indicator' }] }, duplicateStrategy: 'REJECT',
      }, { id: 'admin', role: 'ADMIN' });
      assert.equal(result.valid, true, JSON.stringify(result)); assert.equal(result.rows[0].numericValue, 1234.5);
    }
  } finally {
    T.getTableById = original.table; O.validateDataset = original.dataset; prisma.statisticalObservation.findMany = original.observations; B.getBarangays = original.barangays; setDatabaseConnected(false);
  }
});
