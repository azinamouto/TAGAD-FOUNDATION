import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Role, StatisticalPublicationStatus as Status } from '@prisma/client';
import { setDatabaseConnected } from '../server/lib/prisma';
import { TableBuilderService as T } from '../server/services/TableBuilderService';
import { StatisticalDatasetService as D } from '../server/services/StatisticalDatasetService';
import { ObservationService as O } from '../server/services/ObservationService';
test('fallback dimension assignments stay locked after officialization and publication', async () => {
  setDatabaseConnected(false); T.resetInMemoryState(); D.resetInMemoryDatasets(); O.resetInMemoryObservations();
  const actor = { id: 'admin', role: Role.SUPER_ADMIN, officeId: null };
  const table = await T.createTable({ tableCode: 'LOCK-TEST', title: 'Lock test', domain: 'TEST' }, actor);
  const dimension = await T.getDimensionById('DIM_SEX');
  await T.bindDimension(table.id, { dimensionId: dimension!.id, isRequired: true, allowedValues: ['FEMALE'] }, actor);
  const dataset = await D.createDataset({ datasetCode: 'LOCK-TEST', name: 'Lock test' }, actor);
  await O.createObservation(table.id, { datasetId: dataset.id, period: '2026', numericValue: 1, dimensions: { DIM_SEX: 'FEMALE' } }, actor);
  await D.transitionStatus(dataset.id, Status.VALIDATED, actor);
  for (const status of [Status.OFFICIAL, Status.PUBLISHED]) {
    await D.transitionStatus(dataset.id, status, actor);
    await assert.rejects(T.unbindDimension(table.id, dimension!.id, actor), /OFFICIAL or PUBLISHED/);
    assert.equal((await T.getTableById(table.id, actor)).dimensionBindings.length, 1);
  }
});
