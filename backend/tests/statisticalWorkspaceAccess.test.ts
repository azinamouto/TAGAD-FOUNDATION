import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { ObservationService as O } from '../server/services/ObservationService';
import { StatisticalDatasetService as D } from '../server/services/StatisticalDatasetService';
import { TableBuilderService as T } from '../server/services/TableBuilderService';

test('observation detail cannot bypass dataset scope, including unresolved offices', async () => {
  const originals = { table: T.getTableById, dataset: prisma.statisticalDataset.findUnique, observation: prisma.statisticalObservation.findUnique };
  setDatabaseConnected(true);
  T.getTableById = (async () => ({ id: 'table' })) as any;
  prisma.statisticalObservation.findUnique = (async () => ({ id: 'observation', tableDefinitionId: 'table', datasetId: 'dataset', numericValue: 5 })) as any;
  try {
    for (const officeId of ['foreign', null]) {
      prisma.statisticalDataset.findUnique = (async () => ({ id: 'dataset', importedById: 'other', publicationStatus: 'DRAFT', importedBy: { officeId } })) as any;
      await assert.rejects(O.getObservationById('table', 'observation', { id: 'encoder', role: 'ENCODER', officeId: 'own' }), (error: any) => error.statusCode === 403);
    }
    prisma.statisticalDataset.findUnique = (async () => ({ id: 'dataset', publicationStatus: 'VALIDATED' })) as any;
    await assert.rejects(O.validateDataset('dataset', { id: 'admin', role: 'ADMIN' }), (error: any) => error.statusCode === 403);
  } finally {
    T.getTableById = originals.table; prisma.statisticalDataset.findUnique = originals.dataset;
    prisma.statisticalObservation.findUnique = originals.observation; setDatabaseConnected(false);
  }
});
